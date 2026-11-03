import type { CharacterRecord } from './types.js';

/**
 * Contrato de persistência de personagens.
 * O save de combate usa o último tick esperado para impedir que duas
 * requisições simultâneas concedam duas vezes as mesmas recompensas offline.
 */
export interface CharacterRepository {
  create(record: CharacterRecord): Promise<void>;
  save(record: CharacterRecord, expectedLastTickAt?: string): Promise<boolean>;
  findById(id: string): Promise<CharacterRecord | null>;
  findByName(playerId: string, nameKey: string): Promise<CharacterRecord | null>;
  listByPlayer(playerId: string): Promise<CharacterRecord[]>;
  countByPlayer(playerId: string): Promise<number>;
}

export class MemoryCharacterRepository implements CharacterRepository {
  private readonly characters = new Map<string, CharacterRecord>();

  async create(record: CharacterRecord): Promise<void> {
    this.characters.set(record.id, clone(record));
  }

  async save(record: CharacterRecord, expectedLastTickAt?: string): Promise<boolean> {
    const current = this.characters.get(record.id);
    if (expectedLastTickAt && current?.combat.lastTickAt !== expectedLastTickAt) return false;
    this.characters.set(record.id, clone(record));
    return true;
  }

  async findById(id: string): Promise<CharacterRecord | null> {
    const record = this.characters.get(id);
    return record ? clone(record) : null;
  }

  async findByName(playerId: string, nameKey: string): Promise<CharacterRecord | null> {
    for (const record of this.characters.values()) {
      if (record.playerId === playerId && record.nameKey === nameKey) return clone(record);
    }
    return null;
  }

  async listByPlayer(playerId: string): Promise<CharacterRecord[]> {
    return [...this.characters.values()]
      .filter((record) => record.playerId === playerId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map(clone);
  }

  async countByPlayer(playerId: string): Promise<number> {
    let count = 0;
    for (const record of this.characters.values()) {
      if (record.playerId === playerId) count += 1;
    }
    return count;
  }
}

function clone(record: CharacterRecord): CharacterRecord {
  return { ...record, combat: { ...record.combat } };
}
