/**
 * Tipos de domínio da API. O contrato público correspondente fica em packages/shared.
 */
export interface CharacterAttributes {
  constitution: number;
  strength: number;
  intelligence: number;
  dexterity: number;
}

export interface DerivedStats {
  maxHp: number;
  maxMp: number;
  physicalDamage: number;
  physicalDefense: number;
  magicDamage: number;
  magicDefense: number;
  critChance: number;
  critMultiplier: number;
  attacksPerSecond: number;
  attack: number;
  defense: number;
}

export interface CombatStats extends DerivedStats {}

export type CharacterClassId = 'warrior' | 'mage' | 'priest' | 'archer';

export interface ClassGrowth {
  maxHp: number;
  physicalDamage: number;
  physicalDefense: number;
  magicDamage: number;
  magicDefense: number;
}

export interface CharacterClassDefinition {
  id: CharacterClassId;
  name: string;
  role: string;
  description: string;
  baseAttributes: CharacterAttributes;
  attributeGrowth: CharacterAttributes;
  startingGold: number;
}

export interface InventoryItemRecord {
  id: string;
  itemId: string;
  name: string;
  description: string;
  rarity: string;
  category: string;
  slot: string | null;
  quantity: number;
  levelReq: number;
  stats: Record<string, number>;
}

export interface EquipmentRecord {
  slot: string;
  item: InventoryItemRecord;
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

export interface CombatStateRecord {
  stageId: string;
  monsterId: string;
  monsterHp: number;
  playerHp: number;
  killsInStage: number;
  bossActive: boolean;
  bossDefeated: number;
  status: CombatStatus;
  playerMp?: number;
  playerCooldownSeconds: number;
  monsterCooldownSeconds: number;
  recoveringUntil: string | null;
  lastTickAt: string;
}

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

export interface CharacterRecord {
  id: string;
  playerId: string;
  name: string;
  nameKey: string;
  title: string | null;
  guildName: string | null;
  classId: CharacterClassId;
  level: number;
  experience: number;
  gold: number;
  attributes: CharacterAttributes;
  attributePoints: number;
  equipmentBonuses: Record<string, number>;
  currentStageId: string;
  combat: CombatStateRecord;
  createdAt: string;
}

