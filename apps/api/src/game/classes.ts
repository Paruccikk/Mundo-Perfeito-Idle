import type {
  CharacterClassDefinition,
  CharacterClassId,
  CombatStats
} from './types.js';

export const MAX_LEVEL = 100;

const DEFAULT_STAGE_ID = 'clearing-01';

/**
 * Classes iniciais do protótipo.
 *
 * Growth é por nível adicional (nível 1 já usa baseStats integral).
 * Números provisórios — o balanceamento real será feito com playtests.
 */
export const CLASS_DEFINITIONS: Record<CharacterClassId, CharacterClassDefinition> = {
  warrior: {
    id: 'warrior',
    name: 'Guerreiro',
    role: 'Linha de frente',
    description: 'Muita vida e defesa. Erra pouco e aguenta pancada por mais tempo.',
    baseStats: {
      maxHp: 140,
      attack: 12,
      defense: 9,
      attacksPerSecond: 1,
      critChance: 0.05,
      critMultiplier: 1.6
    },
    growthPerLevel: { maxHp: 22, attack: 2.2, defense: 1.6 },
    startingGold: 40
  },
  mage: {
    id: 'mage',
    name: 'Mago',
    role: 'Dano mágico',
    description: 'Dano alto por golpe, mas frágil. Depende de matar antes de apanhar.',
    baseStats: {
      maxHp: 85,
      attack: 19,
      defense: 4,
      attacksPerSecond: 0.8,
      critChance: 0.08,
      critMultiplier: 2
    },
    growthPerLevel: { maxHp: 12, attack: 3.4, defense: 0.9 },
    startingGold: 30
  },
  ranger: {
    id: 'ranger',
    name: 'Patrulheiro',
    role: 'Dano ágil',
    description: 'Ataca rápido e tem a maior chance de crítico. Equilíbrio entre vida e dano.',
    baseStats: {
      maxHp: 105,
      attack: 15,
      defense: 6,
      attacksPerSecond: 1.25,
      critChance: 0.12,
      critMultiplier: 1.75
    },
    growthPerLevel: { maxHp: 16, attack: 2.7, defense: 1.2 },
    startingGold: 35
  }
};

export const CHARACTER_CLASS_IDS = Object.keys(CLASS_DEFINITIONS) as CharacterClassId[];

export function isCharacterClassId(value: unknown): value is CharacterClassId {
  return typeof value === 'string' && value in CLASS_DEFINITIONS;
}

export function getClassDefinition(id: CharacterClassId): CharacterClassDefinition {
  return CLASS_DEFINITIONS[id];
}

export function getDefaultStageId(): string {
  return DEFAULT_STAGE_ID;
}

/** XP total necessária para sair do nível informado. */
export function experienceToNextLevel(level: number): number {
  const safeLevel = Math.min(Math.max(Math.trunc(level), 1), MAX_LEVEL);
  return Math.floor(50 * Math.pow(safeLevel, 1.5));
}

/** Atributos derivados de classe + nível. */
export function statsForLevel(classId: CharacterClassId, level: number): CombatStats {
  const definition = CLASS_DEFINITIONS[classId];
  const levelsGained = Math.max(0, Math.trunc(level) - 1);
  const base = definition.baseStats;
  const growth = definition.growthPerLevel;

  return {
    maxHp: Math.round(base.maxHp + growth.maxHp * levelsGained),
    attack: round2(base.attack + growth.attack * levelsGained),
    defense: round2(base.defense + growth.defense * levelsGained),
    attacksPerSecond: base.attacksPerSecond,
    critChance: base.critChance,
    critMultiplier: base.critMultiplier
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
