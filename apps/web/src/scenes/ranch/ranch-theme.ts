import Phaser from 'phaser';

export const TILE_W = 96;
export const TILE_H = 48;

export const RANCH_FONT_DISPLAY = '"Cinzel", Georgia, "Times New Roman", serif';
export const RANCH_FONT_BODY = '"Trebuchet MS", "Segoe UI", sans-serif';

export interface Point {
  x: number;
  y: number;
}

export type IsoFn = (col: number, row: number) => Point;

export const RANCH = {
  grass: [0x7fae5c, 0x87b462, 0x8fbc69, 0x78a856] as const,
  grassDark: 0x5d8845,
  grassLight: 0xa7cd7c,
  meadow: 0x6d9a51,
  dirt: 0xc49a63,
  dirtLight: 0xd4ad78,
  dirtDark: 0x9c7647,
  wood: 0x8c5a32,
  woodDark: 0x5b3720,
  woodLight: 0xc08a52,
  cream: 0xf2e3c4,
  creamDark: 0xd8c49d,
  barnRed: 0xa94a36,
  barnRedDark: 0x7b3025,
  barnRedLight: 0xc35d46,
  roof: 0xb15b3d,
  roofDark: 0x7d3c2b,
  roofLight: 0xd17a56,
  stone: 0xa99b86,
  stoneDark: 0x7c7161,
  gold: 0xf0c56d,
  goldBright: 0xffe6a4,
  green: 0x8ec96b,
  water: 0x6fb9c4,
  waterLight: 0xb3e4e8,
  ink: 0x2a1a10,
  panel: 0x24180f,
  panelLight: 0x3a2818,
  panelBorder: 0xd3ac66
} as const;

export const RANK_COLORS: Record<string, number> = {
  white: 0xe6dfca,
  green: 0x82cf83,
  blue: 0x74b6ee,
  orange: 0xf2a45d,
  red: 0xe86a62
};

export function diamondPoints(x: number, y: number, width = TILE_W, height = TILE_H): Point[] {
  return [
    { x, y: y - height / 2 },
    { x: x + width / 2, y },
    { x, y: y + height / 2 },
    { x: x - width / 2, y }
  ];
}

export function fillDiamond(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  color: number,
  alpha = 1,
  width = TILE_W,
  height = TILE_H
): void {
  graphics.fillStyle(color, alpha);
  graphics.fillPoints(diamondPoints(x, y, width, height), true);
}

export function strokeDiamond(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  color: number,
  alpha = 1,
  lineWidth = 1,
  width = TILE_W,
  height = TILE_H
): void {
  graphics.lineStyle(lineWidth, color, alpha);
  graphics.strokePoints(diamondPoints(x, y, width, height), true);
}

export function hash2(col: number, row: number, salt = 0): number {
  const value = Math.sin(col * 127.1 + row * 311.7 + salt * 74.7) * 43758.5453;
  return value - Math.floor(value);
}

export function tileKey(col: number, row: number): string {
  return `${col}:${row}`;
}

export function addRoadLine(
  roads: Set<string>,
  fromCol: number,
  fromRow: number,
  toCol: number,
  toRow: number
): void {
  let col = fromCol;
  let row = fromRow;
  const dx = Math.abs(toCol - fromCol);
  const dy = Math.abs(toRow - fromRow);
  const sx = fromCol < toCol ? 1 : -1;
  const sy = fromRow < toRow ? 1 : -1;
  let error = dx - dy;
  for (;;) {
    roads.add(tileKey(col, row));
    if (col === toCol && row === toRow) break;
    const doubled = error * 2;
    if (doubled > -dy) {
      error -= dy;
      col += sx;
    }
    if (doubled < dx) {
      error += dx;
      row += sy;
    }
  }
}

export function createGround(
  scene: Phaser.Scene,
  iso: IsoFn,
  cols: number,
  rows: number,
  roads: Set<string>
): Phaser.GameObjects.Graphics {
  const graphics = scene.add.graphics();
  graphics.setDepth(0);

  // A campina continua para além do tabuleiro, sem uma borda em losango.
  // Grandes manchas de luz e sombra dão variação orgânica ao capim.
  graphics.fillStyle(0x83af5f, 1);
  graphics.fillRect(-2200, -1600, 4400, 3200);
  for (let i = 0; i < 120; i += 1) {
    const x = -1900 + hash2(i, 3) * 3800;
    const y = -1400 + hash2(i, 7) * 2800;
    const radius = 120 + hash2(i, 11) * 360;
    graphics.fillStyle(i % 3 === 0 ? 0x93bd6b : i % 3 === 1 ? 0x7ca858 : 0x88b463, 0.1);
    graphics.fillEllipse(x, y, radius * 2, radius * 0.85);
  }

  // Pinceladas quase invisíveis por tile, só para quebrar a repetição.
  // O contraste é baixo de propósito: nada de xadrez no capim.
  const margin = 5;
  for (let row = -margin; row < rows + margin; row += 1) {
    for (let col = -margin; col < cols + margin; col += 1) {
      const point = iso(col, row);
      const variation = hash2(col, row, 2);
      const color = variation > 0.66 ? 0x89b663 : variation > 0.33 ? 0x81ae5d : 0x7fac5b;
      fillDiamond(graphics, point.x, point.y, color, 0.16, TILE_W + 1, TILE_H + 1);
      if (variation > 0.9) {
        graphics.fillStyle(0xa5cc7b, 0.12);
        graphics.fillEllipse(point.x + 10, point.y - 2, 48, 17);
      }
    }
  }

  // Manchas de capim mais claro, trevo e terra pisada nas áreas de convivência.
  const patches: Array<[number, number, number, number, number]> = [
    [12, 9, 240, 98, 0xb2c47c],
    [12, 13, 290, 128, 0xc0b679],
    [7, 13, 310, 160, 0xacc078],
    [18, 10, 280, 138, 0xb8b176],
    [16, 16, 270, 128, 0xb8b176],
    [6, 6, 240, 116, 0xb8b176],
    [21, 8, 220, 100, 0xaebf78],
    [10, 18, 230, 110, 0xb7b376]
  ];
  for (const [col, row, width, height, color] of patches) {
    const point = iso(col, row);
    graphics.fillStyle(color, 0.14);
    graphics.fillEllipse(point.x, point.y, width, height);
  }

  // Trechos de pasto alto e tufos maiores que aparecem entre as construções.
  for (let i = 0; i < 42; i += 1) {
    const point = iso(-3 + hash2(i, 21) * (cols + 6), -3 + hash2(i, 23) * (rows + 6));
    const radius = 26 + hash2(i, 25) * 54;
    graphics.fillStyle(i % 2 === 0 ? 0x6e9b50 : 0x93bd6b, 0.12);
    graphics.fillEllipse(point.x, point.y, radius * 2.4, radius);
  }

  // Trilhas de terra: mais largas, curvas e com pedrinhas.
  const roadPoints = new Map<string, Point>();
  for (const key of roads) {
    const [colText, rowText] = key.split(':');
    const point = iso(Number(colText), Number(rowText));
    roadPoints.set(key, point);
    graphics.fillStyle(0x8b6a42, 0.35);
    fillDiamond(graphics, point.x, point.y + 2, 0x8b6a42, 0.3, TILE_W + 2, TILE_H + 2);
    const tone = hash2(Number(colText), Number(rowText), 7) > 0.5 ? RANCH.dirt : RANCH.dirtLight;
    fillDiamond(graphics, point.x, point.y, tone, 1, TILE_W + 1, TILE_H + 1);
    if (hash2(Number(colText), Number(rowText), 8) > 0.47) {
      graphics.fillStyle(0xa98252, 0.55);
      graphics.fillEllipse(point.x + (hash2(Number(colText), Number(rowText), 9) - 0.5) * 28, point.y + 2, 12, 4);
    }
  }

  // Rastros de rodas no caminho principal, sem poluir as laterais.
  for (const [key, point] of roadPoints) {
    const [colText, rowText] = key.split(':');
    const col = Number(colText);
    const row = Number(rowText);
    if (hash2(col, row, 12) > 0.88) {
      graphics.fillStyle(0x8b6740, 0.26);
      graphics.fillEllipse(point.x - 13, point.y + 1, 18, 4);
      graphics.fillEllipse(point.x + 13, point.y - 1, 18, 4);
    }
  }

  return graphics;
}

export function createMeadowDetails(
  scene: Phaser.Scene,
  iso: IsoFn,
  cols: number,
  rows: number,
  roads: Set<string>
): Phaser.GameObjects.Graphics {
  const graphics = scene.add.graphics();
  graphics.setDepth(2);

  const margin = 4;
  for (let index = 0; index < 1450; index += 1) {
    const col = Math.floor(hash2(index, 1, 3) * (cols + margin * 2)) - margin;
    const row = Math.floor(hash2(index, 2, 5) * (rows + margin * 2)) - margin;
    if (roads.has(tileKey(col, row))) continue;
    const point = iso(col, row);
    const x = point.x + (hash2(index, 3, 4) - 0.5) * 80;
    const y = point.y + (hash2(index, 4, 6) - 0.5) * 36;
    const kind = hash2(index, 5, 8);
    if (kind > 0.9) {
      // Pequeno canteiro selvagem de flores.
      const petals = [0xf2d36a, 0xe9a9b8, 0xf4eee0, 0xb8a8de, 0xe98f60];
      const color = petals[index % petals.length] ?? 0xf2d36a;
      for (let flower = 0; flower < 3; flower += 1) {
        const fx = x + (flower - 1) * 7;
        const fy = y - (flower % 2) * 4;
        graphics.lineStyle(1, 0x4f7d3d, 0.75);
        graphics.lineBetween(fx, fy, fx, fy - 6);
        graphics.fillStyle(color, 0.95);
        graphics.fillCircle(fx - 2.5, fy - 7, 2.2);
        graphics.fillCircle(fx + 2.5, fy - 7, 2.2);
        graphics.fillCircle(fx, fy - 9, 2.2);
        graphics.fillStyle(0xe8bd59, 1);
        graphics.fillCircle(fx, fy - 7, 1.3);
      }
    } else if (kind > 0.76) {
      // tufo de capim
      graphics.lineStyle(1.4, index % 2 === 0 ? 0x5f8d45 : 0x88b45e, 0.8);
      graphics.lineBetween(x, y, x - 4, y - 6);
      graphics.lineBetween(x + 1, y, x + 1, y - 7);
      graphics.lineBetween(x + 2, y, x + 5, y - 5);
      if (kind > 0.84) {
        graphics.lineStyle(1.1, 0x9bc06d, 0.7);
        graphics.lineBetween(x - 2, y, x - 6, y - 4);
        graphics.lineBetween(x + 3, y, x + 7, y - 4);
      }
    } else if (kind > 0.7) {
      // pedra
      graphics.fillStyle(0x9c9a80, 0.9);
      graphics.fillEllipse(x, y, 10, 4.5);
      graphics.fillStyle(0xbdb99d, 0.8);
      graphics.fillEllipse(x - 1.5, y - 1.5, 5, 2.4);
    } else if (kind > 0.64) {
      // trevo
      graphics.fillStyle(0x5f9147, 0.75);
      graphics.fillCircle(x - 2.5, y - 2, 2);
      graphics.fillCircle(x + 2.5, y - 2, 2);
      graphics.fillCircle(x, y - 4.4, 2);
    }
  }

  // Margens com arbustos: escondem o fim do terreno de forma orgânica.
  const shrubs: Array<[number, number, number]> = [
    [1, 1, 1.1], [2, 3, 0.85], [4, 2, 0.95], [23, 2, 1.05], [24, 5, 0.8],
    [1, 12, 0.9], [2, 16, 1.0], [4, 19, 0.85], [22, 19, 1.0], [23, 15, 0.9],
    [20, 21, 0.85], [8, 20, 0.9], [14, 1, 0.8], [10, 1, 0.9]
  ];
  for (const [col, row, scale] of shrubs) {
    const point = iso(col, row);
    drawShrub(graphics, point.x, point.y, scale, col + row);
  }

  return graphics;
}

function drawShrub(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  scale: number,
  seed: number
): void {
  graphics.fillStyle(0x3d5e31, 0.22);
  graphics.fillEllipse(x + 3, y + 4, 44 * scale, 15 * scale);
  graphics.fillStyle(0x466f36, 1);
  graphics.fillCircle(x - 10 * scale, y - 5 * scale, 12 * scale);
  graphics.fillCircle(x + 8 * scale, y - 6 * scale, 13 * scale);
  graphics.fillCircle(x, y - 12 * scale, 11 * scale);
  graphics.fillStyle(seed % 2 === 0 ? 0x5d9146 : 0x6da052, 1);
  graphics.fillCircle(x - 6 * scale, y - 12 * scale, 8 * scale);
  graphics.fillCircle(x + 9 * scale, y - 10 * scale, 7 * scale);
  graphics.fillStyle(0x8fbe66, 0.7);
  graphics.fillCircle(x - 3 * scale, y - 16 * scale, 4 * scale);
}

export function createTree(
  scene: Phaser.Scene,
  x: number,
  y: number,
  variant: 'oak' | 'fruit' | 'pine',
  scale = 1
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y).setScale(scale);
  const shadow = scene.add.graphics();
  shadow.fillStyle(0x263d1e, 0.24);
  shadow.fillEllipse(4, 5, variant === 'pine' ? 54 : 74, 20);

  const trunk = scene.add.graphics();
  const canopy = scene.add.container(0, 0);
  const crown = scene.add.graphics();
  canopy.add(crown);

  if (variant === 'pine') {
    trunk.fillStyle(0x5d3c26, 1);
    trunk.fillRoundedRect(-5, -20, 10, 29, 3);
    trunk.fillStyle(0x835630, 1);
    trunk.fillRect(-3, -18, 3, 25);
    const layers = [
      { y: -24, w: 40, color: 0x2f6040 },
      { y: -43, w: 32, color: 0x397049 },
      { y: -60, w: 23, color: 0x457f52 }
    ];
    for (const layer of layers) {
      crown.fillStyle(layer.color, 1);
      crown.fillTriangle(-layer.w, layer.y + 18, 0, layer.y, layer.w, layer.y + 18);
      crown.fillStyle(0x5e9960, 0.45);
      crown.fillTriangle(-layer.w * 0.42, layer.y + 14, 0, layer.y + 2, layer.w * 0.3, layer.y + 16);
    }
  } else {
    trunk.fillStyle(0x62402a, 1);
    trunk.fillRoundedRect(-6, -22, 12, 31, 4);
    trunk.fillStyle(0x8a5d37, 1);
    trunk.fillRect(-4, -20, 4, 26);
    trunk.lineStyle(3, 0x5b3a25, 1);
    trunk.lineBetween(0, -18, -12, -29);
    trunk.lineBetween(2, -20, 12, -34);

    const fruit = variant === 'fruit';
    const baseColor = fruit ? 0x3d7339 : 0x356c3b;
    const midColor = fruit ? 0x568c44 : 0x4a8448;
    const lightColor = fruit ? 0x78aa58 : 0x69a05a;
    crown.fillStyle(baseColor, 1);
    crown.fillCircle(0, -41, 27);
    crown.fillCircle(-20, -31, 21);
    crown.fillCircle(20, -33, 22);
    crown.fillCircle(-9, -57, 18);
    crown.fillCircle(13, -56, 17);
    crown.fillStyle(midColor, 1);
    crown.fillCircle(-14, -44, 19);
    crown.fillCircle(16, -44, 18);
    crown.fillCircle(0, -60, 16);
    crown.fillStyle(lightColor, 0.9);
    crown.fillCircle(-13, -58, 10);
    crown.fillCircle(9, -66, 8);
    crown.fillCircle(22, -48, 7);
    crown.fillStyle(0x2c592f, 0.4);
    crown.fillCircle(-24, -38, 9);
    crown.fillCircle(24, -38, 8);

    if (fruit) {
      for (let index = 0; index < 7; index += 1) {
        const angle = (index / 7) * Math.PI * 2;
        const radius = 16 + (index % 3) * 7;
        crown.fillStyle(index % 2 === 0 ? 0xd8644d : 0xef9b45, 1);
        crown.fillCircle(Math.cos(angle) * radius, -43 + Math.sin(angle) * radius * 0.55, 3.4);
        crown.fillStyle(0xffd9a0, 0.65);
        crown.fillCircle(Math.cos(angle) * radius - 1, -44 + Math.sin(angle) * radius * 0.55, 1);
      }
    }
  }

  container.add([shadow, trunk, canopy]);
  scene.tweens.add({
    targets: canopy,
    angle: { from: -1.1, to: 1.1 },
    duration: 2600 + Math.random() * 1200,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
    delay: Math.random() * 900
  });

  return container;
}

export function createFenceLine(
  scene: Phaser.Scene,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  options: {
    color?: number;
    light?: number;
    height?: number;
    spacing?: number;
    picket?: boolean;
    alpha?: number;
  } = {}
): Phaser.GameObjects.Graphics {
  const color = options.color ?? RANCH.wood;
  const light = options.light ?? RANCH.woodLight;
  const height = options.height ?? 22;
  const spacing = options.spacing ?? 26;
  const alpha = options.alpha ?? 1;
  const graphics = scene.add.graphics();

  const distance = Phaser.Math.Distance.Between(ax, ay, bx, by);
  const count = Math.max(2, Math.round(distance / spacing));
  const dx = (bx - ax) / count;
  const dy = (by - ay) / count;

  graphics.fillStyle(0x31451f, 0.16 * alpha);
  graphics.fillEllipse((ax + bx) / 2, (ay + by) / 2 + 3, distance, 8);

  if (options.picket) {
    for (let index = 0; index <= count; index += 1) {
      const x = ax + dx * index;
      const y = ay + dy * index;
      const picketHeight = height + 5;
      graphics.fillStyle(color, alpha);
      graphics.fillRoundedRect(x - 1.8, y - picketHeight, 3.6, picketHeight, 1);
      graphics.fillStyle(light, alpha);
      graphics.fillTriangle(x - 1.8, y - picketHeight, x + 1.8, y - picketHeight, x, y - picketHeight - 5);
    }
    graphics.lineStyle(2.2, color, alpha);
    graphics.lineBetween(ax, ay - height * 0.45, bx, by - height * 0.45);
    graphics.lineStyle(1.2, light, alpha * 0.8);
    graphics.lineBetween(ax, ay - height * 0.45 - 1, bx, by - height * 0.45 - 1);
    return graphics;
  }

  for (let index = 0; index <= count; index += 1) {
    const x = ax + dx * index;
    const y = ay + dy * index;
    graphics.fillStyle(RANCH.woodDark, alpha);
    graphics.fillRoundedRect(x - 3, y - height, 6, height + 2, 1.5);
    graphics.fillStyle(color, alpha);
    graphics.fillRoundedRect(x - 2.2, y - height + 1, 4.4, height, 1.5);
    graphics.fillStyle(light, alpha);
    graphics.fillRect(x - 1.5, y - height + 2, 1.5, height - 3);
    graphics.fillStyle(light, alpha);
    graphics.fillCircle(x, y - height - 1, 2.4);
  }

  graphics.lineStyle(3.2, RANCH.woodDark, alpha);
  graphics.lineBetween(ax, ay - height * 0.78, bx, by - height * 0.78);
  graphics.lineBetween(ax, ay - height * 0.4, bx, by - height * 0.4);
  graphics.lineStyle(2, color, alpha);
  graphics.lineBetween(ax, ay - height * 0.78 - 1, bx, by - height * 0.78 - 1);
  graphics.lineBetween(ax, ay - height * 0.4 - 1, bx, by - height * 0.4 - 1);
  graphics.lineStyle(1, light, alpha * 0.8);
  graphics.lineBetween(ax, ay - height * 0.78 - 2, bx, by - height * 0.78 - 2);
  graphics.lineBetween(ax, ay - height * 0.4 - 2, bx, by - height * 0.4 - 2);

  return graphics;
}

export function createFarmhouse(
  scene: Phaser.Scene,
  x: number,
  y: number,
  ownerName: string
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const shadow = scene.add.graphics();
  shadow.fillStyle(0x2b3d1f, 0.26);
  shadow.fillEllipse(5, 16, 250, 58);

  const g = scene.add.graphics();
  // Fundação de pedra
  g.fillStyle(0x776b5c, 1);
  g.fillRoundedRect(-108, -18, 216, 28, 5);
  g.fillStyle(RANCH.stone, 1);
  g.fillRoundedRect(-104, -20, 208, 22, 4);
  for (let index = 0; index < 8; index += 1) {
    g.fillStyle(index % 2 === 0 ? 0xbbb09c : 0xa99b86, 0.85);
    g.fillRoundedRect(-96 + index * 24, -18 + (index % 2) * 4, 19, 8, 2);
  }

  // Corpo da casa
  g.fillStyle(0xcfbd97, 1);
  g.fillRoundedRect(-96, -112, 192, 96, 4);
  g.fillStyle(RANCH.cream, 1);
  g.fillRoundedRect(-92, -114, 184, 94, 3);
  g.fillStyle(0xfbf0d6, 0.55);
  g.fillRect(-84, -108, 168, 18);
  g.lineStyle(2, 0xcdbb97, 0.8);
  for (let index = 0; index < 7; index += 1) g.lineBetween(-88, -88 + index * 11, 88, -88 + index * 11);

  // Vigas de madeira
  g.fillStyle(RANCH.woodDark, 1);
  for (const beamX of [-92, -46, 46, 92]) g.fillRect(beamX - 3, -114, 6, 94);
  g.fillRect(-92, -114, 184, 5);
  g.fillRect(-92, -25, 184, 5);
  g.fillStyle(RANCH.wood, 1);
  for (const beamX of [-92, -46, 46, 92]) g.fillRect(beamX - 2, -112, 3, 88);

  // Telhado de telhas terracota
  g.fillStyle(RANCH.roofDark, 1);
  g.fillTriangle(-122, -108, 0, -196, 122, -108);
  g.fillStyle(RANCH.roof, 1);
  g.fillTriangle(-116, -110, 0, -190, 116, -110);
  g.fillStyle(RANCH.roofLight, 1);
  g.fillTriangle(-108, -112, 0, -184, 108, -112);
  g.lineStyle(1.4, 0xa34b34, 0.8);
  for (let row = 0; row < 6; row += 1) {
    const inset = row * 9;
    g.lineBetween(-108 + inset, -112 - row * 12, 108 - inset, -112 - row * 12);
  }
  g.lineStyle(3, 0x8f402c, 1);
  g.lineBetween(0, -190, 0, -110);
  g.fillStyle(0xe5c28f, 0.9);
  g.fillTriangle(-122, -108, -114, -110, -116, -101);
  g.fillTriangle(122, -108, 114, -110, 116, -101);
  g.fillStyle(0x7d3c2b, 1);
  g.fillRect(-122, -110, 244, 5);

  // Sótão
  g.fillStyle(0x6b4529, 1);
  g.fillCircle(0, -136, 15);
  g.fillStyle(0xf6d47f, 1);
  g.fillCircle(0, -136, 11);
  g.fillStyle(0x8a5a32, 1);
  g.fillRect(-1, -146, 2, 20);
  g.fillRect(-10, -137, 20, 2);

  // Chaminé e fumaça
  g.fillStyle(0x7b6b5b, 1);
  g.fillRect(52, -160, 24, 40);
  g.fillStyle(0x9a8874, 1);
  g.fillRect(54, -158, 20, 34);
  g.fillStyle(0x6d5d4f, 1);
  g.fillRect(49, -164, 30, 9);
  g.fillStyle(0x877462, 1);
  for (let brick = 0; brick < 4; brick += 1) g.fillRect(55, -154 + brick * 8, 18, 1.3);

  // Varanda
  g.fillStyle(0x6e4a2e, 1);
  g.fillRoundedRect(-110, -17, 220, 18, 4);
  g.fillStyle(0xa97645, 1);
  g.fillRoundedRect(-108, -19, 216, 13, 3);
  g.fillStyle(0xc18b57, 1);
  g.fillRect(-104, -17, 208, 3);
  g.fillStyle(0x8b5b34, 1);
  g.fillRect(-106, 1, 212, 8);
  g.fillStyle(0x6b4529, 1);
  for (let plank = 0; plank < 10; plank += 1) g.lineBetween(-100 + plank * 22, -17, -100 + plank * 22, -4);
  g.fillStyle(0x87633e, 1);
  g.fillRect(-34, 7, 68, 12);
  g.fillStyle(0xa47a4d, 1);
  g.fillRect(-32, 5, 64, 5);
  g.fillStyle(0x5f3c24, 1);
  g.fillRect(-34, 18, 68, 4);

  // Telhado da varanda
  g.fillStyle(0x7a3a2a, 1);
  g.fillTriangle(-116, -74, 0, -98, 116, -74);
  g.fillStyle(0xa8533a, 1);
  g.fillTriangle(-110, -76, 0, -94, 110, -76);
  g.fillStyle(0xcf7b57, 0.9);
  g.fillTriangle(-100, -78, 0, -91, 100, -78);
  g.lineStyle(1.2, 0x8e422f, 0.7);
  for (let row = 0; row < 3; row += 1) g.lineBetween(-104 + row * 5, -84 - row * 4, 104 - row * 5, -84 - row * 4);

  // Pilares e guarda-corpo
  g.fillStyle(RANCH.woodDark, 1);
  for (const postX of [-102, -55, 55, 102]) {
    g.fillRect(postX - 3, -76, 6, 72);
    g.fillStyle(RANCH.wood, 1);
    g.fillRect(postX - 2, -74, 3, 68);
    g.fillStyle(RANCH.woodDark, 1);
  }
  g.lineStyle(3, RANCH.wood, 1);
  g.lineBetween(-102, -28, -64, -28);
  g.lineBetween(64, -28, 102, -28);
  g.lineStyle(1.4, 0xd3a875, 0.8);
  g.lineBetween(-102, -30, -64, -30);
  g.lineBetween(64, -30, 102, -30);
  for (const railX of [-88, -76, 76, 88]) {
    g.fillStyle(RANCH.woodDark, 1);
    g.fillRect(railX - 1.4, -30, 2.8, 16);
  }

  // Porta
  g.fillStyle(0x4e2e1b, 1);
  g.fillRoundedRect(-23, -65, 46, 56, 4);
  g.fillStyle(0x7a4c2d, 1);
  g.fillRoundedRect(-19, -61, 38, 52, 3);
  g.fillStyle(0x5e3923, 1);
  g.fillRect(-1, -61, 2, 52);
  g.fillStyle(0x3e2416, 1);
  g.fillRect(-15, -52, 11, 18);
  g.fillRect(4, -52, 11, 18);
  g.fillStyle(0xe4bc6a, 1);
  g.fillCircle(10, -33, 2.5);
  g.fillStyle(0x9b6d3d, 1);
  g.fillRect(-26, -12, 52, 4);
  g.fillStyle(0xf0d097, 0.9);
  g.fillRect(-24, -14, 48, 2);

  // Janelas com luz quente
  for (const side of [-1, 1]) {
    const windowX = side * 63;
    g.fillStyle(0x5b3922, 1);
    g.fillRoundedRect(windowX - 18, -90, 36, 32, 3);
    g.fillStyle(0xf5d287, 1);
    g.fillRoundedRect(windowX - 15, -87, 30, 26, 2);
    g.fillStyle(0xffedb4, 0.55);
    g.fillRoundedRect(windowX - 12, -84, 24, 12, 2);
    g.fillStyle(0x6d4226, 1);
    g.fillRect(windowX - 1, -87, 2, 26);
    g.fillRect(windowX - 15, -75, 30, 2);
    g.fillStyle(0x4b2e1b, 1);
    for (const shutter of [-24, 20]) g.fillRoundedRect(windowX + shutter, -89, 5, 29, 1.5);
    // Caixa de flores
    g.fillStyle(0x674026, 1);
    g.fillRoundedRect(windowX - 19, -57, 38, 9, 2);
    g.fillStyle(0x8c5a31, 1);
    g.fillRect(windowX - 18, -57, 36, 3);
    for (let flower = 0; flower < 5; flower += 1) {
      const fx = windowX - 14 + flower * 7;
      g.fillStyle(0x4e7d3b, 1);
      g.fillCircle(fx, -60, 3);
      g.fillStyle(flower % 2 === 0 ? 0xe56c5d : 0xf0c95d, 1);
      g.fillCircle(fx, -62, 2.2);
    }
  }

  // Lanterna da varanda
  g.lineStyle(1.5, 0x3d2a1a, 1);
  g.lineBetween(84, -74, 84, -62);
  g.fillStyle(0x4b3320, 1);
  g.fillRoundedRect(79, -63, 10, 14, 2);
  g.fillStyle(0xffd77c, 1);
  g.fillRoundedRect(81, -61, 6, 10, 1);
  const glow = scene.add.ellipse(84, -55, 52, 38, 0xffd77c, 0.12);

  // Cadeira de balanço e vasos
  g.fillStyle(0x6f472a, 1);
  g.fillRoundedRect(54, -17, 33, 5, 2);
  g.fillRect(55, -12, 3, 12);
  g.fillRect(82, -12, 3, 12);
  g.lineStyle(3, 0x8c5a32, 1);
  g.lineBetween(55, -17, 58, -34);
  g.lineBetween(83, -17, 80, -34);
  g.lineBetween(58, -34, 80, -34);
  g.fillStyle(0xb75545, 1);
  g.fillRoundedRect(60, -31, 19, 10, 3);
  g.fillStyle(0x9d6d3c, 1);
  g.fillRoundedRect(-102, -20, 16, 13, 2);
  g.fillRoundedRect(-84, -20, 12, 9, 2);
  g.fillStyle(0x4f7d3b, 1);
  g.fillCircle(-94, -24, 5);
  g.fillCircle(-72, -23, 4);
  g.fillStyle(0xe7b95b, 1);
  g.fillCircle(-94, -27, 2);

  // Placa com o nome do rancho
  g.fillStyle(0x5a3920, 1);
  g.fillRoundedRect(-49, -108, 98, 18, 4);
  g.fillStyle(0x8b5c32, 1);
  g.fillRoundedRect(-47, -107, 94, 14, 3);
  g.lineStyle(1, 0xd9b979, 0.8);
  g.strokeRoundedRect(-45, -105, 90, 10, 2);

  const nameText = scene.add.text(0, -100, ownerName.toUpperCase(), {
    fontFamily: RANCH_FONT_DISPLAY,
    fontSize: '8px',
    color: '#ffe7b0',
    letterSpacing: 1.4
  }).setOrigin(0.5);

  // Cachorro deitado na varanda.
  const dog = scene.add.container(-74, -12);
  const dogGraphics = scene.add.graphics();
  dogGraphics.fillStyle(0x9d6639, 1);
  dogGraphics.fillEllipse(0, 0, 30, 15);
  dogGraphics.fillCircle(-13, -3, 8);
  dogGraphics.fillStyle(0x7a4a28, 1);
  dogGraphics.fillEllipse(-19, -7, 7, 4);
  dogGraphics.fillCircle(-20, -3, 4);
  dogGraphics.fillStyle(0x3f291b, 1);
  dogGraphics.fillCircle(-22, -4, 1.2);
  dogGraphics.fillStyle(0xd8a36d, 1);
  dogGraphics.fillEllipse(-8, 3, 10, 4);
  const dogTail = scene.add.graphics();
  dogTail.fillStyle(0x8c5930, 1);
  dogTail.fillTriangle(13, -2, 24, -10, 17, 2);
  dog.add([dogGraphics, dogTail]);
  scene.tweens.add({
    targets: dogTail,
    angle: { from: -16, to: 14 },
    duration: 420,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
  });
  scene.tweens.add({
    targets: dog,
    y: { from: -12, to: -11 },
    duration: 1600,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
  });

  container.add([shadow, g, glow, nameText, dog]);

  // Fumaça da chaminé: puffs suaves em ciclo.
  for (let index = 0; index < 4; index += 1) {
    const puff = scene.add.circle(64, -166, 6, 0xe9e2d2, 0.24);
    puff.setScale(0.6 + index * 0.12);
    container.add(puff);
    scene.tweens.add({
      targets: puff,
      y: -224 - index * 8,
      x: 70 + index * 9,
      scale: 1.8 + index * 0.12,
      alpha: 0,
      duration: 3400,
      delay: index * 900,
      repeat: -1,
      ease: 'Sine.easeOut'
    });
  }

  return container;
}

export function createBarn(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const shadow = scene.add.graphics();
  shadow.fillStyle(0x2f421f, 0.28);
  shadow.fillEllipse(8, 10, 310, 70);

  const g = scene.add.graphics();
  // Silo de grãos
  g.fillStyle(0x8d7f6d, 1);
  g.fillRoundedRect(94, -142, 64, 152, 18);
  g.fillStyle(0xb3a38d, 1);
  g.fillRoundedRect(99, -138, 54, 144, 15);
  g.fillStyle(0xc8bca6, 0.8);
  g.fillRoundedRect(104, -134, 18, 136, 8);
  g.fillStyle(0x7d7263, 1);
  g.fillRoundedRect(93, -92, 66, 9, 4);
  g.fillRoundedRect(93, -40, 66, 9, 4);
  g.fillStyle(0x8f8575, 1);
  g.fillEllipse(126, -140, 60, 20);
  g.fillStyle(0xb6aa94, 1);
  g.beginPath();
  g.arc(126, -142, 30, Math.PI, 0);
  g.closePath();
  g.fillPath();
  g.fillStyle(0xd7ccb7, 0.7);
  g.beginPath();
  g.arc(126, -144, 22, Math.PI * 1.08, Math.PI * 1.8);
  g.strokePath();
  g.lineStyle(2, 0x6d6254, 1);
  g.strokeEllipse(126, -140, 60, 20);

  // Celeiro vermelho
  g.fillStyle(0x6e2d22, 1);
  g.fillRoundedRect(-108, -128, 224, 134, 5);
  g.fillStyle(RANCH.barnRed, 1);
  g.fillRoundedRect(-104, -126, 216, 128, 4);
  g.fillStyle(0x933d2e, 1);
  g.fillRect(-104, -126, 216, 8);
  g.fillStyle(0xc06148, 0.35);
  for (let plank = 0; plank < 13; plank += 1) g.fillRect(-100 + plank * 16.5, -118, 2, 112);
  g.fillStyle(0x6e2d22, 1);
  g.fillRect(-106, -14, 220, 12);
  g.fillRect(-108, -132, 224, 8);

  // Telhado gambrel
  g.fillStyle(0x5a2720, 1);
  g.beginPath();
  g.moveTo(-124, -126);
  g.lineTo(-84, -176);
  g.lineTo(0, -202);
  g.lineTo(84, -176);
  g.lineTo(124, -126);
  g.closePath();
  g.fillPath();
  g.fillStyle(0x7b3126, 1);
  g.beginPath();
  g.moveTo(-116, -129);
  g.lineTo(-78, -173);
  g.lineTo(0, -196);
  g.lineTo(78, -173);
  g.lineTo(116, -129);
  g.closePath();
  g.fillPath();
  g.fillStyle(0x95402f, 1);
  g.beginPath();
  g.moveTo(-104, -132);
  g.lineTo(-72, -168);
  g.lineTo(0, -188);
  g.lineTo(72, -168);
  g.lineTo(104, -132);
  g.closePath();
  g.fillPath();
  g.lineStyle(1.2, 0x63271e, 0.7);
  for (let row = 1; row < 7; row += 1) {
    g.lineBetween(-108 + row * 4, -132 - row * 8, 108 - row * 4, -132 - row * 8);
  }
  g.lineStyle(3, 0xefe3c5, 1);
  g.lineBetween(-124, -126, 124, -126);
  g.lineStyle(1.4, 0xc9b893, 0.9);
  g.lineBetween(-120, -128, 120, -128);
  g.fillStyle(0xefe3c5, 1);
  for (const side of [-1, 1]) {
    g.beginPath();
    g.moveTo(side * 124, -126);
    g.lineTo(side * 84, -176);
    g.lineTo(side * 72, -170);
    g.lineTo(side * 112, -123);
    g.closePath();
    g.fillPath();
  }

  // Porta grande e detalhes brancos
  g.fillStyle(0x55241c, 1);
  g.fillRoundedRect(-54, -105, 108, 99, 3);
  g.fillStyle(0x773027, 1);
  g.fillRoundedRect(-50, -101, 100, 95, 2);
  g.fillStyle(0x8f3d31, 1);
  g.fillRect(-48, -99, 46, 91);
  g.fillRect(2, -99, 46, 91);
  g.lineStyle(3, 0xefe3c5, 1);
  g.lineBetween(0, -101, 0, -6);
  g.lineBetween(-50, -55, 50, -55);
  g.lineStyle(5, 0xefe3c5, 1);
  g.strokeRect(-50, -101, 100, 95);
  g.lineStyle(3, 0xefe3c5, 1);
  g.lineBetween(-48, -99, 48, -4);
  g.lineBetween(48, -99, -48, -4);
  g.fillStyle(0xd7b26b, 1);
  g.fillCircle(-8, -54, 3);
  g.fillCircle(8, -54, 3);

  // Sótão com feno e corda
  g.fillStyle(0x4a211a, 1);
  g.fillRect(-30, -172, 60, 38);
  g.fillStyle(0xcba059, 1);
  g.fillRect(-26, -168, 52, 30);
  g.fillStyle(0xe0b86e, 1);
  for (let straw = 0; straw < 12; straw += 1) {
    g.fillRect(-26 + straw * 4.5, -168 + (straw % 3) * 8, 2, 12);
  }
  g.lineStyle(2, 0x5b3320, 1);
  g.lineBetween(0, -172, 0, -196);
  g.lineStyle(5, 0xefe3c5, 1);
  g.lineBetween(-33, -172, 33, -172);

  // Janelinhas quentes e treliça
  for (const side of [-1, 1]) {
    const wx = side * 77;
    g.fillStyle(0x4d241d, 1);
    g.fillRoundedRect(wx - 12, -114, 24, 25, 2);
    g.fillStyle(0xf3cd7f, 1);
    g.fillRoundedRect(wx - 9, -111, 18, 19, 2);
    g.fillStyle(0x66372a, 1);
    g.fillRect(wx - 1, -111, 2, 19);
    g.fillRect(wx - 9, -102, 18, 2);
  }

  // Lanterna, fardos e caixotes
  g.lineStyle(1.2, 0x3f2a19, 1);
  g.lineBetween(-90, -98, -90, -86);
  g.fillStyle(0x3f2a19, 1);
  g.fillRoundedRect(-95, -88, 10, 14, 2);
  g.fillStyle(0xffd77f, 1);
  g.fillRoundedRect(-93, -86, 6, 10, 1);
  const glow = scene.add.ellipse(-90, -78, 56, 40, 0xffd77f, 0.13);

  container.add([shadow, g, glow]);

  // Fardos de feno ao lado
  const hay = scene.add.graphics();
  drawHayBale(hay, -136, 2, 1);
  drawHayBale(hay, 152, 8, 0.85);
  drawCrate(hay, -122, 19, 0.8);
  container.add(hay);

  // Catavento sobre o celeiro
  const vane = scene.add.container(0, -210);
  const vaneGraphics = scene.add.graphics();
  vaneGraphics.lineStyle(2, 0xd6c9a8, 1);
  vaneGraphics.lineBetween(0, 16, 0, -10);
  vaneGraphics.fillStyle(0xd6c9a8, 1);
  vaneGraphics.fillCircle(0, -12, 3);
  vaneGraphics.fillTriangle(-15, -10, 2, -16, 2, -4);
  vaneGraphics.fillTriangle(15, -10, 4, -14, 4, -2);
  vane.add(vaneGraphics);
  scene.tweens.add({
    targets: vane,
    angle: { from: -9, to: 9 },
    duration: 2400,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
  });
  container.add(vane);

  return container;
}

export function createWindmill(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const shadow = scene.add.graphics();
  shadow.fillStyle(0x2b3d1f, 0.22);
  shadow.fillEllipse(4, 7, 128, 32);

  const g = scene.add.graphics();
  // colina
  g.fillStyle(0x6f9a4f, 1);
  g.fillEllipse(0, 5, 128, 48);
  g.fillStyle(0x7eaa59, 1);
  g.fillEllipse(-8, 1, 100, 34);
  // base e torre
  g.fillStyle(0x8b6a4a, 1);
  g.fillRoundedRect(-31, -88, 62, 92, 4);
  g.fillStyle(0xa77b50, 1);
  g.beginPath();
  g.moveTo(-25, -86);
  g.lineTo(25, -86);
  g.lineTo(30, 0);
  g.lineTo(-30, 0);
  g.closePath();
  g.fillPath();
  g.fillStyle(0xc28f5e, 0.85);
  g.beginPath();
  g.moveTo(-20, -84);
  g.lineTo(-4, -84);
  g.lineTo(-10, 0);
  g.lineTo(-25, 0);
  g.closePath();
  g.fillPath();
  g.lineStyle(1.2, 0x7d5533, 0.7);
  for (let plank = 1; plank < 7; plank += 1) g.lineBetween(-24 + plank * 2, -82 + plank * 12, 24 - plank * 2, -82 + plank * 12);
  g.fillStyle(0x5e3d25, 1);
  g.fillRoundedRect(-38, -6, 76, 9, 3);
  // plataforma e teto do moinho
  g.fillStyle(0x5f3d24, 1);
  g.fillRoundedRect(-38, -96, 76, 12, 4);
  g.fillStyle(0x8d5e36, 1);
  g.fillRoundedRect(-36, -98, 72, 8, 3);
  g.fillStyle(0x7d3c2b, 1);
  g.fillTriangle(-40, -96, 0, -130, 40, -96);
  g.fillStyle(0xa64e35, 1);
  g.fillTriangle(-34, -98, 0, -126, 34, -98);
  g.fillStyle(0xcf7b57, 0.8);
  g.fillTriangle(-24, -100, 0, -122, 24, -100);
  // janela e porta
  g.fillStyle(0x4b2d1b, 1);
  g.fillRoundedRect(-9, -66, 18, 20, 2);
  g.fillStyle(0xf2cd7d, 1);
  g.fillRoundedRect(-6, -63, 12, 14, 1);
  g.fillStyle(0x4b2d1b, 1);
  g.fillRoundedRect(-10, -24, 20, 26, 2);
  g.fillStyle(0x7a4b2b, 1);
  g.fillRoundedRect(-7, -21, 14, 23, 1);

  // pás giratórias
  const blades = scene.add.container(0, -90);
  const bladeGraphics = scene.add.graphics();
  bladeGraphics.fillStyle(0x6a4428, 1);
  bladeGraphics.fillCircle(0, 0, 7);
  bladeGraphics.fillStyle(0xd6bf92, 1);
  bladeGraphics.fillCircle(0, 0, 4);
  for (let blade = 0; blade < 4; blade += 1) {
    const angle = (blade * Math.PI) / 2;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    bladeGraphics.lineStyle(3, 0x5a3820, 1);
    bladeGraphics.lineBetween(dx * 10, dy * 10, dx * 54, dy * 54);
    bladeGraphics.lineStyle(2, 0xb08552, 1);
    for (let step = 2; step <= 5; step += 1) {
      const px = dx * step * 9;
      const py = dy * step * 9;
      bladeGraphics.lineBetween(px - dy * 8, py + dx * 8, px + dx * 4, py + dy * 4);
      bladeGraphics.lineBetween(px + dy * 8, py - dx * 8, px + dx * 4, py + dy * 4);
    }
  }
  blades.add(bladeGraphics);
  scene.tweens.add({ targets: blades, angle: 360, duration: 16000, repeat: -1, ease: 'Linear' });

  container.add([shadow, g, blades]);
  return container;
}

export function createWell(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const g = scene.add.graphics();
  g.fillStyle(0x304320, 0.24);
  g.fillEllipse(2, 4, 104, 30);
  // base de pedra em perspectiva
  g.fillStyle(0x6f6558, 1);
  g.fillEllipse(0, 0, 94, 38);
  g.fillStyle(0x9e927e, 1);
  g.fillEllipse(0, -4, 88, 34);
  g.fillStyle(0x7d7160, 1);
  g.fillEllipse(0, -8, 68, 24);
  g.fillStyle(0x4a6f6b, 1);
  g.fillEllipse(0, -10, 56, 18);
  g.fillStyle(0x7ec1c1, 0.8);
  g.fillEllipse(-5, -12, 38, 9);
  g.fillStyle(0xc3e9e4, 0.5);
  g.fillEllipse(-12, -14, 14, 3);
  // pedras
  for (let stone = 0; stone < 8; stone += 1) {
    const angle = (stone / 8) * Math.PI * 2;
    g.fillStyle(stone % 2 === 0 ? 0xaea18a : 0x918673, 1);
    g.fillEllipse(Math.cos(angle) * 37, -5 + Math.sin(angle) * 15, 19, 9);
  }
  // postes e telhado
  g.fillStyle(0x5b3922, 1);
  g.fillRect(-38, -78, 7, 72);
  g.fillRect(31, -78, 7, 72);
  g.fillStyle(0x7d4f2d, 1);
  g.fillRect(-35, -76, 3, 66);
  g.fillRect(34, -76, 3, 66);
  g.fillStyle(0x7d3c2b, 1);
  g.fillTriangle(-52, -78, 0, -105, 52, -78);
  g.fillStyle(0xa8533a, 1);
  g.fillTriangle(-46, -80, 0, -101, 46, -80);
  g.fillStyle(0xcf7b57, 0.85);
  g.fillTriangle(-34, -82, 0, -97, 34, -82);
  g.lineStyle(2, 0x5b3922, 1);
  g.lineBetween(-34, -78, -34, -66);
  g.lineBetween(34, -78, 34, -66);
  // balde e corda
  g.lineStyle(1.3, 0x4a3521, 1);
  g.lineBetween(0, -84, 0, -34);
  g.fillStyle(0x6f4a2c, 1);
  g.fillRoundedRect(-8, -34, 16, 12, 3);
  g.fillStyle(0x98673a, 1);
  g.fillRoundedRect(-6, -32, 12, 7, 2);
  container.add(g);

  const bucket = scene.add.container(0, -34);
  const bucketGraphics = scene.add.graphics();
  bucketGraphics.fillStyle(0x6f4a2c, 1);
  bucketGraphics.fillRoundedRect(-7, 0, 14, 10, 2);
  bucketGraphics.fillStyle(0x9a6b3d, 1);
  bucketGraphics.fillRect(-6, 1, 12, 4);
  bucket.add(bucketGraphics);
  container.add(bucket);
  scene.tweens.add({
    targets: bucket,
    y: { from: -38, to: -42 },
    duration: 1700,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
  });
  return container;
}

export function createScarecrow(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const sway = scene.add.container(0, 0);
  const g = scene.add.graphics();
  g.fillStyle(0x2f421f, 0.22);
  g.fillEllipse(0, 4, 48, 14);
  g.fillStyle(0x6d4829, 1);
  g.fillRect(-2.5, -54, 5, 58);
  g.fillRect(-24, -39, 48, 4.5);
  g.fillStyle(0x8c5a32, 1);
  g.fillRect(-1.5, -52, 2, 52);
  // Camisa xadrez
  g.fillStyle(0xb6533d, 1);
  g.fillRoundedRect(-18, -44, 36, 31, 4);
  g.fillStyle(0xe4c89b, 0.75);
  g.fillRect(-18, -37, 36, 2);
  g.fillRect(-18, -27, 36, 2);
  g.fillRect(-10, -44, 2, 31);
  g.fillRect(8, -44, 2, 31);
  // cabeça de estopa
  g.fillStyle(0xd8b26c, 1);
  g.fillCircle(0, -55, 14);
  g.fillStyle(0xc59b55, 1);
  g.fillCircle(-4, -57, 8);
  g.fillStyle(0x4b3321, 1);
  g.fillCircle(-4, -56, 1.4);
  g.fillCircle(4, -56, 1.4);
  g.lineStyle(1.5, 0x7b5531, 1);
  g.lineBetween(-6, -49, 6, -49);
  // chapéu
  g.fillStyle(0x8b6236, 1);
  g.fillEllipse(0, -67, 44, 10);
  g.fillStyle(0xb98b4f, 1);
  g.fillEllipse(0, -69, 25, 14);
  g.fillStyle(0xd9b26c, 1);
  g.fillRect(-12, -67, 24, 3);
  // remendos
  g.fillStyle(0x7d9b5a, 1);
  g.fillRoundedRect(6, -36, 8, 8, 1);
  sway.add(g);
  container.add(sway);
  scene.tweens.add({
    targets: sway,
    angle: { from: -2.4, to: 2.4 },
    duration: 2200,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
  });
  return container;
}

export function createHayBale(
  scene: Phaser.Scene,
  x: number,
  y: number,
  scale = 1
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  drawHayBale(g, x, y, scale);
  return g;
}

export function drawHayBale(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  scale = 1
): void {
  graphics.fillStyle(0x2f421f, 0.18);
  graphics.fillEllipse(x, y + 3, 42 * scale, 10 * scale);
  graphics.fillStyle(0x9b7b3f, 1);
  graphics.fillRoundedRect(x - 20 * scale, y - 22 * scale, 40 * scale, 24 * scale, 4 * scale);
  graphics.fillStyle(0xd3ac5f, 1);
  graphics.fillRoundedRect(x - 17 * scale, y - 20 * scale, 34 * scale, 19 * scale, 3 * scale);
  graphics.fillStyle(0xe6c77c, 0.8);
  for (let straw = 0; straw < 7; straw += 1) {
    graphics.fillRect(x - 16 * scale + straw * 4.6 * scale, y - 19 * scale, 1.4 * scale, 17 * scale);
  }
  graphics.lineStyle(1.6, 0x7e5f2f, 1);
  graphics.strokeRoundedRect(x - 20 * scale, y - 22 * scale, 40 * scale, 24 * scale, 4 * scale);
}

export function drawCrate(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  scale = 1
): void {
  graphics.fillStyle(0x2f421f, 0.16);
  graphics.fillEllipse(x, y + 2, 24 * scale, 7 * scale);
  graphics.fillStyle(0x7b4b2a, 1);
  graphics.fillRoundedRect(x - 11 * scale, y - 18 * scale, 22 * scale, 20 * scale, 3 * scale);
  graphics.fillStyle(0x9e693b, 1);
  graphics.fillRoundedRect(x - 9 * scale, y - 16 * scale, 18 * scale, 16 * scale, 2 * scale);
  graphics.lineStyle(1.4, 0x6b3f22, 1);
  graphics.lineBetween(x - 9 * scale, y - 8 * scale, x + 9 * scale, y - 8 * scale);
  graphics.lineBetween(x - 9 * scale, y - 11 * scale, x + 9 * scale, y - 11 * scale);
}

export function createBarrel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  scale = 1
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(0x2f421f, 0.18);
  g.fillEllipse(x, y + 2, 24 * scale, 8 * scale);
  g.fillStyle(0x6a4025, 1);
  g.fillRoundedRect(x - 11 * scale, y - 24 * scale, 22 * scale, 26 * scale, 5 * scale);
  g.fillStyle(0x95613a, 1);
  g.fillRoundedRect(x - 9 * scale, y - 22 * scale, 18 * scale, 22 * scale, 4 * scale);
  g.fillStyle(0xb47a48, 0.8);
  g.fillRect(x - 8 * scale, y - 20 * scale, 5 * scale, 19 * scale);
  g.lineStyle(2, 0x4d3320, 1);
  g.lineBetween(x - 10 * scale, y - 17 * scale, x + 10 * scale, y - 17 * scale);
  g.lineBetween(x - 10 * scale, y - 6 * scale, x + 10 * scale, y - 6 * scale);
  return g;
}

export function createWateringCan(
  scene: Phaser.Scene,
  x: number,
  y: number,
  scale = 1
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y).setScale(scale);
  const g = scene.add.graphics();
  // Sombra e corpo de metal esmaltado.
  g.fillStyle(0x2f421f, 0.2);
  g.fillEllipse(1, 2, 32, 9);
  g.fillStyle(0x4e6c63, 1);
  g.fillRoundedRect(-13, -23, 24, 22, 5);
  g.fillStyle(0x6f9183, 1);
  g.fillRoundedRect(-11, -21, 20, 18, 4);
  g.fillStyle(0xa8c4b4, 0.65);
  g.fillRoundedRect(-8, -19, 5, 13, 2);
  g.lineStyle(2, 0x3d544b, 1);
  g.strokeRoundedRect(-13, -23, 24, 22, 5);
  // Alça.
  g.lineStyle(3, 0x4e6c63, 1);
  g.beginPath();
  g.arc(-1, -24, 9, Math.PI, 0, false);
  g.strokePath();
  g.lineStyle(1.4, 0xa8c4b4, 0.7);
  g.beginPath();
  g.arc(-1, -25, 7, Math.PI, 0, false);
  g.strokePath();
  // Bico e crivo.
  g.fillStyle(0x5d8074, 1);
  g.fillTriangle(9, -16, 27, -27, 15, -10);
  g.fillStyle(0x89a99a, 1);
  g.fillTriangle(11, -16, 25, -25, 14, -12);
  g.fillStyle(0x3d544b, 1);
  g.fillCircle(27, -27, 4.5);
  g.fillStyle(0xa8c4b4, 0.9);
  for (let hole = 0; hole < 3; hole += 1) {
    g.fillCircle(25 + hole, -28 + hole * 1.4, 0.7);
  }
  // Gotinhas.
  g.fillStyle(0x8fd7df, 0.85);
  g.fillEllipse(29, -18, 2.4, 3.4);
  g.fillEllipse(33, -13, 1.8, 2.7);
  return container.add(g);
}

export function createWheelbarrow(
  scene: Phaser.Scene,
  x: number,
  y: number,
  scale = 1
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y).setScale(scale);
  const g = scene.add.graphics();
  g.fillStyle(0x2f421f, 0.2);
  g.fillEllipse(2, 3, 52, 13);
  // Roda.
  g.fillStyle(0x4b3320, 1);
  g.fillCircle(-17, -7, 10);
  g.fillStyle(0x8d653c, 1);
  g.fillCircle(-17, -7, 7);
  g.fillStyle(0xc7a56d, 1);
  g.fillCircle(-17, -7, 2.5);
  g.lineStyle(1.2, 0x5e4127, 0.9);
  for (let spoke = 0; spoke < 6; spoke += 1) {
    const angle = (spoke / 6) * Math.PI * 2;
    g.lineBetween(-17, -7, -17 + Math.cos(angle) * 6, -7 + Math.sin(angle) * 6);
  }
  // Caçamba de madeira.
  g.fillStyle(0x6f4526, 1);
  g.fillPoints([
    { x: -10, y: -22 },
    { x: 27, y: -30 },
    { x: 31, y: -9 },
    { x: 2, y: 0 }
  ], true);
  g.fillStyle(0xa46f3d, 1);
  g.fillPoints([
    { x: -7, y: -20 },
    { x: 24, y: -27 },
    { x: 27, y: -11 },
    { x: 3, y: -3 }
  ], true);
  g.lineStyle(1.4, 0x5b3a22, 0.9);
  for (let plank = 0; plank < 3; plank += 1) {
    g.lineBetween(-4 + plank * 9, -20 + plank * 1.5, 0 + plank * 9, -2 + plank * 1.5);
  }
  // Cabos.
  g.lineStyle(3, 0x70472a, 1);
  g.lineBetween(25, -20, 45, -12);
  g.lineStyle(1.2, 0xb5814e, 0.8);
  g.lineBetween(25, -21, 45, -13);
  // Mudas e cenouras na caçamba.
  g.fillStyle(0x5e8f45, 1);
  g.fillCircle(10, -25, 4);
  g.fillCircle(15, -27, 3.5);
  g.fillStyle(0xe98236, 1);
  g.fillEllipse(19, -22, 5, 9);
  g.fillEllipse(23, -21, 4, 7);
  g.fillStyle(0xf7a44c, 0.8);
  g.fillEllipse(18, -24, 2, 4);
  return container.add(g);
}

export function createSeedCrate(
  scene: Phaser.Scene,
  x: number,
  y: number,
  scale = 1
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y).setScale(scale);
  const g = scene.add.graphics();
  drawCrate(g, 0, 0, 1);
  // Saquinhos de sementes e mudinhas sobre a caixa.
  g.fillStyle(0xd9c28c, 1);
  g.fillRoundedRect(-8, -23, 7, 9, 2);
  g.fillRoundedRect(1, -24, 8, 10, 2);
  g.fillStyle(0x7d5a34, 0.8);
  g.fillRect(-7, -20, 5, 1);
  g.fillRect(2, -21, 6, 1);
  g.lineStyle(1, 0x6d8d47, 1);
  g.lineBetween(-4, -23, -5, -29);
  g.lineBetween(-5, -27, -8, -29);
  g.lineBetween(-5, -27, -2, -30);
  g.lineBetween(5, -24, 5, -30);
  g.fillStyle(0x75a356, 1);
  g.fillEllipse(3, -30, 5, 3);
  g.fillEllipse(7, -29, 4, 2.6);
  return container.add(g);
}

export function createClothesline(
  scene: Phaser.Scene,
  x: number,
  y: number,
  length = 116
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const g = scene.add.graphics();
  g.fillStyle(0x2f421f, 0.18);
  g.fillEllipse(length / 2, 4, length + 20, 16);
  g.fillStyle(0x614026, 1);
  g.fillRect(-length / 2 - 2, -80, 5, 82);
  g.fillRect(length / 2 - 3, -74, 5, 76);
  g.fillStyle(0x91643a, 1);
  g.fillRect(-length / 2, -78, 2, 78);
  g.fillRect(length / 2 - 1, -72, 2, 72);
  g.lineStyle(1.3, 0x4a3521, 1);
  g.lineBetween(-length / 2, -76, length / 2, -70);
  container.add(g);

  const cloths = [
    { offset: -34, width: 28, height: 38, color: 0xf4ead2 },
    { offset: 10, width: 24, height: 32, color: 0xd8e4e0 },
    { offset: 43, width: 20, height: 28, color: 0xe9c58d }
  ];
  for (const cloth of cloths) {
    const fabric = scene.add.container(cloth.offset, -74);
    const fabricGraphics = scene.add.graphics();
    fabricGraphics.fillStyle(cloth.color, 1);
    fabricGraphics.fillRoundedRect(-cloth.width / 2, 0, cloth.width, cloth.height, 2);
    fabricGraphics.fillStyle(0xffffff, 0.28);
    fabricGraphics.fillRoundedRect(-cloth.width / 2 + 3, 2, 5, cloth.height - 6, 1);
    fabric.add(fabricGraphics);
    container.add(fabric);
    scene.tweens.add({
      targets: fabric,
      angle: { from: -3, to: 3 },
      duration: 1800 + Math.random() * 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }
  return container;
}

export function createMailbox(
  scene: Phaser.Scene,
  x: number,
  y: number
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const g = scene.add.graphics();
  g.fillStyle(0x2f421f, 0.18);
  g.fillEllipse(0, 2, 22, 7);
  g.fillStyle(0x5f3d24, 1);
  g.fillRect(-2.5, -35, 5, 37);
  g.fillStyle(0x8a5c33, 1);
  g.fillRect(-1.5, -33, 2, 33);
  g.fillStyle(0x9e4437, 1);
  g.fillRoundedRect(-12, -51, 24, 17, 5);
  g.fillStyle(0xbd5b4b, 1);
  g.fillRoundedRect(-10, -49, 20, 12, 4);
  g.fillStyle(0xf2d9a4, 1);
  g.fillRect(-6, -45, 12, 2);
  g.fillStyle(0xe8c16e, 1);
  g.fillRect(10, -48, 2, 12);
  g.fillRect(12, -48, 5, 3);
  container.add(g);
  return container;
}

export function createLanternPost(
  scene: Phaser.Scene,
  x: number,
  y: number
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const g = scene.add.graphics();
  g.fillStyle(0x2f421f, 0.22);
  g.fillEllipse(0, 2, 22, 7);
  g.fillStyle(0x4c3320, 1);
  g.fillRect(-2.5, -62, 5, 64);
  g.fillStyle(0x755034, 1);
  g.fillRect(-1, -60, 2, 60);
  g.fillStyle(0x4c3320, 1);
  g.fillRoundedRect(-9, -78, 18, 18, 3);
  g.fillStyle(0x322215, 1);
  g.fillRoundedRect(-6, -75, 12, 12, 2);
  g.fillStyle(0xffd77f, 1);
  g.fillRoundedRect(-4, -73, 8, 8, 1);
  container.add(g);
  const glow = scene.add.ellipse(0, -70, 64, 46, 0xffd77f, 0.13);
  container.add(glow);
  scene.tweens.add({
    targets: glow,
    alpha: { from: 0.08, to: 0.18 },
    scale: { from: 0.9, to: 1.1 },
    duration: 1400,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
    delay: Math.random() * 800
  });
  return container;
}

export function createRanchGate(
  scene: Phaser.Scene,
  x: number,
  y: number,
  ownerName: string,
  onExit: () => void
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const g = scene.add.graphics();
  g.fillStyle(0x2f421f, 0.22);
  g.fillEllipse(0, 4, 180, 38);
  // mourões
  for (const postX of [-66, 66]) {
    g.fillStyle(0x5c3a23, 1);
    g.fillRoundedRect(postX - 7, -98, 14, 104, 3);
    g.fillStyle(0x93623a, 1);
    g.fillRoundedRect(postX - 5, -96, 10, 98, 3);
    g.fillStyle(0xc08a52, 1);
    g.fillRect(postX - 4, -93, 3, 90);
    g.fillStyle(0x4a2f1d, 1);
    g.fillRect(postX - 8, -103, 16, 7);
  }
  // arco e placa
  g.lineStyle(8, 0x5c3a23, 1);
  g.beginPath();
  g.arc(0, -96, 66, Math.PI, 0);
  g.strokePath();
  g.lineStyle(4, 0x9a683c, 1);
  g.beginPath();
  g.arc(0, -97, 63, Math.PI, 0);
  g.strokePath();
  g.fillStyle(0x5b3922, 1);
  g.fillRoundedRect(-80, -112, 160, 25, 4);
  g.fillStyle(0x8d5f36, 1);
  g.fillRoundedRect(-77, -110, 154, 20, 3);
  g.lineStyle(1, 0xe1bd7a, 0.8);
  g.strokeRoundedRect(-74, -108, 148, 16, 2);
  // lanternas
  for (const lampX of [-52, 52]) {
    g.lineStyle(1.2, 0x3f2a19, 1);
    g.lineBetween(lampX, -93, lampX, -82);
    g.fillStyle(0x3f2a19, 1);
    g.fillRoundedRect(lampX - 6, -83, 12, 14, 2);
    g.fillStyle(0xffd77f, 1);
    g.fillRoundedRect(lampX - 4, -81, 8, 10, 1);
  }
  const glow = scene.add.ellipse(0, -88, 190, 100, 0xffd77f, 0.07);
  container.add([g, glow]);

  const title = scene.add.text(0, -101, `RANCHO ${ownerName.toUpperCase()}`, {
    fontFamily: RANCH_FONT_DISPLAY,
    fontSize: '10px',
    color: '#ffe7b0',
    letterSpacing: 1.2
  }).setOrigin(0.5);
  container.add(title);

  // Placa de saída, clicável.
  const sign = scene.add.container(20, -62);
  const signGraphics = scene.add.graphics();
  signGraphics.fillStyle(0x4b2f1c, 1);
  signGraphics.fillRoundedRect(-58, -13, 116, 26, 5);
  signGraphics.fillStyle(0x8b5b33, 1);
  signGraphics.fillRoundedRect(-56, -11, 112, 22, 4);
  signGraphics.lineStyle(1, 0xd9b979, 0.8);
  signGraphics.strokeRoundedRect(-53, -8, 106, 16, 3);
  sign.add(signGraphics);
  const signText = scene.add.text(0, 1, '←  CIDADE DE VALEDOURO', {
    fontFamily: RANCH_FONT_BODY,
    fontSize: '9px',
    fontStyle: 'bold',
    color: '#ffe9b8'
  }).setOrigin(0.5);
  sign.add(signText);
  const hit = scene.add.rectangle(0, 0, 120, 30, 0x000000, 0.001).setInteractive({ useHandCursor: true });
  hit.on('pointerdown', (_pointer: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
    event.stopPropagation();
    onExit();
  });
  hit.on('pointerover', () => sign.setScale(1.04));
  hit.on('pointerout', () => sign.setScale(1));
  sign.add(hit);
  container.add(sign);

  return container;
}

export function createButterfly(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color: number
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const leftWing = scene.add.ellipse(-4, 0, 8, 6, color, 0.9);
  const rightWing = scene.add.ellipse(4, 0, 8, 6, color, 0.9);
  leftWing.setRotation(-0.35);
  rightWing.setRotation(0.35);
  container.add([leftWing, rightWing]);
  scene.tweens.add({
    targets: [leftWing, rightWing],
    scaleX: { from: 1, to: 0.25 },
    duration: 150,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
  });
  scene.tweens.add({
    targets: container,
    x: x + Phaser.Math.Between(-55, 55),
    y: y + Phaser.Math.Between(-28, 28),
    duration: Phaser.Math.Between(2200, 3800),
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
    delay: Phaser.Math.Between(0, 900)
  });
  return container;
}

export function createAtmosphere(scene: Phaser.Scene): {
  resize: (width: number, height: number) => void;
} {
  const vignetteKey = 'ranch-vignette';
  if (!scene.textures.exists(vignetteKey)) {
    const texture = scene.textures.createCanvas(vignetteKey, 512, 512);
    if (texture) {
      const context = texture.getContext();
      const gradient = context.createRadialGradient(256, 242, 60, 256, 256, 300);
      gradient.addColorStop(0, 'rgba(40, 26, 10, 0)');
      gradient.addColorStop(0.62, 'rgba(40, 26, 10, 0.02)');
      gradient.addColorStop(1, 'rgba(31, 19, 7, 0.4)');
      context.fillStyle = gradient;
      context.fillRect(0, 0, 512, 512);
      texture.refresh();
    }
  }

  const vignette = scene.add.image(0, 0, vignetteKey).setOrigin(0.5).setDepth(8000).setAlpha(0.9);
  const sunKey = 'ranch-sun';
  if (!scene.textures.exists(sunKey)) {
    const texture = scene.textures.createCanvas(sunKey, 512, 512);
    if (texture) {
      const context = texture.getContext();
      const gradient = context.createRadialGradient(90, 60, 10, 90, 60, 420);
      gradient.addColorStop(0, 'rgba(255, 224, 150, 0.26)');
      gradient.addColorStop(0.4, 'rgba(255, 196, 110, 0.08)');
      gradient.addColorStop(1, 'rgba(255, 180, 80, 0)');
      context.fillStyle = gradient;
      context.fillRect(0, 0, 512, 512);
      texture.refresh();
    }
  }
  const sun = scene.add
    .image(0, 0, sunKey)
    .setOrigin(0.5)
    .setDepth(8001)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setAlpha(0.5);

  const resize = (width: number, height: number): void => {
    vignette.setPosition(width / 2, height / 2);
    vignette.setDisplaySize(Math.max(width, height) * 1.32, Math.max(width, height) * 1.32);
    sun.setPosition(width * 0.18, height * 0.12);
    sun.setDisplaySize(Math.max(width, height) * 0.95, Math.max(width, height) * 0.95);
  };

  return { resize };
}
