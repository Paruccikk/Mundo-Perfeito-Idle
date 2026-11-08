import type {
  CharacterClassId,
  CharacterSummary,
  CombatSnapshot
} from '@mundo-perfeito/shared';
import { isAudioMuted, sfxClick, toggleAudioMuted } from '../audio';

export type HudConnectionState = 'connecting' | 'online' | 'offline';
export type HudFeedTone = 'normal' | 'gold' | 'danger' | 'boss';
export type HudBannerTone = 'gold' | 'level' | 'danger' | 'boss';

export interface GameHudOptions {
  character: CharacterSummary;
  onSwitch: () => void;
  onCharacter: () => void;
  onInventory: () => void;
  onTown: () => void;
  onMap: () => void;
  onSkills: () => void;
  onCastSkill: (skillId: string) => void;
  onUsePotion: (itemId: string) => void;
}

export interface GameHud {
  update(snapshot: CombatSnapshot): void;
  setLocation(name: string, label: string, safeZone?: boolean): void;
  setConnection(state: HudConnectionState): void;
  pushFeed(text: string, tone?: HudFeedTone): void;
  showBanner(title: string, subtitle?: string, tone?: HudBannerTone): void;
  destroy(): void;
}

const CLASS_GLYPHS: Record<CharacterClassId, string> = {
  warrior: '⚔',
  mage: '✦',
  archer: '➶',
  priest: '✚'
};

export function createGameHud(root: HTMLElement, options: GameHudOptions): GameHud {
  const { character, onSwitch, onCharacter, onInventory, onTown, onMap, onSkills, onCastSkill, onUsePotion } = options;

  const hud = el('div', 'hud');
  hud.setAttribute('aria-live', 'polite');

  // ---------- Cartão do jogador ----------
  const playerCard = el('div', 'hud__card hud__card--player');

  const crest = el('div', `hud__crest hud__crest--${character.classId}`);
  crest.append(el('span', 'hud__crest-glyph', CLASS_GLYPHS[character.classId]));

  const identity = el('div', 'hud__identity');
  const nameEl = el('strong', 'hud__name', character.name);
  const metaEl = el('span', 'hud__meta', `${character.className} • Nível ${character.level}`);
  identity.append(nameEl, metaEl);

  const bars = el('div', 'hud__bars');
  const hpBar = buildBar('HP', 'hp');
  const mpBar = buildBar('MP', 'mp');
  const xpBar = buildBar('XP', 'xp');
  bars.append(hpBar.root, mpBar.root, xpBar.root);

  playerCard.append(crest, identity, bars);

  // ---------- Cartão da fase ----------
  const stageCard = el('div', 'hud__card hud__card--stage');
  const stageEyebrow = el('p', 'hud__eyebrow', 'Fase 1');
  stageCard.append(stageEyebrow);

  const stageNameEl = el('strong', 'hud__stage-name', 'Clareira dos Aprendizes');
  const killsEl = el('span', 'hud__kills', '0 / 10 abates');
  const mobsEl = el('span', 'hud__kills', 'Criaturas vivas: 0');
  const targetEl = el('span', 'hud__kills', 'Alvo: —');
  const progressTrack = el('div', 'hud__progress-track');
  const progressFill = el('div', 'hud__progress-fill');
  progressTrack.append(progressFill);

  const stageBottom = el('div', 'hud__stage-bottom');
  const goldEl = el('span', 'hud__gold');
  goldEl.append(el('span', 'hud__coin', '◆'), el('b', 'hud__gold-value', '0'));
  const bossesEl = el('span', 'hud__bosses', 'Chefes: 0');
  stageBottom.append(goldEl, bossesEl);

  const farmEl = el('span', 'hud__farm', 'Farm: —');
  stageCard.append(stageNameEl, killsEl, mobsEl, targetEl, progressTrack, farmEl, stageBottom);

  // ---------- Barra do chefe ----------
  const bossBar = el('div', 'hud__boss');
  bossBar.hidden = true;

  const bossHead = el('div', 'hud__boss-head');
  const bossCrown = el('span', 'hud__boss-crown', '♛');
  const bossNameEl = el('strong', 'hud__boss-name', 'Rei Slime');
  const bossLevelEl = el('span', 'hud__boss-level', 'Nível 5');
  const bossHpEl = el('span', 'hud__boss-hp', '0 / 0');
  bossHead.append(bossCrown, bossNameEl, bossLevelEl, bossHpEl);

  const bossTrack = el('div', 'hud__boss-track');
  const bossFill = el('div', 'hud__boss-fill');
  bossTrack.append(bossFill);
  bossBar.append(bossHead, bossTrack);

  // ---------- Feed, banner e status ----------
  const feed = el('div', 'hud__feed');
  const banner = el('div', 'hud__banner');
  banner.hidden = true;

  const connection = el('div', 'hud__connection');
  connection.hidden = true;
  connection.append(el('span', 'hud__connection-dot'), el('span', 'hud__connection-text', 'Reconectando…'));

  const autoPill = el('div', 'hud__auto');
  autoPill.append(el('span', 'hud__auto-dot'), el('span', 'hud__auto-text', 'Combate automático'));

  const tools = el('div', 'hud__tools');
  const mapButton = el('button', 'ghost-button', 'Mapa') as HTMLButtonElement;
  mapButton.type = 'button';
  mapButton.addEventListener('click', () => {
    sfxClick();
    onMap();
  });
  const townButton = el('button', 'ghost-button', 'Cidade') as HTMLButtonElement;
  townButton.type = 'button';
  townButton.addEventListener('click', onTown);
  const switchButton = el('button', 'ghost-button', 'Trocar personagem') as HTMLButtonElement;
  switchButton.type = 'button';
  switchButton.addEventListener('click', onSwitch);
  const characterButton = el('button', 'ghost-button', 'Personagem') as HTMLButtonElement;
  characterButton.type = 'button';
  characterButton.addEventListener('click', onCharacter);
  const inventoryButton = el('button', 'ghost-button', 'Inventário') as HTMLButtonElement;
  inventoryButton.type = 'button';
  inventoryButton.addEventListener('click', onInventory);
  const skillsButton = el('button', 'ghost-button', 'Habilidades') as HTMLButtonElement;
  skillsButton.type = 'button';
  skillsButton.addEventListener('click', onSkills);
  const soundButton = el('button', 'ghost-button hud__sound', isAudioMuted() ? 'Som: mudo' : 'Som: ligado') as HTMLButtonElement;
  soundButton.type = 'button';
  soundButton.setAttribute('aria-pressed', isAudioMuted() ? 'false' : 'true');
  soundButton.addEventListener('click', () => {
    const nowMuted = toggleAudioMuted();
    soundButton.textContent = nowMuted ? 'Som: mudo' : 'Som: ligado';
    soundButton.setAttribute('aria-pressed', nowMuted ? 'false' : 'true');
    if (!nowMuted) sfxClick();
  });
  tools.append(mapButton, townButton, characterButton, inventoryButton, skillsButton, switchButton, soundButton);

  const hotbar = el('div', 'hud__hotbar');
  const skillSlots = Array.from({ length: 4 }, (_, index) => {
    const button = el('button', 'hud__slot hud__slot--skill') as HTMLButtonElement;
    button.type = 'button';
    button.hidden = true;
    button.addEventListener('click', () => { if (button.dataset.skillId) onCastSkill(button.dataset.skillId); });
    button.append(el('span', 'hud__slot-key', String(index + 1)), el('strong', 'hud__slot-name', '—'), el('small', 'hud__slot-meta', ''));
    hotbar.append(button);
    return button;
  });
  const hpPotion = el('button', 'hud__slot hud__slot--potion') as HTMLButtonElement;
  hpPotion.type = 'button'; hpPotion.textContent = 'HP · Poção'; hpPotion.title = 'Usar Poção de Vida';
  hpPotion.addEventListener('click', () => onUsePotion('small-potion'));
  const mpPotion = el('button', 'hud__slot hud__slot--potion') as HTMLButtonElement;
  mpPotion.type = 'button'; mpPotion.textContent = 'MP · Poção'; mpPotion.title = 'Usar Poção de Mana';
  mpPotion.addEventListener('click', () => onUsePotion('mp-potion'));
  hotbar.append(hpPotion, mpPotion);
  const handleHotkeys = (event: KeyboardEvent): void => {
    if (!['1', '2', '3', '4'].includes(event.key) || hotbar.hidden || root.querySelector('.game-panel-overlay')) return;
    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
    const button = skillSlots[Number(event.key) - 1];
    if (button && !button.hidden && !button.disabled) button.click();
  };
  window.addEventListener('keydown', handleHotkeys);

  hud.append(
    playerCard,
    stageCard,
    bossBar,
    feed,
    banner,
    connection,
    autoPill,
    hotbar,
    tools
  );
  root.append(hud);

  let lastLevel = 0;
  let levelTimer = 0;
  let bannerTimer = 0;

  hpBar.fill.style.width = '100%';
  hpBar.value.textContent = `${formatNumber(character.stats.maxHp)} / ${formatNumber(character.stats.maxHp)}`;
  mpBar.fill.style.width = '100%';
  mpBar.value.textContent = `${formatNumber(character.stats.maxMp)} / ${formatNumber(character.stats.maxMp)}`;
  xpBar.fill.style.width = '0%';
  goldEl.querySelector('.hud__gold-value')!.textContent = formatNumber(character.gold);
  metaEl.textContent = `${character.className} • Nível ${character.level}`;

  return {
    setLocation(name: string, label: string, safeZone = false): void {
      stageNameEl.textContent = name;
      stageEyebrow.textContent = label;
      hud.classList.toggle('hud--safe', safeZone);
      killsEl.hidden = safeZone;
      mobsEl.hidden = safeZone;
      targetEl.hidden = safeZone;
      progressTrack.hidden = safeZone;
      bossesEl.hidden = safeZone;
      farmEl.hidden = safeZone;
      bossBar.hidden = safeZone;
      autoPill.hidden = safeZone;
      hotbar.hidden = safeZone;
    },

    update(snapshot: CombatSnapshot): void {
      const summary = snapshot.character;
      const combat = snapshot.combat;

      nameEl.textContent = summary.name;
      metaEl.textContent = `${summary.className} • Nível ${summary.level}`;
      stageNameEl.textContent = combat.stageName;
      stageEyebrow.textContent = `${combat.stage.region} · Fase ${combat.stage.order + 1}`;
      farmEl.textContent = `Farm: ${combat.stage.farm.name}`;
      farmEl.hidden = false;

      const hpRatio = clampRatio(combat.playerHp / Math.max(1, combat.playerMaxHp));
      hpBar.fill.style.width = `${hpRatio * 100}%`;
      hpBar.value.textContent = `${formatNumber(combat.playerHp)} / ${formatNumber(combat.playerMaxHp)}`;
      hpBar.row.classList.toggle('is-low', hpRatio <= 0.3);

      const mpRatio = clampRatio(combat.playerMp / Math.max(1, combat.playerMaxMp));
      mpBar.fill.style.width = `${mpRatio * 100}%`;
      mpBar.value.textContent = `${formatNumber(combat.playerMp)} / ${formatNumber(combat.playerMaxMp)}`;

      const xpRatio = clampRatio(summary.experience / Math.max(1, summary.experienceToNextLevel));
      xpBar.fill.style.width = `${xpRatio * 100}%`;
      xpBar.value.textContent = `${formatNumber(summary.experience)} / ${formatNumber(summary.experienceToNextLevel)}`;

      goldEl.querySelector('.hud__gold-value')!.textContent = formatNumber(summary.gold);
      bossesEl.textContent = `Chefes: ${combat.bossDefeated}`;
      const aliveMobs = combat.monsters?.filter((monster) => monster.hp > 0).length ?? 1;
      mobsEl.textContent = `Criaturas vivas: ${aliveMobs}`;
      targetEl.textContent = `Alvo: ${combat.monster.name}`;

      const skills = combat.skills ?? [];
      skillSlots.forEach((button, index) => {
        const skill = skills[index];
        button.hidden = !skill;
        if (!skill) return;
        button.dataset.skillId = skill.id;
        const remaining = Math.ceil(skill.cooldownRemainingSeconds);
        button.querySelector('.hud__slot-name')!.textContent = skill.name;
        button.querySelector('.hud__slot-meta')!.textContent = !skill.unlocked ? `Nv. ${skill.requiredLevel}` : remaining > 0 ? `${remaining}s` : `${skill.manaCost} MP`;
        button.disabled = !skill.unlocked || remaining > 0 || combat.playerMp < skill.manaCost || combat.status !== 'fighting';
        button.title = `${skill.name} · ${skill.description}`;
      });

      const kills = combat.bossActive
        ? combat.killsRequiredForBoss
        : Math.min(combat.killsInStage, combat.killsRequiredForBoss);
      killsEl.textContent = combat.bossActive
        ? 'Chefe em combate'
        : `${kills} / ${combat.killsRequiredForBoss} abates`;
      progressFill.style.width = `${(kills / Math.max(1, combat.killsRequiredForBoss)) * 100}%`;
      progressFill.classList.toggle('is-boss', combat.bossActive);

      if (combat.bossActive) {
        const bossHp = clampRatio(combat.monster.hp / Math.max(1, combat.monster.maxHp));
        bossBar.hidden = false;
        bossNameEl.textContent = combat.monster.name;
        bossLevelEl.textContent = `Nível ${combat.monster.level}`;
        bossHpEl.textContent = `${formatNumber(combat.monster.hp)} / ${formatNumber(combat.monster.maxHp)}`;
        bossFill.style.width = `${bossHp * 100}%`;
      } else {
        bossBar.hidden = true;
      }

      const recovering = combat.status === 'recovering';
      autoPill.classList.toggle('is-recovering', recovering);
      autoPill.querySelector('.hud__auto-text')!.textContent = recovering
        ? 'Recuperando…'
        : 'Combate automático';

      if (lastLevel !== 0 && summary.level > lastLevel) {
        playerCard.classList.remove('is-leveling');
        void playerCard.offsetWidth;
        playerCard.classList.add('is-leveling');
        window.clearTimeout(levelTimer);
        levelTimer = window.setTimeout(() => {
          playerCard.classList.remove('is-leveling');
        }, 900);
      }
      lastLevel = summary.level;
    },

    setConnection(state: HudConnectionState): void {
      connection.hidden = state === 'online';
      const text = connection.querySelector('.hud__connection-text');
      if (text) {
        text.textContent =
          state === 'connecting' ? 'Conectando ao servidor…' : 'Reconectando ao servidor…';
      }
      connection.classList.toggle('is-connecting', state === 'connecting');
      hud.classList.toggle('is-offline', state === 'offline');
    },

    pushFeed(text: string, tone: HudFeedTone = 'normal'): void {
      const item = el('div', `hud__feed-item hud__feed-item--${tone}`, text);
      feed.prepend(item);

      while (feed.children.length > 5) {
        feed.lastElementChild?.remove();
      }

      window.setTimeout(() => {
        item.classList.add('is-leaving');
        window.setTimeout(() => item.remove(), 320);
      }, 4200);
    },

    showBanner(title: string, subtitle = '', tone: HudBannerTone = 'gold'): void {
      banner.className = `hud__banner hud__banner--${tone}`;
      banner.replaceChildren(
        el('strong', 'hud__banner-title', title),
        ...(subtitle ? [el('span', 'hud__banner-subtitle', subtitle)] : [])
      );
      banner.hidden = false;
      void banner.offsetWidth;
      banner.classList.add('is-visible');

      window.clearTimeout(bannerTimer);
      bannerTimer = window.setTimeout(() => {
        banner.classList.remove('is-visible');
        window.setTimeout(() => {
          banner.hidden = true;
        }, 260);
      }, tone === 'boss' ? 3400 : 2600);
    },

    destroy(): void {
      window.removeEventListener('keydown', handleHotkeys);
      window.clearTimeout(levelTimer);
      window.clearTimeout(bannerTimer);
      hud.remove();
    }
  };
}

function buildBar(label: string, tone: 'hp' | 'mp' | 'xp'): {
  root: HTMLElement;
  row: HTMLElement;
  fill: HTMLElement;
  value: HTMLElement;
} {
  const row = el('div', `hud__bar hud__bar--${tone}`);
  const labelEl = el('span', 'hud__bar-label', label);
  const track = el('div', 'hud__bar-track');
  const fill = el('div', 'hud__bar-fill');
  track.append(fill);
  const value = el('span', 'hud__bar-value', '—');
  row.append(labelEl, track, value);
  return { root: row, row, fill, value };
}

function clampRatio(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}

function formatNumber(value: number): string {
  return Math.round(value).toLocaleString('pt-BR');
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (className) {
    element.className = className;
  }
  if (text !== undefined) {
    element.textContent = text;
  }
  return element;
}
