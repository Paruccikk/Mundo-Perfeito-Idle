import type { InventorySnapshot } from '../api';

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
  panel.className = 'game-panel inventory-panel';
  const header = document.createElement('header');
  header.className = 'game-panel__header';
  const heading = document.createElement('div');
  const eyebrow = document.createElement('p');
  eyebrow.className = 'game-panel__eyebrow';
  eyebrow.textContent = 'Equipamentos e itens';
  const title = document.createElement('h2');
  title.textContent = 'Inventário';
  heading.append(eyebrow, title);
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'game-panel__close';
  close.textContent = '✕';
  close.addEventListener('click', onClose);
  header.append(heading, close);

  const equippedTitle = document.createElement('h3');
  equippedTitle.className = 'game-panel__section-title';
  equippedTitle.textContent = 'Equipado';
  const equipped = document.createElement('div');
  equipped.className = 'inventory-panel__grid';
  const slots = ['weapon', 'head', 'chest', 'legs', 'boots', 'accessory'];
  const names: Record<string, string> = { weapon: 'Arma', head: 'Cabeça', chest: 'Peitoral', legs: 'Pernas', boots: 'Botas', accessory: 'Acessório' };
  for (const slot of slots) {
    const entry = inventory.equipment.find((item) => item.slot === slot);
    const card = document.createElement('div');
    card.className = 'inventory-slot';
    const label = document.createElement('small');
    label.textContent = names[slot] ?? slot;
    const item = document.createElement('strong');
    item.textContent = entry?.item.name ?? 'Vazio';
    card.append(label, item);
    if (entry) {
      const unequip = document.createElement('button');
      unequip.type = 'button';
      unequip.className = 'ghost-button';
      unequip.textContent = 'Retirar';
      unequip.addEventListener('click', async () => {
        unequip.disabled = true;
        try { renderInventoryPanel(root, await onUnequip(slot), onEquip, onUnequip, onUse, onClose); }
        catch (error) { unequip.disabled = false; unequip.textContent = error instanceof Error ? error.message : 'Erro'; }
      });
      card.append(unequip);
    }
    equipped.append(card);
  }

  const bagTitle = document.createElement('h3');
  bagTitle.className = 'game-panel__section-title';
  bagTitle.textContent = 'Mochila';
  const list = document.createElement('div');
  list.className = 'inventory-panel__list';
  if (!inventory.items.length) {
    const empty = document.createElement('p');
    empty.className = 'inventory-panel__empty';
    empty.textContent = 'Seu inventário está vazio. Continue derrotando monstros para encontrar itens.';
    list.append(empty);
  }
  for (const item of inventory.items) {
    const row = document.createElement('article');
    row.className = `inventory-item inventory-item--${item.rarity}`;
    const copy = document.createElement('div');
    const name = document.createElement('strong');
    name.textContent = item.name;
    const description = document.createElement('small');
    description.textContent = `${item.description} • ${item.rarity} • Qtd: ${item.quantity}`;
    copy.append(name, description);
    row.append(copy);
    if (item.slot) {
      const equip = document.createElement('button');
      equip.type = 'button';
      equip.className = 'ghost-button';
      equip.textContent = 'Equipar';
      equip.addEventListener('click', async () => {
        equip.disabled = true;
        equip.textContent = 'Equipando…';
        try { renderInventoryPanel(root, await onEquip(item.id), onEquip, onUnequip, onUse, onClose); }
        catch (error) { equip.disabled = false; equip.textContent = error instanceof Error ? error.message : 'Erro ao equipar'; }
      });
      row.append(equip);
    }
    if (item.category === 'consumable') {
      const use = document.createElement('button');
      use.type = 'button'; use.className = 'ghost-button'; use.textContent = 'Usar';
      use.addEventListener('click', async () => {
        use.disabled = true; use.textContent = 'Usando…';
        try { renderInventoryPanel(root, await onUse(item.id), onEquip, onUnequip, onUse, onClose); }
        catch (error) { use.disabled = false; use.textContent = error instanceof Error ? error.message : 'Não foi possível usar'; }
      });
      row.append(use);
    }
    list.append(row);
  }
  panel.append(header, equippedTitle, equipped, bagTitle, list);
  overlay.append(panel);
  overlay.addEventListener('click', (event) => { if (event.target === overlay) onClose(); });
  root.append(overlay);
}
