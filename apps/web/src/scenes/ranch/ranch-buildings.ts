import Phaser from 'phaser';
import {
  RANCH,
  RANCH_FONT_BODY,
  RANCH_FONT_DISPLAY,
  createFenceLine,
  drawCrate,
  drawHayBale
} from './ranch-theme';

function addShadow(container: Phaser.GameObjects.Container, width: number, height: number): void {
  const shadow = new Phaser.GameObjects.Graphics(container.scene);
  shadow.fillStyle(0x263a1e, 0.26);
  shadow.fillEllipse(3, 8, width, height);
  container.add(shadow);
}

/**
 * Galinheiro campestre: telhado vermelho, rampa, caixa de ninho, poleiro e
 * um pequeno pátio cercado onde as aves podem ciscar.
 */
export function createCoop(
  scene: Phaser.Scene,
  x: number,
  y: number
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  addShadow(container, 310, 88);

  const fence = [
    createFenceLine(scene, -142, -58, -72, -58, { height: 22, spacing: 25, alpha: 0.95 }),
    createFenceLine(scene, 72, -58, 142, -58, { height: 22, spacing: 25, alpha: 0.95 }),
    createFenceLine(scene, -142, -58, -142, 70, { height: 22, spacing: 25, alpha: 0.95 }),
    createFenceLine(scene, 142, -58, 142, 70, { height: 22, spacing: 25, alpha: 0.95 }),
    createFenceLine(scene, -142, 70, -48, 70, { height: 22, spacing: 25, alpha: 0.95 }),
    createFenceLine(scene, 48, 70, 142, 70, { height: 22, spacing: 25, alpha: 0.95 })
  ];
  container.add(fence);

  const g = scene.add.graphics();

  // Base de madeira e corpo do galinheiro.
  g.fillStyle(0x4d2f1b, 1);
  g.fillRoundedRect(-58, -8, 116, 16, 3);
  g.fillStyle(RANCH.woodDark, 1);
  g.fillRoundedRect(-55, -84, 110, 80, 4);
  g.fillStyle(0x9a6739, 1);
  g.fillRoundedRect(-51, -80, 102, 72, 3);
  g.fillStyle(0xb07a45, 0.65);
  g.fillRect(-49, -78, 98, 12);
  g.lineStyle(1.4, 0x6b4529, 0.7);
  for (let plank = 0; plank < 7; plank += 1) {
    g.lineBetween(-49 + plank * 14, -78, -49 + plank * 14, -8);
  }
  g.lineStyle(2, 0x5a3820, 1);
  g.lineBetween(-51, -42, 51, -42);
  g.fillStyle(0xc59258, 0.55);
  g.fillRect(-49, -41, 98, 2);

  // Telhado vermelho.
  g.fillStyle(0x6e2d22, 1);
  g.fillTriangle(-72, -82, 0, -136, 72, -82);
  g.fillStyle(RANCH.barnRed, 1);
  g.fillTriangle(-66, -84, 0, -130, 66, -84);
  g.fillStyle(RANCH.barnRedLight, 1);
  g.fillTriangle(-54, -86, 0, -124, 54, -86);
  g.lineStyle(1.1, 0x7b3025, 0.7);
  for (let row = 0; row < 4; row += 1) {
    g.lineBetween(-56 + row * 4, -86 - row * 9, 56 - row * 4, -86 - row * 9);
  }
  g.lineStyle(2, 0xefe3c5, 0.85);
  g.lineBetween(-72, -82, 72, -82);
  g.fillStyle(0xefe3c5, 1);
  g.fillCircle(0, -132, 3);
  g.fillRect(-1.5, -145, 3, 12);
  g.fillStyle(0xd6c9a8, 1);
  g.fillTriangle(-7, -142, 8, -145, 3, -137);

  // Porta com rampa.
  g.fillStyle(0x3b2316, 1);
  g.fillRoundedRect(-18, -46, 36, 42, 3);
  g.fillStyle(0x6f4829, 1);
  g.fillRoundedRect(-15, -43, 30, 38, 2);
  g.fillStyle(0x4a2e1b, 1);
  g.fillRect(-1, -42, 2, 36);
  g.fillStyle(0xe5c58a, 0.8);
  g.fillRect(-15, -29, 30, 2);
  g.fillStyle(0x9c6c3d, 1);
  g.fillTriangle(-20, -4, 20, -4, 14, 17);
  g.fillStyle(0xc08a52, 1);
  g.fillTriangle(-16, -3, 16, -3, 11, 14);
  g.lineStyle(1, 0x7b4b2a, 0.8);
  for (let step = 0; step < 4; step += 1) {
    g.lineBetween(-15 + step * 1.5, 0 + step * 4, 15 - step * 1.5, 0 + step * 4);
  }

  // Janela quente e caixa de ninho.
  g.fillStyle(0x4d2b1a, 1);
  g.fillRoundedRect(22, -68, 21, 20, 2);
  g.fillStyle(0xf5d287, 1);
  g.fillRoundedRect(25, -65, 15, 14, 1);
  g.fillStyle(0x6d4226, 1);
  g.fillRect(31, -65, 2, 14);
  g.fillRect(25, -59, 15, 2);
  g.lineStyle(2, 0x8a5b33, 1);
  g.strokeRoundedRect(22, -68, 21, 20, 2);

  g.fillStyle(0x5d3a22, 1);
  g.fillRoundedRect(-78, -48, 25, 26, 2);
  g.fillStyle(0x8f5d35, 1);
  g.fillRoundedRect(-75, -45, 19, 20, 1);
  g.fillStyle(0x3f2717, 1);
  g.fillEllipse(-65, -41, 15, 6);
  g.fillStyle(0xf6ecd2, 1);
  g.fillEllipse(-69, -43, 5, 7);
  g.fillEllipse(-63, -42, 4.5, 6.4);
  g.fillStyle(0xd8c9a8, 0.8);
  g.fillCircle(-69, -44, 1);
  g.fillStyle(0x8a5b33, 1);
  g.fillRect(-78, -23, 25, 3);

  // Poleiro e comedouro.
  g.fillStyle(0x6a4327, 1);
  g.fillRect(-30, -20, 60, 3.5);
  g.fillRect(-24, -18, 3, 12);
  g.fillRect(21, -18, 3, 12);
  g.fillStyle(0x4b2d1b, 1);
  g.fillRoundedRect(-112, 34, 62, 19, 4);
  g.fillStyle(0xb07a3f, 1);
  g.fillRect(-108, 32, 54, 6);
  g.fillStyle(0xe0bd71, 1);
  g.fillEllipse(-81, 32, 48, 9);
  g.fillStyle(0x557f91, 1);
  g.fillRoundedRect(62, 34, 58, 20, 5);
  g.fillStyle(0x9ed6df, 1);
  g.fillEllipse(91, 32, 46, 9);

  // Ferradura e detalhes de aconchego.
  g.lineStyle(2, 0x9b8a70, 1);
  g.beginPath();
  g.arc(0, -55, 5, Math.PI * 0.15, Math.PI * 0.85, false);
  g.strokePath();
  g.fillStyle(0xe5c28f, 0.8);
  g.fillCircle(0, -52, 1.2);

  container.add(g);

  // Fardinhas de feno ao lado do galinheiro.
  const props = scene.add.graphics();
  drawHayBale(props, 84, -6, 0.72);
  drawCrate(props, -92, -16, 0.7);
  container.add(props);

  return container;
}

/**
 * Curral de gado com abrigo aberto, cercado de madeira, cocho e bebedouro.
 */
export function createCorral(
  scene: Phaser.Scene,
  x: number,
  y: number
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  addShadow(container, 390, 112);

  const g = scene.add.graphics();

  // Abrigo de fundo.
  g.fillStyle(0x4e3220, 1);
  g.fillRect(-74, -54, 9, 82);
  g.fillRect(66, -54, 9, 82);
  g.fillStyle(0x7d5230, 1);
  g.fillRect(-72, -52, 4, 78);
  g.fillRect(68, -52, 4, 78);

  g.fillStyle(0x6e2d22, 1);
  g.fillTriangle(-100, -52, 0, -104, 100, -52);
  g.fillStyle(RANCH.roof, 1);
  g.fillTriangle(-92, -55, 0, -99, 92, -55);
  g.fillStyle(RANCH.roofLight, 1);
  g.fillTriangle(-76, -57, 0, -93, 76, -57);
  g.lineStyle(1.2, 0x8f402c, 0.7);
  for (let row = 0; row < 4; row += 1) {
    g.lineBetween(-78 + row * 6, -57 - row * 8, 78 - row * 6, -57 - row * 8);
  }
  g.lineStyle(3, 0xefe3c5, 0.85);
  g.lineBetween(-100, -52, 100, -52);

  // Parede de fundo do abrigo, com feno e cocho.
  g.fillStyle(0x6f4829, 1);
  g.fillRect(-58, -50, 116, 50);
  g.fillStyle(0x8d5f36, 1);
  g.fillRect(-55, -48, 110, 46);
  g.fillStyle(0x5b3922, 1);
  g.fillRect(-55, -14, 110, 12);
  g.lineStyle(1.2, 0x6a4327, 0.6);
  for (let plank = 0; plank < 8; plank += 1) {
    g.lineBetween(-55 + plank * 15, -48, -55 + plank * 15, -2);
  }
  const props = scene.add.graphics();
  drawHayBale(props, -30, -4, 1.05);
  drawHayBale(props, 16, -2, 0.9);

  // Cercado do piquete.
  const fence = [
    createFenceLine(scene, -178, -62, -94, -62, { height: 26, spacing: 27 }),
    createFenceLine(scene, 94, -62, 178, -62, { height: 26, spacing: 27 }),
    createFenceLine(scene, -178, -62, -178, 78, { height: 26, spacing: 27 }),
    createFenceLine(scene, 178, -62, 178, 78, { height: 26, spacing: 27 }),
    createFenceLine(scene, -178, 78, -44, 78, { height: 26, spacing: 27 }),
    createFenceLine(scene, 44, 78, 178, 78, { height: 26, spacing: 27 })
  ];
  container.add(fence);

  // Porteira entreaberta.
  const gate = scene.add.graphics();
  gate.lineStyle(4, 0x5c3a23, 1);
  gate.lineBetween(-30, 34, -30, 58);
  gate.lineBetween(-30, 38, 10, 50);
  gate.lineBetween(-30, 50, 10, 38);
  gate.lineStyle(2, 0xa97645, 1);
  gate.lineBetween(-28, 40, 8, 50);
  gate.lineBetween(-28, 48, 8, 38);
  container.add(gate);

  // Cocho e bebedouro.
  g.fillStyle(0x4f3120, 1);
  g.fillRoundedRect(-106, 24, 56, 17, 4);
  g.fillStyle(0xa97645, 1);
  g.fillRect(-102, 22, 48, 5);
  g.fillStyle(0xd9b771, 1);
  g.fillEllipse(-78, 22, 42, 7);
  g.fillStyle(0x3f2a1b, 1);
  g.fillRoundedRect(54, 26, 52, 18, 5);
  g.fillStyle(0x6c9ead, 1);
  g.fillEllipse(80, 25, 43, 7);
  g.fillStyle(0xb8e4e6, 0.9);
  g.fillEllipse(75, 24, 18, 2.6);
  g.fillStyle(0x4b3828, 0.35);
  g.fillEllipse(-78, 44, 60, 8);
  g.fillEllipse(80, 47, 58, 8);

  // Detalhes no telhado: lanterninha e catavento.
  g.lineStyle(1.4, 0x3f2a19, 1);
  g.lineBetween(42, -82, 42, -70);
  g.fillStyle(0x3f2a19, 1);
  g.fillRoundedRect(37, -72, 10, 13, 2);
  g.fillStyle(0xffd77f, 1);
  g.fillRoundedRect(39, -70, 6, 9, 1);

  container.add([props, g]);

  const glow = scene.add.ellipse(42, -64, 48, 36, 0xffd77f, 0.1);
  container.add(glow);

  return container;
}

/**
 * Estábulo de cavalos com baias, sótão de feno e piquete na frente.
 */
export function createStable(
  scene: Phaser.Scene,
  x: number,
  y: number
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  addShadow(container, 410, 124);

  const fence = [
    createFenceLine(scene, -184, -50, -104, -50, { height: 28, spacing: 28 }),
    createFenceLine(scene, 104, -50, 184, -50, { height: 28, spacing: 28 }),
    createFenceLine(scene, -184, -50, -184, 82, { height: 28, spacing: 28 }),
    createFenceLine(scene, 184, -50, 184, 82, { height: 28, spacing: 28 }),
    createFenceLine(scene, -184, 82, -48, 82, { height: 28, spacing: 28 }),
    createFenceLine(scene, 48, 82, 184, 82, { height: 28, spacing: 28 })
  ];
  container.add(fence);

  const g = scene.add.graphics();

  // Corpo do estábulo.
  g.fillStyle(0x4b2a1d, 1);
  g.fillRoundedRect(-102, -128, 204, 128, 5);
  g.fillStyle(RANCH.barnRed, 1);
  g.fillRoundedRect(-98, -124, 196, 120, 4);
  g.fillStyle(0x933d2e, 1);
  g.fillRect(-98, -124, 196, 8);
  g.fillStyle(0xc06148, 0.32);
  for (let plank = 0; plank < 12; plank += 1) {
    g.fillRect(-94 + plank * 16, -114, 2, 104);
  }

  // Telhado gambrel com detalhes claros.
  g.fillStyle(0x5a2720, 1);
  g.beginPath();
  g.moveTo(-122, -122);
  g.lineTo(-82, -170);
  g.lineTo(0, -196);
  g.lineTo(82, -170);
  g.lineTo(122, -122);
  g.closePath();
  g.fillPath();
  g.fillStyle(0x7b3126, 1);
  g.beginPath();
  g.moveTo(-114, -125);
  g.lineTo(-76, -166);
  g.lineTo(0, -190);
  g.lineTo(76, -166);
  g.lineTo(114, -125);
  g.closePath();
  g.fillPath();
  g.fillStyle(0x95402f, 1);
  g.beginPath();
  g.moveTo(-102, -128);
  g.lineTo(-70, -162);
  g.lineTo(0, -182);
  g.lineTo(70, -162);
  g.lineTo(102, -128);
  g.closePath();
  g.fillPath();
  g.lineStyle(1.2, 0x63271e, 0.7);
  for (let row = 1; row < 6; row += 1) {
    g.lineBetween(-106 + row * 4, -128 - row * 8, 106 - row * 4, -128 - row * 8);
  }
  g.lineStyle(3, 0xefe3c5, 0.95);
  g.lineBetween(-122, -122, 122, -122);
  g.fillStyle(0xefe3c5, 1);
  for (const side of [-1, 1]) {
    g.beginPath();
    g.moveTo(side * 122, -122);
    g.lineTo(side * 82, -170);
    g.lineTo(side * 72, -164);
    g.lineTo(side * 112, -119);
    g.closePath();
    g.fillPath();
  }

  // Sótão e porta de feno.
  g.fillStyle(0x4a211a, 1);
  g.fillRect(-30, -166, 60, 34);
  g.fillStyle(0xcba059, 1);
  g.fillRect(-26, -162, 52, 27);
  g.fillStyle(0xe0b86e, 1);
  for (let straw = 0; straw < 12; straw += 1) {
    g.fillRect(-26 + straw * 4.5, -162 + (straw % 3) * 8, 2, 11);
  }
  g.lineStyle(2, 0x5b3320, 1);
  g.lineBetween(-33, -166, 33, -166);

  // Baias com portas entreabertas.
  for (const side of [-1, 1]) {
    const stallX = side * 48;
    g.fillStyle(0x4a211a, 1);
    g.fillRoundedRect(stallX - 29, -104, 58, 100, 3);
    g.fillStyle(0x773027, 1);
    g.fillRoundedRect(stallX - 26, -100, 52, 94, 2);
    g.fillStyle(0x8f3d31, 1);
    g.fillRect(stallX - 24, -98, 48, 40);
    g.lineStyle(3, 0xefe3c5, 1);
    g.strokeRect(stallX - 26, -100, 52, 94);
    g.lineBetween(stallX, -100, stallX, -6);
    g.lineBetween(stallX - 26, -58, stallX + 26, -58);
    g.fillStyle(0x261710, 1);
    g.fillRect(stallX - 20, -55, 40, 46);
    g.lineStyle(2.4, 0xefe3c5, 1);
    g.lineBetween(stallX - 26, -58, stallX + 26, -6);
    g.lineBetween(stallX + 26, -58, stallX - 26, -6);
    g.fillStyle(0xd7b26b, 1);
    g.fillCircle(stallX - 4, -57, 2.4);
  }

  // Janelinha central do sótão.
  g.fillStyle(0x4d241d, 1);
  g.fillRoundedRect(-10, -156, 20, 20, 2);
  g.fillStyle(0xf3cd7f, 1);
  g.fillRoundedRect(-7, -153, 14, 14, 1);
  g.fillStyle(0x66372a, 1);
  g.fillRect(-1, -153, 2, 14);
  g.fillRect(-7, -147, 14, 2);

  // Lanterna na fachada.
  g.lineStyle(1.3, 0x3f2a19, 1);
  g.lineBetween(-86, -92, -86, -80);
  g.fillStyle(0x3f2a19, 1);
  g.fillRoundedRect(-91, -82, 10, 14, 2);
  g.fillStyle(0xffd77f, 1);
  g.fillRoundedRect(-89, -80, 6, 10, 1);

  // Cocho e bebedouro no piquete.
  g.fillStyle(0x4f3120, 1);
  g.fillRoundedRect(-110, 30, 52, 16, 4);
  g.fillStyle(0xa97645, 1);
  g.fillRect(-106, 28, 44, 5);
  g.fillStyle(0xd9b771, 1);
  g.fillEllipse(-84, 28, 38, 7);
  g.fillStyle(0x3f2a1b, 1);
  g.fillRoundedRect(56, 32, 50, 17, 5);
  g.fillStyle(0x6c9ead, 1);
  g.fillEllipse(81, 31, 41, 6);
  g.fillStyle(0xb8e4e6, 0.9);
  g.fillEllipse(76, 30, 17, 2.4);

  container.add(g);

  // Catavento do estábulo.
  const vane = scene.add.container(0, -202);
  const vaneGraphics = scene.add.graphics();
  vaneGraphics.lineStyle(2, 0xd6c9a8, 1);
  vaneGraphics.lineBetween(0, 16, 0, -10);
  vaneGraphics.fillStyle(0xd6c9a8, 1);
  vaneGraphics.fillCircle(0, -12, 3);
  vaneGraphics.fillTriangle(-16, -10, 2, -16, 2, -4);
  vaneGraphics.fillTriangle(16, -10, 4, -14, 4, -2);
  vane.add(vaneGraphics);
  container.add(vane);
  scene.tweens.add({
    targets: vane,
    angle: { from: -8, to: 8 },
    duration: 2600,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
  });

  const props = scene.add.graphics();
  drawHayBale(props, 96, 6, 0.9);
  drawCrate(props, -108, -2, 0.75);
  container.add(props);

  const glow = scene.add.ellipse(-86, -74, 52, 38, 0xffd77f, 0.1);
  container.add(glow);

  return container;
}

/**
 * Lote vazio com placa de venda, usado enquanto a instalação não foi comprada.
 */
export function createVacantPad(
  scene: Phaser.Scene,
  x: number,
  y: number,
  name: string,
  icon: string,
  cost: number
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  addShadow(container, 190, 44);

  const g = scene.add.graphics();
  g.fillStyle(0x8a6438, 0.55);
  g.fillEllipse(0, 16, 196, 58);
  g.fillStyle(0x9c7445, 0.42);
  g.fillEllipse(-6, 12, 164, 44);
  g.lineStyle(1.5, 0xc7a06a, 0.3);
  g.strokeEllipse(0, 16, 196, 58);

  // Tocos de cerca antigos e mato.
  for (const [postX, postY] of [[-82, 8], [-54, 24], [80, 10], [52, 28]] as Array<[number, number]>) {
    g.fillStyle(0x54351f, 1);
    g.fillRoundedRect(postX - 3, postY - 17, 6, 20, 1);
    g.fillStyle(0x8a5b33, 1);
    g.fillRect(postX - 1.5, postY - 15, 2.4, 16);
  }
  g.fillStyle(0x628c45, 0.9);
  g.fillEllipse(-38, 28, 26, 8);
  g.fillEllipse(34, 32, 30, 9);

  // Placa de madeira e papel.
  g.fillStyle(0x4e301c, 1);
  g.fillRect(-2.5, -51, 5, 58);
  g.fillStyle(0x6f4829, 1);
  g.fillRect(-1, -49, 2, 54);
  g.fillStyle(0x3d2515, 1);
  g.fillRoundedRect(-78, -92, 156, 55, 5);
  g.fillStyle(0x8b5b33, 1);
  g.fillRoundedRect(-75, -90, 150, 49, 4);
  g.fillStyle(0xf1e2c4, 1);
  g.fillRoundedRect(-70, -85, 140, 38, 3);
  g.lineStyle(1, 0xcda96d, 0.9);
  g.strokeRoundedRect(-70, -85, 140, 38, 3);

  const heading = scene.add.text(0, -76, 'LOTE DISPONÍVEL', {
    fontFamily: RANCH_FONT_BODY,
    fontSize: '7px',
    fontStyle: 'bold',
    color: '#8a6334',
    letterSpacing: 1.6
  }).setOrigin(0.5);
  const title = scene.add.text(0, -63, `${icon} ${name}`, {
    fontFamily: RANCH_FONT_DISPLAY,
    fontSize: '12px',
    color: '#3d2816'
  }).setOrigin(0.5);
  const price = scene.add.text(0, -51, `${cost.toLocaleString('pt-BR')} ouro · mercado`, {
    fontFamily: RANCH_FONT_BODY,
    fontSize: '8px',
    color: '#6b4a28'
  }).setOrigin(0.5);

  // Selo dourado com "+".
  g.fillStyle(0xc79a52, 1);
  g.fillCircle(0, 10, 13);
  g.fillStyle(0xf0c56d, 1);
  g.fillCircle(0, 10, 10);
  g.lineStyle(1.2, 0x8a5f2c, 1);
  g.strokeCircle(0, 10, 10);
  g.lineStyle(2.4, 0x5b3b18, 1);
  g.lineBetween(-4, 10, 4, 10);
  g.lineBetween(0, 6, 0, 14);

  container.add([g, heading, title, price]);
  return container;
}

/**
 * Placa rústica pequena para identificar a horta ou uma área do rancho.
 */
export function createRusticSign(
  scene: Phaser.Scene,
  x: number,
  y: number,
  title: string
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const g = scene.add.graphics();
  g.fillStyle(0x2f421f, 0.18);
  g.fillEllipse(0, 3, 54, 12);
  g.fillStyle(0x4e301c, 1);
  g.fillRect(-2.5, -42, 5, 45);
  g.fillStyle(0x6f4829, 1);
  g.fillRect(-1, -40, 2, 41);
  g.fillStyle(0x3d2515, 1);
  g.fillRoundedRect(-34, -54, 68, 24, 4);
  g.fillStyle(0x8b5b33, 1);
  g.fillRoundedRect(-32, -52, 64, 20, 3);
  g.fillStyle(0x6b4529, 1);
  g.fillCircle(-28, -52, 2);
  g.fillCircle(28, -52, 2);
  const text = scene.add.text(0, -42, title.toUpperCase(), {
    fontFamily: RANCH_FONT_DISPLAY,
    fontSize: '8px',
    color: '#ffe7b0',
    letterSpacing: 1.4
  }).setOrigin(0.5);
  container.add([g, text]);
  return container;
}

export function createPropertyMarker(
  scene: Phaser.Scene,
  x: number,
  y: number,
  ownerName: string
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const g = scene.add.graphics();
  g.fillStyle(0x2f421f, 0.18);
  g.fillEllipse(0, 3, 60, 14);
  g.fillStyle(0x4e301c, 1);
  g.fillRect(-3, -56, 6, 59);
  g.fillStyle(0x6f4829, 1);
  g.fillRect(-1.4, -54, 2.6, 54);
  g.fillStyle(0x3d2515, 1);
  g.fillRoundedRect(-52, -70, 104, 30, 5);
  g.fillStyle(0x8b5b33, 1);
  g.fillRoundedRect(-49, -68, 98, 26, 4);
  g.lineStyle(1, 0xd9b979, 0.8);
  g.strokeRoundedRect(-46, -65, 92, 20, 3);
  const text = scene.add.text(0, -55, `RANCHO ${ownerName.toUpperCase()}`, {
    fontFamily: RANCH_FONT_DISPLAY,
    fontSize: '8px',
    color: '#ffe7b0',
    letterSpacing: 0.8
  }).setOrigin(0.5);
  container.add([g, text]);
  return container;
}
