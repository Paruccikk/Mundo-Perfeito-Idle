export const COLLECTIBLE_RANKS = ['white', 'green', 'blue', 'orange', 'red'] as const;
export type CollectibleRank = (typeof COLLECTIBLE_RANKS)[number];

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
  sellPrice: number;
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

export type MonsterSpriteId =
  | 'slime'
  | 'boar'
  | 'wolf'
  | 'slime-king'
  | 'beast'
  | 'humanoid'
  | 'undead'
  | 'spirit'
  | 'construct'
  | 'dragon'
  | 'demon';

export type MonsterVariant =
  | 'wolf'
  | 'boar'
  | 'bear'
  | 'spider'
  | 'scorpion'
  | 'serpent'
  | 'yeti'
  | 'bandit'
  | 'knight'
  | 'cultist'
  | 'mummy'
  | 'pharaoh'
  | 'angel'
  | 'skeleton'
  | 'ghoul'
  | 'lich'
  | 'wraith'
  | 'elemental'
  | 'voidling'
  | 'golem'
  | 'treant'
  | 'dragon'
  | 'hydra'
  | 'imp'
  | 'demon';

export type EnvironmentId =
  | 'forest'
  | 'ruins'
  | 'swamp'
  | 'desert'
  | 'ice'
  | 'volcano'
  | 'abyss'
  | 'sky'
  | 'void'
  | 'legend';

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
  tint?: number;
  accent?: number;
  variant?: MonsterVariant;
  visualScale?: number;
  materialId?: string;
  dropChance?: number;
  trophyId?: string;
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
  | 'item_drop'
  | 'skill_cast';

export interface CombatEvent {
  type: CombatEventType;
  amount?: number;
  message?: string;
}

export interface SkillSnapshot {
  id: string;
  name: string;
  description: string;
  effect: 'damage' | 'heal' | 'group_heal';
  level: number;
  maxLevel: number;
  requiredLevel: number;
  cooldownSeconds: number;
  cooldownRemainingSeconds: number;
  manaCost: number;
  unlocked: boolean;
  special: boolean;
}

export interface CombatSnapshot {
  character: CharacterSummary;
  combat: {
    stageId: string;
    stageName: string;
    stage: StageDefinition;
    monster: MonsterDefinition & { hp: number };
    monsters: Array<MonsterDefinition & { hp: number; slotId: string; respawnInSeconds: number; isTarget: boolean }>;
    playerHp: number;
    playerMaxHp: number;
    playerMp: number;
    playerMaxMp: number;
    killsInStage: number;
    killsRequiredForBoss: number;
    bossActive: boolean;
    bossDefeated: number;
    status: CombatStatus;
    skillPoints: number;
    skills: SkillSnapshot[];
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

export interface StageFarm {
  itemId: string;
  name: string;
  description: string;
  rarity: Rarity;
}

export interface StageDefinition {
  id: string;
  name: string;
  region: string;
  regionId: string;
  description: string;
  recommendedLevel: number;
  maxRecommendedLevel: number;
  environment: EnvironmentId;
  monsterIds: string[];
  bossId: string;
  killsRequiredForBoss: number;
  farm: StageFarm;
  trophy: StageFarm;
  order: number;
}

export interface StageCatalogEntry extends StageDefinition {
  monsters: MonsterDefinition[];
  boss: MonsterDefinition;
}

export interface StageCatalog {
  stages: StageCatalogEntry[];
  regions: Array<{
    id: string;
    name: string;
    environment: EnvironmentId;
    minLevel: number;
    maxLevel: number;
    stages: StageCatalogEntry[];
  }>;
}

export interface OfflineSummary {
  elapsedSeconds: number;
  simulatedSeconds: number;
  experienceGained: number;
  goldGained: number;
  items: Array<{ itemId: string; quantity: number }>;
}

export type FarmBuildingId = 'coop' | 'corral' | 'stable';

export interface FarmBuildingDefinition {
  id: FarmBuildingId;
  name: string;
  description: string;
  cost: number;
  icon: string;
  capacity: number;
  allowedSpecies: AnimalSpeciesId[];
}

export const FARM_BUILDINGS: Record<FarmBuildingId, FarmBuildingDefinition> = {
  coop: {
    id: 'coop',
    name: 'Galinheiro',
    description: 'Abriga galinhas e galos para postura de ovos e reprodução.',
    cost: 500,
    icon: '🐔',
    capacity: 6,
    allowedSpecies: ['chicken']
  },
  corral: {
    id: 'corral',
    name: 'Curral',
    description: 'Instalação cercada com cochos para criação de vacas e touros leiteiros.',
    cost: 1500,
    icon: '🐄',
    capacity: 4,
    allowedSpecies: ['cow']
  },
  stable: {
    id: 'stable',
    name: 'Estábulo',
    description: 'Celeiro reforçado para cavalos e éguas reprodutoras.',
    cost: 3000,
    icon: '🐎',
    capacity: 4,
    allowedSpecies: ['horse']
  }
};

export type AnimalSpeciesId = 'chicken' | 'cow' | 'horse';
export type AnimalGender = 'male' | 'female';

export interface AnimalDefinition {
  id: string;
  name: string;
  species: AnimalSpeciesId;
  speciesName: string;
  gender: AnimalGender;
  requiredBuilding: FarmBuildingId;
  requiredBuildingName: string;
  tier: CollectibleRank;
  cost: number;
  icon: string;
  description: string;
  produceName?: string;
}

export const FARM_ANIMALS: Record<string, AnimalDefinition> = {
  'chicken-male': {
    id: 'chicken-male',
    name: 'Galo Caipira',
    species: 'chicken',
    speciesName: 'Aves',
    gender: 'male',
    requiredBuilding: 'coop',
    requiredBuildingName: 'Galinheiro',
    tier: 'white',
    cost: 150,
    icon: '🐓',
    description: 'Galo reprodutor saudável. Essencial para fecundar ovos futuramente.'
  },
  'chicken-female': {
    id: 'chicken-female',
    name: 'Galinha Poedeira',
    species: 'chicken',
    speciesName: 'Aves',
    gender: 'female',
    requiredBuilding: 'coop',
    requiredBuildingName: 'Galinheiro',
    tier: 'white',
    cost: 200,
    icon: '🐔',
    description: 'Galinha fértil. Produz ovos frescos periodicamente na fazenda.',
    produceName: 'Ovo Caipira'
  },
  'cow-male': {
    id: 'cow-male',
    name: 'Touro Campeiro',
    species: 'cow',
    speciesName: 'Bovinos',
    gender: 'male',
    requiredBuilding: 'corral',
    requiredBuildingName: 'Curral',
    tier: 'white',
    cost: 600,
    icon: '🐂',
    description: 'Touro forte e imponente. Essencial para a linhagem de rebanhos bovinos.'
  },
  'cow-female': {
    id: 'cow-female',
    name: 'Vaca Leiteira',
    species: 'cow',
    speciesName: 'Bovinos',
    gender: 'female',
    requiredBuilding: 'corral',
    requiredBuildingName: 'Curral',
    tier: 'white',
    cost: 750,
    icon: '🐄',
    description: 'Vaca dócil de alta lactação. Produz leite fresco para alimentos e poções.',
    produceName: 'Balde de Leite'
  },
  'horse-male': {
    id: 'horse-male',
    name: 'Cavalo Árabe',
    species: 'horse',
    speciesName: 'Equinos',
    gender: 'male',
    requiredBuilding: 'stable',
    requiredBuildingName: 'Estábulo',
    tier: 'green',
    cost: 1200,
    icon: '🐎',
    description: 'Garanhão veloz e ágil. Gera potros velozes e serve de montaria.'
  },
  'horse-female': {
    id: 'horse-female',
    name: 'Égua Puro-Sangue',
    species: 'horse',
    speciesName: 'Equinos',
    gender: 'female',
    requiredBuilding: 'stable',
    requiredBuildingName: 'Estábulo',
    tier: 'green',
    cost: 1400,
    icon: '🐴',
    description: 'Matriz equina nobre com excelente linhagem genética.'
  }
};

export type CropTypeId = 'corn' | 'wheat' | 'carrot';

export interface CropDefinition {
  id: CropTypeId;
  name: string;
  seedName: string;
  cost: number;
  growthSeconds: number;
  icon: string;
  yieldMin: number;
  yieldMax: number;
  description: string;
}

export const FARM_CROPS: Record<CropTypeId, CropDefinition> = {
  corn: {
    id: 'corn',
    name: 'Milho',
    seedName: 'Sementes de Milho',
    cost: 15,
    growthSeconds: 30,
    icon: '🌽',
    yieldMin: 2,
    yieldMax: 4,
    description: 'Grãos dourados ideais para alimentar galinhas e aves.'
  },
  wheat: {
    id: 'wheat',
    name: 'Trigo',
    seedName: 'Sementes de Trigo',
    cost: 20,
    growthSeconds: 45,
    icon: '🌾',
    yieldMin: 2,
    yieldMax: 5,
    description: 'Cereal dourado usado para rações bovinas e pães.'
  },
  carrot: {
    id: 'carrot',
    name: 'Cenoura',
    seedName: 'Sementes de Cenoura',
    cost: 30,
    growthSeconds: 60,
    icon: '🥕',
    yieldMin: 1,
    yieldMax: 3,
    description: 'Raiz nutritiva e saborosa, o alimento predileto dos equinos.'
  }
};

export interface FarmPlotState {
  plotIndex: number;
  cropId: CropTypeId | null;
  plantedAt: string | null;
  /** Só recebe data de conclusão depois de irrigado. */
  readyAt: string | null;
  wateredAt?: string | null;
}

export interface OwnedAnimal {
  id: string;
  definitionId: string;
  name: string;
  species: AnimalSpeciesId;
  gender: AnimalGender;
  tier: CollectibleRank;
  buildingId: FarmBuildingId;
  acquiredAt: string;
  hunger?: number;
  hydration?: number;
}

export interface FarmAnimalCare {
  /** Unidades de ração no comedouro da instalação. */
  feed: number;
  /** Unidades de água no bebedouro da instalação. */
  water: number;
}

export interface FarmState {
  buildings: FarmBuildingId[];
  plots: FarmPlotState[];
  animals: OwnedAnimal[];
  /** Estoque de colheitas, sementes e rações; chaves crop-*, seed-* e feed-*. */
  storage: Record<string, number>;
  /** Sementes prontas para plantar, separadas do estoque de colheitas. */
  seeds?: Partial<Record<CropTypeId, number>>;
  /** Compras limitadas por dia UTC, por cultura. */
  dailySeedPurchases?: { date: string; quantities: Partial<Record<CropTypeId, number>> };
  /** Comedouro e bebedouro de cada instalação. */
  animalCare?: Partial<Record<FarmBuildingId, FarmAnimalCare>>;
  lastNeedsAt?: string;
}

export interface FarmResponse {
  farm: FarmState;
  gold: number;
  message?: string;
}

