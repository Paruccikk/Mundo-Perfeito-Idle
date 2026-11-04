import { ATTRIBUTE_POINTS_PER_LEVEL, CLASS_DEFINITIONS, MAX_LEVEL, experienceToNextLevel, statsForLevel } from './classes.js';
import { getMonster, getStage, nextNormalMonster } from './monsters.js';
import type { CharacterRecord, CombatEvent } from './types.js';

const STEP_SECONDS = 0.2;
const MAX_EVENTS = 60;
const HEAL_ON_KILL_RATIO = 0.2;
// Limite de progresso offline por sessão. Deve acompanhar /game/config.
const MAX_SIMULATION_SECONDS = 8 * 60 * 60;

export interface CombatSimulation {
  record: CharacterRecord;
  events: CombatEvent[];
  simulatedSeconds: number;
  drops: Array<{ itemId: string; quantity: number }>;
}

/**
 * Simula o combate automático do intervalo entre o último tick e `nowMs`.
 *
 * O cliente nunca envia dano, XP ou duração: ele apenas pede o estado, e o
 * servidor avança a simulação pelo tempo do relógio do servidor (limitado por
 * `maxSeconds` para evitar lotes gigantes).
 */
export function simulateCombat(
  record: CharacterRecord,
  nowMs: number,
  maxSeconds = MAX_SIMULATION_SECONDS
): CombatSimulation {
  const events: CombatEvent[] = [];
  const drops: Array<{ itemId: string; quantity: number }> = [];
  const lastTickMs = Date.parse(record.combat.lastTickAt);
  const elapsedRaw = Number.isFinite(lastTickMs) ? (nowMs - lastTickMs) / 1000 : 0;
  const elapsed = Math.min(Math.max(elapsedRaw, 0), maxSeconds);

  if (elapsed <= 0 || record.combat.status === 'dead') {
    return {
      record,
      events,
      simulatedSeconds: 0,
      drops
    };
  }

  const stage = getStage(record.combat.stageId);
  const classDefinition = CLASS_DEFINITIONS[record.classId];

  let level = record.level;
  let experience = record.experience;
  let gold = record.gold;
  let stats = statsForLevel(record.classId, level, record.attributes, record.equipmentBonuses);
  let attributePoints = record.attributePoints;

  let monsterId = record.combat.monsterId;
  let monster = getMonster(monsterId);
  let monsterHp = Math.min(record.combat.monsterHp, monster.maxHp);

  let playerHp = Math.min(Math.max(record.combat.playerHp, 0), stats.maxHp);
  if (playerHp <= 0 && record.combat.status !== 'dead') playerHp = stats.maxHp;
  let playerMp = Math.min(Math.max(record.combat.playerMp ?? stats.maxMp, 0), stats.maxMp);

  let killsInStage = record.combat.killsInStage;
  let bossActive = record.combat.bossActive;
  let bossDefeated = record.combat.bossDefeated;

  let status = playerHp > 0 ? record.combat.status : 'fighting';
  let recoveryLeft = record.combat.recoveringUntil
    ? Math.max(0, (Date.parse(record.combat.recoveringUntil) - lastTickMs) / 1000)
    : 0;

  let simulated = 0;
  let playerCooldown = Math.max(0, record.combat.playerCooldownSeconds);
  let monsterCooldown = Math.max(0, record.combat.monsterCooldownSeconds);

  const pushEvent = (event: CombatEvent): void => {
    events.push(event);
    if (events.length > MAX_EVENTS) {
      events.shift();
    }
  };

  while (simulated < elapsed) {
    const dt = Math.min(STEP_SECONDS, elapsed - simulated);
    simulated += dt;

    if (recoveryLeft > 0) {
      recoveryLeft = Math.max(0, recoveryLeft - dt);
      if (recoveryLeft === 0) {
        status = 'fighting';
        playerCooldown = 0;
        monsterCooldown = 0.5;
      }
      continue;
    }

    status = 'fighting';
    playerCooldown -= dt;
    monsterCooldown -= dt;

    // Ataque do jogador
    if (playerCooldown <= 0) {
      const attacksPerSecond = stats.attacksPerSecond > 0 ? stats.attacksPerSecond : 1;
      playerCooldown += 1 / attacksPerSecond;

      const critical = Math.random() < stats.critChance;
      const usesMagic = record.classId === 'mage' || record.classId === 'priest';
      const baseDamage = usesMagic ? stats.magicDamage : stats.physicalDamage;
      const rawAttack = critical ? baseDamage * stats.critMultiplier : baseDamage;
      const damage = Math.max(1, Math.round(rawAttack - monster.defense));

      monsterHp -= damage;
      pushEvent({
        type: critical ? 'player_crit' : 'player_hit',
        amount: damage
      });

      if (monsterHp <= 0) {
        const defeated = monster;
        pushEvent({
          type: 'kill',
          amount: defeated.experienceReward,
          message: defeated.name
        });

        gold += defeated.goldReward;
        if (Math.random() < (defeated.isBoss ? 1 : 0.22)) {
          const dropId = defeated.id === 'boar' ? 'boar-hide'
            : defeated.id === 'wolf' ? 'wolf-pelt' : 'slime-gel';
          drops.push({ itemId: dropId, quantity: 1 });
          pushEvent({ type: 'item_drop', amount: 1, message: dropId });
        }
        if (!defeated.isBoss && Math.random() < 0.06) drops.push({ itemId: 'small-potion', quantity: 1 });
        if (!defeated.isBoss && Math.random() < 0.04) drops.push({ itemId: 'mp-potion', quantity: 1 });
        if (defeated.isBoss && Math.random() < 0.35) drops.push({ itemId: 'revive-potion', quantity: 1 });
        playerHp = Math.min(stats.maxHp, playerHp + Math.round(stats.maxHp * HEAL_ON_KILL_RATIO));

        experience += defeated.experienceReward;
        while (level < MAX_LEVEL && experience >= experienceToNextLevel(level)) {
          experience -= experienceToNextLevel(level);
          level += 1;
          attributePoints += ATTRIBUTE_POINTS_PER_LEVEL;
          stats = statsForLevel(record.classId, level, record.attributes, record.equipmentBonuses);
          playerHp = stats.maxHp;
          pushEvent({ type: 'level_up', message: `Nível ${level}` });
        }

        if (defeated.isBoss) {
          bossActive = false;
          bossDefeated += 1;
          killsInStage = 0;
          pushEvent({ type: 'boss_defeated', message: defeated.name });
        } else {
          killsInStage += 1;
          if (killsInStage >= stage.killsRequiredForBoss) {
            bossActive = true;
            monsterId = stage.bossId;
            pushEvent({ type: 'boss_spawn', message: getMonster(stage.bossId).name });
          }
        }

        if (!bossActive) {
          monsterId = nextNormalMonster(stage, killsInStage);
        }

        monster = getMonster(monsterId);
        monsterHp = monster.maxHp;
        monsterCooldown = 0.5;
      }
    }

    // Ataque do monstro
    if (monsterCooldown <= 0 && monsterHp > 0) {
      const attacksPerSecond = monster.attacksPerSecond > 0 ? monster.attacksPerSecond : 1;
      monsterCooldown += 1 / attacksPerSecond;

      const usesMagic = record.classId === 'mage' || record.classId === 'priest';
      const playerDefense = usesMagic ? stats.magicDefense : stats.physicalDefense;
      const damage = Math.max(1, Math.round(monster.attack - playerDefense));
      playerHp -= damage;
      pushEvent({ type: 'monster_hit', amount: damage });

      if (playerHp <= 0) {
        playerHp = 0;
        pushEvent({ type: 'player_death', message: classDefinition.name });
        status = 'dead';
        recoveryLeft = 0;
        playerCooldown = 0;
        monsterCooldown = 0;
        break;
      }
    }
  }

  const updated: CharacterRecord = {
    ...record,
    level,
    attributePoints,
    experience,
    gold,
    combat: {
      stageId: record.combat.stageId,
      monsterId,
      monsterHp: Math.max(1, Math.round(monsterHp)),
      playerHp: Math.max(0, Math.round(playerHp)),
      playerMp: Math.max(0, Math.round(playerMp)),
      killsInStage,
      bossActive,
      bossDefeated,
      status,
      playerCooldownSeconds: Math.max(0, playerCooldown),
      monsterCooldownSeconds: Math.max(0, monsterCooldown),
      recoveringUntil:
        recoveryLeft > 0 ? new Date(nowMs + recoveryLeft * 1000).toISOString() : null,
      lastTickAt: new Date(nowMs).toISOString()
    }
  };

  return {
    record: updated,
    events,
    simulatedSeconds: elapsed,
    drops
  };
}
