import { el, on, svgIcon } from '../../utils/dom';
import { getAllPantryItems, addPantryItem, updatePantryItem, deletePantryItem } from '../../services/pantry.service';
import { CATEGORIES, CATEGORY_LABELS, type ItemCategory, type PantryItem } from '../../models/types';
import { openModal } from '../shared/modal';
import { showToast } from '../shared/toast';
import { createItemForm, type ItemFormData } from '../shared/item-form';

export function createPantryView(): HTMLElement {
  const container = el('div', { className: 'pantry-view' });

  // Search bar
  const searchBar = el('div', { className: 'search-bar' });
  searchBar.appendChild(svgIcon('<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>'));
  const searchInput = el('input', { className: 'input', type: 'text', placeholder: 'Search pantry...' });
  searchBar.appendChild(searchInput);
  container.appendChild(searchBar);

  // Filter pills
  const pills = el('div', { className: 'filter-pills' });
  let activeFilter: ItemCategory | null = null;

  const allPill = el('button', { className: 'filter-pill active' }, 'All');
  on(allPill, 'click', () => {
    activeFilter = null;
    renderPills();
    renderList();
  });
  pills.appendChild(allPill);

  for (const cat of CATEGORIES) {
    const pill = el('button', { className: 'filter-pill' }, CATEGORY_LABELS[cat]);
    on(pill, 'click', () => {
      activeFilter = cat;
      renderPills();
      renderList();
    });
    pills.appendChild(pill);
  }
  container.appendChild(pills);

  // Item list
  const listContainer = el('div');
  container.appendChild(listContainer);

  // FAB
  const fab = el('button', { className: 'fab' }, '+');
  on(fab, 'click', () => {
    openModal('Add Pantry Item', (body, close) => {
      createItemForm(body, {
        submitLabel: 'Add to Pantry',
        onSubmit: async (data: ItemFormData) => {
          await addPantryItem(data);
          close();
          showToast('Item added', 'success');
          renderList();
        },
      });
    });
  });
  container.appendChild(fab);

  let allItems: PantryItem[] = [];

  function renderPills() {
    const buttons = pills.querySelectorAll('.filter-pill');
    buttons.forEach((btn, i) => {
      if (i === 0) {
        btn.className = `filter-pill${activeFilter === null ? ' active' : ''}`;
      } else {
        const cat = CATEGORIES[i - 1];
        btn.className = `filter-pill${activeFilter === cat ? ' active' : ''}`;
      }
    });
  }

  function getFilteredItems(): PantryItem[] {
    let items = allItems;
    if (activeFilter) {
      items = items.filter(i => i.category === activeFilter);
    }
    const query = searchInput.value.trim().toLowerCase();
    if (query) {
      items = items.filter(i => i.name.toLowerCase().includes(query));
    }
    return items.sort((a, b) => a.name.localeCompare(b.name));
  }

  function renderList() {
    const items = getFilteredItems();
    listContainer.innerHTML = '';

    if (items.length === 0) {
      const empty = el('div', { className: 'empty-state' });
      empty.innerHTML = '<div class="empty-state-icon">&#x1F6D2;</div>';
      empty.appendChild(el('p', { className: 'empty-state-text' },
        allItems.length === 0
          ? 'Your pantry is empty. Tap + to add items.'
          : 'No items match your filter.'
      ));
      listContainer.appendChild(empty);
      return;
    }

    // Group by category
    const grouped = new Map<ItemCategory, PantryItem[]>();
    for (const item of items) {
      const list = grouped.get(item.category) || [];
      list.push(item);
      grouped.set(item.category, list);
    }

    for (const [cat, catItems] of grouped) {
      const section = el('div');
      const header = el('div', { className: 'section-header' });
      header.appendChild(el('span', { className: 'section-title' }, CATEGORY_LABELS[cat]));
      header.appendChild(el('span', { className: 'section-title' }, String(catItems.length)));
      section.appendChild(header);

      const list = el('div', { className: 'item-list' });
      for (const item of catItems) {
        list.appendChild(createItemRow(item));
      }
      section.appendChild(list);
      listContainer.appendChild(section);
    }
  }

  function createItemRow(item: PantryItem): HTMLElement {
    const row = el('div', { className: 'item-row' });

    const content = el('div', { className: 'item-row-content' });
    content.appendChild(el('div', { className: 'item-row-name' }, item.name));
    content.appendChild(el('div', { className: 'item-row-detail' },
      `${item.quantity} ${item.unit}`
    ));
    row.appendChild(content);

    const actions = el('div', { className: 'item-row-actions' });

    const editBtn = el('button', { className: 'btn btn-sm btn-secondary' }, 'Edit');
    on(editBtn, 'click', () => {
      openModal('Edit Item', (body, close) => {
        createItemForm(body, {
          initial: { name: item.name, quantity: item.quantity, unit: item.unit, category: item.category },
          submitLabel: 'Save',
          onSubmit: async (data: ItemFormData) => {
            await updatePantryItem({ ...item, ...data });
            close();
            showToast('Item updated', 'success');
            await loadData();
          },
        });
      });
    });
    actions.appendChild(editBtn);

    const deleteBtn = el('button', { className: 'btn btn-sm btn-danger' }, 'Del');
    on(deleteBtn, 'click', async () => {
      await deletePantryItem(item.id);
      showToast('Item removed', 'info');
      await loadData();
    });
    actions.appendChild(deleteBtn);

    row.appendChild(actions);
    return row;
  }

  async function loadData() {
    allItems = await getAllPantryItems();
    renderList();
  }

  on(searchInput, 'input', () => renderList());
  loadData();

  return container;
}
