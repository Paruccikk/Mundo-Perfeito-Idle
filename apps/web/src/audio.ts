/** Gerenciador de playlist MP3 e efeitos sonoros WebAudio. */
type OscillatorKind = OscillatorType;

// Converte nota MIDI em frequência (Hz) para os efeitos musicais.
function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}
const MUTE_KEY = 'mundo-perfeito:audio-muted';
let context: AudioContext | null = null;
let master: GainNode | null = null;
let sfxBus: GainNode | null = null;
let muted = readMuted();
let musicWanted = false;
let playlist: string[] = [];
let playlistLoaded = false;
let loadingPlaylist = false;
let currentTrack: HTMLAudioElement | null = null;
let lastTrackIndex = -1;
function readMuted(): boolean { try { return window.localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; } }
function makeContext(): AudioContext | null {
  if (context) return context;
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();
    master = context.createGain(); master.gain.value = muted ? 0 : 0.85; master.connect(context.destination);
    sfxBus = context.createGain(); sfxBus.gain.value = 0.32; sfxBus.connect(master);
  } catch { context = null; }
  return context;
}
function resumeContext(): AudioContext | null { const ctx = makeContext(); if (ctx?.state === 'suspended') void ctx.resume().catch(() => undefined); return ctx; }
async function loadPlaylist(): Promise<void> {
  if (playlistLoaded || loadingPlaylist) return;
  loadingPlaylist = true;
  try {
    const response = await fetch('/music/playlist.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error('Playlist indisponível');
    const data: unknown = await response.json();
    if (Array.isArray(data)) playlist = data.filter((item): item is string => typeof item === 'string' && item.toLowerCase().endsWith('.mp3'));
    playlistLoaded = true;
  } catch (error) { console.warn('[audio] Não foi possível carregar a playlist:', error); }
  finally { loadingPlaylist = false; }
}
function pickNextTrack(): string | null {
  if (!playlist.length) return null;
  if (playlist.length === 1) { lastTrackIndex = 0; return playlist[0] ?? null; }
  let index = Math.floor(Math.random() * playlist.length);
  while (index === lastTrackIndex) index = Math.floor(Math.random() * playlist.length);
  lastTrackIndex = index; return playlist[index] ?? null;
}
async function playNextTrack(): Promise<void> {
  if (!musicWanted || muted) return;
  await loadPlaylist();
  if (!musicWanted || muted) return;
  const source = pickNextTrack();
  if (!source) { console.warn('[audio] Nenhum MP3 encontrado em public/music.'); return; }
  currentTrack?.pause();
  const audio = new Audio(source); audio.preload = 'auto'; audio.volume = 0.24;
  audio.onended = () => { if (musicWanted && !muted) void playNextTrack(); };
  audio.onerror = () => { console.warn('[audio] Erro na faixa:', source); if (musicWanted && !muted) void playNextTrack(); };
  currentTrack = audio;
  try { await audio.play(); } catch { /* Aguarda o primeiro gesto do jogador. */ }
}
export function unlockAudio(): void { resumeContext(); if (musicWanted && !muted && (!currentTrack || currentTrack.paused)) void playNextTrack(); }
export function isAudioMuted(): boolean { return muted; }
export function toggleAudioMuted(): boolean {
  muted = !muted;
  try { window.localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch { /* armazenamento indisponível */ }
  if (master && context) master.gain.setTargetAtTime(muted ? 0 : 0.85, context.currentTime, 0.08);
  if (muted) currentTrack?.pause(); else if (musicWanted) unlockAudio();
  return muted;
}
export function startMusic(): void { musicWanted = true; if (!muted) unlockAudio(); }
export function stopMusic(): void { musicWanted = false; currentTrack?.pause(); currentTrack = null; }
if (typeof window !== 'undefined') {
  const unlock = (): void => { unlockAudio(); if (currentTrack && !currentTrack.paused) { window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); } };
  window.addEventListener('pointerdown', unlock); window.addEventListener('keydown', unlock);
}
function tone(
  frequency: number,
  duration: number,
  type: OscillatorKind,
  loudness: number,
  endFrequency?: number,
  delay = 0
): void {
  const ctx = context;
  const bus = sfxBus;
  if (!ctx || !bus || muted) return;
  const at = ctx.currentTime + delay;
  const oscillator = ctx.createOscillator();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, at);
  if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), at + duration);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(loudness, at + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);

  oscillator.connect(gain).connect(bus);
  oscillator.start(at);
  oscillator.stop(at + duration + 0.02);
}

function noise(duration: number, loudness: number, filterFrequency = 1600): void {
  const ctx = context;
  const bus = sfxBus;
  if (!ctx || !bus || muted) return;
  const frames = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = filterFrequency;
  filter.Q.value = 0.8;
  const gain = ctx.createGain();
  gain.gain.value = loudness;
  source.connect(filter).connect(gain).connect(bus);
  source.start();
}

export function sfxClick(): void {
  resumeContext();
  tone(620, 0.08, 'triangle', 0.16, 520);
}

export function sfxHit(critical = false): void {
  resumeContext();
  noise(critical ? 0.16 : 0.1, critical ? 0.5 : 0.32, critical ? 2400 : 1400);
  tone(critical ? 240 : 190, critical ? 0.2 : 0.13, 'square', critical ? 0.22 : 0.14, 90);
}

export function sfxMonsterHit(): void {
  resumeContext();
  noise(0.09, 0.16, 700);
  tone(120, 0.12, 'sawtooth', 0.1, 70);
}

export function sfxCoin(): void {
  resumeContext();
  tone(920, 0.1, 'sine', 0.2, 1050);
  tone(1380, 0.16, 'sine', 0.16, 1540, 0.07);
}

export function sfxLevelUp(): void {
  resumeContext();
  const notes = [62, 66, 69, 74];
  notes.forEach((midi, index) => {
    tone(midiToFrequency(midi + 12), 0.42, 'triangle', 0.18, undefined, index * 0.1);
    tone(midiToFrequency(midi), 0.5, 'sine', 0.1, undefined, index * 0.1);
  });
}

export function sfxBoss(): void {
  resumeContext();
  tone(70, 0.5, 'sawtooth', 0.26, 42);
  noise(0.35, 0.28, 380);
  tone(110, 0.7, 'sine', 0.14, 55, 0.12);
}

export function sfxVictory(): void {
  resumeContext();
  const notes = [50, 57, 62, 66, 69, 74];
  notes.forEach((midi, index) => {
    tone(midiToFrequency(midi + 12), 0.5, 'triangle', 0.2, undefined, index * 0.11);
  });
}

export function sfxDeath(): void {
  resumeContext();
  tone(220, 0.8, 'sawtooth', 0.2, 55);
  noise(0.5, 0.28, 420);
}

export function sfxTravel(): void {
  resumeContext();
  noise(0.5, 0.2, 900);
  [50, 57, 62, 69].forEach((midi, index) => {
    tone(midiToFrequency(midi + 12), 0.42, 'triangle', 0.14, undefined, 0.08 + index * 0.09);
  });
}

export function sfxInventory(): void {
  resumeContext();
  tone(520, 0.06, 'triangle', 0.12, 480);
  tone(780, 0.08, 'triangle', 0.1, 820, 0.05);
}

