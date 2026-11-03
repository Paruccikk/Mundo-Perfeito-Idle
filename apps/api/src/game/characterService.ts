import { randomUUID } from 'node:crypto';
import {
  CLASS_DEFINITIONS,
  CHARACTER_CLASS_IDS,
  experienceToNextLevel,
  getDefaultStageId,
  statsForLevel
} from './classes.js';
import type { CharacterRepository } from './characterRepository.js';
import type {
  CharacterClassDefinition,
  CharacterRecord,
  CharacterSummary
} from './types.js';
import {
  MAX_CHARACTERS_PER_PLAYER,
  isValidPlayerId,
  nameKey,
  type CreateCharacterPayload
} from './validation.js';

export class CharacterError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly details?: Record<string, string>;

  constructor(
    code: string,
    statusCode: number,
    message: string,
    details?: Record<string, string>
  ) {
    super(message);
    this.name = 'CharacterError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class CharacterService {
  constructor(private readonly repository: CharacterRepository) {}

  listClasses(): CharacterClassDefinition[] {
    return CHARACTER_CLASS_IDS.map((id) => CLASS_DEFINITIONS[id]);
  }

  async createCharacter(payload: CreateCharacterPayload): Promise<CharacterSummary> {
    const owned = await this.repository.countByPlayer(payload.playerId);
    if (owned >= MAX_CHARACTERS_PER_PLAYER) {
      throw new CharacterError(
        'character_limit_reached',
        409,
        `Você já tem ${MAX_CHARACTERS_PER_PLAYER} personagens. O limite do protótipo é ${MAX_CHARACTERS_PER_PLAYER}.`
      );
    }

    const key = nameKey(payload.name);
    const existing = await this.repository.findByName(payload.playerId, key);
    if (existing) {
      throw new CharacterError(
        'name_taken',
        409,
        'Você já tem um personagem com esse nome.',
        { name: 'Escolha outro nome.' }
      );
    }

    const now = new Date().toISOString();
    const record: CharacterRecord = {
      id: randomUUID(),
      playerId: payload.playerId,
      name: payload.name,
      nameKey: key,
      classId: payload.classId,
      level: 1,
      experience: 0,
      gold: CLASS_DEFINITIONS[payload.classId].startingGold,
      currentStageId: getDefaultStageId(),
      createdAt: now
    };

    await this.repository.create(record);
    return toSummary(record);
  }

  async getCharacter(id: string, playerId: unknown): Promise<CharacterSummary> {
    assertPlayerId(playerId);
    const record = await this.repository.findById(id);
    if (!record || record.playerId !== playerId) {
      throw new CharacterError('character_not_found', 404, 'Personagem não encontrado.');
    }
    return toSummary(record);
  }

  async listCharacters(playerId: unknown): Promise<CharacterSummary[]> {
    assertPlayerId(playerId);
    const records = await this.repository.listByPlayer(playerId);
    return records.map(toSummary);
  }
}

export function toSummary(record: CharacterRecord): CharacterSummary {
  const definition = CLASS_DEFINITIONS[record.classId];
  return {
    id: record.id,
    name: record.name,
    classId: record.classId,
    className: definition.name,
    level: record.level,
    experience: record.experience,
    experienceToNextLevel: experienceToNextLevel(record.level),
    gold: record.gold,
    currentStageId: record.currentStageId,
    stats: statsForLevel(record.classId, record.level),
    createdAt: record.createdAt
  };
}

function assertPlayerId(playerId: unknown): asserts playerId is string {
  if (!isValidPlayerId(playerId)) {
    throw new CharacterError(
      'invalid_player_id',
      400,
      'Informe um playerId válido (8 a 64 caracteres: letras, números, _ ou -).',
      { playerId: 'playerId inválido.' }
    );
  }
}
