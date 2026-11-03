/**
 * Tipos de domínio espelhados de `packages/shared`.
 *
 * O pacote compartilhado é consumido diretamente pelo cliente (Vite compila TS),
 * mas a API builda com `tsc` para `dist/` e roda em Node puro. Importar o pacote
 * compartilhado aqui exigiria publicá-lo como build separado, então mantemos
 * este espelho. Ao mudar o contrato, atualize os dois arquivos.
 */
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

export interface CombatStateRecord {
  stageId: string;
  monsterId: string;
  monsterHp: number;
  playerHp: number;
  killsInStage: number;
  bossActive: boolean;
  bossDefeated: number;
  status: CombatStatus;
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

export interface CharacterRecord {
  id: string;
  playerId: string;
  name: string;
  nameKey: string;
  classId: CharacterClassId;
  level: number;
  experience: number;
  gold: number;
  currentStageId: string;
  combat: CombatStateRecord;
  createdAt: string;
}
