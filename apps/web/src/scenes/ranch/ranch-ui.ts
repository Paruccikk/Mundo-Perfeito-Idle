import Phaser from 'phaser';
import type { FarmState } from '@mundo-perfeito/shared';
import {
  RANCH,
  RANCH_FONT_BODY,
  RANCH_FONT_DISPLAY
} from './ranch-theme';

export type RanchPanelVariant = 'wood' | 'parchment';

export interface RanchPanelOptions {
  variant?: RanchPanelVariant;
  radius?: number;
}

function formatGold(value: number): string {
  return Math.max(0, Math.floor(value)).toLocaleString('pt-BR');
}

/**
 * Desenha uma moldura de madeira (ou pergaminho) centrada nas coordenadas
 * informadas. É usada pelo HUD do rancho, pelo seletor de sementes e pelas
 * fichas dos animais para manter a mesma linguagem visual.
 */
export function drawRanchPanel(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  options: RanchPanelOptions = {}
): void {
  const variant = options.variant ?? 'wood';
  const radius = options.radius ?? 14;

  graphics.fillStyle(0x120b06, 0.42);
  graphics.fillRoundedRect(x + 4, y + 7, width, height, radius);

  if (variant === 'parchment') {
    // Moldura de madeira escura.
    graphics.fillStyle(0x1c1109, 1);
    graphics.fillRoundedRect(x, y, width, height, radius);
    graphics.fillStyle(0x4a2d18, 1);
    graphics.fillRoundedRect(x + 3, y + 3, width - 6, height - 6, radius - 2);
    graphics.fillStyle(0x633e22, 1);
    graphics.fillRoundedRect(x + 5, y + 5, width - 10, height - 10, radius - 3);
    graphics.lineStyle(2, RANCH.panelBorder, 0.9);
    graphics.strokeRoundedRect(x + 1.5, y + 1.5, width - 3, height - 3, radius);
    graphics.lineStyle(1, 0x2a180c, 0.8);
    graphics.strokeRoundedRect(x + 5.5, y + 5.5, width - 11, height - 11, radius - 3);

    // Papel envelhecido.
    const paperInset = 9;
    graphics.fillStyle(0xf1e2c4, 1);
    graphics.fillRoundedRect(
      x + paperInset,
      y + paperInset,
      width - paperInset * 2,
      height - paperInset * 2,
      Math.max(4, radius - 6)
    );
    graphics.fillStyle(0xfbf1d9, 0.7);
    graphics.fillRoundedRect(
      x + paperInset + 1,
      y + paperInset + 1,
      width - paperInset * 2 - 2,
      (height - paperInset * 2) * 0.36,
      Math.max(3, radius - 7)
    );
    graphics.lineStyle(1, 0xcda96d, 0.75);
    graphics.strokeRoundedRect(
      x + paperInset,
      y + paperInset,
      width - paperInset * 2,
      height - paperInset * 2,
      Math.max(4, radius - 6)
    );

    // Manchinhas de papel: dão textura sem chamar atenção.
    for (let index = 0; index < 26; index += 1) {
      const speckX = x + 16 + ((index * 71) % Math.max(1, width - 32));
      const speckY = y + 16 + ((index * 103) % Math.max(1, height - 32));
      graphics.fillStyle(0x9c7748, 0.055);
      graphics.fillCircle(speckX, speckY, 1 + (index % 2) * 0.7);
    }

    for (const [nailX, nailY] of [
      [x + 7, y + 7],
      [x + width - 7, y + 7],
      [x + 7, y + height - 7],
      [x + width - 7, y + height - 7]
    ] as Array<[number, number]>) {
      graphics.fillStyle(0x26170d, 1);
      graphics.fillCircle(nailX, nailY, 2.4);
      graphics.fillStyle(0xc9a46b, 0.65);
      graphics.fillCircle(nailX - 0.7, nailY - 0.7, 0.9);
    }
    return;
  }

  // Painel de madeira escura, usado sobre o cenário.
  graphics.fillStyle(0x160d07, 1);
  graphics.fillRoundedRect(x, y, width, height, radius);
  graphics.fillStyle(0x332012, 1);
  graphics.fillRoundedRect(x + 2, y + 2, width - 4, height - 4, radius - 1);
  graphics.fillStyle(0x402a18, 0.9);
  graphics.fillRoundedRect(x + 4, y + 4, width - 8, height * 0.46, radius - 2);

  for (let index = 0; index < 9; index += 1) {
    const grainY = y + 10 + (index / 9) * (height - 20);
    graphics.lineStyle(1, 0x1b1008, 0.22);
    graphics.lineBetween(x + 9, grainY, x + width - 9, grainY + (index % 2 === 0 ? 1 : -1));
  }

  graphics.lineStyle(2, RANCH.panelBorder, 0.85);
  graphics.strokeRoundedRect(x + 1.5, y + 1.5, width - 3, height - 3, radius);
  graphics.lineStyle(1, 0x8a6132, 0.8);
  graphics.strokeRoundedRect(x + 7, y + 7, width - 14, height - 14, radius - 4);

  for (const [nailX, nailY] of [
    [x + 6, y + 6],
    [x + width - 6, y + 6],
    [x + 6, y + height - 6],
    [x + width - 6, y + height - 6]
  ] as Array<[number, number]>) {
    graphics.fillStyle(0x22150c, 1);
    graphics.fillCircle(nailX, nailY, 2.7);
    graphics.fillStyle(RANCH.panelBorder, 0.7);
    graphics.fillCircle(nailX - 0.8, nailY - 0.8, 1);
  }
}

export interface RanchButtonOptions {
  width: number;
  height: number;
  label: string;
  onClick: () => void;
  fontSize?: number;
}

export interface RanchButton {
  container: Phaser.GameObjects.Container;
  setEnabled: (enabled: boolean) => void;
  setLabel: (label: string) => void;
  destroy: () => void;
}

export function createRanchButton(
  scene: Phaser.Scene,
  options: RanchButtonOptions
): RanchButton {
  const { width, height, label, onClick } = options;
  const container = scene.add.container(0, 0);
  const face = scene.add.graphics();

  face.fillStyle(0x120b06, 0.55);
  face.fillRoundedRect(-width / 2 + 2, -height / 2 + 3, width, height, 7);
  face.fillStyle(0x4a2d16, 1);
  face.fillRoundedRect(-width / 2, -height / 2, width, height, 7);
  face.fillStyle(0xb98a46, 1);
  face.fillRoundedRect(-width / 2 + 2, -height / 2 + 2, width - 4, height - 4, 6);
  face.fillStyle(0xe8c877, 1);
  face.fillRoundedRect(-width / 2 + 3, -height / 2 + 3, width - 6, (height - 6) * 0.52, 5);
  face.fillStyle(0xfff0bd, 0.4);
  face.fillRoundedRect(-width / 2 + 6, -height / 2 + 4, width - 12, 3, 2);
  face.lineStyle(1, 0xffe8a8, 0.65);
  face.strokeRoundedRect(-width / 2 + 2, -height / 2 + 2, width - 4, height - 4, 6);

  const text = scene.add.text(0, 0, label, {
    fontFamily: RANCH_FONT_BODY,
    fontSize: `${options.fontSize ?? 11}px`,
    fontStyle: 'bold',
    color: '#2a1a08',
    letterSpacing: 0.7
  }).setOrigin(0.5);

  const hit = scene.add
    .rectangle(0, 0, width, height, 0x000000, 0.001)
    .setInteractive({ useHandCursor: true });

  container.add([face, text, hit]);

  let enabled = true;
  hit.on('pointerover', () => {
    if (!enabled) return;
    container.setScale(1.025);
  });
  hit.on('pointerout', () => container.setScale(1));
  hit.on('pointerdown', (
    _pointer: Phaser.Input.Pointer,
    _localX: number,
    _localY: number,
    event: Phaser.Types.Input.EventData
  ) => {
    if (!enabled) return;
    event.stopPropagation();
    container.setScale(0.98);
    scene.time.delayedCall(90, () => {
      if (container.active) container.setScale(1);
    });
    onClick();
  });

  return {
    container,
    setEnabled(next: boolean): void {
      enabled = next;
      container.setAlpha(next ? 1 : 0.48);
      if (next) {
        hit.setInteractive({ useHandCursor: true });
      } else {
        hit.disableInteractive();
        container.setScale(1);
      }
    },
    setLabel(next: string): void {
      text.setText(next);
    },
    destroy(): void {
      container.destroy(true);
    }
  };
}

export interface RanchHudOptions {
  ownerName: string;
  onOpenShop: () => void;
}

/**
 * Painel fixo do rancho: ouro, canteiros, animais, abrigos e estoque.
 * Fica fora do container do mundo para não sofrer zoom/pan da câmera.
 */
export class RanchHud {
  readonly root: Phaser.GameObjects.Container;

  private readonly scene: Phaser.Scene;
  private readonly panelWidth = 300;
  private readonly panelHeight = 238;
  private readonly statValues: Phaser.GameObjects.Text[] = [];
  private readonly cropValues: Phaser.GameObjects.Text[] = [];
  private readonly goldText: Phaser.GameObjects.Text;
  private readonly seedText: Phaser.GameObjects.Text;
  private readonly shopButton: RanchButton;
  private rootX = 0;
  private rootY = 0;
  private rootScale = 1;

  constructor(scene: Phaser.Scene, options: RanchHudOptions) {
    this.scene = scene;
    this.root = scene.add.container(0, 0).setDepth(9600);
    const panel = scene.add.graphics();
    drawRanchPanel(panel, 0, 0, this.panelWidth, this.panelHeight);
    this.root.add(panel);

    const eyebrow = scene.add.text(16, 14, 'RANCHO', {
      fontFamily: RANCH_FONT_DISPLAY,
      fontSize: '8px',
      color: '#d3ac66',
      letterSpacing: 3
    });
    this.root.add(eyebrow);

    const displayName = options.ownerName.length > 18
      ? `${options.ownerName.slice(0, 17)}…`
      : options.ownerName;
    const owner = scene.add.text(16, 25, `Fazenda de ${displayName}`, {
      fontFamily: RANCH_FONT_DISPLAY,
      fontSize: '14px',
      color: '#f6e6bd'
    });
    this.root.add(owner);

    // Moeda desenhada em vetor, para não depender da fonte de emoji.
    const coin = scene.add.graphics();
    coin.fillStyle(0x6f4b1b, 1);
    coin.fillCircle(this.panelWidth - 72, 30, 10);
    coin.fillStyle(0xe8bd5f, 1);
    coin.fillCircle(this.panelWidth - 72, 30, 8);
    coin.fillStyle(0xfff0b3, 0.9);
    coin.fillCircle(this.panelWidth - 74, 27, 3.2);
    coin.lineStyle(1.4, 0x8f682c, 0.9);
    coin.strokeCircle(this.panelWidth - 72, 30, 8);
    this.root.add(coin);

    this.goldText = scene.add.text(this.panelWidth - 58, 30, '0', {
      fontFamily: RANCH_FONT_BODY,
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#f6d992'
    }).setOrigin(0, 0.5);
    this.root.add(this.goldText);

    const divider = scene.add.graphics();
    divider.lineStyle(1, 0xd3ac66, 0.28);
    divider.lineBetween(14, 52, this.panelWidth - 14, 52);
    divider.lineStyle(1, 0x0c0703, 0.75);
    divider.lineBetween(14, 53, this.panelWidth - 14, 53);
    this.root.add(divider);

    // Três cartões de resumo.
    const statLabels = ['CANTEIROS', 'ANIMAIS', 'ABRIGOS'];
    const statXs = [12, 106, 200];
    const statCard = scene.add.graphics();
    statXs.forEach((statX) => {
      statCard.fillStyle(0x1b1008, 0.88);
      statCard.fillRoundedRect(statX, 60, 88, 44, 7);
      statCard.lineStyle(1, 0xd3ac66, 0.22);
      statCard.strokeRoundedRect(statX, 60, 88, 44, 7);
    });
    this.root.add(statCard);

    statXs.forEach((statX, index) => {
      const label = scene.add.text(statX + 8, 66, statLabels[index] ?? '', {
        fontFamily: RANCH_FONT_BODY,
        fontSize: '7px',
        fontStyle: 'bold',
        color: '#b99f75',
        letterSpacing: 1
      });
      const value = scene.add.text(statX + 8, 81, '—', {
        fontFamily: RANCH_FONT_BODY,
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#f8ebc8'
      });
      this.root.add([label, value]);
      this.statValues.push(value);
    });

    const storageLabel = scene.add.text(16, 113, 'ARMAZÉM', {
      fontFamily: RANCH_FONT_BODY,
      fontSize: '7px',
      fontStyle: 'bold',
      color: '#d3ac66',
      letterSpacing: 1.7
    });
    this.root.add(storageLabel);

    const cropCard = scene.add.graphics();
    const cropIcons = ['🌽', '🌾', '🥕'];
    const cropXs = [12, 106, 200];
    cropXs.forEach((cropX) => {
      cropCard.fillStyle(0x1b1008, 0.78);
      cropCard.fillRoundedRect(cropX, 126, 88, 32, 6);
      cropCard.lineStyle(1, 0xd3ac66, 0.18);
      cropCard.strokeRoundedRect(cropX, 126, 88, 32, 6);
    });
    this.root.add(cropCard);

    cropXs.forEach((cropX, index) => {
      const icon = scene.add.text(cropX + 9, 142, cropIcons[index] ?? '•', {
        fontFamily: '"Segoe UI Emoji", "Apple Color Emoji", sans-serif',
        fontSize: '14px'
      }).setOrigin(0, 0.5);
      const value = scene.add.text(cropX + 34, 142, '0', {
        fontFamily: RANCH_FONT_BODY,
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#f8ebc8'
      }).setOrigin(0, 0.5);
      this.root.add([icon, value]);
      this.cropValues.push(value);
    });

    this.seedText = scene.add.text(16, 168, 'Sementes  ·  —', {
      fontFamily: RANCH_FONT_BODY,
      fontSize: '9px',
      color: '#c9b68e'
    });
    this.root.add(this.seedText);

    this.shopButton = createRanchButton(scene, {
      width: this.panelWidth - 24,
      height: 34,
      label: '🌾  Mercado do rancho',
      onClick: options.onOpenShop
    });
    this.shopButton.container.setPosition(this.panelWidth / 2, 212);
    this.root.add(this.shopButton.container);
  }

  update(farm: FarmState | null, gold: number): void {
    this.goldText.setText(formatGold(gold));

    if (!farm) {
      this.statValues.forEach((value) => value.setText('—'));
      this.cropValues.forEach((value) => value.setText('—'));
      this.seedText.setText('Sementes  ·  —');
      return;
    }

    const unlocked = farm.unlockedPlots ?? farm.plots.length;
    this.statValues[0]?.setText(`${unlocked}/30`);
    this.statValues[1]?.setText(`${farm.animals.length}`);
    this.statValues[2]?.setText(`${farm.buildings.length}/3`);

    const storage = farm.storage ?? {};
    this.cropValues[0]?.setText(`${storage['crop-corn'] ?? 0}`);
    this.cropValues[1]?.setText(`${storage['crop-wheat'] ?? 0}`);
    this.cropValues[2]?.setText(`${storage['crop-carrot'] ?? 0}`);

    const seeds = farm.seeds ?? {};
    this.seedText.setText(
      `Sementes   🌽 ${seeds.corn ?? 0}    🌾 ${seeds.wheat ?? 0}    🥕 ${seeds.carrot ?? 0}`
    );
  }

  layout(viewportWidth: number, viewportHeight: number, mobile: boolean): void {
    const scale = mobile ? (viewportWidth < 480 ? 0.66 : 0.74) : 1;
    this.rootScale = scale;
    this.root.setScale(scale);

    let x = viewportWidth - this.panelWidth * scale - 16;
    let y = mobile ? (viewportWidth < 480 ? 132 : 58) : 64;

    if (x < 10) x = 10;
    if (y + this.panelHeight * scale > viewportHeight - 62) {
      y = Math.max(10, viewportHeight - this.panelHeight * scale - 66);
    }

    this.rootX = x;
    this.rootY = y;
    this.root.setPosition(x, y);
  }

  contains(screenX: number, screenY: number): boolean {
    return (
      screenX >= this.rootX &&
      screenX <= this.rootX + this.panelWidth * this.rootScale &&
      screenY >= this.rootY &&
      screenY <= this.rootY + this.panelHeight * this.rootScale
    );
  }

  destroy(): void {
    this.shopButton.destroy();
    this.root.destroy(true);
  }

  get panelSize(): { width: number; height: number } {
    return { width: this.panelWidth, height: this.panelHeight };
  }

  get sceneRef(): Phaser.Scene {
    return this.scene;
  }
}
