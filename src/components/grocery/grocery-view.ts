import { el, on, svgIcon } from '../../utils/dom';
import {
  getAllGroceryItems,
  regenerateGroceryList,
  addManualGroceryItem,
  toggleGroceryItem,
  deleteGroceryItem,
  clearCheckedItems,
  purchaseGroceryItem,
} from '../../services/grocery.service';
import { CATEGORY_LABELS, type GroceryListItem, type ItemCategory } from '../../models/types';
import { openModal } from '../shared/modal';
import { showToast } from '../shared/toast';
import { createItemForm, type ItemFormData } from '../shared/item-form';

function sourceLabel(source: string): string {
  switch (source) {
    case 'auto': return 'auto';
    case 'recipe': return 'recipe';
    case 'out': return 'out of stock';
    case 'manual': return 'manual';
    default: return source;
  }
}

export function createGroceryView(): HTMLElement {
  const container = el('div', { className: 'grocery-view' });

  // Summary bar
  const summary = el('div', { className: 'summary-bar' });
  container.appendChild(summary);

  // Action bar
  const actionBar = el('div', { className: 'input-row' });
  actionBar.style.marginBottom = '16px';

  const refreshBtn = el('button', { className: 'btn btn-secondary btn-sm' });
  refreshBtn.appendChild(svgIcon('<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>', 16));
  refreshBtn.appendChild(document.createTextNode(' Refresh'));
  on(refreshBtn, 'click', async () => {
    await regenerateGroceryList();
    showToast('Grocery list refreshed', 'success');
    await loadData();
  });
  actionBar.appendChild(refreshBtn);

  const clearBtn = el('button', { className: 'btn btn-secondary btn-sm' }, 'Clear Checked');
  on(clearBtn, 'click', async () => {
    await clearCheckedItems();
    showToast('Checked items cleared', 'info');
    await loadData();
  });
  actionBar.appendChild(clearBtn);

  container.appendChild(actionBar);

  // List container
  const listContainer = el('div', { className: 'list-container has-fab' });
  container.appendChild(listContainer);

  // FAB for manual add
  const fab = el('button', { className: 'fab' }, '+');
  on(fab, 'click', () => {
    openModal('Add Grocery Item', (body, close) => {
      createItemForm(body, {
        submitLabel: 'Add to List',
        onSubmit: async (data: ItemFormData) => {
          await addManualGroceryItem(data.name, data.quantity, data.unit, data.category);
          close();
          showToast('Item added', 'success');
          await loadData();
        },
      });
    });
  });
  container.appendChild(fab);

  let allItems: GroceryListItem[] = [];

  function updateSummary() {
    const total = allItems.length;
    const checked = allItems.filter(i => i.checked).length;
    summary.textContent = total === 0
      ? 'No items on your list'
      : `${checked}/${total} items checked`;
  }

  function renderList() {
    const scrollParent = container.closest('.app-content');
    const scrollTop = scrollParent?.scrollTop ?? 0;

    listContainer.innerHTML = '';

    if (allItems.length === 0) {
      const empty = el('div', { className: 'empty-state' });
      empty.innerHTML = '<div class="empty-state-icon">&#x1F4DD;</div>';
      empty.appendChild(el('p', { className: 'empty-state-text' },
        'Your grocery list is empty. Set up your typical order in Settings, or tap + to add items.'
      ));
      listContainer.appendChild(empty);
      return;
    }

    // Sort: unchecked first, then by category
    const sorted = [...allItems].sort((a, b) => {
      if (a.checked !== b.checked) return a.checked ? 1 : -1;
      return a.category.localeCompare(b.category) || a.name.localeCompare(b.name);
    });

    // Group by category
    const grouped = new Map<ItemCategory, GroceryListItem[]>();
    for (const item of sorted) {
      const list = grouped.get(item.category) || [];
      list.push(item);
      grouped.set(item.category, list);
    }

    for (const [cat, catItems] of grouped) {
      const section = el('div', { className: 'section-group' });
      const header = el('div', { className: 'section-header' });
      header.appendChild(el('span', { className: 'section-title' }, CATEGORY_LABELS[cat]));
      section.appendChild(header);

      const list = el('div', { className: 'item-list' });
      for (const item of catItems) {
        list.appendChild(createGroceryRow(item));
      }
      section.appendChild(list);
      listContainer.appendChild(section);
    }

    if (scrollParent) {
      requestAnimationFrame(() => {
        scrollParent.scrollTop = scrollTop;
      });
    }
  }

  function createGroceryRow(item: GroceryListItem): HTMLElement {
    const row = el('div', { className: `item-row${item.checked ? ' checked' : ''}` });

    // Checkbox
    const checkbox = el('div', { className: `checkbox${item.checked ? ' checked' : ''}` });
    on(checkbox, 'click', async () => {
      await toggleGroceryItem(item.id);
      await loadData();
    });
    row.appendChild(checkbox);

    // Content
    const content = el('div', { className: 'item-row-content' });
    const nameEl = el('div', { className: 'item-row-name' }, item.name);
    content.appendChild(nameEl);

    const detail = el('div', { className: 'item-row-detail' });
    detail.textContent = `${item.quantity} ${item.unit} \u2022 ${sourceLabel(item.source)}`;
    content.appendChild(detail);

    row.appendChild(content);

    // Action buttons
    const actions = el('div', { className: 'item-row-actions' });

    // Purchased button
    const purchaseBtn = el('button', { className: 'btn btn-sm btn-success' }, 'Got it');
    on(purchaseBtn, 'click', async () => {
      await purchaseGroceryItem(item.id);
      showToast(`${item.name} added to pantry`, 'success');
      await loadData();
    });
    actions.appendChild(purchaseBtn);

    // Delete button
    const deleteBtn = el('button', { className: 'btn btn-sm btn-secondary' }, '\u00D7');
    deleteBtn.style.minWidth = '32px';
    on(deleteBtn, 'click', async () => {
      await deleteGroceryItem(item.id);
      showToast('Item removed', 'info');
      await loadData();
    });
    actions.appendChild(deleteBtn);

    row.appendChild(actions);

    return row;
  }

  async function loadData() {
    allItems = await getAllGroceryItems();
    updateSummary();
    renderList();
  }

  loadData();

  return container;
}
