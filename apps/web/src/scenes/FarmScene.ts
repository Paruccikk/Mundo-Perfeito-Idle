import Phaser from 'phaser';
import type {
  AnimalSpeciesId,
  CharacterSummary,
  CropTypeId,
  FarmBuildingId,
  FarmPlotState,
  FarmResponse,
  FarmState,
  OwnedAnimal
} from '@mundo-perfeito/shared';
import { FARM_ANIMALS, FARM_BUILDINGS, FARM_CROPS } from '@mundo-perfeito/shared';
import { api } from '../api';
import { sfxClick } from '../audio';
import type { GameHud } from '../ui/hud';
import { PlayerAvatar } from './actors';
import {
  RANCH_FONT_BODY,
  RANCH_FONT_DISPLAY,
  TILE_H,
  TILE_W,
  addRoadLine,
  createAtmosphere,
  createBarn,
  createBarrel,
  createButterfly,
  createClothesline,
  createFarmhouse,
  createFenceLine,
  createGround,
  createHayBale,
  createLanternPost,
  createMailbox,
  createMeadowDetails,
  createRanchGate,
  createScarecrow,
  createSeedCrate,
  createTree,
  createWateringCan,
  createWell,
  createWheelbarrow,
  createWindmill,
  fillDiamond,
  strokeDiamond
} from './ranch/ranch-theme';
import { createAnimalVisual, type AnimalVisual } from './ranch/ranch-animals';
import {
  RanchHud,
  createRanchButton,
  drawRanchPanel
} from './ranch/ranch-ui';
import {
  createCoop,
  createCorral,
  createStable,
  createVacantPad,
  createRusticSign
} from './ranch/ranch-buildings';

const COLS = 48;
const ROWS = 42;
const FARM_LIMITS = { minX: -2200, maxX: 2200, minY: -1320, maxY: 1320 };
const INITIAL_PLOTS = 6;
const MAX_PLOTS = 30;
const GARDEN_COLS = 6;
const GARDEN_START_COL = 5;
const GARDEN_START_ROW = 22;

const BUILDING_LAYOUTS: Record<FarmBuildingId, { col: number; row: number }> = {
  coop: { col: 37, row: 8 },
  corral: { col: 37, row: 25 },
  stable: { col: 2, row: 34 }
};

const BUILDING_ORDER: FarmBuildingId[] = ['coop', 'corral', 'stable'];

const RANK_LABELS: Record<string, string> = {
  white: 'Comum',
  green: 'Incomum',
  blue: 'Raro',
  orange: 'Épico',
  red: 'Lendário'
};

const RANK_COLORS: Record<string, number> = {
  white: 0xe6dfca,
  green: 0x82cf83,
  blue: 0x74b6ee,
  orange: 0xf2a45d,
  red: 0xe86a62
};

interface PlotView {
  index: number;
  container: Phaser.GameObjects.Container;
  soil: Phaser.GameObjects.Graphics;
  art: Phaser.GameObjects.Graphics;
  marker: Phaser.GameObjects.Graphics;
  beacon: Phaser.GameObjects.Container;
  hovered: boolean;
  ready: boolean;
}

interface BuildingBadge {
  buildingId: FarmBuildingId;
  label: Phaser.GameObjects.Text;
}

function plotPosition(index: number): { col: number; row: number } {
  return {
    col: GARDEN_START_COL + (index % GARDEN_COLS),
    row: GARDEN_START_ROW + Math.floor(index / GARDEN_COLS)
  };
}

function formatRemaining(milliseconds: number): string {
  const seconds = Math.max(1, Math.ceil(milliseconds / 1000));
  if (seconds < 60) return `${seconds}s`;
  return `${Math.ceil(seconds / 60)} min`;
}

function buildRoads(): Set<string> {
  const roads = new Set<string>();
  // Caminhos livres terminam nas porteiras e contornam as construções.
  addRoadLine(roads, 43, 39, 29, 34);
  addRoadLine(roads, 29, 34, 23, 20);
  addRoadLine(roads, 23, 20, 23, 9);
  addRoadLine(roads, 23, 20, 8, 22);
  addRoadLine(roads, 29, 34, 36, 35);
  addRoadLine(roads, 36, 35, 44, 32);
  addRoadLine(roads, 29, 34, 39, 30);
  addRoadLine(roads, 39, 30, 44, 15);
  addRoadLine(roads, 29, 34, 17, 40);
  addRoadLine(roads, 17, 40, 9, 41);
  addRoadLine(roads, 43, 39, 48, 44);
  return roads;
}

export class FarmScene extends Phaser.Scene {
  private character!: CharacterSummary;
  private hud: GameHud | null = null;
  private alive = true;
  private farm: FarmState | null = null;
  private farmGold = 0;
  private farmSignature = '';
  private lastFarmSyncAt = 0;
  private farmSyncInFlight = false;

  private world!: Phaser.GameObjects.Container;
  private ranchHud!: RanchHud;
  private atmosphere!: { resize: (width: number, height: number) => void };
  private plots: PlotView[] = [];
  private buildingObjects: Phaser.GameObjects.GameObject[] = [];
  private livestockObjects: Phaser.GameObjects.GameObject[] = [];
  private buildingBadges: BuildingBadge[] = [];

  private avatar!: PlayerAvatar;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private moving = false;
  private compactView = false;
  private cameraZoom = 0.85;
  private cameraFocusX = 0;
  private cameraFocusY = 0;

  private refreshTimer: Phaser.Time.TimerEvent | null = null;
  private busyPlots = new Set<number>();
  private hoveredPlotIndex: number | null = null;
  private lastPointerX = 0;
  private lastPointerY = 0;

  private seedPicker: Phaser.GameObjects.Container | null = null;
  private animalPanel: Phaser.GameObjects.Container | null = null;
  private hoverTip: Phaser.GameObjects.Text | null = null;

  constructor() {
    super('FarmScene');
  }

  create(): void {
    this.character = this.registry.get('character') as CharacterSummary;
    this.hud = (this.registry.get('hud') as GameHud | undefined) ?? null;
    this.alive = true;
    this.cameras.main.setBackgroundColor('#83b065');

    this.world = this.add.container(0, 0);

    this.ranchHud = new RanchHud(this, {
      ownerName: this.character.name,
      onOpenShop: () => this.openMarket()
    });

    this.atmosphere = createAtmosphere(this);
    this.hoverTip = this.add.text(0, 0, '', {
      fontFamily: RANCH_FONT_BODY,
      fontSize: '10.5px',
      color: '#f8e8c2',
      backgroundColor: 'rgba(26, 17, 9, 0.94)',
      padding: { x: 9, y: 6 },
      lineSpacing: 3
    }).setDepth(9500).setVisible(false);

    this.hud?.setConnection('online');
    this.hud?.setLocation(`Rancho de ${this.character.name}`, 'Propriedade particular', true);
    this.hud?.pushFeed(`Bem-vindo ao seu rancho, ${this.character.name}!`, 'gold');
    this.hud?.pushFeed('Clique nos canteiros para plantar, regar e colher.', 'normal');
    this.hud?.setGold(this.character.gold);

    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.keys = {
        W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
      };
      this.input.keyboard.on('keydown-ESC', this.handleEscape, this);
    }

    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.input.on('pointerdown', this.handleFarmGroundClick, this);
    this.input.on('pointermove', this.handlePointerMove, this);
    this.game.events.on('farm-updated', this.handleFarmUpdated, this);

    this.layout();
    this.renderFullScene();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.alive = false;
      this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
      this.input.off('pointerdown', this.handleFarmGroundClick, this);
      this.input.off('pointermove', this.handlePointerMove, this);
      this.input.keyboard?.off('keydown-ESC', this.handleEscape, this);
      this.game.events.off('farm-updated', this.handleFarmUpdated, this);
      this.refreshTimer?.destroy();
      this.seedPicker?.destroy();
      this.animalPanel?.destroy();
      this.ranchHud?.destroy();
    });

    void this.loadAndRenderFarm();

    this.refreshTimer = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (!this.alive || !this.farm) return;
        this.tickPlotStates();
        if (Date.now() - this.lastFarmSyncAt >= 30_000 && !this.farmSyncInFlight) {
          void this.syncFarmState();
        }
      }
    });
  }

  private iso(col: number, row: number): { x: number; y: number } {
    return {
      x: (col - row) * (TILE_W / 2) - ((COLS - ROWS) * TILE_W) / 4,
      y: (col + row) * (TILE_H / 2) - ((COLS + ROWS - 2) * TILE_H) / 4
    };
  }

  private async loadAndRenderFarm(): Promise<void> {
    try {
      const data = await api.getFarm(this.character.id);
      if (!this.alive) return;
      this.setFarmData(data.farm, data.gold);
    } catch (error) {
      if (!this.alive) return;
      this.hud?.pushFeed(
        error instanceof Error ? error.message : 'Não foi possível carregar os dados da fazenda.',
        'danger'
      );
      this.renderFullScene();
      this.ranchHud.update(null, this.character.gold);
    }
  }

  private async syncFarmState(): Promise<void> {
    if (this.farmSyncInFlight || !this.alive) return;
    this.farmSyncInFlight = true;
    try {
      const data = await api.getFarm(this.character.id);
      if (!this.alive) return;
      this.setFarmData(data.farm, data.gold);
    } catch (error) {
      this.hud?.pushFeed(
        error instanceof Error ? error.message : 'Falha ao sincronizar os cuidados da fazenda.',
        'danger'
      );
      this.lastFarmSyncAt = Date.now();
    } finally {
      this.farmSyncInFlight = false;
    }
  }

  private setFarmData(farm: FarmState, gold: number): void {
    this.farm = farm;
    this.farmGold = gold;
    this.lastFarmSyncAt = Date.now();
    this.hud?.setGold(gold);
    this.ranchHud.update(farm, gold);

    const signature = this.computeFarmSignature(farm);
    if (signature !== this.farmSignature) {
      this.farmSignature = signature;
      this.rebuildBuildingsAndAnimals();
    } else {
      this.updateBuildingBadges();
    }
    this.renderPlots();
  }

  private applyFarmResponse(response: FarmResponse): void {
    this.setFarmData(response.farm, response.gold);
  }

  private computeFarmSignature(farm: FarmState | null): string {
    if (!farm) return '';
    const buildings = [...farm.buildings].sort().join(',');
    const animals = farm.animals.map((animal) => animal.id).join(',');
    const eggs = (farm.eggs ?? []).map((egg) => `${egg.id}:${egg.fertilized ? 1 : 0}:${egg.clutchId ?? ''}:${egg.hatchAt ?? ''}`).join(',');
    return `${buildings}|${animals}|${eggs}`;
  }

  private handleFarmUpdated(response: FarmResponse): void {
    if (!this.alive) return;
    this.applyFarmResponse(response);
  }

  private handleEscape(): void {
    if (this.animalPanel) {
      this.closeAnimalPanel();
      return;
    }
    if (this.seedPicker) this.closeSeedPicker();
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    this.lastPointerX = pointer.x;
    this.lastPointerY = pointer.y;
    if (this.hoverTip?.visible) this.positionHoverTip(pointer.x, pointer.y);
  }

  private handleFarmGroundClick(pointer: Phaser.Input.Pointer): void {
    if (!this.avatar || pointer.button !== 0 || !this.world) return;
    if (this.seedPicker || this.animalPanel) return;
    if (this.ranchHud?.contains(pointer.x, pointer.y)) return;
    if (this.input.hitTestPointer(pointer).length > 0) {
      this.hideHoverTip();
      return;
    }

    const targetX = Phaser.Math.Clamp(
      (pointer.x - this.world.x) / this.world.scaleX,
      FARM_LIMITS.minX,
      FARM_LIMITS.maxX
    );
    const targetY = Phaser.Math.Clamp(
      (pointer.y - this.world.y) / this.world.scaleY,
      FARM_LIMITS.minY,
      FARM_LIMITS.maxY
    );
    const distance = Phaser.Math.Distance.Between(this.avatar.root.x, this.avatar.root.y, targetX, targetY);
    if (distance < 10) return;
    this.moving = false;
    this.avatar.walkTo(targetX, targetY, Phaser.Math.Clamp(distance * 3.1, 220, 4200));
    this.hideHoverTip();
  }

  update(_time: number, delta: number): void {
    if (!this.alive || !this.world) return;
    if (this.avatar) {
      this.avatar.root.setDepth(2000 + this.avatar.root.y);
      if (this.cursors && this.keys && !this.seedPicker && !this.animalPanel) {
        let dx = 0;
        let dy = 0;
        if (this.cursors.left.isDown || this.keys.A.isDown) { dx -= 1; dy += 0.5; }
        if (this.cursors.right.isDown || this.keys.D.isDown) { dx += 1; dy -= 0.5; }
        if (this.cursors.up.isDown || this.keys.W.isDown) { dx -= 1; dy -= 0.5; }
        if (this.cursors.down.isDown || this.keys.S.isDown) { dx += 1; dy += 0.5; }
        const magnitude = Math.hypot(dx, dy);
        if (magnitude > 0) {
          dx /= magnitude;
          dy /= magnitude;
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
      } else if (this.moving) {
        this.avatar.setWalking(false);
        this.moving = false;
      }

      const smooth = 1 - Math.pow(0.0016, Math.max(0.016, delta / 1000));
      // Em telas estreitas, desloca o foco para o centro do rancho e mantém
      // celeiro, horta e curral no enquadramento enquanto o jogador caminha.
      const focusX = this.compactView
        ? this.avatar.root.x + 420
        : this.avatar.root.x;
      this.cameraFocusX += (focusX - this.cameraFocusX) * smooth;
      this.cameraFocusY += (this.avatar.root.y - this.cameraFocusY) * smooth;
    }
    this.applyFarmCamera();
  }

  private layout(): void {
    if (!this.alive || !this.scale) return;
    const width = this.scale.width;
    const height = this.scale.height;
    const mobile = width < 760 || height < 520;
    this.compactView = mobile;

    if (this.seedPicker) this.closeSeedPicker();
    if (this.animalPanel) this.closeAnimalPanel();

    this.cameraZoom = mobile
      ? Phaser.Math.Clamp(Math.min(width / 1450, height / 1250), 0.3, 0.5)
      : Phaser.Math.Clamp(Math.min(width / 2300, height / 1400), 0.52, 0.9);

    this.ranchHud?.layout(width, height, mobile);
    this.atmosphere?.resize(width, height);

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
    const worldHalfX = 2350;
    const worldHalfY = 1450;
    const focusX = halfW >= worldHalfX
      ? 0
      : Phaser.Math.Clamp(this.cameraFocusX, -worldHalfX + halfW, worldHalfX - halfW);
    const focusY = halfH >= worldHalfY
      ? 0
      : Phaser.Math.Clamp(this.cameraFocusY, -worldHalfY + halfH, worldHalfY - halfH);
    this.world.setScale(zoom);
    this.world.setPosition(
      this.scale.width / 2 - focusX * zoom,
      this.scale.height / 2 - focusY * zoom
    );
  }

  // ---------------------------------------------------------------------------
  // Cenário
  // ---------------------------------------------------------------------------

  private renderFullScene(): void {
    this.world.removeAll(true);
    this.plots = [];
    this.buildingObjects = [];
    this.livestockObjects = [];
    this.buildingBadges = [];
    this.hoveredPlotIndex = null;

    const roads = buildRoads();
    const ground = createGround(this, (col, row) => this.iso(col, row), COLS, ROWS, roads);
    this.world.add(ground);

    const meadow = createMeadowDetails(this, (col, row) => this.iso(col, row), COLS, ROWS, roads);
    this.world.add(meadow);

    this.buildAnimalYards();
    this.addScenery();
    this.buildPlotViews();
    this.rebuildBuildingsAndAnimals();
    this.farmSignature = this.computeFarmSignature(this.farm);
    this.renderPlots();
    this.drawPlayer();
    this.atmosphere.resize(this.scale.width, this.scale.height);
  }


  /** Setores de criação em formato de piquete quadrado, com piso e entrada legíveis. */
  private buildAnimalYards(): void {
    // O tilemap já desenha os caminhos. Removido o traçado duplicado em Graphics,
    // que cruzava fachadas, cercados e áreas de circulação.

    const yards: Array<{ id: FarmBuildingId; halfW: number; halfH: number; label: string; ground: number }> = [
      { id: 'coop', halfW: 500, halfH: 330, label: 'GALINHEIRO', ground: 0xd8bd83 },
      { id: 'corral', halfW: 560, halfH: 370, label: 'CURRAL', ground: 0xbca071 },
      { id: 'stable', halfW: 570, halfH: 380, label: 'ESTÁBULO', ground: 0xb58b5c }
    ];
    for (const yard of yards) {
      const layout = BUILDING_LAYOUTS[yard.id];
      const point = this.iso(layout.col, layout.row);
      const corners = [
        new Phaser.Math.Vector2(point.x, point.y - yard.halfH),
        new Phaser.Math.Vector2(point.x + yard.halfW, point.y),
        new Phaser.Math.Vector2(point.x, point.y + yard.halfH),
        new Phaser.Math.Vector2(point.x - yard.halfW, point.y)
      ];
      const floor = this.add.graphics();
      floor.fillStyle(0x304b27, 0.26);
      floor.fillPoints(corners.map((p) => new Phaser.Math.Vector2(p.x + 7, p.y + 12)), true);
      floor.fillStyle(yard.ground, 0.48);
      floor.fillPoints(corners, true);
      floor.lineStyle(7, 0x6c4729, 0.96);
      floor.strokePoints(corners, true);
      floor.lineStyle(2, 0xe1c58d, 0.48);
      floor.strokePoints(corners.map((p, i) => new Phaser.Math.Vector2(
        p.x + (i === 0 || i === 3 ? 12 : -12), p.y + (i < 2 ? 8 : -8)
      )), true);
      // Patches of grass, straw and stepping stones make the pen read as a lived-in yard.
      for (let i = 0; i < 18; i += 1) {
        const px = point.x + Phaser.Math.Between(-yard.halfW * 0.58, yard.halfW * 0.58);
        const py = point.y + Phaser.Math.Between(-yard.halfH * 0.52, yard.halfH * 0.52);
        floor.fillStyle(i % 3 === 0 ? 0x668a45 : 0x7c9b51, i % 3 === 0 ? 0.32 : 0.18);
        floor.fillEllipse(px, py, Phaser.Math.Between(18, 42), Phaser.Math.Between(7, 15));
      }
      for (let i = 0; i < 8; i += 1) {
        const px = point.x + Phaser.Math.Between(-yard.halfW * 0.45, yard.halfW * 0.45);
        const py = point.y + Phaser.Math.Between(-yard.halfH * 0.4, yard.halfH * 0.4);
        floor.fillStyle(0xead7a8, 0.3);
        floor.fillEllipse(px, py, 8, 4);
      }
      floor.setDepth(470 + point.y);
      this.world.add(floor);

      // Fence lines are split around a broad gate at the front of each square paddock.
      const gateGap = 130;
      const fenceParts = [
        createFenceLine(this, point.x - yard.halfW, point.y, point.x, point.y - yard.halfH, { height: 36, spacing: 26, alpha: 1 }),
        createFenceLine(this, point.x, point.y - yard.halfH, point.x + yard.halfW, point.y, { height: 36, spacing: 26, alpha: 1 }),
        createFenceLine(this, point.x - yard.halfW, point.y, point.x - gateGap / 2, point.y + yard.halfH * 0.86, { height: 36, spacing: 26, alpha: 1 }),
        createFenceLine(this, point.x + gateGap / 2, point.y + yard.halfH * 0.86, point.x + yard.halfW, point.y, { height: 36, spacing: 26, alpha: 1 })
      ];
      fenceParts.forEach((fence) => {
        fence.setDepth(1600 + point.y);
        this.world.add(fence);
      });
      const gate = createRanchGate(this, point.x, point.y + yard.halfH * 0.86, yard.label, () => {
        this.hud?.pushFeed(`Você entrou na área do ${yard.label.toLowerCase()}.`, 'normal');
      });
      gate.setScale(1.12);
      gate.setDepth(1950 + point.y + yard.halfH);
      this.world.add(gate);
      const sign = createRusticSign(this, point.x + yard.halfW * 0.58, point.y + yard.halfH * 0.38, yard.label);
      sign.setScale(1.35);
      sign.setDepth(1950 + point.y + yard.halfH * 0.38);
      this.world.add(sign);
    }
  }

  private addScenery(): void {
    const housePoint = this.iso(23, 9);
    const house = createFarmhouse(this, housePoint.x, housePoint.y, this.character.name);
    house.setDepth(2000 + housePoint.y);
    this.world.add(house);

    const barnPoint = this.iso(7, 10);
    const barn = createBarn(this, barnPoint.x, barnPoint.y);
    barn.setDepth(2000 + barnPoint.y);
    this.world.add(barn);

    const windmillPoint = this.iso(43, 8);
    const windmill = createWindmill(this, windmillPoint.x, windmillPoint.y);
    windmill.setDepth(2000 + windmillPoint.y);
    this.world.add(windmill);

    const wellPoint = this.iso(23, 13);
    const well = createWell(this, wellPoint.x, wellPoint.y);
    well.setDepth(2000 + wellPoint.y);
    this.world.add(well);

    const scarecrowPoint = this.iso(12, 26);
    const scarecrow = createScarecrow(this, scarecrowPoint.x, scarecrowPoint.y);
    scarecrow.setDepth(2000 + scarecrowPoint.y);
    this.world.add(scarecrow);

    const gardenPoint = this.iso(8, 21);
    const gardenSign = createRusticSign(this, gardenPoint.x, gardenPoint.y, 'Horta do rancho');
    gardenSign.setDepth(2000 + gardenPoint.y);
    this.world.add(gardenSign);

    const seedCratePoint = this.iso(8, 22.3);
    const seedCrate = createSeedCrate(this, seedCratePoint.x, seedCratePoint.y, 0.95);
    seedCrate.setDepth(2000 + seedCratePoint.y);
    this.world.add(seedCrate);

    const wateringCanPoint = this.iso(7.5, 24);
    const wateringCan = createWateringCan(this, wateringCanPoint.x, wateringCanPoint.y, 1);
    wateringCan.setDepth(2000 + wateringCanPoint.y);
    this.world.add(wateringCan);

    const wheelbarrowPoint = this.iso(7, 25.7);
    const wheelbarrow = createWheelbarrow(this, wheelbarrowPoint.x, wheelbarrowPoint.y, 1);
    wheelbarrow.setDepth(2000 + wheelbarrowPoint.y);
    this.world.add(wheelbarrow);

    const hayBaleA = createHayBale(this, -354, -204, 0.9);
    hayBaleA.setDepth(2000 - 204);
    this.world.add(hayBaleA);
    const hayBaleB = createHayBale(this, -322, -190, 0.65);
    hayBaleB.setDepth(2000 - 190);
    this.world.add(hayBaleB);

    const clothesline = createClothesline(this, 12, -102, 104);
    clothesline.setDepth(2000 - 102);
    this.world.add(clothesline);

    const mailbox = createMailbox(this, 28, 424);
    mailbox.setDepth(2000 + 424);
    this.world.add(mailbox);

    const gatePoint = this.iso(43, 39);
    const gate = createRanchGate(this, gatePoint.x, gatePoint.y, this.character.name, () => this.exitToCity());
    gate.setDepth(2000 + gatePoint.y);
    this.world.add(gate);

    for (const side of [-1, 1]) {
      const fence = createFenceLine(
        this,
        gatePoint.x + 66 * side,
        gatePoint.y - 12,
        gatePoint.x + 292 * side,
        gatePoint.y - 12,
        { height: 20, spacing: 27, alpha: 0.95 }
      );
      fence.setDepth(2000 + gatePoint.y - 12);
      this.world.add(fence);
    }

    const lanternPoints: Array<[number, number, number]> = [
      [0, 48, 0.9],
      [-360, 62, 0.85],
      [-48, 264, 0.9]
    ];
    for (const [x, y, scale] of lanternPoints) {
      const lantern = createLanternPost(this, x, y);
      lantern.setScale(scale);
      lantern.setDepth(2000 + y);
      this.world.add(lantern);
    }

    const barrel = createBarrel(this, 328, -44, 0.9);
    barrel.setDepth(2000 - 44);
    this.world.add(barrel);

    const treeSpots: Array<{
      col: number;
      row: number;
      variant: 'oak' | 'fruit' | 'pine';
      scale: number;
    }> = [
      { col: 2, row: 3, variant: 'oak', scale: 1.05 },
      { col: 7, row: 4, variant: 'fruit', scale: 0.95 },
      { col: 2, row: 10, variant: 'pine', scale: 1.0 },
      { col: 4, row: 18, variant: 'oak', scale: 1.1 },
      { col: 8, row: 20, variant: 'fruit', scale: 0.9 },
      { col: 22, row: 3, variant: 'oak', scale: 1.0 },
      { col: 24, row: 9, variant: 'pine', scale: 0.95 },
      { col: 23, row: 15, variant: 'fruit', scale: 0.9 },
      { col: 10, row: 19, variant: 'fruit', scale: 0.85 }
    ];

    for (const spot of treeSpots) {
      const point = this.iso(spot.col, spot.row);
      const tree = createTree(this, point.x, point.y, spot.variant, spot.scale);
      tree.setDepth(2000 + point.y);
      this.world.add(tree);
    }

    const butterflies: Array<[number, number, number]> = [
      [-320, -46, 0xf2d36a],
      [-210, -88, 0xe9a9b8],
      [-430, 8, 0xf4eee0],
      [250, -20, 0xf2c35f]
    ];
    for (const [x, y, color] of butterflies) {
      const butterfly = createButterfly(this, x, y, color);
      butterfly.setDepth(2000 + y + 30);
      this.world.add(butterfly);
    }

    for (let index = 0; index < 10; index += 1) {
      const x = -740 + ((index * 137) % 1480);
      const y = -230 + ((index * 97) % 560);
      const mote = this.add.circle(x, y, 1.2 + (index % 3) * 0.5, 0xffe6a4, 0.18 + (index % 4) * 0.03);
      mote.setDepth(7500);
      this.world.add(mote);
      this.tweens.add({
        targets: mote,
        x: x + 18 + (index % 5) * 7,
        y: y - 42 - (index % 4) * 14,
        alpha: { from: mote.alpha, to: 0.04 },
        duration: 4200 + (index % 5) * 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: index * 320
      });
    }
  }

  private exitToCity(): void {
    sfxClick();
    this.scene.stop('FarmScene');
    this.scene.start('CityScene');
  }

  // ---------------------------------------------------------------------------
  // Canteiros
  // ---------------------------------------------------------------------------

  private buildPlotViews(): void {
    for (let index = 0; index < MAX_PLOTS; index += 1) {
      const { col, row } = plotPosition(index);
      const point = this.iso(col, row);
      const container = this.add.container(point.x, point.y).setDepth(2000 + point.y);
      const soil = this.add.graphics();
      const art = this.add.graphics();
      const marker = this.add.graphics();
      const beacon = this.add.container(0, -30);
      const beaconArt = this.add.graphics();
      beaconArt.fillStyle(0xffd77a, 0.18);
      beaconArt.fillCircle(0, 0, 12);
      beaconArt.fillStyle(0xffe6a4, 0.95);
      beaconArt.fillPoints([
        { x: 0, y: -6 },
        { x: 5, y: 0 },
        { x: 0, y: 6 },
        { x: -5, y: 0 }
      ], true);
      beaconArt.lineStyle(1.2, 0xa3742c, 0.8);
      beaconArt.strokePoints([
        { x: 0, y: -6 },
        { x: 5, y: 0 },
        { x: 0, y: 6 },
        { x: -5, y: 0 }
      ], true);
      beacon.add(beaconArt);
      beacon.setVisible(false);
      container.add([soil, art, marker, beacon]);

      const view: PlotView = {
        index,
        container,
        soil,
        art,
        marker,
        beacon,
        hovered: false,
        ready: false
      };

      container.setInteractive(
        new Phaser.Geom.Polygon([
          { x: 0, y: -26 },
          { x: 45, y: 0 },
          { x: 0, y: 26 },
          { x: -45, y: 0 }
        ]),
        Phaser.Geom.Polygon.Contains
      );
      container.on('pointerover', (pointer: Phaser.Input.Pointer) => {
        view.hovered = true;
        this.hoveredPlotIndex = index;
        this.renderPlotView(view);
        this.showHoverTip(this.plotTooltip(view), pointer.x, pointer.y);
      });
      container.on('pointerout', () => {
        view.hovered = false;
        if (this.hoveredPlotIndex === index) this.hoveredPlotIndex = null;
        this.renderPlotView(view);
        this.hideHoverTip();
      });
      container.on(
        'pointerdown',
        (
          _pointer: Phaser.Input.Pointer,
          _localX: number,
          _localY: number,
          event: Phaser.Types.Input.EventData
        ) => {
          event.stopPropagation();
          this.handlePlotClick(view);
        }
      );

      this.world.add(container);
      this.plots.push(view);

      this.tweens.add({
        targets: beacon,
        y: { from: -30, to: -36 },
        duration: 820,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: (index % 6) * 90
      });
    }
  }

  private unlockedPlots(): number {
    return this.farm?.unlockedPlots ?? this.farm?.plots.length ?? INITIAL_PLOTS;
  }

  private plotState(index: number): FarmPlotState | undefined {
    return this.farm?.plots.find((plot) => plot.plotIndex === index);
  }

  private isPlotReady(index: number): boolean {
    const state = this.plotState(index);
    if (!state?.cropId || !state.readyAt) return false;
    return Date.now() >= new Date(state.readyAt).getTime();
  }

  private renderPlots(): void {
    for (const view of this.plots) this.renderPlotView(view);
    if (this.hoveredPlotIndex !== null) this.refreshHoverTip();
  }

  private renderPlotView(view: PlotView): void {
    const unlocked = this.unlockedPlots();
    const locked = view.index >= unlocked;
    const state = this.plotState(view.index);
    const cropId = state?.cropId ?? null;
    const watered = Boolean(state?.readyAt);
    const plantedAt = state?.plantedAt ? new Date(state.plantedAt).getTime() : 0;
    const readyAt = state?.readyAt ? new Date(state.readyAt).getTime() : 0;
    const now = Date.now();
    const ready = Boolean(cropId && watered && readyAt > 0 && now >= readyAt);
    const stage = cropId
      ? watered && readyAt > plantedAt
        ? Phaser.Math.Clamp((now - plantedAt) / Math.max(1, readyAt - plantedAt), 0.12, 1)
        : 0.12
      : 0;

    view.ready = ready;
    view.beacon.setVisible(ready);

    const soil = view.soil;
    soil.clear();
    this.drawPlotSoil(soil, view.index, locked, Boolean(cropId), watered);

    const art = view.art;
    art.clear();
    if (cropId && !locked) this.drawCropArt(art, cropId, stage, ready);

    const marker = view.marker;
    marker.clear();
    if (locked) {
      if (view.hovered) {
        fillDiamond(marker, 0, -1, 0xffe6a4, 0.08, 84, 38);
        strokeDiamond(marker, 0, -1, 0xe2cd9e, 0.45, 1.5, 84, 38);
      }
      return;
    }

    if (view.hovered) {
      fillDiamond(marker, 0, -1, 0xffe6a4, 0.1, 82, 36);
      strokeDiamond(marker, 0, -1, 0xffe6a4, 0.95, 2, 84, 38);
    }

    if (cropId && !watered) {
      marker.fillStyle(0x4b97b5, 0.3);
      marker.fillCircle(0, -22, 9);
      marker.fillStyle(0x75c9e6, 0.98);
      marker.fillCircle(0, -19, 6);
      marker.fillStyle(0xcdf2fb, 1);
      marker.fillTriangle(0, -31, -5, -21, 5, -21);
      marker.fillStyle(0xffffff, 0.55);
      marker.fillCircle(-2, -20, 1.6);
    }

    if (!cropId) {
      // Pequenos brotos indicam que o canteiro está livre para plantio.
      marker.lineStyle(1.4, 0x5b8c42, 0.85);
      marker.lineBetween(-26, 4, -26, -2);
      marker.lineBetween(-26, -2, -31, -5);
      marker.lineBetween(-26, -2, -21, -5);
      marker.fillStyle(0x79a95b, 0.9);
      marker.fillEllipse(-31, -6, 4, 2.4);
      marker.fillEllipse(-21, -6, 4, 2.4);
    }
  }

  private drawPlotSoil(
    graphics: Phaser.GameObjects.Graphics,
    index: number,
    locked: boolean,
    planted: boolean,
    watered: boolean
  ): void {
    if (locked) {
      // As terras ainda não compradas se misturam ao capim. Só o contorno
      // aparece ao passar o mouse, para não formar uma grade de losangos.
      graphics.fillStyle(index % 2 === 0 ? 0x789f54 : 0x7ba557, 0.16);
      fillDiamond(graphics, 0, 0, index % 2 === 0 ? 0x789f54 : 0x7ba557, 0.16, 88, 41);
      for (let tuft = 0; tuft < 2; tuft += 1) {
        const x = -26 + ((index * 37 + tuft * 31) % 52);
        const y = -5 + ((index * 17 + tuft * 9) % 12);
        graphics.lineStyle(1.2, tuft % 2 === 0 ? 0x5f8a47 : 0x89b45f, 0.7);
        graphics.lineBetween(x, y, x - 3, y - 6);
        graphics.lineBetween(x + 1, y, x + 1, y - 7);
        graphics.lineBetween(x + 2, y, x + 4, y - 5);
      }
      if (index % 5 === 0) {
        graphics.fillStyle(0xf2d36a, 0.85);
        graphics.fillCircle(-18, -7, 1.6);
        graphics.fillCircle(-15.5, -8.5, 1.6);
        graphics.fillCircle(-16.7, -5.5, 1.6);
        graphics.fillStyle(0xe8bd59, 1);
        graphics.fillCircle(-16.7, -7, 1);
      }
      return;
    }

    graphics.fillStyle(0x263a1e, 0.24);
    graphics.fillEllipse(2, 7, 90, 25);

    graphics.fillStyle(0x4c321d, 0.85);
    fillDiamond(graphics, 0, 2, 0x4c321d, 0.85, 90, 41);
    fillDiamond(graphics, 0, 0, planted ? 0x6f482a : 0x96693f, 1, 84, 38);
    fillDiamond(graphics, 0, -1, planted ? 0x7a5030 : 0xa17146, 1, 80, 34);

    if (watered) {
      graphics.fillStyle(0x4b7c88, 0.13);
      fillDiamond(graphics, 0, -1, 0x4b7c88, 0.13, 78, 32);
      graphics.fillStyle(0xbfe8ea, 0.25);
      graphics.fillEllipse(-10, 1, 22, 5);
      graphics.fillEllipse(14, -4, 15, 4);
    }

    // Sulcos arados.
    for (let furrow = -1; furrow <= 1; furrow += 1) {
      graphics.lineStyle(1.8, planted ? 0x54331d : 0x79502c, 0.8);
      graphics.lineBetween(-27, furrow * 8 - 1, 27, furrow * 8 - 1);
      graphics.lineStyle(0.8, planted ? 0x8d603a : 0xb18254, 0.5);
      graphics.lineBetween(-27, furrow * 8 + 1, 27, furrow * 8 + 1);
    }

    // Pedrinhas e fios de capim nas bordas.
    graphics.fillStyle(0x8e7b5d, 0.6);
    graphics.fillEllipse(-31, 7, 6, 3);
    graphics.fillEllipse(33, -7, 5, 2.4);
    graphics.lineStyle(1, 0x688f4d, 0.75);
    graphics.lineBetween(-36, 6, -38, -1);
    graphics.lineBetween(35, -4, 37, -10);

    // Moldura rústica de madeira, como um canteiro elevado.
    strokeDiamond(graphics, 0, -1, 0x4c321d, 0.9, 3.2, 86, 39);
    strokeDiamond(graphics, 0, -1, 0x9a6a3d, 0.95, 1.6, 83, 36.5);
    graphics.lineStyle(0.8, 0xd0a167, 0.5);
    graphics.lineBetween(-28, -12, 28, -12);
  }

  private drawCropArt(
    graphics: Phaser.GameObjects.Graphics,
    cropId: CropTypeId,
    stage: number,
    ready: boolean
  ): void {
    if (cropId === 'corn') {
      for (let index = 0; index < 5; index += 1) {
        const x = -28 + index * 14;
        const baseY = 5 - Math.abs(index - 2) * 2.2;
        const height = 7 + stage * 32 + (index % 2) * 2;
        const topY = baseY - height;
        graphics.lineStyle(2.4, ready ? 0x8e8a3f : 0x4f8a3b, 1);
        graphics.lineBetween(x, baseY, x + 1, topY);
        graphics.lineStyle(1, 0xa9c873, 0.4);
        graphics.lineBetween(x - 0.5, baseY - 2, x + 0.5, topY + 3);

        graphics.fillStyle(ready ? 0x76953f : 0x5a9748, 0.96);
        graphics.fillTriangle(x, baseY - height * 0.38, x - 10, baseY - height * 0.55, x - 1, baseY - height * 0.6);
        graphics.fillTriangle(x + 1, baseY - height * 0.62, x + 10, baseY - height * 0.78, x + 1, baseY - height * 0.82);

        if (stage > 0.55) {
          const earY = baseY - height * 0.62;
          graphics.fillStyle(ready ? 0xf2c94c : 0xc9b05a, 1);
          graphics.fillEllipse(x + 1, earY, 5, 12);
          graphics.fillStyle(ready ? 0xffe48a : 0xdccb85, 0.85);
          graphics.fillEllipse(x, earY - 1, 2.2, 7);
          graphics.lineStyle(1, 0x7e6b34, 0.6);
          graphics.lineBetween(x + 1, earY - 6, x + 1, earY + 6);
        }

        if (ready) {
          graphics.lineStyle(1.3, 0xcda74a, 1);
          graphics.lineBetween(x + 1, topY, x + 1, topY - 5);
          graphics.fillStyle(0xf6da82, 1);
          graphics.fillCircle(x + 1, topY - 6, 2);
        }
      }
      return;
    }

    if (cropId === 'wheat') {
      for (let index = 0; index < 7; index += 1) {
        const x = -26 + index * 8.6;
        const height = 9 + stage * 25 + (index % 3) * 2;
        const topY = 6 - height;
        graphics.lineStyle(1.6, ready ? 0xd6b45e : 0x78a34f, 1);
        graphics.lineBetween(x, 6 + (index % 2), x + (index % 2 === 0 ? -2 : 2), topY);
        if (stage > 0.45) {
          graphics.fillStyle(ready ? 0xf3d477 : 0xa9c76b, 1);
          for (let grain = 0; grain < 3; grain += 1) {
            graphics.fillEllipse(x + (grain % 2 === 0 ? -1 : 1.4), topY + grain * 4, 3.4, 5.4);
          }
        }
      }
      return;
    }

    for (const offset of [-20, 0, 20]) {
      const height = 10 + stage * 15;
      for (let leaf = 0; leaf < 4; leaf += 1) {
        const angle = -1.1 + leaf * 0.72;
        graphics.lineStyle(1.6, leaf % 2 === 0 ? 0x4f8f43 : 0x6aa353, 1);
        graphics.lineBetween(offset, 7, offset + Math.sin(angle) * height * 0.7, 7 - Math.cos(angle) * height);
      }
      graphics.fillStyle(0x5d9c49, 0.95);
      graphics.fillEllipse(offset, 7 - height * 0.5, 3, height * 0.8);
      if (ready) {
        graphics.fillStyle(0xe98236, 1);
        graphics.fillEllipse(offset, 8, 12, 7);
        graphics.fillStyle(0xf7a44c, 1);
        graphics.fillEllipse(offset - 2, 7, 6, 3.4);
        graphics.fillStyle(0xbf5e25, 0.8);
        graphics.fillEllipse(offset + 4, 9, 3, 1.6);
      }
    }
  }

  private plotTooltip(view: PlotView): string {
    if (view.index >= this.unlockedPlots()) {
      return '🔒 Canteiro bloqueado\nExpanda a terra no mercado do rancho.';
    }
    const state = this.plotState(view.index);
    if (!state?.cropId) {
      return '🌱 Canteiro livre\nClique para escolher uma semente.';
    }
    const crop = FARM_CROPS[state.cropId];
    const icon = crop?.icon ?? '🌱';
    const name = crop?.name ?? 'Cultivo';
    if (!state.readyAt) {
      return `${icon} ${name}\nClique para regar e iniciar o crescimento.`;
    }
    const remaining = new Date(state.readyAt).getTime() - Date.now();
    if (remaining <= 0) {
      return `${icon} ${name} pronto!\nClique para colher.`;
    }
    return `${icon} ${name}\nFica pronto em ${formatRemaining(remaining)}.`;
  }

  private refreshHoverTip(): void {
    if (this.hoveredPlotIndex === null || !this.hoverTip?.visible) return;
    const view = this.plots[this.hoveredPlotIndex];
    if (!view) return;
    this.showHoverTip(this.plotTooltip(view), this.lastPointerX, this.lastPointerY);
  }

  private tickPlotStates(): void {
    let needsRender = false;
    for (const view of this.plots) {
      if (this.isPlotReady(view.index) !== view.ready) {
        needsRender = true;
        break;
      }
    }
    if (needsRender) {
      this.renderPlots();
      return;
    }
    this.refreshHoverTip();
  }

  private handlePlotClick(view: PlotView): void {
    if (!this.farm) return;
    if (view.index >= this.unlockedPlots()) {
      sfxClick();
      this.openMarket();
      return;
    }
    if (this.busyPlots.has(view.index)) return;

    const state = this.plotState(view.index);
    if (!state?.cropId) {
      this.openSeedPicker(view.index);
      return;
    }

    if (!state.readyAt) {
      void this.waterPlot(view.index);
      return;
    }

    const remaining = new Date(state.readyAt).getTime() - Date.now();
    if (remaining > 0) {
      this.floatText(view.container.x, view.container.y - 18, `⏳ ${formatRemaining(remaining)}`, '#ffe6a4');
      return;
    }
    void this.harvestPlot(view.index);
  }

  private openSeedPicker(plotIndex: number): void {
    if (!this.farm) return;
    sfxClick();
    this.hideHoverTip();
    this.closeAnimalPanel();
    this.closeSeedPicker();

    const width = Math.min(382, this.scale.width - 24);
    const height = 336;
    const root = this.add.container(0, 0).setDepth(9700);

    const overlay = this.add
      .rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, 0x0e0803, 0.5)
      .setInteractive();
    overlay.on('pointerdown', () => this.closeSeedPicker());

    const panel = this.add.container(this.scale.width / 2, this.scale.height / 2);
    const background = this.add.graphics();
    drawRanchPanel(background, -width / 2, -height / 2, width, height, { variant: 'parchment' });
    const block = this.add
      .rectangle(0, 0, width - 18, height - 18, 0x000000, 0.001)
      .setInteractive();
    block.on('pointerdown', (
      _pointer: Phaser.Input.Pointer,
      _localX: number,
      _localY: number,
      event: Phaser.Types.Input.EventData
    ) => {
      event.stopPropagation();
    });

    const eyebrow = this.add.text(0, -height / 2 + 31, 'HORTA DO RANCHO', {
      fontFamily: RANCH_FONT_BODY,
      fontSize: '8px',
      fontStyle: 'bold',
      color: '#8a6334',
      letterSpacing: 2.4
    }).setOrigin(0.5);

    const title = this.add.text(0, -height / 2 + 53, 'O que vamos plantar?', {
      fontFamily: RANCH_FONT_DISPLAY,
      fontSize: '19px',
      color: '#3a2514'
    }).setOrigin(0.5);

    const subtitle = this.add.text(0, -height / 2 + 74, 'Sementes do estoque ou compradas na hora.', {
      fontFamily: RANCH_FONT_BODY,
      fontSize: '9px',
      color: '#7b5b36'
    }).setOrigin(0.5);

    panel.add([background, block, eyebrow, title, subtitle]);

    const crops: CropTypeId[] = ['corn', 'wheat', 'carrot'];
    crops.forEach((cropId, index) => {
      const definition = FARM_CROPS[cropId];
      const seedCount = this.farm?.seeds?.[cropId] ?? 0;
      const rowY = -height / 2 + 132 + index * 58;
      const row = this.add.container(0, rowY);

      const rowBackground = this.add.graphics();
      rowBackground.fillStyle(0x9c7748, 0.1);
      rowBackground.fillRoundedRect(-width / 2 + 22, -23, width - 44, 46, 8);
      rowBackground.lineStyle(1, 0xa77d4b, 0.35);
      rowBackground.strokeRoundedRect(-width / 2 + 22, -23, width - 44, 46, 8);
      rowBackground.fillStyle(0xc9a46b, 0.24);
      rowBackground.fillCircle(-width / 2 + 48, 0, 17);
      rowBackground.lineStyle(1, 0x9a7442, 0.4);
      rowBackground.strokeCircle(-width / 2 + 48, 0, 17);

      const icon = this.add.text(-width / 2 + 48, 0, definition.icon, {
        fontFamily: '"Segoe UI Emoji", "Apple Color Emoji", sans-serif',
        fontSize: '19px'
      }).setOrigin(0.5);

      const name = this.add.text(-width / 2 + 72, -9, definition.name, {
        fontFamily: RANCH_FONT_DISPLAY,
        fontSize: '12px',
        color: '#3d2816'
      });
      const stock = this.add.text(
        -width / 2 + 72,
        7,
        seedCount > 0 ? `${seedCount} semente${seedCount > 1 ? 's' : ''} no estoque` : `Sem sementes · ${definition.cost} ouro`,
        {
          fontFamily: RANCH_FONT_BODY,
          fontSize: '8.5px',
          color: '#7b5b36'
        }
      );

      const action = this.add.text(width / 2 - 40, 0, seedCount > 0 ? 'Plantar' : 'Comprar', {
        fontFamily: RANCH_FONT_BODY,
        fontSize: '9px',
        fontStyle: 'bold',
        color: '#2e5c32'
      }).setOrigin(1, 0.5);

      const hit = this.add
        .rectangle(0, 0, width - 44, 46, 0x000000, 0.001)
        .setInteractive({ useHandCursor: true });
      hit.on('pointerover', () => {
        rowBackground.clear();
        rowBackground.fillStyle(0xe3c789, 0.55);
        rowBackground.fillRoundedRect(-width / 2 + 22, -23, width - 44, 46, 8);
        rowBackground.lineStyle(1.3, 0x9a6f39, 0.7);
        rowBackground.strokeRoundedRect(-width / 2 + 22, -23, width - 44, 46, 8);
        rowBackground.fillStyle(0xd4b273, 0.5);
        rowBackground.fillCircle(-width / 2 + 48, 0, 17);
      });
      hit.on('pointerout', () => {
        rowBackground.clear();
        rowBackground.fillStyle(0x9c7748, 0.1);
        rowBackground.fillRoundedRect(-width / 2 + 22, -23, width - 44, 46, 8);
        rowBackground.lineStyle(1, 0xa77d4b, 0.35);
        rowBackground.strokeRoundedRect(-width / 2 + 22, -23, width - 44, 46, 8);
        rowBackground.fillStyle(0xc9a46b, 0.24);
        rowBackground.fillCircle(-width / 2 + 48, 0, 17);
        rowBackground.lineStyle(1, 0x9a7442, 0.4);
        rowBackground.strokeCircle(-width / 2 + 48, 0, 17);
      });
      hit.on(
        'pointerdown',
        (
          _pointer: Phaser.Input.Pointer,
          _localX: number,
          _localY: number,
          event: Phaser.Types.Input.EventData
        ) => {
          event.stopPropagation();
          this.closeSeedPicker();
          void this.plantWithSeedCheck(plotIndex, cropId, seedCount);
        }
      );

      row.add([rowBackground, icon, name, stock, action, hit]);
      panel.add(row);
    });

    const footer = this.add.text(0, height / 2 - 51, 'Cada plantio usa 1 semente.', {
      fontFamily: RANCH_FONT_BODY,
      fontSize: '8px',
      color: '#8a6a42'
    }).setOrigin(0.5);

    const closeButton = createRanchButton(this, {
      width: 120,
      height: 27,
      label: 'Cancelar',
      fontSize: 9,
      onClick: () => this.closeSeedPicker()
    });
    closeButton.container.setPosition(0, height / 2 - 26);
    panel.add([footer, closeButton.container]);

    root.add([overlay, panel]);
    this.seedPicker = root;
  }

  private closeSeedPicker(): void {
    this.seedPicker?.destroy(true);
    this.seedPicker = null;
  }

  private async plantWithSeedCheck(plotIndex: number, cropId: CropTypeId, seedCount: number): Promise<void> {
    if (this.busyPlots.has(plotIndex)) return;
    this.busyPlots.add(plotIndex);
    try {
      if (seedCount < 1) {
        const bought = await api.buyFarmSeeds(this.character.id, cropId, 1);
        if (!this.alive) return;
        this.applyFarmResponse(bought);
        this.hud?.pushFeed(bought.message ?? `${FARM_CROPS[cropId].seedName} compradas.`, 'gold');
      }
      const state = this.plotState(plotIndex);
      if (state?.cropId) return;
      const response = await api.plantFarmCrop(this.character.id, plotIndex, cropId);
      if (!this.alive) return;
      this.applyFarmResponse(response);
      this.hud?.pushFeed(response.message ?? 'Semente plantada!', 'gold');
      sfxClick();
      const view = this.plots[plotIndex];
      if (view) {
        this.floatText(view.container.x, view.container.y - 24, `🌱 ${FARM_CROPS[cropId].name}`, '#d8f0c8');
      }
    } catch (error) {
      this.hud?.pushFeed(
        error instanceof Error ? error.message : 'Não foi possível plantar neste canteiro.',
        'danger'
      );
      this.renderPlots();
    } finally {
      this.busyPlots.delete(plotIndex);
    }
  }

  private async waterPlot(plotIndex: number): Promise<void> {
    if (this.busyPlots.has(plotIndex)) return;
    this.busyPlots.add(plotIndex);
    try {
      const response = await api.waterFarmCrop(this.character.id, plotIndex);
      if (!this.alive) return;
      this.applyFarmResponse(response);
      this.hud?.pushFeed(response.message ?? 'Plantação regada!', 'gold');
      sfxClick();
      const view = this.plots[plotIndex];
      if (view) this.floatText(view.container.x, view.container.y - 20, '💧 Regado', '#bde9f4');
    } catch (error) {
      this.hud?.pushFeed(
        error instanceof Error ? error.message : 'Não foi possível regar o canteiro.',
        'danger'
      );
    } finally {
      this.busyPlots.delete(plotIndex);
    }
  }

  private async harvestPlot(plotIndex: number): Promise<void> {
    if (this.busyPlots.has(plotIndex)) return;
    const state = this.plotState(plotIndex);
    const cropName = state?.cropId ? FARM_CROPS[state.cropId].name : 'Colheita';
    this.busyPlots.add(plotIndex);
    try {
      const response = await api.harvestFarmCrop(this.character.id, plotIndex);
      if (!this.alive) return;
      this.applyFarmResponse(response);
      this.hud?.pushFeed(response.message ?? 'Colheita concluída com sucesso!', 'gold');
      sfxClick();
      const view = this.plots[plotIndex];
      if (view) {
        this.floatText(view.container.x, view.container.y - 24, `✨ ${cropName}!`, '#ffe08a');
      }
    } catch (error) {
      this.hud?.pushFeed(
        error instanceof Error ? error.message : 'Não foi possível colher esta plantação.',
        'danger'
      );
    } finally {
      this.busyPlots.delete(plotIndex);
    }
  }

  // ---------------------------------------------------------------------------
  // Construções, animais e ovos
  // ---------------------------------------------------------------------------

  private rebuildBuildingsAndAnimals(): void {
    for (const object of this.buildingObjects) object.destroy();
    this.buildingObjects = [];
    for (const object of this.livestockObjects) object.destroy();
    this.livestockObjects = [];
    this.buildingBadges = [];

    const owned = new Set<FarmBuildingId>(this.farm?.buildings ?? []);

    for (const buildingId of BUILDING_ORDER) {
      const layout = BUILDING_LAYOUTS[buildingId];
      const point = this.iso(layout.col, layout.row);
      if (owned.has(buildingId)) {
        const art = this.createBuildingArt(buildingId, point.x, point.y);
        art.setScale(buildingId === 'coop' ? 1.55 : 1.48);
        art.setDepth(2000 + point.y);
        this.world.add(art);
        this.buildingObjects.push(art);

        const badge = this.createBuildingBadge(buildingId, point.x, point.y);
        this.world.add(badge);
        this.buildingObjects.push(badge);
      } else {
        const definition = FARM_BUILDINGS[buildingId];
        const pad = createVacantPad(
          this,
          point.x,
          point.y,
          definition.name,
          definition.icon,
          definition.cost
        );
        pad.setDepth(2000 + point.y);
        pad.setInteractive(
          new Phaser.Geom.Rectangle(-104, -118, 208, 178),
          Phaser.Geom.Rectangle.Contains
        );
        pad.on('pointerover', (pointer: Phaser.Input.Pointer) => {
          this.showHoverTip(
            `LOTE DISPONÍVEL · ${definition.name}\n${definition.icon} ${definition.cost.toLocaleString('pt-BR')} ouro no mercado.\nClique para abrir o comércio do rancho.`,
            pointer.x,
            pointer.y
          );
        });
        pad.on('pointerout', () => this.hideHoverTip());
        pad.on(
          'pointerdown',
          (
            _pointer: Phaser.Input.Pointer,
            _localX: number,
            _localY: number,
            event: Phaser.Types.Input.EventData
          ) => {
            event.stopPropagation();
            sfxClick();
            this.openMarket();
          }
        );
        this.world.add(pad);
        this.buildingObjects.push(pad);
      }
    }

    this.spawnAnimals();
    this.spawnEggs();
    this.spawnTroughInteractions();
    this.updateBuildingBadges();
  }

  private createBuildingArt(
    buildingId: FarmBuildingId,
    x: number,
    y: number
  ): Phaser.GameObjects.Container {
    if (buildingId === 'coop') return createCoop(this, x, y);
    if (buildingId === 'corral') return createCorral(this, x, y);
    return createStable(this, x, y);
  }

  private createBuildingBadge(
    buildingId: FarmBuildingId,
    x: number,
    y: number
  ): Phaser.GameObjects.Container {
    const definition = FARM_BUILDINGS[buildingId];
    // O estábulo possui piquete e cochos baixos; a placa desce para não cobrir os cavalos.
    const badgeOffset = buildingId === 'stable' ? 220 : buildingId === 'corral' ? 190 : 170;
    const badge = this.add.container(x, y + badgeOffset).setDepth(2000 + y + badgeOffset + 14);
    const graphics = this.add.graphics();
    graphics.fillStyle(0x263a1e, 0.22);
    graphics.fillEllipse(0, 1, 150, 16);
    graphics.fillStyle(0x54351f, 1);
    graphics.fillRoundedRect(-55, -42, 6, 44, 1.5);
    graphics.fillRoundedRect(49, -42, 6, 44, 1.5);
    graphics.fillStyle(0x8a5b33, 1);
    graphics.fillRect(-53.5, -40, 3, 39);
    graphics.fillRect(50.5, -40, 3, 39);
    graphics.fillStyle(0x3d2515, 1);
    graphics.fillRoundedRect(-70, -43, 140, 25, 5);
    graphics.fillStyle(0x8b5b33, 1);
    graphics.fillRoundedRect(-67, -41, 134, 21, 4);
    graphics.lineStyle(1, 0xd9b979, 0.7);
    graphics.strokeRoundedRect(-64, -38, 128, 15, 3);
    graphics.fillStyle(0x5e3d24, 1);
    graphics.fillCircle(-64, -31, 1.8);
    graphics.fillCircle(64, -31, 1.8);

    const label = this.add.text(0, -30.5, definition.name.toUpperCase(), {
      fontFamily: RANCH_FONT_BODY,
      fontSize: '8px',
      fontStyle: 'bold',
      color: '#ffe9b8',
      letterSpacing: 0.6
    }).setOrigin(0.5);

    const hit = this.add
      .rectangle(0, -30, 142, 32, 0x000000, 0.001)
      .setInteractive({ useHandCursor: true });
    hit.on('pointerover', (pointer: Phaser.Input.Pointer) => {
      const farm = this.farm;
      const count = farm?.animals.filter((animal) => animal.buildingId === buildingId).length ?? 0;
      const care = farm?.animalCare?.[buildingId] ?? { feed: 0, water: 0 };
      this.showHoverTip(
        `${definition.name} · ${count}/${definition.capacity} animais\nRação: ${care.feed}/30 · Água: ${care.water}/30\nClique para abrir o mercado do rancho.`,
        pointer.x,
        pointer.y
      );
    });
    hit.on('pointerout', () => this.hideHoverTip());
    hit.on(
      'pointerdown',
      (
        _pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData
      ) => {
        event.stopPropagation();
        sfxClick();
        this.openMarket();
      }
    );

    badge.add([graphics, label, hit]);
    this.buildingBadges.push({ buildingId, label });
    return badge;
  }

  private updateBuildingBadges(): void {
    for (const badge of this.buildingBadges) {
      const definition = FARM_BUILDINGS[badge.buildingId];
      const count = this.farm?.animals.filter((animal) => animal.buildingId === badge.buildingId).length ?? 0;
      badge.label.setText(`${definition.name.toUpperCase()} · ${count}/${definition.capacity}`);
    }
  }

  private spawnTroughInteractions(): void {
    const troughs: Array<{ buildingId: FarmBuildingId; kind: 'feed' | 'water'; x: number; y: number; label: string }> = [
      { buildingId: 'coop', kind: 'feed', x: -108, y: 51, label: 'COMEDOURO' },
      { buildingId: 'coop', kind: 'water', x: 121, y: 51, label: 'BEBEDOURO' },
      { buildingId: 'corral', kind: 'feed', x: -78, y: 22, label: 'COCHO' },
      { buildingId: 'corral', kind: 'water', x: 80, y: 25, label: 'ÁGUA' },
      { buildingId: 'stable', kind: 'feed', x: -84, y: 28, label: 'FENO' },
      { buildingId: 'stable', kind: 'water', x: 81, y: 31, label: 'ÁGUA' }
    ];
    for (const trough of troughs) {
      const layout = BUILDING_LAYOUTS[trough.buildingId];
      const anchor = this.iso(layout.col, layout.row);
      const buildingScale = trough.buildingId === 'coop' ? 1.55 : 1.48;
      const x = anchor.x + trough.x * buildingScale;
      const y = anchor.y + trough.y * buildingScale;
      const care = this.farm?.animalCare?.[trough.buildingId] ?? { feed: 0, water: 0 };
      const amount = trough.kind === 'feed' ? care.feed : care.water;
      const marker = this.add.container(x, y).setDepth(6200 + y);
      const plate = this.add.graphics();
      plate.fillStyle(0x302013, 0.88);
      plate.fillRoundedRect(-43, -8, 86, 16, 4);
      plate.lineStyle(1, 0xd9b979, 0.85);
      plate.strokeRoundedRect(-43, -8, 86, 16, 4);
      const label = this.add.text(0, 0, trough.label + ' ' + amount + '/30', { fontFamily: RANCH_FONT_BODY, fontSize: '8px', fontStyle: 'bold', color: '#ffe9b8' }).setOrigin(0.5);
      const hit = this.add.rectangle(0, 0, 94, 25, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
      hit.on('pointerover', (pointer: Phaser.Input.Pointer) => this.showHoverTip(trough.label + '\nNível: ' + amount + '/30\nClique para abastecer com 10 unidades.', pointer.x, pointer.y));
      hit.on('pointerout', () => this.hideHoverTip());
      hit.on('pointerdown', async (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
        event.stopPropagation();
        try {
          const response = await api.fillFarmTrough(this.character.id, trough.buildingId, trough.kind, 10);
          this.game.events.emit('farm-updated', response);
          this.hud?.pushFeed(response.message || (trough.label + ' abastecido.'), 'gold');
        } catch (error) {
          this.hud?.pushFeed(error instanceof Error ? error.message : 'Não foi possível abastecer.', 'normal');
        }
      });
      marker.add([plate, label, hit]);
      this.world.add(marker);
      this.livestockObjects.push(marker);
    }
  }

  private spawnAnimals(): void {
    const animals = this.farm?.animals ?? [];
    const counters: Record<FarmBuildingId, number> = { coop: 0, corral: 0, stable: 0 };

    for (const animal of animals) {
      const layout = BUILDING_LAYOUTS[animal.buildingId];
      const anchor = this.iso(layout.col, layout.row);
      const index = counters[animal.buildingId];
      counters[animal.buildingId] += 1;

      const brooding = animal.species === 'chicken' && animal.gender === 'female' && (this.farm?.eggs ?? []).some((egg) => egg.motherId === animal.id && Boolean(egg.clutchId && egg.hatchAt));
      const pregnant = Boolean(animal.pregnantUntil);
      const slot = brooding ? { x: 0, y: 112 } : this.animalSlot(animal.species, index);
      const visual = createAnimalVisual(this, {
        species: animal.species,
        tier: animal.tier,
        gender: animal.gender,
        name: animal.name
      });
      visual.root.setPosition(anchor.x + slot.x, anchor.y + slot.y);
      if (brooding) visual.root.setScale(1.12);
      if (pregnant) {
        const pregnancyMark = this.add.text(anchor.x + slot.x + 18, anchor.y + slot.y - 38, '♥', { fontSize: '16px', color: '#f5a5a5', stroke: '#563323', strokeThickness: 2 }).setOrigin(0.5).setDepth(7000 + anchor.y + slot.y);
        this.world.add(pregnancyMark);
        this.livestockObjects.push(pregnancyMark);
      }
      visual.root.setDepth(2000 + anchor.y + slot.y);
      visual.face(index % 2 === 0 ? 1 : -1);
      this.world.add(visual.root);
      this.livestockObjects.push(visual.root);

      visual.root.on('pointerover', (pointer: Phaser.Input.Pointer) => {
        visual.setLabelVisible(true);
        const definition = FARM_ANIMALS[animal.definitionId];
        const rank = RANK_LABELS[animal.tier] ?? 'Comum';
        this.showHoverTip(
          `${definition?.icon ?? '🐾'} ${animal.name}\n${definition?.speciesName ?? animal.species} · ${animal.gender === 'female' ? 'Fêmea' : 'Macho'} · Rank ${rank}\nClique para ver a ficha do animal.`,
          pointer.x,
          pointer.y
        );
      });
      visual.root.on('pointerout', () => {
        visual.setLabelVisible(false);
        this.hideHoverTip();
      });
      visual.root.on(
        'pointerdown',
        (
          _pointer: Phaser.Input.Pointer,
          _localX: number,
          _localY: number,
          event: Phaser.Types.Input.EventData
        ) => {
          event.stopPropagation();
          sfxClick();
          visual.setLabelVisible(false);
          this.hideHoverTip();
          this.openAnimalDetails(animal);
        }
      );

      if (!brooding) this.scheduleAnimalRoam(visual, anchor.x + slot.x, anchor.y + slot.y, animal.species);
    }
  }

  private animalSlot(
    species: AnimalSpeciesId,
    index: number
  ): { x: number; y: number } {
    const columns = species === 'chicken' ? 6 : 4;
    const spacingX = species === 'chicken' ? 78 : 150;
    const spacingY = species === 'chicken' ? 54 : 100;
    const row = Math.floor(index / columns);
    const col = index % columns;
    return {
      x: (col - (columns - 1) / 2) * spacingX,
      y: 150 + row * spacingY + ((col % 2) * 12)
    };
  }

  private scheduleAnimalRoam(
    visual: AnimalVisual,
    homeX: number,
    homeY: number,
    species: AnimalSpeciesId
  ): void {
    const roam = (): void => {
      if (!this.alive || !visual.root.active) return;
      const radius = species === 'chicken' ? 250 : species === 'cow' ? 300 : 320;
      const targetX = homeX + Phaser.Math.Between(-radius, radius);
      const targetY = homeY + Phaser.Math.Between(-4, 7);
      visual.face(targetX >= visual.root.x ? 1 : -1);
      this.tweens.add({
        targets: visual.root,
        x: targetX,
        y: targetY,
        duration: Phaser.Math.Between(1800, 4200),
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          if (visual.root.active) visual.root.setDepth(2000 + visual.root.y);
        },
        onComplete: () => {
          if (!visual.root.active) return;
          this.time.delayedCall(Phaser.Math.Between(700, 2400), roam);
        }
      });
    };
    this.time.delayedCall(Phaser.Math.Between(400, 1800), roam);
  }

  private spawnEggs(): void {
    if (!this.farm?.buildings.includes('coop')) return;
    const anchor = this.iso(BUILDING_LAYOUTS.coop.col, BUILDING_LAYOUTS.coop.row);
    const incubating = (this.farm.eggs ?? []).filter((egg) => egg.clutchId && egg.hatchAt);
    if (incubating.length) {
      const nest = this.add.graphics();
      nest.fillStyle(0x67401f, 0.95);
      nest.fillEllipse(anchor.x, anchor.y + 112, 190, 62);
      nest.lineStyle(7, 0x9a6837, 1);
      nest.strokeEllipse(anchor.x, anchor.y + 112, 190, 62);
      nest.lineStyle(2, 0xd0a56b, 0.8);
      nest.strokeEllipse(anchor.x, anchor.y + 112, 174, 50);
      nest.setDepth(1800 + anchor.y + 112);
      this.world.add(nest);
      this.livestockObjects.push(nest);
      const hatchAt = Math.max(...incubating.map((egg) => Date.parse(egg.hatchAt ?? '')));
      const remaining = Math.max(0, hatchAt - Date.now());
      const hours = Math.floor(remaining / 3_600_000);
      const minutes = Math.floor((remaining % 3_600_000) / 60_000);
      const timer = this.add.text(anchor.x, anchor.y + 157, 'GALINHA CHOCANDO · ' + hours + 'h ' + minutes + 'min', {
        fontFamily: RANCH_FONT_BODY, fontSize: '9px', fontStyle: 'bold', color: '#fff0bd',
        backgroundColor: 'rgba(48, 29, 14, 0.9)', padding: { x: 7, y: 4 }
      }).setOrigin(0.5).setDepth(7200 + anchor.y);
      this.world.add(timer);
      this.livestockObjects.push(timer);
    }
    (this.farm.eggs ?? []).forEach((egg, index) => {
      const x = egg.clutchId ? anchor.x - 54 + (index % 4) * 36 : anchor.x - 190 + (index % 4) * 112;
      const y = egg.clutchId ? anchor.y + 110 + Math.floor(index / 4) * 12 : anchor.y + 150 + Math.floor(index / 4) * 54;
      const reserved = Boolean(egg.clutchId && egg.hatchAt);
      const status = reserved
        ? 'EM CHOCA'
        : egg.fertilized ? 'FECUNDADO' : 'RECOLHER';
      const item = this.add.container(x, y);
      const graphics = this.add.graphics();
      graphics.fillStyle(0x263a1e, 0.22);
      graphics.fillEllipse(0, 5, 24, 9);
      graphics.fillStyle(egg.fertilized ? 0xe9d9a5 : 0xf8f1de, 1);
      graphics.fillEllipse(0, 0, 15, 20);
      graphics.fillStyle(0xffffff, 0.62);
      graphics.fillEllipse(-3, -5, 4, 6);
      graphics.lineStyle(1.4, reserved ? 0x8bd18b : egg.fertilized ? 0xb89a52 : 0xd8cbb0, 1);
      graphics.strokeEllipse(0, 0, 15, 20);
      item.add(graphics);
      const label = this.add.text(0, 16, status, {
        fontFamily: RANCH_FONT_BODY, fontSize: '8px', color: reserved ? '#b9efaa' : egg.fertilized ? '#f3d78b' : '#fff4d8',
        backgroundColor: 'rgba(30, 23, 13, 0.88)', padding: { x: 4, y: 2 }
      }).setOrigin(0.5, 0);
      item.add(label);
      item.setSize(42, 42).setInteractive(new Phaser.Geom.Rectangle(-21, -10, 42, 42), Phaser.Geom.Rectangle.Contains);
      item.on('pointerdown', async (pointer: Phaser.Input.Pointer) => {
        pointer.event.stopPropagation();
        if (egg.fertilized) {
          const message = reserved
            ? 'NINHADA EM CHOCA: a galinha está sentada no ninho. Tempo restante: ' + (egg.hatchAt ? new Date(egg.hatchAt).toLocaleString('pt-BR') : 'em andamento') + '. Ovo protegido, não pode ser recolhido.'
            : 'Ovo fecundado! A galinha precisa completar oito ovos fecundados para iniciar a chocagem.';
          this.hud?.pushFeed(message, 'normal');
          return;
        }
        try {
          const response = await api.collectFarmEgg(this.character.id, egg.id);
          this.game.events.emit('farm-updated', response);
          this.hud?.pushFeed(response.message || 'Ovo recolhido!', 'gold');
        } catch (error) {
          this.hud?.pushFeed(error instanceof Error ? error.message : 'Não foi possível recolher o ovo.', 'normal');
        }
      });
      item.setDepth(2000 + y + 10);
      this.world.add(item);
      this.livestockObjects.push(item);
    });
  }

  private openMarket(): void {
    const openShop = this.registry.get('openFarmShop') as (() => void) | undefined;
    openShop?.();
  }

  // ---------------------------------------------------------------------------
  // Ficha do animal
  // ---------------------------------------------------------------------------

  private openAnimalDetails(animal: OwnedAnimal): void {
    this.closeSeedPicker();
    this.closeAnimalPanel();

    const definition = FARM_ANIMALS[animal.definitionId];
    const width = Math.min(470, this.scale.width - 24);
    const height = 302;
    const root = this.add.container(0, 0).setDepth(9700);

    const overlay = this.add
      .rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, 0x0e0803, 0.5)
      .setInteractive();
    overlay.on('pointerdown', () => this.closeAnimalPanel());

    const panel = this.add.container(this.scale.width / 2, this.scale.height / 2);
    const background = this.add.graphics();
    drawRanchPanel(background, -width / 2, -height / 2, width, height, { variant: 'parchment' });
    const block = this.add
      .rectangle(0, 0, width - 18, height - 18, 0x000000, 0.001)
      .setInteractive();
    block.on('pointerdown', (
      _pointer: Phaser.Input.Pointer,
      _localX: number,
      _localY: number,
      event: Phaser.Types.Input.EventData
    ) => {
      event.stopPropagation();
    });

    const rankLabel = RANK_LABELS[animal.tier] ?? 'Comum';
    const accent = RANK_COLORS[animal.tier] ?? 0xe6dfca;

    const eyebrow = this.add.text(0, -height / 2 + 27, 'FICHA DO ANIMAL', {
      fontFamily: RANCH_FONT_BODY,
      fontSize: '8px',
      fontStyle: 'bold',
      color: '#8a6334',
      letterSpacing: 2.2
    }).setOrigin(0.5);

    const title = this.add.text(0, -height / 2 + 49, `${definition?.icon ?? '🐾'} ${animal.name}`, {
      fontFamily: RANCH_FONT_DISPLAY,
      fontSize: '19px',
      color: '#3a2514'
    }).setOrigin(0.5);

    const subtitle = this.add.text(
      0,
      -height / 2 + 69,
      `${definition?.speciesName ?? animal.species} · ${animal.gender === 'female' ? 'Fêmea' : 'Macho'} · ${Math.floor(animal.ageDays ?? 0)} dia(s)`,
      {
        fontFamily: RANCH_FONT_BODY,
        fontSize: '9px',
        color: '#7b5b36'
      }
    ).setOrigin(0.5);

    const portraitX = -width / 2 + 86;
    const portraitY = 18;
    const portrait = this.add.graphics();
    portrait.fillStyle(accent, 0.18);
    portrait.fillCircle(portraitX, portraitY, 54);
    portrait.fillStyle(0xf6ead0, 0.8);
    portrait.fillCircle(portraitX, portraitY, 48);
    portrait.lineStyle(2, accent, 0.85);
    portrait.strokeCircle(portraitX, portraitY, 48);
    portrait.lineStyle(1, 0x9a7442, 0.4);
    portrait.strokeCircle(portraitX, portraitY, 42);

    const visual = createAnimalVisual(this, {
      species: animal.species,
      tier: animal.tier,
      gender: animal.gender,
      name: animal.name
    });
    visual.root.disableInteractive();
    visual.root.setPosition(portraitX, portraitY + 18);
    visual.root.setScale(1.15);
    visual.setLabelVisible(false);

    const rankPill = this.add.graphics();
    rankPill.fillStyle(0x3d2515, 0.9);
    rankPill.fillRoundedRect(portraitX - 42, 76, 84, 18, 9);
    rankPill.fillStyle(accent, 0.95);
    rankPill.fillCircle(portraitX - 30, 85, 3.4);

    const rankText = this.add.text(portraitX - 22, 85, `Rank ${rankLabel}`, {
      fontFamily: RANCH_FONT_BODY,
      fontSize: '8.5px',
      fontStyle: 'bold',
      color: '#ffe9b8'
    }).setOrigin(0, 0.5);

    const barsX = -width / 2 + 160;
    const barsWidth = width - (barsX + width / 2) - 24;
    const stats: Array<[string, number, number]> = [
      ['Saúde', animal.health ?? 100, 0x74b46a],
      ['Felicidade', animal.happiness ?? 100, 0xe0b75c],
      ['Fome', animal.hunger ?? 100, 0xd08c54],
      ['Sede', animal.hydration ?? 100, 0x6cb3c8]
    ];

    const statGraphics = this.add.graphics();
    stats.forEach(([label, value, color], index) => {
      const y = -54 + index * 27;
      statGraphics.fillStyle(0xc8a875, 0.4);
      statGraphics.fillRoundedRect(barsX, y + 10, barsWidth, 6, 3);
      statGraphics.fillStyle(color, 1);
      statGraphics.fillRoundedRect(barsX, y + 10, Math.max(3, barsWidth * (value / 100)), 6, 3);
      statGraphics.lineStyle(0.8, 0x8a6334, 0.35);
      statGraphics.strokeRoundedRect(barsX, y + 10, barsWidth, 6, 3);
    });

    const statTexts: Phaser.GameObjects.Text[] = [];
    stats.forEach(([label, value], index) => {
      const y = -54 + index * 27;
      const name = this.add.text(barsX, y - 2, label, {
        fontFamily: RANCH_FONT_BODY,
        fontSize: '8.5px',
        color: '#6b4a28'
      });
      const amount = this.add.text(barsX + barsWidth, y - 2, `${Math.round(value)}%`, {
        fontFamily: RANCH_FONT_BODY,
        fontSize: '8.5px',
        fontStyle: 'bold',
        color: '#4b321b'
      }).setOrigin(1, 0);
      statTexts.push(name, amount);
    });

    const pregnancy = animal.pregnantUntil
      ? `Gestação em andamento até ${new Date(animal.pregnantUntil).toLocaleDateString('pt-BR')}.`
      : animal.species === 'chicken'
        ? 'Postura a cada 4 horas quando adulta e bem cuidada.'
        : 'Aguardando um parceiro adulto para reprodução.';
    const breeding = animal.species === 'chicken'
      ? 'Ovos: 45% de chance de fecundação com um galo adulto.'
      : 'Acasalamento: 12% de chance diária com um parceiro adulto.';

    const details = this.add.text(0, 77, `${pregnancy}\n${breeding}`, {
      fontFamily: RANCH_FONT_BODY,
      fontSize: '8.5px',
      color: '#7b5b36',
      align: 'center',
      lineSpacing: 4,
      wordWrap: { width: width - 48 }
    }).setOrigin(0.5, 0);

    const closeButton = createRanchButton(this, {
      width: 128,
      height: 28,
      label: 'Fechar ficha',
      fontSize: 9,
      onClick: () => this.closeAnimalPanel()
    });
    closeButton.container.setPosition(0, height / 2 - 25);

    panel.add([
      background,
      block,
      eyebrow,
      title,
      subtitle,
      portrait,
      visual.root,
      rankPill,
      rankText,
      statGraphics,
      ...statTexts,
      details,
      closeButton.container
    ]);

    root.add([overlay, panel]);
    this.animalPanel = root;
  }

  private closeAnimalPanel(): void {
    this.animalPanel?.destroy(true);
    this.animalPanel = null;
  }

  // ---------------------------------------------------------------------------
  // Jogador, tooltip e efeitos
  // ---------------------------------------------------------------------------

  private drawPlayer(): void {
    const spawn = this.iso(27, 27);
    this.avatar = new PlayerAvatar(this, this.character.classId, spawn.x, spawn.y);
    this.avatar.root.setScale(0.86);
    this.avatar.root.setDepth(2000 + spawn.y);
    this.world.add(this.avatar.root);
  }

  private showHoverTip(text: string, screenX: number, screenY: number): void {
    if (!this.hoverTip) return;
    this.hoverTip.setText(text).setVisible(true);
    this.positionHoverTip(screenX, screenY);
  }

  private positionHoverTip(screenX: number, screenY: number): void {
    if (!this.hoverTip) return;
    const padding = 12;
    let x = screenX + 18;
    let y = screenY + 18;
    if (x + this.hoverTip.width > this.scale.width - padding) {
      x = screenX - this.hoverTip.width - 16;
    }
    if (y + this.hoverTip.height > this.scale.height - padding) {
      y = screenY - this.hoverTip.height - 16;
    }
    this.hoverTip.setPosition(
      Phaser.Math.Clamp(x, padding, Math.max(padding, this.scale.width - this.hoverTip.width - padding)),
      Phaser.Math.Clamp(y, padding, Math.max(padding, this.scale.height - this.hoverTip.height - padding))
    );
  }

  private hideHoverTip(): void {
    this.hoverTip?.setVisible(false);
  }

  private floatText(x: number, y: number, label: string, color: string): void {
    const text = this.add.text(x, y, label, {
      fontFamily: RANCH_FONT_BODY,
      fontSize: '11px',
      fontStyle: 'bold',
      color,
      stroke: '#2a1a0c',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(7200);
    this.world.add(text);
    this.tweens.add({
      targets: text,
      y: y - 34,
      alpha: 0,
      duration: 1150,
      ease: 'Sine.easeOut',
      onComplete: () => text.destroy()
    });
  }
}
