import Phaser from 'phaser';
import type {
  CharacterSummary,
  CombatEvent,
  CombatSnapshot,
  MonsterDefinition
} from '@mundo-perfeito/shared';
import { api } from '../api';
import type { GameHud } from '../ui/hud';
import { MonsterView, PlayerAvatar } from './actors';

const FONT = '"Trebuchet MS", "Segoe UI", sans-serif';

const TILE_W = 104;
const TILE_H = 52;
const GRID_COLS = 9;
const GRID_ROWS = 7;

const PLAYER_HOME = { x: -126, y: 34 };
const MONSTER_HOME = { x: 132, y: 10 };

const PLACEHOLDER_MONSTER: MonsterDefinition & { hp: number } = {
  id: 'slime',
  name: 'Slime Verde',
  level: 1,
  maxHp: 45,
  attack: 7,
  defense: 1,
  attacksPerSecond: 0.7,
  experienceReward: 10,
  goldReward: 4,
  isBoss: false,
  sprite: 'slime',
  hp: 45
};

export class WorldScene extends Phaser.Scene {
  private character!: CharacterSummary;
  private playerId = '';
  private hud: GameHud | null = null;

  private world!: Phaser.GameObjects.Container;
  private backdrop!: Phaser.GameObjects.Graphics;

  private player!: PlayerAvatar;
  private playerLabel!: Phaser.GameObjects.Text;

  private monster: MonsterView | null = null;
  private monsterKey = '';
  private monsterPlate: Phaser.GameObjects.Container | null = null;
  private monsterPlateFill: Phaser.GameObjects.Rectangle | null = null;
  private monsterPlateWidth = 112;

  private snapshot: CombatSnapshot | null = null;
  private polling = false;
  private alive = true;
  private recovering = false;

  constructor() {
    super('WorldScene');
  }

  create(): void {
    this.character = this.registry.get('character') as CharacterSummary;
    this.playerId = (this.registry.get('playerId') as string | undefined) ?? '';
    this.hud = (this.registry.get('hud') as GameHud | undefined) ?? null;
    this.alive = true;

    this.cameras.main.setBackgroundColor('#07111c');
    this.backdrop = this.add.graphics().setDepth(-1000);

    this.world = this.add.container(0, 0);

    this.buildIsland();
    this.buildDecor();
    this.buildActors();
    this.buildMotes();

    this.layout(this.scale.width, this.scale.height);

    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    document.addEventListener('visibilitychange', this.handleVisibility);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);

    this.hud?.setConnection('connecting');
    this.hud?.setLocation('Clareira dos Aprendizes', 'Área de combate', false);
    this.hud?.pushFeed(`${this.character.name} entrou na Clareira dos Aprendizes.`, 'gold');

    void this.poll();
    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => void this.poll()
    });
    this.schedulePatrol();
  }

  // ---------------------------------------------------------------------------
  // Cenário
  // ---------------------------------------------------------------------------

  private handleResize(gameSize: Phaser.Structs.Size): void {
    this.layout(gameSize.width, gameSize.height);
  }

  private layout(width: number, height: number): void {
    this.drawBackdrop(width, height);
    const zoom = Phaser.Math.Clamp(Math.min(width / 1040, height / 660), 0.58, 1.12);
    this.world.setScale(zoom);
    this.world.setPosition(width / 2, height / 2 + Math.max(12, height * 0.035));
  }

  private drawBackdrop(width: number, height: number): void {
    const g = this.backdrop;
    g.clear();

    g.fillGradientStyle(0x07111c, 0x07111c, 0x0d2528, 0x0a1c21, 1);
    g.fillRect(0, 0, width, height);

    g.fillStyle(0x1f6b68, 0.09);
    g.fillEllipse(width * 0.5, height * 0.36, width * 1.2, height * 0.75);

    g.fillStyle(0x1b4e62, 0.08);
    g.fillEllipse(width * 0.16, height * 0.62, width * 0.8, height * 0.6);

    g.fillStyle(0xf4d58d, 0.07);
    g.fillCircle(width * 0.83, height * 0.16, Math.min(width, height) * 0.13);
    g.fillStyle(0xf4d58d, 0.1);
    g.fillCircle(width * 0.83, height * 0.16, Math.min(width, height) * 0.06);

    for (let i = 0; i < 54; i += 1) {
      const x = ((i * 97 + 13) % 100) / 100 * width;
      const y = ((i * 53 + 7) % 52) / 100 * height;
      const alpha = 0.12 + ((i * 17) % 7) * 0.035;
      g.fillStyle(i % 6 === 0 ? 0x9fe8ff : 0xf4e3b0, alpha);
      g.fillCircle(x, y, i % 9 === 0 ? 1.5 : 0.9);
    }

    g.fillGradientStyle(0x04101a, 0x04101a, 0x04101a, 0x04101a, 0);
    g.fillStyle(0x04101a, 0.5);
    g.fillRect(0, height * 0.9, width, height * 0.1);
  }

  private buildIsland(): void {
    const base = this.add.graphics().setDepth(0);
    this.world.add(base);

    base.fillStyle(0x040b10, 0.5);
    base.fillEllipse(0, 96, 1010, 500);

    this.fillDiamond(base, 468, 242, 30, 0x0b1a1e);
    this.fillDiamond(base, 462, 238, 18, 0x143136);
    this.fillDiamond(base, 452, 232, 8, 0x1c4645);

    base.fillStyle(0x2a6057, 0.5);
    base.fillEllipse(0, -18, 780, 350);

    const tiles = this.add.graphics().setDepth(10);
    this.world.add(tiles);

    for (let row = 0; row < GRID_ROWS; row += 1) {
      for (let col = 0; col < GRID_COLS; col += 1) {
        const x = (col - row - 1) * (TILE_W / 2);
        const y = (col + row - 7) * (TILE_H / 2);
        const lane = col - row;
        const variant = (col * 7 + row * 13) % 4;
        const isPath = lane >= -1 && lane <= 1;

        const color = isPath
          ? variant % 2 === 0
            ? 0x6b6749
            : 0x736d4f
          : [0x2d5b4c, 0x2a5546, 0x306050][variant % 3] ?? 0x2d5b4c;

        const points = [
          { x, y: y - TILE_H / 2 },
          { x: x + TILE_W / 2, y },
          { x, y: y + TILE_H / 2 },
          { x: x - TILE_W / 2, y }
        ];

        tiles.fillStyle(color, 1);
        tiles.fillPoints(points, true);
        tiles.lineStyle(1, 0x0a1a1a, 0.12);
        tiles.strokePoints(points, true);
      }
    }

    // Lagoa
    const pond = this.add.graphics().setDepth(12);
    this.world.add(pond);
    pond.fillStyle(0x0b2531, 0.8);
    pond.fillEllipse(150, -156, 138, 62);
    pond.fillStyle(0x1d4e61, 1);
    pond.fillEllipse(150, -158, 126, 54);
    pond.lineStyle(2, 0x357184, 0.8);
    pond.strokeEllipse(150, -158, 126, 54);
    pond.fillStyle(0x6fd6e0, 0.35);
    pond.fillEllipse(128, -164, 36, 8);
    pond.fillEllipse(176, -150, 22, 5);

    pond.fillStyle(0x3f7d4d, 1);
    pond.fillEllipse(120, -158, 16, 8);
    pond.fillEllipse(171, -169, 12, 6);
    pond.fillStyle(0xf0c7d0, 0.9);
    pond.fillCircle(120, -160, 2);

    // Runas do arena
    const runes = this.add.graphics().setDepth(13);
    this.world.add(runes);
    runes.lineStyle(1.5, 0xf4d58d, 0.13);
    runes.strokeEllipse(0, 24, 330, 112);
    runes.strokeEllipse(0, 24, 250, 84);
    runes.lineStyle(1, 0xf4d58d, 0.08);
    runes.strokeEllipse(0, 24, 430, 146);
  }

  private fillDiamond(
    g: Phaser.GameObjects.Graphics,
    halfW: number,
    halfH: number,
    offsetY: number,
    color: number
  ): void {
    g.fillStyle(color, 1);
    g.fillPoints(
      [
        { x: 0, y: offsetY - halfH },
        { x: halfW, y: offsetY },
        { x: 0, y: offsetY + halfH },
        { x: -halfW, y: offsetY }
      ],
      true
    );
  }

  private buildDecor(): void {
    const trees: Array<[number, number, number, 'pine' | 'leaf']> = [
      [-352, -88, 1.08, 'pine'],
      [-304, 108, 0.94, 'leaf'],
      [-126, -198, 1, 'pine'],
      [64, -206, 0.9, 'leaf'],
      [302, -132, 1.04, 'pine'],
      [368, 56, 0.92, 'leaf'],
      [222, 176, 1.08, 'pine'],
      [-360, 42, 0.82, 'leaf']
    ];

    for (const [x, y, scale, variant] of trees) {
      this.addTree(x, y, scale, variant);
    }

    this.addRock(-238, 154, 1);
    this.addRock(330, -30, 0.85);
    this.addRock(-64, 190, 0.95);
    this.addRock(70, -150, 0.7);

    this.addTorch(-218, -64);
    this.addTorch(248, -56);

    this.addCrystal(-392, 118, 1);
    this.addCrystal(356, -178, 0.85);

    this.addLog(278, 132);

    // Tufos de grama e flores
    for (let i = 0; i < 34; i += 1) {
      const x = Phaser.Math.Between(-390, 390);
      const y = Phaser.Math.Between(-185, 190);
      if (Math.abs(x) < 190 && y > -70 && y < 90) {
        continue;
      }
      this.addGrass(x, y, Phaser.Math.FloatBetween(0.7, 1.2), i % 4 === 0);
    }
  }

  private addTree(
    x: number,
    y: number,
    scale: number,
    variant: 'pine' | 'leaf'
  ): void {
    const tree = this.add.container(x, y);
    tree.setDepth(100 + y);

    const shadow = this.add.ellipse(0, 2, 74 * scale, 24 * scale, 0x04100e, 0.35);
    tree.add(shadow);

    const trunk = this.add.graphics();
    trunk.fillStyle(0x4a3527, 1);
    trunk.lineStyle(2, 0x1a2520, 1);
    trunk.fillRoundedRect(-5 * scale, -34 * scale, 10 * scale, 36 * scale, 4);
    trunk.strokeRoundedRect(-5 * scale, -34 * scale, 10 * scale, 36 * scale, 4);
    tree.add(trunk);

    const canopy = this.add.container(0, -34 * scale);
    const leaves = this.add.graphics();

    if (variant === 'pine') {
      const layers = [
        { y: -12, w: 32, color: 0x2c6b52 },
        { y: -34, w: 26, color: 0x357a5c },
        { y: -56, w: 19, color: 0x3f8b66 }
      ];
      for (const layer of layers) {
        leaves.fillStyle(layer.color, 1);
        leaves.lineStyle(2, 0x16382d, 1);
        leaves.fillTriangle(
          -layer.w * scale,
          layer.y * scale,
          layer.w * scale,
          layer.y * scale,
          0,
          (layer.y - 34) * scale
        );
        leaves.strokeTriangle(
          -layer.w * scale,
          layer.y * scale,
          layer.w * scale,
          layer.y * scale,
          0,
          (layer.y - 34) * scale
        );
      }
    } else {
      leaves.fillStyle(0x2d6b50, 1);
      leaves.lineStyle(2, 0x16382d, 1);
      leaves.fillEllipse(-14 * scale, -20 * scale, 40 * scale, 36 * scale);
      leaves.strokeEllipse(-14 * scale, -20 * scale, 40 * scale, 36 * scale);
      leaves.fillStyle(0x35795a, 1);
      leaves.fillEllipse(14 * scale, -24 * scale, 38 * scale, 34 * scale);
      leaves.strokeEllipse(14 * scale, -24 * scale, 38 * scale, 34 * scale);
      leaves.fillStyle(0x3f8b66, 1);
      leaves.fillEllipse(0, -42 * scale, 42 * scale, 38 * scale);
      leaves.strokeEllipse(0, -42 * scale, 42 * scale, 38 * scale);
      leaves.fillStyle(0x5aa77b, 0.55);
      leaves.fillEllipse(-6 * scale, -50 * scale, 22 * scale, 12 * scale);
    }

    canopy.add(leaves);
    tree.add(canopy);
    this.world.add(tree);

    this.tweens.add({
      targets: canopy,
      angle: { from: -1.4, to: 1.4 },
      duration: Phaser.Math.Between(2400, 3600),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: Phaser.Math.Between(0, 900)
    });
  }

  private addRock(x: number, y: number, scale: number): void {
    const rock = this.add.container(x, y);
    rock.setDepth(100 + y);

    const shadow = this.add.ellipse(0, 2, 50 * scale, 16 * scale, 0x04100e, 0.3);
    rock.add(shadow);

    const g = this.add.graphics();
    g.fillStyle(0x4a5b5c, 1);
    g.lineStyle(2, 0x152425, 1);
    const points = [
      { x: -22 * scale, y: 0 },
      { x: -13 * scale, y: -20 * scale },
      { x: 6 * scale, y: -24 * scale },
      { x: 22 * scale, y: -6 * scale },
      { x: 16 * scale, y: 3 * scale }
    ];
    g.fillPoints(points, true);
    g.strokePoints(points, true);
    g.fillStyle(0x6c8080, 0.7);
    g.fillTriangle(-10 * scale, -18 * scale, 4 * scale, -22 * scale, -4 * scale, -10 * scale);
    g.fillStyle(0x3c6960, 0.7);
    g.fillEllipse(10 * scale, -4 * scale, 12 * scale, 5 * scale);
    rock.add(g);
    this.world.add(rock);
  }

  private addTorch(x: number, y: number): void {
    const torch = this.add.container(x, y);
    torch.setDepth(100 + y);

    const light = this.add.ellipse(0, 4, 110, 36, 0xffb45a, 0.08);
    light.setBlendMode(Phaser.BlendModes.ADD);
    torch.add(light);

    const g = this.add.graphics();
    g.fillStyle(0x3c2c22, 1);
    g.lineStyle(2, 0x171f1c, 1);
    g.fillRoundedRect(-4, -56, 8, 58, 3);
    g.strokeRoundedRect(-4, -56, 8, 58, 3);
    g.fillStyle(0x6b5134, 1);
    g.fillRoundedRect(-9, -62, 18, 10, 4);
    g.strokeRoundedRect(-9, -62, 18, 10, 4);
    torch.add(g);

    const glow = this.add.circle(0, -70, 34, 0xffb45a, 0.12);
    glow.setBlendMode(Phaser.BlendModes.ADD);
    torch.add(glow);

    const flameOuter = this.add.ellipse(0, -70, 16, 24, 0xff8a3d, 0.95);
    const flameInner = this.add.ellipse(0, -67, 8, 13, 0xffe28a, 1);
    torch.add(flameOuter);
    torch.add(flameInner);

    this.world.add(torch);

    this.tweens.add({
      targets: [flameOuter, flameInner, glow],
      scaleX: 1.16,
      scaleY: 0.9,
      alpha: { from: 0.85, to: 1 },
      duration: 260,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private addCrystal(x: number, y: number, scale: number): void {
    const crystal = this.add.container(x, y);
    crystal.setDepth(100 + y);

    const shadow = this.add.ellipse(0, 2, 46 * scale, 14 * scale, 0x04100e, 0.3);
    crystal.add(shadow);

    const glow = this.add.ellipse(0, -22 * scale, 68 * scale, 58 * scale, 0x6fe3ff, 0.12);
    glow.setBlendMode(Phaser.BlendModes.ADD);
    crystal.add(glow);

    const g = this.add.graphics();
    g.fillStyle(0x66d8e8, 0.9);
    g.lineStyle(2, 0x1d5f6b, 1);
    g.fillTriangle(-14 * scale, 0, 0, -42 * scale, 6 * scale, 0);
    g.strokeTriangle(-14 * scale, 0, 0, -42 * scale, 6 * scale, 0);
    g.fillStyle(0x9ff0ff, 0.9);
    g.fillTriangle(0, 0, 12 * scale, -28 * scale, 20 * scale, 0);
    g.strokeTriangle(0, 0, 12 * scale, -28 * scale, 20 * scale, 0);
    g.fillStyle(0xc9fbff, 0.8);
    g.fillTriangle(-4 * scale, -8, 0, -34 * scale, 4 * scale, -8);
    crystal.add(g);
    this.world.add(crystal);

    this.tweens.add({
      targets: glow,
      alpha: { from: 0.08, to: 0.24 },
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private addLog(x: number, y: number): void {
    const log = this.add.container(x, y);
    log.setDepth(100 + y);
    const shadow = this.add.ellipse(0, 4, 92, 22, 0x04100e, 0.28);
    log.add(shadow);

    const g = this.add.graphics();
    g.fillStyle(0x4a3527, 1);
    g.lineStyle(2, 0x1a2520, 1);
    g.fillRoundedRect(-42, -16, 84, 18, 8);
    g.strokeRoundedRect(-42, -16, 84, 18, 8);
    g.fillStyle(0x6d5138, 1);
    g.fillEllipse(40, -7, 14, 16);
    g.lineStyle(1.5, 0x3a2a1e, 1);
    g.strokeEllipse(40, -7, 10, 12);
    g.strokeEllipse(40, -7, 5, 7);
    g.fillStyle(0x3c8a5c, 1);
    g.fillEllipse(-24, -18, 18, 7);
    g.fillEllipse(6, -18, 12, 6);
    log.add(g);
    this.world.add(log);
  }

  private addGrass(x: number, y: number, scale: number, flower: boolean): void {
    const grass = this.add.graphics();
    grass.setDepth(100 + y);
    grass.lineStyle(1.5, 0x49806a, 0.75);
    grass.lineBetween(x - 4 * scale, y, x - 7 * scale, y - 10 * scale);
    grass.lineBetween(x, y, x, y - 13 * scale);
    grass.lineBetween(x + 4 * scale, y, x + 7 * scale, y - 9 * scale);

    if (flower) {
      grass.fillStyle(0xe7c168, 0.9);
      grass.fillCircle(x + 7 * scale, y - 11 * scale, 1.8);
      grass.fillStyle(0xe48aa6, 0.9);
      grass.fillCircle(x - 7 * scale, y - 11 * scale, 1.8);
    }

    this.world.add(grass);
  }

  // ---------------------------------------------------------------------------
  // Atores
  // ---------------------------------------------------------------------------

  private buildActors(): void {
    this.player = new PlayerAvatar(this, this.character.classId, PLAYER_HOME.x, PLAYER_HOME.y);
    this.player.root.setDepth(100 + PLAYER_HOME.y);
    this.world.add(this.player.root);

    this.playerLabel = this.add
      .text(PLAYER_HOME.x, PLAYER_HOME.y - 138, this.character.name, {
        fontFamily: FONT,
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#f4d58d',
        stroke: '#07111c',
        strokeThickness: 3,
        resolution: 2
      })
      .setOrigin(0.5);
    this.playerLabel.setDepth(2100);
    this.world.add(this.playerLabel);

    this.spawnMonster(PLACEHOLDER_MONSTER);
  }

  private spawnMonster(monster: MonsterDefinition & { hp: number }): void {
    this.monster?.destroy();
    this.monster = null;
    this.clearMonsterPlate();

    const view = new MonsterView(this, monster.sprite, MONSTER_HOME.x, MONSTER_HOME.y);
    view.root.setDepth(100 + MONSTER_HOME.y);
    this.world.add(view.root);
    this.monster = view;
    this.monsterKey = monster.id;

    this.buildMonsterPlate(monster, view.height);
    this.updateMonsterPlate(monster.hp, monster.maxHp, monster.isBoss);

    this.spawnDust(MONSTER_HOME.x, MONSTER_HOME.y, monster.isBoss ? 1.6 : 1);
  }

  private buildMonsterPlate(
    monster: MonsterDefinition & { hp: number },
    height: number
  ): void {
    const width = monster.isBoss ? 170 : 112;
    const plate = this.add.container(MONSTER_HOME.x, MONSTER_HOME.y - height - 14);
    plate.setDepth(2100);

    const label = this.add
      .text(0, -15, `${monster.name}  ·  Nv. ${monster.level}`, {
        fontFamily: FONT,
        fontSize: monster.isBoss ? '13px' : '11px',
        fontStyle: 'bold',
        color: monster.isBoss ? '#ffd98a' : '#d9e4ef',
        stroke: '#07111c',
        strokeThickness: 3,
        resolution: 2
      })
      .setOrigin(0.5);

    const track = this.add
      .rectangle(0, 0, width, 8, 0x08111b, 0.92)
      .setStrokeStyle(1, monster.isBoss ? 0xd68a43 : 0x3c566d, 0.9);

    const fill = this.add
      .rectangle(-width / 2 + 1, 0, width - 2, 5, monster.isBoss ? 0xff9d5c : 0x7ee07a)
      .setOrigin(0, 0.5);

    plate.add([label, track, fill]);
    this.world.add(plate);

    this.monsterPlate = plate;
    this.monsterPlateFill = fill;
    this.monsterPlateWidth = width;
  }

  private updateMonsterPlate(hp: number, maxHp: number, isBoss: boolean): void {
    if (!this.monsterPlateFill) {
      return;
    }
    const ratio = Phaser.Math.Clamp(hp / Math.max(1, maxHp), 0, 1);
    this.monsterPlateFill.setScale(ratio, 1);
    this.monsterPlateFill.setFillStyle(isBoss ? 0xff9d5c : ratio <= 0.3 ? 0xff7b6b : 0x7ee07a);
  }

  private clearMonsterPlate(): void {
    this.monsterPlate?.destroy();
    this.monsterPlate = null;
    this.monsterPlateFill = null;
  }

  private syncMonster(monster: MonsterDefinition & { hp: number }): void {
    if (this.monsterKey === monster.id) {
      this.updateMonsterPlate(monster.hp, monster.maxHp, monster.isBoss);
      return;
    }

    const previous = this.monster;
    this.monster = null;
    this.monsterKey = monster.id;
    this.clearMonsterPlate();

    if (previous) {
      previous.die();
      this.time.delayedCall(170, () => {
        if (!this.alive || this.monsterKey !== monster.id) {
          return;
        }
        this.spawnMonster(monster);
      });
    } else {
      this.spawnMonster(monster);
    }
  }

  // ---------------------------------------------------------------------------
  // Combate
  // ---------------------------------------------------------------------------

  private async poll(): Promise<void> {
    if (this.polling || !this.alive) {
      return;
    }
    this.polling = true;

    try {
      const snapshot = await api.getCombat(this.character.id, this.playerId);
      if (!this.alive) {
        return;
      }
      this.hud?.setConnection('online');
      this.applySnapshot(snapshot);
    } catch {
      if (this.alive) {
        this.hud?.setConnection('offline');
      }
    } finally {
      this.polling = false;
    }
  }

  private applySnapshot(snapshot: CombatSnapshot): void {
    if (snapshot.returnToCity) {
      this.hud?.pushFeed('Você foi derrotado e não tinha Poção da Ressurreição. Retornando a Valedouro.', 'danger');
      this.scene.start('CityScene');
      return;
    }
    const previousLevel = this.snapshot?.character.level ?? snapshot.character.level;

    this.snapshot = snapshot;
    this.character = snapshot.character;
    this.hud?.update(snapshot);

    this.syncMonster(snapshot.combat.monster);
    this.updateMonsterPlate(
      snapshot.combat.monster.hp,
      snapshot.combat.monster.maxHp,
      snapshot.combat.monster.isBoss
    );

    const recovering = snapshot.combat.status === 'recovering';
    this.recovering = recovering;
    this.player.setRecovering(recovering);

    const fastForward = snapshot.simulatedSeconds > 8;
    this.announceHighlights(snapshot.events, fastForward);

    if (fastForward) {
      const levelsGained = snapshot.character.level - previousLevel;
      const subtitle =
        levelsGained > 0
          ? `${Math.max(1, Math.round(snapshot.simulatedSeconds))}s de combate · ${levelsGained} nível(is) ganho(s)`
          : `${Math.max(1, Math.round(snapshot.simulatedSeconds))}s de combate automático`;
      this.hud?.showBanner('Enquanto você estava fora', subtitle, 'gold');
      return;
    }

    const visibleEvents = snapshot.events.slice(-14);
    visibleEvents.forEach((event, index) => {
      this.time.delayedCall(index * 115, () => this.playEvent(event));
    });
  }

  private announceHighlights(events: CombatEvent[], compact: boolean): void {
    for (const event of events) {
      switch (event.type) {
        case 'kill':
          this.hud?.pushFeed(
            `${event.message ?? 'Monstro'} derrotado · +${event.amount ?? 0} XP`,
            'normal'
          );
          break;
        case 'item_drop': {
          const names: Record<string, string> = {
            'slime-gel': 'Geleia de Slime',
            'boar-hide': 'Couro de Javali',
            'wolf-pelt': 'Pele de Lobo'
          };
          this.hud?.pushFeed(`Item encontrado: ${names[event.message ?? ''] ?? event.message ?? 'Material'}`, 'gold');
          break;
        }
        case 'level_up':
          this.hud?.pushFeed(`Subiu para ${event.message ?? 'um novo nível'}!`, 'gold');
          if (!compact) {
            this.hud?.showBanner('Novo nível!', event.message ?? '', 'level');
          }
          break;
        case 'boss_spawn':
          this.hud?.pushFeed(`${event.message ?? 'O chefe'} despertou!`, 'boss');
          if (!compact) {
            this.hud?.showBanner(event.message ?? 'Chefe', 'A batalha decisiva começou.', 'boss');
          }
          break;
        case 'boss_defeated':
          this.hud?.pushFeed(`${event.message ?? 'Chefe'} foi derrotado!`, 'boss');
          if (!compact) {
            this.hud?.showBanner('Chefe derrotado!', event.message ?? '', 'gold');
          }
          break;
        case 'player_death':
          this.hud?.pushFeed('Você caiu em combate. Recuperando…', 'danger');
          if (!compact) {
            this.hud?.showBanner('Você caiu', 'Recuperando fôlego por alguns segundos…', 'danger');
          }
          break;
        default:
          break;
      }
    }
  }

  private playEvent(event: CombatEvent): void {
    if (!this.alive) {
      return;
    }

    switch (event.type) {
      case 'player_hit':
      case 'player_crit': {
        const critical = event.type === 'player_crit';
        this.player.attack(MONSTER_HOME.x);
        this.fireProjectile(critical);
        this.time.delayedCall(95, () => {
          this.monster?.hurt();
          this.popDamage(event.amount ?? 0, critical ? 'crit' : 'player');
          if (critical) {
            this.cameras.main.shake(90, 0.002);
          }
        });
        break;
      }

      case 'monster_hit': {
        this.monster?.attack();
        this.time.delayedCall(80, () => {
          this.player.hurt();
          this.popDamage(event.amount ?? 0, 'monster');
        });
        break;
      }

      case 'kill': {
        this.spawnBurst(MONSTER_HOME.x, MONSTER_HOME.y - 30, 0xf4d58d, 9);
        this.popText(
          MONSTER_HOME.x,
          MONSTER_HOME.y - 90,
          `+${event.amount ?? 0} XP`,
          '#f4d58d',
          16
        );
        break;
      }

      case 'level_up': {
        this.spawnLevelUp();
        break;
      }

      case 'boss_spawn': {
        this.spawnBossEntrance();
        break;
      }

      case 'boss_defeated': {
        this.spawnBossDefeat();
        break;
      }

      case 'player_death': {
        this.cameras.main.flash(200, 255, 80, 80);
        this.player.hurt();
        break;
      }

      default:
        break;
    }
  }

  private fireProjectile(critical: boolean): void {
    const classId = this.character.classId;
    const startX = PLAYER_HOME.x + 30;
    const startY = PLAYER_HOME.y - 74;
    const targetX = MONSTER_HOME.x;
    const targetY = MONSTER_HOME.y - (this.monster?.height ?? 64) * 0.5;

    if (classId === 'mage' || classId === 'priest') {
      const orb = this.add.circle(startX, startY, critical ? 7 : 5, critical ? 0xffd76a : 0x7fe7ff);
      orb.setBlendMode(Phaser.BlendModes.ADD);
      orb.setDepth(1900);
      this.world.add(orb);

      this.tweens.add({
        targets: orb,
        x: targetX,
        y: targetY,
        duration: 150,
        ease: 'Quad.easeIn',
        onComplete: () => {
          this.spawnBurst(targetX, targetY, critical ? 0xffd76a : 0x7fe7ff, 5);
          orb.destroy();
        }
      });
      return;
    }

    if (classId === 'archer') {
      const arrow = this.add.rectangle(startX, startY, 22, 3, 0xe7d7ad);
      arrow.setOrigin(0, 0.5);
      arrow.setRotation(Phaser.Math.Angle.Between(startX, startY, targetX, targetY));
      arrow.setDepth(1900);
      this.world.add(arrow);

      this.tweens.add({
        targets: arrow,
        x: targetX,
        y: targetY,
        duration: 140,
        ease: 'Quad.easeIn',
        onComplete: () => {
          arrow.destroy();
        }
      });
      return;
    }

    const slash = this.add.graphics();
    slash.setPosition(targetX, targetY);
    slash.setDepth(1900);
    slash.lineStyle(3, critical ? 0xffd76a : 0xf2f8ff, 0.9);
    slash.beginPath();
    slash.arc(0, 0, 38, Phaser.Math.DegToRad(-70), Phaser.Math.DegToRad(70), false);
    slash.strokePath();
    slash.lineStyle(1.5, 0xffffff, 0.5);
    slash.beginPath();
    slash.arc(0, 0, 28, Phaser.Math.DegToRad(-55), Phaser.Math.DegToRad(55), false);
    slash.strokePath();
    this.world.add(slash);

    this.tweens.add({
      targets: slash,
      alpha: 0,
      scaleX: 1.35,
      scaleY: 1.35,
      angle: 12,
      duration: 250,
      ease: 'Quad.easeOut',
      onComplete: () => slash.destroy()
    });
  }

  private popDamage(amount: number, kind: 'player' | 'crit' | 'monster'): void {
    if (kind === 'monster') {
      this.popText(
        PLAYER_HOME.x + Phaser.Math.Between(-16, 16),
        PLAYER_HOME.y - 116,
        `-${amount}`,
        '#ff8d8d',
        17
      );
      return;
    }

    const crit = kind === 'crit';
    this.popText(
      MONSTER_HOME.x + Phaser.Math.Between(-22, 22),
      MONSTER_HOME.y - (this.monster?.height ?? 64) - 6,
      crit ? `${amount}!` : `${amount}`,
      crit ? '#ffd76a' : '#f2f8ff',
      crit ? 25 : 19
    );
  }

  private popText(
    x: number,
    y: number,
    text: string,
    color: string,
    size: number
  ): void {
    const label = this.add
      .text(x, y, text, {
        fontFamily: FONT,
        fontSize: `${size}px`,
        fontStyle: 'bold',
        color,
        stroke: '#07111c',
        strokeThickness: 4,
        resolution: 2
      })
      .setOrigin(0.5);
    label.setDepth(2600);
    this.world.add(label);

    this.tweens.add({
      targets: label,
      y: y - 44,
      alpha: 0,
      duration: 760,
      ease: 'Cubic.easeOut',
      onComplete: () => label.destroy()
    });
  }

  private spawnBurst(x: number, y: number, color: number, count: number): void {
    const ring = this.add.ellipse(x, y, 28, 14, color, 0);
    ring.setStrokeStyle(2, color, 0.8);
    ring.setDepth(1950);
    this.world.add(ring);
    this.tweens.add({
      targets: ring,
      scaleX: 5,
      scaleY: 5,
      alpha: 0,
      duration: 460,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy()
    });

    for (let i = 0; i < count; i += 1) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.Between(26, 72);
      const dot = this.add.circle(x, y, Phaser.Math.FloatBetween(1.6, 3.2), color, 0.9);
      dot.setDepth(1950);
      this.world.add(dot);

      this.tweens.add({
        targets: dot,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance * 0.6 - 20,
        alpha: 0,
        scale: 0.3,
        duration: Phaser.Math.Between(380, 640),
        ease: 'Cubic.easeOut',
        onComplete: () => dot.destroy()
      });
    }
  }

  private spawnDust(x: number, y: number, scale: number): void {
    for (let i = 0; i < 6; i += 1) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const dust = this.add.ellipse(x, y, 14 * scale, 6 * scale, 0x8aa0b8, 0.28);
      dust.setDepth(1200);
      this.world.add(dust);
      this.tweens.add({
        targets: dust,
        x: x + Math.cos(angle) * 48 * scale,
        y: y + Math.sin(angle) * 18 * scale,
        alpha: 0,
        scaleX: 1.8,
        scaleY: 1.8,
        duration: 460,
        ease: 'Quad.easeOut',
        onComplete: () => dust.destroy()
      });
    }
  }

  private spawnLevelUp(): void {
    const ring = this.add.ellipse(PLAYER_HOME.x, PLAYER_HOME.y - 20, 40, 18, 0xf4d58d, 0);
    ring.setStrokeStyle(3, 0xf4d58d, 0.9);
    ring.setDepth(1950);
    this.world.add(ring);
    this.tweens.add({
      targets: ring,
      scaleX: 8,
      scaleY: 8,
      alpha: 0,
      duration: 700,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy()
    });

    for (let i = 0; i < 14; i += 1) {
      const spark = this.add.circle(
        PLAYER_HOME.x + Phaser.Math.Between(-30, 30),
        PLAYER_HOME.y - Phaser.Math.Between(20, 100),
        Phaser.Math.FloatBetween(1.5, 3),
        0xffe08a,
        0.95
      );
      spark.setDepth(1950);
      this.world.add(spark);
      this.tweens.add({
        targets: spark,
        y: spark.y - Phaser.Math.Between(30, 70),
        alpha: 0,
        duration: Phaser.Math.Between(500, 900),
        ease: 'Quad.easeOut',
        onComplete: () => spark.destroy()
      });
    }

    this.cameras.main.flash(220, 255, 225, 150);
  }

  private spawnBossEntrance(): void {
    this.cameras.main.shake(260, 0.006);
    this.cameras.main.flash(240, 255, 120, 60);
    this.spawnDust(MONSTER_HOME.x, MONSTER_HOME.y, 2.2);
    this.spawnBurst(MONSTER_HOME.x, MONSTER_HOME.y - 40, 0xffc75a, 14);
  }

  private spawnBossDefeat(): void {
    this.cameras.main.shake(300, 0.007);
    this.cameras.main.flash(300, 255, 220, 130);
    this.spawnBurst(MONSTER_HOME.x, MONSTER_HOME.y - 40, 0xffd76a, 22);
  }

  // ---------------------------------------------------------------------------
  // Vida ambiente
  // ---------------------------------------------------------------------------

  private buildMotes(): void {
    for (let i = 0; i < 16; i += 1) {
      const x = Phaser.Math.Between(-420, 420);
      const y = Phaser.Math.Between(-190, 200);
      const mote = this.add.circle(
        x,
        y,
        Phaser.Math.FloatBetween(1.2, 2.6),
        i % 3 === 0 ? 0x9fe8ff : 0xf4d58d,
        Phaser.Math.FloatBetween(0.25, 0.7)
      );
      mote.setDepth(850 + y);
      this.world.add(mote);

      this.tweens.add({
        targets: mote,
        x: x + Phaser.Math.Between(-18, 18),
        y: y - Phaser.Math.Between(14, 36),
        alpha: { from: mote.alpha, to: 0.08 },
        duration: Phaser.Math.Between(2600, 5200),
        delay: Phaser.Math.Between(0, 2200),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
  }

  private schedulePatrol(): void {
    if (!this.alive) {
      return;
    }

    this.time.delayedCall(Phaser.Math.Between(6500, 10500), () => {
      if (!this.alive) {
        return;
      }
      this.patrol();
      this.schedulePatrol();
    });
  }

  private patrol(): void {
    if (this.recovering || !this.player) {
      return;
    }

    const targetX = PLAYER_HOME.x + Phaser.Math.Between(-38, 24);
    const targetY = PLAYER_HOME.y + Phaser.Math.Between(-16, 12);

    this.player.walkTo(targetX, targetY, 1200);
    this.time.delayedCall(1500, () => {
      if (this.alive) {
        this.player.walkTo(PLAYER_HOME.x, PLAYER_HOME.y, 1300);
      }
    });
  }

  private handleVisibility = (): void => {
    if (document.visibilityState === 'visible' && this.alive) {
      this.hud?.setConnection('connecting');
      void this.poll();
    }
  };

  private handleShutdown(): void {
    this.alive = false;
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    document.removeEventListener('visibilitychange', this.handleVisibility);
    this.monster = null;
    this.monsterPlate = null;
    this.monsterPlateFill = null;
  }
}
