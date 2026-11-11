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

function formatGold(value: number): string {
  return Math.max(0, Math.floor(value)).toLocaleString('pt-BR');
}

export function renderFarmShop(
  root: HTMLElement,
  farmData: FarmResponse,
  onBuyBuilding: (buildingId: FarmBuildingId) => Promise<FarmResponse>,
  onBuyAnimal: (animalId: string) => Promise<FarmResponse>,
  onBuySeeds: (cropId: CropTypeId, quantity: number) => Promise<FarmResponse>,
  onCraftFeed: (species: AnimalSpeciesId, quantity: number) => Promise<FarmResponse>,
  onFillTrough: (buildingId: FarmBuildingId, kind: 'feed' | 'water', quantity: number) => Promise<FarmResponse>,
  onGoToFarm: () => void,
  onClose: () => void
): void {
  root.querySelector('.game-panel-overlay')?.remove();

  let currentFarm = farmData.farm;
  let currentGold = farmData.gold;
  let activeTab: 'buildings' | 'animals' | 'seeds' | 'care' = 'buildings';

  const overlay = document.createElement('div');
  overlay.className = 'game-panel-overlay';

  const panel = document.createElement('section');
  panel.className = 'game-panel blacksmith-panel farm-shop-panel';
  panel.style.maxWidth = '780px';

  const header = document.createElement('header');
  header.className = 'game-panel__header';

  const heading = document.createElement('div');
  const eyebrow = document.createElement('p');
  eyebrow.className = 'game-panel__eyebrow';
  eyebrow.textContent = 'Barnabé · Mestre Agropecuário de Valedouro';

  const title = document.createElement('h2');
  title.textContent = 'Comércio da Fazenda & Animais';

  const intro = document.createElement('p');
  intro.className = 'blacksmith-panel__intro';
  intro.textContent =
    'Construa abrigos rurais, crie animais machos e fêmeas para reprodução e produção, e adquira sementes para a sua terra.';
  heading.append(eyebrow, title, intro);

  const headerRight = document.createElement('div');
  headerRight.className = 'inventory-panel__header-right';

  const balance = document.createElement('div');
  balance.className = 'inventory-panel__balance';
  const coin = document.createElement('span');
  coin.className = 'coin-glyph';
  coin.setAttribute('aria-hidden', 'true');
  coin.textContent = 'G';
  balance.append(coin);

  const balanceValue = document.createElement('strong');
  balanceValue.textContent = formatGold(currentGold);
  const balanceLabel = document.createElement('small');
  balanceLabel.textContent = 'SEU OURO';
  balance.append(balanceValue, balanceLabel);

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'game-panel__close';
  closeBtn.textContent = '✕';
  closeBtn.addEventListener('click', onClose);
  headerRight.append(balance, closeBtn);

  header.append(heading, headerRight);

  // Tab navigation
  const tabsContainer = document.createElement('nav');
  tabsContainer.style.display = 'flex';
  tabsContainer.style.gap = '8px';
  tabsContainer.style.padding = '8px 18px';
  tabsContainer.style.borderBottom = '1px solid rgba(255, 255, 255, 0.08)';
  tabsContainer.style.background = 'rgba(0, 0, 0, 0.25)';

  const btnTabBuildings = document.createElement('button');
  btnTabBuildings.type = 'button';
  btnTabBuildings.className = 'ghost-button';
  btnTabBuildings.textContent = '🏚 Abrigos & Construções';

  const btnTabAnimals = document.createElement('button');
  btnTabAnimals.type = 'button';
  btnTabAnimals.className = 'ghost-button';
  btnTabAnimals.textContent = '🐾 Animais (Machos e Fêmeas)';

  const btnTabSeeds = document.createElement('button');
  btnTabSeeds.type = 'button';
  btnTabSeeds.className = 'ghost-button';
  btnTabSeeds.textContent = '🌱 Sementes';
  const btnTabCare = document.createElement('button');
  btnTabCare.type = 'button';
  btnTabCare.className = 'ghost-button';
  btnTabCare.textContent = '🥣 Rações & Cuidados';

  tabsContainer.append(btnTabBuildings, btnTabAnimals, btnTabSeeds, btnTabCare);

  const contentArea = document.createElement('div');
  contentArea.style.padding = '16px 18px';
  contentArea.style.maxHeight = '480px';
  contentArea.style.overflowY = 'auto';

  const feedbackArea = document.createElement('div');
  feedbackArea.style.margin = '0 18px 10px';
  feedbackArea.style.fontSize = '13px';
  feedbackArea.style.minHeight = '20px';

  function showMessage(text: string, isError = false) {
    feedbackArea.textContent = text;
    feedbackArea.style.color = isError ? '#f87171' : '#4ade80';
  }

  function updateBalance() {
    balanceValue.textContent = formatGold(currentGold);
  }

  function renderActiveTab() {
    contentArea.replaceChildren();
    [btnTabBuildings, btnTabAnimals, btnTabSeeds, btnTabCare].forEach((btn) => {
      btn.style.borderColor = 'rgba(255, 255, 255, 0.15)';
      btn.style.color = '#c5d5e5';
    });

    if (activeTab === 'buildings') {
      btnTabBuildings.style.borderColor = '#86efac';
      btnTabBuildings.style.color = '#86efac';
      renderBuildingsTab();
    } else if (activeTab === 'animals') {
      btnTabAnimals.style.borderColor = '#86efac';
      btnTabAnimals.style.color = '#86efac';
      renderAnimalsTab();
    } else if (activeTab === 'seeds') {
      btnTabSeeds.style.borderColor = '#86efac';
      btnTabSeeds.style.color = '#86efac';
      renderSeedsTab();
    } else {
      btnTabCare.style.borderColor = '#86efac';
      btnTabCare.style.color = '#86efac';
      renderCareTab();
    }
  }

  function renderBuildingsTab() {
    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(220px, 1fr))';
    grid.style.gap = '14px';

    Object.values(FARM_BUILDINGS).forEach((b) => {
      const isOwned = currentFarm.buildings.includes(b.id);
      const card = document.createElement('div');
      card.style.background = 'rgba(25, 36, 45, 0.7)';
      card.style.border = isOwned ? '1px solid #4ade80' : '1px solid rgba(255, 255, 255, 0.12)';
      card.style.borderRadius = '8px';
      card.style.padding = '14px';
      card.style.display = 'flex';
      card.style.flexDirection = 'column';
      card.style.justifyContent = 'space-between';

      const top = document.createElement('div');
      const iconSpan = document.createElement('div');
      iconSpan.style.fontSize = '32px';
      iconSpan.style.marginBottom = '6px';
      iconSpan.textContent = b.icon;

      const nameH3 = document.createElement('h3');
      nameH3.style.margin = '0 0 6px';
      nameH3.style.fontSize = '16px';
      nameH3.style.color = '#fef08a';
      nameH3.textContent = b.name;

      const descP = document.createElement('p');
      descP.style.margin = '0 0 10px';
      descP.style.fontSize = '12px';
      descP.style.color = '#94a3b8';
      descP.style.lineHeight = '1.4';
      descP.textContent = b.description;

      const capP = document.createElement('p');
      capP.style.margin = '0 0 12px';
      capP.style.fontSize = '11px';
      capP.style.color = '#7dd3fc';
      capP.textContent = `Capacidade: até ${b.capacity} animais`;

      top.append(iconSpan, nameH3, descP, capP);

      const bottom = document.createElement('div');
      if (isOwned) {
        const badge = document.createElement('div');
        badge.style.textAlign = 'center';
        badge.style.padding = '8px';
        badge.style.background = 'rgba(34, 197, 94, 0.15)';
        badge.style.color = '#86efac';
        badge.style.borderRadius = '6px';
        badge.style.fontWeight = 'bold';
        badge.style.fontSize = '12px';
        badge.textContent = '✓ Construído na Fazenda';
        bottom.append(badge);
      } else {
        const buyBtn = document.createElement('button');
        buyBtn.type = 'button';
        buyBtn.className = 'button-primary';
        buyBtn.style.width = '100%';
        buyBtn.style.padding = '8px';
        buyBtn.textContent = `Construir (${formatGold(b.cost)} Ouro)`;
        if (currentGold < b.cost) {
          buyBtn.disabled = true;
          buyBtn.style.opacity = '0.5';
          buyBtn.style.cursor = 'not-allowed';
          buyBtn.title = 'Ouro insuficiente';
        }
        buyBtn.addEventListener('click', async () => {
          buyBtn.disabled = true;
          buyBtn.textContent = 'Construindo…';
          try {
            const res = await onBuyBuilding(b.id);
            currentFarm = res.farm;
            currentGold = res.gold;
            updateBalance();
            showMessage(res.message ?? `${b.name} construído com sucesso!`);
            renderActiveTab();
          } catch (err) {
            showMessage(err instanceof Error ? err.message : 'Falha ao construir.', true);
            buyBtn.disabled = false;
            buyBtn.textContent = `Construir (${formatGold(b.cost)} Ouro)`;
          }
        });
        bottom.append(buyBtn);
      }

      card.append(top, bottom);
      grid.append(card);
    });

    contentArea.append(grid);
  }

  function renderAnimalsTab() {
    const banner = document.createElement('div');
    banner.style.padding = '10px 14px';
    banner.style.marginBottom = '14px';
    banner.style.background = 'rgba(234, 179, 8, 0.12)';
    banner.style.border = '1px solid rgba(234, 179, 8, 0.3)';
    banner.style.borderRadius = '6px';
    banner.style.fontSize = '12px';
    banner.style.color = '#fde047';
    banner.textContent =
      'Atenção: Cada animal precisa da sua respectiva instalação (Galinheiro, Curral ou Estábulo) já comprada para ser criado. Machos e fêmeas poderão se reproduzir!';
    contentArea.append(banner);

    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(230px, 1fr))';
    grid.style.gap = '14px';

    Object.values(FARM_ANIMALS).forEach((a) => {
      const hasBuilding = currentFarm.buildings.includes(a.requiredBuilding);
      const buildingDef = FARM_BUILDINGS[a.requiredBuilding];
      const countInBuilding = currentFarm.animals.filter((x) => x.buildingId === a.requiredBuilding).length;
      const isFull = countInBuilding >= buildingDef.capacity;

      const card = document.createElement('div');
      card.style.background = 'rgba(25, 36, 45, 0.7)';
      card.style.border = hasBuilding
        ? '1px solid rgba(134, 239, 172, 0.3)'
        : '1px solid rgba(239, 68, 68, 0.25)';
      card.style.borderRadius = '8px';
      card.style.padding = '14px';
      card.style.display = 'flex';
      card.style.flexDirection = 'column';
      card.style.justifyContent = 'space-between';

      const top = document.createElement('div');
      const headerRow = document.createElement('div');
      headerRow.style.display = 'flex';
      headerRow.style.justifyContent = 'space-between';
      headerRow.style.alignItems = 'center';
      headerRow.style.marginBottom = '8px';

      const iconSpan = document.createElement('span');
      iconSpan.style.fontSize = '30px';
      iconSpan.textContent = a.icon;

      const genderBadge = document.createElement('span');
      genderBadge.style.fontSize = '11px';
      genderBadge.style.padding = '3px 8px';
      genderBadge.style.borderRadius = '12px';
      genderBadge.style.fontWeight = 'bold';
      if (a.gender === 'male') {
        genderBadge.style.background = 'rgba(59, 130, 246, 0.2)';
        genderBadge.style.color = '#93c5fd';
        genderBadge.textContent = '♂ Macho';
      } else {
        genderBadge.style.background = 'rgba(244, 114, 182, 0.2)';
        genderBadge.style.color = '#fbcfe8';
        genderBadge.textContent = '♀ Fêmea';
      }

      headerRow.append(iconSpan, genderBadge);

      const nameH3 = document.createElement('h3');
      nameH3.style.margin = '0 0 4px';
      nameH3.style.fontSize = '15px';
      nameH3.style.color = '#fef08a';
      nameH3.textContent = a.name;

      const speciesP = document.createElement('p');
      speciesP.style.margin = '0 0 6px';
      speciesP.style.fontSize = '11px';
      speciesP.style.color = '#38bdf8';
      speciesP.textContent = `${a.speciesName} • Tier ${a.tier.toUpperCase()}`;

      const descP = document.createElement('p');
      descP.style.margin = '0 0 8px';
      descP.style.fontSize = '12px';
      descP.style.color = '#94a3b8';
      descP.style.lineHeight = '1.35';
      descP.textContent = a.description;

      const reqP = document.createElement('p');
      reqP.style.margin = '0 0 10px';
      reqP.style.fontSize = '11px';
      reqP.style.fontWeight = 'bold';
      if (hasBuilding) {
        reqP.style.color = '#4ade80';
        reqP.textContent = `✓ ${a.requiredBuildingName} disponível (${countInBuilding}/${buildingDef.capacity})`;
      } else {
        reqP.style.color = '#f87171';
        reqP.textContent = `🔒 Requer ${a.requiredBuildingName}`;
      }

      top.append(headerRow, nameH3, speciesP, descP, reqP);

      const bottom = document.createElement('div');
      const buyBtn = document.createElement('button');
      buyBtn.type = 'button';
      buyBtn.className = 'button-primary';
      buyBtn.style.width = '100%';
      buyBtn.style.padding = '8px';

      if (!hasBuilding) {
        buyBtn.textContent = `Requer ${a.requiredBuildingName}`;
        buyBtn.disabled = true;
        buyBtn.style.opacity = '0.45';
        buyBtn.style.cursor = 'not-allowed';
      } else if (isFull) {
        buyBtn.textContent = 'Instalação Lotada';
        buyBtn.disabled = true;
        buyBtn.style.opacity = '0.5';
      } else {
        buyBtn.textContent = `Comprar (${formatGold(a.cost)} Ouro)`;
        if (currentGold < a.cost) {
          buyBtn.disabled = true;
          buyBtn.style.opacity = '0.5';
          buyBtn.title = 'Ouro insuficiente';
        }
        buyBtn.addEventListener('click', async () => {
          buyBtn.disabled = true;
          buyBtn.textContent = 'Adquirindo…';
          try {
            const res = await onBuyAnimal(a.id);
            currentFarm = res.farm;
            currentGold = res.gold;
            updateBalance();
            showMessage(res.message ?? `${a.name} comprado e alojado com sucesso!`);
            renderActiveTab();
          } catch (err) {
            showMessage(err instanceof Error ? err.message : 'Falha ao comprar animal.', true);
            buyBtn.disabled = false;
            buyBtn.textContent = `Comprar (${formatGold(a.cost)} Ouro)`;
          }
        });
      }

      bottom.append(buyBtn);
      card.append(top, bottom);
      grid.append(card);
    });

    contentArea.append(grid);
  }

  function renderSeedsTab() {
    const introBox = document.createElement('div');
    introBox.style.padding = '10px 14px';
    introBox.style.marginBottom = '14px';
    introBox.style.background = 'rgba(74, 222, 128, 0.12)';
    introBox.style.border = '1px solid rgba(74, 222, 128, 0.25)';
    introBox.style.borderRadius = '6px';
    introBox.style.fontSize = '12px';
    introBox.style.color = '#bbf7d0';
    introBox.textContent =
      'Cada plantio consome 1 semente. Ao colher, você recebe 2 sementes de volta e os frutos vão para o armazém. O NPC vende até 10 sementes de cada cultura por dia nesta fase inicial.';
    contentArea.append(introBox);

    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(220px, 1fr))';
    grid.style.gap = '14px';

    Object.values(FARM_CROPS).forEach((crop) => {
      const bought = currentFarm.dailySeedPurchases?.quantities[crop.id] ?? 0;
      const remaining = Math.max(0, 10 - bought);
      const stock = currentFarm.seeds?.[crop.id] ?? 0;
      const card = document.createElement('div');
      card.style.background = 'rgba(25, 36, 45, 0.7)';
      card.style.border = '1px solid rgba(255, 255, 255, 0.12)';
      card.style.borderRadius = '8px';
      card.style.padding = '14px';
      const icon = document.createElement('div');
      icon.style.fontSize = '32px';
      icon.textContent = crop.icon;
      const name = document.createElement('h3');
      name.style.color = '#fef08a';
      name.textContent = crop.seedName;
      const info = document.createElement('p');
      info.style.fontSize = '12px';
      info.style.color = '#94a3b8';
      info.textContent = `No estoque: ${stock} • Compradas hoje: ${bought}/10 • ${crop.cost} ouro por semente`;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'button-primary';
      button.style.width = '100%';
      button.textContent = remaining > 0 ? `Comprar ${Math.min(5, remaining)} sementes (${crop.cost * Math.min(5, remaining)} G)` : 'Limite diário atingido';
      button.disabled = remaining <= 0 || currentGold < crop.cost * Math.min(5, remaining);
      button.addEventListener('click', async () => {
        button.disabled = true;
        try {
          const result = await onBuySeeds(crop.id, Math.min(5, remaining));
          currentFarm = result.farm;
          currentGold = result.gold;
          updateBalance();
          showMessage(result.message ?? 'Sementes compradas!');
          renderActiveTab();
        } catch (error) {
          showMessage(error instanceof Error ? error.message : 'Não foi possível comprar sementes.', true);
          button.disabled = false;
        }
      });
      card.append(icon, name, info, button);
      grid.append(card);
    });
    contentArea.append(grid);
  }

  function renderCareTab() {
    const recipes: Array<{ species: AnimalSpeciesId; title: string; icon: string; recipe: string }> = [
      { species: 'chicken', title: 'Ração para galinhas', icon: '🐔', recipe: '2 Milhos + 1 Trigo = 1 ração' },
      { species: 'cow', title: 'Ração para bovinos', icon: '🐄', recipe: '1 Milho + 2 Trigos = 1 ração' },
      { species: 'horse', title: 'Ração para cavalos', icon: '🐎', recipe: '2 Cenouras + 1 Trigo = 1 ração' }
    ];
    const note = document.createElement('p');
    note.style.color = '#cbd5e1';
    note.style.fontSize = '12px';
    note.textContent = 'Transforme suas colheitas em ração. Depois abasteça o comedouro da instalação. Os animais também precisam de água no bebedouro.';
    contentArea.append(note);

    const recipeGrid = document.createElement('div');
    recipeGrid.style.display = 'grid';
    recipeGrid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(210px, 1fr))';
    recipeGrid.style.gap = '12px';
    recipes.forEach((recipe) => {
      const stock = currentFarm.storage[`feed-${recipe.species}`] ?? 0;
      const card = document.createElement('div');
      card.style.padding = '12px';
      card.style.borderRadius = '8px';
      card.style.background = 'rgba(25,36,45,.8)';
      card.style.border = '1px solid rgba(255,255,255,.12)';
      const title = document.createElement('strong');
      title.style.color = '#fef08a';
      title.textContent = `${recipe.icon} ${recipe.title}`;
      const recipeText = document.createElement('p');
      recipeText.style.fontSize = '12px';
      recipeText.style.color = '#cbd5e1';
      recipeText.textContent = recipe.recipe;
      const stockText = document.createElement('p');
      stockText.style.fontSize = '12px';
      stockText.textContent = `Ração pronta: ${stock}`;
      const craft = document.createElement('button');
      craft.type = 'button';
      craft.className = 'button-primary';
      craft.textContent = 'Preparar 1 ração';
      craft.addEventListener('click', async () => {
        craft.disabled = true;
        try {
          const result = await onCraftFeed(recipe.species, 1);
          currentFarm = result.farm;
          currentGold = result.gold;
          updateBalance();
          showMessage(result.message ?? 'Ração preparada!');
          renderActiveTab();
        } catch (error) {
          showMessage(error instanceof Error ? error.message : 'Colheita insuficiente para preparar ração.', true);
          craft.disabled = false;
        }
      });
      card.append(title, recipeText, stockText, craft);
      recipeGrid.append(card);
    });
    contentArea.append(recipeGrid);

    const troughTitle = document.createElement('h3');
    troughTitle.style.color = '#fef08a';
    troughTitle.style.marginTop = '20px';
    troughTitle.textContent = 'Comedouros e bebedouros';
    contentArea.append(troughTitle);

    (Object.keys(FARM_BUILDINGS) as FarmBuildingId[]).forEach((buildingId) => {
      if (!currentFarm.buildings.includes(buildingId)) return;
      const building = FARM_BUILDINGS[buildingId];
      const care = currentFarm.animalCare?.[buildingId] ?? { feed: 0, water: 0 };
      const species = building.allowedSpecies[0]!;
      const card = document.createElement('div');
      card.style.display = 'flex';
      card.style.flexWrap = 'wrap';
      card.style.alignItems = 'center';
      card.style.justifyContent = 'space-between';
      card.style.gap = '10px';
      card.style.padding = '12px';
      card.style.marginTop = '8px';
      card.style.borderRadius = '8px';
      card.style.background = 'rgba(25,36,45,.8)';
      const info = document.createElement('div');
      const heading = document.createElement('strong');
      heading.style.color = '#fef08a';
      heading.textContent = building.name;
      const values = document.createElement('p');
      values.style.fontSize = '12px';
      values.style.color = '#cbd5e1';
      values.textContent = `🥣 Comedouro: ${care.feed}/30  •  🚰 Bebedouro: ${care.water}/30  •  Ração no estoque: ${currentFarm.storage[`feed-${species}`] ?? 0}`;
      info.append(heading, values);
      const actions = document.createElement('div');
      actions.style.display = 'flex';
      actions.style.gap = '6px';
      (['feed', 'water'] as const).forEach((kind) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'ghost-button';
        button.textContent = kind === 'feed' ? 'Abastecer comedouro +5' : 'Encher bebedouro +5';
        button.addEventListener('click', async () => {
          button.disabled = true;
          try {
            const result = await onFillTrough(buildingId, kind, 5);
            currentFarm = result.farm;
            currentGold = result.gold;
            updateBalance();
            showMessage(result.message ?? 'Instalação abastecida!');
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
    if (currentFarm.buildings.length === 0) {
      const empty = document.createElement('p');
      empty.style.color = '#fbbf24';
      empty.textContent = 'Construa primeiro um galinheiro, curral ou estábulo para instalar comedouros e bebedouros.';
      contentArea.append(empty);
    }
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

  panel.append(header, tabsContainer, feedbackArea, contentArea);
  overlay.append(panel);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) onClose();
  });

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      window.removeEventListener('keydown', onKey);
      onClose();
    }
  };
  window.addEventListener('keydown', onKey);

  root.append(overlay);
  renderActiveTab();
}
