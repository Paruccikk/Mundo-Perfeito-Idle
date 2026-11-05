import type { CharacterRecord } from './types.js';
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
  items: Array<{ id: string; itemId: string; name: string; description: string; rarity: string; category: string; slot: string | null; quantity: number; levelReq: number; stats: Record<string, number> }>;
  equipment: Array<{ slot: string; item: { id: string; itemId: string; name: string; description: string; rarity: string; category: string; slot: string | null; quantity: number; levelReq: number; stats: Record<string, number> } }>;
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
  unequipItem(characterId: string, accountId: string, slot: string): Promise<{ error: string | null }>;
  addDrop(characterId: string, itemId: string, quantity: number, operationId: string): Promise<void>;
  useItem(characterId: string, accountId: string, inventoryItemId: string, maxHp: number, maxMp: number): Promise<{ error: string | null }>;
  resolveDeath(characterId: string, accountId: string, maxHp: number, maxMp: number, allowRevive: boolean): Promise<{ record: CharacterRecord | null; returnToCity: boolean }>;
  travel(characterId: string, accountId: string, stageId: string): Promise<CharacterRecord | null>;
}

export class MemoryCharacterRepository implements CharacterRepository {
  private readonly characters = new Map<string, CharacterRecord>();
  private readonly inventory = new Map<string, InventorySnapshot['items']>();
  private readonly equipment = new Map<string, InventorySnapshot['equipment']>();

  async create(record: CharacterRecord): Promise<void> {
    this.characters.set(record.id, clone({ ...record, equipmentBonuses: {} }));
    this.equipment.set(record.id, []);
    const weapon = record.classId === 'mage' ? 'apprentice-staff' : record.classId === 'priest' ? 'apprentice-mace' : record.classId === 'archer' ? 'training-bow' : 'training-sword';
    const weaponStats: Record<string, number> = record.classId === 'mage' ? { intelligence: 2, magicDamage: 5, maxMp: 8 }
      : record.classId === 'priest' ? { intelligence: 1, constitution: 1, magicDamage: 3, physicalDefense: 1 }
      : record.classId === 'archer' ? { dexterity: 2, physicalDamage: 4, critChance: 0.01 }
      : { strength: 2, physicalDamage: 4 };
    const gear = ([
      { id: 'starter-weapon', itemId: weapon, name: 'Arma de Aprendiz', slot: 'weapon', stats: weaponStats },
      { id: 'starter-head', itemId: 'apprentice-hood', name: 'Capuz do Aprendiz', slot: 'head', stats: { constitution: 1, magicDefense: 1 } },
      { id: 'starter-chest', itemId: 'apprentice-chest', name: 'Túnica do Aprendiz', slot: 'chest', stats: { constitution: 1, physicalDefense: 1, magicDefense: 1 } },
      { id: 'starter-legs', itemId: 'apprentice-legs', name: 'Calças do Aprendiz', slot: 'legs', stats: { constitution: 1, physicalDefense: 1 } },
      { id: 'starter-boots', itemId: 'apprentice-boots', name: 'Botas do Aprendiz', slot: 'boots', stats: { dexterity: 1 } },
      { id: 'starter-ring', itemId: 'apprentice-ring', name: 'Anel do Aprendiz', slot: 'accessory', stats: { intelligence: 1, maxMp: 5 } }
    ] as Array<{ id: string; itemId: string; name: string; slot: string; stats: Record<string, number> }>).map((item) => ({ ...item, description: 'Peça do Conjunto do Aprendiz.', rarity: 'common', category: item.slot === 'weapon' ? 'weapon' : 'armor', quantity: 1, levelReq: 1 }));
    this.inventory.set(record.id, [
      ...gear,
      { id: `potions-${record.id}`, itemId: 'small-potion', name: 'Poção de Vida Pequena', description: 'Recupera 80 pontos de HP.', rarity: 'common', category: 'consumable', slot: null, quantity: 5, levelReq: 1, stats: { hpRestore: 80 } },
      ...(record.classId === 'mage' || record.classId === 'priest' ? [{ id: `mp-potions-${record.id}`, itemId: 'mp-potion', name: 'Poção de Mana Pequena', description: 'Recupera 60 pontos de MP.', rarity: 'common', category: 'consumable', slot: null, quantity: 3, levelReq: 1, stats: { mpRestore: 60 } }] : []),
      { id: `revive-${record.id}`, itemId: 'revive-potion', name: 'Poção da Ressurreição', description: 'Ao ser derrotado, revive no mesmo local.', rarity: 'uncommon', category: 'consumable', slot: null, quantity: 1, levelReq: 1, stats: { revive: 1 } }
    ]);
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
    record.combat = { ...record.combat, stageId, monsterId: allowRevive ? record.combat.monsterId : fallbackMonsterId, monsterHp: allowRevive ? record.combat.monsterHp : fallbackMonster.maxHp, playerHp: revive ? Math.max(1, Math.round(maxHp * 0.5)) : maxHp, playerMp: revive ? Math.max(0, Math.round(maxMp * 0.5)) : maxMp, status: 'fighting', recoveringUntil: null, playerCooldownSeconds: 0, monsterCooldownSeconds: 0.5, lastTickAt: now };
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
    record.combat = {
      ...record.combat, stageId: stage.id, monsterId, monsterHp: monster.maxHp,
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
  return { ...record, attributes: { ...record.attributes }, equipmentBonuses: { ...record.equipmentBonuses }, combat: { ...record.combat } };
}

function withEquipmentBonuses(record: CharacterRecord, equipment: InventorySnapshot['equipment']): CharacterRecord {
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
