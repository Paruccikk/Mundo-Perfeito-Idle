import type { InventoryItemRecord } from './types.js';

const RARITY_MULTIPLIER: Record<string, number> = {
  common: 1,
  uncommon: 1.5,
  rare: 2.5,
  epic: 4,
  legendary: 7,
  mythic: 12
};

export function itemSellPrice(item: Pick<InventoryItemRecord, 'category' | 'rarity' | 'levelReq' | 'stats'>): number {
  const categoryBase: Record<string, number> = {
    weapon: 14,
    armor: 12,
    consumable: 4,
    material: 3,
    trophy: 25
  };
  const statValue = Object.values(item.stats ?? {}).reduce(
    (total, value) => total + (Number.isFinite(value) && value > 0 ? value : 0),
    0
  );
  const base = (categoryBase[item.category] ?? 2) + Math.max(0, item.levelReq - 1) * 2 + Math.floor(statValue * 2);
  return Math.max(1, Math.round(base * (RARITY_MULTIPLIER[item.rarity] ?? 1)));
}
