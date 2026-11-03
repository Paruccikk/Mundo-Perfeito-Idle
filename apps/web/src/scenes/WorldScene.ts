import Phaser from 'phaser';
import type { CharacterSummary } from '@mundo-perfeito/shared';

const COLORS = {
  background: 0x172638,
  tileLight: 0x315b4b,
  tileDark: 0x294d42,
  tileStroke: 0x426b58,
  panel: 0x0f1a28,
  panelStroke: 0x35506b,
  xpTrack: 0x22344a,
  xpFill: 0x69b7ff,
  player: 0x69b7ff,
  monster: 0x8fc65b,
  gold: 0xf4d58d,
  text: '#d9e4ef',
  muted: '#8aa0b8',
  title: '#f4d58d'
};

const TILE_W = 96;
const TILE_H = 48;
const GRID_COLS = 9;
const GRID_ROWS = 7;

export class WorldScene extends Phaser.Scene {
  private character: CharacterSummary | null = null;
  private background!: Phaser.GameObjects.Rectangle;
  private world!: Phaser.GameObjects.Container;
  private hudName!: Phaser.GameObjects.Text;
  private hudClass!: Phaser.GameObjects.Text;
  private hudXpLabel!: Phaser.GameObjects.Text;
  private hudGold!: Phaser.GameObjects.Text;
  private hudStage!: Phaser.GameObjects.Text;
  private xpFill!: Phaser.GameObjects.Rectangle;
  private footer!: Phaser.GameObjects.Text;

  constructor() {
    super('WorldScene');
  }

  create(): void {
    this.character = (this.registry.get('character') as CharacterSummary | undefined) ?? null;

    const { width, height } = this.scale;

    this.background = this.add
      .rectangle(0, 0, width, height, COLORS.background)
      .setOrigin(0)
      .setDepth(-10);

    this.world = this.add.container(0, 0);
    this.buildWorld();

    this.buildHud(width);
    this.layout(width, height);

    this.scale.on('resize', (size: Phaser.Structs.Size) => {
      this.cameras.resize(size.width, size.height);
      this.layout(size.width, size.height);
    });
  }

  private buildWorld(): void {
    const originX = 0;
    const originY = 0;

    for (let row = 0; row < GRID_ROWS; row += 1) {
      for (let col = 0; col < GRID_COLS; col += 1) {
        const x = originX + ((col - row) * TILE_W) / 2;
        const y = originY + ((col + row) * TILE_H) / 2;
        const tile = this.add.polygon(
          x,
          y,
          [0, -TILE_H / 2, TILE_W / 2, 0, 0, TILE_H / 2, -TILE_W / 2, 0],
          (row + col) % 2 === 0 ? COLORS.tileLight : COLORS.tileDark
        );
        tile.setStrokeStyle(1, COLORS.tileStroke, 0.8);
        this.world.add(tile);
      }
    }

    const playerX = originX - 25;
    const playerY = originY + 40;
    this.world.add(this.add.circle(playerX, playerY, 15, COLORS.player));
    this.world.add(
      this.add
        .text(playerX, playerY + 23, this.character?.name ?? 'Aventureiro', {
          fontFamily: 'Arial, sans-serif',
          fontSize: '12px',
          color: '#ffffff'
        })
        .setOrigin(0.5)
    );

    const monsterX = originX + 100;
    const monsterY = originY + 90;
    this.world.add(this.add.circle(monsterX, monsterY, 17, COLORS.monster));
    this.world.add(
      this.add
        .text(monsterX, monsterY + 24, 'Slime', {
          fontFamily: 'Arial, sans-serif',
          fontSize: '12px',
          color: '#ffffff'
        })
        .setOrigin(0.5)
    );
  }

  private buildHud(width: number): void {
    const panelWidth = Math.min(330, width - 32);
    this.add
      .rectangle(16, 16, panelWidth, 118, COLORS.panel, 0.88)
      .setOrigin(0)
      .setStrokeStyle(1, COLORS.panelStroke, 0.9);

    this.hudName = this.add.text(30, 28, this.character?.name ?? 'Aventureiro', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: COLORS.title
    });

    this.hudClass = this.add.text(30, 52, this.describeClass(), {
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      color: COLORS.muted
    });

    this.add
      .rectangle(30, 76, panelWidth - 60, 10, COLORS.xpTrack)
      .setOrigin(0)
      .setStrokeStyle(1, COLORS.panelStroke, 0.8);

    const ratio = this.xpRatio();
    this.xpFill = this.add
      .rectangle(30, 76, Math.max(0, (panelWidth - 60) * ratio), 10, COLORS.xpFill)
      .setOrigin(0);

    this.hudXpLabel = this.add.text(30, 92, this.describeXp(), {
      fontFamily: 'Arial, sans-serif',
      fontSize: '11px',
      color: COLORS.muted
    });

    this.hudGold = this.add
      .text(width - 20, 20, `Ouro: ${this.character?.gold ?? 0}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        color: COLORS.title
      })
      .setOrigin(1, 0);

    this.hudStage = this.add
      .text(width - 20, 42, `Fase: ${this.character?.currentStageId ?? 'clearing-01'}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '11px',
        color: COLORS.muted
      })
      .setOrigin(1, 0);

    this.footer = this.add
      .text(16, this.scale.height - 20, 'Protótipo visual — combate automático entra na próxima etapa', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '11px',
        color: COLORS.muted
      })
      .setOrigin(0, 1);
  }

  private describeClass(): string {
    if (!this.character) {
      return 'Nível 1';
    }
    return `${this.character.className} • Nível ${this.character.level}`;
  }

  private describeXp(): string {
    if (!this.character) {
      return '0 / 50 XP';
    }
    return `${this.character.experience} / ${this.character.experienceToNextLevel} XP`;
  }

  private xpRatio(): number {
    if (!this.character || this.character.experienceToNextLevel <= 0) {
      return 0;
    }
    return Math.min(1, this.character.experience / this.character.experienceToNextLevel);
  }

  private layout(width: number, height: number): void {
    this.background.setSize(width, height);
    this.world.setPosition(width / 2, height / 2 - 40);

    this.hudGold?.setPosition(width - 20, 20);
    this.hudStage?.setPosition(width - 20, 42);
    this.footer?.setPosition(16, height - 20);
  }
}
