import Phaser from 'phaser';
import type {
  CharacterSummary,
  FarmBuildingId,
  FarmState,
  CropTypeId
} from '@mundo-perfeito/shared';
import { FARM_BUILDINGS, FARM_ANIMALS, FARM_CROPS } from '@mundo-perfeito/shared';
import { api } from '../api';
import { sfxClick } from '../audio';
import type { GameHud } from '../ui/hud';
import { PlayerAvatar } from './actors';

const TILE_W = 96;
const TILE_H = 48;
const COLS = 25;
const ROWS = 21;
const FARM_LIMITS = { minX: -980, maxX: 980, minY: -470, maxY: 470 };

interface PlotLayout {
  index: number;
  col: number;
  row: number;
}

const PLOT_LAYOUTS: PlotLayout[] = [
  { index: 0, col: 8, row: 11 },
  { index: 1, col: 9, row: 11 },
  { index: 2, col: 10, row: 11 },
  { index: 3, col: 8, row: 12 },
  { index: 4, col: 9, row: 12 },
  { index: 5, col: 10, row: 12 }
];

const BUILDING_PADS = [
  { id: 'coop' as FarmBuildingId, col: 17, row: 7, name: 'Galinheiro', icon: '🐔' },
  { id: 'corral' as FarmBuildingId, col: 18, row: 12, name: 'Curral', icon: '🐄' },
  { id: 'stable' as FarmBuildingId, col: 13, row: 16, name: 'Estábulo', icon: '🐎' }
];

export class FarmScene extends Phaser.Scene {
  private character!: CharacterSummary;
  private hud: GameHud | null = null;
  private world!: Phaser.GameObjects.Container;
  private alive = true;
  private farm: FarmState | null = null;
  private farmGold = 0;
  private farmHudText: Phaser.GameObjects.Text | null = null;
  private interactiveElements: Phaser.GameObjects.GameObject[] = [];
  private seedPickerContainer: Phaser.GameObjects.Container | null = null;
  private refreshTimer: Phaser.Time.TimerEvent | null = null;
  private lastFarmSyncAt = 0;
  private farmSyncInFlight = false;
  private avatar!: PlayerAvatar;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private moving = false;
  private cameraZoom = 0.8;
  private cameraFocusX = 0;
  private cameraFocusY = 0;
  private animalDetails: Phaser.GameObjects.Container | null = null;

  constructor() {
    super('FarmScene');
  }

  create(): void {
    this.character = this.registry.get('character') as CharacterSummary;
    this.hud = (this.registry.get('hud') as GameHud | undefined) ?? null;
    this.alive = true;
    this.cameras.main.setBackgroundColor('#8dbf6d');
    this.world = this.add.container(0, 0);

    this.hud?.setConnection('online');
    this.hud?.setLocation('Minha Fazenda', 'Propriedade particular', true);
    this.hud?.pushFeed(`Bem-vindo à sua fazenda, ${this.character.name}!`, 'gold');

    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.keys = {
        W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
      };
    }
    this.layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.input.on('pointerdown', this.handleFarmGroundClick, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.alive = false;
      this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
      this.input.off('pointerdown', this.handleFarmGroundClick, this);
      this.refreshTimer?.destroy();
      this.seedPickerContainer?.destroy();
      this.animalDetails?.destroy();
    });

    void this.loadAndRenderFarm();

    // Atualiza timers de colheita a cada 1 segundo
    this.refreshTimer = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (!this.alive || !this.farm) return;
        this.renderPlotsOnly();
        if (Date.now() - this.lastFarmSyncAt >= 30_000 && !this.farmSyncInFlight) {
          void this.syncFarmState();
        }
      }
    });
  }

  private async loadAndRenderFarm(): Promise<void> {
    try {
      const data = await api.getFarm(this.character.id);
      if (!this.alive) return;
      this.farm = data.farm;
      this.farmGold = data.gold;
      this.lastFarmSyncAt = Date.now();
      this.hud?.setGold(data.gold);
      this.renderFullScene();
    } catch (error) {
      if (!this.alive) return;
      this.hud?.pushFeed(
        error instanceof Error ? error.message : 'Não foi possível carregar os dados da fazenda.',
        'danger'
      );
      this.renderFullScene();
    }
  }

  private async syncFarmState(): Promise<void> {
    if (this.farmSyncInFlight || !this.alive) return;
    this.farmSyncInFlight = true;
    try {
      const data = await api.getFarm(this.character.id);
      if (!this.alive) return;
      this.farm = data.farm;
      this.farmGold = data.gold;
      this.lastFarmSyncAt = Date.now();
      this.hud?.setGold(data.gold);
      this.updateFarmHUD();
      this.drawBuildings();
      this.renderPlotsOnly();
    } catch (error) {
      this.hud?.pushFeed(error instanceof Error ? error.message : 'Falha ao sincronizar os cuidados da fazenda.', 'danger');
      this.lastFarmSyncAt = Date.now();
    } finally {
      this.farmSyncInFlight = false;
    }
  }

  private handleFarmGroundClick(pointer: Phaser.Input.Pointer): void {
    if (!this.avatar || pointer.button !== 0 || !this.world) return;
    const targetX = Phaser.Math.Clamp((pointer.x - this.world.x) / this.world.scaleX, FARM_LIMITS.minX, FARM_LIMITS.maxX);
    const targetY = Phaser.Math.Clamp((pointer.y - this.world.y) / this.world.scaleY, FARM_LIMITS.minY, FARM_LIMITS.maxY);
    const distance = Phaser.Math.Distance.Between(this.avatar.root.x, this.avatar.root.y, targetX, targetY);
    if (distance < 10) return;
    this.moving = false;
    this.avatar.walkTo(targetX, targetY, Phaser.Math.Clamp(distance * 3.1, 220, 4200));
  }

  update(_time: number, delta: number): void {
    if (!this.alive || !this.avatar || !this.keys || !this.cursors) return;
    let dx = 0;
    let dy = 0;
    if (this.cursors.left.isDown || this.keys.A.isDown) { dx -= 1; dy += 0.5; }
    if (this.cursors.right.isDown || this.keys.D.isDown) { dx += 1; dy -= 0.5; }
    if (this.cursors.up.isDown || this.keys.W.isDown) { dx -= 1; dy -= 0.5; }
    if (this.cursors.down.isDown || this.keys.S.isDown) { dx += 1; dy += 0.5; }
    const magnitude = Math.hypot(dx, dy);
    if (magnitude > 0) {
      dx /= magnitude; dy /= magnitude;
      const distance = 185 * Math.min(delta, 50) / 1000;
      this.avatar.root.x = Phaser.Math.Clamp(this.avatar.root.x + dx * distance, FARM_LIMITS.minX, FARM_LIMITS.maxX);
      this.avatar.root.y = Phaser.Math.Clamp(this.avatar.root.y + dy * distance, FARM_LIMITS.minY, FARM_LIMITS.maxY);
      this.avatar.facePoint(this.avatar.root.x + dx, this.avatar.root.y + dy);
      this.avatar.setWalking(true);
      this.moving = true;
    } else if (this.moving) {
      this.avatar.setWalking(false);
      this.moving = false;
    }
    this.avatar.root.setDepth(300 + this.avatar.root.y);
    const smooth = 1 - Math.pow(0.0016, Math.max(0.016, delta / 1000));
    this.cameraFocusX += (this.avatar.root.x - this.cameraFocusX) * smooth;
    this.cameraFocusY += (this.avatar.root.y - this.cameraFocusY) * smooth;
    this.applyFarmCamera();
  }

  private iso(col: number, row: number): { x: number; y: number } {
    return {
      x: (col - row) * (TILE_W / 2) - ((COLS - ROWS) * TILE_W) / 4,
      y: (col + row) * (TILE_H / 2) - ((COLS + ROWS - 2) * TILE_H) / 4
    };
  }

  private diamond(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    fill: number,
    line = 0x496d3d
  ): void {
    graphics.fillStyle(fill, 1);
    graphics.lineStyle(1, line, 0.55);
    graphics.beginPath();
    graphics.moveTo(x, y - TILE_H / 2);
    graphics.lineTo(x + TILE_W / 2, y);
    graphics.lineTo(x, y + TILE_H / 2);
    graphics.lineTo(x - TILE_W / 2, y);
    graphics.closePath();
    graphics.fillPath();
    graphics.strokePath();
  }

  private plotsContainer!: Phaser.GameObjects.Container;
  private buildingsContainer!: Phaser.GameObjects.Container;

  private renderFullScene(): void {
    this.world.removeAll(true);
    this.interactiveElements = [];

    // Chão e gramado
    const ground = this.add.graphics();
    this.world.add(ground);
    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        const p = this.iso(col, row);
        const variation = (col + row) % 4;
        const color =
          variation === 0 ? 0x86b85e : variation === 1 ? 0x90c268 : variation === 2 ? 0x8bbb61 : 0x7eb357;
        this.diamond(ground, p.x, p.y, color);
      }
    }

    this.drawPath(ground);
    this.drawHouse();
    this.drawTownExit();

    this.buildingsContainer = this.add.container(0, 0);
    this.world.add(this.buildingsContainer);
    this.drawBuildings();

    this.plotsContainer = this.add.container(0, 0);
    this.world.add(this.plotsContainer);
    this.renderPlotsOnly();

    this.drawDecorations();
    this.drawPlayer();
    this.drawFarmHUD();
  }

  private drawPath(graphics: Phaser.GameObjects.Graphics): void {
    for (let step = 0; step < 8; step += 1) {
      const p = this.iso(12, step + 11);
      this.diamond(graphics, p.x, p.y, 0xb99a68, 0x876c43);
    }
  }

  private drawHouse(): void {
    const p = this.iso(12, 7);
    const g = this.add.graphics().setDepth(20);
    g.fillStyle(0x795438, 1);
    g.fillRect(p.x - 65, p.y - 5, 130, 76);
    g.fillStyle(0xd9bd88, 1);
    g.fillRect(p.x - 54, p.y + 4, 108, 59);
    g.fillStyle(0x8b3e32, 1);
    g.fillTriangle(p.x - 76, p.y + 4, p.x, p.y - 64, p.x + 76, p.y + 4);
    g.fillStyle(0x5b3427, 1);
    g.fillRect(p.x - 13, p.y + 24, 26, 39);
    g.fillStyle(0x8fc1d0, 1);
    g.fillRect(p.x - 43, p.y + 17, 20, 18);
    g.fillRect(p.x + 23, p.y + 17, 20, 18);
    this.world.add(g);
    this.world.add(
      this.add
        .text(p.x, p.y - 78, '🏡 CASA PRINCIPAL', {
          fontFamily: 'Georgia, serif',
          fontSize: '12px',
          color: '#fff0c2',
          stroke: '#3d2b1b',
          strokeThickness: 4
        })
        .setOrigin(0.5)
        .setDepth(25)
    );
  }

  private drawTownExit(): void {
    const p = this.iso(12, 19);
    const sign = this.add
      .text(p.x, p.y + 35, '🚪 Voltar para Cidade de Valedouro', {
        fontFamily: 'Georgia, serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#fef08a',
        backgroundColor: '#1b3b22',
        padding: { x: 12, y: 7 },
        stroke: '#0e2314',
        strokeThickness: 3
      })
      .setOrigin(0.5)
      .setDepth(80)
      .setInteractive({ useHandCursor: true });

    sign.on('pointerdown', (_pointer: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      sfxClick();
      this.scene.stop('FarmScene');
      this.scene.start('CityScene');
    });

    this.world.add(sign);
  }

  private drawBuildings(): void {
    this.buildingsContainer.removeAll(true);
    const owned = this.farm?.buildings ?? [];

    for (const pad of BUILDING_PADS) {
      const p = this.iso(pad.col, pad.row);
      const isBuilt = owned.includes(pad.id);
      const g = this.add.graphics().setDepth(12);

      if (isBuilt) {
        // Terreno da construção
        this.diamond(g, p.x, p.y, 0xa18258, 0x6e5333);

        // Desenha a construção completa
        if (pad.id === 'coop') {
          // Galinheiro de madeira
          g.fillStyle(0x854d0e, 1);
          g.fillRect(p.x - 36, p.y - 20, 72, 36);
          g.fillStyle(0xca8a04, 1);
          g.fillTriangle(p.x - 44, p.y - 20, p.x, p.y - 48, p.x + 44, p.y - 20);
          g.fillStyle(0x451a03, 1);
          g.fillRect(p.x - 10, p.y - 5, 20, 21);
          g.fillStyle(0xfde047, 1);
          g.fillRect(p.x - 28, p.y - 12, 12, 12);
        } else if (pad.id === 'corral') {
          // Abrigo de bovinos com cocho e bebedouro.
          g.fillStyle(0x92400e, 1);
          g.fillRect(p.x - 20, p.y - 14, 40, 14);
          g.fillStyle(0xfef08a, 1);
          g.fillCircle(p.x, p.y - 7, 5);
        } else if (pad.id === 'stable') {
          // Estábulo rústico de cavalos.
          g.fillStyle(0x713f12, 1);
          g.fillRect(p.x - 46, p.y - 26, 92, 48);
          g.fillStyle(0x991b1b, 1);
          g.fillTriangle(p.x - 52, p.y - 26, p.x, p.y - 58, p.x + 52, p.y - 26);
          g.fillStyle(0x3f2208, 1);
          g.fillRect(p.x - 14, p.y - 6, 28, 28);
        }

        // Cercado individual da instalação, com postes e travessas de madeira.
        g.lineStyle(5, 0x694326, 0.98);
        g.strokeRect(p.x - 66, p.y - 42, 132, 84);
        g.lineStyle(2, 0xc08a4e, 0.95);
        g.strokeRect(p.x - 66, p.y - 28, 132, 56);
        for (const fenceX of [-66, -22, 22, 66]) {
          g.fillStyle(0x4b2f1b, 1);
          g.fillRect(p.x + fenceX - 3, p.y - 46, 6, 92);
          g.fillStyle(0xc08a4e, 1);
          g.fillRect(p.x + fenceX - 2, p.y - 45, 4, 90);
        }
        // Bebedouro e comedouro visíveis dentro do cercado.
        g.fillStyle(0x647f8b, 1);
        g.fillRoundedRect(p.x + 34, p.y + 7, 23, 10, 3);
        g.fillStyle(0x9a6a32, 1);
        g.fillRoundedRect(p.x - 57, p.y + 7, 23, 10, 3);
        this.buildingsContainer.add(g);

        // Rótulo da construção
        const title = this.add
          .text(p.x, p.y - 56, `✓ ${pad.name}`, {
            fontFamily: 'Georgia, serif',
            fontSize: '11px',
            fontStyle: 'bold',
            color: '#86efac',
            stroke: '#1c341f',
            strokeThickness: 3
          })
          .setOrigin(0.5)
          .setDepth(18);
        this.buildingsContainer.add(title);

        // Desenha animais criados dentro da instalação
        const animalsInBuilding = (this.farm?.animals ?? []).filter((a) => a.buildingId === pad.id);
        const countText = this.add
          .text(p.x, p.y + 26, `${animalsInBuilding.length} animais`, {
            fontFamily: 'Georgia, serif',
            fontSize: '10px',
            color: '#fef08a',
            stroke: '#2c1e14',
            strokeThickness: 3
          })
          .setOrigin(0.5)
          .setDepth(18);
        this.buildingsContainer.add(countText);

        const care = this.farm?.animalCare?.[pad.id] ?? { feed: 0, water: 0 };
        const troughText = this.add
          .text(p.x, p.y + 42, `🥣 ${care.feed}/30  🚰 ${care.water}/30`, {
            fontFamily: 'Georgia, serif',
            fontSize: '9px',
            color: '#e0f2fe',
            backgroundColor: 'rgba(15, 23, 42, 0.78)',
            padding: { x: 5, y: 3 }
          })
          .setOrigin(0.5)
          .setDepth(20)
          .setInteractive({ useHandCursor: true });
        troughText.on('pointerdown', (_pointer: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
          event.stopPropagation();
          const openShop = this.registry.get('openFarmShop') as (() => void) | undefined;
          openShop?.();
        });
        this.buildingsContainer.add(troughText);

        if (pad.id === 'coop') {
          const coopEggs = (this.farm?.eggs ?? []).filter((egg) => egg.fertilized);
          const plainEggs = (this.farm?.eggs ?? []).filter((egg) => !egg.fertilized);
          const eggLabel = this.add.text(p.x, p.y + 59,
            `🥚 ${plainEggs.length} ovos  •  🐣 ${coopEggs.length} chocando`, {
              fontFamily: 'Georgia, serif', fontSize: '9px', color: '#fff2c2',
              backgroundColor: 'rgba(40, 28, 14, 0.82)', padding: { x: 5, y: 3 }
            }).setOrigin(0.5).setDepth(30);
          this.buildingsContainer.add(eggLabel);
          (this.farm?.eggs ?? []).slice(0, 8).forEach((egg, eggIndex) => {
            const eggIcon = this.add.text(p.x - 28 + (eggIndex % 4) * 18, p.y + 24 + Math.floor(eggIndex / 4) * 12,
              egg.fertilized ? '🐣' : '🥚', { fontSize: '12px' }).setOrigin(0.5).setDepth(31);
            this.buildingsContainer.add(eggIcon);
          });
        }

        animalsInBuilding.forEach((animal, idx) => {
          const startX = p.x + Phaser.Math.Between(-34, 34);
          const startY = p.y + Phaser.Math.Between(-15, 15);
          const sprite = this.createAnimalSprite(animal, startX, startY);
          sprite.setDepth(24 + startY);
          sprite.on('pointerdown', (_pointer: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
            event.stopPropagation();
            this.openAnimalDetails(animal);
          });
          this.buildingsContainer.add(sprite);
          const roam = () => {
            if (!sprite.active || !this.alive) return;
            // Os animais passeiam pelo cercado e visitam o comedouro/bebedouro.
            const visitTrough = Math.random() < 0.32;
            const targetX = visitTrough
              ? p.x + (Math.random() < 0.5 ? -45 : 45)
              : p.x + Phaser.Math.Between(-34, 34);
            const targetY = visitTrough ? p.y + 10 : p.y + Phaser.Math.Between(-15, 15);
            this.tweens.add({
              targets: sprite, x: targetX, y: targetY, duration: Phaser.Math.Between(1800, 3600),
              ease: 'Sine.easeInOut', onUpdate: () => sprite.setDepth(24 + sprite.y),
              onComplete: () => { if (sprite.active) this.time.delayedCall(Phaser.Math.Between(500, 1800), roam); }
            });
          };
          this.time.delayedCall(Phaser.Math.Between(300, 1800) + idx * 180, roam);
          this.tweens.add({ targets: sprite, angle: { from: -3, to: 3 }, duration: 900 + idx * 90, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        });
      } else {
        // Pad vazio (não construído)
        this.diamond(g, p.x, p.y, 0xb4a078, 0x806d4b);
        g.lineStyle(1.5, 0xf1e0b6, 0.85);
        g.strokeRect(p.x - 24, p.y - 14, 48, 28);
        this.buildingsContainer.add(g);

        const iconText = this.add
          .text(p.x, p.y - 20, pad.icon, { fontSize: '20px' })
          .setOrigin(0.5)
          .setDepth(18);
        const nameText = this.add
          .text(p.x, p.y + 18, `Lote do ${pad.name}\n(Comprar no NPC)`, {
            fontFamily: 'Georgia, serif',
            fontSize: '9px',
            align: 'center',
            color: '#fed7aa',
            stroke: '#3b2512',
            strokeThickness: 3
          })
          .setOrigin(0.5)
          .setDepth(18);

        this.buildingsContainer.add([iconText, nameText]);
      }
    }
  }

  private renderPlotsOnly(): void {
    if (!this.plotsContainer) return;
    this.plotsContainer.removeAll(true);
    const plots = this.farm?.plots ?? [];
    const now = Date.now();

    for (const layout of PLOT_LAYOUTS) {
      const p = this.iso(layout.col, layout.row);
      const plotState = plots.find((x) => x.plotIndex === layout.index);
      const g = this.add.graphics().setDepth(10);

      // Terra arada do canteiro
      this.diamond(g, p.x, p.y, 0x694627, 0x482e16);
      g.fillStyle(0x452c17, 1);
      for (let row = -1; row <= 1; row += 1) {
        g.fillRoundedRect(p.x - 26, p.y + row * 8 - 2, 52, 4, 2);
      }
      this.plotsContainer.add(g);

      if (plotState?.cropId) {
        const crop = FARM_CROPS[plotState.cropId];
        const isWatered = Boolean(plotState.readyAt);
        const readyTime = plotState.readyAt ? new Date(plotState.readyAt).getTime() : Number.POSITIVE_INFINITY;
        const isReady = isWatered && now >= readyTime;

        // Desenho da plantação
        if (plotState.cropId === 'corn') {
          for (let i = -1; i <= 1; i += 1) {
            g.fillStyle(isReady ? 0x22c55e : 0x4ade80, 1);
            g.fillRoundedRect(p.x + i * 16 - 3, p.y - 16, 6, 28, 3);
            if (isReady) {
              g.fillStyle(0xfacc15, 1);
              g.fillEllipse(p.x + i * 16, p.y - 12, 8, 14);
            }
          }
        } else if (plotState.cropId === 'wheat') {
          for (let i = -1; i <= 1; i += 1) {
            g.lineStyle(3, isReady ? 0xfacc15 : 0x86efac, 1);
            g.lineBetween(p.x + i * 15, p.y + 6, p.x + i * 15 - 2, p.y - 16);
            if (isReady) {
              g.fillStyle(0xfde047, 1);
              g.fillCircle(p.x + i * 15 - 2, p.y - 17, 4);
            }
          }
        } else if (plotState.cropId === 'carrot') {
          for (let i = -1; i <= 1; i += 1) {
            g.fillStyle(0x16a34a, 1);
            g.fillTriangle(p.x + i * 16, p.y - 18, p.x + i * 16 - 6, p.y - 6, p.x + i * 16 + 6, p.y - 6);
            if (isReady) {
              g.fillStyle(0xf97316, 1);
              g.fillTriangle(p.x + i * 16, p.y - 6, p.x + i * 16 - 4, p.y + 6, p.x + i * 16 + 4, p.y + 6);
            }
          }
        }

        // Indicador de status
        if (isReady) {
          const badge = this.add
            .text(p.x, p.y - 28, `✨ COLHER ${crop?.name.toUpperCase()}`, {
              fontFamily: 'Georgia, serif',
              fontSize: '10px',
              fontStyle: 'bold',
              color: '#fef08a',
              backgroundColor: '#166534',
              padding: { x: 5, y: 3 },
              stroke: '#052e16',
              strokeThickness: 2
            })
            .setOrigin(0.5)
            .setDepth(20)
            .setInteractive({ useHandCursor: true });

          badge.on('pointerdown', (_pointer: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => { event.stopPropagation(); void this.harvestPlot(layout.index, p.x, p.y); });
          this.plotsContainer.add(badge);
        } else if (!isWatered) {
          const waterBadge = this.add
            .text(p.x, p.y - 25, '💧 REGAR', {
              fontFamily: 'Georgia, serif',
              fontSize: '10px',
              fontStyle: 'bold',
              color: '#e0f2fe',
              backgroundColor: '#075985',
              padding: { x: 6, y: 3 }
            })
            .setOrigin(0.5)
            .setDepth(20)
            .setInteractive({ useHandCursor: true });
          waterBadge.on('pointerdown', (_pointer: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => { event.stopPropagation(); void this.waterPlot(layout.index); });
          this.plotsContainer.add(waterBadge);
        } else {
          const remainingSec = Math.max(1, Math.ceil((readyTime - now) / 1000));
          const timeBadge = this.add
            .text(p.x, p.y - 25, `⏳ ${crop?.name} (${remainingSec}s)`, {
              fontFamily: 'Georgia, serif',
              fontSize: '9px',
              color: '#e2e8f0',
              backgroundColor: 'rgba(15, 23, 42, 0.75)',
              padding: { x: 4, y: 2 }
            })
            .setOrigin(0.5)
            .setDepth(19);
          this.plotsContainer.add(timeBadge);
        }
      } else {
        // Canteiro vazio
        const emptyText = this.add
          .text(p.x, p.y - 8, '🌱 Plantar', {
            fontFamily: 'Georgia, serif',
            fontSize: '10px',
            color: '#bbf7d0',
            backgroundColor: 'rgba(22, 101, 52, 0.7)',
            padding: { x: 6, y: 3 }
          })
          .setOrigin(0.5)
          .setDepth(18)
          .setInteractive({ useHandCursor: true });

        emptyText.on('pointerdown', (_pointer: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => { event.stopPropagation(); this.openSeedPicker(layout.index, p.x, p.y); });
        this.plotsContainer.add(emptyText);
      }
    }
  }

  private openSeedPicker(plotIndex: number, worldX: number, worldY: number): void {
    sfxClick();
    this.seedPickerContainer?.destroy();

    const picker = this.add.container(worldX, worldY - 50).setDepth(120);
    const bg = this.add
      .rectangle(0, 0, 240, 126, 0x111c24, 0.96)
      .setStrokeStyle(2, 0x86efac, 0.9);
    const title = this.add
      .text(0, -42, 'Escolha a semente para plantar:', {
        fontFamily: 'Georgia, serif',
        fontSize: '11px',
        color: '#fef08a'
      })
      .setOrigin(0.5);

    const crops: CropTypeId[] = ['corn', 'wheat', 'carrot'];
    const buttons: Phaser.GameObjects.GameObject[] = [];

    crops.forEach((cropId, i) => {
      const crop = FARM_CROPS[cropId];
      const seedCount = this.farm?.seeds?.[cropId] ?? 0;
      const btnY = -20 + i * 27;
      const btn = this.add
        .text(0, btnY, `${crop.icon} ${crop.name} • sementes: ${seedCount}`, {
          fontFamily: 'Georgia, serif',
          fontSize: '11px',
          color: '#f0fdf4',
          backgroundColor: '#1b432a',
          padding: { x: 8, y: 4 }
        })
        .setOrigin(0.5);

      if (seedCount > 0) {
        btn.setInteractive({ useHandCursor: true });
        btn.on('pointerdown', (_pointer: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
          event.stopPropagation();
          picker.destroy();
          void this.plantPlot(plotIndex, cropId);
        });
      } else {
        btn.setColor('#64748b');
      }
      buttons.push(btn);
    });

    const closeBtn = this.add
      .text(105, -52, '✕', { fontSize: '13px', color: '#f87171' })
      .setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', (_pointer: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => { event.stopPropagation(); picker.destroy(); });

    picker.add([bg, title, ...buttons, closeBtn]);
    this.seedPickerContainer = picker;
  }

  private async waterPlot(plotIndex: number): Promise<void> {
    try {
      const res = await api.waterFarmCrop(this.character.id, plotIndex);
      this.farm = res.farm;
      this.updateFarmHUD();
      this.hud?.pushFeed(res.message ?? 'Plantação regada!', 'gold');
      sfxClick();
      this.renderPlotsOnly();
    } catch (err) {
      this.hud?.pushFeed(err instanceof Error ? err.message : 'Não foi possível regar o canteiro.', 'danger');
    }
  }

  private async plantPlot(plotIndex: number, cropId: CropTypeId): Promise<void> {
    try {
      const res = await api.plantFarmCrop(this.character.id, plotIndex, cropId);
      this.farm = res.farm;
      this.updateFarmHUD();
      this.farmGold = res.gold;
      this.hud?.setGold(res.gold);
      this.hud?.pushFeed(res.message ?? 'Semente plantada!', 'gold');
      sfxClick();
      this.renderPlotsOnly();
    } catch (err) {
      this.hud?.pushFeed(
        err instanceof Error ? err.message : 'Não foi possível plantar neste canteiro.',
        'danger'
      );
    }
  }

  private async harvestPlot(plotIndex: number, x: number, y: number): Promise<void> {
    try {
      const res = await api.harvestFarmCrop(this.character.id, plotIndex);
      this.farm = res.farm;
      this.updateFarmHUD();
      this.farmGold = res.gold;
      this.hud?.setGold(res.gold);
      this.hud?.pushFeed(res.message ?? 'Colheita concluída com sucesso!', 'gold');
      sfxClick();

      // Feedback visual flutuante
      const floatText = this.add
        .text(x, y - 20, '✨ +Colheita!', {
          fontFamily: 'Georgia, serif',
          fontSize: '14px',
          fontStyle: 'bold',
          color: '#fde047',
          stroke: '#14532d',
          strokeThickness: 3
        })
        .setOrigin(0.5)
        .setDepth(200);

      this.tweens.add({
        targets: floatText,
        y: y - 55,
        alpha: 0,
        duration: 1200,
        onComplete: () => floatText.destroy()
      });

      this.renderPlotsOnly();
    } catch (err) {
      this.hud?.pushFeed(
        err instanceof Error ? err.message : 'Não foi possível colher esta plantação.',
        'danger'
      );
    }
  }

  private createAnimalSprite(animal: FarmState['animals'][number], x: number, y: number): Phaser.GameObjects.Container {
    const root = this.add.container(x, y);
    const g = this.add.graphics();
    const shadow = this.add.ellipse(0, 8, animal.species === 'chicken' ? 24 : 38, 10, 0x1c2b18, 0.28);
    const rankColor: Record<string, number> = { white: 0xd9d4c7, green: 0x70c77a, blue: 0x63a9e8, orange: 0xf2a65a, red: 0xe86a62 };
    const accent = rankColor[animal.tier] ?? 0xd9d4c7;
    if (animal.species === 'chicken') {
      g.fillStyle(0xf3e8c8, 1); g.fillEllipse(-1, -2, 22, 15);
      g.fillStyle(accent, 1); g.fillCircle(7, -10, 6);
      g.fillStyle(0xeaa52d, 1); g.fillTriangle(12, -10, 20, -7, 12, -5);
      g.fillStyle(0xc84b3e, 1); g.fillCircle(5, -17, 3);
      g.lineStyle(2, 0x9b682c, 1); g.lineBetween(-5, 4, -6, 9); g.lineBetween(3, 4, 4, 9);
      g.lineStyle(1, 0x9b682c, 1); g.lineBetween(-8, 9, -3, 9); g.lineBetween(2, 9, 7, 9);
    } else if (animal.species === 'cow') {
      g.fillStyle(0xf2eee3, 1); g.fillEllipse(-1, -2, 34, 20);
      g.fillStyle(0x7b5136, 1); g.fillEllipse(-8, -4, 10, 8); g.fillEllipse(4, 1, 8, 6);
      g.fillStyle(0xf0e7d7, 1); g.fillEllipse(14, -9, 15, 14);
      g.fillStyle(0x8d6041, 1); g.fillTriangle(8, -15, 12, -23, 15, -14); g.fillTriangle(17, -14, 22, -22, 23, -11);
      g.fillStyle(0xd88e91, 1); g.fillEllipse(19, -6, 9, 6);
      g.lineStyle(3, 0x5a4635, 1); for (const legX of [-11, 8]) g.lineBetween(legX, 5, legX, 12);
    } else {
      g.fillStyle(0x9b6038, 1); g.fillEllipse(-2, -2, 38, 18);
      g.fillStyle(0x9b6038, 1); g.fillTriangle(7, -8, 17, -25, 24, -8);
      g.fillStyle(0x78442e, 1); g.fillEllipse(23, -20, 12, 9);
      g.fillStyle(0x4a2d22, 1); g.fillTriangle(19, -25, 20, -34, 25, -25);
      g.lineStyle(4, 0x5a3929, 1); g.lineBetween(-13, 4, -14, 13); g.lineBetween(7, 4, 8, 13);
      g.lineStyle(3, 0x3f2921, 1); g.lineBetween(-20, -4, -26, 4);
    }
    root.add([shadow, g]);
    root.setSize(48, 44).setInteractive({ useHandCursor: true });
    return root;
  }

  private openAnimalDetails(animal: FarmState['animals'][number]): void {
    this.animalDetails?.destroy();
    const tierNames: Record<string, string> = {
      white: 'Comum (D)', green: 'Incomum (C)', blue: 'Raro (B)', orange: 'Épico (A)', red: 'Lendário (S)'
    };
    const panel = this.add.container(this.scale.width / 2, this.scale.height - 132).setScrollFactor(0).setDepth(5000);
    const bg = this.add.rectangle(0, 0, Math.min(460, this.scale.width - 28), 190, 0x18271d, 0.97)
      .setStrokeStyle(2, 0xc5a66b, 0.9);
    const def = FARM_ANIMALS[animal.definitionId];
    const tierOrder = ['white', 'green', 'blue', 'orange', 'red'];
    const nextTierChance: Record<string, string> = { white: '8%', green: '5%', blue: '2%', orange: '0,5%', red: '0%' };
    const nextTier = tierOrder[tierOrder.indexOf(animal.tier) + 1];
    const breedingInfo = animal.species === 'chicken'
      ? 'Ovos: 45% de chance de fecundação com galo adulto'
      : 'Acasalamento: 12% de chance diária com parceiro adulto';
    const pregnancyInfo = animal.pregnantUntil
      ? 'Gestação em andamento'
      : animal.species === 'chicken' ? 'Postura a cada 4 horas' : 'Aguardando reprodução';
    const title = this.add.text(0, -73, `${def?.icon ?? '🐾'}  ${animal.name}`, {
      fontFamily: 'Georgia, serif', fontSize: '16px', fontStyle: 'bold', color: '#f6e6bd'
    }).setOrigin(0.5);
    const details = this.add.text(0, -22,
      `${def?.speciesName ?? 'Animal'} • ${animal.gender === 'female' ? 'Fêmea' : 'Macho'} • Rank ${tierNames[animal.tier] ?? 'Comum'} • ${Math.floor(animal.ageDays ?? 0)} dia(s)\nSaúde: ${animal.health ?? 100}%   Felicidade: ${animal.happiness ?? 100}%\nFome: ${100 - (animal.hunger ?? 100)}%   Sede: ${100 - (animal.hydration ?? 100)}%\n${pregnancyInfo} • ${breedingInfo}\nChance de subir para o próximo rank: ${nextTier ? nextTierChance[animal.tier] : 'rank máximo'}`,
      { fontFamily: 'Georgia, serif', fontSize: '11px', color: '#e4eadc', align: 'center', lineSpacing: 5, wordWrap: { width: Math.min(420, this.scale.width - 60) } }
    ).setOrigin(0.5);
    const close = this.add.text(0, 72, 'Fechar', {
      fontFamily: 'Georgia, serif', fontSize: '12px', color: '#ffe3a6',
      backgroundColor: '#5b4529', padding: { x: 14, y: 6 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    close.on('pointerdown', () => { this.animalDetails?.destroy(); this.animalDetails = null; });
    panel.add([bg, title, details, close]);
    this.animalDetails = panel;
  }

  private drawDecorations(): void {
    const treeSpots: Array<[number, number]> = [
      [2, 2],
      [22, 2],
      [2, 18],
      [23, 18],
      [7, 4],
      [21, 19]
    ];
    for (const [col, row] of treeSpots) {
      const p = this.iso(col, row);
      const g = this.add.graphics().setDepth(30);
      g.fillStyle(0x68462c, 1);
      g.fillRect(p.x - 4, p.y - 2, 8, 28);
      g.fillStyle(0x397a42, 1);
      g.fillCircle(p.x, p.y - 16, 20);
      g.fillStyle(0x4f914b, 1);
      g.fillCircle(p.x - 9, p.y - 23, 13);
      this.world.add(g);
    }

    // Personagem controlável desenhado por drawPlayer().
  }

  private drawPlayer(): void {
    this.avatar = new PlayerAvatar(this, this.character.classId, -20, 110);
    this.avatar.root.setScale(0.78);
    this.avatar.root.setDepth(410);
    this.world.add(this.avatar.root);
  }

  private drawFarmHUD(): void {
    this.farmHudText = this.add
      .text(0, 320, this.getFarmStatusText(), {
        fontFamily: 'Georgia, serif',
        fontSize: '14px',
        color: '#fff4d5',
        stroke: '#294526',
        strokeThickness: 4,
        align: 'center',
        lineSpacing: 5
      })
      .setOrigin(0.5)
      .setDepth(100);
    this.world.add(this.farmHudText);
  }

  private getFarmStatusText(): string {
    const buildingsCount = this.farm?.buildings.length ?? 0;
    const animalsCount = this.farm?.animals.length ?? 0;
    const storage = this.farm?.storage ?? {};
    const corn = storage['crop-corn'] ?? 0;
    const wheat = storage['crop-wheat'] ?? 0;
    const carrot = storage['crop-carrot'] ?? 0;
    const seeds = this.farm?.seeds ?? {};
    const chickenFeed = storage['feed-chicken'] ?? 0;
    const cowFeed = storage['feed-cow'] ?? 0;
    const horseFeed = storage['feed-horse'] ?? 0;

    return `Fazenda de ${this.character.name} • Instalações: ${buildingsCount}/3 • Animais: ${animalsCount}
Armazém: 🌽 ${corn}  •  🌾 ${wheat}  •  🥕 ${carrot}
Sementes: 🌽 ${seeds.corn ?? 0}  •  🌾 ${seeds.wheat ?? 0}  •  🥕 ${seeds.carrot ?? 0}
Rações: 🐔 ${chickenFeed}  •  🐄 ${cowFeed}  •  🐎 ${horseFeed}`;
  }

  private updateFarmHUD(): void {
    this.farmHudText?.setText(this.getFarmStatusText());
  }

  private layout(): void {
    if (!this.alive) return;
    const mobile = this.scale.width < 760;
    this.cameraZoom = mobile
      ? Phaser.Math.Clamp(Math.min(this.scale.width / 900, this.scale.height / 1180), 0.48, 0.78)
      : Phaser.Math.Clamp(Math.min(this.scale.width / 1900, this.scale.height / 1180), 0.6, 0.94);
    if (this.avatar) {
      this.cameraFocusX = this.avatar.root.x;
      this.cameraFocusY = this.avatar.root.y;
    }
    this.applyFarmCamera();
  }

  private applyFarmCamera(): void {
    if (!this.world) return;
    const zoom = this.cameraZoom;
    const halfW = this.scale.width / (2 * zoom);
    const halfH = this.scale.height / (2 * zoom);
    const worldHalfX = ((COLS + ROWS - 2) * TILE_W) / 4;
    const worldHalfY = ((COLS + ROWS - 2) * TILE_H) / 4;
    const focusX = halfW >= worldHalfX ? 0 : Phaser.Math.Clamp(this.cameraFocusX, -worldHalfX + halfW, worldHalfX - halfW);
    const focusY = halfH >= worldHalfY ? 0 : Phaser.Math.Clamp(this.cameraFocusY, -worldHalfY + halfH, worldHalfY - halfH);
    this.world.setScale(zoom);
    this.world.setPosition(this.scale.width / 2 - focusX * zoom, this.scale.height / 2 - focusY * zoom);
  }
}
