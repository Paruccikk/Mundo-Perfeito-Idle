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

export type MonsterSpriteId = 'slime' | 'boar' | 'wolf' | 'slime-king';

export interface MonsterDefinition {
  id: string;
  name: string;
  level: number;
  maxHp: number;
  attack: number;
  defense: number;
  attacksPerSecond: number;
  experienceReward: number;
  goldReward: number;
  isBoss: boolean;
  sprite: MonsterSpriteId;
}

export type CombatStatus = 'fighting' | 'recovering';

export type CombatEventType =
  | 'player_hit'
  | 'player_crit'
  | 'monster_hit'
  | 'kill'
  | 'level_up'
  | 'boss_spawn'
  | 'boss_defeated'
  | 'player_death';

export interface CombatEvent {
  type: CombatEventType;
  amount?: number;
  message?: string;
}

export interface CombatSnapshot {
  character: CharacterSummary;
  combat: {
    stageId: string;
    stageName: string;
    monster: MonsterDefinition & { hp: number };
    playerHp: number;
    playerMaxHp: number;
    killsInStage: number;
    killsRequiredForBoss: number;
    bossActive: boolean;
    bossDefeated: number;
    status: CombatStatus;
  };
  events: CombatEvent[];
  simulatedSeconds: number;
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
