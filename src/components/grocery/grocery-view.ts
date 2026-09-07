import { el, on, svgIcon } from '../../utils/dom';
import {
  getAllGroceryItems,
  regenerateGroceryList,
  addManualGroceryItem,
  deleteGroceryItem,
  restoreGroceryItem,
  purchaseGroceryItem,
} from '../../services/grocery.service';
import { CATEGORIES, CATEGORY_LABELS, type GroceryListItem } from '../../models/types';
import { openModal } from '../shared/modal';
import { showToast } from '../shared/toast';
import { createItemForm, type ItemFormData } from '../shared/item-form';
import { extractReceiptLinesFromImage } from '../../services/ocr.service';
import { parseReceiptLines, processReceiptAgainstGroceryList } from '../../services/receipt.service';
import { openBarcodeScanner } from '../shared/barcode-scanner';

const ICON_PLUS = '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>';
const ICON_TRASH =
  '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>';
const ICON_RECEIPT =
  '<rect x="3" y="5" width="18" height="14" rx="2"/><polyline points="3 7 12 13 21 7"/>';

export function createGroceryView(): HTMLElement {
  const container = el('div', { className: 'kb-list-view grocery-view' });

  // ── Toolbar ────────────────────────────────────────────────────
  const toolbar = el('div', { className: 'kb-toolbar' });

  const searchInput = el('input', {
    className: 'kb-search',
    type: 'search',
    placeholder: 'Search your list',
    'aria-label': 'Search your shopping list',
    autocapitalize: 'none',
    autocorrect: 'off',
    spellcheck: 'false',
    enterkeyhint: 'search',
  }) as HTMLInputElement;
  toolbar.appendChild(searchInput);

  // A receipt settles a whole trip, so it sits beside search as a bulk
  // action rather than behind the + button.
  const receiptInput = el('input', {
    type: 'file', accept: 'image/*', 'aria-hidden': 'true',
  }) as HTMLInputElement;
  receiptInput.style.display = 'none';
  container.appendChild(receiptInput);

  const receiptBtn = el('button', {
    className: 'kb-tool-btn',
    'aria-label': 'Scan a receipt',
  }) as HTMLButtonElement;
  receiptBtn.appendChild(svgIcon(ICON_RECEIPT, 20));
  on(receiptBtn, 'click', () => receiptInput.click());
  toolbar.appendChild(receiptBtn);

  const addBtn = el('button', {
    className: 'kb-tool-btn kb-add',
    'aria-label': 'Add an item',
  });
  addBtn.appendChild(svgIcon(ICON_PLUS, 20));
  on(addBtn, 'click', () => openAddForm());
  toolbar.appendChild(addBtn);
  container.appendChild(toolbar);

  const listEl = el('div', { className: 'kb-list' });
  container.appendChild(listEl);

  // ── State ──────────────────────────────────────────────────────
  let items: GroceryListItem[] = [];
  let loadFailed = false;

  async function mutate(run: () => Promise<void>, failure: string): Promise<boolean> {
    try {
      await run();
      return true;
    } catch {
      showToast(failure, 'error', async () => {
        if (await mutate(run, failure)) await loadData();
      }, 'Retry');
      await loadData();
      return false;
    }
  }

  function openAddForm(initial?: Partial<ItemFormData>) {
    openModal('Add an item', (body, close) => {
      createItemForm(body, {
        initial,
        submitLabel: 'Add to list',
        scan: (apply) => openBarcodeScanner((name, category) => apply({ name, category })),
        onSubmit: async (data: ItemFormData) => {
          const ok = await mutate(
            async () => {
              await addManualGroceryItem(data.name, data.quantity, data.unit, data.category);
            },
            `Couldn’t add ${data.name}.`,
          );
          if (!ok) return;
          close();
          showToast(`${data.name} added`, 'success');
          await loadData();
        },
      });
    });
  }

  // ── Receipt ────────────────────────────────────────────────────

  on(receiptInput, 'change', async () => {
    const file = receiptInput.files?.[0];
    if (!file) return;
    receiptInput.value = '';

    receiptBtn.disabled = true;
    receiptBtn.setAttribute('aria-busy', 'true');
    showToast('Reading the receipt…', 'info');

    try {
      const lines = await extractReceiptLinesFromImage(file);
      const names = parseReceiptLines(lines);
      if (names.length === 0) {
        showToast('No items found on that receipt', 'info');
        return;
      }
      const result = await processReceiptAgainstGroceryList(names);
      if (result.matched.length === 0) {
        showToast('Nothing on the list matched that receipt', 'info');
      } else {
        const n = result.matched.length;
        showToast(`${n} item${n !== 1 ? 's' : ''} moved to your pantry`, 'success');
      }
      await loadData();
    } catch {
      showToast('Couldn’t read that receipt.', 'error');
    } finally {
      receiptBtn.disabled = false;
      receiptBtn.removeAttribute('aria-busy');
    }
  });

  // ── Render ─────────────────────────────────────────────────────

  function visibleItems(): GroceryListItem[] {
    const query = searchInput.value.trim().toLowerCase();
    if (!query) return items;
    return items.filter(i => i.name.toLowerCase().includes(query));
  }

  function renderSkeleton() {
    listEl.innerHTML = '';
    for (let i = 0; i < 6; i++) {
      const r = el('div', { className: 'kb-skeleton' });
      r.appendChild(el('div', { className: 'kb-skeleton-line' }));
      listEl.appendChild(r);
    }
  }

  function notice(text: string, actionLabel?: string, onAction?: () => void): HTMLElement {
    const box = el('div', { className: 'kb-notice' });
    box.appendChild(el('p', { className: 'kb-notice-text' }, text));
    if (actionLabel && onAction) {
      const btn = el('button', { className: 'kb-btn' }, actionLabel);
      on(btn, 'click', onAction);
      box.appendChild(btn);
    }
    return box;
  }

  function emptyText(): string {
    const query = searchInput.value.trim();
    if (items.length === 0) {
      return 'Your shopping list is empty. It fills up when you run out of something, or you can tap + to add anything.';
    }
    if (query) return `Nothing matches “${query}”.`;
    return 'Nothing to show.';
  }

  function render() {
    const scroller = container.closest('.app-content');
    const scrollTop = scroller?.scrollTop ?? 0;
    listEl.innerHTML = '';

    if (loadFailed) {
      listEl.appendChild(notice(
        'Couldn’t open your shopping list on this device.',
        'Try again',
        () => { renderSkeleton(); void loadData(); },
      ));
      return;
    }

    const list = visibleItems();
    if (list.length === 0) {
      listEl.appendChild(notice(emptyText()));
      listEl.appendChild(renderFooter());
      return;
    }

    for (const cat of CATEGORIES) {
      const inCat = list.filter(i => i.category === cat);
      if (inCat.length === 0) continue;
      inCat.sort((a, b) => a.name.localeCompare(b.name));

      const group = el('div', { className: 'kb-group' });
      const head = el('div', { className: 'kb-group-head' });
      head.appendChild(el('span', {}, CATEGORY_LABELS[cat]));
      group.appendChild(head);
      for (const item of inCat) group.appendChild(renderRow(item));
      listEl.appendChild(group);
    }

    listEl.appendChild(renderFooter());

    if (scroller) {
      requestAnimationFrame(() => { scroller.scrollTop = scrollTop; });
    }
  }

  function renderRow(item: GroceryListItem): HTMLElement {
    const row = el('div', { className: 'kb-row' });

    // Ticking means you have it: it moves into your pantry and off the list.
    const check = el('button', {
      className: 'kb-check',
      role: 'checkbox',
      'aria-checked': 'false',
      'aria-label': `Got ${item.name}`,
    });
    check.appendChild(el('span', { className: 'kb-check-box' }));
    on(check, 'click', () => void gotIt(item));
    row.appendChild(check);

    const main = el('div', { className: 'kb-row-main' });
    main.appendChild(el('span', { className: 'kb-row-name' }, item.name));
    if (!(item.quantity === 1 && item.unit === 'count')) {
      const sub = el('span', { className: 'kb-row-sub' });
      sub.appendChild(el('span', { className: 'kb-row-n' }, String(item.quantity)));
      sub.appendChild(el('span', {}, ` ${item.unit}`));
      main.appendChild(sub);
    }
    row.appendChild(main);

    const del = el('button', { className: 'kb-del', 'aria-label': `Delete ${item.name}` });
    del.appendChild(svgIcon(ICON_TRASH, 19));
    on(del, 'click', () => void remove(item));
    row.appendChild(del);

    return row;
  }

  function renderFooter(): HTMLElement {
    const box = el('div', { className: 'kb-list-actions' });
    const refresh = el('button', { className: 'kb-btn' }, 'Refresh list');
    on(refresh, 'click', async () => {
      const ok = await mutate(
        async () => { await regenerateGroceryList(); },
        'Couldn’t refresh the list.',
      );
      if (!ok) return;
      showToast('List refreshed', 'success');
      await loadData();
    });
    box.appendChild(refresh);
    return box;
  }

  // ── Actions ────────────────────────────────────────────────────

  async function gotIt(item: GroceryListItem) {
    const ok = await mutate(
      async () => { await purchaseGroceryItem(item.id); },
      `Couldn’t move ${item.name} to your pantry.`,
    );
    if (!ok) return;
    // No undo: this is a compound two-store write with no inverse. The natural
    // recovery is unticking the item in the pantry, which puts it straight back
    // on this list.
    showToast(`${item.name} moved to your pantry`, 'success');
    await loadData();
  }

  async function remove(item: GroceryListItem) {
    const saved = { ...item };
    const ok = await mutate(
      async () => { await deleteGroceryItem(item.id); },
      `Couldn’t remove ${item.name}.`,
    );
    if (!ok) return;
    showToast(`${item.name} deleted`, 'info', async () => {
      await mutate(
        async () => { await restoreGroceryItem(saved); },
        `Couldn’t bring ${saved.name} back.`,
      );
      await loadData();
    });
    await loadData();
  }

  // ── Load ───────────────────────────────────────────────────────

  async function loadData() {
    try {
      items = await getAllGroceryItems();
      loadFailed = false;
    } catch {
      loadFailed = true;
      items = [];
    }
    render();
  }

  let searchTimer: number | undefined;
  on(searchInput, 'input', () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => render(), 150);
  });

  renderSkeleton();
  void loadData();

  return container;
}
