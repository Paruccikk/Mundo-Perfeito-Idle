import { Prisma, PrismaClient } from '@prisma/client';
import type { CharacterRepository } from './characterRepository.js';
import type { CharacterRecord } from './types.js';
import { DEFAULT_STAGE_ID, getMonster, getStage, nextNormalMonster } from './monsters.js';

type DbCharacter = {
  id: string; accountId: string; name: string; nameKey: string; classId: string;
  title: string | null; guildName: string | null; level: number;
  experience: bigint; gold: bigint; constitution: number; strength: number;
  intelligence: number; dexterity: number; attributePoints: number;
  currentStageId: string; combat: Prisma.JsonValue; createdAt: Date;
  equipment?: Array<{ item: { id: string; stats: Prisma.JsonValue | null } }>;
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
      const weapon = record.classId === 'mage' ? 'apprentice-staff' : record.classId === 'priest' ? 'apprentice-mace' : record.classId === 'archer' ? 'training-bow' : 'training-sword';
      const starterItems: Array<[string, number]> = [[weapon, 1], ['apprentice-hood', 1], ['apprentice-chest', 1], ['apprentice-legs', 1], ['apprentice-boots', 1], ['apprentice-ring', 1], ['small-potion', 5], ['mp-potion', 3], ['revive-potion', 1]];
      await tx.inventoryItem.createMany({ data: starterItems.map(([itemId, quantity]) => ({ characterId: record.id, itemId, quantity })) });
    });
  }

  async save(
    record: CharacterRecord,
    expectedLastTickAt?: string,
    drops: Array<{ itemId: string; quantity: number; operationId: string }> = []
  ): Promise<boolean> {
    const data = {
      level: record.level, experience: BigInt(record.experience), gold: BigInt(record.gold),
      title: record.title, guildName: record.guildName,
      constitution: record.attributes.constitution, strength: record.attributes.strength,
      intelligence: record.attributes.intelligence, dexterity: record.attributes.dexterity,
      attributePoints: record.attributePoints, currentStageId: record.currentStageId,
      combat: record.combat as unknown as Prisma.InputJsonValue,
      lastSimulatedAt: new Date(record.combat.lastTickAt)
    };
    return this.prisma.$transaction(async (tx) => {
      if (expectedLastTickAt) {
        const result = await tx.character.updateMany({
          where: { id: record.id, lastSimulatedAt: new Date(expectedLastTickAt) }, data
        });
        if (result.count !== 1) return false;
      } else {
        await tx.character.update({ where: { id: record.id }, data });
      }
      for (const drop of drops) {
        await addDropInTransaction(tx, record.id, drop.itemId, drop.quantity, drop.operationId);
      }
      return true;
    }, { maxWait: 10_000, timeout: 20_000 });
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
      await tx.character.update({
        where: { id: row.id },
        data: {
          constitution: { increment: allocation.constitution ?? 0 },
          strength: { increment: allocation.strength ?? 0 },
          intelligence: { increment: allocation.intelligence ?? 0 },
          dexterity: { increment: allocation.dexterity ?? 0 },
          attributePoints: { decrement: total }
        }
      });
      const updated = await tx.character.findUnique({
        where: { id: row.id }, include: { equipment: { include: { item: true } } }
      });
      return updated ? fromDb(updated) : null;
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

  async unequipItem(characterId: string, accountId: string, slot: string): Promise<{ error: string | null }> {
    return this.prisma.$transaction(async (tx) => {
      const character = await tx.character.findFirst({ where: { id: characterId, accountId }, select: { id: true } });
      if (!character) return { error: 'not_found' };
      const equipped = await tx.characterEquipment.findUnique({
        where: { characterId_slot: { characterId, slot } }
      });
      if (!equipped) return { error: 'not_equipped' };
      const stack = await tx.inventoryItem.findFirst({ where: { characterId, itemId: equipped.itemId } });
      if (stack) await tx.inventoryItem.update({ where: { id: stack.id }, data: { quantity: { increment: 1 } } });
      else await tx.inventoryItem.create({ data: { characterId, itemId: equipped.itemId, quantity: 1 } });
      await tx.characterEquipment.delete({ where: { id: equipped.id } });
      return { error: null };
    });
  }

  async useItem(characterId: string, accountId: string, inventoryItemId: string, maxHp: number, maxMp: number): Promise<{ error: string | null }> {
    return this.prisma.$transaction(async (tx) => {
      const character = await tx.character.findFirst({ where: { id: characterId, accountId } });
      if (!character) return { error: 'not_found' };
      const inventory = await tx.inventoryItem.findFirst({ where: { id: inventoryItemId, characterId }, include: { item: true } });
      if (!inventory || inventory.item.category !== 'consumable') return { error: 'not_usable' };
      const combat = character.combat as unknown as CharacterRecord['combat'];
      if (combat.status === 'dead') return { error: 'character_dead' };
      const effects = (inventory.item.stats ?? {}) as Record<string, number>;
      const hpBefore = combat.playerHp;
      const mpBefore = combat.playerMp ?? maxMp;
      const hpAfter = Math.min(maxHp, hpBefore + Math.max(0, effects.hpRestore ?? 0));
      const mpAfter = Math.min(maxMp, mpBefore + Math.max(0, effects.mpRestore ?? 0));
      if (hpAfter === hpBefore && mpAfter === mpBefore) return { error: 'no_effect' };
      const updatedCombat = { ...combat, playerHp: hpAfter, playerMp: mpAfter, lastTickAt: new Date().toISOString() };
      await tx.character.update({ where: { id: characterId }, data: { combat: updatedCombat as unknown as Prisma.InputJsonValue, lastSimulatedAt: new Date(updatedCombat.lastTickAt) } });
      if (inventory.quantity <= 1) await tx.inventoryItem.delete({ where: { id: inventory.id } });
      else await tx.inventoryItem.update({ where: { id: inventory.id }, data: { quantity: { decrement: 1 } } });
      return { error: null };
    }, { maxWait: 10_000, timeout: 20_000 });
  }

  async resolveDeath(characterId: string, accountId: string, maxHp: number, maxMp: number, allowRevive: boolean): Promise<{ record: CharacterRecord | null; returnToCity: boolean }> {
    const returnToCity = await this.prisma.$transaction(async (tx) => {
      const character = await tx.character.findFirst({ where: { id: characterId, accountId } });
      if (!character) return null;
      const combat = character.combat as unknown as CharacterRecord['combat'];
      if (combat.status !== 'dead') return false;
      const revive = allowRevive ? await tx.inventoryItem.findFirst({ where: { characterId, itemId: 'revive-potion', quantity: { gt: 0 } } }) : null;
      if (revive) {
        if (revive.quantity <= 1) await tx.inventoryItem.delete({ where: { id: revive.id } });
        else await tx.inventoryItem.update({ where: { id: revive.id }, data: { quantity: { decrement: 1 } } });
      }
      const now = new Date().toISOString();
      const stageId = allowRevive ? combat.stageId : DEFAULT_STAGE_ID;
      const fallbackStage = getStage(DEFAULT_STAGE_ID);
      const fallbackMonsterId = nextNormalMonster(fallbackStage, 0);
      const fallbackMonster = getMonster(fallbackMonsterId);
      const fallbackPack = Array.from({ length: 6 }, (_, index) => { const monsterId = fallbackStage.monsterIds[index % fallbackStage.monsterIds.length]!; const monster = getMonster(monsterId); return { slotId: `mob-${index + 1}`, monsterId, hp: monster.maxHp, respawnAt: null }; });
      const updatedCombat = { ...combat, stageId, monsterId: allowRevive ? combat.monsterId : fallbackMonsterId, monsterHp: allowRevive ? combat.monsterHp : fallbackMonster.maxHp, pack: allowRevive ? combat.pack : fallbackPack, targetIndex: allowRevive ? combat.targetIndex ?? 0 : 0, playerHp: revive ? Math.max(1, Math.round(maxHp * 0.5)) : maxHp, playerMp: revive ? Math.max(0, Math.round(maxMp * 0.5)) : maxMp, status: 'fighting' as const, recoveringUntil: null, playerCooldownSeconds: 0, monsterCooldownSeconds: 0.5, lastTickAt: now };
      await tx.character.update({ where: { id: characterId }, data: { currentStageId: stageId, combat: updatedCombat as unknown as Prisma.InputJsonValue, lastSimulatedAt: new Date(now) } });
      return !revive;
    }, { maxWait: 10_000, timeout: 20_000 });
    if (returnToCity === null) return { record: null, returnToCity: false };
    return { record: await this.findById(characterId), returnToCity };
  }

  async travel(characterId: string, accountId: string, stageId: string): Promise<CharacterRecord | null> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const character = await tx.character.findFirst({ where: { id: characterId, accountId } });
      if (!character) return false;
      const stage = getStage(stageId);
      const monsterId = nextNormalMonster(stage, 0);
      const monster = getMonster(monsterId);
      const combat = character.combat as unknown as CharacterRecord['combat'];
      const now = new Date().toISOString();
      const pack = Array.from({ length: 6 }, (_, index) => { const id = stage.monsterIds[index % stage.monsterIds.length]!; const definition = getMonster(id); return { slotId: `mob-${index + 1}`, monsterId: id, hp: definition.maxHp, respawnAt: null }; });
      const updatedCombat = {
        ...combat, stageId: stage.id, monsterId, monsterHp: monster.maxHp, pack, targetIndex: 0,
        killsInStage: 0, bossActive: false, bossDefeated: 0, status: 'fighting' as const,
        recoveringUntil: null, playerCooldownSeconds: 0, monsterCooldownSeconds: 0.5,
        lastTickAt: now
      };
      await tx.character.update({
        where: { id: characterId },
        data: {
          currentStageId: stage.id,
          combat: updatedCombat as unknown as Prisma.InputJsonValue,
          lastSimulatedAt: new Date(now)
        }
      });
      return true;
    }, { maxWait: 10_000, timeout: 20_000 });
    return updated ? this.findById(characterId) : null;
  }

  async addDrop(characterId: string, itemId: string, quantity: number, operationId: string): Promise<void> {
    await this.prisma.$transaction((tx) => addDropInTransaction(tx, characterId, itemId, quantity, operationId));
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

function sumEquipmentBonuses(entries: Array<{ item: { id: string; stats: Prisma.JsonValue | null } }>): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const entry of entries) {
    const stats = entry.item.stats;
    if (!stats || typeof stats !== 'object' || Array.isArray(stats)) continue;
    for (const [key, value] of Object.entries(stats)) {
      if (typeof value === 'number' && Number.isFinite(value)) totals[key] = (totals[key] ?? 0) + value;
    }
  }
  const equippedIds = new Set(entries.map((entry) => entry.item.id));
  const apprenticeSet = ['apprentice-hood', 'apprentice-chest', 'apprentice-legs', 'apprentice-boots', 'apprentice-ring'];
  if (apprenticeSet.every((id) => equippedIds.has(id))) {
    totals.maxHp = (totals.maxHp ?? 0) + 30;
    totals.maxMp = (totals.maxMp ?? 0) + 15;
    totals.physicalDefense = (totals.physicalDefense ?? 0) + 2;
    totals.magicDefense = (totals.magicDefense ?? 0) + 2;
  }
  return totals;
}

async function addDropInTransaction(
  tx: Prisma.TransactionClient,
  characterId: string,
  itemId: string,
  quantity: number,
  operationId: string
): Promise<void> {
  const exists = await tx.economyLedger.findUnique({ where: { operationId } });
  if (exists) return;
  const definition = await tx.itemDefinition.findUnique({ where: { id: itemId } });
  if (!definition || quantity <= 0) return;
  let remaining = quantity;
  if (definition.stackable) {
    const stacks = await tx.inventoryItem.findMany({ where: { characterId, itemId }, orderBy: { acquiredAt: 'asc' } });
    for (const stack of stacks) {
      if (remaining <= 0) break;
      const room = Math.max(0, definition.maxStack - stack.quantity);
      const added = Math.min(room, remaining);
      if (added > 0) {
        await tx.inventoryItem.update({ where: { id: stack.id }, data: { quantity: { increment: added } } });
        remaining -= added;
      }
    }
  }
  while (remaining > 0) {
    const stackQuantity = definition.stackable ? Math.min(definition.maxStack, remaining) : 1;
    await tx.inventoryItem.create({ data: { characterId, itemId, quantity: stackQuantity } });
    remaining -= stackQuantity;
  }
  await tx.economyLedger.create({ data: {
    characterId, operationId, assetType: 'item', amount: BigInt(quantity), reason: `drop:${itemId}`
  } });
}
