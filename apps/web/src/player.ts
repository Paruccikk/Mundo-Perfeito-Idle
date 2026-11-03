const ACCOUNT_ID_KEY = 'mundo-perfeito.accountId';
const CHARACTER_ID_KEY = 'mundo-perfeito.characterId';
const AUTH_TOKEN_KEY = 'mundo-perfeito.authToken';

export function getPlayerId(): string {
  return localStorage.getItem(ACCOUNT_ID_KEY) ?? '';
}

export function getLegacyPlayerId(): string | null {
  return localStorage.getItem('mundo-perfeito.playerId');
}

export function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthSession(token: string, accountId: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(ACCOUNT_ID_KEY, accountId);
}

export function clearAuthSession(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(ACCOUNT_ID_KEY);
  localStorage.removeItem(CHARACTER_ID_KEY);
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
