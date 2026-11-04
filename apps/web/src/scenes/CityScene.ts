import Phaser from 'phaser';
import type { CharacterClassId, CharacterSummary } from '@mundo-perfeito/shared';
import type { GameHud } from '../ui/hud';
import { PlayerAvatar } from './actors';

const FONT = '"Trebuchet MS", "Segoe UI", sans-serif';
const TILE_W = 96;
const TILE_H = 48;

type NpcId = 'adventurer' | 'blacksmith' | 'merchant' | 'alchemist' | 'keeper';

interface NpcDefinition {
  id: NpcId;
  name: string;
  title: string;
  classId: CharacterClassId;
  x: number;
  y: number;
  accent: number;
  greeting: string;
}

const NPCS: NpcDefinition[] = [
  { id: 'adventurer', name: 'Alden', title: 'Mestre das Aventuras', classId: 'warrior', x: 210, y: -72, accent: 0xe7bd70, greeting: 'As estradas além dos muros guardam criaturas e tesouros. Está pronto para partir?' },
  { id: 'blacksmith', name: 'Brom', title: 'Ferreiro', classId: 'warrior', x: -300, y: 52, accent: 0xe28a58, greeting: 'Traga seus equipamentos. Um bom aventureiro nunca descuida de sua armadura.' },
  { id: 'merchant', name: 'Mira', title: 'Mercadora', classId: 'mage', x: 300, y: 110, accent: 0x8bd6bd, greeting: 'Poções, provisões e ferramentas! Em breve teremos mercadorias para todos.' },
  { id: 'alchemist', name: 'Elowen', title: 'Alquimista', classId: 'priest', x: -170, y: -190, accent: 0x9edc91, greeting: 'A natureza oferece ingredientes poderosos. Cada erva tem seu segredo.' },
  { id: 'keeper', name: 'Tomas', title: 'Guardião do Armazém', classId: 'archer', x: 20, y: 205, accent: 0x9bbbe8, greeting: 'Seus pertences estarão seguros comigo. O armazém será aberto em breve.' }
];

export class CityScene extends Phaser.Scene {
  private character!: CharacterSummary;
  private hud: GameHud | null = null;
  private world!: Phaser.GameObjects.Container;
  private backdrop!: Phaser.GameObjects.Graphics;
  private avatar!: PlayerAvatar;
  private nameLabel!: Phaser.GameObjects.Text;
  private dialogue: Phaser.GameObjects.Container | null = null;
  private npcAvatars: PlayerAvatar[] = [];
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private moving = false;
  private alive = true;

  constructor() {
    super('CityScene');
  }

  create(): void {
    this.character = this.registry.get('character') as CharacterSummary;
    this.hud = (this.registry.get('hud') as GameHud | undefined) ?? null;
    this.alive = true;
    this.cameras.main.setBackgroundColor('#17252a');
    this.backdrop = this.add.graphics().setDepth(-1000);
    this.world = this.add.container(0, 0);

    this.drawBackdrop(this.scale.width, this.scale.height);
    this.buildTown();
    this.buildPlayer();
    this.buildNpcs();
    this.buildAmbient();

    this.layout(this.scale.width, this.scale.height);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);

    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.keys = {
        W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
      };
    }

    this.input.on('pointerdown', this.handleGroundClick, this);
    this.hud?.setConnection('online');
    this.hud?.setLocation('Cidade de Valedouro', 'Cidade segura');
    this.hud?.pushFeed(`${this.character.name} chegou à cidade de Valedouro.`, 'gold');
  }

  update(_time: number, delta: number): void {
    if (!this.alive || !this.avatar || !this.keys) return;
    const speed = Math.max(0.08, delta / 16.67) * 3.1;
    let dx = 0;
    let dy = 0;
    if (this.cursors.left.isDown || this.keys.A.isDown) { dx -= 1; dy += 0.5; }
    if (this.cursors.right.isDown || this.keys.D.isDown) { dx += 1; dy -= 0.5; }
    if (this.cursors.up.isDown || this.keys.W.isDown) { dx -= 1; dy -= 0.5; }
    if (this.cursors.down.isDown || this.keys.S.isDown) { dx += 1; dy += 0.5; }
    if (dx !== 0 || dy !== 0) {
      this.moving = true;
      this.avatar.root.x = Phaser.Math.Clamp(this.avatar.root.x + dx * speed, -390, 390);
      this.avatar.root.y = Phaser.Math.Clamp(this.avatar.root.y + dy * speed, -235, 245);
      this.avatar.root.setDepth(300 + this.avatar.root.y);
      this.nameLabel.setPosition(this.avatar.root.x, this.avatar.root.y - 138);
      this.avatar.setFacing(dx >= 0 ? 1 : -1);
    } else if (this.moving) {
      this.moving = false;
    }
  }

  private layout(width: number, height: number): void {
    this.drawBackdrop(width, height);
    const zoom = Phaser.Math.Clamp(Math.min(width / 1120, height / 700), 0.55, 1.12);
    this.world.setScale(zoom);
    this.world.setPosition(width / 2, height / 2 + Math.max(18, height * 0.045));
  }

  private drawBackdrop(width: number, height: number): void {
    const g = this.backdrop;
    g.clear();
    g.fillGradientStyle(0x14242d, 0x243b3d, 0x101b25, 0x172b2d, 1);
    g.fillRect(0, 0, width, height);
    g.fillStyle(0xf4cf88, 0.08);
    g.fillCircle(width * 0.78, height * 0.14, Math.min(width, height) * 0.17);
    g.fillStyle(0xffe3a6, 0.12);
    g.fillCircle(width * 0.78, height * 0.14, Math.min(width, height) * 0.08);
    for (let i = 0; i < 36; i += 1) {
      const x = ((i * 83 + 17) % 100) / 100 * width;
      const y = ((i * 47 + 11) % 48) / 100 * height;
      g.fillStyle(i % 4 === 0 ? 0xffd98c : 0xd6e6c7, 0.13 + (i % 3) * 0.04);
      g.fillCircle(x, y, i % 7 === 0 ? 1.5 : 0.8);
    }
  }

  private buildTown(): void {
    const ground = this.add.graphics().setDepth(0);
    this.world.add(ground);
    ground.fillStyle(0x07100e, 0.42);
    ground.fillEllipse(0, 90, 1080, 520);

    for (let row = 0; row < 11; row += 1) {
      for (let col = 0; col < 13; col += 1) {
        const x = (col - row - 6) * (TILE_W / 2);
        const y = (col + row - 11) * (TILE_H / 2);
        const road = Math.abs(col - row - 1) <= 1 || (row >= 4 && row <= 6 && col >= 4 && col <= 8);
        const colors = road ? [0x82765c, 0x8d8064, 0x786d55] : [0x47704f, 0x3d6648, 0x527a55];
        const color = colors[(col * 5 + row * 3) % colors.length] ?? 0x47704f;
        ground.fillStyle(color, 1);
        ground.fillPoints([
          { x, y: y - TILE_H / 2 }, { x: x + TILE_W / 2, y },
          { x, y: y + TILE_H / 2 }, { x: x - TILE_W / 2, y }
        ], true);
        ground.lineStyle(1, 0x172c25, 0.15);
        ground.strokePoints([
          { x, y: y - TILE_H / 2 }, { x: x + TILE_W / 2, y },
          { x, y: y + TILE_H / 2 }, { x: x - TILE_W / 2, y }
        ], true);
      }
    }

    this.addBuilding(-300, -90, 1.05, 0x9a7652, 0x7b3e35, 'FERREIRO');
    this.addBuilding(305, -120, 1.05, 0x9b8159, 0x42634d, 'MERCADO');
    this.addBuilding(-190, -270, 0.82, 0x8a6a50, 0x5a477d, 'ALQUIMIA');
    this.addBuilding(190, 245, 0.82, 0x9c805c, 0x385c72, 'ARMAZÉM');
    this.addBuilding(0, -340, 0.9, 0x9a7954, 0x784a36, 'ESTALAGEM');

    this.buildFountain(0, 28);
    this.buildGate(0, -430);
    this.buildNoticeBoard(-65, 160);
    this.buildStreetLamps();
    this.buildTrees();
    this.buildBarrels(-390, 145);
    this.buildBarrels(390, 10);
  }

  private addBuilding(x: number, y: number, scale: number, wallColor: number, roofColor: number, sign: string): void {
    const house = this.add.container(x, y).setDepth(80 + y);
    const g = this.add.graphics();
    const w = 116 * scale;
    const h = 76 * scale;
    g.fillStyle(0x08110e, 0.32);
    g.fillEllipse(0, 8 * scale, 190 * scale, 48 * scale);
    g.fillStyle(0x5a4534, 1);
    g.fillPoints([{x:-w,y:-h/2},{x:0,y:-h/2+28*scale},{x:0,y:h/2+28*scale},{x:-w,y:h/2}], true);
    g.fillStyle(wallColor, 1);
    g.fillPoints([{x:0,y:-h/2+28*scale},{x:w,y:-h/2},{x:w,y:h/2},{x:0,y:h/2+28*scale}], true);
    g.lineStyle(2, 0x33271f, 1);
    g.strokePoints([{x:0,y:-h/2+28*scale},{x:w,y:-h/2},{x:w,y:h/2},{x:0,y:h/2+28*scale}], true);
    g.fillStyle(roofColor, 1);
    g.fillPoints([{x:-w-8*scale,y:-h/2},{x:0,y:-h/2-56*scale},{x:w+8*scale,y:-h/2},{x:0,y:-h/2+30*scale}], true);
    g.lineStyle(3, 0x35271f, 1);
    g.strokePoints([{x:-w-8*scale,y:-h/2},{x:0,y:-h/2-56*scale},{x:w+8*scale,y:-h/2},{x:0,y:-h/2+30*scale}], true);
    g.fillStyle(0x35271f, 1);
    g.fillRoundedRect(-12*scale, 3*scale, 24*scale, 48*scale, 4);
    g.fillStyle(0xf4cf88, 0.75);
    g.fillRect(-w+22*scale, -12*scale, 22*scale, 18*scale);
    g.fillRect(w-44*scale, -12*scale, 22*scale, 18*scale);
    house.add(g);
    const plaque = this.add.text(0, -h/2-61*scale, sign, {
      fontFamily: FONT, fontSize: `${Math.max(9, 11*scale)}px`, fontStyle: 'bold',
      color: '#f6dfaa', stroke: '#35271f', strokeThickness: 3, letterSpacing: 1
    }).setOrigin(0.5);
    house.add(plaque);
    this.world.add(house);
  }

  private buildFountain(x: number, y: number): void {
    const f = this.add.container(x, y).setDepth(130);
    const g = this.add.graphics();
    g.fillStyle(0x111b1a, 0.35); g.fillEllipse(0, 12, 170, 54);
    g.fillStyle(0x77766b, 1); g.fillEllipse(0, 0, 150, 52);
    g.lineStyle(3, 0xb8aa8c, 1); g.strokeEllipse(0, 0, 150, 52);
    g.fillStyle(0x2c7583, 1); g.fillEllipse(0, -4, 126, 38);
    g.fillStyle(0x64b8bd, 0.75); g.fillEllipse(-22, -9, 42, 9);
    g.fillStyle(0x8c8c7c, 1); g.fillRoundedRect(-13, -50, 26, 48, 7);
    g.fillStyle(0x9d9a86, 1); g.fillEllipse(0, -50, 42, 16);
    g.fillStyle(0x65d0d5, 0.8); g.fillEllipse(0, -60, 12, 25);
    f.add(g); this.world.add(f);
    this.tweens.add({ targets: f, y: y + 2, duration: 2100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  private buildGate(x: number, y: number): void {
    const gate = this.add.container(x, y).setDepth(70);
    const g = this.add.graphics();
    g.fillStyle(0x4c4b47, 1);
    g.fillPoints([{x:-92,y:0},{x:-72,y:-122},{x:-40,y:-132},{x:-26,y:0}], true);
    g.fillPoints([{x:26,y:0},{x:40,y:-132},{x:72,y:-122},{x:92,y:0}], true);
    g.fillStyle(0x6c6252, 1);
    g.fillRoundedRect(-33, -130, 66, 135, 18);
    g.fillStyle(0x152a32, 1);
    g.fillRoundedRect(-23, -116, 46, 118, 18);
    g.lineStyle(4, 0xb99b62, 1);
    g.strokeRoundedRect(-33, -130, 66, 135, 18);
    g.fillStyle(0xf3cb7a, 0.22);
    g.fillEllipse(0, -54, 70, 88);
    gate.add(g);
    const label = this.add.text(0, -153, 'PORTAL DAS AVENTURAS', {
      fontFamily: FONT, fontSize: '11px', fontStyle: 'bold', color: '#f5d68f',
      stroke: '#1b2221', strokeThickness: 4, letterSpacing: 1
    }).setOrigin(0.5);
    gate.add(label);
    this.world.add(gate);
  }

  private buildNoticeBoard(x: number, y: number): void {
    const board = this.add.container(x, y).setDepth(180);
    const g = this.add.graphics();
    g.fillStyle(0x51351f, 1); g.fillRoundedRect(-5, -4, 10, 54, 3);
    g.fillStyle(0x76502e, 1); g.fillRoundedRect(-35, -50, 70, 48, 5);
    g.lineStyle(3, 0xc49a5b, 1); g.strokeRoundedRect(-35, -50, 70, 48, 5);
    g.fillStyle(0xe7d3a7, 1); g.fillRect(-25, -40, 50, 28);
    g.lineStyle(2, 0x876a45, 0.8);
    g.lineBetween(-17,-31,15,-31); g.lineBetween(-17,-23,9,-23);
    board.add(g);
    board.add(this.add.text(0, -63, 'MISSÕES', {fontFamily:FONT,fontSize:'10px',fontStyle:'bold',color:'#f5d68f',stroke:'#251a12',strokeThickness:3}).setOrigin(0.5));
    this.world.add(board);
  }

  private buildStreetLamps(): void {
    for (const [x, y] of [[-420, -40], [420, -120], [-380, 250], [380, 260], [0, -250]] as Array<[number, number]>) {
      const lamp = this.add.container(x, y).setDepth(170 + y);
      const g = this.add.graphics();
      g.fillStyle(0x3b3024, 1); g.fillRoundedRect(-4, -58, 8, 62, 3);
      g.fillStyle(0x725335, 1); g.fillRoundedRect(-13, -67, 26, 13, 4);
      g.fillStyle(0xffc56e, 0.95); g.fillCircle(0, -75, 7);
      g.fillStyle(0xffc56e, 0.12); g.fillCircle(0, -75, 25);
      lamp.add(g); this.world.add(lamp);
      this.tweens.add({ targets: g, alpha: { from: 0.82, to: 1 }, duration: 900, yoyo: true, repeat: -1 });
    }
  }

  private buildTrees(): void {
    for (const [x, y, s] of [[-450,-240,1.1],[-390,300,0.9],[450,200,1.1],[390,-300,0.9],[-90,-390,0.8],[100,350,0.85]] as Array<[number,number,number]>) {
      const tree = this.add.container(x, y).setDepth(90 + y);
      const g = this.add.graphics();
      g.fillStyle(0x493322,1); g.fillRoundedRect(-6*s,-42*s,12*s,48*s,3);
      g.fillStyle(0x28583e,1); g.fillCircle(-13*s,-55*s,29*s); g.fillCircle(15*s,-66*s,32*s); g.fillCircle(0,-86*s,34*s);
      g.lineStyle(2,0x183c2b,1); g.strokeCircle(-13*s,-55*s,29*s); g.strokeCircle(15*s,-66*s,32*s);
      g.fillStyle(0x57935b,0.55); g.fillCircle(-9*s,-92*s,15*s);
      tree.add(g); this.world.add(tree);
    }
  }

  private buildBarrels(x: number, y: number): void {
    const barrels = this.add.graphics().setDepth(200 + y);
    for (let i = 0; i < 3; i += 1) {
      const bx = x + i * 22;
      barrels.fillStyle(0x65442a, 1); barrels.fillRoundedRect(bx, y - i * 5, 18, 28, 5);
      barrels.lineStyle(2, 0x2c2119, 1); barrels.strokeRoundedRect(bx, y - i * 5, 18, 28, 5);
      barrels.lineStyle(2, 0xb18b55, 1); barrels.lineBetween(bx, y + 3 - i * 5, bx + 18, y + 3 - i * 5);
      barrels.lineBetween(bx, y + 20 - i * 5, bx + 18, y + 20 - i * 5);
    }
    this.world.add(barrels);
  }

  private buildPlayer(): void {
    this.avatar = new PlayerAvatar(this, this.character.classId, -45, 105);
    this.avatar.root.setDepth(405);
    this.world.add(this.avatar.root);
    this.nameLabel = this.add.text(-45, -33, this.character.name, {
      fontFamily: FONT, fontSize: '13px', fontStyle: 'bold', color: '#f4d58d',
      stroke: '#17221f', strokeThickness: 4, resolution: 2
    }).setOrigin(0.5);
    this.nameLabel.setDepth(2200);
    this.world.add(this.nameLabel);
  }

  private buildNpcs(): void {
    NPCS.forEach((npc) => {
      const avatar = new PlayerAvatar(this, npc.classId, npc.x, npc.y);
      avatar.root.setDepth(300 + npc.y);
      avatar.root.setScale(0.88);
      this.world.add(avatar.root);
      this.npcAvatars.push(avatar);
      const label = this.add.text(npc.x, npc.y - 145, npc.name, {
        fontFamily: FONT, fontSize: '12px', fontStyle: 'bold', color: '#f4e4c1',
        stroke: '#1a211e', strokeThickness: 4
      }).setOrigin(0.5);
      label.setDepth(2200);
      this.world.add(label);
      const title = this.add.text(npc.x, npc.y - 128, npc.title, {
        fontFamily: FONT, fontSize: '9px', color: '#f1c978',
        stroke: '#1a211e', strokeThickness: 3
      }).setOrigin(0.5);
      title.setDepth(2200);
      this.world.add(title);

      const hit = this.add.zone(npc.x, npc.y - 48, 84, 112).setDepth(2500);
      hit.setInteractive({ useHandCursor: true });
      hit.on('pointerdown', (_pointer: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
        event.stopPropagation();
        this.openNpc(npc);
      });
      this.world.add(hit);
    });
  }

  private buildAmbient(): void {
    for (let i = 0; i < 18; i += 1) {
      const x = Phaser.Math.Between(-440, 440);
      const y = Phaser.Math.Between(-300, 300);
      const mote = this.add.circle(x, y, Phaser.Math.FloatBetween(1, 2.2), i % 3 === 0 ? 0xffd98c : 0xd6e6c7, 0.35);
      mote.setDepth(1000);
      this.world.add(mote);
      this.tweens.add({ targets: mote, y: y - 18, alpha: 0.08, duration: Phaser.Math.Between(1800, 3600), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  }

  private handleGroundClick(pointer: Phaser.Input.Pointer): void {
    if (this.dialogue || pointer.button !== 0) return;
    const point = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const targetX = Phaser.Math.Clamp((point.x - this.world.x) / this.world.scaleX, -390, 390);
    const targetY = Phaser.Math.Clamp((point.y - this.world.y) / this.world.scaleY, -235, 245);
    const distance = Phaser.Math.Distance.Between(this.avatar.root.x, this.avatar.root.y, targetX, targetY);
    this.avatar.setFacing(targetX >= this.avatar.root.x ? 1 : -1);
    this.tweens.add({
      targets: this.avatar.root,
      x: targetX, y: targetY, duration: Phaser.Math.Clamp(distance * 3.2, 220, 1800),
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        this.avatar.root.setDepth(300 + this.avatar.root.y);
        this.nameLabel.setPosition(this.avatar.root.x, this.avatar.root.y - 138);
      }
    });
  }

  private openNpc(npc: NpcDefinition): void {
    this.closeDialogue();
    const panel = this.add.container(this.scale.width / 2, this.scale.height - 118).setScrollFactor(0).setDepth(5000);
    const bg = this.add.rectangle(0, 0, Math.min(560, this.scale.width - 28), 150, 0x101b25, 0.96).setStrokeStyle(2, npc.accent, 0.9);
    const heading = this.add.text(-bg.width / 2 + 18, -55, npc.name + ' — ' + npc.title, {
      fontFamily: FONT, fontSize: '15px', fontStyle: 'bold', color: '#f5d68f'
    });
    const message = this.add.text(-bg.width / 2 + 18, -28, npc.greeting, {
      fontFamily: FONT, fontSize: '12px', color: '#d9e4ef', wordWrap: { width: bg.width - 36 }, lineSpacing: 4
    });
    panel.add([bg, heading, message]);

    if (npc.id === 'adventurer') {
      const action = this.add.text(-bg.width / 2 + 18, 43, '▶  Entrar na Clareira dos Aprendizes', {
        fontFamily: FONT, fontSize: '13px', fontStyle: 'bold', color: '#9fe0a8',
        backgroundColor: '#244b39', padding: { x: 12, y: 8 }
      }).setInteractive({ useHandCursor: true });
      action.on('pointerdown', (_pointer: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
        event.stopPropagation();
        this.closeDialogue();
        this.hud?.pushFeed('Você partiu para a Clareira dos Aprendizes.', 'gold');
        this.scene.start('WorldScene');
      });
      panel.add(action);
    } else {
      const comingSoon = this.add.text(bg.width / 2 - 18, 48, 'Disponível em breve', {
        fontFamily: FONT, fontSize: '10px', color: '#8da3b8'
      }).setOrigin(1, 0);
      panel.add(comingSoon);
    }

    const close = this.add.text(bg.width / 2 - 18, -59, '✕', {
      fontFamily: FONT, fontSize: '16px', color: '#d9e4ef', backgroundColor: '#26394b', padding: { x: 7, y: 3 }
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    close.on('pointerdown', (_pointer: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation(); this.closeDialogue();
    });
    panel.add(close);
    this.dialogue = panel;
  }

  private closeDialogue(): void {
    this.dialogue?.destroy(true);
    this.dialogue = null;
  }

  private handleResize = (size: Phaser.Structs.Size): void => {
    this.layout(size.width, size.height);
    this.closeDialogue();
  };

  private handleShutdown(): void {
    this.alive = false;
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.input.off('pointerdown', this.handleGroundClick, this);
    this.closeDialogue();
    this.npcAvatars = [];
  }
}
