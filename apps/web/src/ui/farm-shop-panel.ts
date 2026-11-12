import {
  FARM_BUILDINGS,
  FARM_ANIMALS,
  FARM_CROPS,
  type FarmBuildingId,
  type FarmState,
  type FarmResponse,
  type CropTypeId,
  type AnimalSpeciesId
} from '@mundo-perfeito/shared';

type ShopTab = 'buildings' | 'animals' | 'seeds' | 'care';

function formatGold(value: number): string {
  return Math.max(0, Math.floor(value)).toLocaleString('pt-BR');
}

function make<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function makeTab(icon: string, label: string): HTMLButtonElement {
  const button = make('button', 'farm-shop__tab');
  button.type = 'button';
  button.setAttribute('role', 'tab');
  const iconSpan = make('span', 'farm-shop__tab-icon', icon);
  iconSpan.setAttribute('aria-hidden', 'true');
  const labelSpan = make('span', 'farm-shop__tab-label', label);
  button.append(iconSpan, labelSpan);
  return button;
}

export function renderFarmShop(
  root: HTMLElement,
  farmData: FarmResponse,
  onBuyBuilding: (buildingId: FarmBuildingId) => Promise<FarmResponse>,
  onBuyAnimal: (animalId: string) => Promise<FarmResponse>,
  onBuySeeds: (cropId: CropTypeId, quantity: number) => Promise<FarmResponse>,
  onCraftFeed: (species: AnimalSpeciesId, quantity: number) => Promise<FarmResponse>,
  onFillTrough: (buildingId: FarmBuildingId, kind: 'feed' | 'water', quantity: number) => Promise<FarmResponse>,
  onExpandFarm: () => Promise<FarmResponse>,
  onGoToFarm: () => void,
  onClose: () => void
): void {
  root.querySelector('.game-panel-overlay')?.remove();

  let currentFarm = farmData.farm;
  let currentGold = farmData.gold;
  let activeTab: ShopTab = 'buildings';

  const overlay = make('div', 'game-panel-overlay farm-shop-overlay');

  const panel = make('section', 'farm-shop-panel');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-labelledby', 'farm-shop-title');

  const header = make('header', 'farm-shop__header');
  const heading = make('div', 'farm-shop__heading');
  const eyebrow = make('p', 'farm-shop__eyebrow', 'Mercado do Rancho · Vale Dourado');
  const title = make('h2', 'farm-shop__title', 'Comércio da Fazenda');
  title.id = 'farm-shop-title';
  const intro = make(
    'p',
    'farm-shop__intro',
    'Sementes, abrigos e animais criados com cuidado. Tudo o que o seu rancho precisa para crescer.'
  );
  heading.append(eyebrow, title, intro);

  const headerRight = make('div', 'farm-shop__header-right');
  const balance = make('div', 'farm-shop__balance');
  const coin = make('span', 'coin-glyph', 'G');
  coin.setAttribute('aria-hidden', 'true');
  const balanceValue = make('strong', '', formatGold(currentGold));
  const balanceLabel = make('small', '', 'SEU OURO');
  balance.append(coin, balanceValue, balanceLabel);

  const closeBtn = make('button', 'farm-shop__close', '×');
  closeBtn.type = 'button';
  closeBtn.setAttribute('aria-label', 'Fechar o comércio do rancho');
  headerRight.append(balance, closeBtn);
  header.append(heading, headerRight);

  const tabs = make('nav', 'farm-shop__tabs');
  tabs.setAttribute('role', 'tablist');
  tabs.setAttribute('aria-label', 'Categorias do mercado');

  const btnTabBuildings = makeTab('🏡', 'Abrigos');
  const btnTabAnimals = makeTab('🐾', 'Animais');
  const btnTabSeeds = makeTab('🌱', 'Sementes');
  const btnTabCare = makeTab('🥣', 'Cuidados');
  const tabButtons: Array<[ShopTab, HTMLButtonElement]> = [
    ['buildings', btnTabBuildings],
    ['animals', btnTabAnimals],
    ['seeds', btnTabSeeds],
    ['care', btnTabCare]
  ];
  tabs.append(btnTabBuildings, btnTabAnimals, btnTabSeeds, btnTabCare);

  const feedbackArea = make('div', 'farm-shop__feedback');
  feedbackArea.setAttribute('aria-live', 'polite');

  const contentArea = make('div', 'farm-shop__content');

  const footer = make('footer', 'farm-shop__footer');
  const footerHint = make(
    'p',
    'farm-shop__hint',
    'As colheitas e produtos ficam guardados no armazém do rancho.'
  );
  const backButton = make('button', 'farm-shop__back', 'Voltar ao rancho');
  backButton.type = 'button';
  footer.append(footerHint, backButton);

  panel.append(header, tabs, feedbackArea, contentArea, footer);
  overlay.append(panel);

  function showMessage(text: string, isError = false): void {
    feedbackArea.textContent = text;
    feedbackArea.classList.toggle('is-error', isError);
    feedbackArea.classList.toggle('is-success', !isError);
  }

  function updateBalance(): void {
    balanceValue.textContent = formatGold(currentGold);
  }

  function buildLandCard(): HTMLElement {
    const landCard = make('section', 'farm-shop__land');
    const copy = make('div', 'farm-shop__land-copy');
    const landTitle = make('strong', 'farm-shop__land-title', '🌱 Expandir minha terra');
    const landInfo = make('p', 'farm-shop__land-info');
    const landButton = make('button', 'primary-button farm-shop__land-button');
    landButton.type = 'button';

    const refresh = (): void => {
      const count = currentFarm.plots.length;
      landInfo.textContent =
        count >= 30
          ? `Todos os ${count} canteiros já estão liberados. O rancho está completo.`
          : `${count}/30 canteiros liberados. Cada expansão abre até 3 novos espaços; a primeira custa 250 moedas e o valor sobe a cada compra.`;
      landButton.textContent = count >= 30 ? 'Limite de terra atingido' : 'Comprar mais canteiros';
      landButton.disabled = count >= 30;
    };

    refresh();
    landButton.addEventListener('click', async () => {
      landButton.disabled = true;
      landButton.textContent = 'Preparando a terra…';
      try {
        const updated = await onExpandFarm();
        currentFarm = updated.farm;
        currentGold = updated.gold;
        updateBalance();
        refresh();
        showMessage(updated.message ?? 'Terra expandida!');
        renderActiveTab();
      } catch (error) {
        showMessage(error instanceof Error ? error.message : 'Não foi possível expandir a terra.', true);
        refresh();
      }
    });

    copy.append(landTitle, landInfo);
    landCard.append(copy, landButton);
    return landCard;
  }

  function makeNotice(text: string, tone: 'gold' | 'green' | 'plain' = 'gold'): HTMLElement {
    return make('p', `farm-shop__notice farm-shop__notice--${tone}`, text);
  }

  function setTabActive(tab: ShopTab): void {
    for (const [key, button] of tabButtons) {
      const active = key === tab;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
    }
  }

  function renderActiveTab(): void {
    contentArea.replaceChildren();
    setTabActive(activeTab);

    if (activeTab === 'buildings') renderBuildingsTab();
    else if (activeTab === 'animals') renderAnimalsTab();
    else if (activeTab === 'seeds') renderSeedsTab();
    else renderCareTab();
  }

  function renderBuildingsTab(): void {
    contentArea.append(buildLandCard());
    const grid = make('div', 'farm-shop__grid');

    Object.values(FARM_BUILDINGS).forEach((building) => {
      const isOwned = currentFarm.buildings.includes(building.id);
      const card = make('article', `farm-shop__card${isOwned ? ' is-owned' : ''}`);

      const head = make('div', 'farm-shop__card-head');
      const icon = make('div', 'farm-shop__icon', building.icon);
      icon.setAttribute('aria-hidden', 'true');
      const titleWrap = make('div', 'farm-shop__card-title-wrap');
      const name = make('h3', 'farm-shop__card-name', building.name);
      const meta = make('p', 'farm-shop__meta', `Até ${building.capacity} animais`);
      titleWrap.append(name, meta);
      head.append(icon, titleWrap);

      const desc = make('p', 'farm-shop__desc', building.description);
      const bottom = make('div', 'farm-shop__card-bottom');

      if (isOwned) {
        bottom.append(make('p', 'farm-shop__badge farm-shop__badge--owned', '✓ Construído no rancho'));
      } else {
        const buyButton = make(
          'button',
          'primary-button farm-shop__buy',
          `Construir · ${formatGold(building.cost)} ouro`
        );
        buyButton.type = 'button';
        if (currentGold < building.cost) {
          buyButton.disabled = true;
          buyButton.title = 'Ouro insuficiente';
        }
        buyButton.addEventListener('click', async () => {
          buyButton.disabled = true;
          buyButton.textContent = 'Construindo…';
          try {
            const response = await onBuyBuilding(building.id);
            currentFarm = response.farm;
            currentGold = response.gold;
            updateBalance();
            showMessage(response.message ?? `${building.name} construído com sucesso!`);
            renderActiveTab();
          } catch (error) {
            showMessage(error instanceof Error ? error.message : 'Falha ao construir.', true);
            buyButton.disabled = false;
            buyButton.textContent = `Construir · ${formatGold(building.cost)} ouro`;
          }
        });
        bottom.append(buyButton);
      }

      card.append(head, desc, bottom);
      grid.append(card);
    });

    contentArea.append(grid);
  }

  function renderAnimalsTab(): void {
    contentArea.append(
      makeNotice(
        'Cada animal precisa do seu abrigo já construído. Machos e fêmeas de bom rank podem formar casal e gerar novos filhotes.',
        'gold'
      )
    );

    const grid = make('div', 'farm-shop__grid');
    Object.values(FARM_ANIMALS).forEach((animal) => {
      const hasBuilding = currentFarm.buildings.includes(animal.requiredBuilding);
      const buildingDef = FARM_BUILDINGS[animal.requiredBuilding];
      const countInBuilding = currentFarm.animals.filter(
        (owned) => owned.buildingId === animal.requiredBuilding
      ).length;
      const isFull = countInBuilding >= buildingDef.capacity;

      const card = make(
        'article',
        `farm-shop__card farm-shop__card--animal${hasBuilding ? '' : ' is-locked'}`
      );
      const head = make('div', 'farm-shop__card-head');
      const icon = make('div', 'farm-shop__icon', animal.icon);
      icon.setAttribute('aria-hidden', 'true');
      const gender = make(
        'span',
        `farm-shop__gender farm-shop__gender--${animal.gender}`,
        animal.gender === 'male' ? '♂ Macho' : '♀ Fêmea'
      );
      head.append(icon, gender);

      const name = make('h3', 'farm-shop__card-name', animal.name);
      const species = make(
        'p',
        'farm-shop__meta',
        `${animal.speciesName} · Rank ${animal.tier.toUpperCase()}`
      );
      const desc = make('p', 'farm-shop__desc', animal.description);
      const requirement = make(
        'p',
        `farm-shop__requirement${hasBuilding ? ' is-ok' : ' is-locked'}`,
        hasBuilding
          ? `✓ ${animal.requiredBuildingName} disponível · ${countInBuilding}/${buildingDef.capacity}`
          : `🔒 Requer ${animal.requiredBuildingName}`
      );

      const bottom = make('div', 'farm-shop__card-bottom');
      const buyButton = make('button', 'primary-button farm-shop__buy');
      buyButton.type = 'button';

      if (!hasBuilding) {
        buyButton.textContent = `Requer ${animal.requiredBuildingName}`;
        buyButton.disabled = true;
      } else if (isFull) {
        buyButton.textContent = 'Abrigo lotado';
        buyButton.disabled = true;
      } else {
        buyButton.textContent = `Adotar · ${formatGold(animal.cost)} ouro`;
        if (currentGold < animal.cost) {
          buyButton.disabled = true;
          buyButton.title = 'Ouro insuficiente';
        }
        buyButton.addEventListener('click', async () => {
          buyButton.disabled = true;
          buyButton.textContent = 'Adotando…';
          try {
            const response = await onBuyAnimal(animal.id);
            currentFarm = response.farm;
            currentGold = response.gold;
            updateBalance();
            showMessage(response.message ?? `${animal.name} chegou ao rancho!`);
            renderActiveTab();
          } catch (error) {
            showMessage(error instanceof Error ? error.message : 'Falha ao adquirir o animal.', true);
            buyButton.disabled = false;
            buyButton.textContent = `Adotar · ${formatGold(animal.cost)} ouro`;
          }
        });
      }

      bottom.append(buyButton);
      card.append(head, name, species, desc, requirement, bottom);
      grid.append(card);
    });

    contentArea.append(grid);
  }

  function renderSeedsTab(): void {
    contentArea.append(
      makeNotice(
        'Cada plantio consome 1 semente. Ao colher, você recebe 2 sementes de volta e os frutos vão para o armazém. O mercador vende até 10 sementes de cada cultura por dia.',
        'green'
      )
    );

    const grid = make('div', 'farm-shop__grid');
    Object.values(FARM_CROPS).forEach((crop) => {
      const bought = currentFarm.dailySeedPurchases?.quantities[crop.id] ?? 0;
      const remaining = Math.max(0, 10 - bought);
      const stock = currentFarm.seeds?.[crop.id] ?? 0;
      const purchaseQuantity = Math.min(5, remaining, Math.floor(currentGold / crop.cost));

      const card = make('article', 'farm-shop__card farm-shop__card--seed');
      const head = make('div', 'farm-shop__card-head');
      const icon = make('div', 'farm-shop__icon', crop.icon);
      icon.setAttribute('aria-hidden', 'true');
      const titleWrap = make('div', 'farm-shop__card-title-wrap');
      const name = make('h3', 'farm-shop__card-name', crop.seedName);
      const price = make('p', 'farm-shop__meta', `${crop.cost} ouro por semente`);
      titleWrap.append(name, price);
      head.append(icon, titleWrap);

      const stats = make('div', 'farm-shop__seed-stats');
      const stockStat = make('span', 'farm-shop__seed-stat');
      stockStat.append(
        make('strong', '', String(stock)),
        make('small', '', 'no estoque')
      );
      const dailyStat = make('span', 'farm-shop__seed-stat');
      dailyStat.append(
        make('strong', '', `${bought}/10`),
        make('small', '', 'compradas hoje')
      );
      stats.append(stockStat, dailyStat);

      const button = make('button', 'primary-button farm-shop__buy');
      button.type = 'button';
      button.textContent = remaining <= 0
        ? 'Limite diário atingido'
        : purchaseQuantity > 0
          ? `Comprar ${purchaseQuantity} · ${crop.cost * purchaseQuantity} ouro`
          : 'Ouro insuficiente';
      button.disabled = purchaseQuantity <= 0;

      button.addEventListener('click', async () => {
        button.disabled = true;
        button.textContent = 'Comprando…';
        try {
          const response = await onBuySeeds(crop.id, purchaseQuantity);
          currentFarm = response.farm;
          currentGold = response.gold;
          updateBalance();
          showMessage(response.message ?? 'Sementes compradas!');
          renderActiveTab();
        } catch (error) {
          showMessage(error instanceof Error ? error.message : 'Não foi possível comprar sementes.', true);
          button.disabled = false;
          button.textContent = `Comprar ${purchaseQuantity} · ${crop.cost * purchaseQuantity} ouro`;
        }
      });

      card.append(head, stats, button);
      grid.append(card);
    });

    contentArea.append(grid);
  }

  function renderCareTab(): void {
    contentArea.append(
      makeNotice(
        'Transforme suas colheitas em ração, abasteça os comedouros e mantenha os bebedouros cheios. Animais bem cuidados produzem mais e vivem mais felizes.',
        'plain'
      )
    );

    if (currentFarm.animals.length > 0) {
      const sectionTitle = make('h3', 'farm-shop__section-title', 'Seus animais');
      const statusGrid = make('div', 'farm-shop__status-grid');
      currentFarm.animals.forEach((animal) => {
        const card = make('div', 'farm-shop__status-card');
        const name = make('strong', 'farm-shop__status-name', animal.name);
        const needs = make(
          'p',
          'farm-shop__status-needs',
          `🍽 Fome ${animal.hunger ?? 100}/100 · 💧 Sede ${animal.hydration ?? 100}/100`
        );
        card.append(name, needs);
        statusGrid.append(card);
      });
      contentArea.append(sectionTitle, statusGrid);
    }

    const recipes: Array<{ species: AnimalSpeciesId; title: string; icon: string; recipe: string }> = [
      { species: 'chicken', title: 'Ração para galinhas', icon: '🐔', recipe: '2 Milhos + 1 Trigo' },
      { species: 'cow', title: 'Ração para bovinos', icon: '🐄', recipe: '1 Milho + 2 Trigos' },
      { species: 'horse', title: 'Ração para cavalos', icon: '🐎', recipe: '1 Milho + 2 Cenouras' }
    ];

    contentArea.append(make('h3', 'farm-shop__section-title', 'Preparar ração'));
    const recipeGrid = make('div', 'farm-shop__grid farm-shop__grid--recipes');
    recipes.forEach((recipe) => {
      const stock = currentFarm.storage[`feed-${recipe.species}`] ?? 0;
      const card = make('article', 'farm-shop__card farm-shop__card--recipe');
      const head = make('div', 'farm-shop__card-head');
      const icon = make('div', 'farm-shop__icon', recipe.icon);
      icon.setAttribute('aria-hidden', 'true');
      const titleWrap = make('div', 'farm-shop__card-title-wrap');
      const name = make('h3', 'farm-shop__card-name', recipe.title);
      const recipeText = make('p', 'farm-shop__meta', recipe.recipe);
      titleWrap.append(name, recipeText);
      head.append(icon, titleWrap);

      const stockLine = make('p', 'farm-shop__stock-line');
      stockLine.append(
        make('span', '', 'Ração pronta'),
        make('strong', '', String(stock))
      );

      const craft = make('button', 'primary-button farm-shop__buy', 'Preparar 1 ração');
      craft.type = 'button';
      craft.addEventListener('click', async () => {
        craft.disabled = true;
        craft.textContent = 'Preparando…';
        try {
          const response = await onCraftFeed(recipe.species, 1);
          currentFarm = response.farm;
          currentGold = response.gold;
          updateBalance();
          showMessage(response.message ?? 'Ração preparada!');
          renderActiveTab();
        } catch (error) {
          showMessage(error instanceof Error ? error.message : 'Colheita insuficiente para preparar ração.', true);
          craft.disabled = false;
          craft.textContent = 'Preparar 1 ração';
        }
      });

      card.append(head, stockLine, craft);
      recipeGrid.append(card);
    });
    contentArea.append(recipeGrid);

    contentArea.append(make('h3', 'farm-shop__section-title', 'Comedouros e bebedouros'));
    if (currentFarm.buildings.length === 0) {
      contentArea.append(
        makeNotice(
          'Construa primeiro um galinheiro, curral ou estábulo para instalar comedouros e bebedouros.',
          'plain'
        )
      );
      return;
    }

    (Object.keys(FARM_BUILDINGS) as FarmBuildingId[]).forEach((buildingId) => {
      if (!currentFarm.buildings.includes(buildingId)) return;
      const building = FARM_BUILDINGS[buildingId];
      const care = currentFarm.animalCare?.[buildingId] ?? { feed: 0, water: 0 };
      const species = building.allowedSpecies[0]!;
      const card = make('div', 'farm-shop__trough');

      const info = make('div', 'farm-shop__trough-info');
      const heading = make('strong', 'farm-shop__trough-name', building.name);
      const values = make(
        'p',
        'farm-shop__trough-values',
        `🥣 Comedouro ${care.feed}/30 · 🚰 Bebedouro ${care.water}/30`
      );
      const stock = make(
        'p',
        'farm-shop__trough-stock',
        `Ração disponível: ${currentFarm.storage[`feed-${species}`] ?? 0}`
      );
      info.append(heading, values, stock);

      const actions = make('div', 'farm-shop__trough-actions');
      (['feed', 'water'] as const).forEach((kind) => {
        const button = make(
          'button',
          'farm-shop__trough-button',
          kind === 'feed' ? 'Abastecer comedouro +5' : 'Encher bebedouro +5'
        );
        button.type = 'button';
        button.addEventListener('click', async () => {
          button.disabled = true;
          try {
            const response = await onFillTrough(buildingId, kind, 5);
            currentFarm = response.farm;
            currentGold = response.gold;
            updateBalance();
            showMessage(response.message ?? 'Instalação abastecida!');
            renderActiveTab();
          } catch (error) {
            showMessage(error instanceof Error ? error.message : 'Não foi possível abastecer.', true);
            button.disabled = false;
          }
        });
        actions.append(button);
      });

      card.append(info, actions);
      contentArea.append(card);
    });
  }

  btnTabBuildings.addEventListener('click', () => {
    activeTab = 'buildings';
    renderActiveTab();
  });
  btnTabAnimals.addEventListener('click', () => {
    activeTab = 'animals';
    renderActiveTab();
  });
  btnTabSeeds.addEventListener('click', () => {
    activeTab = 'seeds';
    renderActiveTab();
  });
  btnTabCare.addEventListener('click', () => {
    activeTab = 'care';
    renderActiveTab();
  });

  let keyHandler: ((event: KeyboardEvent) => void) | null = null;
  const closePanel = (): void => {
    if (keyHandler) window.removeEventListener('keydown', keyHandler);
    onClose();
  };
  const goToFarm = (): void => {
    if (keyHandler) window.removeEventListener('keydown', keyHandler);
    onGoToFarm();
  };
  closeBtn.addEventListener('click', closePanel);
  backButton.addEventListener('click', goToFarm);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closePanel();
  });

  keyHandler = (event: KeyboardEvent) => {
    if (event.key === 'Escape') closePanel();
  };
  window.addEventListener('keydown', keyHandler);

  root.append(overlay);
  renderActiveTab();
}
