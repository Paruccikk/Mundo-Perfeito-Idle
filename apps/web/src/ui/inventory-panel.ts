import type { InventorySnapshot } from '../api';

type FilterId = 'all' | 'equipment' | 'potions' | 'loot';

const SLOT_NAMES: Record<string, string> = {
  weapon: 'Arma', head: 'Cabeça', chest: 'Peitoral',
  legs: 'Pernas', boots: 'Botas', accessory: 'Acessório'
};

function itemIcon(item: { itemId: string; category: string; slot: string | null; name: string }): string {
  const id = item.itemId.toLowerCase();
  if (id.includes('potion') || item.category === 'consumable') {
    if (id.includes('mp')) return '🧪';
    if (id.includes('revive')) return '✨';
    return '❤️';
  }
  if (id.includes('bow')) return '🏹';
  if (id.includes('sword') || id.includes('blade')) return '🗡️';
  if (id.includes('staff') || id.includes('mace')) return '🔱';
  if (id.includes('ring')) return '💍';
  if (id.includes('hood') || item.slot === 'head') return '🪖';
  if (item.slot === 'chest' || item.slot === 'legs' || item.slot === 'boots' || item.category === 'armor') return '🛡️';
  if (item.category === 'trophy') return '🏆';
  if (item.category === 'material') return '💎';
  if (item.name.toLowerCase().includes('couro')) return '🟤';
  return '📦';
}

function formatGold(value: number): string {
  return Math.max(0, Math.floor(value)).toLocaleString('pt-BR');
}

export function renderInventoryPanel(
  root: HTMLElement,
  inventory: InventorySnapshot,
  onEquip: (inventoryItemId: string) => Promise<InventorySnapshot>,
  onUnequip: (slot: string) => Promise<InventorySnapshot>,
  onUse: (inventoryItemId: string) => Promise<InventorySnapshot>,
  onClose: () => void
): void {
  root.querySelector('.game-panel-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'game-panel-overlay';
  const panel = document.createElement('section');
  panel.className = 'game-panel inventory-panel inventory-panel--mmorpg';

  const header = document.createElement('header');
  header.className = 'game-panel__header';
  const heading = document.createElement('div');
  const eyebrow = document.createElement('p');
  eyebrow.className = 'game-panel__eyebrow';
  eyebrow.textContent = 'Pertences do aventureiro';
  const title = document.createElement('h2');
  title.textContent = 'Inventário';
  heading.append(eyebrow, title);
  const balance = document.createElement('div');
  balance.className = 'inventory-panel__balance';
  const coin = document.createElement('span');
  coin.className = 'coin-glyph';
  coin.setAttribute('aria-hidden', 'true');
  coin.textContent = 'G';
  balance.append(coin);
  const balanceValue = document.createElement('strong');
  balanceValue.textContent = formatGold(inventory.gold);
  const balanceLabel = document.createElement('small');
  balanceLabel.textContent = 'OURO';
  balance.append(balanceValue, balanceLabel);
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'game-panel__close';
  close.textContent = '✕';
  close.addEventListener('click', onClose);
  const headerRight = document.createElement('div');
  headerRight.className = 'inventory-panel__header-right';
  headerRight.append(balance, close);
  header.append(heading, headerRight);

  const equipmentTitle = document.createElement('h3');
  equipmentTitle.className = 'game-panel__section-title';
  equipmentTitle.textContent = 'Equipamento';
  const equipment = document.createElement('div');
  equipment.className = 'inventory-panel__equipment';
  const slots = ['weapon', 'head', 'chest', 'legs', 'boots', 'accessory'];
  for (const slot of slots) {
    const entry = inventory.equipment.find((item) => item.slot === slot);
    const card = document.createElement('div');
    card.className = 'inventory-equipment-slot';
    const icon = document.createElement('span');
    icon.className = 'inventory-equipment-slot__icon';
    icon.textContent = entry ? itemIcon(entry.item) : '＋';
    const label = document.createElement('small');
    label.textContent = SLOT_NAMES[slot] ?? slot;
    const itemName = document.createElement('strong');
    itemName.textContent = entry?.item.name ?? 'Vazio';
    card.append(icon, label, itemName);
    if (entry) {
      card.classList.add(`inventory-equipment-slot--${entry.item.rarity}`);
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'inventory-mini-action';
      remove.textContent = 'Retirar';
      remove.addEventListener('click', async () => {
        remove.disabled = true;
        try {
          renderInventoryPanel(root, await onUnequip(slot), onEquip, onUnequip, onUse, onClose);
        } catch (error) {
          remove.disabled = false;
          remove.textContent = error instanceof Error ? error.message : 'Erro';
        }
      });
      card.append(remove);
    }
    equipment.append(card);
  }

  const bagTitle = document.createElement('h3');
  bagTitle.className = 'game-panel__section-title';
  bagTitle.textContent = 'Mochila';
  const filters = document.createElement('div');
  filters.className = 'inventory-panel__filters';
  const filterOptions: Array<{ id: FilterId; label: string }> = [
    { id: 'all', label: 'Todos' },
    { id: 'equipment', label: 'Equipamentos' },
    { id: 'potions', label: 'Poções' },
    { id: 'loot', label: 'Materiais e loot' }
  ];
  let activeFilter: FilterId = 'all';
  let selectedItemId = inventory.items[0]?.id ?? '';
  const content = document.createElement('div');
  content.className = 'inventory-panel__content';
  const grid = document.createElement('div');
  grid.className = 'inventory-panel__bag-grid';
  const details = document.createElement('aside');
  details.className = 'inventory-item-details';

  const visibleItems = (): typeof inventory.items => inventory.items.filter((item) => {
    if (activeFilter === 'equipment') return Boolean(item.slot) || item.category === 'weapon' || item.category === 'armor';
    if (activeFilter === 'potions') return item.category === 'consumable';
    if (activeFilter === 'loot') return item.category === 'material' || item.category === 'trophy';
    return true;
  });

  const renderDetails = (): void => {
    details.replaceChildren();
    const item = inventory.items.find((entry) => entry.id === selectedItemId);
    if (!item) {
      const empty = document.createElement('p');
      empty.className = 'inventory-panel__empty';
      empty.textContent = 'Selecione um item da mochila para ver seus detalhes.';
      details.append(empty);
      return;
    }
    const icon = document.createElement('div');
    icon.className = `inventory-item-details__icon inventory-item--${item.rarity}`;
    icon.textContent = itemIcon(item);
    const name = document.createElement('h4');
    name.textContent = item.name;
    name.className = `inventory-item-details__name inventory-item-details__name--${item.rarity}`;
    const rarity = document.createElement('span');
    rarity.className = 'inventory-item-details__rarity';
    rarity.textContent = item.rarity.toUpperCase();
    const description = document.createElement('p');
    description.textContent = item.description;
    const meta = document.createElement('div');
    meta.className = 'inventory-item-details__meta';
    meta.textContent = `Quantidade: ${item.quantity} · Nível necessário: ${item.levelReq}`;
    const sale = document.createElement('div');
    sale.className = 'inventory-item-details__sale';
    sale.textContent = `Valor no ferreiro: ${formatGold(item.sellPrice)} ouro por unidade`;
    details.append(icon, name, rarity, description, meta, sale);

    if (item.stats && Object.keys(item.stats).length) {
      const stats = document.createElement('div');
      stats.className = 'inventory-item-details__stats';
      const statNames: Record<string, string> = {
        constitution: 'Constituição', strength: 'Força', intelligence: 'Inteligência',
        dexterity: 'Destreza', physicalDamage: 'Dano físico', magicDamage: 'Dano mágico',
        physicalDefense: 'Defesa física', magicDefense: 'Defesa mágica',
        maxHp: 'HP máximo', maxMp: 'MP máximo', critChance: 'Crítico'
      };
      for (const [key, value] of Object.entries(item.stats)) {
        if (!value) continue;
        const line = document.createElement('span');
        line.textContent = `${statNames[key] ?? key}: +${value}`;
        stats.append(line);
      }
      details.append(stats);
    }

    const actions = document.createElement('div');
    actions.className = 'inventory-item-details__actions';
    if (item.slot || item.category === 'weapon' || item.category === 'armor') {
      const equip = document.createElement('button');
      equip.type = 'button';
      equip.className = 'primary-button';
      equip.textContent = 'Equipar';
      equip.addEventListener('click', async () => {
        equip.disabled = true;
        try { renderInventoryPanel(root, await onEquip(item.id), onEquip, onUnequip, onUse, onClose); }
        catch (error) { equip.disabled = false; equip.textContent = error instanceof Error ? error.message : 'Erro ao equipar'; }
      });
      actions.append(equip);
    }
    if (item.category === 'consumable' && item.itemId !== 'revive-potion') {
      const use = document.createElement('button');
      use.type = 'button';
      use.className = 'ghost-button';
      use.textContent = 'Usar item';
      use.addEventListener('click', async () => {
        use.disabled = true;
        try { renderInventoryPanel(root, await onUse(item.id), onEquip, onUnequip, onUse, onClose); }
        catch (error) { use.disabled = false; use.textContent = error instanceof Error ? error.message : 'Não foi possível usar'; }
      });
      actions.append(use);
    }
    details.append(actions);
  };

  const renderGrid = (): void => {
    grid.replaceChildren();
    const items = visibleItems();
    if (!items.length) {
      const empty = document.createElement('p');
      empty.className = 'inventory-panel__empty';
      empty.textContent = inventory.items.length ? 'Nenhum item nesta categoria.' : 'Sua mochila está vazia. Derrote monstros para encontrar equipamentos e materiais.';
      grid.append(empty);
      for (let index = 0; index < 30; index += 1) {
        const emptySlot = document.createElement('div');
        emptySlot.className = 'inventory-bag-slot inventory-bag-slot--empty';
        emptySlot.setAttribute('aria-hidden', 'true');
        grid.append(emptySlot);
      }
      selectedItemId = '';
      renderDetails();
      return;
    }
    if (!items.some((item) => item.id === selectedItemId)) selectedItemId = items[0]!.id;
    for (const item of items) {
      const slot = document.createElement('button');
      slot.type = 'button';
      slot.className = `inventory-bag-slot inventory-bag-slot--${item.rarity}${item.id === selectedItemId ? ' is-selected' : ''}`;
      slot.title = `${item.name} · ${item.description}`;
      const icon = document.createElement('span');
      icon.className = 'inventory-bag-slot__icon';
      icon.textContent = itemIcon(item);
      const quantity = document.createElement('small');
      quantity.className = 'inventory-bag-slot__quantity';
      quantity.textContent = item.quantity > 1 ? String(item.quantity) : '';
      slot.append(icon, quantity);
      slot.addEventListener('click', () => {
        selectedItemId = item.id;
        renderGrid();
      });
      grid.append(slot);
    }
    for (let index = items.length; index < 30; index += 1) {
      const emptySlot = document.createElement('div');
      emptySlot.className = 'inventory-bag-slot inventory-bag-slot--empty';
      emptySlot.setAttribute('aria-hidden', 'true');
      grid.append(emptySlot);
    }
    renderDetails();
  };

  for (const option of filterOptions) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `inventory-filter${option.id === activeFilter ? ' is-active' : ''}`;
    button.textContent = option.label;
    button.addEventListener('click', () => {
      activeFilter = option.id;
      filters.querySelectorAll('.inventory-filter').forEach((child) => child.classList.toggle('is-active', child === button));
      renderGrid();
    });
    filters.append(button);
  }

  content.append(grid, details);
  panel.append(header, equipmentTitle, equipment, bagTitle, filters, content);
  overlay.append(panel);
  overlay.addEventListener('click', (event) => { if (event.target === overlay) onClose(); });
  root.append(overlay);
  renderGrid();
}
