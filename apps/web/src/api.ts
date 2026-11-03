import type {
  ApiErrorBody,
  CharacterClassDefinition,
  CharacterClassId,
  CharacterSummary,
  CombatSnapshot
} from '@mundo-perfeito/shared';

const LOCAL_API = 'http://localhost:3000';
const PRODUCTION_API = 'https://mundo-perfeito-api.onrender.com';

const envUrl = import.meta.env.VITE_API_URL as string | undefined;
const isLocalHost =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

export const API_BASE_URL = (envUrl ?? (isLocalHost ? LOCAL_API : PRODUCTION_API)).replace(
  /\/+$/,
  ''
);

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: Record<string, string>;

  constructor(
    message: string,
    code = 'unknown_error',
    status = 0,
    details?: Record<string, string>
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  timeoutMs?: number;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? 60_000;
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal
    });

    const payload = (await response.json().catch(() => null)) as
      | (ApiErrorBody & Record<string, unknown>)
      | null;

    if (!response.ok) {
      throw new ApiError(
        payload?.error?.message ?? `O servidor respondeu com erro ${response.status}.`,
        payload?.error?.code ?? 'http_error',
        response.status,
        payload?.error?.details
      );
    }

    return payload as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(
        'O servidor demorou para responder. Ele pode estar acordando — tente novamente.',
        'timeout'
      );
    }
    throw new ApiError(
      'Não foi possível falar com o servidor. Verifique sua conexão e tente novamente.',
      'network_error'
    );
  } finally {
    window.clearTimeout(timer);
  }
}

export const api = {
  async listClasses(): Promise<CharacterClassDefinition[]> {
    const data = await request<{ classes: CharacterClassDefinition[] }>('/api/v1/game/classes');
    return data.classes;
  },

  async createCharacter(input: {
    playerId: string;
    name: string;
    classId: CharacterClassId;
  }): Promise<CharacterSummary> {
    const data = await request<{ character: CharacterSummary }>('/api/v1/characters', {
      method: 'POST',
      body: input
    });
    return data.character;
  },

  async getCharacter(id: string, playerId: string): Promise<CharacterSummary> {
    const data = await request<{ character: CharacterSummary }>(
      `/api/v1/characters/${encodeURIComponent(id)}?playerId=${encodeURIComponent(playerId)}`
    );
    return data.character;
  },

  async listCharacters(playerId: string): Promise<CharacterSummary[]> {
    const data = await request<{ characters: CharacterSummary[] }>(
      `/api/v1/characters?playerId=${encodeURIComponent(playerId)}`
    );
    return data.characters;
  },

  async getCombat(id: string, playerId: string): Promise<CombatSnapshot> {
    return request<CombatSnapshot>(
      `/api/v1/characters/${encodeURIComponent(id)}/combat?playerId=${encodeURIComponent(playerId)}`
    );
  }
};
