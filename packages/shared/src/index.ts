export type Rarity =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'epic'
  | 'legendary'
  | 'mythic';

export interface CombatStats {
  maxHp: number;
  attack: number;
  defense: number;
  attacksPerSecond: number;
  critChance: number;
  critMultiplier: number;
}

export type CharacterClassId = 'warrior' | 'mage' | 'ranger';

export interface ClassGrowth {
  maxHp: number;
  attack: number;
  defense: number;
}

export interface CharacterClassDefinition {
  id: CharacterClassId;
  name: string;
  role: string;
  description: string;
  baseStats: CombatStats;
  growthPerLevel: ClassGrowth;
  startingGold: number;
}

export interface CharacterSummary {
  id: string;
  name: string;
  classId: CharacterClassId;
  className: string;
  level: number;
  experience: number;
  experienceToNextLevel: number;
  gold: number;
  currentStageId: string;
  stats: CombatStats;
  createdAt: string;
}

export interface CreateCharacterInput {
  playerId: string;
  name: string;
  classId: CharacterClassId;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: Record<string, string>;
  };
}

export interface StageDefinition {
  id: string;
  name: string;
  recommendedLevel: number;
  monsterIds: string[];
  bossId: string;
}

export interface OfflineSummary {
  elapsedSeconds: number;
  simulatedSeconds: number;
  experienceGained: number;
  goldGained: number;
  items: Array<{ itemId: string; quantity: number }>;
}
