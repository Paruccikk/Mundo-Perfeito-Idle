import type { CharacterRecord, InventoryItemRecord } from './types.js';
import { itemSellPrice } from './economy.js';
import {
  DEFAULT_STAGE_ID, MATERIAL_ITEMS, TROPHY_ITEMS, getMonster, getStage, nextNormalMonster
} from './monsters.js';

const LEGACY_DROP_NAMES: Record<string, string> = {
  'slime-gel': 'Geleia de Slime',
  'boar-hide': 'Couro de Javali',
  'wolf-pelt': 'Pele de Lobo'
};

const CONSUMABLE_DROPS: Record<string, { name: string; description: string; rarity: string }> = {
  'small-potion': { name: 'Poção de Vida Pequena', description: 'Recupera 80 pontos de HP.', rarity: 'common' },
  'mp-potion': { name: 'Poção de Mana Pequena', description: 'Recupera 60 pontos de MP.', rarity: 'common' },
  'revive-potion': { name: 'Poção da Ressurreição', description: 'Ao ser derrotado, revive no mesmo local.', rarity: 'uncommon' }
};

export interface InventorySnapshot {
  gold: number;
  farmItems?: Array<{ key: string; name: string; icon: string; quantity: number; category: 'crop' | 'seed' | 'feed' | 'fish' | 'egg'; sellPrice: number }>;
  mount: { id: 'starter-horse'; name: string; rarity: 'white'; equipped: boolean };
  items: Array<{ id: string; itemId: string; name: string; description: string; rarity: string; category: string; slot: string | null; quantity: number; levelReq: number; stats: Record<string, number>; sellPrice: number }>;
  equipment: Array<{ slot: string; item: { id: string; itemId: string; name: string; description: string; rarity: string; category: string; slot: string | null; quantity: number; levelReq: number; stats: Record<string, number>; sellPrice: number } }>;
}

export interface CharacterRepository {
  create(record: CharacterRecord): Promise<void>;
  save(record: CharacterRecord, expectedLastTickAt?: string, drops?: Array<{ itemId: string; quantity: number; operationId: string }>): Promise<boolean>;
  findById(id: string): Promise<CharacterRecord | null>;
  findByName(playerId: string, nameKey: string): Promise<CharacterRecord | null>;
  listByPlayer(playerId: string): Promise<CharacterRecord[]>;
  countByPlayer(playerId: string): Promise<number>;
  allocateAttributes(characterId: string, accountId: string, allocation: Record<string, number>): Promise<CharacterRecord | null>;
  getInventory(characterId: string, accountId: string): Promise<InventorySnapshot | null>;
  equipItem(characterId: string, accountId: string, inventoryItemId: string): Promise<{ error: string | null }>;
  setMount(characterId: string, accountId: string, equipped: boolean): Promise<{ error: string | null }>;
  unequipItem(characterId: string, accountId: string, slot: string): Promise<{ error: string | null }>;
  addDrop(characterId: string, itemId: string, quantity: number, operationId: string): Promise<void>;
  useItem(characterId: string, accountId: string, inventoryItemId: string, maxHp: number, maxMp: number): Promise<{ error: string | null }>;
  sellItem(characterId: string, accountId: string, inventoryItemId: string, quantity: number): Promise<{ error: string | null; goldReceived?: number }>;
  resolveDeath(characterId: string, accountId: string, maxHp: number, maxMp: number, allowRevive: boolean): Promise<{ record: CharacterRecord | null; returnToCity: boolean }>;
  travel(characterId: string, accountId: string, stageId: string): Promise<CharacterRecord | null>;
}

export class MemoryCharacterRepository implements CharacterRepository {
  private readonly characters = new Map<string, CharacterRecord>();
  private readonly inventory = new Map<string, InventoryItemRecord[]>();
  private readonly equipment = new Map<string, Array<{ slot: string; item: InventoryItemRecord }>>();

  async create(record: CharacterRecord): Promise<void> {
    this.characters.set(record.id, clone({ ...record, equipmentBonuses: {} }));
    this.equipment.set(record.id, []);
    this.inventory.set(record.id, []);
  }

  async save(record: CharacterRecord, expectedLastTickAt?: string, drops: Array<{ itemId: string; quantity: number; operationId: string }> = []): Promise<boolean> {
    const current = this.characters.get(record.id);
    if (expectedLastTickAt && current?.combat.lastTickAt !== expectedLastTickAt) return false;
    this.characters.set(record.id, clone(record));
    for (const drop of drops) await this.addDrop(record.id, drop.itemId, drop.quantity, drop.operationId);
    return true;
  }

  async findById(id: string): Promise<CharacterRecord | null> {
    const record = this.characters.get(id);
    return record ? withEquipmentBonuses(clone(record), this.equipment.get(id) ?? []) : null;
  }

  async findByName(playerId: string, key: string): Promise<CharacterRecord | null> {
    for (const record of this.characters.values()) if (record.playerId === playerId && record.nameKey === key) return withEquipmentBonuses(clone(record), this.equipment.get(record.id) ?? []);
    return null;
  }

  async listByPlayer(playerId: string): Promise<CharacterRecord[]> {
    return [...this.characters.values()].filter((record) => record.playerId === playerId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((record) => withEquipmentBonuses(clone(record), this.equipment.get(record.id) ?? []));
  }

  async countByPlayer(playerId: string): Promise<number> {
    return [...this.characters.values()].filter((record) => record.playerId === playerId).length;
  }

  async allocateAttributes(characterId: string, accountId: string, allocation: Record<string, number>): Promise<CharacterRecord | null> {
    const record = this.characters.get(characterId);
    if (!record || record.playerId !== accountId) return null;
    const keys = ['constitution', 'strength', 'intelligence', 'dexterity'] as const;
    const total = keys.reduce((sum, key) => sum + (allocation[key] ?? 0), 0);
    if (total <= 0 || total > record.attributePoints || keys.some((key) => !Number.isInteger(allocation[key] ?? 0) || (allocation[key] ?? 0) < 0)) {
      throw new Error('invalid_attribute_allocation');
    }
    const updated = clone(record);
    for (const key of keys) updated.attributes[key] += allocation[key] ?? 0;
    updated.attributePoints -= total;
    this.characters.set(characterId, updated);
    return withEquipmentBonuses(clone(updated), this.equipment.get(characterId) ?? []);
  }

  async getInventory(characterId: string, accountId: string): Promise<InventorySnapshot | null> {
    const record = this.characters.get(characterId);
    if (!record || record.playerId !== accountId) return null;
    return { gold: record.gold, mount: { id: 'starter-horse', name: 'Cavalo Castanho', rarity: 'white', equipped: record.combat.mountId === 'starter-horse' }, items: (this.inventory.get(characterId) ?? []).map((item) => ({ ...item, slot: equipmentSlot(item), stats: { ...item.stats }, sellPrice: itemSellPrice(item) })), equipment: (this.equipment.get(characterId) ?? []).map((entry) => ({ ...entry, item: { ...entry.item, slot: equipmentSlot(entry.item), stats: { ...entry.item.stats }, sellPrice: itemSellPrice(entry.item) } })) };
  }

  async equipItem(characterId: string, accountId: string, inventoryItemId: string): Promise<{ error: string | null }> {
    const record = this.characters.get(characterId);
    if (!record || record.playerId !== accountId) return { error: 'not_found' };
    const items = this.inventory.get(characterId) ?? [];
    const index = items.findIndex((item) => item.id === inventoryItemId && equipmentSlot(item));
    if (index < 0) return { error: 'item_not_equippable' };
    const item = items[index]!;
    const slot = equipmentSlot(item)!;
    if (record.level < item.levelReq) return { error: 'level_required' };
    const equipped = this.equipment.get(characterId) ?? [];
    const previous = equipped.findIndex((entry) => entry.slot === slot);
    if (previous >= 0) {
      const oldItem = equipped[previous]!.item;
      const returned = items.find((entry) => entry.itemId === oldItem.itemId);
      if (returned) returned.quantity += 1;
      else items.push({ ...oldItem, id: `returned-${Date.now()}`, quantity: 1 });
      equipped.splice(previous, 1);
    }
    if (item.quantity <= 1) items.splice(index, 1);
    else item.quantity -= 1;
    equipped.push({ slot, item: { ...item, quantity: 1 } });
    this.inventory.set(characterId, items);
    this.equipment.set(characterId, equipped);
    return { error: null };
  }

  async setMount(characterId: string, accountId: string, equipped: boolean): Promise<{ error: string | null }> {
    const record = this.characters.get(characterId);
    if (!record || record.playerId !== accountId) return { error: 'not_found' };
    record.combat = { ...record.combat, mountId: equipped ? 'starter-horse' : null };
    this.characters.set(characterId, record);
    return { error: null };
  }

  async unequipItem(characterId: string, accountId: string, slot: string): Promise<{ error: string | null }> {
    const record = this.characters.get(characterId);
    if (!record || record.playerId !== accountId) return { error: 'not_found' };
    const equipped = this.equipment.get(characterId) ?? [];
    const index = equipped.findIndex((entry) => entry.slot === slot);
    if (index < 0) return { error: 'not_equipped' };
    const [removed] = equipped.splice(index, 1);
    const items = this.inventory.get(characterId) ?? [];
    const existing = items.find((item) => item.itemId === removed!.item.itemId);
    if (existing) existing.quantity += 1;
    else items.push({ ...removed!.item, id: `unequipped-${Date.now()}`, quantity: 1 });
    this.equipment.set(characterId, equipped);
    this.inventory.set(characterId, items);
    return { error: null };
  }

  async useItem(characterId: string, accountId: string, inventoryItemId: string, maxHp: number, maxMp: number): Promise<{ error: string | null }> {
    const record = this.characters.get(characterId);
    if (!record || record.playerId !== accountId) return { error: 'not_found' };
    const items = this.inventory.get(characterId) ?? [];
    const item = items.find((entry) => entry.id === inventoryItemId);
    if (!item || item.category !== 'consumable') return { error: 'not_usable' };
    if (record.combat.status === 'dead') return { error: 'character_dead' };
    const hpBefore = record.combat.playerHp;
    const mpBefore = record.combat.playerMp ?? maxMp;
    const hpAfter = Math.min(maxHp, hpBefore + Math.max(0, item.stats.hpRestore ?? 0));
    const mpAfter = Math.min(maxMp, mpBefore + Math.max(0, item.stats.mpRestore ?? 0));
    if (hpAfter === hpBefore && mpAfter === mpBefore) return { error: 'no_effect' };
    record.combat = { ...record.combat, playerHp: hpAfter, playerMp: mpAfter, lastTickAt: new Date().toISOString() };
    item.quantity -= 1;
    if (item.quantity <= 0) items.splice(items.indexOf(item), 1);
    this.inventory.set(characterId, items);
    this.characters.set(characterId, record);
    return { error: null };
  }

  async sellItem(characterId: string, accountId: string, inventoryItemId: string, quantity: number): Promise<{ error: string | null; goldReceived?: number }> {
    const record = this.characters.get(characterId);
    if (!record || record.playerId !== accountId) return { error: 'not_found' };
    const items = this.inventory.get(characterId) ?? [];
    const item = items.find((entry) => entry.id === inventoryItemId);
    if (!item) return { error: 'item_not_found' };
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > item.quantity) return { error: 'invalid_quantity' };
    const goldReceived = itemSellPrice(item) * quantity;
    item.quantity -= quantity;
    if (item.quantity <= 0) items.splice(items.indexOf(item), 1);
    record.gold += goldReceived;
    this.inventory.set(characterId, items);
    this.characters.set(characterId, record);
    return { error: null, goldReceived };
  }

  async resolveDeath(characterId: string, accountId: string, maxHp: number, maxMp: number, allowRevive: boolean): Promise<{ record: CharacterRecord | null; returnToCity: boolean }> {
    const record = this.characters.get(characterId);
    if (!record || record.playerId !== accountId) return { record: null, returnToCity: false };
    if (record.combat.status !== 'dead') return { record: withEquipmentBonuses(clone(record), this.equipment.get(characterId) ?? []), returnToCity: false };
    const items = this.inventory.get(characterId) ?? [];
    const revive = allowRevive ? items.find((item) => item.itemId === 'revive-potion' && item.quantity > 0) : undefined;
    if (revive) {
      revive.quantity -= 1;
      if (revive.quantity <= 0) items.splice(items.indexOf(revive), 1);
      this.inventory.set(characterId, items);
    }
    const now = new Date().toISOString();
    const stageId = allowRevive ? record.combat.stageId : DEFAULT_STAGE_ID;
    const fallbackStage = getStage(DEFAULT_STAGE_ID);
    const fallbackMonsterId = nextNormalMonster(fallbackStage, 0);
    const fallbackMonster = getMonster(fallbackMonsterId);
    record.currentStageId = stageId;
    const fallbackPack = Array.from({ length: 6 }, (_, index) => { const monsterId = fallbackStage.monsterIds[index % fallbackStage.monsterIds.length]!; const monster = getMonster(monsterId); return { slotId: `mob-${index + 1}`, monsterId, hp: monster.maxHp, respawnAt: null }; });
    record.combat = { ...record.combat, stageId, monsterId: allowRevive ? record.combat.monsterId : fallbackMonsterId, monsterHp: allowRevive ? record.combat.monsterHp : fallbackMonster.maxHp, pack: allowRevive ? record.combat.pack : fallbackPack, targetIndex: allowRevive ? record.combat.targetIndex ?? 0 : 0, playerHp: revive ? Math.max(1, Math.round(maxHp * 0.5)) : maxHp, playerMp: revive ? Math.max(0, Math.round(maxMp * 0.5)) : maxMp, status: 'fighting', recoveringUntil: null, playerCooldownSeconds: 0, monsterCooldownSeconds: 0.5, lastTickAt: now };
    this.characters.set(characterId, record);
    return { record: withEquipmentBonuses(clone(record), this.equipment.get(characterId) ?? []), returnToCity: !revive };
  }

  async travel(characterId: string, accountId: string, stageId: string): Promise<CharacterRecord | null> {
    const record = this.characters.get(characterId);
    if (!record || record.playerId !== accountId) return null;
    const stage = getStage(stageId);
    const monsterId = nextNormalMonster(stage, 0);
    const monster = getMonster(monsterId);
    record.currentStageId = stage.id;
    const pack = Array.from({ length: 6 }, (_, index) => { const id = stage.monsterIds[index % stage.monsterIds.length]!; const definition = getMonster(id); return { slotId: `mob-${index + 1}`, monsterId: id, hp: definition.maxHp, respawnAt: null }; });
    record.combat = {
      ...record.combat, stageId: stage.id, monsterId, monsterHp: monster.maxHp, pack, targetIndex: 0,
      killsInStage: 0, bossActive: false, bossDefeated: 0, status: 'fighting',
      recoveringUntil: null, playerCooldownSeconds: 0, monsterCooldownSeconds: 0.5,
      lastTickAt: new Date().toISOString()
    };
    this.characters.set(characterId, record);
    return withEquipmentBonuses(clone(record), this.equipment.get(characterId) ?? []);
  }

  async addDrop(characterId: string, itemId: string, quantity: number, operationId: string): Promise<void> {
    if (this.dropOperations.has(operationId)) return;
    this.dropOperations.add(operationId);
    const items = this.inventory.get(characterId) ?? [];
    const found = items.find((item) => item.itemId === itemId);
    if (found) found.quantity += quantity;
    else {
      const farm = MATERIAL_ITEMS[itemId] ?? TROPHY_ITEMS[itemId];
      const consumable = CONSUMABLE_DROPS[itemId];
      items.push({
        id: `drop-${operationId}`,
        itemId,
        name: farm?.name ?? consumable?.name ?? LEGACY_DROP_NAMES[itemId] ?? itemId,
        description: farm?.description ?? consumable?.description ?? 'Item obtido em combate.',
        rarity: farm?.rarity ?? consumable?.rarity ?? 'common',
        category: farm ? (TROPHY_ITEMS[itemId] ? 'trophy' : 'material') : consumable ? 'consumable' : 'material',
        slot: null,
        quantity,
        levelReq: 1,
        stats: {}
      });
    }
    this.inventory.set(characterId, items);
  }

  private readonly dropOperations = new Set<string>();
}

function clone(record: CharacterRecord): CharacterRecord {
  return { ...record, attributes: { ...record.attributes }, equipmentBonuses: { ...record.equipmentBonuses }, combat: { ...record.combat, ...(record.combat.pack ? { pack: record.combat.pack.map((entry) => ({ ...entry })) } : {}) } };
}

function withEquipmentBonuses(record: CharacterRecord, equipment: Array<{ slot: string; item: InventoryItemRecord }>): CharacterRecord {
  const bonuses: Record<string, number> = {};
  for (const entry of equipment) {
    for (const [key, value] of Object.entries(entry.item.stats)) {
      if (typeof value === 'number' && Number.isFinite(value)) bonuses[key] = (bonuses[key] ?? 0) + value;
    }
  }
  const equippedIds = new Set(equipment.map((entry) => entry.item.itemId));
  const apprenticeSet = ['apprentice-hood', 'apprentice-chest', 'apprentice-legs', 'apprentice-boots', 'apprentice-ring'];
  if (apprenticeSet.every((id) => equippedIds.has(id))) {
    bonuses.maxHp = (bonuses.maxHp ?? 0) + 30;
    bonuses.maxMp = (bonuses.maxMp ?? 0) + 15;
    bonuses.physicalDefense = (bonuses.physicalDefense ?? 0) + 2;
    bonuses.magicDefense = (bonuses.magicDefense ?? 0) + 2;
  }
  return { ...record, equipmentBonuses: bonuses };
}

function equipmentSlot(item: InventoryItemRecord): string | null {
  if (item.slot) return item.slot;
  const id = item.itemId.toLowerCase();
  if (item.category === 'weapon' || /sword|bow|staff|mace|dagger|axe/.test(id)) return 'weapon';
  if (/hood|helmet|hat|head/.test(id)) return 'head';
  if (/chest|armor|armour|robe|tunic|vest/.test(id)) return 'chest';
  if (/legs|pants|trousers/.test(id)) return 'legs';
  if (/boots|shoes/.test(id)) return 'boots';
  if (/ring|amulet|accessory/.test(id)) return 'accessory';
  return null;
}
