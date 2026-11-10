import Phaser from 'phaser';
import type { CharacterSummary } from '@mundo-perfeito/shared';
import type { GameHud } from '../ui/hud';

const TILE_W = 96;
const TILE_H = 48;
const COLS = 13;
const ROWS = 11;

interface FarmPlot {
  col: number;
  row: number;
  label: string;
}

const PLOTS: FarmPlot[] = [
  { col: 2, row: 6, label: 'Canteiro de milho' },
  { col: 3, row: 6, label: 'Canteiro de trigo' },
  { col: 4, row: 6, label: 'Canteiro de cenoura' },
  { col: 2, row: 7, label: 'Canteiro vazio' },
  { col: 3, row: 7, label: 'Canteiro vazio' },
  { col: 4, row: 7, label: 'Canteiro vazio' }
];

export class FarmScene extends Phaser.Scene {
  private character!: CharacterSummary;
  private hud: GameHud | null = null;
  private world!: Phaser.GameObjects.Container;
  private alive = true;

  constructor() {
    super('FarmScene');
  }

  create(): void {
    this.character = this.registry.get('character') as CharacterSummary;
    this.hud = (this.registry.get('hud') as GameHud | undefined) ?? null;
    this.alive = true;
    this.cameras.main.setBackgroundColor('#9acb78');
    this.world = this.add.container(0, 0);
    this.drawFarm();
    this.layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.alive = false;
      this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
    });
    this.input.on('pointerdown', this.handleFarmClick, this);
    this.hud?.setConnection('online');
    this.hud?.setLocation('Minha Fazenda', 'Propriedade particular', true);
    this.hud?.pushFeed(`Bem-vindo à sua fazenda, ${this.character.name}!`, 'gold');
  }

  private iso(col: number, row: number): { x: number; y: number } {
    return {
      x: (col - row) * (TILE_W / 2) - ((COLS - ROWS) * TILE_W) / 4,
      y: (col + row) * (TILE_H / 2) - ((COLS + ROWS - 2) * TILE_H) / 4
    };
  }

  private diamond(graphics: Phaser.GameObjects.Graphics, x: number, y: number, fill: number, line = 0x496d3d): void {
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

  private drawFarm(): void {
    const ground = this.add.graphics();
    this.world.add(ground);
    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        const p = this.iso(col, row);
        const variation = (col + row) % 4;
        const color = variation === 0 ? 0x8fbd68 : variation === 1 ? 0x99c875 : variation === 2 ? 0x94c16e : 0x88b961;
        this.diamond(ground, p.x, p.y, color);
      }
    }

    this.drawPath(ground);
    this.drawHouse();
    this.drawPlots();
    this.drawBuildingPads();
    this.drawDecorations();
    this.add.text(0, 330, 'Sua propriedade • Expanda, plante e crie seus animais', {
      fontFamily: 'Georgia, serif', fontSize: '17px', color: '#fff4d5',
      stroke: '#294526', strokeThickness: 4, align: 'center'
    }).setOrigin(0.5).setDepth(100);
  }

  private drawPath(graphics: Phaser.GameObjects.Graphics): void {
    for (let step = 0; step < 8; step += 1) {
      const p = this.iso(8, step + 2);
      this.diamond(graphics, p.x, p.y, 0xb99a68, 0x876c43);
    }
  }

  private drawHouse(): void {
    const p = this.iso(8, 3);
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
    this.world.add(this.add.text(p.x, p.y - 78, 'CASA PRINCIPAL', {
      fontFamily: 'Georgia, serif', fontSize: '12px', color: '#fff0c2',
      stroke: '#3d2b1b', strokeThickness: 4
    }).setOrigin(0.5).setDepth(25));
  }

  private drawPlots(): void {
    for (const plot of PLOTS) {
      const p = this.iso(plot.col, plot.row);
      const g = this.add.graphics().setDepth(10);
      this.diamond(g, p.x, p.y, 0x795333, 0x50371f);
      g.fillStyle(0x4f351f, 1);
      for (let row = -1; row <= 1; row += 1) {
        g.fillRoundedRect(p.x - 27, p.y + row * 8 - 2, 54, 4, 2);
      }
      if (plot.label.includes('milho')) {
        for (let i = -1; i <= 1; i += 1) {
          g.fillStyle(0x4c8b39, 1);
          g.fillRoundedRect(p.x + i * 17 - 3, p.y - 17, 6, 31, 3);
          g.fillStyle(0xe5c34e, 1);
          g.fillEllipse(p.x + i * 17, p.y - 13, 7, 12);
        }
      } else if (plot.label.includes('trigo')) {
        for (let i = -1; i <= 1; i += 1) {
          g.lineStyle(3, 0xd8c06b, 1);
          g.lineBetween(p.x + i * 16, p.y + 8, p.x + i * 16 - 3, p.y - 17);
          g.fillStyle(0xe8d17b, 1);
          g.fillCircle(p.x + i * 16 - 3, p.y - 18, 4);
        }
      } else if (plot.label.includes('cenoura')) {
        for (let i = -1; i <= 1; i += 1) {
          g.fillStyle(0x4d9b42, 1);
          g.fillTriangle(p.x + i * 16, p.y - 20, p.x + i * 16 - 7, p.y - 7, p.x + i * 16 + 7, p.y - 7);
          g.fillStyle(0xe58b38, 1);
          g.fillTriangle(p.x + i * 16, p.y - 7, p.x + i * 16 - 5, p.y + 5, p.x + i * 16 + 5, p.y + 5);
        }
      }
      this.world.add(g);
    }
  }

  private drawBuildingPads(): void {
    const pads = [
      { col: 10, row: 5, name: 'Galinheiro', icon: '🐔' },
      { col: 10, row: 7, name: 'Curral', icon: '🐄' },
      { col: 7, row: 9, name: 'Estábulo', icon: '🐎' }
    ];
    for (const pad of pads) {
      const p = this.iso(pad.col, pad.row);
      const g = this.add.graphics().setDepth(12);
      this.diamond(g, p.x, p.y, 0xb4a078, 0x806d4b);
      g.lineStyle(2, 0xf1e0b6, 0.9);
      g.strokeRect(p.x - 23, p.y - 12, 46, 24);
      this.world.add(g);
      this.world.add(this.add.text(p.x, p.y - 25, pad.icon, { fontSize: '20px' }).setOrigin(0.5).setDepth(18));
      this.world.add(this.add.text(p.x, p.y + 20, pad.name, {
        fontFamily: 'Georgia, serif', fontSize: '10px', color: '#fff4d5',
        stroke: '#3b3020', strokeThickness: 3
      }).setOrigin(0.5).setDepth(18));
    }
  }

  private drawDecorations(): void {
    const treeSpots: Array<[number, number]> = [[1, 1], [11, 1], [1, 9], [12, 9], [5, 2], [11, 10]];
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
    const player = this.add.container(-20, 110).setDepth(60);
    const shadow = this.add.ellipse(0, 10, 28, 12, 0x25351e, 0.35);
    const body = this.add.ellipse(0, -8, 22, 30, 0x3e668e);
    const head = this.add.circle(0, -29, 10, 0xf0c69a);
    const hat = this.add.triangle(0, -42, -12, 8, 12, 8, 0, -10, 0x6a472c);
    player.add([shadow, body, head, hat]);
    this.world.add(player);
  }

  private layout(): void {
    if (!this.alive) return;
    const scale = Math.min(this.scale.width / 1050, this.scale.height / 650, 1);
    this.cameras.main.setZoom(Math.max(0.55, scale * 0.95));
    this.cameras.main.centerOn(0, 0);
  }

  private handleFarmClick(pointer: Phaser.Input.Pointer): void {
    if (!this.alive) return;
    const point = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const col = Math.round(point.x / TILE_W + point.y / TILE_H + (COLS + ROWS) / 4);
    const row = Math.round(point.y / TILE_H - point.x / TILE_W + (ROWS - 1) / 2);
    const plot = PLOTS.find((entry) => entry.col === col && entry.row === row);
    if (plot) {
      this.hud?.pushFeed(`${plot.label}: sistema de cultivo será ativado na próxima etapa.`, 'gold');
    }
  }
}
