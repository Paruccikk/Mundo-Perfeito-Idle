import type {
  CharacterClassDefinition,
  CharacterClassId
} from '@mundo-perfeito/shared';

export interface CharacterCreatorOptions {
  classes: CharacterClassDefinition[];
  onCreate: (input: { name: string; classId: CharacterClassId }) => Promise<void>;
}

export function renderCharacterCreator(
  root: HTMLElement,
  options: CharacterCreatorOptions
): void {
  const { classes, onCreate } = options;

  const screen = el('section', 'creator');
  const panel = el('div', 'creator__panel');

  const header = el('header', 'creator__header');
  header.append(
    el('p', 'eyebrow', 'Mundo Perfeito'),
    el('h1', 'creator__title', 'Forje seu aventureiro'),
    el(
      'p',
      'creator__subtitle',
      'Escolha um nome e uma classe. O servidor é a autoridade sobre todo o progresso.'
    )
  );

  const form = el('form', 'creator__form');
  form.noValidate = true;

  const nameField = el('label', 'field');
  const nameLabel = el('span', 'field__label', 'Nome do personagem');
  const nameInput = el('input', 'field__input') as HTMLInputElement;
  nameInput.type = 'text';
  nameInput.name = 'name';
  nameInput.maxLength = 16;
  nameInput.minLength = 3;
  nameInput.autocomplete = 'off';
  nameInput.placeholder = 'Ex.: Kael';
  nameInput.required = true;
  const nameHint = el('small', 'field__hint', 'De 3 a 16 caracteres.');
  nameField.append(nameLabel, nameInput, nameHint);

  const classFieldset = el('fieldset', 'class-fieldset');
  classFieldset.append(el('legend', 'field__label', 'Classe'));

  const classGrid = el('div', 'class-grid');
  classGrid.setAttribute('role', 'radiogroup');
  classGrid.setAttribute('aria-label', 'Classe do personagem');

  let selectedClassId: CharacterClassId = classes[0]?.id ?? 'warrior';
  const cards = new Map<CharacterClassId, HTMLButtonElement>();

  for (const definition of classes) {
    const card = el('button', 'class-card') as HTMLButtonElement;
    card.type = 'button';
    card.dataset.classId = definition.id;
    card.setAttribute('role', 'radio');
    card.setAttribute('aria-checked', String(definition.id === selectedClassId));

    const cardHeader = el('div', 'class-card__header');
    cardHeader.append(
      el('strong', 'class-card__name', definition.name),
      el('span', 'class-card__role', definition.role)
    );

    card.append(
      cardHeader,
      el('p', 'class-card__description', definition.description),
      buildStats(definition)
    );

    card.addEventListener('click', () => {
      selectedClassId = definition.id;
      for (const [id, other] of cards) {
        const active = id === selectedClassId;
        other.classList.toggle('class-card--active', active);
        other.setAttribute('aria-checked', String(active));
      }
    });

    if (definition.id === selectedClassId) {
      card.classList.add('class-card--active');
    }

    cards.set(definition.id, card);
    classGrid.append(card);
  }

  classFieldset.append(classGrid);

  const error = el('p', 'form-error');
  error.setAttribute('role', 'alert');

  const submit = el('button', 'primary-button', 'Começar jornada') as HTMLButtonElement;
  submit.type = 'submit';

  form.append(nameField, classFieldset, error, submit);
  panel.append(header, form);
  screen.append(panel);
  root.replaceChildren(screen);

  nameInput.focus();

  let submitting = false;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (submitting) {
      return;
    }

    const name = nameInput.value.trim().replace(/\s+/g, ' ');
    if (name.length < 3) {
      showError('O nome precisa ter pelo menos 3 caracteres.');
      nameInput.focus();
      return;
    }
    if (name.length > 16) {
      showError('O nome pode ter no máximo 16 caracteres.');
      nameInput.focus();
      return;
    }

    setError('');
    submitting = true;
    submit.disabled = true;
    submit.textContent = 'Criando personagem…';

    onCreate({ name, classId: selectedClassId })
      .catch((unknownError: unknown) => {
        const message =
          unknownError instanceof Error
            ? unknownError.message
            : 'Não foi possível criar o personagem.';
        showError(message);
        submitting = false;
        submit.disabled = false;
        submit.textContent = 'Começar jornada';
      });
  });

  function showError(message: string): void {
    setError(message);
  }

  function setError(message: string): void {
    error.textContent = message;
    error.classList.toggle('form-error--visible', message.length > 0);
  }
}

function buildStats(definition: CharacterClassDefinition): HTMLElement {
  const stats = definition.baseStats;
  const list = el('dl', 'class-card__stats');

  const entries: Array<[string, string]> = [
    ['Vida', String(stats.maxHp)],
    ['Ataque', String(stats.attack)],
    ['Defesa', String(stats.defense)],
    ['Ataques/s', stats.attacksPerSecond.toFixed(2).replace('.', ',')],
    ['Crítico', `${Math.round(stats.critChance * 100)}%`]
  ];

  for (const [label, value] of entries) {
    list.append(el('dt', 'class-card__stat-label', label), el('dd', 'class-card__stat-value', value));
  }

  return list;
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
