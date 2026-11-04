import type {
  CharacterClassId,
  CharacterSummary,
  CombatSnapshot
} from '@mundo-perfeito/shared';

export type HudConnectionState = 'connecting' | 'online' | 'offline';
export type HudFeedTone = 'normal' | 'gold' | 'danger' | 'boss';
export type HudBannerTone = 'gold' | 'level' | 'danger' | 'boss';

export interface GameHudOptions {
  character: CharacterSummary;
  onSwitch: () => void;
  onCharacter: () => void;
  onInventory: () => void;
}

export interface GameHud {
  update(snapshot: CombatSnapshot): void;
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
  const { character, onSwitch, onCharacter, onInventory } = options;

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
  const xpBar = buildBar('XP', 'xp');
  bars.append(hpBar.root, xpBar.root);

  playerCard.append(crest, identity, bars);

  // ---------- Cartão da fase ----------
  const stageCard = el('div', 'hud__card hud__card--stage');
  stageCard.append(el('p', 'hud__eyebrow', 'Fase 1'));

  const stageNameEl = el('strong', 'hud__stage-name', 'Clareira dos Aprendizes');
  const killsEl = el('span', 'hud__kills', '0 / 10 abates');
  const progressTrack = el('div', 'hud__progress-track');
  const progressFill = el('div', 'hud__progress-fill');
  progressTrack.append(progressFill);

  const stageBottom = el('div', 'hud__stage-bottom');
  const goldEl = el('span', 'hud__gold');
  goldEl.append(el('span', 'hud__coin', '◆'), el('b', 'hud__gold-value', '0'));
  const bossesEl = el('span', 'hud__bosses', 'Chefes: 0');
  stageBottom.append(goldEl, bossesEl);

  stageCard.append(stageNameEl, killsEl, progressTrack, stageBottom);

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
  const switchButton = el('button', 'ghost-button', 'Trocar personagem') as HTMLButtonElement;
  switchButton.type = 'button';
  switchButton.addEventListener('click', onSwitch);
  const characterButton = el('button', 'ghost-button', 'Personagem') as HTMLButtonElement;
  characterButton.type = 'button';
  characterButton.addEventListener('click', onCharacter);
  const inventoryButton = el('button', 'ghost-button', 'Inventário') as HTMLButtonElement;
  inventoryButton.type = 'button';
  inventoryButton.addEventListener('click', onInventory);
  tools.append(characterButton, inventoryButton, switchButton);

  hud.append(
    playerCard,
    stageCard,
    bossBar,
    feed,
    banner,
    connection,
    autoPill,
    tools
  );
  root.append(hud);

  let lastLevel = 0;
  let levelTimer = 0;
  let bannerTimer = 0;

  hpBar.fill.style.width = '100%';
  xpBar.fill.style.width = '0%';
  goldEl.querySelector('.hud__gold-value')!.textContent = formatNumber(character.gold);
  metaEl.textContent = `${character.className} • Nível ${character.level}`;

  return {
    update(snapshot: CombatSnapshot): void {
      const summary = snapshot.character;
      const combat = snapshot.combat;

      nameEl.textContent = summary.name;
      metaEl.textContent = `${summary.className} • Nível ${summary.level}`;
      stageNameEl.textContent = combat.stageName;

      const hpRatio = clampRatio(combat.playerHp / Math.max(1, combat.playerMaxHp));
      hpBar.fill.style.width = `${hpRatio * 100}%`;
      hpBar.value.textContent = `${formatNumber(combat.playerHp)} / ${formatNumber(combat.playerMaxHp)}`;
      hpBar.row.classList.toggle('is-low', hpRatio <= 0.3);

      const xpRatio = clampRatio(summary.experience / Math.max(1, summary.experienceToNextLevel));
      xpBar.fill.style.width = `${xpRatio * 100}%`;
      xpBar.value.textContent = `${formatNumber(summary.experience)} / ${formatNumber(summary.experienceToNextLevel)}`;

      goldEl.querySelector('.hud__gold-value')!.textContent = formatNumber(summary.gold);
      bossesEl.textContent = `Chefes: ${combat.bossDefeated}`;

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
      window.clearTimeout(levelTimer);
      window.clearTimeout(bannerTimer);
      hud.remove();
    }
  };
}

function buildBar(label: string, tone: 'hp' | 'xp'): {
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
