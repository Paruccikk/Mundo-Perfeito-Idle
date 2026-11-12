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
export type CharacterGender = 'male' | 'female';
export type ProfessionId = 'animal_caretaker' | 'lumberjack' | 'fisher' | 'farmer';

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
  gender?: CharacterGender;
  professionId?: ProfessionId;
  professionName?: string;
  professionExperience?: number;
  professionLevel?: number;
  professionRank?: string;
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
  gender: CharacterGender;
  professionId: ProfessionId;
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
    capacity: 30,
    allowedSpecies: ['chicken']
  },
  corral: {
    id: 'corral',
    name: 'Curral',
    description: 'Instalação cercada com cochos para criação de vacas e touros leiteiros.',
    cost: 1500,
    icon: '🐄',
    capacity: 20,
    allowedSpecies: ['cow']
  },
  stable: {
    id: 'stable',
    name: 'Estábulo',
    description: 'Celeiro reforçado para cavalos e éguas reprodutoras.',
    cost: 3000,
    icon: '🐎',
    capacity: 12,
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

export type FishId = 'fish-minnow' | 'fish-trout' | 'fish-carp' | 'fish-golden';

export interface FishDefinition {
  id: FishId;
  name: string;
  icon: string;
  chance: number;
  minWeightKg: number;
  maxWeightKg: number;
  minLengthCm: number;
  maxLengthCm: number;
  description: string;
}

/** Ordem usada nos catálogos e no placar de pesca. */
export const FISH_ORDER: FishId[] = ['fish-minnow', 'fish-trout', 'fish-carp', 'fish-golden'];

export const FISH_CATALOG: Record<FishId, FishDefinition> = {
  'fish-minnow': {
    id: 'fish-minnow',
    name: 'Lambari',
    icon: '🐟',
    chance: 0.48,
    minWeightKg: 0.02,
    maxWeightKg: 0.14,
    minLengthCm: 4,
    maxLengthCm: 11,
    description: 'Pequeno e rápido. O primeiro troféu de todo pescador do vale.'
  },
  'fish-trout': {
    id: 'fish-trout',
    name: 'Truta',
    icon: '🐠',
    chance: 0.3,
    minWeightKg: 0.35,
    maxWeightKg: 2.8,
    minLengthCm: 22,
    maxLengthCm: 58,
    description: 'Listras rosadas e escamas pintadas. Gosta das águas frias do lago.'
  },
  'fish-carp': {
    id: 'fish-carp',
    name: 'Carpa',
    icon: '🐡',
    chance: 0.16,
    minWeightKg: 1.2,
    maxWeightKg: 7.5,
    minLengthCm: 32,
    maxLengthCm: 82,
    description: 'Robusta e dourada. Um exemplar grande é motivo de orgulho no rancho.'
  },
  'fish-golden': {
    id: 'fish-golden',
    name: 'Peixe Dourado',
    icon: '✨',
    chance: 0.06,
    minWeightKg: 2.5,
    maxWeightKg: 14.5,
    minLengthCm: 45,
    maxLengthCm: 112,
    description: 'Lenda do Lago de Valedouro. Brilha como o sol e raramente morde a isca.'
  }
};

export type FishRankId = 'filhote' | 'comum' | 'graudo' | 'trofeu' | 'lendario';

export interface FishRankDefinition {
  id: FishRankId;
  label: string;
  minScore: number;
  stars: number;
}

/** Faixas de raridade de uma captura, do menor ao maior exemplar. */
export const FISH_RANKS: FishRankDefinition[] = [
  { id: 'filhote', label: 'Filhote', minScore: 0, stars: 1 },
  { id: 'comum', label: 'Comum', minScore: 25, stars: 2 },
  { id: 'graudo', label: 'Graúdo', minScore: 50, stars: 3 },
  { id: 'trofeu', label: 'Troféu', minScore: 75, stars: 4 },
  { id: 'lendario', label: 'Lendário', minScore: 92, stars: 5 }
];

export function fishRankForScore(score: number): FishRankDefinition {
  for (let index = FISH_RANKS.length - 1; index >= 0; index -= 1) {
    const rank = FISH_RANKS[index];
    if (rank && score >= rank.minScore) return rank;
  }
  return FISH_RANKS[0]!;
}

export interface FishRecord {
  bestWeightKg: number;
  bestLengthCm: number;
  bestScore: number;
  bestRank: FishRankId;
  catches: number;
  lastCaughtAt: string;
}

export interface FarmFishingState {
  records: Partial<Record<FishId, FishRecord>>;
  totalCaught: number;
  /** Usado pelo servidor para impedir arremessos repetidos em sequência. */
  lastFishedAt?: string;
}

export interface FishCatchResult {
  fishId: FishId;
  weightKg: number;
  lengthCm: number;
  score: number;
  rank: FishRankId;
  isRecord: boolean;
  isWeightRecord: boolean;
  isLengthRecord: boolean;
  record: FishRecord;
  totalCaught: number;
}

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
  health?: number;
  happiness?: number;
  ageDays?: number;
  pregnantUntil?: string | null;
  fatherTier?: CollectibleRank | null;
}

export interface FarmEgg {
  id: string;
  motherId: string;
  laidAt: string;
  fertilized: boolean;
  hatchAt: string | null;
  tier: CollectibleRank;
  fatherTier?: CollectibleRank | null;
  /** Grupo de postura usado para incubar uma ninhada de oito ovos fecundados. */
  clutchId?: string | null;
  /** Tentativa de eclosão definida quando a ninhada completa oito ovos. */
  hatchChance?: number | null;
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
  /** Quantidade de canteiros liberados; compatível com fazendas antigas. */
  unlockedPlots?: number;
  animals: OwnedAnimal[];
  eggs?: FarmEgg[];
  /** Estoque de colheitas, sementes e rações; chaves crop-*, seed-* e feed-*. */
  storage: Record<string, number>;
  /** Sementes prontas para plantar, separadas do estoque de colheitas. */
  seeds?: Partial<Record<CropTypeId, number>>;
  /** Compras limitadas por dia UTC, por cultura. */
  dailySeedPurchases?: { date: string; quantities: Partial<Record<CropTypeId, number>> };
  /** Comedouro e bebedouro de cada instalação. */
  animalCare?: Partial<Record<FarmBuildingId, FarmAnimalCare>>;
  lastNeedsAt?: string;
  /** Recordes e histórico da pesca no lago da cidade. */
  fishing?: FarmFishingState;
}

export interface FarmResponse {
  farm: FarmState;
  gold: number;
  message?: string;
  /** Presente apenas na resposta de uma pescaria. */
  catch?: FishCatchResult;
}

