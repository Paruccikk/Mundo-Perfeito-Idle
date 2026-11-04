import type { CharacterRecord } from './types.js';

export interface InventorySnapshot {
  items: Array<{ id: string; itemId: string; name: string; description: string; rarity: string; category: string; slot: string | null; quantity: number; levelReq: number; stats: Record<string, number> }>;
  equipment: Array<{ slot: string; item: { id: string; itemId: string; name: string; description: string; rarity: string; category: string; slot: string | null; quantity: number; levelReq: number; stats: Record<string, number> } }>;
}

export interface CharacterRepository {
  create(record: CharacterRecord): Promise<void>;
  save(record: CharacterRecord, expectedLastTickAt?: string): Promise<boolean>;
  findById(id: string): Promise<CharacterRecord | null>;
  findByName(playerId: string, nameKey: string): Promise<CharacterRecord | null>;
  listByPlayer(playerId: string): Promise<CharacterRecord[]>;
  countByPlayer(playerId: string): Promise<number>;
  allocateAttributes(characterId: string, accountId: string, allocation: Record<string, number>): Promise<CharacterRecord | null>;
  getInventory(characterId: string, accountId: string): Promise<InventorySnapshot | null>;
  equipItem(characterId: string, accountId: string, inventoryItemId: string): Promise<{ error: string | null }>;
  addDrop(characterId: string, itemId: string, quantity: number, operationId: string): Promise<void>;
}

export class MemoryCharacterRepository implements CharacterRepository {
  private readonly characters = new Map<string, CharacterRecord>();
  private readonly inventory = new Map<string, InventorySnapshot['items']>();
  private readonly equipment = new Map<string, InventorySnapshot['equipment']>();

  async create(record: CharacterRecord): Promise<void> {
    this.characters.set(record.id, clone({ ...record, equipmentBonuses: {} }));
    this.equipment.set(record.id, []);
    this.inventory.set(record.id, [{
      id: `starter-${record.id}`, itemId: record.classId === 'mage' || record.classId === 'priest' ? 'apprentice-robe' : 'rusty-sword',
      name: record.classId === 'mage' || record.classId === 'priest' ? 'Manto do Aprendiz' : 'Espada Enferrujada',
      description: 'Equipamento inicial.', rarity: 'common', category: 'equipment',
      slot: record.classId === 'mage' || record.classId === 'priest' ? 'chest' : 'weapon',
      quantity: 1, levelReq: 1, stats: {}
    }, { id: `potions-${record.id}`, itemId: 'small-potion', name: 'Poção de Vida Pequena',
      description: 'Poção inicial.', rarity: 'common', category: 'consumable',
      slot: null, quantity: 3, levelReq: 1, stats: {} }]);
  }

  async save(record: CharacterRecord, expectedLastTickAt?: string): Promise<boolean> {
    const current = this.characters.get(record.id);
    if (expectedLastTickAt && current?.combat.lastTickAt !== expectedLastTickAt) return false;
    this.characters.set(record.id, clone(record));
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
    return clone(updated);
  }

  async getInventory(characterId: string, accountId: string): Promise<InventorySnapshot | null> {
    const record = this.characters.get(characterId);
    if (!record || record.playerId !== accountId) return null;
    return { items: (this.inventory.get(characterId) ?? []).map((item) => ({ ...item, stats: { ...item.stats } })), equipment: (this.equipment.get(characterId) ?? []).map((entry) => ({ ...entry, item: { ...entry.item, stats: { ...entry.item.stats } } })) };
  }

  async equipItem(characterId: string, accountId: string, inventoryItemId: string): Promise<{ error: string | null }> {
    const record = this.characters.get(characterId);
    if (!record || record.playerId !== accountId) return { error: 'not_found' };
    const items = this.inventory.get(characterId) ?? [];
    const index = items.findIndex((item) => item.id === inventoryItemId && item.slot);
    if (index < 0) return { error: 'item_not_equippable' };
    const item = items[index]!;
    if (record.level < item.levelReq) return { error: 'level_required' };
    const equipped = this.equipment.get(characterId) ?? [];
    const previous = equipped.findIndex((entry) => entry.slot === item.slot);
    if (previous >= 0) {
      const oldItem = equipped[previous]!.item;
      const returned = items.find((entry) => entry.itemId === oldItem.itemId);
      if (returned) returned.quantity += 1;
      else items.push({ ...oldItem, id: `returned-${Date.now()}`, quantity: 1 });
      equipped.splice(previous, 1);
    }
    if (item.quantity <= 1) items.splice(index, 1);
    else item.quantity -= 1;
    equipped.push({ slot: item.slot!, item: { ...item, quantity: 1 } });
    this.inventory.set(characterId, items);
    this.equipment.set(characterId, equipped);
    return { error: null };
  }

  async addDrop(characterId: string, itemId: string, quantity: number, operationId: string): Promise<void> {
    if (this.dropOperations.has(operationId)) return;
    this.dropOperations.add(operationId);
    const items = this.inventory.get(characterId) ?? [];
    const found = items.find((item) => item.itemId === itemId);
    if (found) found.quantity += quantity;
    else items.push({ id: `drop-${operationId}`, itemId, name: itemId === 'slime-gel' ? 'Geleia de Slime' : itemId === 'boar-hide' ? 'Couro de Javali' : itemId === 'wolf-pelt' ? 'Pele de Lobo' : itemId,
      description: 'Item obtido em combate.', rarity: 'common', category: 'material', slot: null,
      quantity, levelReq: 1, stats: {} });
    this.inventory.set(characterId, items);
  }

  private readonly dropOperations = new Set<string>();
}

function clone(record: CharacterRecord): CharacterRecord {
  return { ...record, attributes: { ...record.attributes }, equipmentBonuses: { ...record.equipmentBonuses }, combat: { ...record.combat } };
}

function withEquipmentBonuses(record: CharacterRecord, equipment: InventorySnapshot['equipment']): CharacterRecord {
  const bonuses: Record<string, number> = {};
  for (const entry of equipment) {
    for (const [key, value] of Object.entries(entry.item.stats)) {
      if (typeof value === 'number' && Number.isFinite(value)) bonuses[key] = (bonuses[key] ?? 0) + value;
    }
  }
  return { ...record, equipmentBonuses: bonuses };
}
