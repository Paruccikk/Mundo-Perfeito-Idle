import Phaser from 'phaser';
import type {
  CharacterSummary,
  CombatEvent,
  CombatSnapshot,
  EnvironmentId,
  MonsterDefinition,
  StageDefinition
} from '@mundo-perfeito/shared';
import { api } from '../api';
import {
  sfxBoss, sfxCoin, sfxDeath, sfxHit, sfxLevelUp, sfxMonsterHit, sfxVictory
} from '../audio';
import type { GameHud } from '../ui/hud';
import { HorseView, MonsterView, PlayerAvatar } from './actors';

const FONT = '"Cinzel", "MedievalSharp", Georgia, "Times New Roman", serif';

const TILE_W = 104;
const TILE_H = 52;
const GRID_COLS = 9;
const GRID_ROWS = 7;

const PLAYER_HOME = { x: -126, y: 34 };
const MONSTER_HOME = { x: 132, y: 10 };

type TreeStyle = 'pine' | 'leaf' | 'palm' | 'dead' | 'none';
type DecorProp = 'rock' | 'crystal' | 'torch' | 'log' | 'pillar' | 'cactus'
  | 'ice' | 'lava' | 'bones' | 'cloud' | 'banner' | 'reeds';

interface EnvironmentTheme {
  label: string;
  sky: [number, number, number, number];
  glow: number;
  mote: number;
  path: [number, number];
  ground: [number, number, number];
  pond: [number, number];
  trunk: number;
  leaf: [number, number, number];
  treeStyle: TreeStyle;
  rock: number;
  crystal: number;
  props: DecorProp[];
}

const ENVIRONMENTS: Record<EnvironmentId, EnvironmentTheme> = {
  forest: {
    label: 'Bosque de Valedouro',
    sky: [0x07111c, 0x07111c, 0x0d2528, 0x0a1c21],
    glow: 0xf4d58d, mote: 0x9fe8ff,
    path: [0x6b6749, 0x736d4f], ground: [0x2d5b4c, 0x2a5546, 0x306050],
    pond: [0x1d4e61, 0x6fd6e0], trunk: 0x4a3527,
    leaf: [0x2c6b52, 0x357a5c, 0x3f8b66], treeStyle: 'pine',
    rock: 0x4a5b5c, crystal: 0x66d8e8,
    props: ['rock', 'crystal', 'torch', 'log', 'reeds']
  },
  ruins: {
    label: 'Ruínas de Pedra',
    sky: [0x151726, 0x22243a, 0x0e101a, 0x1a1c2e],
    glow: 0xe4dcc4, mote: 0xf0e6c8,
    path: [0x6e6a60, 0x777368], ground: [0x4c4b52, 0x45444b, 0x55545b],
    pond: [0x1c2c3a, 0x5f93a8], trunk: 0x57493a,
    leaf: [0x4f5d49, 0x5a6a52, 0x6a7c5e], treeStyle: 'dead',
    rock: 0x77756c, crystal: 0xcfd6e6,
    props: ['pillar', 'rock', 'banner', 'torch', 'bones']
  },
  swamp: {
    label: 'Pântano das Brumas',
    sky: [0x08170f, 0x12251a, 0x06110c, 0x0c1b13],
    glow: 0x92d6a0, mote: 0xb6ffcf,
    path: [0x4d4a35, 0x55523c], ground: [0x26402b, 0x203724, 0x2c4930],
    pond: [0x173a2c, 0x63c69a], trunk: 0x41513a,
    leaf: [0x2f5d3a, 0x3a6b44, 0x4a7d4f], treeStyle: 'dead',
    rock: 0x555b4e, crystal: 0x8ef0b0,
    props: ['reeds', 'reeds', 'rock', 'bones', 'torch']
  },
  desert: {
    label: 'Deserto de Cinzas',
    sky: [0x2a1a0c, 0x3a2511, 0x1c1208, 0x2b1b0d],
    glow: 0xffd27a, mote: 0xffe3a1,
    path: [0xa07d45, 0xb08a4c], ground: [0x9a7442, 0x8d693a, 0xa67e48],
    pond: [0x2e6a7a, 0x9fe2e8], trunk: 0x6b4a2a,
    leaf: [0x8a9a45, 0xa4b356, 0xbfc96a], treeStyle: 'palm',
    rock: 0x9b7a52, crystal: 0xffd27a,
    props: ['cactus', 'rock', 'bones', 'banner', 'cactus']
  },
  ice: {
    label: 'Picos Glaciais',
    sky: [0x0a1a26, 0x123246, 0x081420, 0x0e2233],
    glow: 0xbfefff, mote: 0xe6fbff,
    path: [0x7f95a4, 0x8ba2b1], ground: [0x527787, 0x496b7a, 0x5b8293],
    pond: [0x2d6f8f, 0xaef2ff], trunk: 0x4a5f68,
    leaf: [0x6fa4b5, 0x82b8c9, 0x99cfe0], treeStyle: 'pine',
    rock: 0x7d96a3, crystal: 0xaef2ff,
    props: ['ice', 'crystal', 'rock', 'ice', 'banner']
  },
  volcano: {
    label: 'Forja Vulcânica',
    sky: [0x1a0a08, 0x2a0f0a, 0x100504, 0x1e0b08],
    glow: 0xff7a3d, mote: 0xffb46a,
    path: [0x5a4038, 0x644740], ground: [0x3f2a28, 0x372324, 0x4a312d],
    pond: [0x7a2a12, 0xff8a3d], trunk: 0x3c2a24,
    leaf: [0x5b3a26, 0x6e452b, 0x835330], treeStyle: 'dead',
    rock: 0x5f4640, crystal: 0xff8a3d,
    props: ['lava', 'lava', 'rock', 'torch', 'bones']
  },
  abyss: {
    label: 'Abismo Sombrio',
    sky: [0x0a0714, 0x150c24, 0x06040c, 0x10081a],
    glow: 0xb27bff, mote: 0xd3a6ff,
    path: [0x3a2f4a, 0x433655], ground: [0x2a1e38, 0x23182f, 0x332441],
    pond: [0x2a104a, 0x9a5cff], trunk: 0x3a2a45,
    leaf: [0x4a3160, 0x5a3d72, 0x6d4a86], treeStyle: 'dead',
    rock: 0x4c3b5d, crystal: 0xb27bff,
    props: ['bones', 'crystal', 'pillar', 'torch', 'bones']
  },
  sky: {
    label: 'Cidadela Celeste',
    sky: [0x1a2c4a, 0x2a4a72, 0x101d33, 0x203a5c],
    glow: 0xfff0b0, mote: 0xfff4c8,
    path: [0x8f9bb5, 0x9faac4], ground: [0x6f86a8, 0x647a9c, 0x7d93b6],
    pond: [0x4a8fb0, 0xd4f4ff], trunk: 0x7a7f8f,
    leaf: [0xa8c8d8, 0xbdd8e6, 0xd4e9f2], treeStyle: 'leaf',
    rock: 0x8fa0b8, crystal: 0xfff0b0,
    props: ['cloud', 'pillar', 'banner', 'crystal', 'cloud']
  },
  void: {
    label: 'Vazio Primordial',
    sky: [0x05040a, 0x0d0818, 0x030207, 0x080512],
    glow: 0x8a5cff, mote: 0xbda4ff,
    path: [0x2a2238, 0x332a44], ground: [0x1c1526, 0x171120, 0x241b31],
    pond: [0x1e0a36, 0x8a5cff], trunk: 0x2a2135,
    leaf: [0x332447, 0x3e2c55, 0x4c3666], treeStyle: 'none',
    rock: 0x3a2f4a, crystal: 0x8a5cff,
    props: ['crystal', 'bones', 'pillar', 'banner', 'crystal']
  },
  legend: {
    label: 'Coração do Mundo Perfeito',
    sky: [0x241a0a, 0x3c2a10, 0x160f05, 0x2b1e0b],
    glow: 0xffd76a, mote: 0xffe9a8,
    path: [0xb08a4c, 0xc49a58], ground: [0x6b5a2c, 0x5f5026, 0x7a6733],
    pond: [0x3a7f9a, 0xa8f0ff], trunk: 0x6b4a2a,
    leaf: [0x7f9a45, 0x99b356, 0xb8c96a], treeStyle: 'leaf',
    rock: 0x9b7a52, crystal: 0xffd76a,
    props: ['pillar', 'crystal', 'banner', 'torch', 'crystal']
  }
};

const FALLBACK_MONSTER: MonsterDefinition & { hp: number } = {
  id: 'slime',
  name: 'Sombra na Estrada',
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
  private stage: StageDefinition | null = null;
  private environment: EnvironmentId = 'forest';
  private theme: EnvironmentTheme = ENVIRONMENTS.forest;

  private player!: PlayerAvatar;
  private playerLabel!: Phaser.GameObjects.Text;
  private mount: HorseView | null = null;

  private monster: MonsterView | null = null;
  private monsterKey = '';
  private monsterPlate: Phaser.GameObjects.Container | null = null;
  private monsterPlateFill: Phaser.GameObjects.Rectangle | null = null;
  private monsterPlateWidth = 112;

  private snapshot: CombatSnapshot | null = null;
  private initialMonster: (MonsterDefinition & { hp: number }) | null = null;
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
    const travelSnapshot = this.registry.get('travelSnapshot') as CombatSnapshot | undefined;
    this.stage = travelSnapshot?.combat.stage ?? null;
    this.initialMonster = travelSnapshot?.combat.monster ?? null;
    this.environment = this.stage?.environment ?? 'forest';
    this.theme = ENVIRONMENTS[this.environment];
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
    this.updateLocation();

    if (travelSnapshot) {
      this.registry.remove('travelSnapshot');
      this.applySnapshot(travelSnapshot);
    } else {
      void this.poll();
    }
    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => void this.poll()
    });
    this.schedulePatrol();
  }

  private updateLocation(): void {
    const region = this.stage?.region ?? this.theme.label;
    const name = this.stage?.name ?? 'Estradas de Valedouro';
    const label = this.stage ? `${region} · Fase ${this.stage.order + 1}` : 'Área de combate';
    this.hud?.setLocation(name, label, false);
    if (this.stage) {
      this.hud?.pushFeed(`${this.character.name} chegou a ${name}.`, 'gold');
    } else {
      this.hud?.pushFeed(`${this.character.name} seguiu pelas estradas de Valedouro.`, 'gold');
    }
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
    const theme = this.theme;
    g.clear();

    g.fillGradientStyle(theme.sky[0], theme.sky[1], theme.sky[2], theme.sky[3], 1);
    g.fillRect(0, 0, width, height);

    g.fillStyle(theme.glow, 0.09);
    g.fillEllipse(width * 0.5, height * 0.36, width * 1.2, height * 0.75);

    g.fillStyle(theme.glow, 0.07);
    g.fillEllipse(width * 0.16, height * 0.62, width * 0.8, height * 0.6);

    g.fillStyle(theme.glow, 0.09);
    g.fillCircle(width * 0.83, height * 0.16, Math.min(width, height) * 0.13);
    g.fillStyle(theme.glow, 0.12);
    g.fillCircle(width * 0.83, height * 0.16, Math.min(width, height) * 0.06);

    for (let i = 0; i < 54; i += 1) {
      const x = ((i * 97 + 13) % 100) / 100 * width;
      const y = ((i * 53 + 7) % 52) / 100 * height;
      const alpha = 0.12 + ((i * 17) % 7) * 0.035;
      g.fillStyle(i % 6 === 0 ? theme.mote : theme.glow, alpha);
      g.fillCircle(x, y, i % 9 === 0 ? 1.5 : 0.9);
    }

    g.fillGradientStyle(0x04101a, 0x04101a, 0x04101a, 0x04101a, 0);
    g.fillStyle(0x04101a, 0.5);
    g.fillRect(0, height * 0.9, width, height * 0.1);
  }

  private buildIsland(): void {
    const theme = this.theme;
    const base = this.add.graphics().setDepth(0);
    this.world.add(base);

    base.fillStyle(0x040b10, 0.5);
    base.fillEllipse(0, 96, 1010, 500);

    this.fillDiamond(base, 468, 242, 30, 0x0b1a1e);
    this.fillDiamond(base, 462, 238, 18, 0x143136);
    this.fillDiamond(base, 452, 232, 8, 0x1c4645);

    base.fillStyle(theme.ground[0], 0.5);
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
          ? variant % 2 === 0 ? theme.path[0] : theme.path[1]
          : theme.ground[variant % 3] ?? theme.ground[0];

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

    // Lagoa / oásis / lava conforme a região.
    const pond = this.add.graphics().setDepth(12);
    this.world.add(pond);
    pond.fillStyle(theme.pond[0], 0.8);
    pond.fillEllipse(150, -156, 138, 62);
    pond.fillStyle(theme.pond[0], 1);
    pond.fillEllipse(150, -158, 126, 54);
    pond.lineStyle(2, theme.pond[1], 0.55);
    pond.strokeEllipse(150, -158, 126, 54);
    pond.fillStyle(theme.pond[1], 0.35);
    pond.fillEllipse(128, -164, 36, 8);
    pond.fillEllipse(176, -150, 22, 5);

    pond.fillStyle(theme.leaf[0], 1);
    pond.fillEllipse(120, -158, 16, 8);
    pond.fillEllipse(171, -169, 12, 6);
    pond.fillStyle(theme.glow, 0.8);
    pond.fillCircle(120, -160, 2);

    // Runas da arena
    const runes = this.add.graphics().setDepth(13);
    this.world.add(runes);
    runes.lineStyle(1.5, theme.glow, 0.15);
    runes.strokeEllipse(0, 24, 330, 112);
    runes.strokeEllipse(0, 24, 250, 84);
    runes.lineStyle(1, theme.glow, 0.09);
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
    const theme = this.theme;
    const trees: Array<[number, number, number]> = [
      [-352, -88, 1.08],
      [-304, 108, 0.94],
      [-126, -198, 1],
      [64, -206, 0.9],
      [302, -132, 1.04],
      [368, 56, 0.92],
      [222, 176, 1.08],
      [-360, 42, 0.82]
    ];

    if (theme.treeStyle !== 'none') {
      for (const [x, y, scale] of trees) {
        this.addTree(x, y, scale, theme.treeStyle);
      }
    }

    const propSpots: Array<[number, number, number]> = [
      [-238, 154, 1],
      [330, -30, 0.85],
      [-64, 190, 0.95],
      [70, -150, 0.7],
      [-392, 118, 1],
      [356, -178, 0.85],
      [-430, -20, 0.9],
      [250, 140, 0.9]
    ];
    theme.props.forEach((prop, index) => {
      const spot = propSpots[index % propSpots.length]!;
      this.addProp(prop, spot[0], spot[1], spot[2]);
    });

    // Tufos de grama, flores e detritos.
    for (let i = 0; i < 34; i += 1) {
      const x = Phaser.Math.Between(-390, 390);
      const y = Phaser.Math.Between(-185, 190);
      if (Math.abs(x) < 190 && y > -70 && y < 90) {
        continue;
      }
      this.addGrass(x, y, Phaser.Math.FloatBetween(0.7, 1.2), i % 4 === 0);
    }
  }

  private addProp(prop: DecorProp, x: number, y: number, scale: number): void {
    switch (prop) {
      case 'rock': this.addRock(x, y, scale); break;
      case 'crystal': this.addCrystal(x, y, scale); break;
      case 'torch': this.addTorch(x, y); break;
      case 'log': this.addLog(x, y); break;
      case 'pillar': this.addPillar(x, y, scale); break;
      case 'cactus': this.addCactus(x, y, scale); break;
      case 'ice': this.addIceSpike(x, y, scale); break;
      case 'lava': this.addLavaPool(x, y, scale); break;
      case 'bones': this.addBones(x, y, scale); break;
      case 'cloud': this.addCloud(x, y, scale); break;
      case 'banner': this.addBanner(x, y, scale); break;
      case 'reeds': this.addReeds(x, y, scale); break;
      default: break;
    }
  }

  private addTree(
    x: number,
    y: number,
    scale: number,
    variant: TreeStyle
  ): void {
    const theme = this.theme;
    const tree = this.add.container(x, y);
    tree.setDepth(100 + y);

    const shadow = this.add.ellipse(0, 2, 74 * scale, 24 * scale, 0x04100e, 0.35);
    tree.add(shadow);

    const trunk = this.add.graphics();
    trunk.fillStyle(theme.trunk, 1);
    trunk.lineStyle(2, 0x1a2520, 1);

    if (variant === 'palm') {
      trunk.fillRoundedRect(-4 * scale, -62 * scale, 9 * scale, 64 * scale, 4);
      trunk.strokeRoundedRect(-4 * scale, -62 * scale, 9 * scale, 64 * scale, 4);
      tree.add(trunk);

      const fronds = this.add.graphics();
      fronds.lineStyle(4 * scale, theme.leaf[0], 1);
      for (let i = 0; i < 7; i += 1) {
        const angle = Phaser.Math.DegToRad(-150 + i * 26);
        fronds.lineBetween(0, -62 * scale,
          Math.cos(angle) * 44 * scale, -62 * scale + Math.sin(angle) * 20 * scale);
      }
      fronds.fillStyle(theme.leaf[1], 1);
      fronds.fillCircle(0, -64 * scale, 8 * scale);
      fronds.fillStyle(theme.leaf[2], 1);
      fronds.fillCircle(-4 * scale, -68 * scale, 4 * scale);
      tree.add(fronds);
      this.world.add(tree);
      return;
    }

    if (variant === 'dead') {
      trunk.fillRoundedRect(-5 * scale, -42 * scale, 10 * scale, 44 * scale, 4);
      trunk.strokeRoundedRect(-5 * scale, -42 * scale, 10 * scale, 44 * scale, 4);
      trunk.lineStyle(4 * scale, theme.trunk, 1);
      trunk.lineBetween(0, -34 * scale, -30 * scale, -66 * scale);
      trunk.lineBetween(-18 * scale, -52 * scale, -34 * scale, -52 * scale);
      trunk.lineBetween(0, -30 * scale, 26 * scale, -58 * scale);
      trunk.lineBetween(14 * scale, -46 * scale, 32 * scale, -44 * scale);
      trunk.lineBetween(0, -40 * scale, 6 * scale, -78 * scale);
      tree.add(trunk);

      const wisp = this.add.ellipse(0, -50 * scale, 54 * scale, 40 * scale, theme.glow, 0.08);
      wisp.setBlendMode(Phaser.BlendModes.ADD);
      tree.add(wisp);
      this.world.add(tree);
      this.tweens.add({
        targets: wisp,
        alpha: { from: 0.05, to: 0.16 },
        duration: Phaser.Math.Between(2200, 3400),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
      return;
    }

    trunk.fillRoundedRect(-5 * scale, -34 * scale, 10 * scale, 36 * scale, 4);
    trunk.strokeRoundedRect(-5 * scale, -34 * scale, 10 * scale, 36 * scale, 4);
    tree.add(trunk);

    const canopy = this.add.container(0, -34 * scale);
    const leaves = this.add.graphics();

    if (variant === 'pine') {
      const layers = [
        { y: -12, w: 32, color: theme.leaf[0] },
        { y: -34, w: 26, color: theme.leaf[1] },
        { y: -56, w: 19, color: theme.leaf[2] }
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
      leaves.fillStyle(theme.leaf[0], 1);
      leaves.lineStyle(2, 0x16382d, 1);
      leaves.fillEllipse(-14 * scale, -20 * scale, 40 * scale, 36 * scale);
      leaves.strokeEllipse(-14 * scale, -20 * scale, 40 * scale, 36 * scale);
      leaves.fillStyle(theme.leaf[1], 1);
      leaves.fillEllipse(14 * scale, -24 * scale, 38 * scale, 34 * scale);
      leaves.strokeEllipse(14 * scale, -24 * scale, 38 * scale, 34 * scale);
      leaves.fillStyle(theme.leaf[2], 1);
      leaves.fillEllipse(0, -42 * scale, 42 * scale, 38 * scale);
      leaves.strokeEllipse(0, -42 * scale, 42 * scale, 38 * scale);
      leaves.fillStyle(theme.glow, 0.35);
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
    g.fillStyle(this.theme.rock, 1);
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
    g.fillStyle(lighten(this.theme.rock, 1.35), 0.7);
    g.fillTriangle(-10 * scale, -18 * scale, 4 * scale, -22 * scale, -4 * scale, -10 * scale);
    g.fillStyle(this.theme.leaf[0], 0.6);
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

    const glow = this.add.ellipse(0, -22 * scale, 68 * scale, 58 * scale, this.theme.crystal, 0.12);
    glow.setBlendMode(Phaser.BlendModes.ADD);
    crystal.add(glow);

    const g = this.add.graphics();
    g.fillStyle(this.theme.crystal, 0.9);
    g.lineStyle(2, darken(this.theme.crystal, 0.55), 1);
    g.fillTriangle(-14 * scale, 0, 0, -42 * scale, 6 * scale, 0);
    g.strokeTriangle(-14 * scale, 0, 0, -42 * scale, 6 * scale, 0);
    g.fillStyle(lighten(this.theme.crystal, 1.2), 0.9);
    g.fillTriangle(0, 0, 12 * scale, -28 * scale, 20 * scale, 0);
    g.strokeTriangle(0, 0, 12 * scale, -28 * scale, 20 * scale, 0);
    g.fillStyle(lighten(this.theme.crystal, 1.45), 0.8);
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
    grass.lineStyle(1.5, this.theme.leaf[1], 0.75);
    grass.lineBetween(x - 4 * scale, y, x - 7 * scale, y - 10 * scale);
    grass.lineBetween(x, y, x, y - 13 * scale);
    grass.lineBetween(x + 4 * scale, y, x + 7 * scale, y - 9 * scale);

    if (flower) {
      grass.fillStyle(this.theme.glow, 0.9);
      grass.fillCircle(x + 7 * scale, y - 11 * scale, 1.8);
      grass.fillStyle(this.theme.crystal, 0.8);
      grass.fillCircle(x - 7 * scale, y - 11 * scale, 1.8);
    }

    this.world.add(grass);
  }

  private addPillar(x: number, y: number, scale: number): void {
    const pillar = this.add.container(x, y);
    pillar.setDepth(100 + y);
    pillar.add(this.add.ellipse(0, 2, 54 * scale, 18 * scale, 0x04100e, 0.3));

    const g = this.add.graphics();
    const stone = this.theme.rock;
    g.fillStyle(darken(stone, 0.72), 1);
    g.fillRoundedRect(-16 * scale, -96 * scale, 32 * scale, 88 * scale, 6);
    g.lineStyle(2, 0x15171d, 1);
    g.strokeRoundedRect(-16 * scale, -96 * scale, 32 * scale, 88 * scale, 6);
    g.fillStyle(stone, 1);
    g.fillRoundedRect(-23 * scale, -102 * scale, 46 * scale, 14 * scale, 4);
    g.fillRoundedRect(-23 * scale, -14 * scale, 46 * scale, 14 * scale, 4);
    g.fillStyle(lighten(stone, 1.25), 0.4);
    g.fillRect(-11 * scale, -88 * scale, 7 * scale, 64 * scale);
    g.lineStyle(2, darken(stone, 0.55), 0.8);
    g.lineBetween(-4 * scale, -74 * scale, 9 * scale, -62 * scale);
    g.lineBetween(9 * scale, -62 * scale, -2 * scale, -44 * scale);
    pillar.add(g);
    this.world.add(pillar);
  }

  private addCactus(x: number, y: number, scale: number): void {
    const cactus = this.add.container(x, y);
    cactus.setDepth(100 + y);
    cactus.add(this.add.ellipse(0, 2, 40 * scale, 14 * scale, 0x04100e, 0.28));

    const g = this.add.graphics();
    const green = this.theme.leaf[1];
    g.fillStyle(green, 1);
    g.lineStyle(2.5, darken(green, 0.5), 1);
    g.fillRoundedRect(-9 * scale, -78 * scale, 18 * scale, 80 * scale, 8);
    g.strokeRoundedRect(-9 * scale, -78 * scale, 18 * scale, 80 * scale, 8);
    g.fillRoundedRect(-30 * scale, -58 * scale, 14 * scale, 30 * scale, 6);
    g.fillRoundedRect(-30 * scale, -58 * scale, 30 * scale, 12 * scale, 6);
    g.fillRoundedRect(16 * scale, -44 * scale, 14 * scale, 26 * scale, 6);
    g.fillRoundedRect(2 * scale, -44 * scale, 28 * scale, 12 * scale, 6);
    g.fillStyle(lighten(green, 1.3), 0.4);
    g.fillRect(-5 * scale, -70 * scale, 4 * scale, 58 * scale);
    g.fillStyle(this.theme.glow, 0.9);
    g.fillCircle(0, -80 * scale, 4 * scale);
    cactus.add(g);
    this.world.add(cactus);
  }

  private addIceSpike(x: number, y: number, scale: number): void {
    const spike = this.add.container(x, y);
    spike.setDepth(100 + y);
    spike.add(this.add.ellipse(0, 2, 56 * scale, 18 * scale, 0x04100e, 0.25));

    const glow = this.add.ellipse(0, -36 * scale, 70 * scale, 84 * scale, this.theme.crystal, 0.12);
    glow.setBlendMode(Phaser.BlendModes.ADD);
    spike.add(glow);

    const g = this.add.graphics();
    g.fillStyle(lighten(this.theme.crystal, 1.05), 0.85);
    g.lineStyle(2, darken(this.theme.crystal, 0.55), 0.9);
    g.fillTriangle(-22 * scale, 0, -8 * scale, -88 * scale, 4 * scale, 0);
    g.strokeTriangle(-22 * scale, 0, -8 * scale, -88 * scale, 4 * scale, 0);
    g.fillStyle(this.theme.crystal, 0.8);
    g.fillTriangle(0, 0, 18 * scale, -62 * scale, 28 * scale, 0);
    g.strokeTriangle(0, 0, 18 * scale, -62 * scale, 28 * scale, 0);
    spike.add(g);
    this.world.add(spike);
  }

  private addLavaPool(x: number, y: number, scale: number): void {
    const pool = this.add.container(x, y);
    pool.setDepth(60 + y);
    const glow = this.add.ellipse(0, -4, 150 * scale, 58 * scale, this.theme.crystal, 0.12);
    glow.setBlendMode(Phaser.BlendModes.ADD);
    pool.add(glow);

    const g = this.add.graphics();
    g.fillStyle(0x1a0b08, 1);
    g.fillEllipse(0, 0, 118 * scale, 44 * scale);
    g.fillStyle(darken(this.theme.crystal, 0.5), 1);
    g.fillEllipse(0, -2, 100 * scale, 34 * scale);
    g.fillStyle(this.theme.crystal, 0.92);
    g.fillEllipse(-8, -4, 62 * scale, 18 * scale);
    g.fillStyle(lighten(this.theme.crystal, 1.6), 0.9);
    g.fillEllipse(14, -5, 28 * scale, 8 * scale);
    pool.add(g);
    this.world.add(pool);

    this.tweens.add({
      targets: glow,
      alpha: { from: 0.08, to: 0.24 },
      duration: Phaser.Math.Between(900, 1500),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private addBones(x: number, y: number, scale: number): void {
    const bones = this.add.container(x, y);
    bones.setDepth(100 + y);
    const g = this.add.graphics();
    const bone = 0xd9d0b4;
    g.fillStyle(bone, 0.9);
    g.lineStyle(2, 0x3a3528, 0.9);
    g.fillRoundedRect(-26 * scale, -8 * scale, 46 * scale, 7 * scale, 3);
    g.fillCircle(-28 * scale, -5 * scale, 5 * scale);
    g.fillCircle(22 * scale, -5 * scale, 5 * scale);
    g.fillRoundedRect(-6 * scale, -20 * scale, 7 * scale, 30 * scale, 3);
    g.fillCircle(-2 * scale, -22 * scale, 5 * scale);
    g.fillStyle(0x8a8068, 0.9);
    g.fillCircle(16 * scale, -14 * scale, 8 * scale);
    g.fillRect(14 * scale, -22 * scale, 14 * scale, 7 * scale);
    g.fillStyle(0x1a1610, 1);
    g.fillCircle(19 * scale, -15 * scale, 2 * scale);
    g.fillCircle(13 * scale, -15 * scale, 2 * scale);
    bones.add(g);
    this.world.add(bones);
  }

  private addCloud(x: number, y: number, scale: number): void {
    const cloud = this.add.container(x, y);
    cloud.setDepth(40 + y);
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 0.12);
    g.fillEllipse(0, 0, 130 * scale, 40 * scale);
    g.fillStyle(0xffffff, 0.2);
    g.fillEllipse(-24 * scale, -8 * scale, 64 * scale, 30 * scale);
    g.fillEllipse(20 * scale, -12 * scale, 72 * scale, 34 * scale);
    g.fillEllipse(2 * scale, -22 * scale, 52 * scale, 28 * scale);
    cloud.add(g);
    this.world.add(cloud);
    this.tweens.add({
      targets: cloud,
      x: x + Phaser.Math.Between(20, 50),
      duration: Phaser.Math.Between(5000, 8000),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private addBanner(x: number, y: number, scale: number): void {
    const banner = this.add.container(x, y);
    banner.setDepth(100 + y);
    const g = this.add.graphics();
    g.fillStyle(0x3a2a1e, 1);
    g.lineStyle(2, 0x1a120c, 1);
    g.fillRoundedRect(-4 * scale, -118 * scale, 8 * scale, 120 * scale, 3);
    g.strokeRoundedRect(-4 * scale, -118 * scale, 8 * scale, 120 * scale, 3);
    g.fillStyle(0x8a3b42, 1);
    g.lineStyle(2, 0x2a0f12, 1);
    g.fillPoints([
      { x: 4 * scale, y: -112 * scale },
      { x: 54 * scale, y: -112 * scale },
      { x: 54 * scale, y: -48 * scale },
      { x: 29 * scale, y: -60 * scale },
      { x: 4 * scale, y: -48 * scale }
    ], true);
    g.strokePoints([
      { x: 4 * scale, y: -112 * scale },
      { x: 54 * scale, y: -112 * scale },
      { x: 54 * scale, y: -48 * scale },
      { x: 29 * scale, y: -60 * scale },
      { x: 4 * scale, y: -48 * scale }
    ], true);
    g.fillStyle(this.theme.glow, 1);
    g.fillCircle(29 * scale, -82 * scale, 7 * scale);
    g.fillStyle(0x3a2a1e, 1);
    g.fillCircle(29 * scale, -82 * scale, 3 * scale);
    banner.add(g);
    this.world.add(banner);
    this.tweens.add({
      targets: banner,
      angle: { from: -0.8, to: 0.8 },
      duration: Phaser.Math.Between(2400, 3400),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private addReeds(x: number, y: number, scale: number): void {
    const reeds = this.add.graphics();
    reeds.setDepth(100 + y);
    reeds.lineStyle(2 * scale, this.theme.leaf[1], 0.85);
    for (let i = 0; i < 7; i += 1) {
      const bx = x + (i - 3) * 7 * scale;
      const height = (14 + (i % 3) * 8) * scale;
      reeds.lineBetween(bx, y, bx + (i % 2 === 0 ? 4 : -4) * scale, y - height);
      reeds.fillStyle(this.theme.glow, 0.7);
      reeds.fillEllipse(bx + (i % 2 === 0 ? 4 : -4) * scale, y - height, 4 * scale, 10 * scale);
    }
    this.world.add(reeds);
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

    this.buildMount();
    this.spawnMonster(this.initialMonster ?? FALLBACK_MONSTER);
  }

  private buildMount(): void {
    const post = this.add.graphics();
    post.setDepth(90 + PLAYER_HOME.y + 58);
    post.fillStyle(0x3c2a1e, 1);
    post.fillRoundedRect(PLAYER_HOME.x - 238, PLAYER_HOME.y + 34, 8, 70, 3);
    post.fillRoundedRect(PLAYER_HOME.x - 244, PLAYER_HOME.y + 26, 26, 7, 3);
    post.fillStyle(0x6b4a2f, 1);
    post.fillRect(PLAYER_HOME.x - 240, PLAYER_HOME.y + 82, 6, 22);
    this.world.add(post);

    this.mount = new HorseView(this, PLAYER_HOME.x - 186, PLAYER_HOME.y + 66, {
      color: 0x6b4a2f,
      mane: 0x2c1d12,
      saddle: 0x8a3b42,
      scale: 0.86
    });
    this.mount.setFacing(1);
    this.mount.root.setDepth(100 + PLAYER_HOME.y + 66);
    this.world.add(this.mount.root);

    const mountLabel = this.add
      .text(PLAYER_HOME.x - 186, PLAYER_HOME.y - 62, 'Relâmpago', {
        fontFamily: FONT,
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#e7c168',
        stroke: '#07111c',
        strokeThickness: 3,
        resolution: 2
      })
      .setOrigin(0.5)
      .setDepth(2100);
    this.world.add(mountLabel);
  }

  private spawnMonster(monster: MonsterDefinition & { hp: number }): void {
    this.monster?.destroy();
    this.monster = null;
    this.clearMonsterPlate();

    const view = new MonsterView(this, monster.sprite, MONSTER_HOME.x, MONSTER_HOME.y, {
      variant: monster.variant,
      tint: monster.tint,
      accent: monster.accent,
      scale: monster.visualScale,
      isBoss: monster.isBoss
    });
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
      sfxDeath();
      this.scene.start('CityScene');
      return;
    }
    const previousLevel = this.snapshot?.character.level ?? snapshot.character.level;
    const stageChanged = this.stage?.id !== snapshot.combat.stage.id;

    this.snapshot = snapshot;
    this.character = snapshot.character;
    this.registry.set('character', snapshot.character);

    if (stageChanged) {
      this.stage = snapshot.combat.stage;
      this.environment = snapshot.combat.stage.environment;
      this.theme = ENVIRONMENTS[this.environment];
      this.initialMonster = snapshot.combat.monster;
      this.rebuildWorld();
    }

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
      this.hud?.showBanner('Combate retomado', subtitle, 'gold');
      return;
    }

    const visibleEvents = snapshot.events.slice(-14);
    visibleEvents.forEach((event, index) => {
      this.time.delayedCall(index * 115, () => this.playEvent(event));
    });
  }

  private rebuildWorld(): void {
    this.tweens.killAll();
    this.monster?.destroy();
    this.monster = null;
    this.monsterKey = '';
    this.clearMonsterPlate();
    this.mount?.destroy();
    this.mount = null;
    this.world.destroy(true);
    this.world = this.add.container(0, 0);
    this.buildIsland();
    this.buildDecor();
    this.buildActors();
    this.buildMotes();
    this.layout(this.scale.width, this.scale.height);
    this.updateLocation();
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
          this.hud?.pushFeed(`Item encontrado: ${event.message ?? 'Material'}`, 'gold');
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
        sfxHit(critical);
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
          sfxMonsterHit();
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
        sfxCoin();
        break;
      }

      case 'item_drop': {
        this.popText(
          MONSTER_HOME.x + Phaser.Math.Between(-30, 30),
          MONSTER_HOME.y - 128,
          `✦ ${event.message ?? 'Material'}`,
          '#ffe28a',
          14
        );
        sfxCoin();
        break;
      }

      case 'level_up': {
        this.spawnLevelUp();
        sfxLevelUp();
        break;
      }

      case 'boss_spawn': {
        this.spawnBossEntrance();
        sfxBoss();
        break;
      }

      case 'boss_defeated': {
        this.spawnBossDefeat();
        sfxVictory();
        break;
      }

      case 'player_death': {
        this.cameras.main.flash(200, 255, 80, 80);
        this.player.hurt();
        sfxDeath();
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
        i % 3 === 0 ? this.theme.mote : this.theme.glow,
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
    this.mount?.destroy();
    this.mount = null;
    this.initialMonster = null;
  }
}

function lighten(color: number, factor: number): number {
  const r = Math.min(255, Math.round(((color >> 16) & 0xff) * factor));
  const g = Math.min(255, Math.round(((color >> 8) & 0xff) * factor));
  const b = Math.min(255, Math.round((color & 0xff) * factor));
  return (r << 16) | (g << 8) | b;
}

function darken(color: number, factor: number): number {
  return lighten(color, factor);
}
