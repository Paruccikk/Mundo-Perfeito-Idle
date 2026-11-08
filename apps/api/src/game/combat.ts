import { ATTRIBUTE_POINTS_PER_LEVEL, CLASS_DEFINITIONS, MAX_LEVEL, experienceToNextLevel, statsForLevel } from './classes.js';
import { MATERIAL_ITEMS, TROPHY_ITEMS, getMonster, getStage, nextNormalMonster } from './monsters.js';
import type { CharacterRecord, CombatEvent } from './types.js';

const STEP_SECONDS = 0.2;
const MAX_EVENTS = 60;
const HEAL_ON_KILL_RATIO = 0.2;
const CONSUMABLE_NAMES: Record<string, string> = {
  'small-potion': 'Poção de Vida Pequena',
  'mp-potion': 'Poção de Mana Pequena',
  'revive-potion': 'Poção da Ressurreição'
};
// O combate só avança enquanto a sessão estiver ativa. A tolerância cobre
// requisições atrasadas e o throttling de timers em abas minimizadas.
export const ACTIVE_SESSION_GRACE_SECONDS = 90;

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
 * servidor avança a simulação pelo tempo do relógio do servidor. O intervalo
 * é limitado a `maxSeconds` para que fechar o jogo não gere farm offline:
 * só há avanço enquanto o cliente continua consultando o servidor.
 */
function createPack(stage: ReturnType<typeof getStage>, nowMs: number, delayed = false) {
  const ids = stage.monsterIds.length ? stage.monsterIds : [nextNormalMonster(stage, 0)];
  return Array.from({ length: 6 }, (_, index) => {
    const monsterId = ids[index % ids.length]!;
    const monster = getMonster(monsterId);
    return {
      slotId: `mob-${index + 1}`,
      monsterId,
      hp: delayed ? 0 : monster.maxHp,
      respawnAt: delayed ? new Date(nowMs + 5000).toISOString() : null
    };
  });
}

export function simulateCombat(
  record: CharacterRecord,
  nowMs: number,
  maxSeconds = ACTIVE_SESSION_GRACE_SECONDS
): CombatSimulation {
  const events: CombatEvent[] = [];
  const drops: Array<{ itemId: string; quantity: number }> = [];
  const lastTickMs = Date.parse(record.combat.lastTickAt);
  const elapsedRaw = Number.isFinite(lastTickMs) ? (nowMs - lastTickMs) / 1000 : 0;
  const elapsed = Math.min(Math.max(elapsedRaw, 0), maxSeconds);

  if (elapsed <= 0 || record.combat.status === 'dead') {
    return { record, events, simulatedSeconds: 0, drops };
  }

  const stage = getStage(record.combat.stageId);
  const classDefinition = CLASS_DEFINITIONS[record.classId];
  let level = record.level;
  let experience = record.experience;
  let gold = record.gold;
  let stats = statsForLevel(record.classId, level, record.attributes, record.equipmentBonuses);
  let attributePoints = record.attributePoints;
  let playerHp = Math.min(Math.max(record.combat.playerHp, 0), stats.maxHp);
  if (playerHp <= 0) playerHp = stats.maxHp;
  let playerMp = Math.min(Math.max(record.combat.playerMp ?? stats.maxMp, 0), stats.maxMp);
  let killsInStage = record.combat.killsInStage;
  let bossActive = record.combat.bossActive;
  let bossDefeated = record.combat.bossDefeated;
  let status: CharacterRecord['combat']['status'] = record.combat.status;
  let recoveryLeft = record.combat.recoveringUntil
    ? Math.max(0, (Date.parse(record.combat.recoveringUntil) - lastTickMs) / 1000)
    : 0;
  let simulated = 0;
  let playerCooldown = Math.max(0, record.combat.playerCooldownSeconds);
  let monsterCooldown = Math.max(0, record.combat.monsterCooldownSeconds);
  let pack = record.combat.pack?.length ? record.combat.pack.map((entry) => ({ ...entry })) : createPack(stage, lastTickMs);
  if (!record.combat.pack) {
    const legacy = pack[0]!;
    legacy.monsterId = record.combat.monsterId;
    legacy.hp = Math.max(1, Math.min(record.combat.monsterHp, getMonster(legacy.monsterId).maxHp));
  }
  let targetIndex = Math.max(0, Math.min(pack.length - 1, record.combat.targetIndex ?? 0));

  const pushEvent = (event: CombatEvent): void => {
    events.push(event);
    if (events.length > MAX_EVENTS) events.shift();
  };
  const activeIndex = (): number => {
    const current = pack[targetIndex];
    if (current && current.hp > 0) return targetIndex;
    for (let offset = 1; offset <= pack.length; offset += 1) {
      const index = (targetIndex + offset) % pack.length;
      if (pack[index]!.hp > 0) return index;
    }
    return -1;
  };
  const resetToRegularPack = (atMs: number): void => {
    pack = createPack(stage, atMs, true);
    targetIndex = 0;
    monsterCooldown = 0.5;
  };
  const pushDrop = (itemId: string, quantity = 1): void => {
    drops.push({ itemId, quantity });
    const definition = MATERIAL_ITEMS[itemId] ?? TROPHY_ITEMS[itemId];
    pushEvent({ type: 'item_drop', amount: quantity, message: definition?.name ?? CONSUMABLE_NAMES[itemId] ?? itemId });
  };

  while (simulated < elapsed) {
    const dt = Math.min(STEP_SECONDS, elapsed - simulated);
    simulated += dt;
    const nowAtStep = lastTickMs + simulated * 1000;

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
    for (const entry of pack) {
      if (entry.hp <= 0 && entry.respawnAt && Date.parse(entry.respawnAt) <= nowAtStep) {
        entry.hp = getMonster(entry.monsterId).maxHp;
        entry.respawnAt = null;
      }
    }
    let selectedIndex = activeIndex();
    if (selectedIndex >= 0 && selectedIndex !== targetIndex) {
      targetIndex = selectedIndex;
      monsterCooldown = 0.5;
    }
    playerCooldown -= dt;
    monsterCooldown -= dt;

    if (selectedIndex >= 0 && playerCooldown <= 0) {
      const target = pack[selectedIndex]!;
      const monster = getMonster(target.monsterId);
      playerCooldown += 1 / Math.max(0.1, stats.attacksPerSecond);
      const critical = Math.random() < stats.critChance;
      const usesMagic = record.classId === 'mage' || record.classId === 'priest';
      const canCastMagic = usesMagic && playerMp >= 3;
      if (canCastMagic) playerMp -= 3;
      const baseDamage = canCastMagic ? stats.magicDamage : stats.physicalDamage;
      const damage = Math.max(1, Math.round((critical ? baseDamage * stats.critMultiplier : baseDamage) - monster.defense));
      target.hp = Math.max(0, target.hp - damage);
      pushEvent({ type: critical ? 'player_crit' : 'player_hit', amount: damage, message: target.slotId });

      if (target.hp <= 0) {
        target.respawnAt = new Date(nowAtStep + 5000).toISOString();
        const defeated = monster;
        pushEvent({ type: 'kill', amount: defeated.experienceReward, message: defeated.name });
        gold += defeated.goldReward;
        if (defeated.materialId && Math.random() < (defeated.dropChance ?? (defeated.isBoss ? 1 : 0.22))) pushDrop(defeated.materialId);
        if (defeated.trophyId) pushDrop(defeated.trophyId);
        if (!defeated.isBoss && Math.random() < 0.06) pushDrop('small-potion');
        if ((record.classId === 'mage' || record.classId === 'priest') && !defeated.isBoss && Math.random() < 0.04) pushDrop('mp-potion');
        if (defeated.isBoss && Math.random() < 0.35) pushDrop('revive-potion');
        playerHp = Math.min(stats.maxHp, playerHp + Math.round(stats.maxHp * HEAL_ON_KILL_RATIO));
        experience += defeated.experienceReward;
        while (level < MAX_LEVEL && experience >= experienceToNextLevel(level)) {
          experience -= experienceToNextLevel(level);
          level += 1;
          attributePoints += ATTRIBUTE_POINTS_PER_LEVEL;
          stats = statsForLevel(record.classId, level, record.attributes, record.equipmentBonuses);
          playerHp = stats.maxHp;
          playerMp = stats.maxMp;
          pushEvent({ type: 'level_up', message: `Nível ${level}` });
        }

        if (defeated.isBoss) {
          bossActive = false;
          bossDefeated += 1;
          killsInStage = 0;
          pushEvent({ type: 'boss_defeated', message: defeated.name });
          resetToRegularPack(nowAtStep);
        } else {
          killsInStage += 1;
          if (killsInStage >= stage.killsRequiredForBoss) {
            bossActive = true;
            const boss = getMonster(stage.bossId);
            pack = [{ slotId: 'boss-1', monsterId: boss.id, hp: boss.maxHp, respawnAt: null }];
            targetIndex = 0;
            pushEvent({ type: 'boss_spawn', message: boss.name });
          } else {
            const nextIndex = activeIndex();
            if (nextIndex >= 0) {
              targetIndex = nextIndex;
              monsterCooldown = 0.5;
            }
          }
        }
      }
    }

    selectedIndex = activeIndex();
    if (selectedIndex >= 0) {
      targetIndex = selectedIndex;
      const target = pack[selectedIndex]!;
      const monster = getMonster(target.monsterId);
      if (monsterCooldown <= 0) {
        monsterCooldown += 1 / Math.max(0.1, monster.attacksPerSecond);
        const usesMagic = record.classId === 'mage' || record.classId === 'priest';
        const defense = usesMagic ? stats.magicDefense : stats.physicalDefense;
        const damage = Math.max(1, Math.round(monster.attack - defense));
        playerHp -= damage;
        pushEvent({ type: 'monster_hit', amount: damage, message: target.slotId });
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
  }

  const selectedIndex = activeIndex();
  const selected = selectedIndex >= 0 ? pack[selectedIndex]! : pack[targetIndex]!;
  if (selectedIndex >= 0) targetIndex = selectedIndex;
  const updated: CharacterRecord = {
    ...record,
    level, attributePoints, experience, gold,
    currentStageId: stage.id,
    combat: {
      ...record.combat,
      stageId: stage.id,
      monsterId: selected.monsterId,
      monsterHp: Math.max(0, Math.round(selected.hp)),
      pack,
      targetIndex,
      playerHp: Math.max(0, Math.round(playerHp)),
      playerMp: Math.max(0, Math.round(playerMp)),
      killsInStage, bossActive, bossDefeated, status,
      playerCooldownSeconds: Math.max(0, playerCooldown),
      monsterCooldownSeconds: Math.max(0, monsterCooldown),
      recoveringUntil: recoveryLeft > 0 ? new Date(nowMs + recoveryLeft * 1000).toISOString() : null,
      lastTickAt: new Date(nowMs).toISOString()
    }
  };
  return { record: updated, events, simulatedSeconds: elapsed, drops };
}
