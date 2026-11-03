import type { CharacterRecord } from './types.js';

/**
 * Contrato de persistência de personagens.
 *
 * Hoje a implementação é em memória (protótipo). Quando o PostgreSQL entrar,
 * basta criar um `PrismaCharacterRepository` com esta mesma interface e trocar
 * a injeção em `server.ts` — o restante da API não muda.
 */
export interface CharacterRepository {
  create(record: CharacterRecord): Promise<void>;
  findById(id: string): Promise<CharacterRecord | null>;
  findByName(playerId: string, nameKey: string): Promise<CharacterRecord | null>;
  listByPlayer(playerId: string): Promise<CharacterRecord[]>;
  countByPlayer(playerId: string): Promise<number>;
}

export class MemoryCharacterRepository implements CharacterRepository {
  private readonly characters = new Map<string, CharacterRecord>();

  async create(record: CharacterRecord): Promise<void> {
    this.characters.set(record.id, { ...record });
  }

  async findById(id: string): Promise<CharacterRecord | null> {
    const record = this.characters.get(id);
    return record ? { ...record } : null;
  }

  async findByName(playerId: string, nameKey: string): Promise<CharacterRecord | null> {
    for (const record of this.characters.values()) {
      if (record.playerId === playerId && record.nameKey === nameKey) {
        return { ...record };
      }
    }
    return null;
  }

  async listByPlayer(playerId: string): Promise<CharacterRecord[]> {
    return [...this.characters.values()]
      .filter((record) => record.playerId === playerId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((record) => ({ ...record }));
  }

  async countByPlayer(playerId: string): Promise<number> {
    let count = 0;
    for (const record of this.characters.values()) {
      if (record.playerId === playerId) {
        count += 1;
      }
    }
    return count;
  }
}
