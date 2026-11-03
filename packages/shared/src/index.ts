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
