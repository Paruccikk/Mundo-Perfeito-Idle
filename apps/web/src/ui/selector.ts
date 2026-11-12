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
  archer: '➶',
  priest: '✚'
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
    el('h1', 'selector__title', 'Escolha seu personagem'),
    el(
      'p',
      'selector__subtitle',
      'Sua vida no campo começa aqui. Cuide da propriedade, crie animais, plante e pesque.'
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
  card.dataset.class = 'farmer';
  card.setAttribute(
    'aria-label',
    `Entrar com ${character.name}, ${character.professionName ?? 'Fazendeiro'}, nível ${character.professionLevel ?? 1}`
  );

  const top = el('div', 'character-card__top');

  const crest = el('div', 'crest');
  crest.dataset.class = 'farmer';
  crest.append(el('span', 'crest__glyph', '🌾'));

  const identity = el('div', 'character-card__identity');
  identity.append(
    el('strong', 'character-card__name', character.name),
    el('span', 'character-card__meta', `${character.professionName ?? 'Fazendeiro'} • ${character.professionRank ?? 'Novato'} • Nível ${character.professionLevel ?? 1}`)
  );

  top.append(crest, identity);

  if (active) {
    top.append(el('span', 'character-card__badge', 'EM JOGO'));
  }

  const stats = el('dl', 'character-card__stats');
  appendStat(stats, 'Ouro', formatNumber(character.gold));
  appendStat(stats, 'Profissão', character.professionName ?? 'Fazendeiro');

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

  card.append(top, stats, xp, el('span', 'character-card__cta', 'Ir para a fazenda →'));
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
