import type { MonsterDefinition, MonsterSpriteId } from './types.js';

export interface StageDefinition {
  id: string;
  name: string;
  recommendedLevel: number;
  monsterIds: string[];
  bossId: string;
  killsRequiredForBoss: number;
}

export const MONSTERS: Record<string, MonsterDefinition> = {
  slime: {
    id: 'slime',
    name: 'Slime Verde',
    level: 1,
    maxHp: 45,
    attack: 7,
    defense: 1,
    attacksPerSecond: 0.7,
    experienceReward: 10,
    goldReward: 4,
    isBoss: false,
    sprite: 'slime'
  },
  boar: {
    id: 'boar',
    name: 'Javali Selvagem',
    level: 2,
    maxHp: 75,
    attack: 11,
    defense: 3,
    attacksPerSecond: 0.8,
    experienceReward: 16,
    goldReward: 6,
    isBoss: false,
    sprite: 'boar'
  },
  wolf: {
    id: 'wolf',
    name: 'Lobo Cinzento',
    level: 3,
    maxHp: 60,
    attack: 14,
    defense: 2,
    attacksPerSecond: 1.1,
    experienceReward: 20,
    goldReward: 8,
    isBoss: false,
    sprite: 'wolf'
  },
  'slime-king': {
    id: 'slime-king',
    name: 'Rei Slime',
    level: 5,
    maxHp: 420,
    attack: 24,
    defense: 7,
    attacksPerSecond: 0.9,
    experienceReward: 150,
    goldReward: 90,
    isBoss: true,
    sprite: 'slime-king'
  }
};

export const STAGE_ONE: StageDefinition = {
  id: 'clearing-01',
  name: 'Clareira dos Aprendizes',
  recommendedLevel: 1,
  monsterIds: ['slime', 'boar', 'wolf'],
  bossId: 'slime-king',
  killsRequiredForBoss: 10
};

export const STAGES: Record<string, StageDefinition> = {
  [STAGE_ONE.id]: STAGE_ONE
};

export function getStage(stageId: string): StageDefinition {
  return STAGES[stageId] ?? STAGE_ONE;
}

export function getMonster(monsterId: string): MonsterDefinition {
  return MONSTERS[monsterId] ?? MONSTERS.slime!;
}

export function nextNormalMonster(stage: StageDefinition, killsInStage: number): string {
  const index = killsInStage % stage.monsterIds.length;
  return stage.monsterIds[index] ?? stage.monsterIds[0]!;
}

export function monsterSpriteIds(): MonsterSpriteId[] {
  return (Object.values(MONSTERS) as MonsterDefinition[]).map((monster) => monster.sprite);
}
