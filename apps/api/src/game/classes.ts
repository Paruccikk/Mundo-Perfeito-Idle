import type {
  CharacterAttributes,
  CharacterClassDefinition,
  CharacterClassId,
  CombatStats
} from './types.js';

export const MAX_LEVEL = 100;
export const ATTRIBUTE_POINTS_PER_LEVEL = 5;
const DEFAULT_STAGE_ID = 'clearing-01';

export const CLASS_DEFINITIONS: Record<CharacterClassId, CharacterClassDefinition> = {
  warrior: {
    id: 'warrior', name: 'Guerreiro', role: 'Tanque / dano físico',
    description: 'Especialista em combate corpo a corpo, resistência e defesa física.',
    baseAttributes: { constitution: 8, strength: 8, intelligence: 2, dexterity: 4 },
    attributeGrowth: { constitution: 0, strength: 0, intelligence: 0, dexterity: 0 },
    startingGold: 40
  },
  mage: {
    id: 'mage', name: 'Mago', role: 'Dano mágico',
    description: 'Grande poder mágico e crítico, mas exige cuidado com a defesa.',
    baseAttributes: { constitution: 3, strength: 2, intelligence: 10, dexterity: 5 },
    attributeGrowth: { constitution: 0, strength: 0, intelligence: 0, dexterity: 0 },
    startingGold: 30
  },
  priest: {
    id: 'priest', name: 'Sacerdote', role: 'Suporte / magia',
    description: 'Equilíbrio entre resistência e inteligência, preparado para suporte e magia.',
    baseAttributes: { constitution: 6, strength: 3, intelligence: 8, dexterity: 3 },
    attributeGrowth: { constitution: 0, strength: 0, intelligence: 0, dexterity: 0 },
    startingGold: 35
  },
  archer: {
    id: 'archer', name: 'Arqueiro', role: 'Dano à distância / crítico',
    description: 'Agilidade, velocidade de ataque e alta chance de acerto crítico.',
    baseAttributes: { constitution: 4, strength: 5, intelligence: 3, dexterity: 9 },
    attributeGrowth: { constitution: 0, strength: 0, intelligence: 0, dexterity: 0 },
    startingGold: 35
  }
};

export const CHARACTER_CLASS_IDS = Object.keys(CLASS_DEFINITIONS) as CharacterClassId[];

export function isCharacterClassId(value: unknown): value is CharacterClassId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(CLASS_DEFINITIONS, value);
}

export function getClassDefinition(id: CharacterClassId): CharacterClassDefinition {
  return CLASS_DEFINITIONS[id];
}

export function getDefaultStageId(): string {
  return DEFAULT_STAGE_ID;
}

export function experienceToNextLevel(level: number): number {
  const safeLevel = Math.min(Math.max(Math.trunc(level), 1), MAX_LEVEL);
  return Math.floor(50 * Math.pow(safeLevel, 1.5));
}

export function statsForLevel(
  classId: CharacterClassId,
  _level: number,
  attributes: CharacterAttributes = CLASS_DEFINITIONS[classId].baseAttributes,
  bonuses: Record<string, number> = {}
): CombatStats {
  const constitution = attributes.constitution + (bonuses.constitution ?? 0);
  const strength = attributes.strength + (bonuses.strength ?? 0);
  const intelligence = attributes.intelligence + (bonuses.intelligence ?? 0);
  const dexterity = attributes.dexterity + (bonuses.dexterity ?? 0);
  const physicalDamage = round2(strength * 2.2 + dexterity * 0.3 + (bonuses.physicalDamage ?? 0));
  const physicalDefense = round2(constitution * 0.7 + strength * 0.8 + (bonuses.physicalDefense ?? 0));
  const magicDamage = round2(intelligence * 2.4 + (bonuses.magicDamage ?? 0));
  const magicDefense = round2(constitution * 0.35 + intelligence * 0.8 + (bonuses.magicDefense ?? 0));
  const maxHp = Math.round(80 + constitution * 18 + (classId === 'warrior' ? 20 : 0) + (bonuses.maxHp ?? 0));
  const critChance = Math.min(0.6, round2(0.03 + dexterity * 0.006 + (bonuses.critChance ?? 0)));
  const attacksPerSecond = Math.min(2.5, round2(0.8 + dexterity * 0.025 + (bonuses.attacksPerSecond ?? 0)));

  return {
    maxHp,
    physicalDamage,
    physicalDefense,
    magicDamage,
    magicDefense,
    critChance,
    critMultiplier: 1.5 + (classId === 'archer' ? 0.25 : 0),
    attacksPerSecond,
    attack: physicalDamage,
    defense: physicalDefense
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
