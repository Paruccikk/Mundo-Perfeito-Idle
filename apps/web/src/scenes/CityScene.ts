import Phaser from 'phaser';
import type { CharacterClassId, CharacterSummary, CombatSnapshot } from '@mundo-perfeito/shared';
import type { GameHud } from '../ui/hud';
import { HorseView, PlayerAvatar } from './actors';
import { API_BASE_URL, api } from '../api';
import { getAuthToken } from '../player';
import { sfxClick } from '../audio';
import { closeStageMap, openStageMap } from '../ui/stage-map';

const FONT = '"Cinzel", "MedievalSharp", Georgia, "Times New Roman", serif';
const TILE_W = 96;
const TILE_H = 48;

// A cidade é uma grade isométrica larga. A câmera acompanha o herói,
// então o chão nunca termina em uma moldura escura.
const CITY_COLS = 39;
const CITY_ROWS = 31;
const CITY_HALF_X = ((CITY_COLS + CITY_ROWS - 2) * TILE_W) / 4;
const CITY_HALF_Y = ((CITY_COLS + CITY_ROWS - 2) * TILE_H) / 4;
const CITY_LIMITS = { minX: -1290, maxX: 1290, minY: -650, maxY: 650 };
const WALL = { halfX: 1320, halfY: 680 };

const PLAYER_SCALE = 0.78;
const NPC_SCALE = 0.84;
const NAME_LIFT = 118;

interface DistrictDefinition {
  id: string;
  name: string;
  hint: string;
  x: number;
  y: number;
  radius: number;
}

const DISTRICTS: DistrictDefinition[] = [
  { id: 'plaza', name: 'Praça do Mercado', hint: 'Coração de Valedouro', x: 0, y: 30, radius: 430 },
  { id: 'forge', name: 'Bairro do Ferro', hint: 'Forjas e oficinas', x: -620, y: 120, radius: 430 },
  { id: 'crafts', name: 'Bairro dos Ofícios', hint: 'Mercadores e artesãos', x: 620, y: 120, radius: 430 },
  { id: 'temple', name: 'Alto do Santuário', hint: 'Capela e conselho', x: 0, y: -470, radius: 430 },
  { id: 'warehouse', name: 'Distrito do Armazém', hint: 'Docas e trapiches', x: 0, y: 500, radius: 400 },
  { id: 'fields', name: 'Campos de Valedouro', hint: 'Estradas do reino', x: 0, y: 0, radius: 9999 }
];

type NpcId = 'adventurer' | 'blacksmith' | 'merchant' | 'alchemist' | 'keeper' | 'guard' | 'chaplain';

interface NpcDefinition {
  id: NpcId;
  name: string;
  title: string;
  classId: CharacterClassId;
  x: number;
  y: number;
  accent: number;
  icon: string;
  restFacing: 1 | -1;
  greeting: string;
}

const NPCS: NpcDefinition[] = [
  { id: 'adventurer', name: 'Alden', title: 'Mestre das Aventuras', classId: 'warrior', x: 415, y: 75, accent: 0xe7bd70, icon: '✦', restFacing: -1, greeting: 'As estradas além dos muros guardam criaturas e tesouros. Está pronto para partir?' },
  { id: 'blacksmith', name: 'Brom', title: 'Ferreiro', classId: 'warrior', x: -575, y: 150, accent: 0xe28a58, icon: '⚒', restFacing: 1, greeting: 'Traga seus equipamentos. Um bom aventureiro nunca descuida de sua armadura.' },
  { id: 'merchant', name: 'Mira', title: 'Mercadora', classId: 'mage', x: 535, y: 5, accent: 0x8bd6bd, icon: '◈', restFacing: -1, greeting: 'Poções, provisões e ferramentas! As melhores mercadorias do reino passam por aqui.' },
  { id: 'alchemist', name: 'Elowen', title: 'Alquimista', classId: 'priest', x: -455, y: -360, accent: 0x9edc91, icon: '❧', restFacing: 1, greeting: 'A natureza oferece ingredientes poderosos. Cada erva tem seu segredo.' },
  { id: 'keeper', name: 'Tomas', title: 'Guardião do Armazém', classId: 'archer', x: 345, y: 470, accent: 0x9bbbe8, icon: '▤', restFacing: -1, greeting: 'Seus pertences estarão seguros comigo. O armazém será aberto em breve.' },
  { id: 'guard', name: 'Sargento Varo', title: 'Guarda da Cidade', classId: 'warrior', x: 95, y: -525, accent: 0xc4564e, icon: '⛨', restFacing: 1, greeting: 'Os portões estão protegidos. Siga pelas estradas marcadas e volte com vida.' },
  { id: 'chaplain', name: 'Irmã Celeste', title: 'Capelã', classId: 'priest', x: -120, y: -455, accent: 0xf0d596, icon: '✧', restFacing: 1, greeting: 'Que a luz do Santuário guie seus passos. Descanse antes de partir.' }
];

interface CityPlayerPayload {
  id: string;
  name: string;
  classId: CharacterClassId;
  level: number;
  x: number;
  y: number;
}

interface RemoteCityPlayer {
  avatar: PlayerAvatar;
  label: Phaser.GameObjects.Container;
  targetX: number;
  targetY: number;
}

export class CityScene extends Phaser.Scene {
  private character!: CharacterSummary;
  private hud: GameHud | null = null;
  private world!: Phaser.GameObjects.Container;
  private backdrop!: Phaser.GameObjects.Graphics;
  private avatar!: PlayerAvatar;
  private nameLabel!: Phaser.GameObjects.Container;
  private dialogue: Phaser.GameObjects.Container | null = null;
  private npcAvatars: PlayerAvatar[] = [];
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private moving = false;
  private alive = true;
  private citySocket: WebSocket | null = null;
  private remotePlayers = new Map<string, RemoteCityPlayer>();
  private multiplayerPanel: HTMLElement | null = null;
  private chatMessages: HTMLElement | null = null;
  private chatStatus: HTMLElement | null = null;
  private onlineCount: HTMLElement | null = null;
  private lastSyncAt = 0;
  private lastSentX = -9999;
  private lastSentY = -9999;
  private stableHorses: HorseView[] = [];
  private mountedPatrol: HorseView | null = null;
  private mountedHorse: HorseView | null = null;
  private mountControl: HTMLButtonElement | null = null;
  private nameplates: Phaser.GameObjects.Container[] = [];
  private cameraZoom = 0.85;
  private cameraFocusX = 0;
  private cameraFocusY = 120;
  private currentDistrict = '';
  private minimapCanvas: HTMLCanvasElement | null = null;
  private minimapDistrict: HTMLElement | null = null;
  private minimapLastDraw = 0;
  private chatCollapsed = false;
  private chatToggle: HTMLButtonElement | null = null;

  constructor() {
    super('CityScene');
  }

  create(): void {
    this.character = this.registry.get('character') as CharacterSummary;
    this.hud = (this.registry.get('hud') as GameHud | undefined) ?? null;
    this.alive = true;
    this.cameras.main.setBackgroundColor('#1c2f24');
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
    this.hud?.setConnection('connecting');
    this.hud?.setLocation('Cidade de Valedouro', 'Praça do Mercado', true);
    this.hud?.pushFeed(`${this.character.name} chegou à cidade de Valedouro.`, 'gold');
    this.createMultiplayerPanel();
    this.createMinimap();
    this.createMountControl();
    void this.refreshMountState();
    this.connectMultiplayer();
    void this.syncTown();
  }

  /**
   * Ao entrar na cidade, resolve no servidor qualquer morte pendente
   * (por exemplo, se a página foi fechada durante o combate) e atualiza
   * a vida no HUD sem simular farm dentro da cidade.
   */
  private async syncTown(): Promise<void> {
    try {
      const snapshot = await api.enterTown(this.character.id);
      if (!this.alive) return;
      this.character = snapshot.character;
      this.registry.set('character', snapshot.character);
      this.hud?.update(snapshot);
      const district = DISTRICTS.find((entry) => entry.id === this.currentDistrict)?.name ?? 'Praça do Mercado';
      this.hud?.setLocation('Cidade de Valedouro', district, true);
    } catch {
      // A cidade continua utilizável mesmo se a sincronização falhar.
    }
  }

  update(_time: number, delta: number): void {
    if (!this.alive || !this.avatar) return;
    if (this.keys && this.cursors) {
      // Controles em oito direções no plano isométrico, com velocidade constante.
      let dx = 0;
      let dy = 0;
      if (this.cursors.left.isDown || this.keys.A.isDown) { dx -= 1; dy += 0.5; }
      if (this.cursors.right.isDown || this.keys.D.isDown) { dx += 1; dy -= 0.5; }
      if (this.cursors.up.isDown || this.keys.W.isDown) { dx -= 1; dy -= 0.5; }
      if (this.cursors.down.isDown || this.keys.S.isDown) { dx += 1; dy += 0.5; }
      const magnitude = Math.hypot(dx, dy);
      if (magnitude > 0) {
        if (!this.moving) {
          if (this.mountedHorse) this.mountedHorse.setWalking(false);
          else this.avatar.stopWalking();
        }
        this.moving = true;
        dx /= magnitude;
        dy /= magnitude;
        const mover = this.mountedHorse?.root ?? this.avatar.root;
        const speed = this.mountedHorse ? 310 : 190;
        const distance = speed * Math.min(delta, 50) / 1000;
        mover.x = Phaser.Math.Clamp(mover.x + dx * distance, CITY_LIMITS.minX, CITY_LIMITS.maxX);
        mover.y = Phaser.Math.Clamp(mover.y + dy * distance, CITY_LIMITS.minY, CITY_LIMITS.maxY);
        if (this.mountedHorse) {
          this.mountedHorse.setFacing(dx >= 0 ? 1 : -1);
          this.mountedHorse.setWalking(true);
        } else {
          this.avatar.facePoint(mover.x + dx, mover.y + dy);
          this.avatar.setWalking(true);
        }
        mover.setDepth(300 + mover.y);
      } else if (this.moving) {
        this.moving = false;
        if (this.mountedHorse) this.mountedHorse.setWalking(false);
        else this.avatar.setWalking(false);
      }
    }
    const playerRoot = this.mountedHorse?.root ?? this.avatar.root;
    this.nameLabel.setPosition(playerRoot.x, playerRoot.y - NAME_LIFT);
    this.updateCamera(delta);
    this.updateDistrict();
    this.syncLocalPosition();
    this.updateRemotePlayers(delta);
    this.updateMinimap();
  }

  private createMultiplayerPanel(): void {
    const root = document.getElementById('ui-root');
    if (!root) return;
    const panel = document.createElement('section');
    panel.className = 'city-online';
    panel.setAttribute('aria-label', 'Chat da cidade');
    const header = document.createElement('header');
    header.className = 'city-online__header';
    const title = document.createElement('strong');
    title.textContent = 'Valedouro';
    const status = document.createElement('span');
    status.className = 'city-online__status';
    status.textContent = 'Conectando…';
    const count = document.createElement('span');
    count.className = 'city-online__count';
    count.textContent = '0 online';
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'city-online__toggle';
    toggle.textContent = '—';
    toggle.setAttribute('aria-label', 'Recolher chat da cidade');
    header.append(title, status, count, toggle);

    const messages = document.createElement('div');
    messages.className = 'city-online__messages';
    const form = document.createElement('form');
    form.className = 'city-online__form';
    const input = document.createElement('input');
    input.className = 'city-online__input';
    input.type = 'text';
    input.maxLength = 180;
    input.autocomplete = 'off';
    input.placeholder = 'Mensagem para a cidade…';
    input.setAttribute('aria-label', 'Mensagem para a cidade');
    const submit = document.createElement('button');
    submit.className = 'city-online__send';
    submit.type = 'submit';
    submit.textContent = 'Enviar';
    form.append(input, submit);
    panel.append(header, messages, form);
    root.append(panel);

    const setCollapsed = (collapsed: boolean) => {
      this.chatCollapsed = collapsed;
      panel.classList.toggle('is-collapsed', collapsed);
      toggle.textContent = collapsed ? '+' : '—';
      toggle.setAttribute('aria-label', collapsed ? 'Expandir chat da cidade' : 'Recolher chat da cidade');
    };
    toggle.addEventListener('click', () => {
      sfxClick();
      setCollapsed(!this.chatCollapsed);
    });
    if (this.scale.width < 760) setCollapsed(true);

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const message = input.value.trim();
      if (!message) return;
      if (!this.citySocket || this.citySocket.readyState !== WebSocket.OPEN) {
        this.appendChatMessage('Sistema', 'Chat indisponível. Reconectando…');
        return;
      }
      this.citySocket.send(JSON.stringify({ type: 'chat', message }));
      input.value = '';
    });
    this.multiplayerPanel = panel;
    this.chatMessages = messages;
    this.chatStatus = status;
    this.onlineCount = count;
    this.chatToggle = toggle;
  }

  private connectMultiplayer(): void {
    if (!this.alive || this.citySocket || !getAuthToken()) return;
    const token = getAuthToken();
    if (!token) return;
    const url = new URL(API_BASE_URL);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.pathname = '/api/v1/city/socket';
    url.search = '';
    url.searchParams.set('characterId', this.character.id);
    let socket: WebSocket;
    try {
      socket = new WebSocket(url.toString(), [`mp-auth.${token}`]);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.citySocket = socket;
    socket.addEventListener('open', () => {
      if (this.citySocket !== socket) return;
      this.setChatStatus('Conectado');
      this.hud?.setConnection('online');
      this.appendChatMessage('Sistema', 'Conectado à cidade de Valedouro.');
    });
    socket.addEventListener('message', (event) => {
      if (typeof event.data !== 'string') return;
      try {
        this.handleCityMessage(JSON.parse(event.data) as Record<string, unknown>);
      } catch {
        this.appendChatMessage('Sistema', 'Recebemos uma mensagem inválida do servidor.');
      }
    });
    socket.addEventListener('close', () => {
      if (this.citySocket === socket) this.citySocket = null;
      this.clearRemotePlayers();
      this.setOnlineCount(0);
      if (!this.alive) return;
      this.setChatStatus('Reconectando…');
      this.hud?.setConnection('offline');
      this.scheduleReconnect();
    });
    socket.addEventListener('error', () => {
      this.setChatStatus('Falha de conexão');
    });
  }

  private scheduleReconnect(): void {
    if (!this.alive) return;
    this.time.delayedCall(2500, () => this.connectMultiplayer());
  }

  private handleCityMessage(payload: Record<string, unknown>): void {
    const type = payload.type;
    if (type === 'welcome') {
      const players = Array.isArray(payload.players) ? payload.players as CityPlayerPayload[] : [];
      players.forEach((player) => this.addRemotePlayer(player));
      this.setOnlineCount(Number(payload.onlineCount) || players.length + 1);
      this.setChatStatus('Conectado');
      return;
    }
    if (type === 'player_joined') {
      const player = payload.player as CityPlayerPayload | undefined;
      if (player?.id && player.id !== this.character.id) {
        this.addRemotePlayer(player);
        this.appendChatMessage('Sistema', `${player.name} entrou na cidade.`);
      }
      this.setOnlineCount(Number(payload.onlineCount) || this.remotePlayers.size + 1);
      return;
    }
    if (type === 'player_left') {
      const id = typeof payload.playerId === 'string' ? payload.playerId : '';
      this.removeRemotePlayer(id);
      if (typeof payload.name === 'string') this.appendChatMessage('Sistema', `${payload.name} saiu da cidade.`);
      this.setOnlineCount(Number(payload.onlineCount) || Math.max(1, this.remotePlayers.size + 1));
      return;
    }
    if (type === 'player_moved') {
      const id = typeof payload.playerId === 'string' ? payload.playerId : '';
      const remote = this.remotePlayers.get(id);
      const x = Number(payload.x);
      const y = Number(payload.y);
      if (remote && Number.isFinite(x) && Number.isFinite(y)) {
        remote.targetX = Phaser.Math.Clamp(x, CITY_LIMITS.minX, CITY_LIMITS.maxX);
        remote.targetY = Phaser.Math.Clamp(y, CITY_LIMITS.minY, CITY_LIMITS.maxY);
      }
      return;
    }
    if (type === 'chat_message') {
      const name = typeof payload.name === 'string' ? payload.name : 'Aventureiro';
      const message = typeof payload.message === 'string' ? payload.message : '';
      if (message) this.appendChatMessage(name, message);
      return;
    }
    if (type === 'error' && typeof payload.message === 'string') {
      this.appendChatMessage('Sistema', payload.message);
    }
  }

  private addRemotePlayer(player: CityPlayerPayload): void {
    if (!player || player.id === this.character.id || this.remotePlayers.has(player.id)) return;
    if (!['warrior', 'mage', 'priest', 'archer'].includes(player.classId)) return;
    const x = Phaser.Math.Clamp(Number(player.x) || 0, CITY_LIMITS.minX, CITY_LIMITS.maxX);
    const y = Phaser.Math.Clamp(Number(player.y) || 0, CITY_LIMITS.minY, CITY_LIMITS.maxY);
    const avatar = new PlayerAvatar(this, player.classId, x, y);
    avatar.root.setScale(PLAYER_SCALE);
    avatar.root.setDepth(300 + y);
    this.world.add(avatar.root);
    const label = this.makeNameplate(x, y - NAME_LIFT, `${player.name} • Nv. ${player.level}`, undefined, 0x9fc7e8, '◆');
    this.remotePlayers.set(player.id, { avatar, label, targetX: x, targetY: y });
  }

  private removeRemotePlayer(id: string): void {
    const remote = this.remotePlayers.get(id);
    if (!remote) return;
    remote.avatar.root.destroy(true);
    const plateIndex = this.nameplates.indexOf(remote.label);
    if (plateIndex >= 0) this.nameplates.splice(plateIndex, 1);
    remote.label.destroy(true);
    this.remotePlayers.delete(id);
  }

  private clearRemotePlayers(): void {
    for (const id of this.remotePlayers.keys()) this.removeRemotePlayer(id);
  }

  private updateRemotePlayers(delta: number): void {
    const factor = Math.min(1, Math.max(0.08, delta / 85));
    for (const remote of this.remotePlayers.values()) {
      const dx = remote.targetX - remote.avatar.root.x;
      const dy = remote.targetY - remote.avatar.root.y;
      if (Math.abs(dx) > 0.2) remote.avatar.setFacing(dx > 0 ? 1 : -1);
      remote.avatar.root.x += dx * factor;
      remote.avatar.root.y += dy * factor;
      remote.avatar.root.setDepth(300 + remote.avatar.root.y);
      remote.label.setPosition(remote.avatar.root.x, remote.avatar.root.y - NAME_LIFT);
    }
    this.updatePlayerNameplate();
  }

  private updatePlayerNameplate(): void {
    if (!this.nameLabel || !this.avatar) return;
    this.nameLabel.setPosition(this.avatar.root.x, this.avatar.root.y - NAME_LIFT);
  }

  private syncLocalPosition(): void {
    const socket = this.citySocket;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    const mover = this.mountedHorse?.root ?? this.avatar.root;
    const x = mover.x;
    const y = mover.y;
    const now = this.time.now;
    if (Math.abs(x - this.lastSentX) < 1.5 && Math.abs(y - this.lastSentY) < 1.5) return;
    if (now - this.lastSyncAt < 90) return;
    socket.send(JSON.stringify({ type: 'move', x, y }));
    this.lastSentX = x;
    this.lastSentY = y;
    this.lastSyncAt = now;
  }

  private appendChatMessage(name: string, message: string): void {
    if (!this.chatMessages) return;
    const line = document.createElement('div');
    line.className = 'city-online__message';
    const author = document.createElement('strong');
    author.textContent = name;
    const text = document.createElement('span');
    text.textContent = message;
    line.append(author, text);
    this.chatMessages.append(line);
    while (this.chatMessages.children.length > 30) {
      this.chatMessages.firstElementChild?.remove();
    }
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  private setChatStatus(value: string): void {
    if (this.chatStatus) this.chatStatus.textContent = value;
  }

  private setOnlineCount(value: number): void {
    if (this.onlineCount) this.onlineCount.textContent = `${Math.max(0, value)} online`;
  }

  private layout(width: number, height: number): void {
    void width;
    void height;
    this.drawBackdrop(this.scale.width, this.scale.height);
    const mobile = this.scale.width < 760;
    this.cameraZoom = mobile
      ? Phaser.Math.Clamp(Math.min(this.scale.width / 900, this.scale.height / 1180), 0.48, 0.78)
      : Phaser.Math.Clamp(Math.min(this.scale.width / 1900, this.scale.height / 1180), 0.6, 0.94);
    this.world.setScale(this.cameraZoom);
    const focus = this.avatar ? (this.mountedHorse?.root ?? this.avatar.root) : null;
    this.cameraFocusX = focus ? focus.x : 0;
    this.cameraFocusY = focus ? focus.y : 120;
    this.applyCamera();
    this.applyNameplateScale();
  }

  private updateCamera(delta: number): void {
    const player = this.mountedHorse?.root ?? this.avatar.root;
    const smooth = 1 - Math.pow(0.0016, Math.max(0.016, delta / 1000));
    this.cameraFocusX += (player.x - this.cameraFocusX) * smooth;
    this.cameraFocusY += (player.y - this.cameraFocusY) * smooth;
    this.applyCamera();
  }

  private applyCamera(): void {
    const zoom = this.cameraZoom;
    const viewHalfW = this.scale.width / (2 * zoom);
    const viewHalfH = this.scale.height / (2 * zoom);
    const clampAxis = (value: number, halfView: number, limit: number): number => {
      if (halfView >= limit) return 0;
      return Phaser.Math.Clamp(value, -limit + halfView, limit - halfView);
    };
    const focusX = clampAxis(this.cameraFocusX, viewHalfW, CITY_HALF_X);
    const focusY = clampAxis(this.cameraFocusY, viewHalfH, CITY_HALF_Y);
    this.world.setScale(zoom);
    this.world.setPosition(this.scale.width / 2 - focusX * zoom, this.scale.height / 2 - focusY * zoom);
    this.applyNameplateScale();
  }

  private applyNameplateScale(): void {
    const inversed = Phaser.Math.Clamp(1 / this.cameraZoom, 1, 1.45);
    for (const plate of this.nameplates) plate.setScale(inversed);
  }

  private updateDistrict(): void {
    if (!this.avatar || !this.hud) return;
    const mover = this.mountedHorse?.root ?? this.avatar.root;
    const x = mover.x;
    const y = mover.y;
    let nearest: DistrictDefinition = DISTRICTS[0]!;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const district of DISTRICTS) {
      const distance = Phaser.Math.Distance.Between(x, y, district.x, district.y);
      if (distance <= district.radius && distance < nearestDistance) {
        nearest = district;
        nearestDistance = distance;
      }
    }
    if (nearest.id === this.currentDistrict) return;
    this.currentDistrict = nearest.id;
    this.hud.setLocation('Cidade de Valedouro', nearest.name, true);
    if (this.minimapDistrict) this.minimapDistrict.textContent = nearest.name;
  }

  private drawBackdrop(width: number, height: number): void {
    const g = this.backdrop;
    g.clear();
    g.fillGradientStyle(0x233a2a, 0x2f4931, 0x14241c, 0x1a2d22, 1);
    g.fillRect(0, 0, width, height);
    g.fillStyle(0xf4cf88, 0.07);
    g.fillCircle(width * 0.74, height * 0.12, Math.min(width, height) * 0.22);
    g.fillStyle(0xffe3a6, 0.1);
    g.fillCircle(width * 0.74, height * 0.12, Math.min(width, height) * 0.1);
    for (let i = 0; i < 34; i += 1) {
      const x = ((i * 83 + 17) % 100) / 100 * width;
      const y = ((i * 47 + 11) % 54) / 100 * height;
      g.fillStyle(i % 4 === 0 ? 0xffd98c : 0xd6e6c7, 0.1 + (i % 3) * 0.03);
      g.fillCircle(x, y, i % 7 === 0 ? 1.4 : 0.8);
    }
  }

  private buildTown(): void {
    this.buildOuterField();
    this.buildGround();
    this.buildWalls();
    this.buildPlaza();

    this.addBuilding(-140, -500, 1.24, 0xa58a66, 0x6e3b34, 'SANTUÁRIO');
    this.addBuilding(400, -430, 1.1, 0x9e845f, 0x3f5e51, 'CONSELHO');
    this.addBuilding(-650, -110, 1.06, 0x9a7652, 0x7b3e35, 'FERREIRO');
    this.addBuilding(610, -170, 1.1, 0x9b8159, 0x42634d, 'MERCADO');
    this.addBuilding(-520, -390, 0.92, 0x8a6a50, 0x5a477d, 'ALQUIMIA');
    this.addBuilding(-730, 345, 1.05, 0x9c805c, 0x7a4a32, 'JAVALI DOURADO');
    this.addBuilding(560, 470, 1.0, 0x9c805c, 0x385c72, 'ARMAZÉM');
    this.addBuilding(-1030, -80, 0.94, 0x8f775a, 0x4f4270, 'BIBLIOTECA');

    const houses: Array<[number, number, number, number, number, string]> = [
      [-900, 230, 0.72, 0x9d8462, 0x6b4a3a, 'CASA'],
      [-810, -300, 0.7, 0x8d7558, 0x445c6f, 'CASA'],
      [-330, -370, 0.66, 0x9a8262, 0x75503c, 'CASA'],
      [760, -360, 0.72, 0x8f7859, 0x4a5f4c, 'CASA'],
      [960, 150, 0.76, 0x9f8866, 0x6b3f3a, 'CASA'],
      [720, 300, 0.68, 0x8c7457, 0x405a70, 'CASA'],
      [-310, 430, 0.72, 0x9a815f, 0x684a35, 'CASA'],
      [170, 575, 0.66, 0x8e7658, 0x4d6150, 'CASA'],
      [-1080, -330, 0.7, 0x957d5e, 0x5a3f36, 'CASA'],
      [1080, -310, 0.68, 0x8d7658, 0x3f5b64, 'CASA'],
      [1030, 500, 0.64, 0x9c8462, 0x6b4636, 'CASA'],
      [-1030, 560, 0.68, 0x8f7759, 0x47586b, 'CASA'],
      [210, -635, 0.62, 0x957b5c, 0x6a4136, 'CASA'],
      [-330, -650, 0.6, 0x8a7356, 0x3f5a51, 'CASA']
    ];
    for (const [x, y, scale, wall, roof, sign] of houses) {
      this.addBuilding(x, y, scale, wall, roof, sign);
    }

    this.buildFountain(0, 60);
    this.buildStatue(0, -170);
    this.buildPlazaFurniture();
    this.buildGate(0, -WALL.halfY);
    this.buildGate(0, WALL.halfY);
    this.buildNoticeBoard(300, 175);
    this.buildMarketStalls();
    this.buildStreetLamps();
    this.buildTrees();
    this.buildStable(-900, 455);
    this.buildWell(-830, 270);
    this.buildBanners();
    this.buildDistrictSigns();
    this.buildLivestock();
    this.buildCitizens();
    this.buildOuterFarms();
  }

  private buildOuterField(): void {
    const field = this.add.graphics().setDepth(-40);
    field.fillStyle(0x355a3b, 1);
    field.fillRect(-CITY_HALF_X - 900, -CITY_HALF_Y - 540, (CITY_HALF_X + 900) * 2, (CITY_HALF_Y + 540) * 2);
    field.fillStyle(0x3d6441, 0.7);
    field.fillEllipse(-420, -260, 2200, 980);
    field.fillEllipse(760, 320, 1900, 860);
    field.fillStyle(0x2d4c34, 0.55);
    field.fillEllipse(-1500, 420, 1400, 620);
    field.fillEllipse(1550, -360, 1500, 680);
    for (let i = 0; i < 210; i += 1) {
      const x = Phaser.Math.Between(-CITY_HALF_X - 700, CITY_HALF_X + 700);
      const y = Phaser.Math.Between(-CITY_HALF_Y - 400, CITY_HALF_Y + 400);
      field.fillStyle(i % 5 === 0 ? 0x577f4d : i % 3 === 0 ? 0x2b4932 : 0x456d43, 0.35);
      field.fillEllipse(x, y, Phaser.Math.Between(24, 90), Phaser.Math.Between(10, 34));
    }
    field.lineStyle(10, 0x7e6a48, 0.72);
    field.lineBetween(-CITY_HALF_X, 620, -WALL.halfX, 470);
    field.lineBetween(WALL.halfX, 470, CITY_HALF_X, 620);
    field.lineBetween(-CITY_HALF_X, -620, -WALL.halfX, -470);
    field.lineBetween(WALL.halfX, -470, CITY_HALF_X, -620);
    this.world.add(field);
  }

  private buildGround(): void {
    const ground = this.add.graphics().setDepth(0);
    const halfCols = (CITY_COLS - 1) / 2;
    const halfRows = (CITY_ROWS - 1) / 2;
    for (let row = 0; row < CITY_ROWS; row += 1) {
      for (let col = 0; col < CITY_COLS; col += 1) {
        const x = (col - row - (halfCols - halfRows)) * (TILE_W / 2);
        const y = (col + row - halfCols - halfRows) * (TILE_H / 2);
        const sum = col + row;
        const diff = col - row;
        const plaza = Math.abs(sum - 31) <= 7 && Math.abs(diff - 3) <= 7;
        const road =
          Math.abs(sum - 31) <= 1 ||
          Math.abs(diff - 3) <= 1 ||
          Math.abs(sum - 19) <= 1 ||
          Math.abs(sum - 43) <= 1 ||
          Math.abs(diff + 11) <= 1 ||
          Math.abs(diff - 17) <= 1 ||
          plaza;
        const hash = (col * 928371 + row * 12377 + ((col * row) % 97)) % 9;
        const color = road
          ? hash < 3 ? 0x877a61 : 0x82755d
          : hash < 2 ? 0x517a56 : hash < 4 ? 0x4d7653 : 0x4b7451;
        const points = [
          { x, y: y - TILE_H / 2 },
          { x: x + TILE_W / 2, y },
          { x, y: y + TILE_H / 2 },
          { x: x - TILE_W / 2, y }
        ];
        ground.fillStyle(color, 1);
        ground.fillPoints(points, true);
        ground.lineStyle(1, road ? 0x5e5342 : 0x315239, 0.1);
        ground.strokePoints(points, true);
        if (!road && (col * 13 + row * 7) % 11 === 0) {
          ground.fillStyle(0x6d925f, 0.5);
          ground.fillEllipse(x + 12, y + 2, 18, 7);
        }
      }
    }
    // Textura de capim e pequenas flores quebra o padrão da grade.
    for (let i = 0; i < 190; i += 1) {
      const x = ((i * 467 + 113) % 3180) - 1590;
      const y = ((i * 283 + 71) % 1540) - 770;
      ground.fillStyle(i % 4 === 0 ? 0x6f966b : 0x5b8460, 0.26);
      ground.fillEllipse(x, y, 9, 3);
      if (i % 11 === 0) {
        ground.fillStyle(i % 2 === 0 ? 0xd9c06a : 0xc98a8a, 0.58);
        ground.fillCircle(x + 3, y - 2, 1.4);
      }
    }
    this.world.add(ground);
  }

  private buildWalls(): void {
    const wall = this.add.container(0, 0).setDepth(14);
    const g = this.add.graphics();
    const ring = [
      { x: 0, y: -WALL.halfY },
      { x: WALL.halfX, y: 0 },
      { x: 0, y: WALL.halfY },
      { x: -WALL.halfX, y: 0 }
    ];
    for (let i = 0; i < 4; i += 1) {
      const a = ring[i];
      const b = ring[(i + 1) % 4];
      if (!a || !b) continue;
      g.lineStyle(38, 0x251f18, 0.5);
      g.lineBetween(a.x, a.y + 10, b.x, b.y + 10);
      g.lineStyle(28, 0x7d7768, 1);
      g.lineBetween(a.x, a.y, b.x, b.y);
      g.lineStyle(12, 0x9a9482, 1);
      g.lineBetween(a.x, a.y - 7, b.x, b.y - 7);
      g.lineStyle(3, 0x4e4a41, 0.9);
      g.lineBetween(a.x, a.y + 9, b.x, b.y + 9);
      const segments = 9;
      for (let step = 1; step < segments; step += 1) {
        const t = step / segments;
        const x = a.x + (b.x - a.x) * t;
        const y = a.y + (b.y - a.y) * t;
        g.fillStyle(0x8f8978, 1);
        g.fillRect(x - 7, y - 25, 14, 21);
        g.fillStyle(0x625e53, 1);
        g.fillRect(x - 9, y - 28, 18, 5);
      }
    }
    for (const [x, y] of [[WALL.halfX, 0], [-WALL.halfX, 0]] as Array<[number, number]>) {
      this.drawTower(g, x, y);
    }
    wall.add(g);
    this.world.add(wall);
  }

  private drawTower(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    g.fillStyle(0x4b463c, 1);
    g.fillEllipse(x, y + 22, 94, 28);
    g.fillStyle(0x8a8372, 1);
    g.fillRoundedRect(x - 34, y - 118, 68, 130, 8);
    g.fillStyle(0x6c675b, 1);
    g.fillRect(x - 34, y - 24, 68, 24);
    g.fillStyle(0x9c9583, 1);
    g.fillRoundedRect(x - 44, y - 142, 88, 28, 7);
    for (let i = -2; i <= 2; i += 1) {
      g.fillStyle(0x9c9583, 1);
      g.fillRect(x + i * 16 - 5, y - 158, 11, 20);
    }
    g.fillStyle(0x2d3f46, 1);
    g.fillRoundedRect(x - 9, y - 84, 18, 28, 8);
    g.fillStyle(0xe7bd70, 0.4);
    g.fillRoundedRect(x - 6, y - 81, 12, 22, 6);
    for (let i = 0; i < 3; i += 1) {
      g.lineStyle(1, 0x544f45, 0.6);
      g.lineBetween(x - 30, y - 108 + i * 18, x + 30, y - 108 + i * 18);
    }
  }

  private buildPlaza(): void {
    const plaza = this.add.graphics().setDepth(3);
    plaza.fillStyle(0x8a7c61, 0.95);
    plaza.fillEllipse(0, 55, 900, 400);
    plaza.lineStyle(8, 0x665a46, 1);
    plaza.strokeEllipse(0, 55, 920, 414);
    plaza.lineStyle(2, 0xa79774, 0.75);
    plaza.strokeEllipse(0, 55, 830, 360);
    plaza.strokeEllipse(0, 55, 700, 300);
    for (let i = 0; i < 18; i += 1) {
      const angle = (i / 18) * Math.PI * 2;
      plaza.lineBetween(Math.cos(angle) * 110, 55 + Math.sin(angle) * 54, Math.cos(angle) * 440, 55 + Math.sin(angle) * 196);
    }
    plaza.fillStyle(0x6e624d, 0.36);
    plaza.fillEllipse(0, 55, 180, 74);
    plaza.lineStyle(2, 0xb9a67d, 0.6);
    plaza.strokeEllipse(0, 55, 200, 86);
    this.world.add(plaza);
  }

  private addBuilding(x: number, y: number, scale: number, wallColor: number, roofColor: number, sign: string): void {
    const house = this.add.container(x, y).setDepth(80 + y);
    const g = this.add.graphics();
    const w = 118 * scale;
    const h = 78 * scale;
    const roofTop = -h / 2 - 62 * scale;
    const roofBottom = -h / 2 + 32 * scale;

    g.fillStyle(0x06100b, 0.34);
    g.fillEllipse(0, 10 * scale, 218 * scale, 54 * scale);
    g.fillStyle(0x4b3828, 1);
    g.fillPoints([{ x: -w, y: -h / 2 }, { x: 0, y: -h / 2 + 30 * scale }, { x: 0, y: h / 2 + 30 * scale }, { x: -w, y: h / 2 }], true);
    g.fillStyle(wallColor, 1);
    g.fillPoints([{ x: 0, y: -h / 2 + 30 * scale }, { x: w, y: -h / 2 }, { x: w, y: h / 2 }, { x: 0, y: h / 2 + 30 * scale }], true);
    g.lineStyle(2, 0x33271f, 1);
    g.strokePoints([{ x: 0, y: -h / 2 + 30 * scale }, { x: w, y: -h / 2 }, { x: w, y: h / 2 }, { x: 0, y: h / 2 + 30 * scale }], true);

    // Vigas de madeira do enxaimel.
    g.lineStyle(3 * scale, 0x5b412b, 0.9);
    g.lineBetween(-w + 10 * scale, -h / 2 + 12 * scale, -10 * scale, h / 2 - 8 * scale);
    g.lineBetween(-w + 12 * scale, h / 2 - 14 * scale, -12 * scale, -h / 2 + 20 * scale);
    g.lineBetween(-w + 8 * scale, -h / 2 + 24 * scale, -12 * scale, -h / 2 + 40 * scale);
    g.lineStyle(2 * scale, 0x5b412b, 0.8);
    g.lineBetween(-8 * scale, -h / 2 + 38 * scale, -w + 18 * scale, h / 2 - 18 * scale);

    // Telhado de duas águas com telhas.
    g.fillStyle(roofColor, 1);
    g.fillPoints([{ x: -w - 10 * scale, y: -h / 2 }, { x: 0, y: roofTop }, { x: w + 10 * scale, y: -h / 2 }, { x: 0, y: roofBottom }], true);
    g.lineStyle(3 * scale, 0x35271f, 1);
    g.strokePoints([{ x: -w - 10 * scale, y: -h / 2 }, { x: 0, y: roofTop }, { x: w + 10 * scale, y: -h / 2 }, { x: 0, y: roofBottom }], true);
    g.lineStyle(1.4 * scale, 0x2e2119, 0.55);
    for (let i = 1; i <= 4; i += 1) {
      const t = i / 5;
      g.lineBetween(-w + t * w, -h / 2 + t * 8 * scale, -t * w * 0.2, roofBottom - t * 42 * scale);
      g.lineBetween(w - t * w, -h / 2 + t * 8 * scale, t * w * 0.2, roofBottom - t * 42 * scale);
    }

    // Chaminé e fumaça.
    g.fillStyle(0x5e5145, 1);
    g.fillRoundedRect(w * 0.34, roofTop + 18 * scale, 16 * scale, 36 * scale, 3 * scale);
    g.fillStyle(0x382f27, 1);
    g.fillRect(w * 0.34 - 2 * scale, roofTop + 16 * scale, 20 * scale, 6 * scale);

    // Janelas e porta.
    g.fillStyle(0x2f2118, 1);
    g.fillRoundedRect(-15 * scale, 4 * scale, 30 * scale, 54 * scale, 11 * scale);
    g.fillStyle(0x6d4b2c, 1);
    g.fillRoundedRect(-12 * scale, 7 * scale, 24 * scale, 48 * scale, 9 * scale);
    g.fillStyle(0xf4cf88, 0.9);
    g.fillRoundedRect(-12 * scale, -20 * scale, 24 * scale, 18 * scale, 4 * scale);
    g.fillRoundedRect(-w + 24 * scale, -8 * scale, 24 * scale, 20 * scale, 4 * scale);
    g.fillRoundedRect(w - 48 * scale, -8 * scale, 24 * scale, 20 * scale, 4 * scale);
    g.lineStyle(2 * scale, 0x3b2b1f, 1);
    g.lineBetween(-w + 36 * scale, -8 * scale, -w + 36 * scale, 12 * scale);
    g.lineBetween(w - 36 * scale, -8 * scale, w - 36 * scale, 12 * scale);
    g.lineBetween(0, -20 * scale, 0, -2 * scale);

    // Placa pendurada.
    g.lineStyle(2 * scale, 0x3a2a1e, 1);
    g.lineBetween(w + 6 * scale, -h / 2 + 4 * scale, w + 18 * scale, -h / 2 + 4 * scale);
    g.fillStyle(0x6d4b2c, 1);
    g.fillRoundedRect(w + 6 * scale, -h / 2 + 4 * scale, 22 * scale, 16 * scale, 3 * scale);
    g.lineStyle(1, 0x2d2117, 1);
    g.strokeRoundedRect(w + 6 * scale, -h / 2 + 4 * scale, 22 * scale, 16 * scale, 3 * scale);
    house.add(g);

    const plaque = this.add.text(0, roofTop - 15 * scale, sign, {
      fontFamily: FONT, fontSize: `${Math.max(9, 11 * scale)}px`, fontStyle: 'bold',
      color: '#f6dfaa', stroke: '#35271f', strokeThickness: 3, letterSpacing: 1
    }).setOrigin(0.5);
    plaque.setDepth(1);
    house.add(plaque);
    this.world.add(house);
  }

  private buildFountain(x: number, y: number): void {
    const f = this.add.container(x, y).setDepth(140);
    const g = this.add.graphics();
    g.fillStyle(0x111b1a, 0.4); g.fillEllipse(0, 16, 240, 74);
    g.fillStyle(0x77766b, 1); g.fillEllipse(0, 0, 220, 74);
    g.lineStyle(5, 0xc3b493, 1); g.strokeEllipse(0, 0, 220, 74);
    g.fillStyle(0x2c7583, 1); g.fillEllipse(0, -5, 186, 56);
    g.fillStyle(0x64b8bd, 0.8); g.fillEllipse(-30, -12, 62, 13);
    g.fillStyle(0x8c8c7c, 1); g.fillRoundedRect(-17, -75, 34, 70, 8);
    g.fillStyle(0x9d9a86, 1); g.fillEllipse(0, -76, 58, 20);
    g.fillStyle(0x65d0d5, 0.85); g.fillEllipse(0, -87, 15, 34);
    g.fillStyle(0xd7f0ee, 0.7); g.fillCircle(-8, -66, 2.5); g.fillCircle(9, -58, 2);
    f.add(g); this.world.add(f);
    this.tweens.add({ targets: f, y: y + 2, duration: 2100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  private buildStatue(x: number, y: number): void {
    const statue = this.add.container(x, y).setDepth(150 + y);
    const g = this.add.graphics();
    g.fillStyle(0x111b1a, 0.35); g.fillEllipse(0, 8, 120, 38);
    g.fillStyle(0x796e5c, 1); g.fillRoundedRect(-42, -18, 84, 26, 5);
    g.fillStyle(0x8e8370, 1); g.fillRoundedRect(-30, -54, 60, 40, 6);
    g.fillStyle(0x9b907b, 1); g.fillRoundedRect(-20, -90, 40, 40, 8);
    g.fillStyle(0x8b806d, 1); g.fillCircle(0, -110, 14);
    g.fillStyle(0x6f6555, 1); g.fillRoundedRect(-5, -142, 10, 44, 3);
    g.fillStyle(0xd8c48a, 1); g.fillCircle(0, -148, 6);
    g.fillStyle(0x6f6555, 1); g.fillRect(-26, -88, 52, 6);
    statue.add(g);
    statue.add(this.add.text(0, -174, 'VALEDOURO', { fontFamily: FONT, fontSize: '9px', fontStyle: 'bold', color: '#e8d4a2', stroke: '#2c251d', strokeThickness: 3, letterSpacing: 1 }).setOrigin(0.5));
    this.world.add(statue);
  }

  private buildGate(x: number, y: number): void {
    const gate = this.add.container(x, y).setDepth(160);
    const g = this.add.graphics();
    g.fillStyle(0x4c4b47, 1);
    g.fillPoints([{x:-110,y:0},{x:-86,y:-148},{x:-48,y:-160},{x:-30,y:0}], true);
    g.fillPoints([{x:30,y:0},{x:48,y:-160},{x:86,y:-148},{x:110,y:0}], true);
    g.fillStyle(0x6c6252, 1);
    g.fillRoundedRect(-40, -158, 80, 164, 21);
    g.fillStyle(0x152a32, 1);
    g.fillRoundedRect(-28, -140, 56, 144, 21);
    g.lineStyle(5, 0xb99b62, 1);
    g.strokeRoundedRect(-40, -158, 80, 164, 21);
    g.fillStyle(0xf3cb7a, 0.24);
    g.fillEllipse(0, -66, 86, 104);
    g.fillStyle(0x7d7768, 1);
    g.fillRect(-112, -22, 224, 20);
    for (let i = -3; i <= 3; i += 1) {
      g.fillStyle(0x9a9482, 1);
      g.fillRect(i * 28 - 5, -116 - Math.abs(i) * 2, 10, 18);
    }
    gate.add(g);
    const label = this.add.text(0, -186, 'PORTAL DAS AVENTURAS', {
      fontFamily: FONT, fontSize: '11px', fontStyle: 'bold', color: '#f5d68f',
      stroke: '#1b2221', strokeThickness: 4, letterSpacing: 1
    }).setOrigin(0.5);
    gate.add(label);
    this.world.add(gate);
  }

  private buildNoticeBoard(x: number, y: number): void {
    const board = this.add.container(x, y).setDepth(180 + y);
    const g = this.add.graphics();
    g.fillStyle(0x111b1a, 0.32); g.fillEllipse(0, 4, 110, 28);
    g.fillStyle(0x51351f, 1); g.fillRoundedRect(-7, -6, 14, 62, 3);
    g.fillStyle(0x76502e, 1); g.fillRoundedRect(-46, -58, 92, 56, 6);
    g.lineStyle(4, 0xc49a5b, 1); g.strokeRoundedRect(-46, -58, 92, 56, 6);
    g.fillStyle(0xe7d3a7, 1); g.fillRect(-34, -47, 68, 34);
    g.lineStyle(2, 0x876a45, 0.8);
    g.lineBetween(-24, -37, 21, -37); g.lineBetween(-24, -28, 13, -28); g.lineBetween(-24, -19, 26, -19);
    g.fillStyle(0x8e2f2f, 1); g.fillCircle(31, -44, 3);
    board.add(g);
    board.add(this.add.text(0, -74, 'EDITAIS DA CIDADE', { fontFamily: FONT, fontSize: '10px', fontStyle: 'bold', color: '#f5d68f', stroke: '#251a12', strokeThickness: 3 }).setOrigin(0.5));
    this.world.add(board);
  }

  private buildMarketStalls(): void {
    const stalls: Array<[number, number, number, number]> = [
      [420, 40, 0.95, 0x8a3b42],
      [500, 105, 0.88, 0x3b5c8a],
      [350, 150, 0.82, 0x4f7048],
      [560, 205, 0.8, 0x8a6d32]
    ];
    for (const [x, y, s, canvas] of stalls) {
      const stall = this.add.container(x, y).setDepth(200 + y);
      const g = this.add.graphics();
      g.fillStyle(0x111b1a, 0.3); g.fillEllipse(0, 6, 100 * s, 30 * s);
      g.fillStyle(0x5a4027, 1); g.fillRect(-40 * s, -34 * s, 6 * s, 44 * s); g.fillRect(34 * s, -34 * s, 6 * s, 44 * s);
      g.fillStyle(0x7a5b35, 1); g.fillRoundedRect(-44 * s, -20 * s, 88 * s, 22 * s, 3 * s);
      g.fillStyle(0xd8c49b, 1); g.fillPoints([{ x: -52 * s, y: -34 * s }, { x: 0, y: -58 * s }, { x: 52 * s, y: -34 * s }], true);
      g.fillStyle(canvas, 1); g.fillTriangle(-52 * s, -34 * s, 0, -58 * s, 0, -34 * s);
      g.fillTriangle(0, -34 * s, 0, -58 * s, 52 * s, -34 * s);
      g.lineStyle(2, 0x4a3521, 1); g.strokePoints([{ x: -52 * s, y: -34 * s }, { x: 0, y: -58 * s }, { x: 52 * s, y: -34 * s }], true);
      const goods = [0xd8a64c, 0xb5473f, 0x7fa45c, 0xc9b48c];
      for (let i = 0; i < 4; i += 1) {
        g.fillStyle(goods[i] ?? 0xd8a64c, 1);
        g.fillCircle(-30 * s + i * 20 * s, -25 * s, 5 * s);
      }
      stall.add(g);
      this.world.add(stall);
    }
  }

  private buildStreetLamps(): void {
    const spots: Array<[number, number]> = [
      [-430, -40], [430, -110], [-400, 250], [400, 260], [0, -270],
      [-720, 60], [720, 60], [-280, -480], [280, -480], [-830, 430], [830, 430]
    ];
    for (const [x, y] of spots) {
      const lamp = this.add.container(x, y).setDepth(170 + y);
      const g = this.add.graphics();
      g.fillStyle(0x3b3024, 1); g.fillRoundedRect(-4, -66, 8, 70, 3);
      g.fillStyle(0x725335, 1); g.fillRoundedRect(-15, -76, 30, 14, 4);
      g.fillStyle(0xffc56e, 0.95); g.fillCircle(0, -85, 8);
      g.fillStyle(0xffc56e, 0.13); g.fillCircle(0, -85, 30);
      g.fillStyle(0x2c251d, 1); g.fillTriangle(-13, -95, 13, -95, 0, -106);
      lamp.add(g); this.world.add(lamp);
      this.tweens.add({ targets: g, alpha: { from: 0.8, to: 1 }, duration: 900, yoyo: true, repeat: -1 });
    }
  }

  private buildTrees(): void {
    const trees: Array<[number, number, number]> = [
      [-1150, -180, 1.2], [-1180, 120, 0.95], [1140, -220, 1.15], [1180, 150, 0.95],
      [-880, -500, 1.0], [880, -520, 1.05], [-1100, 340, 1.1], [1120, 380, 1.0],
      [-760, 610, 0.95], [760, 620, 1.05], [-520, 620, 0.9], [520, 620, 0.95],
      [-1300, 30, 1.2], [1300, 30, 1.2], [-1250, -350, 1.0], [1250, -370, 1.05]
    ];
    for (const [x, y, s] of trees) {
      const tree = this.add.container(x, y).setDepth(90 + y);
      const g = this.add.graphics();
      g.fillStyle(0x161f16, 0.32); g.fillEllipse(0, 3, 100 * s, 28 * s);
      g.fillStyle(0x493322, 1); g.fillRoundedRect(-7 * s, -54 * s, 14 * s, 60 * s, 4 * s);
      g.fillStyle(0x28583e, 1); g.fillCircle(-17 * s, -68 * s, 34 * s); g.fillCircle(19 * s, -82 * s, 38 * s); g.fillCircle(0, -106 * s, 40 * s);
      g.lineStyle(2.5, 0x183c2b, 1); g.strokeCircle(-17 * s, -68 * s, 34 * s); g.strokeCircle(19 * s, -82 * s, 38 * s); g.strokeCircle(0, -106 * s, 40 * s);
      g.fillStyle(0x57935b, 0.6); g.fillCircle(-11 * s, -114 * s, 17 * s); g.fillCircle(27 * s, -92 * s, 12 * s);
      g.fillStyle(0x6a9a63, 0.5); g.fillCircle(-29 * s, -74 * s, 12 * s);
      tree.add(g);
      this.world.add(tree);
    }
    for (const [x, y, s] of [[-620, -460, 0.55], [620, -470, 0.6], [-1180, 480, 0.55], [1180, 500, 0.6], [-380, 620, 0.5], [380, 630, 0.55]] as Array<[number, number, number]>) {
      const bush = this.add.graphics().setDepth(80 + y);
      bush.fillStyle(0x17301f, 0.3); bush.fillEllipse(x, y + 3, 70 * s, 20 * s);
      bush.fillStyle(0x35633f, 1); bush.fillCircle(x - 16 * s, y - 8 * s, 18 * s); bush.fillCircle(x + 12 * s, y - 14 * s, 22 * s); bush.fillCircle(x + 2 * s, y - 2 * s, 16 * s);
      bush.fillStyle(0x4f8150, 0.8); bush.fillCircle(x - 4 * s, y - 20 * s, 10 * s);
      this.world.add(bush);
    }
  }

  private buildWell(x: number, y: number): void {
    const well = this.add.container(x, y).setDepth(160 + y);
    const g = this.add.graphics();
    g.fillStyle(0x111b1a, 0.35); g.fillEllipse(0, 8, 104, 32);
    g.fillStyle(0x7c7364, 1); g.fillEllipse(0, 0, 92, 38); g.fillStyle(0x1d3338, 1); g.fillEllipse(0, -2, 68, 26);
    g.lineStyle(2, 0xa89a7f, 1); g.strokeEllipse(0, 0, 92, 38);
    g.fillStyle(0x5a4027, 1); g.fillRect(-40, -54, 6, 58); g.fillRect(34, -54, 6, 58);
    g.fillStyle(0x8a6a3e, 1); g.fillPoints([{ x: -50, y: -54 }, { x: 0, y: -82 }, { x: 50, y: -54 }], true);
    g.lineStyle(2, 0x3c2a1e, 1); g.strokePoints([{ x: -50, y: -54 }, { x: 0, y: -82 }, { x: 50, y: -54 }], true);
    g.fillStyle(0x3c2a1e, 1); g.fillRect(-32, -48, 64, 4);
    g.fillStyle(0x65442a, 1); g.fillRoundedRect(-9, -40, 18, 18, 3);
    well.add(g); this.world.add(well);
  }

  private buildStable(x: number, y: number): void {
    const stable = this.add.container(x, y).setDepth(80 + y);
    const g = this.add.graphics();
    g.fillStyle(0x08110e, 0.35);
    g.fillEllipse(0, 14, 330, 78);
    g.fillStyle(0x3c2a1e, 1);
    for (const px of [-142, -50, 50, 142]) g.fillRoundedRect(px - 6, -96, 12, 104, 3);
    g.fillStyle(0x5a4027, 1); g.fillRect(-150, -100, 300, 9);
    g.fillStyle(0x8a6a3e, 1); g.fillPoints([{ x: -164, y: -100 }, { x: 0, y: -158 }, { x: 164, y: -100 }], true);
    g.lineStyle(3, 0x3c2a1e, 1); g.strokePoints([{ x: -164, y: -100 }, { x: 0, y: -158 }, { x: 164, y: -100 }], true);
    g.lineStyle(2, 0x6b4f2c, 0.7);
    for (let i = -3; i <= 3; i += 1) g.lineBetween(i * 40, -100 - Math.abs(i) * 2, i * 19, -152 + Math.abs(i) * 16);
    g.fillStyle(0x4a3524, 1); g.fillRect(-142, -76, 284, 68);
    g.lineStyle(2, 0x2a1d14, 1);
    for (let i = -1; i <= 1; i += 1) g.lineBetween(i * 94, -76, i * 94, -8);
    g.fillStyle(0xd9b96a, 1); g.fillRoundedRect(-124, -26, 44, 26, 6); g.fillRoundedRect(80, -28, 44, 28, 6);
    g.lineStyle(1.5, 0x9a7a3c, 0.8);
    for (let i = 0; i < 5; i += 1) g.lineBetween(-124, -22 + i * 4, -80, -24 + i * 4);
    g.fillStyle(0x5c4a33, 1); g.fillRoundedRect(-10, -20, 50, 15, 4);
    g.fillStyle(0x3c7a8a, 0.9); g.fillRoundedRect(-6, -18, 42, 9, 3);
    stable.add(g);

    const plaque = this.add.text(0, -174, 'ESTÁBULO DE VALEDOURO', {
      fontFamily: FONT, fontSize: '11px', fontStyle: 'bold', color: '#f6dfaa',
      stroke: '#35271f', strokeThickness: 4, letterSpacing: 1
    }).setOrigin(0.5);
    stable.add(plaque);
    this.world.add(stable);

    const horseSpecs: Array<{ x: number; y: number; color: number; mane: number; saddle: number; scale: number }> = [
      { x: -80, y: 10, color: 0x8a5a32, mane: 0x2c1d12, saddle: 0x8a3b42, scale: 0.5 },
      { x: 208, y: 12, color: 0x3f3a34, mane: 0x15120f, saddle: 0x3b5c8a, scale: 0.47 },
      { x: 280, y: 48, color: 0xc9b48c, mane: 0x6b5a42, saddle: 0x5c3b6e, scale: 0.45 }
    ];
    horseSpecs.forEach((spec, index) => {
      const horse = new HorseView(this, x + spec.x, y + spec.y, {
        color: spec.color, mane: spec.mane, saddle: spec.saddle, scale: spec.scale
      });
      horse.setFacing(-1);
      horse.root.setDepth(100 + y + spec.y);
      this.world.add(horse.root);
      this.stableHorses.push(horse);
      this.startStableHorsePatrol(
        horse,
        x + spec.x - 24,
        x + spec.x + 24,
        y + spec.y,
        index % 2 === 0,
        700 + index * 1300
      );
    });

    const patrol = new HorseView(this, x - 30, y + 108, {
      color: 0x4a3a2c,
      mane: 0x1c140e,
      saddle: 0x8a3b42,
      scale: 0.56,
      rider: true,
      riderColor: 0x8794a8,
      riderAccent: 0x9b2f35
    });
    patrol.root.setDepth(100 + y + 108);
    this.world.add(patrol.root);
    this.mountedPatrol = patrol;
    this.startMountedPatrol(patrol, x - 210, x + 300, y + 108);
  }

  private startStableHorsePatrol(
    horse: HorseView,
    leftX: number,
    rightX: number,
    y: number,
    moveRightFirst: boolean,
    delay: number
  ): void {
    const walk = (toRight: boolean): void => {
      if (!this.alive) return;
      const destination = toRight ? rightX : leftX;
      const distance = Math.abs(destination - horse.root.x);
      horse.walkTo(destination, y, Phaser.Math.Clamp(distance * 115, 3200, 5600));
      this.time.delayedCall(6200, () => walk(!toRight));
    };
    this.time.delayedCall(delay, () => walk(moveRightFirst));
  }

  private startMountedPatrol(horse: HorseView, fromX: number, toX: number, y: number): void {
    if (!this.alive) return;
    // A ronda é lenta e espaçada para a cidade respirar como uma cena viva, não agitada.
    horse.walkTo(toX, y, 26000);
    this.time.delayedCall(31000, () => {
      if (!this.alive) return;
      horse.walkTo(fromX, y, 26000);
      this.time.delayedCall(31000, () => this.startMountedPatrol(horse, fromX, toX, y));
    });
  }

  private buildBanners(): void {
    const spots: Array<[number, number, number]> = [
      [-95, -620, 0x8a3b42], [95, -620, 0x8a3b42],
      [-95, 620, 0x3b5c8a], [95, 620, 0x3b5c8a],
      [-540, -230, 0x8a3b42], [540, -230, 0x3b5c8a],
      [-980, 40, 0x6c4b8a], [980, 40, 0x4f7048]
    ];
    for (const [x, y, color] of spots) {
      const banner = this.add.container(x, y).setDepth(120 + y);
      const g = this.add.graphics();
      g.fillStyle(0x3a2a1e, 1); g.fillRoundedRect(-3, -112, 6, 116, 2);
      g.fillStyle(color, 1);
      g.lineStyle(2, 0x2a1416, 1);
      g.fillPoints([{ x: 3, y: -106 }, { x: 48, y: -106 }, { x: 48, y: -46 }, { x: 25, y: -58 }, { x: 3, y: -46 }], true);
      g.fillStyle(0xe7c168, 1); g.fillCircle(25, -78, 7); g.fillStyle(0x2a1416, 1); g.fillCircle(25, -78, 3);
      banner.add(g);
      this.world.add(banner);
      this.tweens.add({ targets: banner, angle: { from: -0.6, to: 0.6 }, duration: Phaser.Math.Between(2800, 4200), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  }

  private buildDistrictSigns(): void {
    const signs: Array<[number, number, string, number]> = [
      [-330, -40, 'FERREIRO', -1],
      [330, -60, 'MERCADO', 1],
      [0, -300, 'SANTUÁRIO', -1],
      [0, 300, 'ARMAZÉM', 1],
      [-560, 220, 'ESTÁBULO', -1],
      [560, 250, 'OFÍCIOS', 1]
    ];
    for (const [x, y, text, direction] of signs) {
      const sign = this.add.container(x, y).setDepth(190 + y);
      const g = this.add.graphics();
      g.fillStyle(0x4a3422, 1); g.fillRoundedRect(-4, -54, 8, 60, 3);
      g.fillStyle(0x76502e, 1); g.fillRoundedRect(direction > 0 ? 0 : -68, -50, 68, 18, 3);
      g.lineStyle(1.5, 0xd0a967, 1); g.strokeRoundedRect(direction > 0 ? 0 : -68, -50, 68, 18, 3);
      const label = this.add.text(direction > 0 ? 34 : -34, -41, text, {
        fontFamily: FONT, fontSize: '8px', fontStyle: 'bold', color: '#f0d9a6'
      }).setOrigin(0.5);
      sign.add(g); sign.add(label); this.world.add(sign);
    }
  }

  private buildLivestock(): void {
    const animals: Array<[number, number, number, number]> = [
      [430, 195, 0.9, 0xd8c7a0], [460, 215, 0.8, 0xc9b48c], [405, 235, 0.7, 0xe4d6b4],
      [720, 520, 0.9, 0xd9c9a6], [680, 540, 0.75, 0xc2ad84]
    ];
    for (const [x, y, s, color] of animals) {
      const animal = this.add.container(x, y).setDepth(220 + y);
      const g = this.add.graphics();
      g.fillStyle(0x111b1a, 0.24); g.fillEllipse(0, 4, 42 * s, 13 * s);
      g.fillStyle(color, 1); g.fillEllipse(0, -12 * s, 26 * s, 18 * s);
      g.fillCircle(-15 * s, -20 * s, 8 * s);
      g.fillCircle(14 * s, -20 * s, 8 * s);
      g.fillCircle(15 * s, -22 * s, 8 * s);
      g.fillStyle(0x7f6d50, 1); g.fillRect(-7 * s, -6 * s, 4 * s, 10 * s); g.fillRect(4 * s, -6 * s, 4 * s, 10 * s);
      g.fillStyle(0x2a2118, 1); g.fillCircle(-18 * s, -22 * s, 1.6 * s);
      animal.add(g); this.world.add(animal);
      this.tweens.add({ targets: animal, y: y - 2, duration: Phaser.Math.Between(1900, 3200), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  }

  private buildPlazaFurniture(): void {
    // Bancos de madeira virados para a fonte.
    const benches: Array<[number, number, number]> = [
      [-230, 150, 0.12], [230, 150, -0.12], [-300, 10, 1.45], [300, 10, -1.45]
    ];
    for (const [x, y, angle] of benches) {
      const bench = this.add.container(x, y).setDepth(170 + y);
      const g = this.add.graphics();
      g.fillStyle(0x111b1a, 0.24); g.fillEllipse(0, 4, 74, 18);
      g.fillStyle(0x6b4a2f, 1); g.fillRoundedRect(-34, -12, 68, 8, 3);
      g.fillStyle(0x8a6238, 1); g.fillRoundedRect(-34, -22, 68, 7, 3);
      g.fillStyle(0x3c2a1e, 1); g.fillRect(-28, -5, 5, 16); g.fillRect(23, -5, 5, 16);
      bench.add(g);
      bench.rotation = angle;
      this.world.add(bench);
    }
    // Floreiras e vasos.
    const planters: Array<[number, number, number]> = [
      [-150, -60, 0xb5654a], [150, -60, 0xb5654a], [-170, 190, 0x8a5a3a], [170, 190, 0x8a5a3a]
    ];
    for (const [x, y, potColor] of planters) {
      const planter = this.add.container(x, y).setDepth(170 + y);
      const g = this.add.graphics();
      g.fillStyle(0x111b1a, 0.24); g.fillEllipse(0, 4, 56, 16);
      g.fillStyle(potColor, 1); g.fillRoundedRect(-18, -20, 36, 20, 5);
      g.fillStyle(0x6a4630, 1); g.fillRect(-16, -22, 32, 4);
      g.fillStyle(0x2f613c, 1); g.fillCircle(-10, -30, 10); g.fillCircle(9, -32, 12); g.fillCircle(0, -24, 9);
      g.fillStyle(0xc95d6b, 1); g.fillCircle(-13, -34, 3); g.fillCircle(6, -40, 3); g.fillCircle(14, -28, 2.5);
      g.fillStyle(0xe8c877, 1); g.fillCircle(-3, -30, 2.5); g.fillCircle(13, -36, 2);
      planter.add(g); this.world.add(planter);
    }
    // Carroça e caixotes perto do mercado.
    const cart = this.add.container(360, 100).setDepth(270);
    const cg = this.add.graphics();
    cg.fillStyle(0x111b1a, 0.26); cg.fillEllipse(0, 10, 120, 28);
    cg.fillStyle(0x6b4a2f, 1); cg.fillRoundedRect(-46, -30, 92, 28, 4);
    cg.fillStyle(0x8a6238, 1); cg.fillRect(-46, -32, 92, 5);
    cg.lineStyle(3, 0x3c2a1e, 1); cg.strokeCircle(-34, 6, 13); cg.strokeCircle(34, 6, 13);
    cg.lineStyle(2, 0x3c2a1e, 1); cg.lineBetween(-46, -18, -72, -8);
    cg.fillStyle(0xd8b06a, 1); cg.fillRoundedRect(-32, -52, 26, 20, 3); cg.fillStyle(0x9a5a3c, 1); cg.fillRoundedRect(2, -48, 22, 16, 3);
    cart.add(cg); this.world.add(cart);

    const clutter = this.add.graphics().setDepth(260);
    for (const [x, y, s] of [[-390, 180, 1], [-360, 195, 0.8], [430, 250, 0.9], [-350, -80, 0.7]] as Array<[number, number, number]>) {
      clutter.fillStyle(0x65442a, 1); clutter.fillRoundedRect(x, y - 22 * s, 20 * s, 24 * s, 4);
      clutter.lineStyle(1.5, 0x2c2119, 1); clutter.strokeRoundedRect(x, y - 22 * s, 20 * s, 24 * s, 4);
      clutter.lineStyle(1.5, 0xb18b55, 1); clutter.lineBetween(x, y - 14 * s, x + 20 * s, y - 14 * s);
      clutter.lineBetween(x, y - 5 * s, x + 20 * s, y - 5 * s);
    }
    this.world.add(clutter);

    // Pombos na praça.
    const pigeons = this.add.graphics().setDepth(250);
    for (const [x, y] of [[-70, 95], [55, 88], [88, 130], [-105, 135], [25, 160]] as Array<[number, number]>) {
      pigeons.fillStyle(0x9aa3a0, 1); pigeons.fillEllipse(x, y, 8, 5);
      pigeons.fillCircle(x + 4, y - 4, 3);
      pigeons.fillStyle(0x5a605e, 1); pigeons.fillTriangle(x + 7, y - 4, x + 11, y - 2, x + 7, y - 1);
      pigeons.fillStyle(0xd4a75a, 1); pigeons.fillRect(x + 2, y + 2, 1, 3); pigeons.fillRect(x + 5, y + 2, 1, 3);
    }
    this.world.add(pigeons);
    this.tweens.add({ targets: pigeons, alpha: { from: 0.85, to: 1 }, duration: 1700, yoyo: true, repeat: -1 });
  }

  private buildCitizens(): void {
    const citizens: Array<[CharacterClassId, number, number, number]> = [
      ['mage', -280, 250, 170],
      ['archer', 0, -90, 120],
      ['priest', 650, 40, 110],
      ['warrior', -560, 330, 100]
    ];
    citizens.forEach(([classId, x, y, distance], index) => {
      const avatar = new PlayerAvatar(this, classId, x, y);
      avatar.root.setScale(NPC_SCALE * 0.94);
      avatar.root.setDepth(300 + y);
      this.world.add(avatar.root);
      // Caminhada curta e pausada, para não competir com o jogador.
      const walk = (): void => {
        if (!this.alive) return;
        const target = avatar.root.x > x ? x - distance : x + distance;
        avatar.walkTo(target, y, 14000 + index * 1200);
        this.time.delayedCall(16500 + index * 1200, walk);
      };
      this.time.delayedCall(900 + index * 1600, walk);
    });
  }

  private buildOuterFarms(): void {
    const farm = this.add.graphics().setDepth(6);
    // Campos de trigo ao norte e a leste dos muros.
    for (const [cx, cy, w, h] of [[-780, -780, 380, 120], [700, -820, 420, 130], [1180, -120, 260, 150]] as Array<[number, number, number, number]>) {
      farm.fillStyle(0x7c6b3e, 1); farm.fillEllipse(cx, cy, w, h);
      farm.lineStyle(2, 0x574b2e, 0.65);
      for (let i = -3; i <= 3; i += 1) farm.lineBetween(cx - w / 2 + 12, cy + i * (h / 9), cx + w / 2 - 12, cy + i * (h / 9));
      farm.lineStyle(2, 0xb4964f, 0.6);
      for (let i = -3; i <= 3; i += 1) farm.lineBetween(cx - w / 2 + 12, cy + i * (h / 9) - 4, cx + w / 2 - 12, cy + i * (h / 9) - 4);
    }
    // Lagoa a sudoeste.
    farm.fillStyle(0x2e5f68, 1); farm.fillEllipse(-1420, 280, 360, 170);
    farm.lineStyle(5, 0x6f8f6b, 0.8); farm.strokeEllipse(-1420, 280, 370, 178);
    farm.fillStyle(0x74b8bc, 0.28); farm.fillEllipse(-1460, 265, 130, 38);
    // Moinho.
    const mill = this.add.container(1460, -480).setDepth(120);
    const g = this.add.graphics();
    g.fillStyle(0x111b1a, 0.32); g.fillEllipse(0, 12, 150, 44);
    g.fillStyle(0x8d7352, 1); g.fillRoundedRect(-34, -92, 68, 104, 5);
    g.fillStyle(0x6a3f33, 1); g.fillTriangle(-44, -92, 0, -132, 44, -92);
    g.fillStyle(0xf0d9a6, 1); g.fillRoundedRect(-10, -68, 20, 24, 3);
    g.lineStyle(4, 0x5a4027, 1); g.lineBetween(0, -88, 0, -130);
    for (let i = 0; i < 4; i += 1) {
      const angle = (i / 4) * Math.PI * 2;
      g.lineStyle(6, 0x6c4e31, 1);
      g.lineBetween(0, -128, Math.cos(angle) * 70, -128 + Math.sin(angle) * 70);
      g.lineStyle(2, 0xd8c9a4, 1);
      g.strokeTriangle(Math.cos(angle) * 18, -128 + Math.sin(angle) * 18, Math.cos(angle + 0.22) * 66, -128 + Math.sin(angle + 0.22) * 66, Math.cos(angle - 0.22) * 66, -128 + Math.sin(angle - 0.22) * 66);
    }
    mill.add(g); this.world.add(mill);
    this.tweens.add({ targets: mill, angle: { from: -0.24, to: 0.24 }, duration: 9000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.world.add(farm);
  }

  private createMountControl(): void {
    const root = document.getElementById('ui-root');
    if (!root) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'city-mount-control ghost-button';
    button.textContent = 'Montar cavalo · Branco';
    button.addEventListener('click', async () => {
      if (button.disabled) return;
      button.disabled = true;
      try {
        const updated = await api.setMount(this.character.id, !Boolean(this.mountedHorse));
        this.applyMountedState(updated.mount.equipped);
        this.hud?.pushFeed(updated.mount.equipped ? 'Você montou seu Cavalo Castanho. Velocidade aumentada na cidade!' : 'Você desmontou do cavalo.', 'gold');
      } catch (error) {
        this.hud?.pushFeed(error instanceof Error ? error.message : 'Não foi possível alterar a montaria.', 'danger');
      } finally {
        button.disabled = false;
      }
    });
    root.append(button);
    this.mountControl = button;
  }

  private async refreshMountState(): Promise<void> {
    try {
      const inventory = await api.getInventory(this.character.id);
      if (!this.alive) return;
      this.applyMountedState(inventory.mount.equipped);
    } catch {
      // A cidade permanece acessível mesmo se o inventário estiver indisponível.
    }
  }

  private applyMountedState(equipped: boolean): void {
    if (equipped && !this.mountedHorse) {
      this.avatar.stopWalking();
      this.avatar.root.setVisible(false);
      const horse = new HorseView(this, this.avatar.root.x, this.avatar.root.y, {
        scale: 0.9,
        rider: true,
        riderColor: this.character.classId === 'mage' ? 0x6f4fc2 : this.character.classId === 'priest' ? 0xd8e0e8 : this.character.classId === 'archer' ? 0x3f7d5f : 0x7089ad,
        riderAccent: this.character.classId === 'warrior' ? 0xc94f52 : 0xe7bd70
      });
      horse.root.setDepth(300 + horse.root.y);
      this.world.add(horse.root);
      this.mountedHorse = horse;
    } else if (!equipped && this.mountedHorse) {
      const x = this.mountedHorse.root.x;
      const y = this.mountedHorse.root.y;
      this.mountedHorse.destroy();
      this.mountedHorse = null;
      this.avatar.root.setPosition(x, y);
      this.avatar.root.setVisible(true);
      this.avatar.root.setDepth(300 + y);
    }
    if (this.mountControl) {
      this.mountControl.textContent = equipped ? 'Desmontar cavalo' : 'Montar cavalo · Branco';
      this.mountControl.classList.toggle('is-mounted', equipped);
    }
  }

  private buildPlayer(): void {
    this.avatar = new PlayerAvatar(this, this.character.classId, -40, 130);
    this.avatar.root.setScale(PLAYER_SCALE);
    this.avatar.root.setDepth(300 + this.avatar.root.y);
    this.world.add(this.avatar.root);
    this.nameLabel = this.makeNameplate(-40, 130 - NAME_LIFT, this.character.name, undefined, 0xe8c877, '◆');
  }

  private buildNpcs(): void {
    NPCS.forEach((npc) => {
      const avatar = new PlayerAvatar(this, npc.classId, npc.x, npc.y);
      avatar.root.setDepth(300 + npc.y);
      avatar.root.setScale(NPC_SCALE);
      avatar.setFacing(npc.restFacing);
      this.world.add(avatar.root);
      this.npcAvatars.push(avatar);

      const plate = this.makeNameplate(npc.x, npc.y - NAME_LIFT, npc.name, npc.title, npc.accent, npc.icon);
      plate.setDepth(2200);

      const hit = this.add.zone(npc.x, npc.y - 40, 86, 104).setDepth(2500);
      hit.setInteractive({ useHandCursor: true });
      hit.on('pointerdown', (_pointer: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
        event.stopPropagation();
        this.openNpc(npc);
      });
      this.world.add(hit);

      // Pequeno vaivém de respiração, sem tirar o NPC do lugar.
      this.tweens.add({
        targets: avatar.root,
        y: { from: npc.y, to: npc.y - 1.5 },
        duration: Phaser.Math.Between(2200, 3400),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    });
  }

  private makeNameplate(
    x: number,
    y: number,
    name: string,
    subtitle: string | undefined,
    accent: number,
    icon: string
  ): Phaser.GameObjects.Container {
    const plate = this.add.container(x, y).setDepth(2200);
    const nameText = this.add.text(0, subtitle ? -4 : 0, name, {
      fontFamily: FONT, fontSize: '12px', fontStyle: 'bold', color: '#f7e3b3',
      stroke: '#0a1114', strokeThickness: 3, resolution: 2
    }).setOrigin(0.5);
    const subtitleText = subtitle
      ? this.add.text(0, 10, subtitle, {
          fontFamily: FONT, fontSize: '8px', color: '#c9b28a',
          stroke: '#0a1114', strokeThickness: 2, resolution: 2
        }).setOrigin(0.5)
      : null;
    const width = Math.max(88, nameText.width + 34, subtitleText ? subtitleText.width + 30 : 0);
    const height = subtitle ? 32 : 22;
    const background = this.add.graphics();
    background.fillStyle(0x0a1417, 0.9);
    background.fillRoundedRect(-width / 2, -height / 2, width, height, 6);
    background.lineStyle(1, accent, 0.7);
    background.strokeRoundedRect(-width / 2, -height / 2, width, height, 6);
    background.fillStyle(accent, 0.9);
    background.fillCircle(-width / 2 + 9, subtitle ? -4 : 0, 3);
    const glyph = this.add.text(-width / 2 + 9, subtitle ? -4 : 0, icon, {
      fontFamily: FONT, fontSize: '8px', fontStyle: 'bold', color: '#f4dfae'
    }).setOrigin(0.5);
    plate.add([background, glyph, nameText, subtitleText].filter(Boolean) as Phaser.GameObjects.GameObject[]);
    plate.setScale(Phaser.Math.Clamp(1 / this.cameraZoom, 1, 1.45));
    this.nameplates.push(plate);
    this.world.add(plate);
    return plate;
  }

  private buildAmbient(): void {
    for (let i = 0; i < 34; i += 1) {
      const x = Phaser.Math.Between(-1150, 1150);
      const y = Phaser.Math.Between(-560, 560);
      const mote = this.add.circle(x, y, Phaser.Math.FloatBetween(1, 2.2), i % 3 === 0 ? 0xffd98c : 0xd6e6c7, 0.32);
      mote.setDepth(1000);
      this.world.add(mote);
      this.tweens.add({ targets: mote, y: y - 20, alpha: 0.06, duration: Phaser.Math.Between(1800, 3600), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    for (let i = 0; i < 14; i += 1) {
      const x = Phaser.Math.Between(-1200, 1200);
      const y = Phaser.Math.Between(-600, 600);
      const bird = this.add.graphics().setDepth(1200);
      bird.lineStyle(1.6, 0x1a2823, 0.55);
      bird.lineBetween(-4, 0, 0, -3);
      bird.lineBetween(0, -3, 4, 0);
      bird.setPosition(x, y);
      this.world.add(bird);
      this.tweens.add({
        targets: bird,
        x: x + Phaser.Math.Between(80, 220),
        y: y - Phaser.Math.Between(30, 80),
        duration: Phaser.Math.Between(6000, 12000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
  }

  private handleGroundClick(pointer: Phaser.Input.Pointer): void {
    if (this.dialogue || pointer.button !== 0) return;
    const point = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    let targetX = Phaser.Math.Clamp((point.x - this.world.x) / this.world.scaleX, CITY_LIMITS.minX, CITY_LIMITS.maxX);
    let targetY = Phaser.Math.Clamp((point.y - this.world.y) / this.world.scaleY, CITY_LIMITS.minY, CITY_LIMITS.maxY);

    // A cidade usa tiles isométricos de 96x48 (centros separados por 48x24).
    // Encaixar o destino no centro do tile dá a precisão visual do estilo Tibia.
    targetX = Phaser.Math.Clamp(Math.round(targetX / 48) * 48, CITY_LIMITS.minX, CITY_LIMITS.maxX);
    targetY = Phaser.Math.Clamp(Math.round(targetY / 24) * 24, CITY_LIMITS.minY, CITY_LIMITS.maxY);
    const mover = this.mountedHorse?.root ?? this.avatar.root;
    const distance = Phaser.Math.Distance.Between(mover.x, mover.y, targetX, targetY);
    if (distance < 8) return;
    this.moving = false;
    if (this.mountedHorse) this.mountedHorse.walkTo(targetX, targetY, Phaser.Math.Clamp(distance * 1.9, 180, 3200));
    else this.avatar.walkTo(targetX, targetY, Phaser.Math.Clamp(distance * 3.1, 220, 4200));
  }

  private openNpc(npc: NpcDefinition): void {
    this.closeDialogue();
    sfxClick();
    const panel = this.add.container(this.scale.width / 2, this.scale.height - 118).setScrollFactor(0).setDepth(5000);
    const bg = this.add.rectangle(0, 0, Math.min(560, this.scale.width - 28), 150, 0x101b25, 0.96).setStrokeStyle(2, npc.accent, 0.9);
    const heading = this.add.text(-bg.width / 2 + 18, -55, npc.name + ' — ' + npc.title, {
      fontFamily: FONT, fontSize: '15px', fontStyle: 'bold', color: '#f5d68f'
    });
    const message = this.add.text(-bg.width / 2 + 18, -28, npc.greeting, {
      fontFamily: FONT, fontSize: '12px', color: '#d9e4ef', wordWrap: { width: bg.width - 36 }, lineSpacing: 4
    });
    panel.add([bg, heading, message]);

    if (npc.id === 'blacksmith') {
      const action = this.add.text(-bg.width / 2 + 18, 43, '⚒  Abrir comércio e vender itens', {
        fontFamily: FONT, fontSize: '13px', fontStyle: 'bold', color: '#ffe0a1',
        backgroundColor: '#563b25', padding: { x: 12, y: 8 }
      }).setInteractive({ useHandCursor: true });
      action.on('pointerdown', (_pointer: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
        event.stopPropagation();
        this.closeDialogue();
        sfxClick();
        const openShop = this.registry.get('openBlacksmithShop');
        if (typeof openShop === 'function') (openShop as () => void)();
      });
      panel.add(action);
    } else if (npc.id === 'adventurer') {
      const action = this.add.text(-bg.width / 2 + 18, 43, '▶  Abrir o mapa do reino', {
        fontFamily: FONT, fontSize: '13px', fontStyle: 'bold', color: '#9fe0a8',
        backgroundColor: '#244b39', padding: { x: 12, y: 8 }
      }).setInteractive({ useHandCursor: true });
      action.on('pointerdown', (_pointer: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
        event.stopPropagation();
        this.closeDialogue();
        sfxClick();
        openStageMap({
          character: this.character,
          currentStageId: this.character.currentStageId,
          onTravel: (snapshot: CombatSnapshot) => {
            this.registry.set('character', snapshot.character);
            this.registry.set('travelSnapshot', snapshot);
            this.hud?.pushFeed(`Você partiu para ${snapshot.combat.stageName}.`, 'gold');
            this.scene.start('WorldScene');
          }
        });
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

  private createMinimap(): void {
    const root = document.getElementById('ui-root');
    if (!root) return;
    const panel = document.createElement('section');
    panel.className = 'city-map-panel';
    panel.setAttribute('aria-label', 'Mapa da cidade de Valedouro');
    const header = document.createElement('header');
    header.className = 'city-map-panel__header';
    const eyebrow = document.createElement('span');
    eyebrow.className = 'city-map-panel__eyebrow';
    eyebrow.textContent = 'MAPA DA CIDADE';
    const name = document.createElement('strong');
    name.textContent = 'Valedouro';
    header.append(eyebrow, name);
    const canvas = document.createElement('canvas');
    canvas.className = 'city-map-panel__canvas';
    canvas.width = 240;
    canvas.height = 140;
    const footer = document.createElement('footer');
    footer.className = 'city-map-panel__footer';
    const district = document.createElement('span');
    district.className = 'city-map-panel__district';
    district.textContent = 'Praça do Mercado';
    const legend = document.createElement('span');
    legend.className = 'city-map-panel__legend';
    legend.innerHTML = '<i></i> você';
    footer.append(district, legend);
    panel.append(header, canvas, footer);
    root.append(panel);
    this.minimapCanvas = canvas;
    this.minimapDistrict = district;
    this.updateMinimap(true);
  }

  private updateMinimap(force = false): void {
    const canvas = this.minimapCanvas;
    if (!canvas || !this.avatar) return;
    const now = this.time.now;
    if (!force && now - this.minimapLastDraw < 120) return;
    this.minimapLastDraw = now;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2 + 2;
    const rx = w * 0.42;
    const ry = h * 0.4;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(25, 20, 13, 0.55)';
    ctx.fillRect(0, 0, w, h);

    const toX = (x: number): number => cx + (x / CITY_HALF_X) * rx;
    const toY = (y: number): number => cy + (y / CITY_HALF_Y) * ry;

    // Muralha em losango.
    ctx.beginPath();
    ctx.moveTo(cx, cy - ry);
    ctx.lineTo(cx + rx, cy);
    ctx.lineTo(cx, cy + ry);
    ctx.lineTo(cx - rx, cy);
    ctx.closePath();
    ctx.fillStyle = 'rgba(74, 68, 50, 0.65)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(232, 200, 119, 0.75)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Estradas principais.
    ctx.strokeStyle = 'rgba(205, 184, 138, 0.42)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx - rx, cy); ctx.lineTo(cx + rx, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy - ry); ctx.lineTo(cx, cy + ry); ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx - rx * 0.55, cy - ry * 0.55); ctx.lineTo(cx + rx * 0.55, cy + ry * 0.55); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + rx * 0.55, cy - ry * 0.55); ctx.lineTo(cx - rx * 0.55, cy + ry * 0.55); ctx.stroke();

    // Distritos.
    ctx.font = '7px Cinzel, Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(234, 214, 172, 0.7)';
    for (const district of DISTRICTS.slice(0, 5)) {
      ctx.fillText(district.name.split(' ')[0]?.toUpperCase() ?? '', toX(district.x), toY(district.y) - 6);
    }

    // Prédios.
    ctx.fillStyle = 'rgba(230, 197, 122, 0.9)';
    for (const [x, y] of [[-140, -500], [400, -430], [-650, -110], [610, -170], [-520, -390], [-730, 345], [560, 470], [-1030, -80]] as Array<[number, number]>) {
      ctx.fillRect(toX(x) - 3, toY(y) - 2, 6, 4);
    }

    // NPCs.
    ctx.fillStyle = '#e7bd70';
    for (const npc of NPCS) {
      ctx.beginPath(); ctx.arc(toX(npc.x), toY(npc.y), 2, 0, Math.PI * 2); ctx.fill();
    }

    // Jogador.
    const mover = this.mountedHorse?.root ?? this.avatar.root;
    const px = toX(mover.x);
    const py = toY(mover.y);
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 242, 196, 0.28)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(px, py, 2.6, 0, Math.PI * 2);
    ctx.fillStyle = '#ffdf8a';
    ctx.fill();
    ctx.strokeStyle = '#4a1f1f';
    ctx.lineWidth = 1;
    ctx.stroke();
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
    closeStageMap();
    this.npcAvatars = [];
    this.stableHorses = [];
    this.nameplates = [];
    this.mountedPatrol = null;
    this.citySocket?.close(1000, 'Saindo da cidade');
    this.citySocket = null;
    this.clearRemotePlayers();
    this.multiplayerPanel?.remove();
    this.multiplayerPanel = null;
    this.minimapCanvas?.parentElement?.remove();
    this.minimapCanvas = null;
    this.minimapDistrict = null;
    this.mountControl?.remove();
    this.mountControl = null;
    this.mountedHorse?.destroy();
    this.mountedHorse = null;
    this.chatToggle = null;
  }
}
