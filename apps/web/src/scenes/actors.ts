import Phaser from 'phaser';
import type {
  CharacterClassId,
  MonsterSpriteId,
  MonsterVariant
} from '@mundo-perfeito/shared';

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
  private readonly classId: CharacterClassId;
  private readonly lunge: Phaser.GameObjects.Container;
  private readonly rig: Phaser.GameObjects.Container;
  private readonly flip: Phaser.GameObjects.Container;
  private readonly head: Phaser.GameObjects.Container;
  private readonly frontArm: Phaser.GameObjects.Container;
  private readonly legFront: Phaser.GameObjects.Container;
  private readonly legBack: Phaser.GameObjects.Container;
  private readonly hurtFlash: Phaser.GameObjects.Ellipse;

  private facing: 1 | -1 = 1;
  private facingY: -1 | 0 | 1 = 0;
  private faceDetails: Phaser.GameObjects.Graphics | null = null;
  private backHead: Phaser.GameObjects.Ellipse | null = null;
  private recovering = false;
  private walkTween: Phaser.Tweens.Tween | null = null;
  private stepTweenA: Phaser.Tweens.Tween | null = null;
  private stepTweenB: Phaser.Tweens.Tween | null = null;
  private walking = false;

  constructor(scene: Phaser.Scene, classId: CharacterClassId, x: number, y: number) {
    this.scene = scene;
    this.classId = classId;
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
    this.head = head;
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

  private setFacingY(direction: -1 | 0 | 1): void {
    if (this.facingY === direction) {
      return;
    }
    this.facingY = direction;
    this.faceDetails?.setVisible(direction >= 0);
    this.backHead?.setVisible(direction < 0);
    this.head.setScale(direction < 0 ? 0.9 : 1, 1);
    this.scene.tweens.add({
      targets: this.rig,
      angle: direction === 0 ? 0 : direction < 0 ? -2.5 : 2.5,
      duration: 160,
      ease: 'Sine.easeOut'
    });
  }

  faceTarget(targetX: number): void {
    this.facePoint(targetX, this.root.y);
  }

  facePoint(x: number, y: number): void {
    const dx = x - this.root.x;
    const dy = y - this.root.y;
    this.setFacing(dx >= 0 ? 1 : -1);
    const vertical: -1 | 0 | 1 =
      Math.abs(dy) > Math.abs(dx) * 0.5 ? (dy < 0 ? -1 : 1) : 0;
    this.setFacingY(vertical);
  }

  setWalking(walking: boolean): void {
    if (this.walking === walking) return;
    this.walking = walking;
    this.stepTweenA?.stop();
    this.stepTweenB?.stop();
    this.stepTweenA = null;
    this.stepTweenB = null;
    if (!walking) {
      this.legFront.angle = 0;
      this.legBack.angle = 0;
      return;
    }
    this.stepTweenA = this.scene.tweens.add({
      targets: this.legFront,
      angle: { from: -18, to: 18 },
      duration: 190,
      yoyo: true,
      repeat: -1,
      ease: 'Linear'
    });
    this.stepTweenB = this.scene.tweens.add({
      targets: this.legBack,
      angle: { from: 18, to: -18 },
      duration: 190,
      yoyo: true,
      repeat: -1,
      ease: 'Linear'
    });
  }

  attack(targetX: number, targetY?: number): void {
    this.facePoint(targetX, targetY ?? this.root.y);
    const direction = this.facing;
    const vertical = this.facingY;

    this.scene.tweens.add({
      targets: this.lunge,
      x: 26 * direction,
      y: vertical * 10,
      duration: 100,
      yoyo: true,
      ease: 'Quad.easeOut'
    });

    const swing = this.classId === 'warrior' ? -1.45
      : this.classId === 'archer' ? -0.62 : -0.92;
    this.scene.tweens.add({
      targets: this.frontArm,
      rotation: { from: this.frontArm.rotation, to: swing },
      duration: this.classId === 'archer' ? 105 : 145,
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

  dodge(): void {
    if (this.recovering) {
      return;
    }
    const direction = this.facing;
    this.scene.tweens.add({
      targets: this.lunge,
      x: -24 * direction,
      y: this.facingY * 8,
      duration: 90,
      yoyo: true,
      ease: 'Quad.easeOut'
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
    this.walkTween?.stop();
    this.setFacing(x >= this.root.x ? 1 : -1);
    this.setWalking(true);
    this.walkTween = this.scene.tweens.add({
      targets: this.root,
      x,
      y,
      duration,
      ease: 'Linear',
      onUpdate: () => this.root.setDepth(300 + this.root.y),
      onComplete: () => {
        this.walkTween = null;
        this.setWalking(false);
      }
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

    // Parte de trás da cabeça: aparece quando o herói vira de costas.
    const backColor = classId === 'archer' ? palette.cape : palette.hair;
    this.backHead = this.scene.add.ellipse(1, 0, 24, 26, backColor, 1);
    this.backHead.setStrokeStyle(2, OUTLINE, 1);
    this.backHead.setVisible(false);
    head.add(this.backHead);

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
    this.faceDetails = face;
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
      // Lâmina larga com ponta, fio claro e nervura central para ficar legível em batalha.
      g.fillStyle(0x9eafc4, 1);
      g.lineStyle(2, OUTLINE, 1);
      g.fillPoints([
        { x: -6, y: -58 }, { x: 0, y: -72 }, { x: 6, y: -58 },
        { x: 5, y: -12 }, { x: -5, y: -12 }
      ], true);
      g.strokePoints([
        { x: -6, y: -58 }, { x: 0, y: -72 }, { x: 6, y: -58 },
        { x: 5, y: -12 }, { x: -5, y: -12 }
      ], true);
      g.lineStyle(1.5, 0xf4f7fb, 0.95);
      g.lineBetween(-2, -60, -2, -16);
      g.fillStyle(palette.trim, 1);
      g.lineStyle(2, OUTLINE, 1);
      g.fillRoundedRect(-13, -13, 26, 6, 2);
      g.strokeRoundedRect(-13, -13, 26, 6, 2);
      g.fillStyle(0x5a3a24, 1);
      g.fillRoundedRect(-3.5, -7, 7, 18, 2);
      g.lineStyle(1, 0xc59b5c, 1);
      g.lineBetween(-2, -5, 2, 8);
      g.fillStyle(palette.trim, 1);
      g.fillCircle(0, 14, 5);
      g.lineStyle(1.5, OUTLINE, 1);
      g.strokeCircle(0, 14, 5);
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
      // Arco recurvo na mão: empunhadura, duas lâminas e corda bem visíveis.
      const top = { x: 13, y: -34 };
      const bottom = { x: 13, y: 34 };
      g.lineStyle(5, 0x4a2d19, 1);
      g.beginPath();
      g.arc(-2, 0, 37, Phaser.Math.DegToRad(-72), Phaser.Math.DegToRad(72), false);
      g.strokePath();
      g.lineStyle(2, 0xc18a4d, 1);
      g.beginPath();
      g.arc(-2, 0, 34, Phaser.Math.DegToRad(-72), Phaser.Math.DegToRad(72), false);
      g.strokePath();
      g.lineStyle(1.5, 0xe8e4d9, 1);
      g.lineBetween(top.x, top.y, bottom.x, bottom.y);
      g.lineStyle(3, palette.trim, 1);
      g.lineBetween(-1, -8, 5, 8);
      g.lineStyle(2, 0x5a3a24, 1);
      g.lineBetween(-2, 0, 31, 0);
      g.fillStyle(0xdce8f5, 1);
      g.fillTriangle(31, 0, 24, -3.5, 24, 3.5);
      g.fillStyle(palette.trim, 1);
      g.fillCircle(1, 0, 4);
      g.lineStyle(1.5, OUTLINE, 1);
      g.strokeCircle(1, 0, 4);
    }

    weapon.add(g);
    return weapon;
  }
}

export interface MonsterViewOptions {
  variant?: MonsterVariant;
  tint?: number;
  accent?: number;
  scale?: number;
  isBoss?: boolean;
}

export class MonsterView {
  readonly root: Phaser.GameObjects.Container;
  readonly height: number;

  private readonly scene: Phaser.Scene;
  private readonly facingRig: Phaser.GameObjects.Container;
  private readonly rig: Phaser.GameObjects.Container;
  private readonly flash: Phaser.GameObjects.Ellipse;
  private readonly idleTweens: Phaser.Tweens.Tween[] = [];
  private readonly tail: Phaser.GameObjects.Container | null = null;
  private readonly head: Phaser.GameObjects.Container | null = null;
  private readonly baseScale: number;
  private facing: 1 | -1 = 1;
  private dead = false;

  constructor(
    scene: Phaser.Scene,
    sprite: MonsterSpriteId,
    x: number,
    y: number,
    options: MonsterViewOptions = {}
  ) {
    this.scene = scene;
    this.root = scene.add.container(x, y);
    this.baseScale = options.scale ?? (options.isBoss ? 1.18 : 1);

    const shadow = scene.add.ellipse(
      0,
      2,
      (sprite === 'slime-king' ? 92 : sprite === 'dragon' || sprite === 'construct' ? 116 : 72) * this.baseScale,
      20 * this.baseScale,
      0x051015,
      0.4
    );
    this.root.add(shadow);

    this.facingRig = scene.add.container(0, 0);
    this.root.add(this.facingRig);

    this.rig = scene.add.container(0, 0);
    this.facingRig.add(this.rig);

    const tint = options.tint ?? 0x778699;
    const accent = options.accent ?? 0xf4d58d;
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
      head = this.buildBoar(tint, accent);
      height = 76;
      tail = this.buildTail(30, -42, tint);
      this.rig.add(tail);
    } else if (sprite === 'wolf') {
      head = this.buildWolf(tint, accent);
      height = 80;
      tail = this.buildTail(30, -42, tint);
      this.rig.add(tail);
    } else if (sprite === 'beast') {
      const built = this.buildBeast(options.variant, tint, accent);
      height = built.height;
      head = built.head;
      tail = built.tail;
    } else if (sprite === 'humanoid') {
      const built = this.buildHumanoid(options.variant, tint, accent);
      height = built.height;
      head = built.head;
    } else if (sprite === 'undead') {
      const built = this.buildUndead(options.variant, tint, accent);
      height = built.height;
      head = built.head;
    } else if (sprite === 'spirit') {
      const built = this.buildSpirit(options.variant, tint, accent);
      height = built.height;
      head = built.head;
    } else if (sprite === 'construct') {
      const built = this.buildConstruct(options.variant, tint, accent);
      height = built.height;
      head = built.head;
    } else if (sprite === 'dragon') {
      const built = this.buildDragon(options.variant, tint, accent);
      height = built.height;
      head = built.head;
      tail = built.tail;
    } else {
      const built = this.buildDemon(options.variant, tint, accent);
      height = built.height;
      head = built.head;
      tail = built.tail;
    }

    this.height = height * this.baseScale;
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

  setFacing(direction: 1 | -1): void {
    if (this.facing === direction) {
      return;
    }
    this.facing = direction;
    this.facingRig.scaleX = direction;
  }

  facePoint(x: number): void {
    this.setFacing(x >= this.root.x ? 1 : -1);
  }

  attack(targetX?: number, targetY?: number): void {
    if (this.dead) {
      return;
    }
    if (targetX !== undefined) {
      this.setFacing(targetX >= this.root.x ? 1 : -1);
    }
    const vertical =
      targetY !== undefined
        ? Phaser.Math.Clamp((targetY - this.root.y) / 90, -1, 1)
        : 0;
    this.scene.tweens.add({
      targets: this.rig,
      x: -22,
      y: vertical * 10,
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
    for (const tween of this.idleTweens) {
      tween.stop();
    }
    this.root.destroy();
  }

  private spawn(): void {
    this.rig.setScale(this.baseScale * 0.55);
    this.rig.setAlpha(0);
    this.rig.y = 18;

    this.scene.tweens.add({
      targets: this.rig,
      scaleX: this.baseScale,
      scaleY: this.baseScale,
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
        scaleX: this.baseScale * 1.04,
        scaleY: this.baseScale * 0.95,
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

  private buildBoar(tint = 0x8a5b3c, accent = 0xf2ead6): Phaser.GameObjects.Container {
    const legs = this.scene.add.graphics();
    legs.fillStyle(shade(tint, 0.7), 1);
    legs.lineStyle(2, OUTLINE, 1);
    for (const x of [-24, -8, 12, 26]) {
      legs.fillRoundedRect(x, -16, 9, 18, 4);
      legs.strokeRoundedRect(x, -16, 9, 18, 4);
    }
    this.rig.add(legs);

    const body = this.scene.add.graphics();
    body.fillStyle(tint, 1);
    body.lineStyle(2.5, OUTLINE, 1);
    body.fillEllipse(0, -34, 78, 46);
    body.strokeEllipse(0, -34, 78, 46);

    body.fillStyle(shade(tint, 0.78), 1);
    for (let i = 0; i < 5; i += 1) {
      const sx = -22 + i * 12;
      body.fillTriangle(sx, -56, sx + 6, -70, sx + 11, -54);
    }

    body.fillStyle(shade(tint, 1.16), 0.4);
    body.fillEllipse(-4, -26, 40, 16);

    body.fillStyle(shade(tint, 0.58), 1);
    body.fillEllipse(37, -46, 7, 10);
    this.rig.add(body);

    const head = this.scene.add.container(-37, -42);

    const headG = this.scene.add.graphics();
    headG.fillStyle(shade(tint, 1.1), 1);
    headG.lineStyle(2.5, OUTLINE, 1);
    headG.fillEllipse(0, 0, 36, 34);
    headG.strokeEllipse(0, 0, 36, 34);

    headG.fillStyle(shade(tint, 1.24), 1);
    headG.fillEllipse(-16, 4, 18, 14);
    headG.strokeEllipse(-16, 4, 18, 14);
    headG.fillStyle(shade(tint, 0.55), 1);
    headG.fillCircle(-19, 3, 1.6);
    headG.fillCircle(-13, 3, 1.6);

    headG.fillStyle(accent, 1);
    headG.lineStyle(1.5, shade(accent, 0.7), 1);
    headG.fillTriangle(-23, 9, -30, 17, -17, 12);
    headG.fillTriangle(-12, 10, -6, 18, -4, 8);

    headG.fillStyle(shade(tint, 0.8), 1);
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

  private buildWolf(tint = 0x778699, accent = 0xffd76a): Phaser.GameObjects.Container {
    const legs = this.scene.add.graphics();
    legs.fillStyle(shade(tint, 0.72), 1);
    legs.lineStyle(2, OUTLINE, 1);
    for (const x of [-24, -10, 8, 22]) {
      legs.fillRoundedRect(x, -20, 9, 22, 4);
      legs.strokeRoundedRect(x, -20, 9, 22, 4);
      legs.fillStyle(shade(tint, 0.58), 1);
      legs.fillRoundedRect(x + 1, -4, 9, 6, 3);
      legs.fillStyle(shade(tint, 0.72), 1);
    }
    this.rig.add(legs);

    const body = this.scene.add.graphics();
    body.fillStyle(tint, 1);
    body.lineStyle(2.5, OUTLINE, 1);
    body.fillEllipse(-2, -32, 80, 38);
    body.strokeEllipse(-2, -32, 80, 38);

    body.fillStyle(shade(tint, 0.8), 1);
    body.fillEllipse(20, -40, 30, 18);
    body.fillStyle(shade(tint, 1.24), 1);
    body.fillEllipse(-10, -26, 38, 14);

    // Juba no dorso
    body.fillStyle(shade(tint, 0.86), 1);
    body.fillTriangle(-24, -52, -14, -66, -6, -50);
    body.fillTriangle(-8, -56, 4, -70, 14, -52);
    body.fillTriangle(8, -56, 20, -66, 28, -50);
    body.fillTriangle(24, -52, 34, -62, 38, -48);
    this.rig.add(body);

    const head = this.scene.add.container(-40, -40);
    const headG = this.scene.add.graphics();

    // Crânio
    headG.fillStyle(shade(tint, 1.06), 1);
    headG.lineStyle(2.5, OUTLINE, 1);
    headG.fillEllipse(0, 0, 34, 32);
    headG.strokeEllipse(0, 0, 34, 32);

    // Focinho alongado
    headG.fillStyle(shade(tint, 1.22), 1);
    headG.fillRoundedRect(-32, -5, 24, 17, 7);
    headG.strokeRoundedRect(-32, -5, 24, 17, 7);

    headG.fillStyle(0x2a1d16, 1);
    headG.fillEllipse(-31, 1, 5.5, 4.5);

    headG.lineStyle(1.5, 0x3b2a22, 1);
    headG.lineBetween(-20, 11, -29, 11);

    // Olho
    headG.fillStyle(accent, 1);
    headG.fillEllipse(-9, -7, 7, 4.5);
    headG.fillStyle(0x1a120c, 1);
    headG.fillEllipse(-8, -7, 2.2, 3.8);

    // Orelhas
    headG.fillStyle(shade(tint, 0.9), 1);
    headG.lineStyle(2, OUTLINE, 1);
    headG.fillTriangle(-12, -13, -5, -33, 3, -12);
    headG.strokeTriangle(-12, -13, -5, -33, 3, -12);
    headG.fillTriangle(3, -13, 11, -31, 18, -10);
    headG.strokeTriangle(3, -13, 11, -31, 18, -10);
    headG.fillStyle(shade(tint, 1.28), 1);
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

  private buildBeast(
    variant: MonsterVariant | undefined,
    tint: number,
    accent: number
  ): { height: number; head: Phaser.GameObjects.Container | null; tail: Phaser.GameObjects.Container | null } {
    if (variant === 'spider') {
      const legs = this.scene.add.graphics();
      legs.lineStyle(3.5, shade(tint, 0.72), 1);
      for (let i = 0; i < 4; i += 1) {
        const y = -38 + i * 8;
        legs.lineBetween(-16, y, -48, y - 18);
        legs.lineBetween(-16, y, -44, y + 12);
        legs.lineBetween(16, y, 48, y - 18);
        legs.lineBetween(16, y, 44, y + 12);
      }
      this.rig.add(legs);

      const body = this.scene.add.graphics();
      body.fillStyle(shade(tint, 0.78), 1);
      body.lineStyle(2.5, OUTLINE, 1);
      body.fillEllipse(22, -40, 56, 48);
      body.strokeEllipse(22, -40, 56, 48);
      body.fillStyle(tint, 1);
      body.fillEllipse(-12, -36, 44, 38);
      body.strokeEllipse(-12, -36, 44, 38);
      body.fillStyle(accent, 0.9);
      for (let i = 0; i < 3; i += 1) {
        body.fillTriangle(20 + i * 9 - 9, -54, 22 + i * 9, -66, 26 + i * 9, -52);
      }
      this.rig.add(body);

      const head = this.scene.add.container(-34, -30);
      const headG = this.scene.add.graphics();
      headG.fillStyle(shade(tint, 1.08), 1);
      headG.lineStyle(2, OUTLINE, 1);
      headG.fillEllipse(0, 0, 28, 24);
      headG.strokeEllipse(0, 0, 28, 24);
      headG.fillStyle(accent, 1);
      for (const [ex, ey, r] of [[-10, -5, 2.4], [-3, -7, 1.9], [-10, 1, 1.9], [-3, 1, 2.4], [-15, -2, 1.5], [1, -3, 1.5]] as Array<[number, number, number]>) {
        headG.fillCircle(ex, ey, r);
      }
      headG.fillStyle(0xe8e2d2, 1);
      headG.fillTriangle(-13, 7, -18, 15, -8, 10);
      headG.fillTriangle(-5, 8, -1, 15, 1, 7);
      head.add(headG);
      this.rig.add(head);
      return { height: 76, head, tail: null };
    }

    if (variant === 'scorpion') {
      const legs = this.scene.add.graphics();
      legs.lineStyle(3, shade(tint, 0.68), 1);
      for (let i = 0; i < 4; i += 1) {
        const y = -32 + i * 7;
        legs.lineBetween(-12, y, -42, y - 12);
        legs.lineBetween(12, y, 42, y - 12);
      }
      this.rig.add(legs);

      const body = this.scene.add.graphics();
      body.fillStyle(tint, 1);
      body.lineStyle(2.5, OUTLINE, 1);
      body.fillEllipse(0, -38, 70, 42);
      body.strokeEllipse(0, -38, 70, 42);
      body.fillStyle(shade(tint, 1.2), 0.65);
      body.fillEllipse(-4, -44, 38, 16);

      body.fillStyle(shade(tint, 0.85), 1);
      body.fillEllipse(-38, -30, 24, 18);
      body.strokeEllipse(-38, -30, 24, 18);
      body.fillTriangle(-50, -28, -62, -38, -56, -20);
      body.fillTriangle(-32, -22, -42, -8, -24, -12);
      body.fillStyle(accent, 0.9);
      body.fillCircle(-40, -34, 2.4);
      this.rig.add(body);

      const tail = this.scene.add.container(34, -50);
      const tailG = this.scene.add.graphics();
      tailG.lineStyle(7, shade(tint, 0.82), 1);
      tailG.beginPath();
      tailG.arc(0, 0, 28, Phaser.Math.DegToRad(-90), Phaser.Math.DegToRad(110), false);
      tailG.strokePath();
      tailG.fillStyle(accent, 1);
      tailG.lineStyle(2, OUTLINE, 1);
      tailG.fillTriangle(18, -24, 34, -34, 30, -14);
      tail.add(tailG);
      this.rig.add(tail);
      return { height: 90, head: null, tail };
    }

    if (variant === 'serpent') {
      const body = this.scene.add.graphics();
      body.fillStyle(shade(tint, 0.8), 1);
      body.lineStyle(2.5, OUTLINE, 1);
      body.fillEllipse(22, -20, 94, 26);
      body.strokeEllipse(22, -20, 94, 26);
      body.fillStyle(tint, 1);
      body.fillEllipse(-10, -30, 74, 34);
      body.strokeEllipse(-10, -30, 74, 34);
      body.fillStyle(shade(tint, 1.18), 0.55);
      body.fillEllipse(-14, -38, 40, 12);
      body.fillStyle(accent, 0.8);
      body.fillCircle(20, -22, 3);
      body.fillCircle(36, -20, 2.4);
      this.rig.add(body);

      const head = this.scene.add.container(-44, -58);
      const headG = this.scene.add.graphics();
      headG.fillStyle(shade(tint, 1.16), 1);
      headG.lineStyle(2.5, OUTLINE, 1);
      headG.fillEllipse(0, 0, 34, 26);
      headG.strokeEllipse(0, 0, 34, 26);
      headG.fillStyle(shade(tint, 1.28), 1);
      headG.fillTriangle(-4, -10, 4, -24, 10, -8);
      headG.fillStyle(accent, 1);
      headG.fillEllipse(-8, -4, 6, 5);
      headG.fillStyle(0x1a100c, 1);
      headG.fillEllipse(-8, -4, 2, 3.4);
      headG.lineStyle(2, 0xff5d7a, 1);
      headG.lineBetween(-17, 6, -30, 12);
      headG.lineBetween(-30, 12, -36, 9);
      head.add(headG);
      this.rig.add(head);
      return { height: 84, head, tail: null };
    }

    if (variant === 'yeti') {
      const legs = this.scene.add.graphics();
      legs.fillStyle(shade(tint, 0.72), 1);
      legs.lineStyle(2.5, OUTLINE, 1);
      legs.fillRoundedRect(-30, -32, 22, 34, 8);
      legs.strokeRoundedRect(-30, -32, 22, 34, 8);
      legs.fillRoundedRect(8, -32, 22, 34, 8);
      legs.strokeRoundedRect(8, -32, 22, 34, 8);
      legs.fillStyle(accent, 1);
      legs.fillEllipse(-19, 0, 24, 8);
      legs.fillEllipse(19, 0, 24, 8);
      this.rig.add(legs);

      const body = this.scene.add.graphics();
      body.fillStyle(tint, 1);
      body.lineStyle(3, OUTLINE, 1);
      body.fillEllipse(0, -62, 82, 76);
      body.strokeEllipse(0, -62, 82, 76);
      body.fillStyle(shade(tint, 1.15), 0.45);
      body.fillEllipse(-8, -58, 44, 48);
      body.fillStyle(shade(tint, 0.8), 1);
      for (let i = 0; i < 7; i += 1) {
        body.fillTriangle(-36 + i * 12, -74, -30 + i * 12, -44, -24 + i * 12, -72);
      }
      body.fillStyle(shade(tint, 0.8), 1);
      body.fillRoundedRect(-54, -86, 22, 58, 10);
      body.fillRoundedRect(32, -86, 22, 58, 10);
      this.rig.add(body);

      const head = this.scene.add.container(0, -112);
      const headG = this.scene.add.graphics();
      headG.fillStyle(shade(tint, 1.12), 1);
      headG.lineStyle(2.5, OUTLINE, 1);
      headG.fillEllipse(0, 0, 50, 44);
      headG.strokeEllipse(0, 0, 50, 44);
      headG.fillStyle(shade(tint, 0.84), 1);
      headG.fillEllipse(-23, 0, 14, 22);
      headG.fillEllipse(23, 0, 14, 22);
      headG.fillStyle(accent, 1);
      headG.fillEllipse(-11, -5, 7, 6);
      headG.fillEllipse(11, -5, 7, 6);
      headG.fillStyle(0x1a100c, 1);
      headG.fillCircle(-11, -5, 2);
      headG.fillCircle(11, -5, 2);
      headG.fillStyle(0xf2ead6, 1);
      headG.fillTriangle(-12, 12, -8, 20, -3, 11);
      headG.fillTriangle(3, 11, 8, 20, 12, 12);
      head.add(headG);
      this.rig.add(head);
      return { height: 140, head, tail: null };
    }

    // Urso e feras quadrúpedes genéricas.
    const legs = this.scene.add.graphics();
    legs.fillStyle(shade(tint, 0.68), 1);
    legs.lineStyle(2.5, OUTLINE, 1);
    for (const x of [-34, -16, 14, 32]) {
      legs.fillRoundedRect(x, -22, 14, 25, 6);
      legs.strokeRoundedRect(x, -22, 14, 25, 6);
      legs.fillStyle(accent, 0.8);
      legs.fillEllipse(x + 7, 1, 10, 4);
      legs.fillStyle(shade(tint, 0.68), 1);
    }
    this.rig.add(legs);

    const body = this.scene.add.graphics();
    body.fillStyle(tint, 1);
    body.lineStyle(3, OUTLINE, 1);
    body.fillEllipse(0, -46, 96, 58);
    body.strokeEllipse(0, -46, 96, 58);
    body.fillStyle(shade(tint, 1.22), 0.4);
    body.fillEllipse(-8, -38, 48, 20);
    body.fillStyle(shade(tint, 0.82), 1);
    body.fillTriangle(-36, -66, -26, -82, -16, -62);
    body.fillTriangle(-14, -70, 0, -86, 14, -66);
    body.fillTriangle(12, -68, 26, -82, 34, -62);
    this.rig.add(body);

    const head = this.scene.add.container(-50, -58);
    const headG = this.scene.add.graphics();
    headG.fillStyle(shade(tint, 1.12), 1);
    headG.lineStyle(2.5, OUTLINE, 1);
    headG.fillEllipse(0, 0, 44, 40);
    headG.strokeEllipse(0, 0, 44, 40);
    headG.fillStyle(shade(tint, 1.26), 1);
    headG.fillEllipse(-20, 4, 24, 18);
    headG.strokeEllipse(-20, 4, 24, 18);
    headG.fillStyle(0x1a100c, 1);
    headG.fillEllipse(-28, 2, 6, 5);
    headG.fillStyle(accent, 1);
    headG.fillEllipse(-9, -8, 7, 5);
    headG.fillStyle(0x1a100c, 1);
    headG.fillCircle(-9, -8, 2.2);
    headG.fillStyle(shade(tint, 0.9), 1);
    headG.fillTriangle(-12, -16, -4, -34, 6, -14);
    headG.fillTriangle(8, -14, 18, -30, 24, -10);
    headG.fillStyle(0xf2ead6, 1);
    headG.fillTriangle(-24, 10, -21, 18, -16, 10);
    head.add(headG);
    this.rig.add(head);
    const tail = this.buildTail(46, -48, shade(tint, 0.8));
    this.rig.add(tail);
    return { height: 100, head, tail };
  }

  private buildHumanoid(
    variant: MonsterVariant | undefined,
    tint: number,
    accent: number
  ): { height: number; head: Phaser.GameObjects.Container | null } {
    const robe = variant === 'cultist' || variant === 'pharaoh' || variant === 'angel' || variant === 'mummy';
    const armor = variant === 'knight';

    const legs = this.scene.add.graphics();
    legs.fillStyle(variant === 'mummy' ? shade(tint, 0.85) : shade(tint, 0.68), 1);
    legs.lineStyle(2.5, OUTLINE, 1);
    if (robe) {
      legs.fillTriangle(-24, -38, 24, -38, 30, 0);
      legs.strokeTriangle(-24, -38, 24, -38, 30, 0);
      legs.fillStyle(shade(tint, 0.82), 1);
      legs.fillTriangle(-15, -34, 4, 10, 18, -34);
    } else {
      legs.fillRoundedRect(-24, -36, 17, 38, 7);
      legs.strokeRoundedRect(-24, -36, 17, 38, 7);
      legs.fillRoundedRect(7, -36, 17, 38, 7);
      legs.strokeRoundedRect(7, -36, 17, 38, 7);
    }
    this.rig.add(legs);

    const torso = this.scene.add.graphics();
    torso.fillStyle(armor ? shade(tint, 1.08) : tint, 1);
    torso.lineStyle(3, OUTLINE, 1);
    torso.fillRoundedRect(-32, -92, 64, 60, armor ? 12 : 14);
    torso.strokeRoundedRect(-32, -92, 64, 60, armor ? 12 : 14);
    torso.fillStyle(shade(tint, 1.24), 0.45);
    torso.fillRoundedRect(-23, -85, 46, 18, 8);

    if (variant === 'cultist') {
      torso.fillStyle(accent, 0.85);
      torso.fillTriangle(0, -86, -8, -64, 8, -64);
      torso.fillTriangle(0, -70, -6, -48, 6, -48);
    } else if (variant === 'mummy') {
      torso.lineStyle(3, shade(tint, 0.72), 0.9);
      for (let i = 0; i < 7; i += 1) {
        torso.lineBetween(-30, -86 + i * 8, 30, -80 + i * 8);
      }
    } else if (variant === 'pharaoh') {
      torso.fillStyle(accent, 0.9);
      torso.fillRect(-33, -80, 66, 9);
      torso.fillStyle(0x2f6fb8, 1);
      torso.fillRect(-25, -94, 50, 7);
    } else if (variant === 'angel') {
      torso.fillStyle(accent, 0.9);
      torso.fillRect(-32, -50, 64, 6);
    } else if (variant === 'knight') {
      torso.fillStyle(shade(tint, 0.82), 1);
      torso.fillRect(-32, -64, 64, 9);
      torso.fillStyle(accent, 0.9);
      torso.fillRect(-6, -84, 12, 14);
    }
    this.rig.add(torso);

    const arms = this.scene.add.graphics();
    arms.fillStyle(shade(tint, 0.9), 1);
    arms.lineStyle(2.5, OUTLINE, 1);
    if (variant === 'mummy') {
      arms.fillRoundedRect(-48, -82, 18, 12, 5);
      arms.fillRoundedRect(30, -82, 18, 12, 5);
      arms.fillStyle(shade(tint, 0.8), 1);
      arms.fillEllipse(-48, -76, 12, 8);
      arms.fillEllipse(48, -76, 12, 8);
    } else {
      arms.fillRoundedRect(-46, -86, 16, 50, 7);
      arms.strokeRoundedRect(-46, -86, 16, 50, 7);
      arms.fillRoundedRect(30, -86, 16, 50, 7);
      arms.strokeRoundedRect(30, -86, 16, 50, 7);
    }
    this.rig.add(arms);

    if (variant === 'angel') {
      const wings = this.scene.add.graphics();
      wings.fillStyle(0xf4ecd8, 0.92);
      wings.lineStyle(2, OUTLINE, 1);
      wings.fillTriangle(-30, -86, -88, -108, -56, -40);
      wings.fillTriangle(-30, -86, -70, -40, -38, -38);
      wings.fillTriangle(30, -86, 88, -108, 56, -40);
      wings.fillTriangle(30, -86, 70, -40, 38, -38);
      this.rig.add(wings);
      const halo = this.scene.add.ellipse(0, -138, 42, 14, accent, 0);
      halo.setStrokeStyle(3, accent, 0.9);
      this.rig.add(halo);
    }

    if (variant === 'knight') {
      const shield = this.scene.add.graphics();
      shield.fillStyle(shade(tint, 0.9), 1);
      shield.lineStyle(2, OUTLINE, 1);
      shield.fillPoints([
        { x: 30, y: -76 }, { x: 58, y: -70 }, { x: 56, y: -40 }, { x: 44, y: -24 }, { x: 32, y: -42 }
      ], true);
      shield.strokePoints([
        { x: 30, y: -76 }, { x: 58, y: -70 }, { x: 56, y: -40 }, { x: 44, y: -24 }, { x: 32, y: -42 }
      ], true);
      shield.fillStyle(accent, 0.95);
      shield.fillCircle(44, -52, 7);
      this.rig.add(shield);

      const sword = this.scene.add.graphics();
      sword.fillStyle(0xdce8f5, 1);
      sword.lineStyle(2, OUTLINE, 1);
      sword.fillRoundedRect(-50, -118, 6, 56, 2);
      sword.strokeRoundedRect(-50, -118, 6, 56, 2);
      sword.fillStyle(accent, 1);
      sword.fillRect(-58, -68, 22, 5);
      this.rig.add(sword);
    }

    if (variant === 'bandit') {
      const dagger = this.scene.add.graphics();
      dagger.fillStyle(0xd9e4ef, 1);
      dagger.lineStyle(2, OUTLINE, 1);
      dagger.fillTriangle(46, -68, 62, -96, 52, -64);
      dagger.strokeTriangle(46, -68, 62, -96, 52, -64);
      dagger.fillStyle(0x5a3a24, 1);
      dagger.fillRect(43, -68, 9, 14);
      this.rig.add(dagger);
    }

    if (variant === 'cultist' || variant === 'pharaoh') {
      const staff = this.scene.add.graphics();
      staff.fillStyle(0x5b3d2a, 1);
      staff.lineStyle(2, OUTLINE, 1);
      staff.fillRoundedRect(50, -118, 5, 100, 2);
      staff.strokeRoundedRect(50, -118, 5, 100, 2);
      staff.fillStyle(accent, 0.24);
      staff.fillCircle(52, -122, 18);
      staff.fillStyle(accent, 1);
      staff.fillCircle(52, -122, 8);
      this.rig.add(staff);
    }

    const head = this.scene.add.container(0, -108);
    const headG = this.scene.add.graphics();
    headG.fillStyle(variant === 'mummy' ? shade(tint, 1.1) : 0xd9b38c, 1);
    headG.lineStyle(2.5, OUTLINE, 1);
    headG.fillEllipse(0, 0, 34, 38);
    headG.strokeEllipse(0, 0, 34, 38);
    headG.fillStyle(accent, 1);
    headG.fillEllipse(-7, -4, 5, 5);
    headG.fillEllipse(7, -4, 5, 5);
    headG.fillStyle(0x1a100c, 1);
    headG.fillCircle(-7, -4, 1.8);
    headG.fillCircle(7, -4, 1.8);

    if (variant === 'knight') {
      headG.fillStyle(shade(tint, 1.12), 1);
      headG.fillEllipse(0, -2, 40, 42);
      headG.strokeEllipse(0, -2, 40, 42);
      headG.fillStyle(0x1a242c, 1);
      headG.fillRect(-12, -7, 24, 7);
      headG.fillStyle(accent, 1);
      headG.fillTriangle(-3, -22, 3, -46, 9, -20);
    } else if (variant === 'cultist') {
      headG.fillStyle(shade(tint, 0.62), 1);
      headG.fillTriangle(-24, 16, 0, -44, 24, 16);
      headG.fillStyle(0x1a100c, 1);
      headG.fillEllipse(0, 0, 22, 20);
      headG.fillStyle(accent, 1);
      headG.fillCircle(-5, -1, 2);
      headG.fillCircle(5, -1, 2);
    } else if (variant === 'bandit') {
      headG.fillStyle(shade(tint, 0.62), 1);
      headG.fillTriangle(-22, 12, 0, -40, 22, 12);
      headG.fillStyle(0x8a3b42, 1);
      headG.fillRect(-18, 2, 36, 8);
    } else if (variant === 'mummy') {
      headG.lineStyle(2.5, shade(tint, 0.8), 0.9);
      for (let i = 0; i < 5; i += 1) headG.lineBetween(-16, -14 + i * 7, 16, -10 + i * 7);
    } else if (variant === 'pharaoh') {
      headG.fillStyle(0x2f6fb8, 1);
      headG.fillTriangle(-22, -2, 0, -44, 22, -2);
      headG.fillStyle(accent, 1);
      headG.fillRect(-22, -8, 44, 7);
      headG.fillStyle(0xd8ecff, 1);
      headG.fillTriangle(-24, 12, -16, -18, -6, 6);
      headG.fillTriangle(24, 12, 16, -18, 6, 6);
    } else if (variant === 'angel') {
      headG.fillStyle(0xf1e3b8, 1);
      headG.fillEllipse(0, -12, 38, 20);
    }
    head.add(headG);
    this.rig.add(head);
    return { height: 150, head };
  }

  private buildUndead(
    variant: MonsterVariant | undefined,
    tint: number,
    accent: number
  ): { height: number; head: Phaser.GameObjects.Container | null } {
    if (variant === 'lich') {
      const aura = this.scene.add.ellipse(0, -42, 110, 120, accent, 0.08);
      aura.setBlendMode(Phaser.BlendModes.ADD);
      this.rig.add(aura);

      const robe = this.scene.add.graphics();
      robe.fillStyle(shade(tint, 0.5), 1);
      robe.lineStyle(3, OUTLINE, 1);
      robe.fillPoints([
        { x: -40, y: -96 }, { x: 40, y: -96 }, { x: 48, y: -20 },
        { x: 24, y: -4 }, { x: 6, y: -22 }, { x: -8, y: -2 }, { x: -28, y: -20 }, { x: -48, y: -20 }
      ], true);
      robe.strokePoints([
        { x: -40, y: -96 }, { x: 40, y: -96 }, { x: 48, y: -20 },
        { x: 24, y: -4 }, { x: 6, y: -22 }, { x: -8, y: -2 }, { x: -28, y: -20 }, { x: -48, y: -20 }
      ], true);
      robe.fillStyle(accent, 0.65);
      robe.fillTriangle(0, -88, -10, -50, 10, -50);
      this.rig.add(robe);

      const staff = this.scene.add.graphics();
      staff.fillStyle(0x4a3527, 1);
      staff.lineStyle(2, OUTLINE, 1);
      staff.fillRoundedRect(46, -136, 5, 120, 2);
      staff.strokeRoundedRect(46, -136, 5, 120, 2);
      staff.fillStyle(accent, 0.25);
      staff.fillCircle(48, -140, 22);
      staff.fillStyle(accent, 1);
      staff.fillCircle(48, -140, 9);
      this.rig.add(staff);

      const head = this.scene.add.container(0, -108);
      const skull = this.scene.add.graphics();
      skull.fillStyle(shade(tint, 1.16), 1);
      skull.lineStyle(2.5, OUTLINE, 1);
      skull.fillEllipse(0, 0, 38, 40);
      skull.strokeEllipse(0, 0, 38, 40);
      skull.fillStyle(shade(tint, 0.8), 1);
      skull.fillRoundedRect(-12, 10, 24, 18, 6);
      skull.fillStyle(0x142018, 1);
      skull.fillEllipse(-8, -4, 9, 11);
      skull.fillEllipse(8, -4, 9, 11);
      skull.fillStyle(accent, 1);
      skull.fillCircle(-8, -4, 3);
      skull.fillCircle(8, -4, 3);
      skull.fillStyle(accent, 1);
      skull.fillTriangle(-20, -18, 0, -44, 20, -18);
      skull.fillRect(-20, -22, 40, 8);
      head.add(skull);
      this.rig.add(head);
      return { height: 160, head };
    }

    if (variant === 'ghoul') {
      const legs = this.scene.add.graphics();
      legs.fillStyle(shade(tint, 0.72), 1);
      legs.lineStyle(2.5, OUTLINE, 1);
      legs.fillRoundedRect(-26, -34, 17, 36, 6);
      legs.strokeRoundedRect(-26, -34, 17, 36, 6);
      legs.fillRoundedRect(9, -34, 17, 36, 6);
      legs.strokeRoundedRect(9, -34, 17, 36, 6);
      this.rig.add(legs);

      const body = this.scene.add.graphics();
      body.fillStyle(tint, 1);
      body.lineStyle(3, OUTLINE, 1);
      body.fillEllipse(0, -66, 62, 60);
      body.strokeEllipse(0, -66, 62, 60);
      body.fillStyle(shade(tint, 1.22), 0.4);
      body.fillEllipse(-8, -60, 30, 22);
      body.fillStyle(shade(tint, 0.78), 1);
      body.fillRoundedRect(-52, -86, 16, 54, 7);
      body.fillRoundedRect(36, -86, 16, 54, 7);
      body.fillStyle(accent, 1);
      for (const x of [-48, -44, 40, 44]) {
        body.fillTriangle(x, -32, x + 3, -22, x + 7, -32);
      }
      this.rig.add(body);

      const head = this.scene.add.container(-12, -106);
      const headG = this.scene.add.graphics();
      headG.fillStyle(shade(tint, 1.1), 1);
      headG.lineStyle(2.5, OUTLINE, 1);
      headG.fillEllipse(0, 0, 42, 36);
      headG.strokeEllipse(0, 0, 42, 36);
      headG.fillStyle(0x1a100c, 1);
      headG.fillEllipse(-10, -2, 9, 7);
      headG.fillEllipse(9, -2, 9, 7);
      headG.fillStyle(accent, 1);
      headG.fillCircle(-10, -2, 2.6);
      headG.fillCircle(9, -2, 2.6);
      headG.fillStyle(0xf2ead6, 1);
      headG.fillTriangle(-13, 11, -10, 19, -5, 10);
      headG.fillTriangle(4, 10, 9, 19, 13, 11);
      head.add(headG);
      this.rig.add(head);
      return { height: 138, head };
    }

    // Esqueleto.
    const bones = this.scene.add.graphics();
    bones.fillStyle(shade(tint, 0.9), 1);
    bones.lineStyle(2.5, OUTLINE, 1);
    bones.fillRoundedRect(-20, -34, 9, 34, 4);
    bones.strokeRoundedRect(-20, -34, 9, 34, 4);
    bones.fillRoundedRect(11, -34, 9, 34, 4);
    bones.strokeRoundedRect(11, -34, 9, 34, 4);
    bones.fillRoundedRect(-5, -92, 10, 58, 4);
    bones.fillRoundedRect(-28, -88, 56, 9, 4);
    for (let i = 0; i < 5; i += 1) {
      bones.lineStyle(3, shade(tint, 0.92), 1);
      bones.beginPath();
      bones.arc(0, -76 + i * 8, 20 + (i % 2) * 4, Phaser.Math.DegToRad(15), Phaser.Math.DegToRad(165), false);
      bones.strokePath();
    }
    bones.fillStyle(shade(tint, 0.88), 1);
    bones.fillRoundedRect(-38, -88, 9, 46, 4);
    bones.fillRoundedRect(29, -88, 9, 46, 4);
    this.rig.add(bones);

    const sword = this.scene.add.graphics();
    sword.fillStyle(0xdce8f5, 1);
    sword.lineStyle(2, OUTLINE, 1);
    sword.fillRoundedRect(53, -114, 5, 66, 2);
    sword.strokeRoundedRect(53, -114, 5, 66, 2);
    sword.fillStyle(accent, 1);
    sword.fillRect(46, -54, 20, 5);
    this.rig.add(sword);

    const head = this.scene.add.container(0, -106);
    const skull = this.scene.add.graphics();
    skull.fillStyle(shade(tint, 1.12), 1);
    skull.lineStyle(2.5, OUTLINE, 1);
    skull.fillEllipse(0, 0, 36, 38);
    skull.strokeEllipse(0, 0, 36, 38);
    skull.fillStyle(shade(tint, 0.82), 1);
    skull.fillRoundedRect(-11, 10, 22, 16, 5);
    skull.fillStyle(0x142018, 1);
    skull.fillEllipse(-8, -4, 9, 11);
    skull.fillEllipse(8, -4, 9, 11);
    skull.fillStyle(accent, 1);
    skull.fillCircle(-8, -4, 2.8);
    skull.fillCircle(8, -4, 2.8);
    head.add(skull);
    this.rig.add(head);
    return { height: 146, head };
  }

  private buildSpirit(
    variant: MonsterVariant | undefined,
    tint: number,
    accent: number
  ): { height: number; head: Phaser.GameObjects.Container | null } {
    const aura = this.scene.add.ellipse(0, -54, variant === 'elemental' ? 110 : 92, variant === 'elemental' ? 110 : 124, accent, 0.09);
    aura.setBlendMode(Phaser.BlendModes.ADD);
    this.rig.add(aura);

    if (variant === 'elemental') {
      const outer = this.scene.add.graphics();
      outer.lineStyle(3, accent, 0.55);
      outer.strokeCircle(0, -56, 42);
      outer.lineStyle(1.5, accent, 0.35);
      outer.strokeCircle(0, -56, 54);
      outer.fillStyle(tint, 0.35);
      outer.fillCircle(0, -56, 34);
      for (let i = 0; i < 6; i += 1) {
        const angle = (Math.PI * 2 * i) / 6;
        outer.fillStyle(accent, 0.85);
        outer.fillTriangle(
          Math.cos(angle) * 48 - 6, -56 + Math.sin(angle) * 48,
          Math.cos(angle) * 48 + 6, -56 + Math.sin(angle) * 48,
          Math.cos(angle) * 62, -56 + Math.sin(angle) * 62
        );
      }
      this.rig.add(outer);
      const core = this.scene.add.circle(0, -56, 20, accent, 0.86);
      core.setBlendMode(Phaser.BlendModes.ADD);
      this.rig.add(core);
      return { height: 130, head: null };
    }

    const body = this.scene.add.graphics();
    body.fillStyle(tint, 0.88);
    body.lineStyle(2.5, OUTLINE, 0.9);
    if (variant === 'voidling') {
      body.fillEllipse(0, -58, 76, 68);
      body.strokeEllipse(0, -58, 76, 68);
      body.fillStyle(shade(tint, 0.55), 0.8);
      for (let i = 0; i < 5; i += 1) {
        const x = -30 + i * 15;
        body.fillTriangle(x, -30, x + 8, -30, x + 4 + (i - 2) * 6, 10);
      }
      body.fillStyle(accent, 1);
      body.fillEllipse(0, -62, 24, 30);
      body.fillStyle(0x0a0612, 1);
      body.fillEllipse(0, -62, 9, 18);
    } else {
      body.fillPoints([
        { x: -32, y: -110 }, { x: 0, y: -132 }, { x: 32, y: -110 },
        { x: 38, y: -54 }, { x: 22, y: -18 }, { x: 8, y: -40 },
        { x: -4, y: -12 }, { x: -18, y: -38 }, { x: -36, y: -18 }
      ], true);
      body.strokePoints([
        { x: -32, y: -110 }, { x: 0, y: -132 }, { x: 32, y: -110 },
        { x: 38, y: -54 }, { x: 22, y: -18 }, { x: 8, y: -40 },
        { x: -4, y: -12 }, { x: -18, y: -38 }, { x: -36, y: -18 }
      ], true);
      body.fillStyle(shade(tint, 0.62), 0.9);
      body.fillTriangle(-28, -116, 0, -152, 28, -116);
      body.fillStyle(accent, 1);
      body.fillCircle(-10, -100, 3.6);
      body.fillCircle(10, -100, 3.6);
    }
    this.rig.add(body);

    const head = this.scene.add.container(0, -100);
    if (variant !== 'voidling') {
      const eyes = this.scene.add.graphics();
      eyes.fillStyle(accent, 1);
      eyes.fillCircle(-11, 0, 3.5);
      eyes.fillCircle(11, 0, 3.5);
      eyes.fillStyle(0xffffff, 0.8);
      eyes.fillCircle(-11, 0, 1.4);
      eyes.fillCircle(11, 0, 1.4);
      head.add(eyes);
      this.rig.add(head);
    }
    return { height: 150, head: variant === 'voidling' ? null : head };
  }

  private buildConstruct(
    variant: MonsterVariant | undefined,
    tint: number,
    accent: number
  ): { height: number; head: Phaser.GameObjects.Container | null } {
    if (variant === 'treant') {
      const trunk = this.scene.add.graphics();
      trunk.fillStyle(shade(tint, 0.72), 1);
      trunk.lineStyle(3, OUTLINE, 1);
      trunk.fillRoundedRect(-42, -108, 84, 108, 22);
      trunk.strokeRoundedRect(-42, -108, 84, 108, 22);
      trunk.fillStyle(shade(tint, 0.86), 1);
      trunk.fillRoundedRect(-18, -34, 14, 36, 5);
      trunk.fillRoundedRect(8, -34, 14, 36, 5);
      trunk.lineStyle(3, shade(tint, 0.6), 1);
      trunk.lineBetween(-28, -92, -34, -44);
      trunk.lineBetween(26, -86, 34, -40);
      trunk.fillStyle(shade(tint, 0.75), 1);
      trunk.fillTriangle(-42, -92, -82, -122, -68, -70);
      trunk.fillTriangle(42, -92, 82, -122, 68, -70);
      this.rig.add(trunk);

      const leaves = this.scene.add.graphics();
      leaves.fillStyle(shade(tint, 1.35), 1);
      leaves.lineStyle(2.5, OUTLINE, 1);
      leaves.fillEllipse(-28, -126, 56, 44);
      leaves.fillEllipse(24, -132, 60, 46);
      leaves.fillEllipse(0, -150, 54, 40);
      leaves.fillStyle(shade(tint, 1.6), 0.55);
      leaves.fillEllipse(-12, -156, 26, 16);
      this.rig.add(leaves);

      const head = this.scene.add.container(0, -104);
      const face = this.scene.add.graphics();
      face.fillStyle(shade(tint, 0.6), 1);
      face.fillEllipse(0, 0, 48, 34);
      face.fillStyle(accent, 1);
      face.fillCircle(-12, -3, 4);
      face.fillCircle(12, -3, 4);
      face.fillStyle(0x0a131c, 1);
      face.fillCircle(-12, -3, 2);
      face.fillCircle(12, -3, 2);
      face.lineStyle(3, shade(tint, 0.45), 1);
      face.lineBetween(-10, 12, 10, 10);
      head.add(face);
      this.rig.add(head);
      return { height: 184, head };
    }

    const legs = this.scene.add.graphics();
    legs.fillStyle(shade(tint, 0.72), 1);
    legs.lineStyle(3, OUTLINE, 1);
    legs.fillRoundedRect(-40, -48, 28, 50, 8);
    legs.strokeRoundedRect(-40, -48, 28, 50, 8);
    legs.fillRoundedRect(12, -48, 28, 50, 8);
    legs.strokeRoundedRect(12, -48, 28, 50, 8);
    this.rig.add(legs);

    const body = this.scene.add.graphics();
    body.fillStyle(tint, 1);
    body.lineStyle(3, OUTLINE, 1);
    body.fillRoundedRect(-48, -116, 96, 74, 16);
    body.strokeRoundedRect(-48, -116, 96, 74, 16);
    body.fillStyle(shade(tint, 1.2), 0.5);
    body.fillRoundedRect(-36, -106, 50, 24, 8);
    body.fillStyle(shade(tint, 0.8), 1);
    body.fillRoundedRect(-76, -108, 28, 76, 12);
    body.fillRoundedRect(48, -108, 28, 76, 12);
    body.fillStyle(accent, 0.28);
    body.fillCircle(0, -82, 22);
    body.fillStyle(accent, 1);
    body.fillCircle(0, -82, 10);
    body.lineStyle(2, accent, 0.8);
    body.strokeCircle(0, -82, 16);
    body.lineStyle(2, shade(tint, 0.55), 1);
    body.lineBetween(-28, -116, -28, -44);
    body.lineBetween(28, -116, 28, -44);
    this.rig.add(body);

    const head = this.scene.add.container(0, -134);
    const headG = this.scene.add.graphics();
    headG.fillStyle(shade(tint, 1.08), 1);
    headG.lineStyle(3, OUTLINE, 1);
    headG.fillRoundedRect(-28, -22, 56, 44, 10);
    headG.strokeRoundedRect(-28, -22, 56, 44, 10);
    headG.fillStyle(0x0a131c, 0.9);
    headG.fillRoundedRect(-18, -8, 36, 12, 5);
    headG.fillStyle(accent, 1);
    headG.fillRect(-12, -5, 8, 5);
    headG.fillRect(4, -5, 8, 5);
    head.add(headG);
    this.rig.add(head);
    return { height: 160, head };
  }

  private buildDragon(
    variant: MonsterVariant | undefined,
    tint: number,
    accent: number
  ): { height: number; head: Phaser.GameObjects.Container | null; tail: Phaser.GameObjects.Container | null } {
    const wings = this.scene.add.graphics();
    wings.fillStyle(shade(tint, 0.62), 0.94);
    wings.lineStyle(2.5, OUTLINE, 1);
    wings.fillPoints([
      { x: -22, y: -88 }, { x: -104, y: -142 }, { x: -120, y: -84 }, { x: -76, y: -42 }, { x: -40, y: -58 }
    ], true);
    wings.strokePoints([
      { x: -22, y: -88 }, { x: -104, y: -142 }, { x: -120, y: -84 }, { x: -76, y: -42 }, { x: -40, y: -58 }
    ], true);
    wings.fillPoints([
      { x: 22, y: -88 }, { x: 104, y: -142 }, { x: 120, y: -84 }, { x: 76, y: -42 }, { x: 40, y: -58 }
    ], true);
    wings.strokePoints([
      { x: 22, y: -88 }, { x: 104, y: -142 }, { x: 120, y: -84 }, { x: 76, y: -42 }, { x: 40, y: -58 }
    ], true);
    wings.lineStyle(2, accent, 0.45);
    wings.lineBetween(-32, -82, -92, -118);
    wings.lineBetween(32, -82, 92, -118);
    this.rig.add(wings);

    const body = this.scene.add.graphics();
    body.fillStyle(tint, 1);
    body.lineStyle(3, OUTLINE, 1);
    body.fillEllipse(4, -58, 110, 66);
    body.strokeEllipse(4, -58, 110, 66);
    body.fillStyle(shade(tint, 1.2), 0.4);
    body.fillEllipse(-6, -48, 56, 24);
    for (let i = 0; i < 5; i += 1) {
      body.fillStyle(accent, 0.9);
      body.fillTriangle(-34 + i * 18, -86, -28 + i * 18, -104, -20 + i * 18, -84);
    }
    body.fillStyle(shade(tint, 0.8), 1);
    for (const x of [-34, -12, 24, 42]) {
      body.fillRoundedRect(x, -32, 18, 32, 7);
    }
    this.rig.add(body);

    const tail = this.scene.add.container(58, -52);
    const tailG = this.scene.add.graphics();
    tailG.fillStyle(shade(tint, 0.84), 1);
    tailG.lineStyle(3, OUTLINE, 1);
    tailG.fillEllipse(30, 0, 74, 24);
    tailG.strokeEllipse(30, 0, 74, 24);
    tailG.fillStyle(accent, 1);
    tailG.fillTriangle(62, 0, 88, -12, 84, 10);
    tail.add(tailG);
    this.rig.add(tail);

    const head = this.scene.add.container(-44, -104);
    const headG = this.scene.add.graphics();
    if (variant === 'hydra') {
      for (const [hx, hy, scale] of [[-18, 8, 0.85], [0, -14, 1], [18, 6, 0.85]] as Array<[number, number, number]>) {
        headG.fillStyle(shade(tint, 0.72), 1);
        headG.lineStyle(2, OUTLINE, 1);
        headG.fillRoundedRect(hx - 5, 6, 10, 34 + Math.abs(hy), 5);
        headG.fillStyle(shade(tint, 1.1), scale);
        headG.fillEllipse(hx, hy, 30 * scale, 22 * scale);
        headG.strokeEllipse(hx, hy, 30 * scale, 22 * scale);
        headG.fillStyle(accent, 1);
        headG.fillEllipse(hx - 6, hy - 1, 4, 3);
      }
    } else {
      headG.fillStyle(shade(tint, 0.8), 1);
      headG.lineStyle(2.5, OUTLINE, 1);
      headG.fillRoundedRect(-8, 4, 18, 54, 8);
      headG.strokeRoundedRect(-8, 4, 18, 54, 8);
      headG.fillStyle(shade(tint, 1.08), 1);
      headG.fillEllipse(0, 0, 52, 38);
      headG.strokeEllipse(0, 0, 52, 38);
      headG.fillStyle(shade(tint, 1.24), 1);
      headG.fillRoundedRect(-34, -4, 26, 20, 8);
      headG.strokeRoundedRect(-34, -4, 26, 20, 8);
      headG.fillStyle(accent, 1);
      headG.fillEllipse(-12, -6, 7, 6);
      headG.fillStyle(0x1a100c, 1);
      headG.fillCircle(-12, -6, 2.4);
      headG.fillStyle(accent, 0.9);
      headG.fillTriangle(-12, -18, -4, -34, 4, -16);
      headG.fillTriangle(10, -16, 18, -30, 24, -12);
      headG.fillStyle(0xf2ead6, 1);
      headG.fillTriangle(-28, 8, -22, 16, -18, 6);
    }
    head.add(headG);
    this.rig.add(head);
    return { height: 190, head, tail };
  }

  private buildDemon(
    variant: MonsterVariant | undefined,
    tint: number,
    accent: number
  ): { height: number; head: Phaser.GameObjects.Container | null; tail: Phaser.GameObjects.Container | null } {
    const imp = variant === 'imp';
    const height = imp ? 108 : 158;
    const wingSpread = imp ? 80 : 128;

    const wings = this.scene.add.graphics();
    wings.fillStyle(shade(tint, 0.66), 0.95);
    wings.lineStyle(2.5, OUTLINE, 1);
    wings.fillTriangle(-26, -86, -wingSpread, -122, -58, -50);
    wings.fillTriangle(-26, -86, -70, -40, -36, -38);
    wings.fillTriangle(26, -86, wingSpread, -122, 58, -50);
    wings.fillTriangle(26, -86, 70, -40, 36, -38);
    this.rig.add(wings);

    const legs = this.scene.add.graphics();
    legs.fillStyle(shade(tint, 0.72), 1);
    legs.lineStyle(2.5, OUTLINE, 1);
    legs.fillRoundedRect(-28, -36, 20, 38, 7);
    legs.strokeRoundedRect(-28, -36, 20, 38, 7);
    legs.fillRoundedRect(8, -36, 20, 38, 7);
    legs.strokeRoundedRect(8, -36, 20, 38, 7);
    legs.fillStyle(shade(tint, 0.5), 1);
    legs.fillEllipse(-18, 0, 26, 9);
    legs.fillEllipse(18, 0, 26, 9);
    this.rig.add(legs);

    const body = this.scene.add.graphics();
    body.fillStyle(tint, 1);
    body.lineStyle(3, OUTLINE, 1);
    body.fillEllipse(0, imp ? -66 : -82, imp ? 58 : 82, imp ? 58 : 84);
    body.strokeEllipse(0, imp ? -66 : -82, imp ? 58 : 82, imp ? 58 : 84);
    body.fillStyle(shade(tint, 1.22), 0.35);
    body.fillEllipse(-8, imp ? -58 : -72, 30, 24);
    body.fillStyle(accent, 0.85);
    body.fillCircle(0, imp ? -72 : -90, imp ? 7 : 10);
    body.fillStyle(shade(tint, 0.8), 1);
    body.fillRoundedRect(-46, imp ? -88 : -108, 16, imp ? 48 : 64, 7);
    body.fillRoundedRect(30, imp ? -88 : -108, 16, imp ? 48 : 64, 7);
    body.fillStyle(0xf2ead6, 1);
    body.fillTriangle(-46, imp ? -42 : -46, -50, imp ? -30 : -30, -40, imp ? -40 : -42);
    body.fillTriangle(46, imp ? -42 : -46, 50, imp ? -30 : -30, 40, imp ? -40 : -42);
    this.rig.add(body);

    const tail = this.scene.add.container(imp ? 34 : 48, imp ? -52 : -64);
    const tailG = this.scene.add.graphics();
    tailG.lineStyle(imp ? 5 : 7, shade(tint, 0.74), 1);
    tailG.beginPath();
    tailG.arc(0, 0, imp ? 22 : 32, Phaser.Math.DegToRad(-80), Phaser.Math.DegToRad(90), false);
    tailG.strokePath();
    tailG.fillStyle(accent, 1);
    tailG.fillTriangle(imp ? 18 : 28, imp ? -14 : -20, imp ? 38 : 52, imp ? -26 : -36, imp ? 34 : 46, imp ? -4 : -6);
    tail.add(tailG);
    this.rig.add(tail);

    const head = this.scene.add.container(0, imp ? -102 : -128);
    const headG = this.scene.add.graphics();
    headG.fillStyle(shade(tint, 1.06), 1);
    headG.lineStyle(2.5, OUTLINE, 1);
    headG.fillEllipse(0, 0, imp ? 44 : 56, imp ? 40 : 50);
    headG.strokeEllipse(0, 0, imp ? 44 : 56, imp ? 40 : 50);
    headG.fillStyle(shade(tint, 0.8), 1);
    headG.fillTriangle(-22, -iq(imp, 14, 18), -12, -iq(imp, 38, 48), -2, -iq(imp, 12, 16));
    headG.fillTriangle(22, -iq(imp, 14, 18), 12, -iq(imp, 38, 48), 2, -iq(imp, 12, 16));
    headG.fillStyle(accent, 1);
    headG.fillEllipse(-10, -4, 7, 5);
    headG.fillEllipse(10, -4, 7, 5);
    headG.fillStyle(0x1a100c, 1);
    headG.fillCircle(-10, -4, 2.4);
    headG.fillCircle(10, -4, 2.4);
    headG.fillStyle(0xf2ead6, 1);
    headG.fillTriangle(-14, 12, -10, 20, -5, 11);
    headG.fillTriangle(5, 11, 10, 20, 14, 12);
    head.add(headG);
    this.rig.add(head);
    return { height, head, tail };
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

export interface HorseOptions {
  color?: number;
  mane?: number;
  saddle?: number;
  scale?: number;
  rider?: boolean;
  riderColor?: number;
  riderAccent?: number;
}

export class HorseView {
  readonly root: Phaser.GameObjects.Container;

  private readonly scene: Phaser.Scene;
  private readonly rig: Phaser.GameObjects.Container;
  private readonly head: Phaser.GameObjects.Container;
  private readonly tail: Phaser.GameObjects.Container;
  private readonly legs: Phaser.GameObjects.Graphics;
  private readonly baseScale: number;
  private facing: 1 | -1 = 1;
  private walkTween: Phaser.Tweens.Tween | null = null;
  private legTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, options: HorseOptions = {}) {
    this.scene = scene;
    this.baseScale = options.scale ?? 1;
    const color = options.color ?? 0x6b4a2f;
    const mane = options.mane ?? shade(color, 0.42);
    const saddle = options.saddle ?? 0x8a3b42;

    this.root = scene.add.container(x, y);
    const shadow = scene.add.ellipse(0, 2, 128 * this.baseScale, 26 * this.baseScale, 0x051015, 0.34);
    this.root.add(shadow);

    this.rig = scene.add.container(0, 0);
    this.rig.setScale(this.baseScale);
    this.root.add(this.rig);

    const legs = scene.add.graphics();
    legs.fillStyle(shade(color, 0.62), 1);
    legs.lineStyle(2.5, OUTLINE, 1);
    for (const lx of [-38, -20, 22, 40]) {
      legs.fillRoundedRect(lx, -32, 13, 34, 5);
      legs.strokeRoundedRect(lx, -32, 13, 34, 5);
      legs.fillStyle(shade(color, 0.4), 1);
      legs.fillRoundedRect(lx + 1, -4, 14, 7, 3);
      legs.fillStyle(shade(color, 0.62), 1);
    }
    this.legs = legs;
    this.rig.add(legs);

    const body = scene.add.graphics();
    body.fillStyle(color, 1);
    body.lineStyle(3, OUTLINE, 1);
    body.fillEllipse(0, -62, 116, 58);
    body.strokeEllipse(0, -62, 116, 58);
    body.fillStyle(shade(color, 1.18), 0.4);
    body.fillEllipse(-8, -52, 58, 20);
    body.fillStyle(shade(color, 0.75), 1);
    body.fillEllipse(46, -70, 30, 20);
    body.fillStyle(mane, 1);
    body.fillTriangle(-38, -84, -24, -110, -6, -84);
    body.fillTriangle(-18, -90, 0, -116, 16, -86);
    body.fillTriangle(4, -88, 22, -108, 34, -82);
    this.rig.add(body);

    // Sela e manto.
    const saddleG = scene.add.graphics();
    saddleG.fillStyle(saddle, 1);
    saddleG.lineStyle(2, OUTLINE, 1);
    saddleG.fillRoundedRect(-28, -94, 56, 22, 8);
    saddleG.strokeRoundedRect(-28, -94, 56, 22, 8);
    saddleG.fillStyle(0xd8b06a, 1);
    saddleG.fillRect(-30, -77, 60, 7);
    saddleG.fillStyle(0x3c2a1e, 1);
    saddleG.fillRoundedRect(-6, -78, 12, 16, 3);
    this.rig.add(saddleG);

    // Pescoço e cabeça.
    const neck = scene.add.graphics();
    neck.fillStyle(color, 1);
    neck.lineStyle(3, OUTLINE, 1);
    neck.fillRoundedRect(-54, -114, 28, 58, 12);
    neck.strokeRoundedRect(-54, -114, 28, 58, 12);
    neck.fillStyle(mane, 1);
    neck.fillTriangle(-28, -112, -8, -132, -2, -100);
    neck.fillTriangle(-34, -104, -16, -126, -6, -92);
    this.rig.add(neck);

    this.head = scene.add.container(-48, -122);
    const headG = scene.add.graphics();
    headG.fillStyle(shade(color, 1.08), 1);
    headG.lineStyle(2.5, OUTLINE, 1);
    headG.fillEllipse(0, 0, 38, 30);
    headG.strokeEllipse(0, 0, 38, 30);
    headG.fillStyle(shade(color, 1.2), 1);
    headG.fillRoundedRect(-34, -4, 22, 18, 7);
    headG.strokeRoundedRect(-34, -4, 22, 18, 7);
    headG.fillStyle(0x1a100c, 1);
    headG.fillEllipse(-30, 3, 5, 4);
    headG.fillStyle(0xf4d58d, 1);
    headG.fillEllipse(-8, -6, 5, 4);
    headG.fillStyle(0x1a100c, 1);
    headG.fillCircle(-8, -6, 1.8);
    headG.fillStyle(shade(color, 0.68), 1);
    headG.fillTriangle(-10, -14, -4, -28, 3, -13);
    headG.fillTriangle(5, -12, 12, -25, 17, -10);
    headG.fillStyle(mane, 1);
    headG.fillTriangle(8, -16, 26, -30, 22, -6);
    this.head.add(headG);
    this.rig.add(this.head);

    this.tail = scene.add.container(52, -74);
    const tailG = scene.add.graphics();
    tailG.fillStyle(mane, 1);
    tailG.lineStyle(2, OUTLINE, 1);
    tailG.fillTriangle(0, 0, 30, -14, 28, 12);
    tailG.strokeTriangle(0, 0, 30, -14, 28, 12);
    tailG.fillTriangle(0, 0, 26, 8, 20, 26);
    this.tail.add(tailG);
    this.rig.add(this.tail);

    if (options.rider) {
      const rider = scene.add.container(0, -104);
      const riderColor = options.riderColor ?? 0x8298b8;
      const riderAccent = options.riderAccent ?? 0xc94f52;

      const cape = scene.add.graphics();
      cape.fillStyle(riderAccent, 0.9);
      cape.lineStyle(2, OUTLINE, 1);
      cape.fillTriangle(-20, 12, 20, 12, 26, 52);
      rider.add(cape);

      const torso = scene.add.graphics();
      torso.fillStyle(riderColor, 1);
      torso.lineStyle(2.5, OUTLINE, 1);
      torso.fillRoundedRect(-20, -20, 40, 44, 10);
      torso.strokeRoundedRect(-20, -20, 40, 44, 10);
      torso.fillStyle(shade(riderColor, 0.8), 1);
      torso.fillRect(-20, 4, 40, 8);
      torso.fillStyle(0xf4d58d, 1);
      torso.fillRect(-4, -8, 8, 10);
      rider.add(torso);

      const riderHead = scene.add.graphics();
      riderHead.fillStyle(0xd9b38c, 1);
      riderHead.lineStyle(2, OUTLINE, 1);
      riderHead.fillEllipse(0, -36, 28, 30);
      riderHead.fillStyle(shade(riderColor, 1.12), 1);
      riderHead.fillEllipse(0, -40, 34, 30);
      riderHead.fillStyle(0x1a242c, 1);
      riderHead.fillRect(-12, -42, 24, 6);
      riderHead.fillStyle(riderAccent, 1);
      riderHead.fillTriangle(-2, -54, 4, -78, 10, -52);
      rider.add(riderHead);

      const lance = scene.add.graphics();
      lance.fillStyle(0x6b4a2f, 1);
      lance.fillRoundedRect(26, -28, 5, 70, 2);
      lance.fillStyle(0xdce8f5, 1);
      lance.fillTriangle(26, -28, 28.5, -54, 31, -28);
      rider.add(lance);
      this.rig.add(rider);
    }

    scene.tweens.add({
      targets: this.head,
      y: { from: -122, to: -119 },
      duration: 2800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    scene.tweens.add({
      targets: this.tail,
      angle: { from: -5, to: 7 },
      duration: 2300,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    // Respiração sutil sem animar scaleX: escalar no eixo horizontal
    // fazia o cavalo inverter a orientação e parecer girar no próprio lugar.
    scene.tweens.add({
      targets: this.rig,
      y: { from: 0, to: -1.4 * this.baseScale },
      duration: 1900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  setFacing(direction: 1 | -1): void {
    if (this.facing === direction) return;
    this.facing = direction;
    this.rig.scaleX = Math.abs(this.rig.scaleX) * direction;
  }

  walkTo(x: number, y: number, duration: number): void {
    this.walkTween?.stop();
    this.legTween?.stop();
    this.setFacing(x >= this.root.x ? 1 : -1);
    this.walkTween = this.scene.tweens.add({
      targets: this.root,
      x,
      y,
      duration,
      ease: 'Linear',
      onUpdate: () => this.root.setDepth(300 + this.root.y),
      onComplete: () => {
        this.walkTween = null;
        this.legTween?.stop();
        this.legTween = null;
        this.legs.angle = 0;
      }
    });
    this.legTween = this.scene.tweens.add({
      targets: this.legs,
      angle: { from: -2.2, to: 2.2 },
      duration: 230,
      yoyo: true,
      repeat: -1,
      ease: 'Linear'
    });
  }

  destroy(): void {
    this.walkTween?.stop();
    this.legTween?.stop();
    this.root.destroy(true);
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

// --- utilitários de cor ---
function shade(color: number, factor: number): number {
  const r = Math.max(0, Math.min(255, Math.round(((color >> 16) & 0xff) * factor)));
  const g = Math.max(0, Math.min(255, Math.round(((color >> 8) & 0xff) * factor)));
  const b = Math.max(0, Math.min(255, Math.round((color & 0xff) * factor)));
  return (r << 16) | (g << 8) | b;
}

function iq(condition: boolean, whenTrue: number, whenFalse: number): number {
  return condition ? whenTrue : whenFalse;
}

function buildQuiver(scene: Phaser.Scene): Phaser.GameObjects.Container {  const quiver = scene.add.container(12, -48);
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
