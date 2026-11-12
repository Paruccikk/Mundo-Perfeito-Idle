import type { CharacterClassId, CharacterGender, ProfessionId } from './types.js';
export const MAX_CHARACTERS_PER_PLAYER = 1;
export const NAME_MIN_LENGTH = 3;
export const NAME_MAX_LENGTH = 16;
export const PLAYER_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;
const NAME_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N} .'-]*$/u;
const PROFESSIONS: ProfessionId[] = ['animal_caretaker', 'lumberjack', 'fisher', 'farmer'];
export interface CreateCharacterPayload { playerId: string; name: string; classId: CharacterClassId; gender: CharacterGender; professionId: ProfessionId; }
export type ValidationResult<T> = { ok: true; value: T } | { ok: false; details: Record<string, string> };
export function normalizeName(raw: string): string { return raw.trim().replace(/\s+/g, ' '); }
export function nameKey(name: string): string { return name.toLocaleLowerCase('pt-BR'); }
export function isValidPlayerId(value: unknown): value is string { return typeof value === 'string' && PLAYER_ID_PATTERN.test(value); }
export function validateCreateCharacter(body: unknown, _isClassId?: (value: unknown) => value is CharacterClassId): ValidationResult<CreateCharacterPayload> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return { ok: false, details: { body: 'Envie nome, aparência e profissão.' } };
  const input = body as Record<string, unknown>, details: Record<string, string> = {};
  const playerId = input.playerId, rawName = input.name, name = typeof rawName === 'string' ? normalizeName(rawName) : '';
  if (!isValidPlayerId(playerId)) details.playerId = 'Conta inválida.';
  if (typeof rawName !== 'string' || name.length < NAME_MIN_LENGTH || name.length > NAME_MAX_LENGTH || !NAME_PATTERN.test(name) || /^\d+$/.test(name)) details.name = 'O nome deve ter de 3 a 16 caracteres e conter letras.';
  if (input.gender !== 'male' && input.gender !== 'female') details.gender = 'Escolha homem ou mulher.';
  if (typeof input.professionId !== 'string' || !PROFESSIONS.includes(input.professionId as ProfessionId)) details.professionId = 'Escolha uma profissão válida.';
  if (Object.keys(details).length) return { ok: false, details };
  return { ok: true, value: { playerId: playerId as string, name, classId: 'warrior', gender: input.gender as CharacterGender, professionId: input.professionId as ProfessionId } };
}
