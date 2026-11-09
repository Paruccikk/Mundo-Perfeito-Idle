import type { InventorySnapshot } from '../api';

function formatGold(value: number): string {
  return Math.max(0, Math.floor(value)).toLocaleString('pt-BR');
}

function iconFor(item: InventorySnapshot['items'][number]): string {
  const id = item.itemId.toLowerCase();
  if (id.includes('potion')) return id.includes('mp') ? '🧪' : id.includes('revive') ? '✨' : '❤️';
  if (id.includes('bow')) return '🏹';
  if (id.includes('sword') || id.includes('blade')) return '🗡️';
  if (id.includes('staff') || id.includes('mace')) return '🔱';
  if (id.includes('ring')) return '💍';
  if (item.slot || item.category === 'armor') return '🛡️';
  if (item.category === 'trophy') return '🏆';
  if (item.category === 'material') return '💎';
  return '📦';
}

export function renderBlacksmithShop(
  root: HTMLElement,
  inventory: InventorySnapshot,
  onSell: (inventoryItemId: string, quantity: number) => Promise<InventorySnapshot>,
  onClose: () => void
): void {
  root.querySelector('.game-panel-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'game-panel-overlay';
  const panel = document.createElement('section');
  panel.className = 'game-panel blacksmith-panel';
  const header = document.createElement('header');
  header.className = 'game-panel__header';
  const heading = document.createElement('div');
  const eyebrow = document.createElement('p');
  eyebrow.className = 'game-panel__eyebrow';
  eyebrow.textContent = 'Brom · Ferreiro de Valedouro';
  const title = document.createElement('h2');
  title.textContent = 'Venda de itens';
  const intro = document.createElement('p');
  intro.className = 'blacksmith-panel__intro';
  intro.textContent = 'Vendo equipamentos, poções, materiais e troféus. Escolha um item da mochila para negociar.';
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
  balanceValue.textContent = formatGold(inventory.gold);
  const balanceLabel = document.createElement('small');
  balanceLabel.textContent = 'SEU OURO';
  balance.append(balanceValue, balanceLabel);
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'game-panel__close';
  close.textContent = '✕';
  close.addEventListener('click', onClose);
  headerRight.append(balance, close);
  header.append(heading, headerRight);

  const layout = document.createElement('div');
  layout.className = 'blacksmith-panel__layout';
  const list = document.createElement('div');
  list.className = 'blacksmith-panel__items';
  const detail = document.createElement('aside');
  detail.className = 'blacksmith-panel__detail';
  let selectedId = inventory.items[0]?.id ?? '';

  const render = (): void => {
    balanceValue.textContent = formatGold(inventory.gold);
    list.replaceChildren();
    if (!inventory.items.length) {
      const empty = document.createElement('p');
      empty.className = 'inventory-panel__empty';
      empty.textContent = 'Você não tem itens na mochila para vender.';
      list.append(empty);
      detail.replaceChildren();
      return;
    }
    for (const item of inventory.items) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `blacksmith-item${selectedId === item.id ? ' is-selected' : ''}`;
      const icon = document.createElement('span');
      icon.className = `blacksmith-item__icon inventory-item--${item.rarity}`;
      icon.textContent = iconFor(item);
      const copy = document.createElement('span');
      copy.className = 'blacksmith-item__copy';
      const name = document.createElement('strong');
      name.textContent = item.name;
      const meta = document.createElement('small');
      meta.textContent = `Qtd. ${item.quantity} · ${item.rarity}`;
      copy.append(name, meta);
      const price = document.createElement('b');
      price.textContent = `ouro ${formatGold(item.sellPrice * item.quantity)}`;
      button.append(icon, copy, price);
      button.addEventListener('click', () => { selectedId = item.id; render(); });
      list.append(button);
    }

    detail.replaceChildren();
    const item = inventory.items.find((entry) => entry.id === selectedId);
    if (!item) return;
    const icon = document.createElement('div');
    icon.className = `blacksmith-detail__icon inventory-item--${item.rarity}`;
    icon.textContent = iconFor(item);
    const name = document.createElement('h3');
    name.textContent = item.name;
    const description = document.createElement('p');
    description.textContent = item.description;
    const unitPrice = document.createElement('div');
    unitPrice.className = 'blacksmith-detail__price';
    unitPrice.textContent = `🪙 ${formatGold(item.sellPrice)} por unidade`;
    const total = document.createElement('strong');
    total.className = 'blacksmith-detail__total';
    total.textContent = `Total da pilha: ${formatGold(item.sellPrice * item.quantity)} ouro`;
    const quantity = document.createElement('small');
    quantity.textContent = `Você possui ${item.quantity} unidade(s).`;
    const sell = document.createElement('button');
    sell.type = 'button';
    sell.className = 'primary-button blacksmith-detail__sell';
    sell.textContent = `Vender pilha · ${formatGold(item.sellPrice * item.quantity)} 🪙`;
    sell.addEventListener('click', async () => {
      const totalValue = item.sellPrice * item.quantity;
      if (!window.confirm(`Vender ${item.quantity}x ${item.name} por ${formatGold(totalValue)} ouro?`)) return;
      sell.disabled = true;
      sell.textContent = 'Concluindo venda…';
      try {
        const updated = await onSell(item.id, item.quantity);
        inventory = updated;
        selectedId = updated.items[0]?.id ?? '';
        render();
      } catch (error) {
        sell.disabled = false;
        sell.textContent = error instanceof Error ? error.message : 'Falha na venda';
      }
    });
    detail.append(icon, name, description, unitPrice, total, quantity, sell);
  };
  layout.append(list, detail);
  panel.append(header, layout);
  overlay.append(panel);
  overlay.addEventListener('click', (event) => { if (event.target === overlay) onClose(); });
  root.append(overlay);
  render();
}
