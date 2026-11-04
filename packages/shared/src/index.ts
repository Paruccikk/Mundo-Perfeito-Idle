export type Rarity =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'epic'
  | 'legendary'
  | 'mythic';

export interface CharacterAttributes {
  constitution: number;
  strength: number;
  intelligence: number;
  dexterity: number;
}

export interface CombatStats {
  maxHp: number;
  maxMp: number;
  physicalDamage: number;
  physicalDefense: number;
  magicDamage: number;
  magicDefense: number;
  attacksPerSecond: number;
  critChance: number;
  critMultiplier: number;
  /** Alias mantidos para compatibilidade com o HUD/combate legado. */
  attack: number;
  defense: number;
}

export type CharacterClassId = 'warrior' | 'mage' | 'priest' | 'archer';

export interface CharacterClassDefinition {
  id: CharacterClassId;
  name: string;
  role: string;
  description: string;
  baseAttributes: CharacterAttributes;
  attributeGrowth: CharacterAttributes;
  startingGold: number;
}

export interface CharacterSummary {
  id: string;
  name: string;
  title: string | null;
  guildName: string | null;
  classId: CharacterClassId;
  className: string;
  level: number;
  experience: number;
  experienceToNextLevel: number;
  gold: number;
  currentStageId: string;
  attributes: CharacterAttributes;
  attributePoints: number;
  stats: CombatStats;
  createdAt: string;
}

export interface InventoryItem {
  id: string;
  itemId: string;
  name: string;
  description: string;
  rarity: Rarity;
  category: string;
  slot: string | null;
  quantity: number;
  levelReq: number;
  stats: Record<string, number>;
}

export interface EquipmentItem {
  slot: string;
  item: InventoryItem;
}

export interface CreateCharacterInput {
  name: string;
  classId: CharacterClassId;
}

export interface AttributeAllocation {
  constitution?: number;
  strength?: number;
  intelligence?: number;
  dexterity?: number;
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

export type CombatStatus = 'fighting' | 'recovering' | 'dead';

export type CombatEventType =
  | 'player_hit'
  | 'player_crit'
  | 'monster_hit'
  | 'kill'
  | 'level_up'
  | 'boss_spawn'
  | 'boss_defeated'
  | 'player_death'
  | 'item_drop';

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
    playerMp: number;
    playerMaxMp: number;
    killsInStage: number;
    killsRequiredForBoss: number;
    bossActive: boolean;
    bossDefeated: number;
    status: CombatStatus;
  };
  events: CombatEvent[];
  simulatedSeconds: number;
  returnToCity?: boolean;
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
