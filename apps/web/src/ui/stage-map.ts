import type {
  CharacterSummary,
  CombatSnapshot,
  EnvironmentId,
  StageCatalog,
  StageCatalogEntry
} from '@mundo-perfeito/shared';
import { ApiError, api } from '../api';
import { sfxClick, sfxTravel } from '../audio';

const ENVIRONMENT_LABEL: Record<EnvironmentId, string> = {
  forest: 'Bosque',
  ruins: 'Ruínas',
  swamp: 'Pântano',
  desert: 'Deserto',
  ice: 'Gelo',
  volcano: 'Vulcão',
  abyss: 'Abismo',
  sky: 'Céus',
  void: 'Vazio',
  legend: 'Lenda'
};

const ENVIRONMENT_GLYPH: Record<EnvironmentId, string> = {
  forest: '♣',
  ruins: '⌂',
  swamp: '≈',
  desert: '☀',
  ice: '❄',
  volcano: '▲',
  abyss: '☠',
  sky: '☁',
  void: '✦',
  legend: '♛'
};

const RARITY_LABEL: Record<string, string> = {
  common: 'Comum',
  uncommon: 'Incomum',
  rare: 'Raro',
  epic: 'Épico',
  legendary: 'Lendário',
  mythic: 'Mítico'
};

export interface StageMapOptions {
  character: CharacterSummary;
  currentStageId: string;
  onTravel: (snapshot: CombatSnapshot) => void;
  onClose?: () => void;
}

let activeOverlay: HTMLElement | null = null;
let activeCleanup: (() => void) | null = null;

export function closeStageMap(): void {
  activeCleanup?.();
  activeCleanup = null;
  activeOverlay?.remove();
  activeOverlay = null;
}

export function openStageMap(options: StageMapOptions): void {
  closeStageMap();
  const root = document.getElementById('ui-root');
  if (!root) return;

  const overlay = el('section', 'stage-map-overlay');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Mapa do reino');

  const panel = el('div', 'stage-map');
  const header = el('header', 'stage-map__header');
  const headingWrap = el('div', 'stage-map__heading');
  const crest = el('div', 'stage-map__crest', '✦');
  const titleWrap = el('div');
  titleWrap.append(
    el('p', 'stage-map__eyebrow', 'Cartografia de Valedouro'),
    el('h2', 'stage-map__title', 'Mapa do Reino'),
    el('p', 'stage-map__subtitle', `Viajando como ${options.character.name} · Nível ${options.character.level}`)
  );
  headingWrap.append(crest, titleWrap);

  const closeButton = el('button', 'stage-map__close', '✕') as HTMLButtonElement;
  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', 'Fechar mapa');
  closeButton.addEventListener('click', () => {
    sfxClick();
    close();
  });
  header.append(headingWrap, closeButton);

  const body = el('div', 'stage-map__body');
  const regions = el('nav', 'stage-map__regions');
  regions.setAttribute('aria-label', 'Regiões do reino');
  const content = el('main', 'stage-map__content');
  const loading = el('div', 'stage-map__loading');
  loading.append(el('span', 'stage-map__spinner'), el('p', undefined, 'Desenhando os caminhos do reino…'));
  content.append(loading);

  body.append(regions, content);
  panel.append(header, body);
  overlay.append(panel);
  root.append(overlay);
  activeOverlay = overlay;

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  };
  document.addEventListener('keydown', onKeyDown);
  activeCleanup = () => document.removeEventListener('keydown', onKeyDown);
  overlay.addEventListener('pointerdown', (event) => {
    if (event.target === overlay) close();
  });

  function close(): void {
    options.onClose?.();
    closeStageMap();
  }

  void loadCatalog();

  async function loadCatalog(): Promise<void> {
    try {
      const catalog = await api.listStages();
      if (activeOverlay !== overlay) return;
      content.replaceChildren();
      renderCatalog(catalog);
    } catch (error) {
      if (activeOverlay !== overlay) return;
      content.replaceChildren();
      const message = error instanceof ApiError ? error.message : 'Não foi possível abrir o mapa do reino.';
      const failure = el('div', 'stage-map__failure');
      failure.append(
        el('strong', undefined, 'O mapa está ilegível'),
        el('p', undefined, message)
      );
      const retry = el('button', 'primary-button', 'Tentar novamente') as HTMLButtonElement;
      retry.type = 'button';
      retry.addEventListener('click', () => {
        sfxClick();
        content.replaceChildren(loading);
        void loadCatalog();
      });
      failure.append(retry);
      content.append(failure);
    }
  }

  function renderCatalog(catalog: StageCatalog): void {
    regions.replaceChildren();
    const firstOpen =
      catalog.regions.find((region) => region.stages.some((stage) => stage.id === options.currentStageId))
      ?? catalog.regions.find((region) => region.stages.some((stage) => isUnlocked(stage, options.character.level)))
      ?? catalog.regions[0];

    let selectedRegionId = firstOpen?.id ?? '';

    for (const region of catalog.regions) {
      const unlockedStages = region.stages.filter((stage) => isUnlocked(stage, options.character.level)).length;
      const button = el('button', 'stage-map__region') as HTMLButtonElement;
      button.type = 'button';
      button.dataset.region = region.id;
      const glyph = el('span', 'stage-map__region-glyph', ENVIRONMENT_GLYPH[region.environment]);
      const text = el('span', 'stage-map__region-text');
      text.append(
        el('strong', undefined, region.name),
        el('small', undefined, `${ENVIRONMENT_LABEL[region.environment]} · ${unlockedStages}/${region.stages.length} abertas`)
      );
      button.append(glyph, text);
      button.addEventListener('click', () => {
        sfxClick();
        selectedRegionId = region.id;
        renderRegions(catalog, selectedRegionId);
        renderStages(catalog, selectedRegionId);
      });
      regions.append(button);
    }

    renderRegions(catalog, selectedRegionId);
    renderStages(catalog, selectedRegionId);
  }

  function renderRegions(catalog: StageCatalog, selectedRegionId: string): void {
    regions.querySelectorAll<HTMLButtonElement>('.stage-map__region').forEach((button) => {
      const active = button.dataset.region === selectedRegionId;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-current', active ? 'true' : 'false');
    });
    void catalog;
  }

  function renderStages(catalog: StageCatalog, regionId: string): void {
    content.replaceChildren();
    const region = catalog.regions.find((entry) => entry.id === regionId);
    if (!region) return;

    const heading = el('div', 'stage-map__region-head');
    const headingText = el('div');
    headingText.append(
      el('p', 'stage-map__eyebrow', `${ENVIRONMENT_GLYPH[region.environment]} ${ENVIRONMENT_LABEL[region.environment]}`),
      el('h3', undefined, region.name),
      el('p', 'stage-map__region-level', `Níveis recomendados ${region.minLevel}–${region.maxLevel}`)
    );
    const progress = el('span', 'stage-map__region-progress',
      `${region.stages.filter((stage) => isUnlocked(stage, options.character.level)).length} de ${region.stages.length} fases desbloqueadas`);
    heading.append(headingText, progress);

    const grid = el('div', 'stage-map__grid');
    for (const stage of region.stages) {
      grid.append(renderStageCard(stage));
    }
    content.append(heading, grid);
  }

  function renderStageCard(stage: StageCatalogEntry): HTMLElement {
    const unlocked = isUnlocked(stage, options.character.level);
    const current = stage.id === options.currentStageId;
    const card = el('article', `stage-map__card stage-map__card--${stage.environment}`);
    card.classList.toggle('is-locked', !unlocked);
    card.classList.toggle('is-current', current);

    const top = el('div', 'stage-map__card-top');
    const badge = el('span', `stage-map__badge stage-map__badge--${stage.environment}`);
    badge.append(el('span', undefined, ENVIRONMENT_GLYPH[stage.environment]), el('small', undefined, `Fase ${stage.order + 1}`));
    const heading = el('div', 'stage-map__card-heading');
    heading.append(
      el('strong', undefined, stage.name),
      el('small', undefined, `Nível ${stage.recommendedLevel}–${stage.maxRecommendedLevel}`)
    );
    top.append(badge, heading);
    if (current) top.append(el('span', 'stage-map__current', 'Atual'));
    card.append(top);

    card.append(el('p', 'stage-map__description', stage.description));

    const monsters = el('div', 'stage-map__monsters');
    for (const monster of stage.monsters) {
      monsters.append(el('span', 'stage-map__monster', monster.name));
    }
    monsters.append(el('span', 'stage-map__monster stage-map__monster--boss', `${stage.boss.name} · chefe`));
    card.append(monsters);

    const loot = el('div', 'stage-map__loot');
    const farm = el('div', 'stage-map__loot-row');
    farm.append(el('span', 'stage-map__loot-label', 'Farm'), el('strong', undefined, stage.farm.name));
    const trophy = el('div', 'stage-map__loot-row');
    trophy.append(
      el('span', 'stage-map__loot-label', 'Troféu'),
      el('strong', `stage-map__rarity stage-map__rarity--${stage.trophy.rarity}`, `${stage.trophy.name} · ${RARITY_LABEL[stage.trophy.rarity] ?? stage.trophy.rarity}`)
    );
    loot.append(farm, trophy);
    card.append(loot);

    const footer = el('div', 'stage-map__card-footer');
    const kills = el('span', 'stage-map__kills', `${stage.killsRequiredForBoss} abates para o chefe`);
    footer.append(kills);

    const action = el('button', 'stage-map__travel') as HTMLButtonElement;
    action.type = 'button';
    if (current) {
      action.textContent = 'Você está aqui';
      action.disabled = true;
    } else if (!unlocked) {
      action.textContent = `Requer nível ${Math.max(1, stage.recommendedLevel - 2)}`;
      action.disabled = true;
    } else {
      action.textContent = 'Viajar para esta fase';
      action.addEventListener('click', () => void travel(stage, action));
    }
    footer.append(action);
    card.append(footer);
    return card;
  }

  async function travel(stage: StageCatalogEntry, button: HTMLButtonElement): Promise<void> {
    if (button.disabled) return;
    sfxTravel();
    button.disabled = true;
    button.textContent = 'Selando a viagem…';
    try {
      const snapshot = await api.travel(options.character.id, stage.id);
      if (activeOverlay !== overlay) return;
      close();
      options.onTravel(snapshot);
    } catch (error) {
      if (activeOverlay !== overlay) return;
      button.disabled = false;
      button.textContent = 'Tentar viajar novamente';
      const message = error instanceof ApiError ? error.message : 'A estrada está bloqueada. Tente novamente.';
      let notice = cardNotice(button);
      if (!notice) {
        notice = el('p', 'stage-map__error', message);
        button.parentElement?.parentElement?.append(notice);
      } else {
        notice.textContent = message;
      }
    }
  }
}

function isUnlocked(stage: StageCatalogEntry, level: number): boolean {
  return level + 2 >= stage.recommendedLevel;
}

function cardNotice(button: HTMLButtonElement): HTMLElement | null {
  return button.closest('.stage-map__card')?.querySelector<HTMLElement>('.stage-map__error') ?? null;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}
