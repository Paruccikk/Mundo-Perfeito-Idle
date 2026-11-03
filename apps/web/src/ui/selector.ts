import type { CharacterClassId, CharacterSummary } from '@mundo-perfeito/shared';

export interface CharacterSelectorOptions {
  characters: CharacterSummary[];
  activeCharacterId: string | null;
  maxCharacters: number;
  onSelect: (character: CharacterSummary) => void;
  onCreate: () => void;
}

const CLASS_GLYPHS: Record<CharacterClassId, string> = {
  warrior: '⚔',
  mage: '✦',
  ranger: '➶'
};

export function renderCharacterSelector(
  root: HTMLElement,
  options: CharacterSelectorOptions
): void {
  const { characters, activeCharacterId, maxCharacters, onSelect, onCreate } = options;

  const screen = el('section', 'selector');
  const glow = el('div', 'selector__glow');
  glow.setAttribute('aria-hidden', 'true');

  const header = el('header', 'selector__header');
  header.append(
    el('p', 'eyebrow', 'Mundo Perfeito'),
    el('h1', 'selector__title', 'Escolha seu aventureiro'),
    el(
      'p',
      'selector__subtitle',
      'Seu progresso continua de onde parou. O servidor calcula cada abate, mesmo quando você fecha a aba.'
    )
  );

  const grid = el('div', 'selector__grid');

  for (const character of characters) {
    grid.append(buildCharacterCard(character, character.id === activeCharacterId, onSelect));
  }

  const footer = el('footer', 'selector__footer');
  const atLimit = characters.length >= maxCharacters;

  const createButton = el(
    'button',
    'primary-button selector__create',
    atLimit ? 'Limite de personagens atingido' : 'Criar novo personagem'
  ) as HTMLButtonElement;
  createButton.type = 'button';
  createButton.disabled = atLimit;
  createButton.addEventListener('click', onCreate);

  const hint = el(
    'p',
    'selector__hint',
    atLimit
      ? `Você já usa os ${maxCharacters} espaços disponíveis.`
      : `${characters.length} de ${maxCharacters} personagens criados.`
  );

  footer.append(createButton, hint);

  screen.append(glow, header, grid, footer);
  root.replaceChildren(screen);
}

function buildCharacterCard(
  character: CharacterSummary,
  active: boolean,
  onSelect: (character: CharacterSummary) => void
): HTMLButtonElement {
  const card = el('button', 'character-card') as HTMLButtonElement;
  card.type = 'button';
  card.dataset.class = character.classId;
  card.setAttribute(
    'aria-label',
    `Entrar com ${character.name}, ${character.className}, nível ${character.level}`
  );

  const top = el('div', 'character-card__top');

  const crest = el('div', 'crest');
  crest.dataset.class = character.classId;
  crest.append(el('span', 'crest__glyph', CLASS_GLYPHS[character.classId]));

  const identity = el('div', 'character-card__identity');
  identity.append(
    el('strong', 'character-card__name', character.name),
    el('span', 'character-card__meta', `${character.className} • Nível ${character.level}`)
  );

  top.append(crest, identity);

  if (active) {
    top.append(el('span', 'character-card__badge', 'EM JOGO'));
  }

  const stats = el('dl', 'character-card__stats');
  appendStat(stats, 'Vida', formatNumber(character.stats.maxHp));
  appendStat(stats, 'Ataque', formatDecimal(character.stats.attack));
  appendStat(stats, 'Ouro', formatNumber(character.gold));

  const xp = el('div', 'character-card__xp');
  const xpTrack = el('div', 'character-card__xp-track');
  const xpFill = el('div', 'character-card__xp-fill');
  xpFill.style.width = `${Math.round(xpRatio(character) * 100)}%`;
  xpTrack.append(xpFill);
  xp.append(el('span', 'character-card__xp-label', 'XP'), xpTrack);
  xp.append(
    el(
      'b',
      'character-card__xp-value',
      `${formatNumber(character.experience)} / ${formatNumber(character.experienceToNextLevel)}`
    )
  );

  card.append(top, stats, xp, el('span', 'character-card__cta', 'Entrar no mundo →'));
  card.addEventListener('click', () => onSelect(character));

  return card;
}

function appendStat(list: HTMLElement, label: string, value: string): void {
  const item = el('div', 'character-card__stat');
  item.append(el('dt', 'character-card__stat-label', label), el('dd', 'character-card__stat-value', value));
  list.append(item);
}

function xpRatio(character: CharacterSummary): number {
  if (character.experienceToNextLevel <= 0) {
    return 0;
  }
  return Math.min(1, character.experience / character.experienceToNextLevel);
}

function formatNumber(value: number): string {
  return Math.round(value).toLocaleString('pt-BR');
}

function formatDecimal(value: number): string {
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
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
