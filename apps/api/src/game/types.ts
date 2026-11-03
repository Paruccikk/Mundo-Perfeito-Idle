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
  createdAt: string;
}
