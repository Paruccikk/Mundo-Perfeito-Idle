/**
 * Áudio medieval procedural (WebAudio), sem arquivos externos.
 * A trilha usa modo dórico, alaúde dedilhado, bordão e tambor grave.
 */

type OscillatorKind = OscillatorType;

const MUTE_KEY = 'mundo-perfeito:audio-muted';

let context: AudioContext | null = null;
let master: GainNode | null = null;
let musicBus: GainNode | null = null;
let sfxBus: GainNode | null = null;
let scheduler: number | null = null;
let musicWanted = false;
let nextStepAt = 0;
let stepIndex = 0;

function readMuted(): boolean {
  try {
    return window.localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

let muted = readMuted();

function makeContext(): AudioContext | null {
  if (context) return context;
  try {
    const Ctor = window.AudioContext
      ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();
    master = context.createGain();
    master.gain.value = muted ? 0 : 0.85;
    master.connect(context.destination);

    musicBus = context.createGain();
    musicBus.gain.value = 0.11;
    musicBus.connect(master);

    sfxBus = context.createGain();
    sfxBus.gain.value = 0.32;
    sfxBus.connect(master);
  } catch {
    context = null;
  }
  return context;
}

function resumeContext(): AudioContext | null {
  const ctx = makeContext();
  if (!ctx) return null;
  if (ctx.state === 'suspended') {
    void ctx.resume()
      .then(() => {
        if (musicWanted && !muted) startScheduler();
      })
      .catch(() => undefined);
  } else if (ctx.state === 'running' && musicWanted && !muted) {
    startScheduler();
  }
  return ctx;
}

/** Precisa rodar dentro de um gesto do usuário para liberar o áudio. */
export function unlockAudio(): void {
  const ctx = resumeContext();
  if (ctx && musicWanted) startScheduler();
}

export function isAudioMuted(): boolean {
  return muted;
}

export function toggleAudioMuted(): boolean {
  muted = !muted;
  try {
    window.localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    /* armazenamento indisponível */
  }
  if (master && context) {
    master.gain.setTargetAtTime(muted ? 0 : 0.85, context.currentTime, 0.08);
  }
  if (muted) stopScheduler();
  else if (musicWanted) {
    unlockAudio();
    startScheduler();
  }
  return muted;
}

export function startMusic(): void {
  musicWanted = true;
  if (muted) return;
  const ctx = resumeContext();
  if (ctx && ctx.state === 'running') startScheduler();
}

export function stopMusic(): void {
  musicWanted = false;
  stopScheduler();
}

function stopScheduler(): void {
  if (scheduler !== null) {
    window.clearInterval(scheduler);
    scheduler = null;
  }
}

function startScheduler(): void {
  if (scheduler !== null || muted) return;
  const ctx = context;
  if (!ctx || ctx.state !== 'running') return;
  nextStepAt = ctx.currentTime + 0.12;
  scheduler = window.setInterval(scheduleAhead, 180);
  scheduleAhead();
}

const SCALE = [0, 2, 3, 5, 7, 9, 10];
const MELODY: Array<number | null> = [
  0, 2, 4, 2, 0, null, 4, 5,
  7, 5, 4, 2, 0, 2, null, 4,
  5, 7, 9, 7, 5, 4, 2, null,
  0, 2, 4, 7, 4, 2, 0, null
];
const BASS = [0, null, null, null, 4, null, null, null, 3, null, null, null, 4, null, null, 7];

function scheduleAhead(): void {
  const ctx = context;
  if (!ctx || muted || !musicWanted) return;
  if (ctx.state !== 'running') return;
  const stepSeconds = 0.42;
  while (nextStepAt < ctx.currentTime + 0.9) {
    scheduleStep(stepIndex, nextStepAt, stepSeconds);
    stepIndex = (stepIndex + 1) % MELODY.length;
    nextStepAt += stepSeconds;
  }
}

function scheduleStep(index: number, at: number, stepSeconds: number): void {
  const ctx = context;
  const bus = musicBus;
  if (!ctx || !bus) return;

  const melodyDegree = MELODY[index];
  if (melodyDegree !== null && melodyDegree !== undefined) {
    const midi = 62 + SCALE[melodyDegree % SCALE.length]! + 12 * Math.floor(melodyDegree / SCALE.length);
    pluck(midi, at, 0.72);
  }

  const bassDegree = BASS[index];
  if (bassDegree !== null && bassDegree !== undefined) {
    const midi = 38 + SCALE[bassDegree % SCALE.length]!;
    drone(midi, at, stepSeconds * 3.4);
  }

  if (index % 8 === 0) {
    drum(at, 0.55);
  }
  if (index % 8 === 4) {
    drum(at, 0.32);
  }
}

function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function pluck(midi: number, at: number, loudness: number): void {
  const ctx = context;
  const bus = musicBus;
  if (!ctx || !bus) return;
  const oscillator = ctx.createOscillator();
  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(midiToFrequency(midi), at);
  oscillator.frequency.exponentialRampToValueAtTime(midiToFrequency(midi) * 0.997, at + 0.5);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2200, at);
  filter.frequency.exponentialRampToValueAtTime(650, at + 0.55);
  filter.Q.value = 1.4;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(loudness, at + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.62);

  oscillator.connect(filter).connect(gain).connect(bus);
  oscillator.start(at);
  oscillator.stop(at + 0.66);
}

function drone(midi: number, at: number, duration: number): void {
  const ctx = context;
  const bus = musicBus;
  if (!ctx || !bus) return;
  const oscillator = ctx.createOscillator();
  oscillator.type = 'sine';
  oscillator.frequency.value = midiToFrequency(midi);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.12, at + 0.18);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);

  oscillator.connect(gain).connect(bus);
  oscillator.start(at);
  oscillator.stop(at + duration + 0.05);
}

function drum(at: number, loudness: number): void {
  const ctx = context;
  const bus = musicBus;
  if (!ctx || !bus) return;
  const oscillator = ctx.createOscillator();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(92, at);
  oscillator.frequency.exponentialRampToValueAtTime(48, at + 0.16);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(loudness * 0.5, at);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.24);

  oscillator.connect(gain).connect(bus);
  oscillator.start(at);
  oscillator.stop(at + 0.26);
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

// Libera o contexto no primeiro gesto do usuário e mantém a escuta até o áudio rodar.
if (typeof window !== 'undefined') {
  const unlock = (): void => {
    unlockAudio();
    if (context?.state === 'running') {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    }
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
}
