import { Prisma, PrismaClient } from '@prisma/client';
import type { CharacterRepository } from './characterRepository.js';
import type { CharacterRecord } from './types.js';

type DbCharacter = {
  id: string;
  accountId: string;
  name: string;
  nameKey: string;
  classId: string;
  level: number;
  experience: bigint;
  gold: bigint;
  currentStageId: string;
  combat: Prisma.JsonValue;
  createdAt: Date;
};

export class PrismaCharacterRepository implements CharacterRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(record: CharacterRecord): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.account.upsert({
        where: { id: record.playerId },
        update: {},
        create: { id: record.playerId }
      });
      await tx.character.create({
        data: {
          id: record.id,
          accountId: record.playerId,
          name: record.name,
          nameKey: record.nameKey,
          classId: record.classId,
          level: record.level,
          experience: BigInt(record.experience),
          gold: BigInt(record.gold),
          currentStageId: record.currentStageId,
          combat: record.combat as unknown as Prisma.InputJsonValue,
          lastSimulatedAt: new Date(record.combat.lastTickAt),
          createdAt: new Date(record.createdAt)
        }
      });
    });
  }

  async save(record: CharacterRecord, expectedLastTickAt?: string): Promise<boolean> {
    const data = {
      level: record.level,
      experience: BigInt(record.experience),
      gold: BigInt(record.gold),
      currentStageId: record.currentStageId,
      combat: record.combat as unknown as Prisma.InputJsonValue,
      lastSimulatedAt: new Date(record.combat.lastTickAt)
    };

    if (expectedLastTickAt) {
      const result = await this.prisma.character.updateMany({
        where: { id: record.id, lastSimulatedAt: new Date(expectedLastTickAt) },
        data
      });
      return result.count === 1;
    }

    await this.prisma.character.update({ where: { id: record.id }, data });
    return true;
  }

  async findById(id: string): Promise<CharacterRecord | null> {
    const row = await this.prisma.character.findUnique({ where: { id } });
    return row ? fromDb(row) : null;
  }

  async findByName(playerId: string, key: string): Promise<CharacterRecord | null> {
    const row = await this.prisma.character.findFirst({
      where: { accountId: playerId, nameKey: key }
    });
    return row ? fromDb(row) : null;
  }

  async listByPlayer(playerId: string): Promise<CharacterRecord[]> {
    const rows = await this.prisma.character.findMany({
      where: { accountId: playerId },
      orderBy: { createdAt: 'asc' }
    });
    return rows.map(fromDb);
  }

  countByPlayer(playerId: string): Promise<number> {
    return this.prisma.character.count({ where: { accountId: playerId } });
  }
}

function fromDb(row: DbCharacter): CharacterRecord {
  return {
    id: row.id,
    playerId: row.accountId,
    name: row.name,
    nameKey: row.nameKey,
    classId: row.classId as CharacterRecord['classId'],
    level: row.level,
    experience: Number(row.experience),
    gold: Number(row.gold),
    currentStageId: row.currentStageId,
    combat: row.combat as unknown as CharacterRecord['combat'],
    createdAt: row.createdAt.toISOString()
  };
}
