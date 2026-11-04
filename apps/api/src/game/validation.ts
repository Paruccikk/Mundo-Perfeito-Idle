import type { CharacterClassId } from './types.js';

export const MAX_CHARACTERS_PER_PLAYER = 3;
export const NAME_MIN_LENGTH = 3;
export const NAME_MAX_LENGTH = 16;

export const PLAYER_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;
const NAME_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N} .'-]*$/u;

export interface CreateCharacterPayload {
  playerId: string;
  name: string;
  classId: CharacterClassId;
}

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; details: Record<string, string> };

export function normalizeName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

export function nameKey(name: string): string {
  return name.toLocaleLowerCase('pt-BR');
}

export function isValidPlayerId(value: unknown): value is string {
  return typeof value === 'string' && PLAYER_ID_PATTERN.test(value);
}

export function validateCreateCharacter(
  body: unknown,
  isClassId: (value: unknown) => value is CharacterClassId
): ValidationResult<CreateCharacterPayload> {
  const details: Record<string, string> = {};

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return {
      ok: false,
      details: { body: 'Envie um objeto JSON com playerId, name e classId.' }
    };
  }

  const input = body as Record<string, unknown>;

  const playerId = input.playerId;
  if (!isValidPlayerId(playerId)) {
    details.playerId = 'playerId deve ter de 8 a 64 caracteres (letras, números, _ ou -).';
  }

  const rawName = input.name;
  if (typeof rawName !== 'string') {
    details.name = 'Informe um nome para o personagem.';
  }

  const name = typeof rawName === 'string' ? normalizeName(rawName) : '';
  if (typeof rawName === 'string') {
    if (name.length < NAME_MIN_LENGTH || name.length > NAME_MAX_LENGTH) {
      details.name = `O nome deve ter entre ${NAME_MIN_LENGTH} e ${NAME_MAX_LENGTH} caracteres.`;
    } else if (!NAME_PATTERN.test(name)) {
      details.name = 'Use apenas letras, números, espaço, ponto, apóstrofo ou hífen.';
    } else if (/^\d+$/.test(name)) {
      details.name = 'O nome não pode ser só números.';
    }
  }

  const classId = input.classId;
  if (!isClassId(classId)) {
    details.classId = 'Classe inválida. Escolha warrior, mage, priest ou archer.';
  }

  if (Object.keys(details).length > 0) {
    return { ok: false, details };
  }

  return {
    ok: true,
    value: {
      playerId: playerId as string,
      name,
      classId: classId as CharacterClassId
    }
  };
}
