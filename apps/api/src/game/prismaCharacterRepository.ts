import { Prisma, PrismaClient } from '@prisma/client';
import type { CharacterRepository } from './characterRepository.js';
import type { CharacterRecord } from './types.js';

type DbCharacter = {
  id: string; accountId: string; name: string; nameKey: string; classId: string;
  title: string | null; guildName: string | null; level: number;
  experience: bigint; gold: bigint; constitution: number; strength: number;
  intelligence: number; dexterity: number; attributePoints: number;
  currentStageId: string; combat: Prisma.JsonValue; createdAt: Date;
  equipment?: Array<{ item: { stats: Prisma.JsonValue | null } }>;
};

export class PrismaCharacterRepository implements CharacterRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(record: CharacterRecord): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.account.upsert({ where: { id: record.playerId }, update: {}, create: { id: record.playerId } });
      await tx.character.create({
        data: {
          id: record.id, accountId: record.playerId, name: record.name, nameKey: record.nameKey,
          classId: record.classId, title: record.title, guildName: record.guildName,
          level: record.level, experience: BigInt(record.experience), gold: BigInt(record.gold),
          constitution: record.attributes.constitution, strength: record.attributes.strength,
          intelligence: record.attributes.intelligence, dexterity: record.attributes.dexterity,
          attributePoints: record.attributePoints, currentStageId: record.currentStageId,
          combat: record.combat as unknown as Prisma.InputJsonValue,
          lastSimulatedAt: new Date(record.combat.lastTickAt), createdAt: new Date(record.createdAt)
        }
      });
      const starter = record.classId === 'mage' || record.classId === 'priest' ? 'apprentice-robe' : 'rusty-sword';
      await tx.inventoryItem.create({ data: { characterId: record.id, itemId: starter, quantity: 1 } });
      await tx.inventoryItem.create({ data: { characterId: record.id, itemId: 'small-potion', quantity: 3 } });
    });
  }

  async save(record: CharacterRecord, expectedLastTickAt?: string): Promise<boolean> {
    const data = {
      level: record.level, experience: BigInt(record.experience), gold: BigInt(record.gold),
      title: record.title, guildName: record.guildName,
      constitution: record.attributes.constitution, strength: record.attributes.strength,
      intelligence: record.attributes.intelligence, dexterity: record.attributes.dexterity,
      attributePoints: record.attributePoints, currentStageId: record.currentStageId,
      combat: record.combat as unknown as Prisma.InputJsonValue,
      lastSimulatedAt: new Date(record.combat.lastTickAt)
    };
    if (expectedLastTickAt) {
      const result = await this.prisma.character.updateMany({
        where: { id: record.id, lastSimulatedAt: new Date(expectedLastTickAt) }, data
      });
      return result.count === 1;
    }
    await this.prisma.character.update({ where: { id: record.id }, data });
    return true;
  }

  async findById(id: string): Promise<CharacterRecord | null> {
    const row = await this.prisma.character.findUnique({ where: { id }, include: { equipment: { include: { item: true } } } });
    return row ? fromDb(row) : null;
  }

  async findByName(playerId: string, key: string): Promise<CharacterRecord | null> {
    const row = await this.prisma.character.findFirst({ where: { accountId: playerId, nameKey: key } });
    return row ? fromDb(row) : null;
  }

  async listByPlayer(playerId: string): Promise<CharacterRecord[]> {
    const rows = await this.prisma.character.findMany({ where: { accountId: playerId }, include: { equipment: { include: { item: true } } }, orderBy: { createdAt: 'asc' } });
    return rows.map(fromDb);
  }

  countByPlayer(playerId: string): Promise<number> {
    return this.prisma.character.count({ where: { accountId: playerId } });
  }

  async allocateAttributes(characterId: string, accountId: string, allocation: Record<string, number>): Promise<CharacterRecord | null> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.character.findFirst({ where: { id: characterId, accountId } });
      if (!row) return null;
      const allowed = ['constitution', 'strength', 'intelligence', 'dexterity'] as const;
      const total = allowed.reduce((sum, key) => sum + (allocation[key] ?? 0), 0);
      if (total <= 0 || allowed.some((key) => !Number.isInteger(allocation[key] ?? 0) || (allocation[key] ?? 0) < 0) || total > row.attributePoints) {
        throw new Error('invalid_attribute_allocation');
      }
      const updated = await tx.character.update({
        where: { id: row.id },
        data: {
          constitution: { increment: allocation.constitution ?? 0 },
          strength: { increment: allocation.strength ?? 0 },
          intelligence: { increment: allocation.intelligence ?? 0 },
          dexterity: { increment: allocation.dexterity ?? 0 },
          attributePoints: { decrement: total }
        }
      });
      return fromDb(updated);
    });
  }

  async getInventory(characterId: string, accountId: string) {
    const owner = await this.prisma.character.findFirst({ where: { id: characterId, accountId }, select: { id: true } });
    if (!owner) return null;
    const [items, equipment] = await Promise.all([
      this.prisma.inventoryItem.findMany({ where: { characterId }, include: { item: true }, orderBy: { acquiredAt: 'desc' } }),
      this.prisma.characterEquipment.findMany({ where: { characterId }, include: { item: true } })
    ]);
    return {
      items: items.map((entry) => ({ id: entry.id, itemId: entry.itemId, name: entry.item.name,
        description: entry.item.description, rarity: entry.item.rarity, category: entry.item.category,
        slot: entry.item.slot, quantity: entry.quantity, levelReq: entry.item.levelReq,
        stats: (entry.item.stats ?? {}) as Record<string, number> })),
      equipment: equipment.map((entry) => ({ slot: entry.slot, item: {
        id: entry.id, itemId: entry.itemId, name: entry.item.name, description: entry.item.description,
        rarity: entry.item.rarity, category: entry.item.category, slot: entry.item.slot,
        quantity: 1, levelReq: entry.item.levelReq, stats: (entry.item.stats ?? {}) as Record<string, number>
      } }))
    };
  }

  async equipItem(characterId: string, accountId: string, inventoryItemId: string) {
    return this.prisma.$transaction(async (tx) => {
      const character = await tx.character.findFirst({ where: { id: characterId, accountId } });
      if (!character) return { error: 'not_found' as const };
      const inventory = await tx.inventoryItem.findFirst({
        where: { id: inventoryItemId, characterId }, include: { item: true }
      });
      if (!inventory || !inventory.item.slot) return { error: 'item_not_equippable' as const };
      if (character.level < inventory.item.levelReq) return { error: 'level_required' as const };
      const existing = await tx.characterEquipment.findUnique({
        where: { characterId_slot: { characterId, slot: inventory.item.slot } }
      });
      if (existing) {
        const returned = await tx.inventoryItem.findFirst({ where: { characterId, itemId: existing.itemId } });
        if (returned) {
          await tx.inventoryItem.update({ where: { id: returned.id }, data: { quantity: { increment: 1 } } });
        } else {
          await tx.inventoryItem.create({ data: { characterId, itemId: existing.itemId, quantity: 1 } });
        }
        await tx.characterEquipment.delete({ where: { id: existing.id } });
      }
      await tx.characterEquipment.create({ data: { characterId, slot: inventory.item.slot, itemId: inventory.itemId } });
      if (inventory.quantity <= 1) await tx.inventoryItem.delete({ where: { id: inventory.id } });
      else await tx.inventoryItem.update({ where: { id: inventory.id }, data: { quantity: { decrement: 1 } } });
      return { error: null as null };
    });
  }

  async addDrop(characterId: string, itemId: string, quantity: number, operationId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const exists = await tx.economyLedger.findUnique({ where: { operationId } });
      if (exists) return;
      const definition = await tx.itemDefinition.findUnique({ where: { id: itemId } });
      if (!definition) return;
      await tx.inventoryItem.create({ data: { characterId, itemId, quantity } });
      await tx.economyLedger.create({ data: {
        characterId, operationId, assetType: 'item', amount: BigInt(quantity), reason: `drop:${itemId}`
      } });
    });
  }
}

function fromDb(row: DbCharacter): CharacterRecord {
  return {
    id: row.id, playerId: row.accountId, name: row.name, nameKey: row.nameKey,
    title: row.title, guildName: row.guildName,
    classId: (row.classId === 'ranger' ? 'archer' : row.classId) as CharacterRecord['classId'],
    level: row.level, experience: Number(row.experience), gold: Number(row.gold),
    attributes: { constitution: row.constitution, strength: row.strength,
      intelligence: row.intelligence, dexterity: row.dexterity },
    attributePoints: row.attributePoints, equipmentBonuses: sumEquipmentBonuses(row.equipment ?? []), currentStageId: row.currentStageId,
    combat: row.combat as unknown as CharacterRecord['combat'], createdAt: row.createdAt.toISOString()
  };
}

function sumEquipmentBonuses(entries: Array<{ item: { stats: Prisma.JsonValue | null } }>): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const entry of entries) {
    const stats = entry.item.stats;
    if (!stats || typeof stats !== 'object' || Array.isArray(stats)) continue;
    for (const [key, value] of Object.entries(stats)) {
      if (typeof value === 'number' && Number.isFinite(value)) totals[key] = (totals[key] ?? 0) + value;
    }
  }
  return totals;
}
