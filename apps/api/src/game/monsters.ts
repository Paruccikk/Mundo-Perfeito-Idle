import type {
  EnvironmentId,
  MonsterDefinition,
  MonsterSpriteId,
  MonsterVariant,
  StageDefinition,
  StageFarm
} from './types.js';

export const DEFAULT_STAGE_ID = 'clearing-01';

interface MonsterSeed {
  id: string;
  name: string;
  sprite: MonsterSpriteId;
  variant?: MonsterVariant;
  tint?: number;
  accent?: number;
  visualScale?: number;
}

interface StageSeed {
  id: string;
  name: string;
  region: string;
  regionId: string;
  description: string;
  level: number;
  environment: EnvironmentId;
  farmId: string;
  farmName: string;
  farmDescription: string;
  monsters: [MonsterSeed, MonsterSeed, MonsterSeed];
  boss: MonsterSeed;
}

const REGION_TROPHIES: Record<string, StageFarm> = {
  forest: { itemId: 'trophy-forest', name: 'Coroa do Bosque', description: 'Troféu dos guardiões do Bosque de Valedouro.', rarity: 'rare' },
  ruins: { itemId: 'trophy-ruins', name: 'Selo das Ruínas', description: 'Selo arrancado dos senhores das Ruínas de Pedra.', rarity: 'rare' },
  swamp: { itemId: 'trophy-swamp', name: 'Olho do Pântano', description: 'Relíquia pulsante do Pântano das Brumas.', rarity: 'epic' },
  desert: { itemId: 'trophy-desert', name: 'Cetro do Deserto', description: 'Cetro dourado do Deserto de Cinzas.', rarity: 'epic' },
  ice: { itemId: 'trophy-ice', name: 'Chifre Glacial', description: 'Chifre eterno dos Picos Glaciais.', rarity: 'epic' },
  volcano: { itemId: 'trophy-volcano', name: 'Núcleo Incandescente', description: 'Coração ardente da Forja Vulcânica.', rarity: 'legendary' },
  abyss: { itemId: 'trophy-abyss', name: 'Crânio Abissal', description: 'Crânio que ainda sussurra no Abismo Sombrio.', rarity: 'legendary' },
  sky: { itemId: 'trophy-sky', name: 'Auréola Celeste', description: 'Auréola dos guardiões da Cidadela Celeste.', rarity: 'legendary' },
  void: { itemId: 'trophy-void', name: 'Fragmento do Vazio', description: 'Estilhaço de um mundo que deixou de existir.', rarity: 'mythic' },
  legend: { itemId: 'trophy-legend', name: 'Essência Perfeita', description: 'A relíquia suprema do Mundo Perfeito.', rarity: 'mythic' }
};

const STAGE_SEEDS: StageSeed[] = [
  {
    id: 'clearing-01', name: 'Clareira dos Aprendizes', region: 'Bosque de Valedouro', regionId: 'forest',
    description: 'A primeira clareira além dos muros de Valedouro. Slimes, javalis e lobos testam os recém-chegados.',
    level: 1, environment: 'forest', farmId: 'mat-clearing', farmName: 'Geleia da Clareira',
    farmDescription: 'Resíduo luminoso dos monstros da Clareira dos Aprendizes.',
    monsters: [
      { id: 'slime', name: 'Slime Verde', sprite: 'slime' },
      { id: 'boar', name: 'Javali Selvagem', sprite: 'boar' },
      { id: 'wolf', name: 'Lobo Cinzento', sprite: 'wolf' }
    ],
    boss: { id: 'slime-king', name: 'Rei Slime', sprite: 'slime-king' }
  },
  {
    id: 'wildwood-02', name: 'Trilha dos Javalis', region: 'Bosque de Valedouro', regionId: 'forest',
    description: 'Uma trilha de lama e raízes onde os javalis dominam. Aranhas musgosas espreitam entre as árvores.',
    level: 4, environment: 'forest', farmId: 'mat-wildwood', farmName: 'Presa de Javali',
    farmDescription: 'Presa resistente colhida na Trilha dos Javalis.',
    monsters: [
      { id: 'boar-tusk', name: 'Javali de Presas', sprite: 'boar', tint: 0x8a5a38, accent: 0xf0d9a8 },
      { id: 'spider-moss', name: 'Aranha Musgosa', sprite: 'beast', variant: 'spider', tint: 0x4e6b43, accent: 0xc9d96e },
      { id: 'wolf-hungry', name: 'Lobo Faminto', sprite: 'wolf', tint: 0x6f6655, accent: 0xffc75a }
    ],
    boss: { id: 'boar-elder', name: 'Javali Ancião', sprite: 'boar', tint: 0x5e3a24, accent: 0xf2c66a, visualScale: 1.35 }
  },
  {
    id: 'wolfden-03', name: 'Bosque dos Uivos', region: 'Bosque de Valedouro', regionId: 'forest',
    description: 'O coração sombrio do bosque. Uivos cortam a noite e ursos disputam território com a alcateia.',
    level: 7, environment: 'forest', farmId: 'mat-wolfden', farmName: 'Pele de Lobo Alfa',
    farmDescription: 'Pele espessa marcada pelas garras da alcateia.',
    monsters: [
      { id: 'wolf-shadow', name: 'Lobo das Sombras', sprite: 'wolf', tint: 0x5d6675, accent: 0x9fe8ff },
      { id: 'spider-cave', name: 'Aranha da Caverna', sprite: 'beast', variant: 'spider', tint: 0x3d3550, accent: 0xb68cff },
      { id: 'bear-brown', name: 'Urso Pardo', sprite: 'beast', variant: 'bear', tint: 0x6b4a2f, accent: 0xe7c168 }
    ],
    boss: { id: 'wolf-alpha', name: 'Lobo Alfa', sprite: 'wolf', tint: 0x9aa7b5, accent: 0xffd76a, visualScale: 1.4 }
  },

  {
    id: 'ruins-01', name: 'Pátio em Ruínas', region: 'Ruínas de Pedra', regionId: 'ruins',
    description: 'Colunas quebradas guardam um pátio tomado por esqueletos e salteadores em busca de relíquias.',
    level: 10, environment: 'ruins', farmId: 'mat-ruins', farmName: 'Osso Antigo',
    farmDescription: 'Osso endurecido retirado dos guardiões do pátio.',
    monsters: [
      { id: 'skeleton-guard', name: 'Guarda Esquelético', sprite: 'undead', variant: 'skeleton', tint: 0xcfc7b0, accent: 0x7fe7ff },
      { id: 'bandit-ruin', name: 'Salteador das Ruínas', sprite: 'humanoid', variant: 'bandit', tint: 0x5f5145, accent: 0xd6a15f },
      { id: 'spider-dust', name: 'Aranha de Poeira', sprite: 'beast', variant: 'spider', tint: 0x756b58, accent: 0xf0c774 }
    ],
    boss: { id: 'knight-forgotten', name: 'Cavaleiro Esquecido', sprite: 'humanoid', variant: 'knight', tint: 0x6e7280, accent: 0xc9d3df, visualScale: 1.3 }
  },
  {
    id: 'catacombs-02', name: 'Catacumbas', region: 'Ruínas de Pedra', regionId: 'ruins',
    description: 'Túneis de pedra e ossários. O ar é pesado e os mortos não descansam.',
    level: 13, environment: 'ruins', farmId: 'mat-catacombs', farmName: 'Pó de Tumba',
    farmDescription: 'Pó frio que se acumula sobre os mortos inquietos.',
    monsters: [
      { id: 'ghoul-crypt', name: 'Carniçal da Cripta', sprite: 'undead', variant: 'ghoul', tint: 0x6b7a5c, accent: 0xd9ff8a },
      { id: 'skeleton-acolyte', name: 'Acólito Esquelético', sprite: 'undead', variant: 'skeleton', tint: 0xbfc5c9, accent: 0xb68cff },
      { id: 'wraith-crypt', name: 'Espectro da Cripta', sprite: 'spirit', variant: 'wraith', tint: 0x6c7fa8, accent: 0x9fe8ff }
    ],
    boss: { id: 'necromancer', name: 'Necromante', sprite: 'humanoid', variant: 'cultist', tint: 0x3f3552, accent: 0x9cff8a, visualScale: 1.32 }
  },
  {
    id: 'tower-03', name: 'Torre Partida', region: 'Ruínas de Pedra', regionId: 'ruins',
    description: 'O topo da torre foi rasgado por magia antiga. Runas ainda zumbem entre os escombros.',
    level: 16, environment: 'ruins', farmId: 'mat-tower', farmName: 'Fragmento Rúnico',
    farmDescription: 'Estilhaço de pedra pulsante de magia antiga.',
    monsters: [
      { id: 'wraith-arcane', name: 'Espectro Arcano', sprite: 'spirit', variant: 'wraith', tint: 0x5268a8, accent: 0x7fe7ff },
      { id: 'cultist-tower', name: 'Cultista da Torre', sprite: 'humanoid', variant: 'cultist', tint: 0x3d4b57, accent: 0xff8d5a },
      { id: 'golem-rune', name: 'Golem Rúnico', sprite: 'construct', variant: 'golem', tint: 0x777461, accent: 0x7fe7ff }
    ],
    boss: { id: 'golem-elder', name: 'Golem Ancião', sprite: 'construct', variant: 'golem', tint: 0x6f6a58, accent: 0x7fe7ff, visualScale: 1.48 }
  },

  {
    id: 'marsh-01', name: 'Lagoa Pútrida', region: 'Pântano das Brumas', regionId: 'swamp',
    description: 'Água parada, névoa verde e criaturas que se arrastam sob a superfície.',
    level: 20, environment: 'swamp', farmId: 'mat-marsh', farmName: 'Lodo Vivo',
    farmDescription: 'Massa orgânica que ainda se move sozinha.',
    monsters: [
      { id: 'toad-bog', name: 'Sapo do Lodo', sprite: 'beast', variant: 'bear', tint: 0x5f7a45, accent: 0xd9ff8a, visualScale: 0.85 },
      { id: 'leech-giant', name: 'Sanguessuga Gigante', sprite: 'beast', variant: 'serpent', tint: 0x6b3f52, accent: 0xff8da8 },
      { id: 'witch-bog', name: 'Bruxa do Lodo', sprite: 'humanoid', variant: 'cultist', tint: 0x384a3d, accent: 0xa8ff6a }
    ],
    boss: { id: 'witch-mother', name: 'Bruxa-Mãe', sprite: 'humanoid', variant: 'cultist', tint: 0x2f3d35, accent: 0xc9ff7a, visualScale: 1.36 }
  },
  {
    id: 'drowned-02', name: 'Bosque Afogado', region: 'Pântano das Brumas', regionId: 'swamp',
    description: 'Árvores mortas emergem da água escura. Ents apodrecidos ainda protegem o antigo bosque.',
    level: 23, environment: 'swamp', farmId: 'mat-drowned', farmName: 'Madeira Podre',
    farmDescription: 'Madeira encharcada que nunca apodrece por completo.',
    monsters: [
      { id: 'treant-drowned', name: 'Ent Afogado', sprite: 'construct', variant: 'treant', tint: 0x5a6045, accent: 0xa8ff6a },
      { id: 'troll-marsh', name: 'Troll do Pântano', sprite: 'beast', variant: 'yeti', tint: 0x5c7050, accent: 0xd6ff7a },
      { id: 'wisp-marsh', name: 'Fogo-Fátuo', sprite: 'spirit', variant: 'elemental', tint: 0x6affc9, accent: 0xd9fff2 }
    ],
    boss: { id: 'treant-elder', name: 'Treant Ancião', sprite: 'construct', variant: 'treant', tint: 0x454d36, accent: 0xb6ff6a, visualScale: 1.5 }
  },
  {
    id: 'sunken-03', name: 'Cripta Alagada', region: 'Pântano das Brumas', regionId: 'swamp',
    description: 'A água invadiu a cripta e despertou algo antigo. Escamas enormes brilham sob a lama.',
    level: 26, environment: 'swamp', farmId: 'mat-sunken', farmName: 'Escama de Hidra',
    farmDescription: 'Escama dura arrancada das criaturas da cripta alagada.',
    monsters: [
      { id: 'ghoul-marsh', name: 'Afogado', sprite: 'undead', variant: 'ghoul', tint: 0x5c6b52, accent: 0x9fe8a0 },
      { id: 'hydra-young', name: 'Hidra Jovem', sprite: 'dragon', variant: 'hydra', tint: 0x3f6b5a, accent: 0x9cffd0 },
      { id: 'wraith-marsh', name: 'Dama do Lodo', sprite: 'spirit', variant: 'wraith', tint: 0x4f6b5e, accent: 0xb6ffa8 }
    ],
    boss: { id: 'hydra-bog', name: 'Hidra do Pântano', sprite: 'dragon', variant: 'hydra', tint: 0x315044, accent: 0x9cffd0, visualScale: 1.5 }
  },

  {
    id: 'desert-01', name: 'Dunas Ardentes', region: 'Deserto de Cinzas', regionId: 'desert',
    description: 'O sol queima e o vento cobre as pegadas. Escorpiões e saqueadores disputam cada gota d’água.',
    level: 30, environment: 'desert', farmId: 'mat-desert', farmName: 'Quitina de Escorpião',
    farmDescription: 'Placa resistente do exoesqueleto dos escorpiões.',
    monsters: [
      { id: 'scorpion-dune', name: 'Escorpião das Dunas', sprite: 'beast', variant: 'scorpion', tint: 0xa8753e, accent: 0xffd76a },
      { id: 'raider-sand', name: 'Saqueador do Deserto', sprite: 'humanoid', variant: 'bandit', tint: 0x8d7455, accent: 0xffb45a },
      { id: 'mummy-dune', name: 'Múmia Seca', sprite: 'humanoid', variant: 'mummy', tint: 0xb8a27a, accent: 0x7fe7ff }
    ],
    boss: { id: 'scorpion-king', name: 'Escorpião Rei', sprite: 'beast', variant: 'scorpion', tint: 0x7d4f2a, accent: 0xffc75a, visualScale: 1.5 }
  },
  {
    id: 'tomb-02', name: 'Tumba Perdida', region: 'Deserto de Cinzas', regionId: 'desert',
    description: 'Uma tumba soterrada há séculos. O ouro atrai saqueadores, mas os mortos cobram seu preço.',
    level: 33, environment: 'desert', farmId: 'mat-tomb', farmName: 'Bandagem Real',
    farmDescription: 'Tecido funerário bordado com fios de ouro.',
    monsters: [
      { id: 'mummy-guard', name: 'Guarda Real', sprite: 'humanoid', variant: 'mummy', tint: 0xc7b184, accent: 0xffd76a },
      { id: 'skeleton-tomb', name: 'Esqueleto da Tumba', sprite: 'undead', variant: 'skeleton', tint: 0xd8cfb4, accent: 0xffc75a },
      { id: 'golem-sand', name: 'Golem de Areia', sprite: 'construct', variant: 'golem', tint: 0xb08a55, accent: 0xffe08a }
    ],
    boss: { id: 'pharaoh', name: 'Faraó Esquecido', sprite: 'humanoid', variant: 'pharaoh', tint: 0xd4b46a, accent: 0x7fe7ff, visualScale: 1.32 }
  },
  {
    id: 'oasis-03', name: 'Oásis Negro', region: 'Deserto de Cinzas', regionId: 'desert',
    description: 'A água do oásis ficou negra. Uma serpente solar e um djinn corrompido guardam o santuário.',
    level: 36, environment: 'desert', farmId: 'mat-oasis', farmName: 'Veneno de Serpente',
    farmDescription: 'Veneno que brilha como ouro líquido.',
    monsters: [
      { id: 'serpent-oasis', name: 'Serpente do Oásis', sprite: 'beast', variant: 'serpent', tint: 0x6b5a2f, accent: 0xffe06a },
      { id: 'demon-oasis', name: 'Djinn Corrompido', sprite: 'demon', variant: 'imp', tint: 0x7a4a8a, accent: 0xff8d5a },
      { id: 'cultist-oasis', name: 'Sacerdote do Sol', sprite: 'humanoid', variant: 'cultist', tint: 0x8a6a36, accent: 0xffd76a }
    ],
    boss: { id: 'serpent-sun', name: 'Serpente do Sol', sprite: 'beast', variant: 'serpent', tint: 0x8a6a2f, accent: 0xffd76a, visualScale: 1.5 }
  },

  {
    id: 'peaks-01', name: 'Passo Nevado', region: 'Picos Glaciais', regionId: 'ice',
    description: 'O vento corta como lâminas. Lobos brancos e yetis descem das montanhas em busca de presas.',
    level: 40, environment: 'ice', farmId: 'mat-peaks', farmName: 'Pele de Yeti',
    farmDescription: 'Pele grossa que mantém o calor das montanhas.',
    monsters: [
      { id: 'wolf-frost', name: 'Lobo Glacial', sprite: 'wolf', tint: 0xbfd6e0, accent: 0x7fe7ff },
      { id: 'yeti-peak', name: 'Yeti das Neves', sprite: 'beast', variant: 'yeti', tint: 0xd8e4ea, accent: 0x7fe7ff },
      { id: 'raider-frost', name: 'Saqueador do Gelo', sprite: 'humanoid', variant: 'bandit', tint: 0x5a6d7a, accent: 0xc9e8ff }
    ],
    boss: { id: 'yeti-patriarch', name: 'Yeti Patriarca', sprite: 'beast', variant: 'yeti', tint: 0xe4eef2, accent: 0x9fe8ff, visualScale: 1.5 }
  },
  {
    id: 'cavern-02', name: 'Caverna de Gelo', region: 'Picos Glaciais', regionId: 'ice',
    description: 'Cristais azuis iluminam a caverna. O gelo conserva criaturas que deveriam estar mortas.',
    level: 43, environment: 'ice', farmId: 'mat-cavern', farmName: 'Cristal Gélido',
    farmDescription: 'Cristal que nunca derrete, mesmo sob o fogo.',
    monsters: [
      { id: 'elemental-frost', name: 'Elemental de Gelo', sprite: 'spirit', variant: 'elemental', tint: 0x7fd8f0, accent: 0xd9fbff },
      { id: 'bear-polar', name: 'Urso Polar', sprite: 'beast', variant: 'bear', tint: 0xd5e2e8, accent: 0x7fe7ff },
      { id: 'wraith-frost', name: 'Espectro Congelado', sprite: 'spirit', variant: 'wraith', tint: 0x7fa8c9, accent: 0xc9f4ff }
    ],
    boss: { id: 'elemental-glacier', name: 'Elemental Glacial', sprite: 'spirit', variant: 'elemental', tint: 0x5fb8d8, accent: 0xe0fbff, visualScale: 1.45 }
  },
  {
    id: 'citadel-03', name: 'Cidadela Gélida', region: 'Picos Glaciais', regionId: 'ice',
    description: 'Uma fortaleza esquecida no topo do mundo. O Jarl e seus cavaleiros congelados ainda marcham.',
    level: 46, environment: 'ice', farmId: 'mat-citadel', farmName: 'Aço Gélido',
    farmDescription: 'Aço que retinha o frio de mil invernos.',
    monsters: [
      { id: 'knight-frost', name: 'Cavaleiro Gélido', sprite: 'humanoid', variant: 'knight', tint: 0x8fb8c9, accent: 0xd9fbff },
      { id: 'yeti-warrior', name: 'Yeti Guerreiro', sprite: 'beast', variant: 'yeti', tint: 0xc9dbe4, accent: 0xffd76a },
      { id: 'wraith-castle', name: 'Dama da Cidadela', sprite: 'spirit', variant: 'wraith', tint: 0x6f92b8, accent: 0xd9f4ff }
    ],
    boss: { id: 'jarl-frost', name: 'Jarl Gelo-Eterno', sprite: 'humanoid', variant: 'knight', tint: 0x4f7a9c, accent: 0xc9f4ff, visualScale: 1.45 }
  },

  {
    id: 'forge-01', name: 'Entrada da Forja', region: 'Forja Vulcânica', regionId: 'volcano',
    description: 'O ar cheira a enxofre. Golems de magma e diabretes trabalham nas galerias sem descanso.',
    level: 50, environment: 'volcano', farmId: 'mat-forge', farmName: 'Núcleo de Magma',
    farmDescription: 'Pedra incandescente que pulsa como um coração.',
    monsters: [
      { id: 'golem-magma', name: 'Golem de Magma', sprite: 'construct', variant: 'golem', tint: 0x7a3f2f, accent: 0xff8d3d },
      { id: 'imp-forge', name: 'Diabrete da Forja', sprite: 'demon', variant: 'imp', tint: 0x9c4a2f, accent: 0xffc75a },
      { id: 'hound-ember', name: 'Cão de Brasa', sprite: 'beast', variant: 'wolf', tint: 0x6b3026, accent: 0xff8d3d }
    ],
    boss: { id: 'golem-forge', name: 'Golem de Forja', sprite: 'construct', variant: 'golem', tint: 0x5f3328, accent: 0xffb45a, visualScale: 1.45 }
  },
  {
    id: 'chambers-02', name: 'Câmaras Incandescentes', region: 'Forja Vulcânica', regionId: 'volcano',
    description: 'Rios de lava cortam as câmaras. Algo alado e cornífero reina sobre o calor.',
    level: 53, environment: 'volcano', farmId: 'mat-chambers', farmName: 'Chifre Demoníaco',
    farmDescription: 'Chifre quente que jamais esfria.',
    monsters: [
      { id: 'demon-flame', name: 'Demônio das Chamas', sprite: 'demon', variant: 'demon', tint: 0x8a2f35, accent: 0xff8d3d },
      { id: 'elemental-fire', name: 'Elemental de Fogo', sprite: 'spirit', variant: 'elemental', tint: 0xff6b2f, accent: 0xffe08a },
      { id: 'drake-ember', name: 'Drake Incandescente', sprite: 'dragon', variant: 'dragon', tint: 0x8a3f2f, accent: 0xffc75a }
    ],
    boss: { id: 'flame-lord', name: 'Senhor das Chamas', sprite: 'demon', variant: 'demon', tint: 0x6b2026, accent: 0xffd76a, visualScale: 1.5 }
  },
  {
    id: 'anvil-03', name: 'Bigorna do Titã', region: 'Forja Vulcânica', regionId: 'volcano',
    description: 'No centro da montanha, uma bigorna do tamanho de uma casa aguarda o próximo titã.',
    level: 56, environment: 'volcano', farmId: 'mat-anvil', farmName: 'Placa de Titã',
    farmDescription: 'Placa de metal vulcânico quase indestrutível.',
    monsters: [
      { id: 'golem-iron', name: 'Golem de Ferro', sprite: 'construct', variant: 'golem', tint: 0x4f4a45, accent: 0xff8d3d },
      { id: 'dragon-ash', name: 'Dragão de Cinzas', sprite: 'dragon', variant: 'dragon', tint: 0x4a3f3d, accent: 0xff6b2f },
      { id: 'cultist-ash', name: 'Cultista da Bigorna', sprite: 'humanoid', variant: 'cultist', tint: 0x3d2f2f, accent: 0xffb45a }
    ],
    boss: { id: 'titan-iron', name: 'Titã de Ferro', sprite: 'construct', variant: 'golem', tint: 0x3f3a35, accent: 0xffb45a, visualScale: 1.55 }
  },

  {
    id: 'abyss-01', name: 'Fenda do Abismo', region: 'Abismo Sombrio', regionId: 'abyss',
    description: 'A fenda suga a luz. Sussurros prometem poder a quem ousar descer.',
    level: 60, environment: 'abyss', farmId: 'mat-abyss', farmName: 'Essência Sombria',
    farmDescription: 'Fumaça negra condensada em forma sólida.',
    monsters: [
      { id: 'demon-abyss', name: 'Demônio Abissal', sprite: 'demon', variant: 'demon', tint: 0x3f2f4f, accent: 0xff4a8a },
      { id: 'wraith-abyss', name: 'Espectro do Abismo', sprite: 'spirit', variant: 'wraith', tint: 0x4f3f6b, accent: 0xc98aff },
      { id: 'voidling-abyss', name: 'Aberração do Vazio', sprite: 'spirit', variant: 'voidling', tint: 0x2f2f4f, accent: 0xff4aff }
    ],
    boss: { id: 'abyss-prince', name: 'Príncipe do Abismo', sprite: 'demon', variant: 'demon', tint: 0x2f1f3f, accent: 0xff8aff, visualScale: 1.5 }
  },
  {
    id: 'cathedral-02', name: 'Catedral Caída', region: 'Abismo Sombrio', regionId: 'abyss',
    description: 'Vitrais quebrados e bancos vazios. A fé virou algo monstruoso.',
    level: 63, environment: 'abyss', farmId: 'mat-cathedral', farmName: 'Relíquia Profana',
    farmDescription: 'Relíquia consagrada que foi corrompida pelo abismo.',
    monsters: [
      { id: 'cultist-fallen', name: 'Cultista Caído', sprite: 'humanoid', variant: 'cultist', tint: 0x3f3f4f, accent: 0xc98aff },
      { id: 'knight-fallen', name: 'Cavaleiro Profano', sprite: 'humanoid', variant: 'knight', tint: 0x3f3545, accent: 0xff4a8a },
      { id: 'ghoul-cathedral', name: 'Carniçal da Catedral', sprite: 'undead', variant: 'ghoul', tint: 0x4f5a45, accent: 0xc9ff6a }
    ],
    boss: { id: 'archbishop-dark', name: 'Arcebispo Sombrio', sprite: 'humanoid', variant: 'cultist', tint: 0x2f2f3d, accent: 0xff8aff, visualScale: 1.4 }
  },
  {
    id: 'bonethrone-03', name: 'Trono de Ossos', region: 'Abismo Sombrio', regionId: 'abyss',
    description: 'Um trono feito de milhares de ossos. O Lich Rei observa cada passo.',
    level: 66, environment: 'abyss', farmId: 'mat-bonethrone', farmName: 'Osso de Lich',
    farmDescription: 'Osso que ainda contém uma centelha de magia proibida.',
    monsters: [
      { id: 'lich-bone', name: 'Lich Menor', sprite: 'undead', variant: 'lich', tint: 0xbfc5c9, accent: 0x9cff8a },
      { id: 'demon-bone', name: 'Demônio de Ossos', sprite: 'demon', variant: 'demon', tint: 0x4f3f3d, accent: 0xff4a8a },
      { id: 'dragon-bone', name: 'Dragão Ósseo', sprite: 'dragon', variant: 'dragon', tint: 0x8a8475, accent: 0x9cff8a }
    ],
    boss: { id: 'lich-king', name: 'Lich Rei', sprite: 'undead', variant: 'lich', tint: 0x9cff8a, accent: 0xd9ffb6, visualScale: 1.5 }
  },

  {
    id: 'sky-01', name: 'Escadaria das Nuvens', region: 'Cidadela Celeste', regionId: 'sky',
    description: 'Degraus de mármore flutuam sobre o mar. Guardiões alados testam os que sobem.',
    level: 70, environment: 'sky', farmId: 'mat-sky', farmName: 'Pluma Celeste',
    farmDescription: 'Pluma leve que brilha sob a luz do sol.',
    monsters: [
      { id: 'angel-guard', name: 'Guardião Alado', sprite: 'humanoid', variant: 'angel', tint: 0xe4eef2, accent: 0xffd76a },
      { id: 'knight-celestial', name: 'Cavaleiro Celeste', sprite: 'humanoid', variant: 'knight', tint: 0x9cb8d8, accent: 0xffe08a },
      { id: 'elemental-cloud', name: 'Elemental das Nuvens', sprite: 'spirit', variant: 'elemental', tint: 0xc9e4f0, accent: 0xffffff }
    ],
    boss: { id: 'guardian-celestial', name: 'Guardião Celeste', sprite: 'humanoid', variant: 'knight', tint: 0xd8e4f0, accent: 0xffd76a, visualScale: 1.52 }
  },
  {
    id: 'gardens-02', name: 'Jardins Suspensos', region: 'Cidadela Celeste', regionId: 'sky',
    description: 'Jardins flutuantes cultivados por séculos. Quimeras e elementais protegem a fonte da vida.',
    level: 73, environment: 'sky', farmId: 'mat-gardens', farmName: 'Pólen Estelar',
    farmDescription: 'Pólen que flutua contra o vento.',
    monsters: [
      { id: 'chimera-sky', name: 'Quimera dos Jardins', sprite: 'dragon', variant: 'hydra', tint: 0xc9a86a, accent: 0xffd76a },
      { id: 'elemental-star', name: 'Elemental Estelar', sprite: 'spirit', variant: 'elemental', tint: 0x9cb8ff, accent: 0xffffff },
      { id: 'lion-sky', name: 'Leão Alado', sprite: 'beast', variant: 'bear', tint: 0xd8b86a, accent: 0xffe08a }
    ],
    boss: { id: 'chimera-celestial', name: 'Quimera Celestial', sprite: 'dragon', variant: 'hydra', tint: 0xb8965a, accent: 0xffe08a, visualScale: 1.5 }
  },
  {
    id: 'council-03', name: 'Sala do Conselho', region: 'Cidadela Celeste', regionId: 'sky',
    description: 'O conselho que governava os céus foi corrompido. O Arcanjo Caído ocupa o trono de luz.',
    level: 76, environment: 'sky', farmId: 'mat-council', farmName: 'Selo do Arcanjo',
    farmDescription: 'Selo sagrado quebrado ao meio.',
    monsters: [
      { id: 'angel-council', name: 'Arcanjo do Conselho', sprite: 'humanoid', variant: 'angel', tint: 0xd8e4f0, accent: 0xffe08a },
      { id: 'golem-marble', name: 'Golem de Mármore', sprite: 'construct', variant: 'golem', tint: 0xd8d4c9, accent: 0x9fe8ff },
      { id: 'paladin-fallen', name: 'Paladino Caído', sprite: 'humanoid', variant: 'knight', tint: 0x8a8f9c, accent: 0xc98aff }
    ],
    boss: { id: 'archangel-fallen', name: 'Arcanjo Caído', sprite: 'humanoid', variant: 'angel', tint: 0x8a7f9c, accent: 0xff4a8a, visualScale: 1.52 }
  },

  {
    id: 'void-01', name: 'Limiar do Vazio', region: 'Trono do Vazio', regionId: 'void',
    description: 'Onde o mundo termina. Estrelas mortas giram ao redor de algo que não deveria existir.',
    level: 80, environment: 'void', farmId: 'mat-void', farmName: 'Fragmento do Vazio',
    farmDescription: 'Estilhaço de realidade que não reflete luz.',
    monsters: [
      { id: 'voidling-limbo', name: 'Errante do Limiar', sprite: 'spirit', variant: 'voidling', tint: 0x3f2f5f, accent: 0xff8aff },
      { id: 'wraith-void', name: 'Espectro do Vazio', sprite: 'spirit', variant: 'wraith', tint: 0x2f2f4f, accent: 0x9c8aff },
      { id: 'demon-void', name: 'Demônio do Vazio', sprite: 'demon', variant: 'demon', tint: 0x3f2f4f, accent: 0xff4aff }
    ],
    boss: { id: 'world-devourer', name: 'Devorador de Mundos', sprite: 'spirit', variant: 'voidling', tint: 0x2f1f4f, accent: 0xff4aff, visualScale: 1.6 }
  },
  {
    id: 'starmar-02', name: 'Mar de Estrelas Mortas', region: 'Trono do Vazio', regionId: 'void',
    description: 'Um oceano de estrelas apagadas. Dragões do vazio nadam entre os restos de mundos.',
    level: 83, environment: 'void', farmId: 'mat-starmar', farmName: 'Escama Estelar',
    farmDescription: 'Escama que contém uma constelação inteira.',
    monsters: [
      { id: 'voidling-star', name: 'Larva Estelar', sprite: 'spirit', variant: 'voidling', tint: 0x4f3f7a, accent: 0xffe08a },
      { id: 'dragon-void', name: 'Draco Estelar', sprite: 'dragon', variant: 'dragon', tint: 0x3f2f6b, accent: 0x9c8aff },
      { id: 'demon-star', name: 'Ceifador de Estrelas', sprite: 'demon', variant: 'demon', tint: 0x2f2f5f, accent: 0xff8aff }
    ],
    boss: { id: 'void-dragon', name: 'Dragão do Vazio', sprite: 'dragon', variant: 'dragon', tint: 0x2f1f5f, accent: 0xff8aff, visualScale: 1.6 }
  },
  {
    id: 'voidheart-03', name: 'Coração do Vazio', region: 'Trono do Vazio', regionId: 'void',
    description: 'O centro de tudo que foi esquecido. Um avatar do vazio pulsa no trono.',
    level: 86, environment: 'void', farmId: 'mat-voidheart', farmName: 'Núcleo do Vazio',
    farmDescription: 'Núcleo que absorve toda a luz ao redor.',
    monsters: [
      { id: 'voidling-heart', name: 'Pulso do Vazio', sprite: 'spirit', variant: 'voidling', tint: 0x4f1f6b, accent: 0xff4aff },
      { id: 'lich-void', name: 'Lich do Vazio', sprite: 'undead', variant: 'lich', tint: 0x9c8ab8, accent: 0xff4aff },
      { id: 'elemental-void', name: 'Elemental do Vazio', sprite: 'spirit', variant: 'elemental', tint: 0x5f2f7a, accent: 0xff8aff }
    ],
    boss: { id: 'void-avatar', name: 'Avatar do Vazio', sprite: 'spirit', variant: 'voidling', tint: 0x3f1f5f, accent: 0xff4aff, visualScale: 1.65 }
  },

  {
    id: 'twilight-01', name: 'Campos do Crepúsculo', region: 'Lenda do Mundo Perfeito', regionId: 'legend',
    description: 'O último pôr do sol do mundo. Cavaleiros e dragões lendários guardam a passagem.',
    level: 90, environment: 'legend', farmId: 'mat-twilight', farmName: 'Metal Crepuscular',
    farmDescription: 'Metal que brilha com as últimas cores do dia.',
    monsters: [
      { id: 'knight-twilight', name: 'Cavaleiro do Crepúsculo', sprite: 'humanoid', variant: 'knight', tint: 0x8a6a9c, accent: 0xffc75a },
      { id: 'dragon-twilight', name: 'Dragão Crepuscular', sprite: 'dragon', variant: 'dragon', tint: 0x5f3f6b, accent: 0xff8d5a },
      { id: 'angel-twilight', name: 'Serafim do Ocaso', sprite: 'humanoid', variant: 'angel', tint: 0xd8b8c9, accent: 0xffc75a }
    ],
    boss: { id: 'twilight-knight', name: 'Senhor do Crepúsculo', sprite: 'humanoid', variant: 'knight', tint: 0x6b4a7a, accent: 0xffd76a, visualScale: 1.55 }
  },
  {
    id: 'worldtree-02', name: 'Árvore do Mundo', region: 'Lenda do Mundo Perfeito', regionId: 'legend',
    description: 'A raiz de toda a vida. Algo escuro cresceu em seu cerne e agora consome a seiva primordial.',
    level: 93, environment: 'legend', farmId: 'mat-worldtree', farmName: 'Seiva Primordial',
    farmDescription: 'Seiva que cura e envenena ao mesmo tempo.',
    monsters: [
      { id: 'treant-world', name: 'Guardião de Yggdrasil', sprite: 'construct', variant: 'treant', tint: 0x4f6b45, accent: 0xffe08a },
      { id: 'elemental-nature', name: 'Elemental da Natureza', sprite: 'spirit', variant: 'elemental', tint: 0x6aff9c, accent: 0xd9ffb6 },
      { id: 'dragon-wood', name: 'Draco de Madeira', sprite: 'dragon', variant: 'hydra', tint: 0x5a4a2f, accent: 0x9cff6a }
    ],
    boss: { id: 'yggdrasil-dark', name: 'Yggdrasil Sombrio', sprite: 'construct', variant: 'treant', tint: 0x3f4a35, accent: 0xff8aff, visualScale: 1.7 }
  },
  {
    id: 'perfect-03', name: 'Trono Perfeito', region: 'Lenda do Mundo Perfeito', regionId: 'legend',
    description: 'O fim de todas as jornadas. O Soberano do Mundo Perfeito aguarda no trono dourado.',
    level: 96, environment: 'legend', farmId: 'mat-perfect', farmName: 'Essência Perfeita',
    farmDescription: 'A substância de um mundo sem falhas.',
    monsters: [
      { id: 'angel-perfect', name: 'Serafim Perfeito', sprite: 'humanoid', variant: 'angel', tint: 0xffe8b6, accent: 0xffffff },
      { id: 'demon-perfect', name: 'Demônio Perfeito', sprite: 'demon', variant: 'demon', tint: 0x6b2f3f, accent: 0xffc75a },
      { id: 'dragon-perfect', name: 'Dragão Perfeito', sprite: 'dragon', variant: 'dragon', tint: 0x8a6a2f, accent: 0xffe08a }
    ],
    boss: { id: 'sovereign-perfect', name: 'Soberano do Mundo Perfeito', sprite: 'humanoid', variant: 'angel', tint: 0xffe8b6, accent: 0xffd76a, visualScale: 1.7 }
  }
];

const BASE_MONSTERS: Record<string, MonsterDefinition> = {
  slime: {
    id: 'slime', name: 'Slime Verde', level: 1, maxHp: 45, attack: 7, defense: 1,
    attacksPerSecond: 0.7, experienceReward: 10, goldReward: 4, isBoss: false,
    sprite: 'slime', materialId: 'mat-clearing', dropChance: 0.3
  },
  boar: {
    id: 'boar', name: 'Javali Selvagem', level: 2, maxHp: 75, attack: 11, defense: 3,
    attacksPerSecond: 0.8, experienceReward: 16, goldReward: 6, isBoss: false,
    sprite: 'boar', tint: 0x8a5b3c, accent: 0xf2ead6, materialId: 'mat-clearing', dropChance: 0.28
  },
  wolf: {
    id: 'wolf', name: 'Lobo Cinzento', level: 3, maxHp: 60, attack: 14, defense: 2,
    attacksPerSecond: 1.1, experienceReward: 20, goldReward: 8, isBoss: false,
    sprite: 'wolf', tint: 0x778699, accent: 0xffd76a, materialId: 'mat-clearing', dropChance: 0.28
  },
  'slime-king': {
    id: 'slime-king', name: 'Rei Slime', level: 5, maxHp: 420, attack: 24, defense: 7,
    attacksPerSecond: 0.9, experienceReward: 150, goldReward: 90, isBoss: true,
    sprite: 'slime-king', trophyId: 'trophy-forest', visualScale: 1.25
  }
};

function normalStats(level: number, power: number): Pick<MonsterDefinition, 'maxHp' | 'attack' | 'defense' | 'experienceReward' | 'goldReward'> {
  const hp = Math.round((30 * Math.pow(level, 1.25) + 50) * power);
  const attack = Math.round((3.2 * Math.pow(level, 1.12) + 4) * (0.95 + power * 0.05));
  const defense = Math.round((0.8 * level + 1) * power);
  const experienceReward = Math.round((8 * Math.pow(level, 1.18) + 6) * (0.9 + power * 0.1));
  const goldReward = Math.round((3 * Math.pow(level, 1.12) + 2) * (0.9 + power * 0.1));
  return { maxHp: hp, attack, defense, experienceReward, goldReward };
}

function bossStats(level: number): Pick<MonsterDefinition, 'maxHp' | 'attack' | 'defense' | 'experienceReward' | 'goldReward'> {
  const base = normalStats(level, 1);
  return {
    maxHp: Math.round(base.maxHp * 3.2 + 120),
    attack: Math.round(base.attack * 1.35),
    defense: Math.round(base.defense * 1.3),
    experienceReward: Math.round(base.experienceReward * 8),
    goldReward: Math.round(base.goldReward * 10)
  };
}

function buildMonster(
  seed: MonsterSeed,
  level: number,
  isBoss: boolean,
  stage: StageSeed,
  power: number
): MonsterDefinition {
  const existing = BASE_MONSTERS[seed.id];
  const stats = isBoss ? bossStats(level) : normalStats(level, power);
  return {
    id: seed.id,
    name: seed.name,
    level,
    ...(existing ? {
      maxHp: existing.maxHp,
      attack: existing.attack,
      defense: existing.defense,
      experienceReward: existing.experienceReward,
      goldReward: existing.goldReward,
      attacksPerSecond: existing.attacksPerSecond
    } : { ...stats, attacksPerSecond: isBoss ? 0.78 : 0.85 + (power - 1) * 0.2 }),
    isBoss,
    sprite: seed.sprite,
    ...(seed.variant ? { variant: seed.variant } : {}),
    tint: seed.tint ?? 0x8a9a8a,
    accent: seed.accent ?? 0xf4d58d,
    visualScale: seed.visualScale ?? (isBoss ? 1.28 : 1),
    materialId: stage.farmId,
    dropChance: isBoss ? 0.8 : 0.24 + power * 0.05,
    ...(isBoss ? { trophyId: REGION_TROPHIES[stage.regionId]?.itemId } : {})
  };
}

export const MONSTERS: Record<string, MonsterDefinition> = { ...BASE_MONSTERS };

const trophies: Record<string, StageFarm> = {};
const farms: Record<string, StageFarm> = {};
export const STAGES: Record<string, StageDefinition> = {};
export const STAGE_LIST: StageDefinition[] = [];

for (const [index, seed] of STAGE_SEEDS.entries()) {
  const farm: StageFarm = {
    itemId: seed.farmId,
    name: seed.farmName,
    description: seed.farmDescription,
    rarity: 'common'
  };
  const trophy = REGION_TROPHIES[seed.regionId]!;
  farms[farm.itemId] = farm;
  trophies[trophy.itemId] = trophy;

  const normalLevels = [seed.level, seed.level + 1, seed.level + 2];
  const monsterIds = seed.monsters.map((monsterSeed, monsterIndex) => {
    const definition = buildMonster(monsterSeed, normalLevels[monsterIndex]!, false, seed, monsterIndex === 2 ? 1.12 : 1);
    MONSTERS[definition.id] = definition;
    return definition.id;
  }) as [string, string, string];
  const boss = buildMonster(seed.boss, Math.min(100, seed.level + 3), true, seed, 1);
  MONSTERS[boss.id] = boss;

  const stage: StageDefinition = {
    id: seed.id,
    name: seed.name,
    region: seed.region,
    regionId: seed.regionId,
    description: seed.description,
    recommendedLevel: seed.level,
    maxRecommendedLevel: Math.min(100, seed.level + 5),
    environment: seed.environment,
    monsterIds,
    bossId: boss.id,
    killsRequiredForBoss: 10 + Math.floor(index / 3),
    farm,
    trophy,
    order: index
  };
  STAGES[stage.id] = stage;
  STAGE_LIST.push(stage);
}

// Compatibilidade com os primeiros protótipos.
export const STAGE_ONE: StageDefinition = STAGES[DEFAULT_STAGE_ID]!;

export const MATERIAL_ITEMS: Record<string, StageFarm> = farms;
export const TROPHY_ITEMS: Record<string, StageFarm> = trophies;

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

export function getRegionStages(regionId: string): StageDefinition[] {
  return STAGE_LIST.filter((stage) => stage.regionId === regionId);
}

export function isStageUnlocked(stage: StageDefinition, level: number): boolean {
  return level + 2 >= stage.recommendedLevel;
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
    environment: StageDefinition['environment'];
    minLevel: number;
    maxLevel: number;
    stages: StageCatalogEntry[];
  }>;
}

export function stageCatalog(): StageCatalog {
  const stages: StageCatalogEntry[] = STAGE_LIST.map((stage) => ({
    ...stage,
    monsters: stage.monsterIds.map(getMonster),
    boss: getMonster(stage.bossId)
  }));
  const regions: StageCatalog['regions'] = [];
  for (const stage of stages) {
    let region = regions.find((entry) => entry.id === stage.regionId);
    if (!region) {
      region = {
        id: stage.regionId,
        name: stage.region,
        environment: stage.environment,
        minLevel: stage.recommendedLevel,
        maxLevel: stage.maxRecommendedLevel,
        stages: []
      };
      regions.push(region);
    }
    region.stages.push(stage);
    region.minLevel = Math.min(region.minLevel, stage.recommendedLevel);
    region.maxLevel = Math.max(region.maxLevel, stage.maxRecommendedLevel);
  }
  return { stages, regions };
}

export function monsterSpriteIds(): MonsterSpriteId[] {
  return [...new Set((Object.values(MONSTERS) as MonsterDefinition[]).map((monster) => monster.sprite))];
}

export function variantColor(monster: MonsterDefinition): number {
  return monster.tint ?? 0x8a9a8a;
}
