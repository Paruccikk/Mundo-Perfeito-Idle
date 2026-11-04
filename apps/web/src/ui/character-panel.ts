import type { CharacterSummary } from '@mundo-perfeito/shared';

type AttributeKey = 'constitution' | 'strength' | 'intelligence' | 'dexterity';
const ATTRIBUTES: Array<{ key: AttributeKey; label: string; hint: string }> = [
  { key: 'constitution', label: 'Constituição', hint: 'Aumenta HP e resistência física/mágica.' },
  { key: 'strength', label: 'Força', hint: 'Aumenta dano e defesa físicos.' },
  { key: 'intelligence', label: 'Inteligência', hint: 'Aumenta dano e defesa mágicos.' },
  { key: 'dexterity', label: 'Destreza', hint: 'Aumenta velocidade de ataque e crítico.' }
];

export function renderCharacterPanel(
  root: HTMLElement,
  character: CharacterSummary,
  onAllocate: (allocation: Partial<Record<AttributeKey, number>>) => Promise<CharacterSummary>,
  onClose: () => void
): void {
  root.querySelector('.game-panel-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'game-panel-overlay';
  const panel = document.createElement('section');
  panel.className = 'game-panel character-panel';
  const header = document.createElement('header');
  header.className = 'game-panel__header';
  const heading = document.createElement('div');
  const eyebrow = document.createElement('p');
  eyebrow.className = 'game-panel__eyebrow';
  eyebrow.textContent = 'Ficha do aventureiro';
  const title = document.createElement('h2');
  title.textContent = character.name;
  const subtitle = document.createElement('p');
  subtitle.className = 'game-panel__subtitle';
  subtitle.textContent = [character.title || 'Sem título', character.className, `Nível ${character.level}`].join(' • ');
  heading.append(eyebrow, title, subtitle);
  const close = makeButton('✕', 'game-panel__close');
  close.setAttribute('aria-label', 'Fechar');
  close.addEventListener('click', onClose);
  header.append(heading, close);

  const identity = document.createElement('div');
  identity.className = 'character-panel__identity';
  identity.append(infoCard('Título', character.title || 'Aventureiro'), infoCard('Guilda', character.guildName || 'Sem guilda'), infoCard('Classe', character.className), infoCard('Nível', String(character.level)));

  const derived = document.createElement('div');
  derived.className = 'character-panel__derived';
  derived.append(
    statCard('HP máximo', character.stats.maxHp),
    statCard('Dano físico', character.stats.physicalDamage),
    statCard('Defesa física', character.stats.physicalDefense),
    statCard('Dano mágico', character.stats.magicDamage),
    statCard('Defesa mágica', character.stats.magicDefense),
    statCard('Crítico', `${(character.stats.critChance * 100).toFixed(1).replace('.', ',')}%`),
    statCard('Velocidade', `${character.stats.attacksPerSecond.toFixed(2).replace('.', ',')} atk/s`),
    statCard('Multiplicador crítico', `${character.stats.critMultiplier.toFixed(2).replace('.', ',')}x`)
  );

  const allocation = document.createElement('div');
  allocation.className = 'character-panel__allocation';
  const allocationHead = document.createElement('div');
  allocationHead.className = 'character-panel__allocation-head';
  const allocationTitle = document.createElement('h3');
  allocationTitle.textContent = 'Distribuir atributos';
  const points = document.createElement('strong');
  points.className = 'character-panel__points';
  points.textContent = `${character.attributePoints} pontos disponíveis`;
  allocationHead.append(allocationTitle, points);
  allocation.append(allocationHead);

  const values: Record<AttributeKey, number> = { constitution: 0, strength: 0, intelligence: 0, dexterity: 0 };
  const rows = document.createElement('div');
  rows.className = 'character-panel__attribute-list';
  for (const attribute of ATTRIBUTES) {
    const row = document.createElement('div');
    row.className = 'character-panel__attribute';
    const copy = document.createElement('div');
    const label = document.createElement('strong');
    label.textContent = attribute.label;
    const hint = document.createElement('small');
    hint.textContent = attribute.hint;
    const value = document.createElement('span');
    value.className = 'character-panel__attribute-value';
    value.textContent = String(character.attributes[attribute.key]);
    copy.append(label, hint);
    const controls = document.createElement('div');
    controls.className = 'character-panel__controls';
    const minus = makeButton('−', 'game-panel__step');
    const pending = document.createElement('b');
    pending.textContent = '0';
    const plus = makeButton('+', 'game-panel__step');
    minus.disabled = true;
    plus.disabled = character.attributePoints <= 0;
    minus.addEventListener('click', () => {
      values[attribute.key] = Math.max(0, values[attribute.key] - 1);
      pending.textContent = String(values[attribute.key]);
      minus.disabled = values[attribute.key] === 0;
      plus.disabled = total() >= character.attributePoints;
      points.textContent = `${character.attributePoints - total()} pontos disponíveis`;
    });
    plus.addEventListener('click', () => {
      if (total() >= character.attributePoints) return;
      values[attribute.key] += 1;
      pending.textContent = String(values[attribute.key]);
      minus.disabled = false;
      plus.disabled = total() >= character.attributePoints;
      points.textContent = `${character.attributePoints - total()} pontos disponíveis`;
    });
    controls.append(minus, pending, plus);
    row.append(copy, value, controls);
    rows.append(row);
  }
  const apply = makeButton('Confirmar distribuição', 'primary-button character-panel__apply');
  apply.disabled = character.attributePoints <= 0;
  const error = document.createElement('p');
  error.className = 'game-panel__error';
  apply.addEventListener('click', async () => {
    const amount = total();
    if (!amount) return;
    apply.disabled = true;
    apply.textContent = 'Salvando…';
    error.textContent = '';
    try {
      const updated = await onAllocate(values);
      renderCharacterPanel(root, updated, onAllocate, onClose);
    } catch (cause) {
      error.textContent = cause instanceof Error ? cause.message : 'Não foi possível distribuir os pontos.';
      apply.disabled = false;
      apply.textContent = 'Confirmar distribuição';
    }
  });
  allocation.append(rows, apply, error);
  panel.append(header, identity, sectionTitle('Atributos derivados'), derived, allocation);
  overlay.append(panel);
  overlay.addEventListener('click', (event) => { if (event.target === overlay) onClose(); });
  root.append(overlay);

  function total(): number {
    return Object.values(values).reduce((sum, value) => sum + value, 0);
  }
}

function infoCard(label: string, value: string): HTMLElement {
  const card = document.createElement('div');
  card.className = 'character-panel__identity-card';
  const small = document.createElement('small');
  small.textContent = label;
  const strong = document.createElement('strong');
  strong.textContent = value;
  card.append(small, strong);
  return card;
}

function statCard(label: string, value: string | number): HTMLElement {
  const card = document.createElement('div');
  card.className = 'character-panel__stat';
  const small = document.createElement('small');
  small.textContent = label;
  const strong = document.createElement('strong');
  strong.textContent = typeof value === 'number' ? Math.round(value).toLocaleString('pt-BR') : value;
  card.append(small, strong);
  return card;
}

function sectionTitle(value: string): HTMLElement {
  const title = document.createElement('h3');
  title.className = 'game-panel__section-title';
  title.textContent = value;
  return title;
}

function makeButton(label: string, className: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = label;
  return button;
}
