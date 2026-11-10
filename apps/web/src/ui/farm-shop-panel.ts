import {
  FARM_BUILDINGS,
  FARM_ANIMALS,
  FARM_CROPS,
  type FarmBuildingId,
  type FarmState,
  type FarmResponse
} from '@mundo-perfeito/shared';

function formatGold(value: number): string {
  return Math.max(0, Math.floor(value)).toLocaleString('pt-BR');
}

export function renderFarmShop(
  root: HTMLElement,
  farmData: FarmResponse,
  onBuyBuilding: (buildingId: FarmBuildingId) => Promise<FarmResponse>,
  onBuyAnimal: (animalId: string) => Promise<FarmResponse>,
  onGoToFarm: () => void,
  onClose: () => void
): void {
  root.querySelector('.game-panel-overlay')?.remove();

  let currentFarm = farmData.farm;
  let currentGold = farmData.gold;
  let activeTab: 'buildings' | 'animals' | 'seeds' = 'buildings';

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
  btnTabSeeds.textContent = '🌱 Sementes & Cultivo';

  tabsContainer.append(btnTabBuildings, btnTabAnimals, btnTabSeeds);

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
    [btnTabBuildings, btnTabAnimals, btnTabSeeds].forEach((btn) => {
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
    } else {
      btnTabSeeds.style.borderColor = '#86efac';
      btnTabSeeds.style.color = '#86efac';
      renderSeedsTab();
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
      'As sementes são plantadas diretamente nos canteiros da sua fazenda. Após a colheita, os alimentos podem ser usados para alimentar animais ou negociados!';
    contentArea.append(introBox);

    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(220px, 1fr))';
    grid.style.gap = '14px';

    Object.values(FARM_CROPS).forEach((crop) => {
      const card = document.createElement('div');
      card.style.background = 'rgba(25, 36, 45, 0.7)';
      card.style.border = '1px solid rgba(255, 255, 255, 0.12)';
      card.style.borderRadius = '8px';
      card.style.padding = '14px';
      card.style.display = 'flex';
      card.style.flexDirection = 'column';
      card.style.justifyContent = 'space-between';

      const top = document.createElement('div');
      const iconSpan = document.createElement('div');
      iconSpan.style.fontSize = '32px';
      iconSpan.style.marginBottom = '6px';
      iconSpan.textContent = crop.icon;

      const nameH3 = document.createElement('h3');
      nameH3.style.margin = '0 0 4px';
      nameH3.style.fontSize = '15px';
      nameH3.style.color = '#fef08a';
      nameH3.textContent = crop.seedName;

      const timeP = document.createElement('p');
      timeP.style.margin = '0 0 6px';
      timeP.style.fontSize = '11px';
      timeP.style.color = '#7dd3fc';
      timeP.textContent = `Tempo: ${crop.growthSeconds}s • Rendimento: ${crop.yieldMin}-${crop.yieldMax} unidades`;

      const descP = document.createElement('p');
      descP.style.margin = '0 0 10px';
      descP.style.fontSize = '12px';
      descP.style.color = '#94a3b8';
      descP.textContent = crop.description;

      top.append(iconSpan, nameH3, timeP, descP);

      const bottom = document.createElement('div');
      const goBtn = document.createElement('button');
      goBtn.type = 'button';
      goBtn.className = 'button-primary';
      goBtn.style.width = '100%';
      goBtn.style.padding = '8px';
      goBtn.textContent = `Ir à Fazenda Plantar (${crop.cost} G)`;
      goBtn.addEventListener('click', () => {
        onClose();
        onGoToFarm();
      });

      bottom.append(goBtn);
      card.append(top, bottom);
      grid.append(card);
    });

    contentArea.append(grid);
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
