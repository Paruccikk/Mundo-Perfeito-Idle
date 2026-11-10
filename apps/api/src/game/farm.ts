import { randomUUID } from 'node:crypto';
import {
  FARM_BUILDINGS,
  FARM_ANIMALS,
  FARM_CROPS,
  type FarmBuildingId,
  type FarmState,
  type FarmPlotState,
  type OwnedAnimal,
  type CropTypeId
} from '@mundo-perfeito/shared';

export function createDefaultFarm(): FarmState {
  const now = Date.now();
  return {
    buildings: [],
    plots: [
      {
        plotIndex: 0,
        cropId: 'corn',
        plantedAt: new Date(now - 35_000).toISOString(),
        readyAt: new Date(now - 5_000).toISOString()
      },
      {
        plotIndex: 1,
        cropId: 'wheat',
        plantedAt: new Date(now - 10_000).toISOString(),
        readyAt: new Date(now + 35_000).toISOString()
      },
      { plotIndex: 2, cropId: null, plantedAt: null, readyAt: null },
      { plotIndex: 3, cropId: null, plantedAt: null, readyAt: null },
      { plotIndex: 4, cropId: null, plantedAt: null, readyAt: null },
      { plotIndex: 5, cropId: null, plantedAt: null, readyAt: null }
    ],
    animals: [],
    storage: {}
  };
}

export function sanitizeFarmState(farm?: FarmState | null): FarmState {
  if (!farm || !Array.isArray(farm.plots)) {
    return createDefaultFarm();
  }
  const defaultPlots: FarmPlotState[] = Array.from({ length: 6 }, (_, index) => {
    const existing = farm.plots.find((p) => p.plotIndex === index);
    if (existing) return existing;
    return { plotIndex: index, cropId: null, plantedAt: null, readyAt: null };
  });

  return {
    buildings: Array.isArray(farm.buildings) ? farm.buildings : [],
    plots: defaultPlots,
    animals: Array.isArray(farm.animals) ? farm.animals : [],
    storage: farm.storage && typeof farm.storage === 'object' ? farm.storage : {}
  };
}

export interface FarmOperationResult {
  ok: boolean;
  error?: string;
  farm: FarmState;
  gold: number;
  message?: string;
}

export function processBuyBuilding(
  currentFarm: FarmState,
  currentGold: number,
  buildingId: FarmBuildingId
): FarmOperationResult {
  const farm = sanitizeFarmState(currentFarm);
  const def = FARM_BUILDINGS[buildingId];
  if (!def) {
    return { ok: false, error: 'Construção desconhecida.', farm, gold: currentGold };
  }
  if (farm.buildings.includes(buildingId)) {
    return { ok: false, error: `Você já construiu o ${def.name}.`, farm, gold: currentGold };
  }
  if (currentGold < def.cost) {
    return {
      ok: false,
      error: `Ouro insuficiente para construir ${def.name}. Requer ${def.cost} ouro.`,
      farm,
      gold: currentGold
    };
  }

  const updatedFarm: FarmState = {
    ...farm,
    buildings: [...farm.buildings, buildingId]
  };

  return {
    ok: true,
    farm: updatedFarm,
    gold: currentGold - def.cost,
    message: `${def.name} construído com sucesso na fazenda!`
  };
}

export function processBuyAnimal(
  currentFarm: FarmState,
  currentGold: number,
  animalId: string,
  customName?: string
): FarmOperationResult {
  const farm = sanitizeFarmState(currentFarm);
  const def = FARM_ANIMALS[animalId];
  if (!def) {
    return { ok: false, error: 'Animal não encontrado no catálogo.', farm, gold: currentGold };
  }

  if (!farm.buildings.includes(def.requiredBuilding)) {
    return {
      ok: false,
      error: `Você precisa comprar a casa do animal (${def.requiredBuildingName}) antes de criar um(a) ${def.name}.`,
      farm,
      gold: currentGold
    };
  }

  const buildingDef = FARM_BUILDINGS[def.requiredBuilding];
  const currentInBuilding = farm.animals.filter((a) => a.buildingId === def.requiredBuilding);
  if (currentInBuilding.length >= buildingDef.capacity) {
    return {
      ok: false,
      error: `O ${def.requiredBuildingName} está lotado! Capacidade máxima atingida (${buildingDef.capacity} animais).`,
      farm,
      gold: currentGold
    };
  }

  if (currentGold < def.cost) {
    return {
      ok: false,
      error: `Ouro insuficiente. ${def.name} custa ${def.cost} ouro.`,
      farm,
      gold: currentGold
    };
  }

  const newAnimal: OwnedAnimal = {
    id: `animal-${randomUUID().slice(0, 8)}`,
    definitionId: def.id,
    name: customName?.trim() || def.name,
    species: def.species,
    gender: def.gender,
    tier: def.tier,
    buildingId: def.requiredBuilding,
    acquiredAt: new Date().toISOString()
  };

  const updatedFarm: FarmState = {
    ...farm,
    animals: [...farm.animals, newAnimal]
  };

  const genderLabel = def.gender === 'male' ? 'Macho' : 'Fêmea';
  return {
    ok: true,
    farm: updatedFarm,
    gold: currentGold - def.cost,
    message: `${def.name} (${genderLabel}) adquirido(a) e alojado(a) no ${def.requiredBuildingName}!`
  };
}

export function processPlantCrop(
  currentFarm: FarmState,
  currentGold: number,
  plotIndex: number,
  cropId: CropTypeId
): FarmOperationResult {
  const farm = sanitizeFarmState(currentFarm);
  const crop = FARM_CROPS[cropId];
  if (!crop) {
    return { ok: false, error: 'Cultura de semente inválida.', farm, gold: currentGold };
  }
  if (plotIndex < 0 || plotIndex >= farm.plots.length) {
    return { ok: false, error: 'Canteiro inválido.', farm, gold: currentGold };
  }
  const plot = farm.plots[plotIndex];
  if (!plot) {
    return { ok: false, error: 'Canteiro não encontrado.', farm, gold: currentGold };
  }

  if (plot.cropId) {
    return { ok: false, error: 'Este canteiro já possui uma cultura plantada.', farm, gold: currentGold };
  }

  if (currentGold < crop.cost) {
    return {
      ok: false,
      error: `Ouro insuficiente. A semente de ${crop.name} custa ${crop.cost} ouro.`,
      farm,
      gold: currentGold
    };
  }

  const now = Date.now();
  const readyAt = now + crop.growthSeconds * 1000;

  const newPlots = farm.plots.map((p) => {
    if (p.plotIndex !== plotIndex) return p;
    return {
      plotIndex,
      cropId,
      plantedAt: new Date(now).toISOString(),
      readyAt: new Date(readyAt).toISOString()
    };
  });

  const updatedFarm: FarmState = {
    ...farm,
    plots: newPlots
  };

  return {
    ok: true,
    farm: updatedFarm,
    gold: currentGold - crop.cost,
    message: `${crop.name} plantado! Colheita pronta em ${crop.growthSeconds} segundos.`
  };
}

export function processHarvestCrop(
  currentFarm: FarmState,
  currentGold: number,
  plotIndex: number
): FarmOperationResult {
  const farm = sanitizeFarmState(currentFarm);
  if (plotIndex < 0 || plotIndex >= farm.plots.length) {
    return { ok: false, error: 'Canteiro inválido.', farm, gold: currentGold };
  }
  const plot = farm.plots[plotIndex];
  if (!plot || !plot.cropId || !plot.readyAt) {
    return { ok: false, error: 'Não há nada para colher neste canteiro.', farm, gold: currentGold };
  }

  const readyTime = new Date(plot.readyAt).getTime();
  const now = Date.now();
  if (now < readyTime) {
    const remainingSeconds = Math.ceil((readyTime - now) / 1000);
    return {
      ok: false,
      error: `A plantação ainda está crescendo! Aguarde ${remainingSeconds}s.`,
      farm,
      gold: currentGold
    };
  }

  const crop = FARM_CROPS[plot.cropId];
  const yieldCount = crop
    ? Math.floor(Math.random() * (crop.yieldMax - crop.yieldMin + 1)) + crop.yieldMin
    : 2;

  const storageKey = `crop-${plot.cropId}`;
  const currentCount = farm.storage[storageKey] ?? 0;

  const newPlots = farm.plots.map((p) => {
    if (p.plotIndex !== plotIndex) return p;
    return {
      plotIndex,
      cropId: null,
      plantedAt: null,
      readyAt: null
    };
  });

  const updatedFarm: FarmState = {
    ...farm,
    plots: newPlots,
    storage: {
      ...farm.storage,
      [storageKey]: currentCount + yieldCount
    }
  };

  return {
    ok: true,
    farm: updatedFarm,
    gold: currentGold,
    message: `Colheita concluída! +${yieldCount}x ${crop?.name ?? 'colheita'} adicionado ao celeiro da fazenda.`
  };
}
