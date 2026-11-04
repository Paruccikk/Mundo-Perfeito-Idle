import { randomUUID } from 'node:crypto';
import {
  CLASS_DEFINITIONS, CHARACTER_CLASS_IDS,
  experienceToNextLevel, statsForLevel
} from './classes.js';
import type { CharacterRepository } from './characterRepository.js';
import { simulateCombat } from './combat.js';
import { STAGE_ONE, getMonster, getStage, nextNormalMonster } from './monsters.js';
import type {
  CharacterClassDefinition, CharacterRecord, CharacterSummary, CombatEvent, CombatSnapshot
} from './types.js';
import {
  MAX_CHARACTERS_PER_PLAYER, isValidPlayerId, nameKey, type CreateCharacterPayload
} from './validation.js';

export class CharacterError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly details?: Record<string, string>;
  constructor(code: string, statusCode: number, message: string, details?: Record<string, string>) {
    super(message); this.name = 'CharacterError'; this.code = code; this.statusCode = statusCode; this.details = details;
  }
}

export class CharacterService {
  constructor(private readonly repository: CharacterRepository) {}

  listClasses(): CharacterClassDefinition[] {
    return CHARACTER_CLASS_IDS.map((id) => CLASS_DEFINITIONS[id]);
  }

  async createCharacter(payload: CreateCharacterPayload): Promise<CharacterSummary> {
    const owned = await this.repository.countByPlayer(payload.playerId);
    if (owned >= MAX_CHARACTERS_PER_PLAYER) throw new CharacterError('character_limit_reached', 409,
      `Você já tem ${MAX_CHARACTERS_PER_PLAYER} personagens. O limite do protótipo é ${MAX_CHARACTERS_PER_PLAYER}.`);
    const key = nameKey(payload.name);
    if (await this.repository.findByName(payload.playerId, key)) {
      throw new CharacterError('name_taken', 409, 'Você já tem um personagem com esse nome.', { name: 'Escolha outro nome.' });
    }

    const now = new Date().toISOString();
    const attributes = { ...CLASS_DEFINITIONS[payload.classId].baseAttributes };
    const stats = statsForLevel(payload.classId, 1, attributes);
    const initialMonsterId = nextNormalMonster(STAGE_ONE, 0);
    const initialMonster = getMonster(initialMonsterId);
    const record: CharacterRecord = {
      id: randomUUID(), playerId: payload.playerId, name: payload.name, nameKey: key,
      title: null, guildName: null, classId: payload.classId, level: 1, experience: 0,
      gold: CLASS_DEFINITIONS[payload.classId].startingGold, attributes, attributePoints: 0, equipmentBonuses: {},
      currentStageId: STAGE_ONE.id,
      combat: {
        stageId: STAGE_ONE.id, monsterId: initialMonsterId, monsterHp: initialMonster.maxHp,
        playerHp: stats.maxHp, playerMp: stats.maxMp, killsInStage: 0, bossActive: false, bossDefeated: 0,
        status: 'fighting', playerCooldownSeconds: 0, monsterCooldownSeconds: 0,
        recoveringUntil: null, lastTickAt: now
      },
      createdAt: now
    };
    await this.repository.create(record);
    return toSummary(record);
  }

  async getCharacter(id: string, playerId: unknown): Promise<CharacterSummary> {
    assertPlayerId(playerId); return toSummary(await this.findOwned(id, playerId));
  }

  async listCharacters(playerId: unknown): Promise<CharacterSummary[]> {
    assertPlayerId(playerId); return (await this.repository.listByPlayer(playerId)).map(toSummary);
  }

  async allocateAttributes(id: string, playerId: unknown, allocation: Record<string, number>): Promise<CharacterSummary> {
    assertPlayerId(playerId);
    try {
      const record = await this.repository.allocateAttributes(id, playerId, allocation);
      if (!record) throw new CharacterError('character_not_found', 404, 'Personagem não encontrado.');
      return toSummary(record);
    } catch (error) {
      if (error instanceof CharacterError) throw error;
      throw new CharacterError('invalid_attribute_allocation', 400,
        'Distribua apenas pontos inteiros disponíveis, sem valores negativos.');
    }
  }

  async getInventory(id: string, playerId: unknown) {
    assertPlayerId(playerId);
    const inventory = await this.repository.getInventory(id, playerId);
    if (!inventory) throw new CharacterError('character_not_found', 404, 'Personagem não encontrado.');
    return inventory;
  }

  async equipItem(id: string, playerId: unknown, inventoryItemId: string) {
    assertPlayerId(playerId);
    const result = await this.repository.equipItem(id, playerId, inventoryItemId);
    if (result.error === 'not_found') throw new CharacterError('character_not_found', 404, 'Personagem não encontrado.');
    if (result.error === 'level_required') throw new CharacterError('level_required', 400, 'Seu nível ainda não permite equipar este item.');
    if (result.error) throw new CharacterError(result.error, 400, 'Este item não pode ser equipado.');
    return this.getInventory(id, playerId);
  }

  async unequipItem(id: string, playerId: unknown, slot: string) {
    assertPlayerId(playerId);
    const result = await this.repository.unequipItem(id, playerId, slot);
    if (result.error === 'not_found') throw new CharacterError('character_not_found', 404, 'Personagem não encontrado.');
    if (result.error) throw new CharacterError(result.error, 400, 'Não existe equipamento nesse espaço.');
    return this.getInventory(id, playerId);
  }

  async useItem(id: string, playerId: unknown, inventoryItemId: string) {
    assertPlayerId(playerId);
    const record = await this.findOwned(id, playerId);
    const stats = statsForLevel(record.classId, record.level, record.attributes, record.equipmentBonuses);
    const result = await this.repository.useItem(id, playerId, inventoryItemId, stats.maxHp, stats.maxMp);
    if (result.error === 'not_found') throw new CharacterError('character_not_found', 404, 'Personagem não encontrado.');
    if (result.error === 'no_effect') throw new CharacterError('no_effect', 400, 'Este item não teria efeito agora.');
    if (result.error === 'character_dead') throw new CharacterError('character_dead', 400, 'Seu personagem foi derrotado. A Poção da Ressurreição é consumida automaticamente se estiver na mochila.');
    if (result.error) throw new CharacterError('item_not_usable', 400, 'Este item não pode ser usado.');
    return this.getInventory(id, playerId);
  }

  async getCombat(id: string, playerId: unknown): Promise<CombatSnapshot> {
    assertPlayerId(playerId);
    let returnToCity = false;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      let record = await this.findOwned(id, playerId);
      if (record.combat.status === 'dead') {
        let stageExists = true;
        try { getStage(record.combat.stageId); } catch { stageExists = false; }
        const stats = statsForLevel(record.classId, record.level, record.attributes, record.equipmentBonuses);
        const resolved = await this.repository.resolveDeath(id, playerId, stats.maxHp, stats.maxMp, stageExists);
        if (!resolved.record) throw new CharacterError('character_not_found', 404, 'Personagem não encontrado.');
        record = resolved.record;
        returnToCity = resolved.returnToCity;
        if (returnToCity) return { ...toCombatSnapshot(record, [], 0), returnToCity: true };
      }
      const simulation = simulateCombat(record, Date.now());
      if (simulation.simulatedSeconds <= 0) return { ...toCombatSnapshot(record, simulation.events, 0), ...(returnToCity ? { returnToCity: true } : {}) };
      const drops = simulation.drops.map((drop, index) => ({
        ...drop,
        operationId: `drop:${id}:${record.combat.lastTickAt}:${index}`
      }));
      const saved = await this.repository.save(simulation.record, record.combat.lastTickAt, drops);
      if (saved) {
        return { ...toCombatSnapshot(simulation.record, simulation.events, simulation.simulatedSeconds), ...(returnToCity ? { returnToCity: true } : {}) };
      }
    }
    throw new CharacterError('combat_busy', 409, 'O personagem está sendo atualizado. Tente novamente em alguns segundos.');
  }

  private async findOwned(id: string, playerId: string): Promise<CharacterRecord> {
    const record = await this.repository.findById(id);
    if (!record || record.playerId !== playerId) throw new CharacterError('character_not_found', 404, 'Personagem não encontrado.');
    return record;
  }
}

export function toSummary(record: CharacterRecord): CharacterSummary {
  const definition = CLASS_DEFINITIONS[record.classId];
  return {
    id: record.id, name: record.name, title: record.title, guildName: record.guildName,
    classId: record.classId, className: definition.name, level: record.level,
    experience: record.experience, experienceToNextLevel: experienceToNextLevel(record.level),
    gold: record.gold, currentStageId: record.currentStageId,
    attributes: { ...record.attributes }, attributePoints: record.attributePoints,
    stats: statsForLevel(record.classId, record.level, record.attributes, record.equipmentBonuses), createdAt: record.createdAt
  };
}

export function toCombatSnapshot(record: CharacterRecord, events: CombatEvent[], simulatedSeconds: number): CombatSnapshot {
  const summary = toSummary(record);
  const stage = getStage(record.combat.stageId);
  const monster = getMonster(record.combat.monsterId);
  return {
    character: summary,
    combat: {
      stageId: stage.id, stageName: stage.name, monster: { ...monster, hp: Math.max(0, record.combat.monsterHp) },
      playerHp: Math.max(0, record.combat.playerHp), playerMaxHp: summary.stats.maxHp,
      playerMp: Math.max(0, record.combat.playerMp ?? summary.stats.maxMp), playerMaxMp: summary.stats.maxMp,
      killsInStage: record.combat.killsInStage, killsRequiredForBoss: stage.killsRequiredForBoss,
      bossActive: record.combat.bossActive, bossDefeated: record.combat.bossDefeated, status: record.combat.status
    },
    events, simulatedSeconds
  };
}

function assertPlayerId(playerId: unknown): asserts playerId is string {
  if (!isValidPlayerId(playerId)) throw new CharacterError('invalid_player_id', 400,
    'Identificador de conta inválido.');
}
