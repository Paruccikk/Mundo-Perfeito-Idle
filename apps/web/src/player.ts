const PLAYER_ID_KEY = 'mundo-perfeito.playerId';
const CHARACTER_ID_KEY = 'mundo-perfeito.characterId';

function createPlayerId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `ply_${crypto.randomUUID()}`;
  }
  const random = Math.random().toString(36).slice(2);
  return `ply_${Date.now().toString(36)}${random}`;
}

export function getPlayerId(): string {
  let playerId = localStorage.getItem(PLAYER_ID_KEY);
  if (!playerId) {
    playerId = createPlayerId();
    localStorage.setItem(PLAYER_ID_KEY, playerId);
  }
  return playerId;
}

export function getStoredCharacterId(): string | null {
  return localStorage.getItem(CHARACTER_ID_KEY);
}

export function storeCharacterId(characterId: string): void {
  localStorage.setItem(CHARACTER_ID_KEY, characterId);
}

export function clearStoredCharacterId(): void {
  localStorage.removeItem(CHARACTER_ID_KEY);
}
