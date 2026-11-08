import { randomUUID } from 'node:crypto';
import {
  CLASS_DEFINITIONS, CHARACTER_CLASS_IDS,
  experienceToNextLevel, statsForLevel
} from './classes.js';
import type { CharacterRepository } from './characterRepository.js';
import { simulateCombat } from './combat.js';
import { findSkill, skillsForClass, skillLevelFor } from './skills.js';
import {
  STAGE_ONE, STAGES, getMonster, getStage, isStageUnlocked, nextNormalMonster, stageCatalog,
  type StageCatalog
} from './monsters.js';
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

  listStages(): StageCatalog {
    return stageCatalog();
  }

  async travel(id: string, playerId: unknown, stageId: string): Promise<CombatSnapshot> {
    assertPlayerId(playerId);
    const stage = STAGES[stageId];
    if (!stage) throw new CharacterError('stage_not_found', 404, 'Essa fase não existe nos mapas do reino.');
    let record = await this.findOwned(id, playerId);
    if (record.combat.status === 'dead') {
      throw new CharacterError('character_dead', 400, 'Seu personagem foi derrotado. Ressuscite antes de viajar.');
    }
    if (!isStageUnlocked(stage, record.level)) {
      throw new CharacterError('stage_locked', 403,
        `Esta fase recomenda nível ${stage.recommendedLevel}. Continue treinando para desbloqueá-la.`);
    }
    if (record.combat.stageId === stage.id) {
      return toCombatSnapshot(record, [], 0);
    }

    // Consolida o combate pendente antes de trocar de fase, para que a viagem
    // não descarte XP, ouro ou drops acumulados desde o último tick.
    const simulation = simulateCombat(record, Date.now());
    if (simulation.simulatedSeconds > 0) {
      const drops = simulation.drops.map((drop, index) => ({
        ...drop,
        operationId: `drop:${id}:${record.combat.lastTickAt}:${index}`
      }));
      await this.repository.save(simulation.record, record.combat.lastTickAt, drops);
      record = await this.findOwned(id, playerId);
    }
    if (record.combat.status === 'dead') {
      throw new CharacterError('character_dead', 400, 'Seu personagem foi derrotado durante o combate. Ressuscite antes de viajar.');
    }
    if (!isStageUnlocked(stage, record.level)) {
      throw new CharacterError('stage_locked', 403,
        `Esta fase recomenda nível ${stage.recommendedLevel}. Continue treinando para desbloqueá-la.`);
    }
    if (record.combat.stageId === stage.id) {
      return toCombatSnapshot(record, [], 0);
    }

    const updated = await this.repository.travel(id, playerId, stage.id);
    if (!updated) throw new CharacterError('character_not_found', 404, 'Personagem não encontrado.');
    return toCombatSnapshot(updated, [], 0);
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
        pack: Array.from({ length: 6 }, (_, index) => { const monsterId = STAGE_ONE.monsterIds[index % STAGE_ONE.monsterIds.length]!; return { slotId: `mob-${index + 1}`, monsterId, hp: getMonster(monsterId).maxHp, respawnAt: null }; }), targetIndex: 0,
        playerHp: stats.maxHp, playerMp: stats.maxMp, killsInStage: 0, bossActive: false, bossDefeated: 0,
        skillPoints: 0, skillLevels: { [skillsForClass(payload.classId)[0]!.id]: 1 }, skillCooldowns: {}, pendingSkillMultiplier: 1, pendingSkillId: null,
        status: 'fighting', playerCooldownSeconds: 0, monsterCooldownSeconds: 0,
        recoveringUntil: null, lastTickAt: now
      },
      createdAt: now
    };
    await this.repository.create(record);
    return toSummary(record);
  }

  async upgradeSkill(id: string, playerId: unknown, skillId: string): Promise<CombatSnapshot> {
    assertPlayerId(playerId);
    const record = await this.findOwned(id, playerId);
    const definition = findSkill(record.classId, skillId);
    if (!definition) throw new CharacterError('skill_not_found', 404, 'Essa habilidade não pertence à sua classe.');
    const firstSkillId = skillsForClass(record.classId)[0]!.id;
    const levels = { ...(record.combat.skillLevels ?? { [firstSkillId]: 1 }) };
    const currentLevel = skillLevelFor(levels, skillId);
    if (currentLevel >= definition.maxLevel) throw new CharacterError('skill_max_level', 400, 'Essa habilidade já está no nível máximo.');
    const requiredLevel = currentLevel === 0 ? definition.requiredLevel : Math.max(definition.requiredLevel, (currentLevel + 1) * 5);
    if (record.level < requiredLevel) throw new CharacterError('skill_level_required', 400, `Você precisa alcançar o nível ${requiredLevel} para evoluir essa habilidade.`);
    if ((record.combat.skillPoints ?? Math.floor(record.level / 5)) < 1) throw new CharacterError('no_skill_points', 400, 'Você não possui pontos de habilidade disponíveis.');
    const expected = record.combat.lastTickAt;
    const now = new Date().toISOString();
    record.combat = {
      ...record.combat,
      skillPoints: (record.combat.skillPoints ?? Math.floor(record.level / 5)) - 1,
      skillLevels: { ...levels, [skillId]: currentLevel + 1 },
      lastTickAt: now
    };
    if (!await this.repository.save(record, expected)) {
      throw new CharacterError('combat_busy', 409, 'O personagem está sendo atualizado. Tente novamente.');
    }
    return toCombatSnapshot(record, [], 0);
  }

  async castSkill(id: string, playerId: unknown, skillId: string): Promise<CombatSnapshot> {
    assertPlayerId(playerId);
    let record = await this.findOwned(id, playerId);
    if (record.combat.status !== 'fighting') throw new CharacterError('character_unavailable', 400, 'Só é possível usar habilidades durante o combate.');
    const simulation = simulateCombat(record, Date.now());
    if (simulation.simulatedSeconds > 0) {
      const drops = simulation.drops.map((drop, index) => ({
        ...drop, operationId: `drop:${id}:${record.combat.lastTickAt}:${index}`
      }));
      if (!await this.repository.save(simulation.record, record.combat.lastTickAt, drops)) {
        throw new CharacterError('combat_busy', 409, 'O personagem está sendo atualizado. Tente novamente.');
      }
      record = simulation.record;
    }
    if (record.combat.status !== 'fighting') throw new CharacterError('character_unavailable', 400, 'Seu personagem não pode usar habilidades neste momento.');
    const definition = findSkill(record.classId, skillId);
    if (!definition) throw new CharacterError('skill_not_found', 404, 'Essa habilidade não pertence à sua classe.');
    const firstSkillId = skillsForClass(record.classId)[0]!.id;
    const skillLevel = skillLevelFor(record.combat.skillLevels ?? { [firstSkillId]: 1 }, skillId);
    if (skillLevel < 1) throw new CharacterError('skill_locked', 400, 'Essa habilidade ainda está bloqueada. Evolua seu personagem e a árvore de habilidades.');
    const nowMs = Date.now();
    const cooldownUntil = record.combat.skillCooldowns?.[skillId] ?? 0;
    if (cooldownUntil > nowMs) {
      const seconds = Math.ceil((cooldownUntil - nowMs) / 1000);
      throw new CharacterError('skill_cooldown', 400, `A habilidade estará pronta em ${seconds}s.`);
    }
    const stats = statsForLevel(record.classId, record.level, record.attributes, record.equipmentBonuses);
    if ((record.combat.playerMp ?? stats.maxMp) < definition.manaCost) {
      throw new CharacterError('not_enough_mana', 400, 'Mana insuficiente para usar essa habilidade.');
    }
    const rankMultiplier = 1 + (skillLevel - 1) * 0.22;
    let playerHp = record.combat.playerHp;
    let pendingSkillMultiplier = record.combat.pendingSkillMultiplier ?? 1;
    if (definition.effect === 'damage') {
      pendingSkillMultiplier = Math.max(pendingSkillMultiplier, definition.multiplier * rankMultiplier);
    } else {
      const healing = Math.round(stats.maxHp * definition.multiplier * rankMultiplier);
      playerHp = Math.min(stats.maxHp, playerHp + healing);
    }
    const expectedSaveAt = record.combat.lastTickAt;
    const now = new Date(nowMs).toISOString();
    record.combat = {
      ...record.combat,
      playerHp,
      playerMp: Math.max(0, (record.combat.playerMp ?? stats.maxMp) - definition.manaCost),
      pendingSkillMultiplier,
      pendingSkillId: definition.effect === 'damage' ? skillId : record.combat.pendingSkillId ?? null,
      skillCooldowns: { ...(record.combat.skillCooldowns ?? {}), [skillId]: nowMs + definition.cooldownSeconds * 1000 },
      lastTickAt: now
    };

    let combatEvents: CombatEvent[] = [];
    let drops: Array<{ itemId: string; quantity: number; operationId: string }> = [];
    if (definition.effect === 'damage') {
      // Resolve um tick autoritativo imediatamente para a magia causar dano
      // agora, sem depender do próximo ciclo automático de ataque.
      const attackRecord: CharacterRecord = {
        ...record,
        combat: {
          ...record.combat,
          playerCooldownSeconds: 0,
          monsterCooldownSeconds: Math.max(0.5, record.combat.monsterCooldownSeconds),
          lastTickAt: new Date(nowMs - 200).toISOString()
        }
      };
      const skillSimulation = simulateCombat(attackRecord, nowMs, 1);
      record = skillSimulation.record;
      combatEvents = skillSimulation.events;
      drops = skillSimulation.drops.map((drop, index) => ({
        ...drop,
        operationId: `skill-drop:${id}:${expectedSaveAt}:${index}`
      }));
    }

    if (!await this.repository.save(record, expectedSaveAt, drops)) {
      throw new CharacterError('combat_busy', 409, 'O personagem está sendo atualizado. Tente novamente.');
    }
    const skillEvent: CombatEvent = {
      type: 'skill_cast',
      amount: definition.effect === 'damage'
        ? Math.round((record.classId === 'mage' || record.classId === 'priest' ? stats.magicDamage : stats.physicalDamage) * definition.multiplier * rankMultiplier)
        : Math.round(stats.maxHp * definition.multiplier * rankMultiplier),
      message: skillId
    };
    return toCombatSnapshot(record, [skillEvent, ...combatEvents], 0);
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
        const stageExists = Object.prototype.hasOwnProperty.call(STAGES, record.combat.stageId);
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

  /**
   * Sincroniza o personagem ao entrar na cidade sem simular combate.
   * Uma morte que ficou pendente no servidor (queda de conexão, recarregamento)
   * é resolvida aqui, devolvendo o herói ao convívio urbano com a vida cheia.
   */
  async enterTown(id: string, playerId: unknown): Promise<CombatSnapshot> {
    assertPlayerId(playerId);
    let record = await this.findOwned(id, playerId);
    if (record.combat.status === 'dead') {
      const stats = statsForLevel(record.classId, record.level, record.attributes, record.equipmentBonuses);
      const resolved = await this.repository.resolveDeath(id, playerId, stats.maxHp, stats.maxMp, false);
      if (!resolved.record) throw new CharacterError('character_not_found', 404, 'Personagem não encontrado.');
      record = resolved.record;
    }
    return toCombatSnapshot(record, [], 0);
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
  const legacyMonster = getMonster(record.combat.monsterId);
  const pack = record.combat.pack?.length ? record.combat.pack : Array.from({ length: 6 }, (_, index) => {
    const monsterId = index === 0
      ? record.combat.monsterId
      : stage.monsterIds[(index - 1) % stage.monsterIds.length]!;
    return {
      slotId: `mob-${index + 1}`,
      monsterId,
      hp: index === 0 ? record.combat.monsterHp : getMonster(monsterId).maxHp,
      respawnAt: null
    };
  });
  const targetIndex = Math.max(0, Math.min(pack.length - 1, record.combat.targetIndex ?? 0));
  const selectedIndex = (pack[targetIndex]?.hp ?? 0) > 0
    ? targetIndex
    : (() => { for (let offset = 1; offset <= pack.length; offset += 1) { const index = (targetIndex + offset) % pack.length; if (pack[index]!.hp > 0) return index; } return targetIndex; })();
  const selected = pack[selectedIndex]!;
  const monster = getMonster(selected.monsterId ?? legacyMonster.id);
  const now = Date.now();
  const monsters = pack.map((entry, index) => {
    const definition = getMonster(entry.monsterId);
    return {
      ...definition,
      hp: Math.max(0, entry.hp),
      slotId: entry.slotId,
      respawnInSeconds: entry.respawnAt ? Math.max(0, (Date.parse(entry.respawnAt) - now) / 1000) : 0,
      isTarget: index === selectedIndex && entry.hp > 0
    };
  });
  return {
    character: summary,
    combat: {
      stageId: stage.id, stageName: stage.name, stage,
      monster: { ...monster, hp: Math.max(0, selected.hp) },
      monsters,
      playerHp: Math.max(0, record.combat.playerHp), playerMaxHp: summary.stats.maxHp,
      playerMp: Math.max(0, record.combat.playerMp ?? summary.stats.maxMp), playerMaxMp: summary.stats.maxMp,
      killsInStage: record.combat.killsInStage, killsRequiredForBoss: stage.killsRequiredForBoss,
      bossActive: record.combat.bossActive, bossDefeated: record.combat.bossDefeated, status: record.combat.status,
      skillPoints: record.combat.skillPoints ?? Math.floor(record.level / 5),
      skills: skillsForClass(record.classId).map((definition) => {
        const firstSkillId = skillsForClass(record.classId)[0]!.id;
        const levels = record.combat.skillLevels ?? { [firstSkillId]: 1 };
        const currentLevel = skillLevelFor(levels, definition.id);
        const requiredLevel = currentLevel === 0 ? definition.requiredLevel : Math.max(definition.requiredLevel, (currentLevel + 1) * 5);
        return { ...definition, level: currentLevel, requiredLevel, unlocked: currentLevel > 0, cooldownRemainingSeconds: Math.max(0, ((record.combat.skillCooldowns?.[definition.id] ?? 0) - now) / 1000), special: Boolean(definition.special) };
      })
    },
    events, simulatedSeconds
  };
}

function assertPlayerId(playerId: unknown): asserts playerId is string {
  if (!isValidPlayerId(playerId)) throw new CharacterError('invalid_player_id', 400,
    'Identificador de conta inválido.');
}
