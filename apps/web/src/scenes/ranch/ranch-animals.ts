import Phaser from 'phaser';
import type { AnimalSpeciesId, CollectibleRank } from '@mundo-perfeito/shared';
import { RANCH_FONT_BODY, RANK_COLORS } from './ranch-theme';

export interface AnimalVisual {
  root: Phaser.GameObjects.Container;
  label: Phaser.GameObjects.Text;
  face: (direction: 1 | -1) => void;
  setLabelVisible: (visible: boolean) => void;
}

interface AnimalVisualOptions {
  species: AnimalSpeciesId;
  tier: CollectibleRank;
  gender: 'male' | 'female';
  name: string;
}

export function createAnimalVisual(
  scene: Phaser.Scene,
  options: AnimalVisualOptions
): AnimalVisual {
  const { species, tier, gender, name } = options;
  const root = scene.add.container(0, 0);
  const shadow = scene.add.ellipse(0, 2, species === 'chicken' ? 30 : 54, species === 'chicken' ? 9 : 14, 0x1d2e18, 0.3);
  const flip = scene.add.container(0, 0);
  const bob = scene.add.container(0, 0);
  flip.add(bob);
  root.add([shadow, flip]);

  const accent = RANK_COLORS[tier] ?? 0xe6dfca;

  if (species === 'chicken') {
    const legs = scene.add.graphics();
    legs.lineStyle(2, 0xc58a30, 1);
    legs.lineBetween(-5, -5, -6, 1);
    legs.lineBetween(5, -5, 6, 1);
    legs.lineStyle(1.5, 0xc58a30, 1);
    legs.lineBetween(-9, 1, -3, 1);
    legs.lineBetween(3, 1, 9, 1);
    bob.add(legs);

    const body = scene.add.graphics();
    body.fillStyle(gender === 'male' ? 0xe8d8ae : 0xf4ead0, 1);
    body.fillEllipse(0, -15, 32, 23);
    body.fillStyle(0xd8c393, 0.85);
    body.fillEllipse(-6, -14, 18, 15);
    body.fillStyle(0xf9f2df, 0.8);
    body.fillEllipse(4, -19, 16, 10);
    // asa
    body.fillStyle(gender === 'male' ? 0xb98b4c : 0xd7bf8d, 1);
    body.fillEllipse(-2, -12, 16, 10);
    body.lineStyle(1, 0x8d693c, 0.55);
    body.lineBetween(-8, -14, 4, -10);
    // cauda
    body.fillStyle(gender === 'male' ? 0x7d5a37 : 0xe3d2aa, 1);
    body.fillTriangle(-14, -18, -25, -30, -12, -24);
    body.fillTriangle(-15, -14, -27, -18, -12, -18);
    body.fillStyle(gender === 'male' ? accent : 0xd7bf8d, 0.9);
    body.fillTriangle(-15, -22, -24, -36, -10, -26);
    body.fillStyle(0xf0c56d, 0.9);
    body.fillCircle(-4, -10, 3);
    bob.add(body);

    const head = scene.add.container(8, -24);
    const headGraphics = scene.add.graphics();
    headGraphics.fillStyle(gender === 'male' ? 0xe8d8ae : 0xf7eed8, 1);
    headGraphics.fillCircle(0, 0, 9);
    headGraphics.fillStyle(0xd7bf8d, 0.6);
    headGraphics.fillCircle(-2, 2, 6);
    headGraphics.fillStyle(gender === 'male' ? 0xc9473c : 0xd95d50, 1);
    headGraphics.fillCircle(-3, -7, gender === 'male' ? 4 : 3);
    headGraphics.fillCircle(1, -8, gender === 'male' ? 3 : 2);
    headGraphics.fillStyle(0xc9473c, 1);
    headGraphics.fillCircle(4, 5, 2);
    headGraphics.fillStyle(0xf0a52d, 1);
    headGraphics.fillTriangle(7, 0, 16, 2, 7, 5);
    headGraphics.fillStyle(0x2f2119, 1);
    headGraphics.fillCircle(4, -1, 1.4);
    headGraphics.fillStyle(0xffffff, 0.8);
    headGraphics.fillCircle(4.5, -1.6, 0.6);
    head.add(headGraphics);
    bob.add(head);

    // Medalhão de rank
    body.fillStyle(accent, 1);
    body.fillCircle(-2, -7, 2.4);
    body.lineStyle(1, 0x5b3e22, 0.7);
    body.strokeCircle(-2, -7, 2.4);

    scene.tweens.add({
      targets: head,
      y: { from: -25, to: -22 },
      duration: gender === 'male' ? 620 : 820,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: Math.random() * 700
    });
    scene.tweens.add({
      targets: bob,
      y: { from: 0, to: -1.4 },
      duration: 1050,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  } else if (species === 'cow') {
    const legs = scene.add.graphics();
    legs.fillStyle(0x5d4635, 1);
    legs.fillRoundedRect(-19, -9, 7, 12, 2);
    legs.fillRoundedRect(-4, -9, 7, 12, 2);
    legs.fillRoundedRect(12, -9, 7, 12, 2);
    legs.fillRoundedRect(24, -8, 7, 11, 2);
    legs.fillStyle(0x76614b, 1);
    legs.fillRect(-18, -8, 3, 8);
    legs.fillRect(-3, -8, 3, 8);
    legs.fillRect(13, -8, 3, 8);
    legs.fillRect(25, -7, 3, 8);
    bob.add(legs);

    const body = scene.add.graphics();
    body.fillStyle(0xf4eee1, 1);
    body.fillEllipse(3, -26, 55, 31);
    body.fillStyle(0x82573b, 1);
    body.fillEllipse(-7, -29, 14, 12);
    body.fillEllipse(12, -21, 11, 9);
    body.fillEllipse(-16, -20, 8, 6);
    body.fillStyle(0xfaf7ee, 0.8);
    body.fillEllipse(8, -33, 28, 13);
    bob.add(body);
    // cabeça
    const head = scene.add.container(31, -32);
    const headGraphics = scene.add.graphics();
    headGraphics.fillStyle(0xf4eee1, 1);
    headGraphics.fillEllipse(0, 0, 22, 19);
    headGraphics.fillStyle(0x82573b, 1);
    headGraphics.fillEllipse(-5, -5, 7, 6);
    headGraphics.fillStyle(0xd9a6a2, 1);
    headGraphics.fillEllipse(8, 4, 13, 9);
    headGraphics.fillStyle(0xb47c76, 1);
    headGraphics.fillCircle(5, 4, 1.2);
    headGraphics.fillCircle(10, 4, 1.2);
    headGraphics.fillStyle(0x3b2b20, 1);
    headGraphics.fillCircle(-2, -2, 1.8);
    headGraphics.fillStyle(0xffffff, 0.9);
    headGraphics.fillCircle(-1.4, -2.6, 0.7);
    // orelhas
    headGraphics.fillStyle(0xe6ddca, 1);
    headGraphics.fillEllipse(-11, -3, 8, 5);
    headGraphics.fillEllipse(10, -8, 8, 5);
    // chifres
    headGraphics.fillStyle(0xd8c9a8, 1);
    headGraphics.fillTriangle(-5, -10, -8, -18, -1, -11);
    headGraphics.fillTriangle(6, -11, 11, -18, 11, -9);
    head.add(headGraphics);
    bob.add(head);

    // cauda
    const tail = scene.add.container(-25, -32);
    const tailGraphics = scene.add.graphics();
    tailGraphics.lineStyle(3, 0x6d513c, 1);
    tailGraphics.lineBetween(0, 0, -3, 17);
    tailGraphics.fillStyle(0x4b3528, 1);
    tailGraphics.fillEllipse(-4, 20, 6, 9);
    tail.add(tailGraphics);
    bob.add(tail);
    scene.tweens.add({
      targets: tail,
      angle: { from: -12, to: 12 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // úbere
    if (gender === 'female') {
      body.fillStyle(0xe2b5ae, 0.9);
      body.fillEllipse(-8, -11, 12, 8);
      body.fillStyle(0xb47c76, 0.7);
      body.fillCircle(-12, -10, 1.2);
      body.fillCircle(-7, -9, 1.2);
    }

    // coleira/medalhão de rank
    body.lineStyle(2, accent, 0.95);
    body.strokeEllipse(23, -27, 15, 17);
    body.fillStyle(accent, 1);
    body.fillCircle(25, -18, 2.8);

    scene.tweens.add({
      targets: head,
      y: { from: -32, to: -30 },
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    scene.tweens.add({
      targets: bob,
      y: { from: 0, to: -0.8 },
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  } else {
    // Cavalo
    const legs = scene.add.graphics();
    legs.fillStyle(0x5b3a28, 1);
    legs.fillRoundedRect(-18, -10, 7, 13, 2);
    legs.fillRoundedRect(-4, -9, 7, 12, 2);
    legs.fillRoundedRect(13, -10, 7, 13, 2);
    legs.fillRoundedRect(25, -9, 7, 12, 2);
    legs.fillStyle(0x31201a, 1);
    legs.fillRect(-18, 0, 7, 3);
    legs.fillRect(-4, 0, 7, 3);
    legs.fillRect(13, 0, 7, 3);
    legs.fillRect(25, 0, 7, 3);
    bob.add(legs);

    const body = scene.add.graphics();
    const coat = gender === 'female' ? 0x9b6640 : 0x855331;
    body.fillStyle(coat, 1);
    body.fillEllipse(3, -28, 56, 28);
    body.fillStyle(0x6d4329, 1);
    body.fillEllipse(-4, -25, 22, 15);
    body.fillStyle(0xb07a4d, 0.7);
    body.fillEllipse(5, -34, 32, 11);
    bob.add(body);
    // pescoço e cabeça
    const head = scene.add.container(30, -42);
    const headGraphics = scene.add.graphics();
    headGraphics.fillStyle(coat, 1);
    headGraphics.fillTriangle(-12, 14, 2, -15, 13, 13);
    headGraphics.fillEllipse(7, 4, 13, 18);
    headGraphics.fillStyle(0xb07a4d, 1);
    headGraphics.fillEllipse(7, 4, 8, 12);
    headGraphics.fillStyle(0x5e3c27, 1);
    headGraphics.fillEllipse(15, 8, 13, 9);
    headGraphics.fillStyle(0x3a251a, 1);
    headGraphics.fillCircle(13, 10, 4);
    headGraphics.fillStyle(0x241712, 1);
    headGraphics.fillCircle(15, 10, 1.2);
    headGraphics.fillCircle(20, 10, 1.2);
    headGraphics.fillStyle(0x2b1c14, 1);
    headGraphics.fillCircle(9, -1, 2);
    headGraphics.fillStyle(0xffffff, 0.85);
    headGraphics.fillCircle(9.6, -1.6, 0.8);
    // orelhas
    headGraphics.fillStyle(coat, 1);
    headGraphics.fillTriangle(0, -8, 2, -19, 8, -10);
    // crina
    headGraphics.fillStyle(0x3f291d, 1);
    for (let mane = 0; mane < 6; mane += 1) {
      headGraphics.fillCircle(-3 + mane * 2.4, -13 + mane * 3.2, 2.6);
    }
    head.add(headGraphics);
    bob.add(head);

    const tail = scene.add.container(-25, -35);
    const tailGraphics = scene.add.graphics();
    tailGraphics.fillStyle(0x4a2d1f, 1);
    tailGraphics.fillTriangle(0, 0, -8, 19, 5, 13);
    tailGraphics.fillStyle(0x6d4329, 1);
    tailGraphics.fillTriangle(1, 0, -4, 17, 7, 12);
    tail.add(tailGraphics);
    bob.add(tail);
    scene.tweens.add({
      targets: tail,
      angle: { from: -10, to: 14 },
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // manta de rank
    body.fillStyle(accent, 0.9);
    body.fillRoundedRect(-11, -41, 28, 11, 3);
    body.fillStyle(0xffffff, 0.2);
    body.fillRect(-9, -40, 24, 2);
    body.lineStyle(1.5, 0xf2e1b4, 0.8);
    body.strokeRoundedRect(-11, -41, 28, 11, 3);

    scene.tweens.add({
      targets: head,
      angle: { from: -1.5, to: 2.5 },
      duration: 1700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    scene.tweens.add({
      targets: bob,
      y: { from: 0, to: -1.2 },
      duration: 1300,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  const label = scene.add.text(0, species === 'chicken' ? -44 : -62, name, {
    fontFamily: RANCH_FONT_BODY,
    fontSize: '9px',
    fontStyle: 'bold',
    color: '#fff1c9',
    backgroundColor: 'rgba(39, 25, 13, 0.82)',
    padding: { x: 5, y: 2 }
  }).setOrigin(0.5).setAlpha(0);
  root.add(label);

  root.setSize(species === 'chicken' ? 46 : 76, species === 'chicken' ? 44 : 58);
  root.setInteractive({ useHandCursor: true });

  return {
    root,
    label,
    face(direction: 1 | -1): void {
      flip.setScale(direction, 1);
    },
    setLabelVisible(visible: boolean): void {
      label.setAlpha(visible ? 1 : 0);
    }
  };
}
