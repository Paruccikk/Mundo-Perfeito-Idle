import type { InventorySnapshot, FarmInventoryItem } from '../api';

function formatGold(value: number): string {
  return Math.max(0, Math.floor(value)).toLocaleString('pt-BR');
}

function createSection(titleText: string, subtitleText: string, items: FarmInventoryItem[], onSellFarmItem: (key: string) => Promise<InventorySnapshot>, root: HTMLElement, callbacks: {
  onEquip: (id: string) => Promise<InventorySnapshot>;
  onUnequip: (slot: string) => Promise<InventorySnapshot>;
  onUse: (id: string) => Promise<InventorySnapshot>;
  onClose: () => void;
}): HTMLElement {
  const section = document.createElement('section');
  section.className = 'farm-inventory-section';
  const heading = document.createElement('div');
  heading.className = 'farm-inventory-section__heading';
  const title = document.createElement('h3');
  title.textContent = titleText;
  const subtitle = document.createElement('p');
  subtitle.textContent = subtitleText;
  heading.append(title, subtitle);
  section.append(heading);

  const grid = document.createElement('div');
  grid.className = 'farm-inventory-grid';
  for (const item of items) {
    const card = document.createElement('article');
    card.className = 'farm-inventory-card';
    const icon = document.createElement('span');
    icon.className = 'farm-inventory-card__icon';
    icon.textContent = item.icon;
    const info = document.createElement('div');
    info.className = 'farm-inventory-card__info';
    const name = document.createElement('strong');
    name.textContent = item.name;
    const quantity = document.createElement('small');
    quantity.textContent = `${item.quantity} unidades`;
    info.append(name, quantity);
    card.append(icon, info);

    if (item.category === 'crop' && item.quantity > 0) {
      const sell = document.createElement('button');
      sell.type = 'button';
      sell.className = 'farm-inventory-card__sell';
      sell.textContent = 'Vender 1 · 1.000 ouro';
      sell.addEventListener('click', async () => {
        sell.disabled = true;
        sell.textContent = 'Vendendo...';
        try {
          const updated = await onSellFarmItem(item.key);
          renderInventoryPanel(root, updated, callbacks.onEquip, callbacks.onUnequip, callbacks.onUse, onSellFarmItem, callbacks.onClose);
        } catch (error) {
          sell.disabled = false;
          sell.textContent = error instanceof Error ? error.message : 'Não foi possível vender';
        }
      });
      card.append(sell);
    }
    grid.append(card);
  }
  if (!items.length) {
    const empty = document.createElement('p');
    empty.className = 'farm-inventory-empty';
    empty.textContent = 'Nada armazenado nesta categoria por enquanto.';
    grid.append(empty);
  }
  section.append(grid);
  return section;
}

export function renderInventoryPanel(
  root: HTMLElement,
  inventory: InventorySnapshot,
  onEquip: (inventoryItemId: string) => Promise<InventorySnapshot>,
  onUnequip: (slot: string) => Promise<InventorySnapshot>,
  onUse: (inventoryItemId: string) => Promise<InventorySnapshot>,
  onSellFarmItem: (itemKey: string) => Promise<InventorySnapshot>,
  onClose: () => void
): void {
  root.querySelector('.game-panel-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'game-panel-overlay';
  const panel = document.createElement('section');
  panel.className = 'game-panel inventory-panel farm-inventory-panel';

  const header = document.createElement('header');
  header.className = 'game-panel__header farm-inventory-header';
  const heading = document.createElement('div');
  const eyebrow = document.createElement('p');
  eyebrow.className = 'game-panel__eyebrow';
  eyebrow.textContent = `Fazenda de ${inventory.farmSummary?.name ?? 'sua propriedade'}`;
  const title = document.createElement('h2');
  title.textContent = 'Inventário da Fazenda';
  const description = document.createElement('p');
  description.className = 'farm-inventory-header__description';
  description.textContent = 'Tudo o que sua propriedade produz e utiliza fica organizado aqui.';
  heading.append(eyebrow, title, description);

  const balance = document.createElement('div');
  balance.className = 'inventory-panel__balance';
  const coin = document.createElement('span');
  coin.className = 'coin-glyph';
  coin.textContent = 'G';
  coin.setAttribute('aria-hidden', 'true');
  const gold = document.createElement('strong');
  gold.textContent = formatGold(inventory.gold);
  const goldLabel = document.createElement('small');
  goldLabel.textContent = 'OURO';
  balance.append(coin, gold, goldLabel);

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'game-panel__close';
  close.textContent = '✕';
  close.setAttribute('aria-label', 'Fechar inventário');
  close.addEventListener('click', onClose);
  const right = document.createElement('div');
  right.className = 'inventory-panel__header-right';
  right.append(balance, close);
  header.append(heading, right);

  const summary = document.createElement('div');
  summary.className = 'farm-inventory-summary';
  const stats = [
    { icon: '🏡', label: 'Instalações', value: `${inventory.farmSummary?.installations ?? 0}/${inventory.farmSummary?.maxInstallations ?? 3}` },
    { icon: '🐄', label: 'Animais', value: String(inventory.farmSummary?.animals ?? 0) },
    { icon: '🌱', label: 'Canteiros', value: String(inventory.farmSummary?.plots ?? 6) }
  ];
  for (const stat of stats) {
    const tile = document.createElement('div');
    tile.className = 'farm-inventory-summary__item';
    const icon = document.createElement('span');
    icon.textContent = stat.icon;
    const label = document.createElement('small');
    label.textContent = stat.label;
    const value = document.createElement('strong');
    value.textContent = stat.value;
    tile.append(icon, label, value);
    summary.append(tile);
  }

  const items = inventory.farmItems ?? [];
  const storage = items.filter((item) => item.category === 'crop');
  const seeds = items.filter((item) => item.category === 'seed');
  const feed = items.filter((item) => item.category === 'feed');
  const content = document.createElement('div');
  content.className = 'farm-inventory-content';
  content.append(
    createSection('Armazém', 'Produtos colhidos e prontos para uso ou venda.', storage, onSellFarmItem, root, { onEquip, onUnequip, onUse, onClose }),
    createSection('Sementes', 'Sementes disponíveis para iniciar novas plantações.', seeds, onSellFarmItem, root, { onEquip, onUnequip, onUse, onClose }),
    createSection('Rações', 'Alimento preparado para cuidar dos animais do rancho.', feed, onSellFarmItem, root, { onEquip, onUnequip, onUse, onClose })
  );

  panel.append(header, summary, content);
  overlay.append(panel);
  overlay.addEventListener('click', (event) => { if (event.target === overlay) onClose(); });
  root.append(overlay);
}
