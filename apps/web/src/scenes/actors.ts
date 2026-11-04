import Phaser from 'phaser';
import type { CharacterClassId, MonsterSpriteId } from '@mundo-perfeito/shared';

const OUTLINE = 0x0a131c;

interface Palette {
  primary: number;
  secondary: number;
  trim: number;
  sleeve: number;
  pants: number;
  boot: number;
  skin: number;
  hair: number;
  cape: number;
}

const PALETTES: Record<CharacterClassId, Palette> = {
  warrior: {
    primary: 0x7089ad,
    secondary: 0x4b5f7c,
    trim: 0xe7c168,
    sleeve: 0x5d7698,
    pants: 0x3c4b60,
    boot: 0x2c2622,
    skin: 0xe8b68f,
    hair: 0x4d3323,
    cape: 0x943c4a
  },
  mage: {
    primary: 0x6f4fc2,
    secondary: 0x4a3389,
    trim: 0xe7c168,
    sleeve: 0x6446ad,
    pants: 0x3c2f5c,
    boot: 0x2b2433,
    skin: 0xf0c7a6,
    hair: 0xf1ecdd,
    cape: 0x3b2a6e
  },
  priest: {
    primary: 0xd8e0e8,
    secondary: 0x8499ac,
    trim: 0xe7c168,
    sleeve: 0xa8b9c8,
    pants: 0x526477,
    boot: 0x2c2622,
    skin: 0xf0c7a6,
    hair: 0x7a5b42,
    cape: 0x4f7890
  },
  archer: {
    primary: 0x3f7d5f,
    secondary: 0x2e6049,
    trim: 0xc9a35f,
    sleeve: 0x3a7357,
    pants: 0x4a3a2c,
    boot: 0x2c241e,
    skin: 0xdfae86,
    hair: 0x6b4a2f,
    cape: 0x2a5742
  }
};

export class PlayerAvatar {
  readonly root: Phaser.GameObjects.Container;

  private readonly scene: Phaser.Scene;
  private readonly lunge: Phaser.GameObjects.Container;
  private readonly rig: Phaser.GameObjects.Container;
  private readonly flip: Phaser.GameObjects.Container;
  private readonly frontArm: Phaser.GameObjects.Container;
  private readonly legFront: Phaser.GameObjects.Container;
  private readonly legBack: Phaser.GameObjects.Container;
  private readonly hurtFlash: Phaser.GameObjects.Ellipse;

  private facing: 1 | -1 = 1;
  private recovering = false;
  private walkTween: Phaser.Tweens.Tween | null = null;
  private stepTweenA: Phaser.Tweens.Tween | null = null;
  private stepTweenB: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, classId: CharacterClassId, x: number, y: number) {
    this.scene = scene;
    const palette = PALETTES[classId];

    this.root = scene.add.container(x, y);

    const shadow = scene.add.ellipse(0, 2, 58, 18, 0x051015, 0.4);
    this.root.add(shadow);

    this.lunge = scene.add.container(0, 0);
    this.root.add(this.lunge);

    this.rig = scene.add.container(0, 0);
    this.lunge.add(this.rig);

    this.flip = scene.add.container(0, 0);
    this.rig.add(this.flip);

    // Peças traseiras
    const cape = buildCape(scene, palette, classId);
    this.flip.add(cape);

    this.legBack = this.buildLeg(-7, palette);
    this.flip.add(this.legBack);

    const backArm = this.buildArm(-18, palette, false);
    this.flip.add(backArm);

    if (classId === 'archer') {
      this.flip.add(buildQuiver(scene));
    }

    this.flip.add(this.buildTorso(palette, classId));

    this.legFront = this.buildLeg(8, palette);
    this.flip.add(this.legFront);

    const head = this.buildHead(palette, classId);
    this.flip.add(head);

    const weapon = this.buildWeapon(classId, palette);
    this.frontArm = this.buildArm(18, palette, true, weapon);
    this.flip.add(this.frontArm);

    this.frontArm.rotation = 0.08;

    this.hurtFlash = scene.add.ellipse(0, -58, 62, 96, 0xff5d5d, 0.5);
    this.hurtFlash.setAlpha(0);
    this.hurtFlash.setBlendMode(Phaser.BlendModes.ADD);
    this.rig.add(this.hurtFlash);

    scene.tweens.add({
      targets: this.rig,
      y: -2.5,
      duration: 1700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    scene.tweens.add({
      targets: this.frontArm,
      rotation: { from: 0.08, to: 0.16 },
      duration: 2100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  setFacing(direction: 1 | -1): void {
    if (this.facing === direction) {
      return;
    }
    this.facing = direction;
    this.flip.scaleX = direction;
  }

  faceTarget(targetX: number): void {
    this.setFacing(targetX >= this.root.x ? 1 : -1);
  }

  attack(targetX: number): void {
    this.faceTarget(targetX);
    const direction = this.facing;

    this.scene.tweens.add({
      targets: this.lunge,
      x: 26 * direction,
      duration: 100,
      yoyo: true,
      ease: 'Quad.easeOut'
    });

    this.scene.tweens.add({
      targets: this.frontArm,
      rotation: { from: 0.1, to: -1.75 },
      duration: 120,
      yoyo: true,
      ease: 'Quad.easeOut'
    });
  }

  hurt(): void {
    this.hurtFlash.setAlpha(0.45);
    this.scene.tweens.add({
      targets: this.hurtFlash,
      alpha: 0,
      duration: 260,
      ease: 'Quad.easeOut'
    });
    this.scene.tweens.add({
      targets: this.lunge,
      x: { from: -4, to: 0 },
      duration: 200,
      ease: 'Sine.easeOut'
    });
  }

  setRecovering(recovering: boolean): void {
    if (this.recovering === recovering) {
      return;
    }
    this.recovering = recovering;

    this.scene.tweens.add({
      targets: this.flip,
      alpha: recovering ? 0.45 : 1,
      angle: recovering ? 10 : 0,
      duration: 320,
      ease: 'Quad.easeOut'
    });
  }

  walkTo(x: number, y: number, duration: number): void {
    this.setFacing(x >= this.root.x ? 1 : -1);

    this.walkTween?.stop();
    this.stepTweenA?.stop();
    this.stepTweenB?.stop();

    this.walkTween = this.scene.tweens.add({
      targets: this.root,
      x,
      y,
      duration,
      ease: 'Sine.easeInOut'
    });

    this.stepTweenA = this.scene.tweens.add({
      targets: this.legFront,
      angle: { from: -11, to: 11 },
      duration: 180,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    this.stepTweenB = this.scene.tweens.add({
      targets: this.legBack,
      angle: { from: 11, to: -11 },
      duration: 180,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.scene.time.delayedCall(duration, () => {
      this.stepTweenA?.stop();
      this.stepTweenB?.stop();
      this.legFront.angle = 0;
      this.legBack.angle = 0;
    });
  }

  private buildLeg(x: number, palette: Palette): Phaser.GameObjects.Container {
    const leg = this.scene.add.container(x, -36);
    const g = this.scene.add.graphics();

    g.fillStyle(palette.pants, 1);
    g.lineStyle(2, OUTLINE, 1);
    g.fillRoundedRect(-5, 0, 10, 26, 4);
    g.strokeRoundedRect(-5, 0, 10, 26, 4);

    g.fillStyle(palette.boot, 1);
    g.fillRoundedRect(-6, 22, 14, 11, 4);
    g.strokeRoundedRect(-6, 22, 14, 11, 4);

    leg.add(g);
    return leg;
  }

  private buildArm(
    x: number,
    palette: Palette,
    front: boolean,
    weapon?: Phaser.GameObjects.Container
  ): Phaser.GameObjects.Container {
    const arm = this.scene.add.container(x, -64);
    const g = this.scene.add.graphics();

    g.fillStyle(front ? palette.sleeve : palette.secondary, 1);
    g.lineStyle(2, OUTLINE, 1);
    g.fillRoundedRect(-4.5, 0, 9, 22, 4);
    g.strokeRoundedRect(-4.5, 0, 9, 22, 4);

    g.fillStyle(palette.skin, 1);
    g.fillEllipse(0, 26, 10, 10);
    g.strokeEllipse(0, 26, 10, 10);

    arm.add(g);
    if (weapon) {
      arm.add(weapon);
    }
    return arm;
  }

  private buildTorso(palette: Palette, classId: CharacterClassId): Phaser.GameObjects.Container {
    const torso = this.scene.add.container(0, 0);
    const g = this.scene.add.graphics();

    g.fillStyle(palette.primary, 1);
    g.lineStyle(2.5, OUTLINE, 1);

    if (classId === 'mage' || classId === 'priest') {
      g.fillPoints(
        [
          { x: -14, y: -66 },
          { x: 14, y: -66 },
          { x: 21, y: -20 },
          { x: -21, y: -20 }
        ],
        true
      );
      g.strokePoints(
        [
          { x: -14, y: -66 },
          { x: 14, y: -66 },
          { x: 21, y: -20 },
          { x: -21, y: -20 }
        ],
        true
      );

      g.fillStyle(palette.secondary, 1);
      g.fillTriangle(-8, -60, 8, -60, 0, -30);

      g.fillStyle(palette.trim, 1);
      g.fillRect(-21, -25, 42, 5);
      g.fillStyle(0x7fe7ff, 1);
      g.fillTriangle(0, -58, -5, -48, 5, -48);
    } else {
      g.fillRoundedRect(-18, -68, 36, 36, 8);
      g.strokeRoundedRect(-18, -68, 36, 36, 8);

      if (classId === 'warrior') {
        g.fillStyle(palette.secondary, 1);
        g.fillRoundedRect(-17, -56, 34, 16, 6);
        g.strokeRoundedRect(-17, -56, 34, 16, 6);

        g.fillStyle(0x91a7c4, 1);
        g.fillEllipse(-19, -64, 18, 14);
        g.strokeEllipse(-19, -64, 18, 14);
        g.fillEllipse(19, -64, 18, 14);
        g.strokeEllipse(19, -64, 18, 14);

        g.fillStyle(palette.trim, 1);
        g.fillRect(-6, -60, 12, 4);
        g.fillRect(-18, -38, 36, 5);
        g.fillStyle(0xf3d887, 1);
        g.fillRect(-3, -39, 7, 7);
      } else {
        g.fillStyle(palette.secondary, 1);
        g.fillTriangle(-17, -68, 12, -68, 16, -40);
        g.lineStyle(3, palette.trim, 0.9);
        g.lineBetween(-13, -63, 11, -45);
        g.fillStyle(palette.trim, 1);
        g.fillRect(-18, -38, 36, 5);
        g.fillStyle(0x6b4a2c, 1);
        g.fillRoundedRect(8, -37, 10, 13, 3);
      }
    }

    torso.add(g);
    return torso;
  }

  private buildHead(palette: Palette, classId: CharacterClassId): Phaser.GameObjects.Container {
    const head = this.scene.add.container(0, -84);

    if (classId === 'archer') {
      const hood = this.scene.add.graphics();
      hood.fillStyle(palette.cape, 1);
      hood.lineStyle(2.5, OUTLINE, 1);
      hood.fillEllipse(0, -2, 32, 34);
      hood.strokeEllipse(0, -2, 32, 34);
      head.add(hood);
    }

    if (classId === 'mage') {
      const hair = this.scene.add.graphics();
      hair.fillStyle(palette.hair, 1);
      hair.fillEllipse(0, -5, 27, 22);
      head.add(hair);
    }

    const face = this.scene.add.graphics();
    face.fillStyle(palette.skin, 1);
    face.lineStyle(2, OUTLINE, 1);
    face.fillEllipse(1, 0, 25, 27);
    face.strokeEllipse(1, 0, 25, 27);

    face.fillStyle(0x2a1f1a, 1);
    face.fillEllipse(5, -2, 3.2, 4);
    face.fillEllipse(10, -2, 3.2, 4);
    face.lineStyle(1.5, 0x8a5b45, 1);
    face.lineBetween(6, 7, 10, 6);
    head.add(face);

    if (classId === 'warrior') {
      const helmet = this.scene.add.graphics();
      helmet.fillStyle(0x8298b8, 1);
      helmet.lineStyle(2, OUTLINE, 1);
      helmet.fillEllipse(0, -9, 32, 24);
      helmet.strokeEllipse(0, -9, 32, 24);
      helmet.fillRoundedRect(-15, -12, 30, 12, 4);
      helmet.fillStyle(0x6a7f9c, 1);
      helmet.fillRect(-14, -12, 5, 18);
      helmet.fillRect(11, -12, 5, 18);
      helmet.fillRect(1, -10, 4, 16);
      helmet.fillStyle(0xc94f52, 1);
      helmet.fillTriangle(-2, -22, 4, -40, 10, -20);
      helmet.fillStyle(palette.trim, 1);
      helmet.fillRect(-16, -8, 32, 3);
      head.add(helmet);
    }

    if (classId === 'mage') {
      const hat = this.scene.add.graphics();
      hat.fillStyle(0x53398f, 1);
      hat.lineStyle(2.5, OUTLINE, 1);
      hat.fillEllipse(0, -11, 36, 10);
      hat.strokeEllipse(0, -11, 36, 10);
      hat.fillTriangle(-13, -12, 1, -47, 14, -12);
      hat.strokeTriangle(-13, -12, 1, -47, 14, -12);
      hat.fillStyle(palette.trim, 1);
      hat.fillRect(-11, -16, 23, 5);
      hat.fillStyle(0xf7e7a8, 1);
      hat.fillTriangle(2, -35, -2, -28, 6, -28);
      head.add(hat);
    }

    if (classId === 'archer') {
      const hoodTrim = this.scene.add.graphics();
      hoodTrim.fillStyle(palette.primary, 1);
      hoodTrim.lineStyle(2, OUTLINE, 1);
      hoodTrim.fillTriangle(-16, 0, -8, -20, 4, -18);
      hoodTrim.fillTriangle(18, 2, 9, -18, -2, -19);
      hoodTrim.fillStyle(palette.trim, 1);
      hoodTrim.fillRect(-14, 12, 28, 4);
      head.add(hoodTrim);

      const hair = this.scene.add.graphics();
      hair.fillStyle(palette.hair, 1);
      hair.fillTriangle(-8, -10, 2, -16, 10, -8);
      head.add(hair);
    }

    return head;
  }

  private buildWeapon(
    classId: CharacterClassId,
    palette: Palette
  ): Phaser.GameObjects.Container {
    const weapon = this.scene.add.container(0, 24);
    const g = this.scene.add.graphics();

    if (classId === 'warrior') {
      g.fillStyle(0xdce8f5, 1);
      g.lineStyle(2, OUTLINE, 1);
      g.fillRoundedRect(-2.5, -44, 5, 44, 2);
      g.strokeRoundedRect(-2.5, -44, 5, 44, 2);
      g.fillTriangle(-2.5, -44, 0, -54, 2.5, -44);
      g.strokeTriangle(-2.5, -44, 0, -54, 2.5, -44);

      g.fillStyle(palette.trim, 1);
      g.fillRoundedRect(-9, -3, 18, 5, 2);
      g.fillEllipse(0, 15, 7, 7);

      g.fillStyle(0x5a3a24, 1);
      g.fillRoundedRect(-2, 2, 4, 12, 2);
    }

    if (classId === 'mage' || classId === 'priest') {
      g.fillStyle(0x5b3d2a, 1);
      g.lineStyle(2, OUTLINE, 1);
      g.fillRoundedRect(-2.5, -50, 5, 74, 2);
      g.strokeRoundedRect(-2.5, -50, 5, 74, 2);

      g.fillStyle(0x7fe7ff, 0.25);
      g.fillCircle(0, -55, 17);
      g.fillStyle(0x7fe7ff, 1);
      g.lineStyle(2, 0xd8fbff, 1);
      g.fillCircle(0, -55, 9);
      g.strokeCircle(0, -55, 9);

      g.lineStyle(2.5, palette.trim, 1);
      g.strokeCircle(0, -55, 13);

      this.scene.tweens.add({
        targets: weapon,
        rotation: { from: -0.04, to: 0.04 },
        duration: 1800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }

    if (classId === 'archer') {
      g.lineStyle(3.5, 0x8a6038, 1);
      g.beginPath();
      g.arc(0, 2, 25, Phaser.Math.DegToRad(-68), Phaser.Math.DegToRad(68), false);
      g.strokePath();

      const ax = Math.cos(Phaser.Math.DegToRad(-68)) * 25;
      const ay = 2 + Math.sin(Phaser.Math.DegToRad(-68)) * 25;
      const bx = Math.cos(Phaser.Math.DegToRad(68)) * 25;
      const by = 2 + Math.sin(Phaser.Math.DegToRad(68)) * 25;
      g.lineStyle(1, 0xd8e4ef, 0.9);
      g.lineBetween(ax, ay, bx, by);

      g.fillStyle(palette.trim, 1);
      g.fillCircle(0, 2, 3);
    }

    weapon.add(g);
    return weapon;
  }
}

export class MonsterView {
  readonly root: Phaser.GameObjects.Container;
  readonly height: number;

  private readonly scene: Phaser.Scene;
  private readonly rig: Phaser.GameObjects.Container;
  private readonly flash: Phaser.GameObjects.Ellipse;
  private readonly idleTweens: Phaser.Tweens.Tween[] = [];
  private readonly tail: Phaser.GameObjects.Container | null = null;
  private readonly head: Phaser.GameObjects.Container | null = null;
  private dead = false;

  constructor(scene: Phaser.Scene, sprite: MonsterSpriteId, x: number, y: number) {
    this.scene = scene;
    this.root = scene.add.container(x, y);

    const shadow = scene.add.ellipse(
      0,
      2,
      sprite === 'slime-king' ? 92 : 72,
      20,
      0x051015,
      0.42
    );
    this.root.add(shadow);

    this.rig = scene.add.container(0, 0);
    this.root.add(this.rig);

    let height = 64;
    let tail: Phaser.GameObjects.Container | null = null;
    let head: Phaser.GameObjects.Container | null = null;

    if (sprite === 'slime') {
      this.buildSlime();
      height = 64;
    } else if (sprite === 'slime-king') {
      this.buildSlimeKing();
      height = 112;
    } else if (sprite === 'boar') {
      head = this.buildBoar();
      height = 76;
      tail = this.buildTail(30, -42, 0x4a3020);
      this.rig.add(tail);
    } else {
      head = this.buildWolf();
      height = 80;
      tail = this.buildTail(30, -42, 0x556479);
      this.rig.add(tail);
    }

    this.height = height;
    this.head = head;
    this.tail = tail;

    this.flash = scene.add.ellipse(0, -height * 0.5, 68, height * 0.8, 0xffffff, 0.55);
    this.flash.setBlendMode(Phaser.BlendModes.ADD);
    this.flash.setAlpha(0);
    this.rig.add(this.flash);

    this.spawn();

    scene.time.delayedCall(420, () => {
      if (this.dead) {
        return;
      }
      this.startIdle();
    });
  }

  attack(): void {
    if (this.dead) {
      return;
    }
    this.scene.tweens.add({
      targets: this.rig,
      x: -22,
      duration: 110,
      yoyo: true,
      ease: 'Quad.easeOut'
    });
    if (this.head) {
      this.scene.tweens.add({
        targets: this.head,
        rotation: { from: 0, to: -0.18 },
        duration: 110,
        yoyo: true,
        ease: 'Quad.easeOut'
      });
    }
  }

  hurt(): void {
    if (this.dead) {
      return;
    }
    this.flash.setAlpha(0.62);
    this.scene.tweens.add({
      targets: this.flash,
      alpha: 0,
      duration: 240,
      ease: 'Quad.easeOut'
    });
    this.scene.tweens.add({
      targets: this.rig,
      x: { from: 6, to: 0 },
      duration: 220,
      ease: 'Elastic.easeOut'
    });
  }

  die(onComplete?: () => void): void {
    if (this.dead) {
      return;
    }
    this.dead = true;
    for (const tween of this.idleTweens) {
      tween.stop();
    }

    this.scene.tweens.add({
      targets: this.rig,
      y: 14,
      scaleX: 0.35,
      scaleY: 1.25,
      alpha: 0,
      duration: 360,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.root.destroy();
        onComplete?.();
      }
    });
  }

  destroy(): void {
    this.root.destroy();
  }

  private spawn(): void {
    this.rig.setScale(0.55);
    this.rig.setAlpha(0);
    this.rig.y = 18;

    this.scene.tweens.add({
      targets: this.rig,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      y: 0,
      duration: 340,
      ease: 'Back.easeOut'
    });
  }

  private startIdle(): void {
    this.idleTweens.push(
      this.scene.tweens.add({
        targets: this.rig,
        scaleX: 1.04,
        scaleY: 0.95,
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      })
    );

    if (this.tail) {
      this.idleTweens.push(
        this.scene.tweens.add({
          targets: this.tail,
          angle: { from: -10, to: 10 },
          duration: 1200,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        })
      );
    }

    if (this.head) {
      this.idleTweens.push(
        this.scene.tweens.add({
          targets: this.head,
          y: { from: 0, to: -2 },
          duration: 1500,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        })
      );
    }
  }

  private buildSlime(): void {
    const g = this.scene.add.graphics();
    g.fillStyle(0x5fb95f, 1);
    g.lineStyle(2.5, OUTLINE, 1);
    g.fillEllipse(0, -24, 66, 52);
    g.strokeEllipse(0, -24, 66, 52);

    g.fillStyle(0x81da74, 0.55);
    g.fillEllipse(0, -30, 46, 28);
    g.fillStyle(0xffffff, 0.3);
    g.fillEllipse(-11, -38, 17, 9);

    g.fillStyle(0x183521, 1);
    g.fillEllipse(-13, -30, 6, 8);
    g.fillEllipse(0, -33, 6, 8);
    g.fillStyle(0xffffff, 0.85);
    g.fillCircle(-14.5, -32, 1.6);
    g.fillCircle(-1.5, -35, 1.6);

    g.lineStyle(2, 0x1a3a24, 1);
    g.beginPath();
    g.arc(-7, -18, 7, Phaser.Math.DegToRad(20), Phaser.Math.DegToRad(160), false);
    g.strokePath();

    g.fillStyle(0x79c96f, 0.8);
    g.fillEllipse(24, -8, 12, 16);
    g.fillEllipse(-26, -6, 9, 12);

    this.rig.add(g);
  }

  private buildSlimeKing(): void {
    const aura = this.scene.add.ellipse(0, -40, 128, 112, 0xffc75a, 0.08);
    aura.setBlendMode(Phaser.BlendModes.ADD);
    this.rig.add(aura);

    const ring = this.scene.add.ellipse(0, -30, 108, 44, 0xffc75a, 0);
    ring.setStrokeStyle(2, 0xffc75a, 0.35);
    this.rig.add(ring);
    this.idleTweens.push(
      this.scene.tweens.add({
        targets: ring,
        scaleX: 1.12,
        scaleY: 1.12,
        alpha: { from: 0.5, to: 0 },
        duration: 1800,
        repeat: -1,
        ease: 'Sine.easeOut'
      })
    );

    const cape = this.scene.add.graphics();
    cape.fillStyle(0x5c2b65, 0.95);
    cape.lineStyle(2, OUTLINE, 1);
    cape.fillTriangle(-46, -34, 46, -34, 36, 6);
    cape.strokeTriangle(-46, -34, 46, -34, 36, 6);
    this.rig.add(cape);

    const g = this.scene.add.graphics();
    g.fillStyle(0x63c76d, 1);
    g.lineStyle(3, OUTLINE, 1);
    g.fillEllipse(0, -38, 96, 70);
    g.strokeEllipse(0, -38, 96, 70);

    g.fillStyle(0x8ee58c, 0.5);
    g.fillEllipse(0, -46, 66, 38);
    g.fillStyle(0xffffff, 0.24);
    g.fillEllipse(-18, -58, 24, 12);

    g.fillStyle(0x15331f, 1);
    g.fillEllipse(-17, -46, 8, 9);
    g.fillEllipse(4, -49, 8, 9);
    g.fillStyle(0xffd76a, 1);
    g.fillCircle(-18, -48, 2);
    g.fillCircle(3, -51, 2);

    g.lineStyle(3, 0x143420, 1);
    g.lineBetween(-26, -56, -10, -52);
    g.lineBetween(-4, -54, 12, -58);

    g.lineStyle(2.5, 0x143420, 1);
    g.beginPath();
    g.arc(-8, -28, 11, Phaser.Math.DegToRad(20), Phaser.Math.DegToRad(160), false);
    g.strokePath();

    g.fillStyle(0xf7d778, 1);
    g.lineStyle(2, OUTLINE, 1);
    g.fillTriangle(-30, -70, -20, -92, -10, -70);
    g.fillTriangle(-12, -70, 0, -98, 12, -70);
    g.fillTriangle(10, -70, 22, -92, 32, -70);
    g.fillRect(-32, -73, 64, 9);
    g.fillStyle(0xe88a5a, 1);
    g.fillCircle(0, -78, 3.5);

    this.rig.add(g);
  }

  private buildBoar(): Phaser.GameObjects.Container {
    const legs = this.scene.add.graphics();
    legs.fillStyle(0x5a3a26, 1);
    legs.lineStyle(2, OUTLINE, 1);
    for (const x of [-24, -8, 12, 26]) {
      legs.fillRoundedRect(x, -16, 9, 18, 4);
      legs.strokeRoundedRect(x, -16, 9, 18, 4);
    }
    this.rig.add(legs);

    const body = this.scene.add.graphics();
    body.fillStyle(0x8a5b3c, 1);
    body.lineStyle(2.5, OUTLINE, 1);
    body.fillEllipse(0, -34, 78, 46);
    body.strokeEllipse(0, -34, 78, 46);

    body.fillStyle(0x6b4329, 1);
    for (let i = 0; i < 5; i += 1) {
      const sx = -22 + i * 12;
      body.fillTriangle(sx, -56, sx + 6, -70, sx + 11, -54);
    }

    body.fillStyle(0xa97850, 0.4);
    body.fillEllipse(-4, -26, 40, 16);

    body.fillStyle(0x4a3020, 1);
    body.fillEllipse(37, -46, 7, 10);
    this.rig.add(body);

    const head = this.scene.add.container(-37, -42);

    const headG = this.scene.add.graphics();
    headG.fillStyle(0x936243, 1);
    headG.lineStyle(2.5, OUTLINE, 1);
    headG.fillEllipse(0, 0, 36, 34);
    headG.strokeEllipse(0, 0, 36, 34);

    headG.fillStyle(0xb47f5d, 1);
    headG.fillEllipse(-16, 4, 18, 14);
    headG.strokeEllipse(-16, 4, 18, 14);
    headG.fillStyle(0x5a3827, 1);
    headG.fillCircle(-19, 3, 1.6);
    headG.fillCircle(-13, 3, 1.6);

    headG.fillStyle(0xf2ead6, 1);
    headG.lineStyle(1.5, 0x8e7a63, 1);
    headG.fillTriangle(-23, 9, -30, 17, -17, 12);
    headG.fillTriangle(-12, 10, -6, 18, -4, 8);

    headG.fillStyle(0x7a5037, 1);
    headG.fillTriangle(-8, -14, 2, -26, 8, -12);
    headG.fillTriangle(-20, -16, -13, -28, -6, -14);

    headG.fillStyle(0xff8d5a, 1);
    headG.fillEllipse(4, -6, 5, 4);
    headG.fillStyle(0x1a0d0a, 1);
    headG.fillCircle(4, -6, 1.6);

    head.add(headG);
    this.rig.add(head);
    return head;
  }

  private buildWolf(): Phaser.GameObjects.Container {
    const legs = this.scene.add.graphics();
    legs.fillStyle(0x4f5a6b, 1);
    legs.lineStyle(2, OUTLINE, 1);
    for (const x of [-24, -10, 8, 22]) {
      legs.fillRoundedRect(x, -20, 9, 22, 4);
      legs.strokeRoundedRect(x, -20, 9, 22, 4);
      legs.fillStyle(0x3d4757, 1);
      legs.fillRoundedRect(x + 1, -4, 9, 6, 3);
      legs.fillStyle(0x4f5a6b, 1);
    }
    this.rig.add(legs);

    const body = this.scene.add.graphics();
    body.fillStyle(0x778699, 1);
    body.lineStyle(2.5, OUTLINE, 1);
    body.fillEllipse(-2, -32, 80, 38);
    body.strokeEllipse(-2, -32, 80, 38);

    body.fillStyle(0x5d6b7e, 1);
    body.fillEllipse(20, -40, 30, 18);
    body.fillStyle(0x9fabb9, 1);
    body.fillEllipse(-10, -26, 38, 14);

    // Juba no dorso
    body.fillStyle(0x64748a, 1);
    body.fillTriangle(-24, -52, -14, -66, -6, -50);
    body.fillTriangle(-8, -56, 4, -70, 14, -52);
    body.fillTriangle(8, -56, 20, -66, 28, -50);
    body.fillTriangle(24, -52, 34, -62, 38, -48);
    this.rig.add(body);

    const head = this.scene.add.container(-40, -40);
    const headG = this.scene.add.graphics();

    // Crânio
    headG.fillStyle(0x7d8c9f, 1);
    headG.lineStyle(2.5, OUTLINE, 1);
    headG.fillEllipse(0, 0, 34, 32);
    headG.strokeEllipse(0, 0, 34, 32);

    // Focinho alongado
    headG.fillStyle(0x9aa8b7, 1);
    headG.fillRoundedRect(-32, -5, 24, 17, 7);
    headG.strokeRoundedRect(-32, -5, 24, 17, 7);

    headG.fillStyle(0x2a1d16, 1);
    headG.fillEllipse(-31, 1, 5.5, 4.5);

    headG.lineStyle(1.5, 0x3b2a22, 1);
    headG.lineBetween(-20, 11, -29, 11);

    // Olho
    headG.fillStyle(0xffd76a, 1);
    headG.fillEllipse(-9, -7, 7, 4.5);
    headG.fillStyle(0x1a120c, 1);
    headG.fillEllipse(-8, -7, 2.2, 3.8);

    // Orelhas
    headG.fillStyle(0x6c7a8c, 1);
    headG.lineStyle(2, OUTLINE, 1);
    headG.fillTriangle(-12, -13, -5, -33, 3, -12);
    headG.strokeTriangle(-12, -13, -5, -33, 3, -12);
    headG.fillTriangle(3, -13, 11, -31, 18, -10);
    headG.strokeTriangle(3, -13, 11, -31, 18, -10);
    headG.fillStyle(0x9aa8b7, 1);
    headG.fillTriangle(-7, -15, -5, -27, 0, -15);
    headG.fillTriangle(6, -14, 11, -26, 15, -12);

    // Presas
    headG.fillStyle(0xf2ead6, 1);
    headG.fillTriangle(-22, 9, -19, 16, -16, 9);
    headG.fillTriangle(-12, 9, -9, 15, -6, 8);

    head.add(headG);
    this.rig.add(head);
    return head;
  }

  private buildTail(x: number, y: number, color: number): Phaser.GameObjects.Container {
    const tail = this.scene.add.container(x, y);
    const g = this.scene.add.graphics();
    g.fillStyle(color, 1);
    g.lineStyle(2, OUTLINE, 1);
    g.fillTriangle(0, 0, 26, -12, 20, 10);
    g.strokeTriangle(0, 0, 26, -12, 20, 10);
    tail.add(g);
    return tail;
  }
}

function buildCape(
  scene: Phaser.Scene,
  palette: Palette,
  classId: CharacterClassId
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(palette.cape, classId === 'mage' || classId === 'priest' ? 0.9 : 0.95);
  g.lineStyle(2, OUTLINE, 1);

  if (classId === 'warrior') {
    const points = [
      { x: -16, y: -66 },
      { x: 14, y: -66 },
      { x: 22, y: -18 },
      { x: 4, y: -8 },
      { x: -18, y: -22 }
    ];
    g.fillPoints(points, true);
    g.strokePoints(points, true);
  } else if (classId === 'mage') {
    g.fillPoints(
      [
        { x: -14, y: -64 },
        { x: 13, y: -64 },
        { x: 26, y: -14 },
        { x: -24, y: -12 }
      ],
      true
    );
  } else {
    g.fillPoints(
      [
        { x: -15, y: -64 },
        { x: 14, y: -62 },
        { x: 24, y: -26 },
        { x: -22, y: -24 }
      ],
      true
    );
  }

  return g;
}

function buildQuiver(scene: Phaser.Scene): Phaser.GameObjects.Container {
  const quiver = scene.add.container(12, -48);
  quiver.rotation = -0.35;

  const g = scene.add.graphics();
  g.fillStyle(0x5c4028, 1);
  g.lineStyle(2, OUTLINE, 1);
  g.fillRoundedRect(-6, -14, 12, 30, 4);
  g.strokeRoundedRect(-6, -14, 12, 30, 4);

  g.lineStyle(2, 0xc9a35f, 1);
  g.lineBetween(-6, 8, 6, 8);

  g.fillStyle(0xd9e4ef, 1);
  g.fillRect(-4, -26, 2, 14);
  g.fillRect(1, -29, 2, 17);

  g.fillStyle(0xc94f52, 1);
  g.fillTriangle(-6, -26, -2, -30, 0, -24);
  g.fillTriangle(-1, -29, 3, -33, 5, -26);

  quiver.add(g);
  return quiver;
}
