import { randomUUID } from 'node:crypto';
import {
  FARM_BUILDINGS,
  FARM_ANIMALS,
  FARM_CROPS,
  type FarmBuildingId,
  type FarmState,
  type FarmPlotState,
  type OwnedAnimal,
  type FarmEgg,
  type CropTypeId,
  type AnimalSpeciesId
} from '@mundo-perfeito/shared';

const DAILY_SEED_LIMIT = 10;
const TROUGH_CAPACITY = 30;

export function createDefaultFarm(): FarmState {
  const now = new Date().toISOString();
  return {
    buildings: [],
    plots: Array.from({ length: 6 }, (_, plotIndex) => ({
      plotIndex, cropId: null, plantedAt: null, readyAt: null, wateredAt: null
    })),
    animals: [],
    eggs: [],
    storage: {},
    seeds: { corn: 3, wheat: 3, carrot: 3 },
    dailySeedPurchases: { date: now.slice(0, 10), quantities: {} },
    animalCare: {},
    lastNeedsAt: now
  };
}

export function sanitizeFarmState(farm?: FarmState | null): FarmState {
  if (!farm || !Array.isArray(farm.plots)) return createDefaultFarm();
  const now = new Date().toISOString();
  const defaultPlots: FarmPlotState[] = Array.from({ length: 6 }, (_, index) => {
    const existing = farm.plots.find((p) => p.plotIndex === index);
    return existing
      ? {
          ...existing,
          // Plantações antigas não tinham irrigação; precisam ser regadas
          // novamente para iniciar o crescimento sob a regra nova.
          readyAt: existing.wateredAt ? existing.readyAt : null,
          wateredAt: existing.wateredAt ?? null
        }
      : { plotIndex: index, cropId: null, plantedAt: null, readyAt: null, wateredAt: null };
  });
  const today = now.slice(0, 10);
  const purchases = farm.dailySeedPurchases?.date === today
    ? farm.dailySeedPurchases
    : { date: today, quantities: {} };
  return {
    buildings: Array.isArray(farm.buildings) ? farm.buildings : [],
    plots: defaultPlots,
    animals: Array.isArray(farm.animals) ? farm.animals.map((animal) => ({
      ...animal,
      hunger: typeof animal.hunger === 'number' ? animal.hunger : 100,
      hydration: typeof animal.hydration === 'number' ? animal.hydration : 100,
      health: typeof animal.health === 'number' ? animal.health : 100,
      happiness: typeof animal.happiness === 'number' ? animal.happiness : 100,
      ageDays: typeof animal.ageDays === 'number' ? animal.ageDays : 0,
      pregnantUntil: animal.pregnantUntil ?? null,
      fatherTier: animal.fatherTier ?? null
    })) : [],
    eggs: Array.isArray(farm.eggs) ? farm.eggs : [],
    storage: farm.storage && typeof farm.storage === 'object' ? farm.storage : {},
    seeds: farm.seeds ?? { corn: 3, wheat: 3, carrot: 3 },
    dailySeedPurchases: purchases,
    animalCare: farm.animalCare ?? {},
    lastNeedsAt: farm.lastNeedsAt ?? now
  };
}

export interface FarmOperationResult {
  ok: boolean;
  error?: string;
  farm: FarmState;
  gold: number;
  message?: string;
}

function fail(farm: FarmState, gold: number, error: string): FarmOperationResult {
  return { ok: false, error, farm, gold };
}

export function processBuyBuilding(currentFarm: FarmState, currentGold: number, buildingId: FarmBuildingId): FarmOperationResult {
  const farm = sanitizeFarmState(currentFarm);
  const def = FARM_BUILDINGS[buildingId];
  if (!def) return fail(farm, currentGold, 'Construção desconhecida.');
  if (farm.buildings.includes(buildingId)) return fail(farm, currentGold, `Você já construiu o ${def.name}.`);
  if (currentGold < def.cost) return fail(farm, currentGold, `Ouro insuficiente para construir ${def.name}. Requer ${def.cost} ouro.`);
  return {
    ok: true,
    farm: { ...farm, buildings: [...farm.buildings, buildingId],
      animalCare: { ...farm.animalCare, [buildingId]: { feed: 0, water: 0 } } },
    gold: currentGold - def.cost,
    message: `${def.name} construído! A instalação já possui espaço para comedouro e bebedouro.`
  };
}

export function processBuyAnimal(currentFarm: FarmState, currentGold: number, animalId: string, customName?: string): FarmOperationResult {
  const farm = sanitizeFarmState(currentFarm);
  const def = FARM_ANIMALS[animalId];
  if (!def) return fail(farm, currentGold, 'Animal não encontrado no catálogo.');
  if (!farm.buildings.includes(def.requiredBuilding)) return fail(farm, currentGold, `Você precisa construir o ${def.requiredBuildingName} antes de comprar este animal.`);
  const buildingDef = FARM_BUILDINGS[def.requiredBuilding];
  const currentInBuilding = farm.animals.filter((a) => a.buildingId === def.requiredBuilding);
  if (currentInBuilding.length >= buildingDef.capacity) return fail(farm, currentGold, `${def.requiredBuildingName} está lotado! Capacidade máxima: ${buildingDef.capacity} animais.`);
  if (currentGold < def.cost) return fail(farm, currentGold, `Ouro insuficiente. ${def.name} custa ${def.cost} ouro.`);
  const newAnimal: OwnedAnimal = {
    id: `animal-${randomUUID().slice(0, 8)}`, definitionId: def.id,
    name: customName?.trim() || def.name, species: def.species, gender: def.gender,
    tier: def.tier, buildingId: def.requiredBuilding, acquiredAt: new Date().toISOString(),
    hunger: 100, hydration: 100, health: 100, happiness: 100, ageDays: 0
  };
  return {
    ok: true, farm: { ...farm, animals: [...farm.animals, newAnimal] },
    gold: currentGold - def.cost,
    message: `${def.name} adquirido(a) e alojado(a) no ${def.requiredBuildingName}!`
  };
}

export function processBuySeeds(currentFarm: FarmState, currentGold: number, cropId: CropTypeId, quantity: number): FarmOperationResult {
  const farm = sanitizeFarmState(currentFarm);
  const crop = FARM_CROPS[cropId];
  if (!crop) return fail(farm, currentGold, 'Semente desconhecida.');
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > DAILY_SEED_LIMIT) return fail(farm, currentGold, 'Compre entre 1 e 10 sementes por vez.');
  const purchasedToday = farm.dailySeedPurchases?.quantities[cropId] ?? 0;
  const remaining = DAILY_SEED_LIMIT - purchasedToday;
  if (quantity > remaining) return fail(farm, currentGold, `Limite diário atingido. Você ainda pode comprar ${remaining} semente(s) de ${crop.name} hoje.`);
  const cost = crop.cost * quantity;
  if (currentGold < cost) return fail(farm, currentGold, `Ouro insuficiente. O pacote custa ${cost} ouro.`);
  return {
    ok: true,
    farm: {
      ...farm,
      seeds: { ...farm.seeds, [cropId]: (farm.seeds?.[cropId] ?? 0) + quantity },
      dailySeedPurchases: {
        date: new Date().toISOString().slice(0, 10),
        quantities: { ...farm.dailySeedPurchases?.quantities, [cropId]: purchasedToday + quantity }
      }
    },
    gold: currentGold - cost,
    message: `Você comprou ${quantity} semente(s) de ${crop.name}. Limite diário: ${purchasedToday + quantity}/${DAILY_SEED_LIMIT}.`
  };
}

export function processPlantCrop(currentFarm: FarmState, currentGold: number, plotIndex: number, cropId: CropTypeId): FarmOperationResult {
  const farm = sanitizeFarmState(currentFarm);
  const crop = FARM_CROPS[cropId];
  if (!crop) return fail(farm, currentGold, 'Cultura de semente inválida.');
  if (plotIndex < 0 || plotIndex >= farm.plots.length) return fail(farm, currentGold, 'Canteiro inválido.');
  const plot = farm.plots[plotIndex];
  if (!plot) return fail(farm, currentGold, 'Canteiro não encontrado.');
  if (plot.cropId) return fail(farm, currentGold, 'Este canteiro já possui uma cultura plantada.');
  const available = farm.seeds?.[cropId] ?? 0;
  if (available < 1) return fail(farm, currentGold, `Você não possui sementes de ${crop.name}. Compre no NPC ou consiga sementes pela colheita.`);
  const plots = farm.plots.map((p) => p.plotIndex === plotIndex
    ? { ...p, cropId, plantedAt: new Date().toISOString(), readyAt: null, wateredAt: null }
    : p);
  return {
    ok: true,
    farm: { ...farm, plots, seeds: { ...farm.seeds, [cropId]: available - 1 } },
    gold: currentGold,
    message: `${crop.name} plantado! Agora regue o canteiro para iniciar o crescimento.`
  };
}

export function processWaterCrop(currentFarm: FarmState, currentGold: number, plotIndex: number): FarmOperationResult {
  const farm = sanitizeFarmState(currentFarm);
  const plot = farm.plots.find((p) => p.plotIndex === plotIndex);
  if (!plot || !plot.cropId) return fail(farm, currentGold, 'Não existe plantação neste canteiro.');
  if (plot.readyAt) return fail(farm, currentGold, 'Este canteiro já foi regado e está crescendo.');
  const crop = FARM_CROPS[plot.cropId];
  const now = Date.now();
  const plots = farm.plots.map((p) => p.plotIndex === plotIndex
    ? { ...p, wateredAt: new Date(now).toISOString(), readyAt: new Date(now + crop.growthSeconds * 1000).toISOString() }
    : p);
  return {
    ok: true, farm: { ...farm, plots }, gold: currentGold,
    message: `${crop.name} regado! Crescimento iniciado por ${crop.growthSeconds} segundos.`
  };
}

export function processHarvestCrop(currentFarm: FarmState, currentGold: number, plotIndex: number): FarmOperationResult {
  const farm = sanitizeFarmState(currentFarm);
  const plot = farm.plots.find((p) => p.plotIndex === plotIndex);
  if (!plot || !plot.cropId || !plot.readyAt) return fail(farm, currentGold, 'Regue a plantação e aguarde o crescimento antes de colher.');
  const readyTime = Date.parse(plot.readyAt);
  const now = Date.now();
  if (now < readyTime) return fail(farm, currentGold, `A plantação ainda está crescendo! Aguarde ${Math.ceil((readyTime - now) / 1000)}s.`);
  const crop = FARM_CROPS[plot.cropId];
  const yieldCount = Math.floor(Math.random() * (crop.yieldMax - crop.yieldMin + 1)) + crop.yieldMin;
  const cropKey = `crop-${plot.cropId}`;
  const plots = farm.plots.map((p) => p.plotIndex === plotIndex
    ? { ...p, cropId: null, plantedAt: null, readyAt: null, wateredAt: null }
    : p);
  return {
    ok: true,
    farm: {
      ...farm, plots,
      seeds: { ...farm.seeds, [plot.cropId]: (farm.seeds?.[plot.cropId] ?? 0) + 2 },
      storage: { ...farm.storage, [cropKey]: (farm.storage[cropKey] ?? 0) + yieldCount }
    },
    gold: currentGold + 1000,
    message: `Colheita concluída! +1.000 ouro, +2 sementes e +${yieldCount} ${crop.name} no armazém.`
  };
}

const FEED_RECIPES: Record<AnimalSpeciesId, { inputs: Partial<Record<CropTypeId, number>>; label: string }> = {
  chicken: { inputs: { corn: 2, wheat: 1 }, label: 'Ração para aves' },
  cow: { inputs: { wheat: 2, corn: 1 }, label: 'Ração para bovinos' },
  horse: { inputs: { corn: 1, carrot: 2 }, label: 'Ração para equinos' }
};

export function processCraftFeed(currentFarm: FarmState, currentGold: number, species: AnimalSpeciesId, quantity: number): FarmOperationResult {
  const farm = sanitizeFarmState(currentFarm);
  const recipe = FEED_RECIPES[species];
  if (!recipe || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) return fail(farm, currentGold, 'Quantidade de ração inválida (1 a 20).');
  const inputs = Object.entries(recipe.inputs) as Array<[CropTypeId, number]>;
  for (const [cropId, amount] of inputs) {
    const required = amount * quantity;
    const available = farm.storage[`crop-${cropId}`] ?? 0;
    if (available < required) return fail(farm, currentGold, `Colheita insuficiente: são necessárias ${required} unidades de ${FARM_CROPS[cropId].name}.`);
  }
  const storage = { ...farm.storage };
  for (const [cropId, amount] of inputs) storage[`crop-${cropId}`] = (storage[`crop-${cropId}`] ?? 0) - amount * quantity;
  storage[`feed-${species}`] = (storage[`feed-${species}`] ?? 0) + quantity;
  return {
    ok: true, farm: { ...farm, storage }, gold: currentGold,
    message: `${quantity} unidade(s) de ${recipe.label} preparada(s) com suas colheitas.`
  };
}

export function processFillTrough(currentFarm: FarmState, currentGold: number, buildingId: FarmBuildingId, kind: 'feed' | 'water', quantity: number): FarmOperationResult {
  const farm = sanitizeFarmState(currentFarm);
  if (!farm.buildings.includes(buildingId)) return fail(farm, currentGold, 'Construa esta instalação antes de abastecer o comedouro ou bebedouro.');
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > TROUGH_CAPACITY) return fail(farm, currentGold, 'Informe uma quantidade entre 1 e 30 unidades.');
  const building = FARM_BUILDINGS[buildingId];
  const species = building.allowedSpecies[0]!;
  const care = farm.animalCare?.[buildingId] ?? { feed: 0, water: 0 };
  const current = care[kind];
  const accepted = Math.min(quantity, TROUGH_CAPACITY - current);
  if (accepted <= 0) return fail(farm, currentGold, `O ${kind === 'feed' ? 'comedouro' : 'bebedouro'} já está cheio.`);
  const storage = { ...farm.storage };
  if (kind === 'feed') {
    const key = `feed-${species}`;
    if ((storage[key] ?? 0) < accepted) return fail(farm, currentGold, `Você não possui ração suficiente. Prepare ${species === 'chicken' ? 'ração para aves' : species === 'cow' ? 'ração para bovinos' : 'ração para equinos'} com suas colheitas.`);
    storage[key] = (storage[key] ?? 0) - accepted;
  }
  const nextCare = { ...care, [kind]: current + accepted };
  return {
    ok: true,
    farm: { ...farm, storage, animalCare: { ...farm.animalCare, [buildingId]: nextCare } },
    gold: currentGold,
    message: `${accepted} unidade(s) adicionada(s) ao ${kind === 'feed' ? 'comedouro' : 'bebedouro'} do ${building.name}.`
  };
}

/** Consumo de ração/água é calculado pelo relógio do servidor, inclusive no retorno do jogador. */
export function processFarmCycles(currentFarm: FarmState): FarmState {
  const farm = sanitizeFarmState(currentFarm);
  const now = Date.now();
  const last = Date.parse(farm.lastNeedsAt ?? new Date(now).toISOString());
  const elapsedHours = Math.min(24 * 7, Math.floor(Math.max(0, now - last) / 3_600_000));
  let animals = farm.animals;
  let care = { ...farm.animalCare };

  if (elapsedHours > 0 && farm.animals.length > 0) {
    const feedRemaining: Record<string, number> = {};
    const waterRemaining: Record<string, number> = {};
    for (const buildingId of farm.buildings) {
      const trough = care[buildingId] ?? { feed: 0, water: 0 };
      feedRemaining[buildingId] = trough.feed;
      waterRemaining[buildingId] = trough.water;
    }

    animals = farm.animals.map((animal) => {
      let hunger = animal.hunger ?? 100;
      let hydration = animal.hydration ?? 100;
      for (let hour = 0; hour < elapsedHours; hour += 1) {
        if ((feedRemaining[animal.buildingId] ?? 0) > 0) {
          feedRemaining[animal.buildingId] = (feedRemaining[animal.buildingId] ?? 0) - 1;
          hunger = Math.min(100, hunger + 10);
        } else {
          hunger = Math.max(0, hunger - 10);
        }
        if ((waterRemaining[animal.buildingId] ?? 0) > 0) {
          waterRemaining[animal.buildingId] = (waterRemaining[animal.buildingId] ?? 0) - 1;
          hydration = Math.min(100, hydration + 10);
        } else {
          hydration = Math.max(0, hydration - 10);
        }
      }
      return { ...animal, hunger, hydration };
    });

    for (const buildingId of farm.buildings) {
      care[buildingId] = {
        feed: feedRemaining[buildingId] ?? 0,
        water: waterRemaining[buildingId] ?? 0
      };
    }
  }

  let eggs: FarmEgg[] = [...(farm.eggs ?? [])];
  if (elapsedHours > 0 && animals.length > 0) {
    const simulationStart = Number.isFinite(last) ? last : now - elapsedHours * 3_600_000;
    animals = animals.map((animal) => {
      const hunger = animal.hunger ?? 100;
      const hydration = animal.hydration ?? 100;
      const needsOk = hunger >= 65 && hydration >= 65;
      const health = Math.max(0, Math.min(100, (animal.health ?? 100) + (needsOk ? 0.5 * elapsedHours : -2 * elapsedHours)));
      const happiness = Math.max(0, Math.min(100, (animal.happiness ?? 100) + (needsOk ? 1 * elapsedHours : -3 * elapsedHours)));
      return { ...animal, health, happiness, ageDays: (animal.ageDays ?? 0) + elapsedHours / 24 };
    });

    for (let hour = 1; hour <= elapsedHours; hour += 1) {
      const hourAt = simulationStart + hour * 3_600_000;
      const dayChanged = Math.floor(hourAt / 86_400_000) !== Math.floor((hourAt - 3_600_000) / 86_400_000);
      if (!dayChanged) continue;
      const males = animals.filter((animal) => animal.gender === 'male');
      for (const female of animals.filter((animal) => animal.gender === 'female' && animal.species !== 'chicken')) {
        if ((female.ageDays ?? 0) < 7 || (female.health ?? 100) < 65 || (female.happiness ?? 100) < 65 || female.pregnantUntil) continue;
        const male = males.find((candidate) => candidate.species === female.species && candidate.buildingId === female.buildingId && (candidate.ageDays ?? 0) >= 7 && (candidate.health ?? 100) >= 65);
        if (male && Math.random() < 0.12) {
          const gestationHours = female.species === 'cow' ? 48 : 72;
          female.pregnantUntil = new Date(hourAt + gestationHours * 3_600_000).toISOString();
          female.fatherTier = male.tier;
        }
      }
    }

    for (const hen of animals.filter((animal) => animal.species === 'chicken' && animal.gender === 'female' && (animal.ageDays ?? 0) >= 1)) {
      let lastEggAt = eggs.filter((egg) => egg.motherId === hen.id).reduce((latest, egg) => Math.max(latest, Date.parse(egg.laidAt)), 0);
      for (let hour = 1; hour <= elapsedHours; hour += 1) {
        const laidAt = simulationStart + hour * 3_600_000;
        if (laidAt - lastEggAt < 4 * 3_600_000) continue;
        const rooster = animals.find((animal) => animal.species === 'chicken' && animal.gender === 'male' && animal.buildingId === hen.buildingId && (animal.ageDays ?? 0) >= 1 && (animal.health ?? 100) >= 50);
        const fertilized = Boolean(rooster) && Math.random() < 0.45;
        eggs.push({
          id: 'egg-' + randomUUID().slice(0, 10), motherId: hen.id,
          laidAt: new Date(laidAt).toISOString(), fertilized,
          hatchAt: fertilized ? new Date(laidAt + 24 * 3_600_000).toISOString() : null,
          tier: hen.tier, fatherTier: fertilized ? rooster?.tier ?? null : null
        });
        lastEggAt = laidAt;
      }
    }
  }

  const rankUp: Partial<Record<OwnedAnimal['tier'], { tier: OwnedAnimal['tier']; chance: number }>> = {
    white: { tier: 'green', chance: 0.08 }, green: { tier: 'blue', chance: 0.05 },
    blue: { tier: 'orange', chance: 0.02 }, orange: { tier: 'red', chance: 0.005 }
  };
  const improveTier = (maternal: OwnedAnimal['tier'], paternal?: OwnedAnimal['tier'] | null): OwnedAnimal['tier'] => {
    const order: OwnedAnimal['tier'][] = ['white', 'green', 'blue', 'orange', 'red'];
    const base = order.indexOf(maternal) >= order.indexOf(paternal ?? maternal) ? maternal : (paternal ?? maternal);
    const upgrade = rankUp[base];
    return upgrade && Math.random() < upgrade.chance ? upgrade.tier : base;
  };
  const remainingEggs: FarmEgg[] = [];
  for (const egg of eggs) {
    if (!egg.fertilized || !egg.hatchAt || Date.parse(egg.hatchAt) > now) {
      remainingEggs.push(egg);
      continue;
    }
    if (animals.filter((animal) => animal.buildingId === 'coop').length >= FARM_BUILDINGS.coop.capacity) {
      remainingEggs.push(egg);
      continue;
    }
    const tier = improveTier(egg.tier, egg.fatherTier);
    const gender = Math.random() < 0.5 ? 'female' : 'male';
    animals.push({
      id: 'animal-' + randomUUID().slice(0, 8), definitionId: gender === 'female' ? 'chicken-female' : 'chicken-male',
      name: gender === 'female' ? 'Pintinha' : 'Pintinho', species: 'chicken', gender, tier,
      buildingId: 'coop', acquiredAt: new Date(now).toISOString(),
      hunger: 100, hydration: 100, health: 100, happiness: 100, ageDays: 0
    });
  }

  for (const mother of [...animals].filter((animal) => animal.gender === 'female' && animal.species !== 'chicken' && animal.pregnantUntil && Date.parse(animal.pregnantUntil) <= now)) {
    const capacity = FARM_BUILDINGS[mother.buildingId].capacity;
    if (animals.filter((animal) => animal.buildingId === mother.buildingId).length >= capacity) continue;
    const gender = Math.random() < 0.5 ? 'female' : 'male';
    const tier = improveTier(mother.tier, mother.fatherTier);
    animals.push({
      id: 'animal-' + randomUUID().slice(0, 8),
      definitionId: mother.species + '-' + (gender === 'female' ? 'female' : 'male'),
      name: mother.species === 'cow' ? 'Bezerro' : 'Potro', species: mother.species,
      gender, tier, buildingId: mother.buildingId, acquiredAt: new Date(now).toISOString(),
      hunger: 100, hydration: 100, health: 100, happiness: 100, ageDays: 0
    });
    mother.pregnantUntil = null;
    mother.fatherTier = null;
  }

  const farmAfterNeeds: FarmState = { ...farm, animals, eggs: remainingEggs, animalCare: care };
  // Se uma plantação madura ficar esquecida por 60 segundos, animais compatíveis
  // podem consumi-la. A colheita não gera fruto nem sementes nesse caso.
  const diets: Record<CropTypeId, AnimalSpeciesId[]> = {
    corn: ['chicken', 'cow'], wheat: ['chicken', 'cow', 'horse'], carrot: ['horse']
  };
  const plots = farmAfterNeeds.plots.map((plot) => {
    if (!plot.cropId || !plot.readyAt || now - Date.parse(plot.readyAt) < 60_000) return plot;
    const eater = farmAfterNeeds.animals.some((animal) => diets[plot.cropId!].includes(animal.species));
    return eater ? { ...plot, cropId: null, plantedAt: null, readyAt: null, wateredAt: null } : plot;
  });
  const lastNeedsAt = elapsedHours > 0
    ? new Date(last + elapsedHours * 3_600_000).toISOString()
    : farm.lastNeedsAt;
  return { ...farmAfterNeeds, plots, lastNeedsAt };
}
