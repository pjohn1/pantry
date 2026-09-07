import { el, on, svgIcon } from '../../utils/dom';
import {
  getAllPantryItems, addPantryItem, updatePantryItem,
  deletePantryItem, restorePantryItem, toggleOut,
} from '../../services/pantry.service';
import {
  getAllTypicalOrderItems, addTypicalOrderItem,
  updateTypicalOrderItem, deleteTypicalOrderItem,
} from '../../services/typical-order.service';
import {
  CATEGORIES, CATEGORY_LABELS,
  type PantryItem, type TypicalOrderItem,
} from '../../models/types';
import { openModal } from '../shared/modal';
import { showToast } from '../shared/toast';
import { createItemForm, type ItemFormData } from '../shared/item-form';
import { openBarcodeScanner } from '../shared/barcode-scanner';

const ICON_PLUS = '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>';
const ICON_TRASH =
  '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>';

interface Row {
  item: PantryItem;
  /** The standing amount for this item, when there is one. */
  usual: TypicalOrderItem | null;
}

export function createPantryView(): HTMLElement {
  const container = el('div', { className: 'kb-list-view pantry-view' });

  // ── Toolbar ────────────────────────────────────────────────────
  const toolbar = el('div', { className: 'kb-toolbar' });

  const searchInput = el('input', {
    className: 'kb-search',
    type: 'search',
    placeholder: 'Search your pantry',
    'aria-label': 'Search your pantry',
    autocapitalize: 'none',
    autocorrect: 'off',
    spellcheck: 'false',
    enterkeyhint: 'search',
  }) as HTMLInputElement;
  toolbar.appendChild(searchInput);

  const outBtn = el('button', {
    className: 'kb-filter',
    'aria-pressed': 'false',
    'aria-label': "Show only what you're out of",
  }) as HTMLButtonElement;
  const outN = el('span', { className: 'kb-filter-n' }, '0');
  outBtn.appendChild(outN);
  outBtn.appendChild(el('span', {}, 'out'));
  toolbar.appendChild(outBtn);

  const addBtn = el('button', {
    className: 'kb-tool-btn kb-add',
    'aria-label': 'Add an item',
  });
  addBtn.appendChild(svgIcon(ICON_PLUS, 20));
  on(addBtn, 'click', () => openItemForm());
  toolbar.appendChild(addBtn);
  container.appendChild(toolbar);

  const listEl = el('div', { className: 'kb-list' });
  container.appendChild(listEl);

  // ── State ──────────────────────────────────────────────────────
  let rows: Row[] = [];
  let loadFailed = false;
  let outOnly = false;

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

  /** One tap from the + button, or from a row's name to edit it. */
  function openItemForm(row?: Row) {
    const item = row?.item;
    openModal(item ? 'Edit item' : 'Add an item', (body, close) => {
      createItemForm(body, {
        initial: item
          ? {
              name: item.name,
              category: item.category,
              unit: row?.usual?.unit ?? item.unit,
              quantity: row?.usual?.quantity,
            }
          : undefined,
        submitLabel: item ? 'Save' : 'Add to pantry',
        quantityLabel: 'Usually buy',
        quantityHint: "Leave blank if this isn't something you always keep.",
        scan: (apply) => openBarcodeScanner((name, category) => apply({ name, category })),
        onSubmit: async (data: ItemFormData) => {
          const ok = await mutate(async () => {
            if (item) {
              await updatePantryItem({
                ...item, name: data.name, unit: data.unit, category: data.category,
              });
            } else {
              await addPantryItem({
                name: data.name, quantity: 1, unit: data.unit, category: data.category,
              });
            }
            // The number field is the standing amount, and writes only there.
            // The item's own quantity is reference information (PRODUCT.md) and
            // is deliberately left alone.
            await saveUsual(row ?? null, data);
          }, `Couldn’t save ${data.name}.`);
          if (!ok) return;
          close();
          showToast(item ? 'Saved' : `${data.name} added`, 'success');
          await loadData();
        },
      });
    });
  }

  async function saveUsual(row: Row | null, data: ItemFormData) {
    const existing = row?.usual ?? null;
    if (data.quantityBlank) {
      if (existing) await deleteTypicalOrderItem(existing.id);
      return;
    }
    if (existing) {
      await updateTypicalOrderItem({
        ...existing, name: data.name, quantity: data.quantity,
        unit: data.unit, category: data.category,
      });
    } else {
      await addTypicalOrderItem({
        name: data.name, quantity: data.quantity,
        unit: data.unit, category: data.category,
      });
    }
  }

  // ── Derivation ─────────────────────────────────────────────────

  function visibleRows(): Row[] {
    let list = rows;
    if (outOnly) list = list.filter(r => r.item.isOut);
    const query = searchInput.value.trim().toLowerCase();
    if (query) list = list.filter(r => r.item.name.toLowerCase().includes(query));
    return list;
  }

  function updateOutCount() {
    const out = rows.filter(r => r.item.isOut).length;
    outN.textContent = String(out);
    outBtn.hidden = out === 0;
    if (out === 0 && outOnly) outOnly = false;
    outBtn.setAttribute('aria-pressed', String(outOnly));
  }

  // ── Render ─────────────────────────────────────────────────────

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
    if (rows.length === 0) return 'Your pantry is empty. Tap + to add the first thing.';
    if (outOnly) return 'You have everything. Nothing is out.';
    if (query) return `Nothing matches “${query}”.`;
    return 'Nothing to show.';
  }

  function render() {
    const scroller = container.closest('.app-content');
    const scrollTop = scroller?.scrollTop ?? 0;
    listEl.innerHTML = '';

    if (loadFailed) {
      listEl.appendChild(notice(
        'Couldn’t open your pantry on this device.',
        'Try again',
        () => { renderSkeleton(); void loadData(); },
      ));
      return;
    }

    const list = visibleRows();
    if (list.length === 0) {
      listEl.appendChild(notice(emptyText()));
      return;
    }

    // Fixed category order, so a group never moves as items are added.
    for (const cat of CATEGORIES) {
      const inCat = list.filter(r => r.item.category === cat);
      if (inCat.length === 0) continue;

      // What you're out of comes first: that's what you're looking for.
      inCat.sort((a, b) =>
        Number(b.item.isOut) - Number(a.item.isOut) ||
        a.item.name.localeCompare(b.item.name));

      const group = el('div', { className: 'kb-group' });
      const head = el('div', { className: 'kb-group-head' });
      head.appendChild(el('span', {}, CATEGORY_LABELS[cat]));
      const outHere = inCat.filter(r => r.item.isOut).length;
      if (outHere > 0) {
        head.appendChild(el('span', { className: 'kb-group-count' }, `${outHere} out`));
      }
      group.appendChild(head);
      for (const row of inCat) group.appendChild(renderRow(row));
      listEl.appendChild(group);
    }

    if (scroller) {
      requestAnimationFrame(() => { scroller.scrollTop = scrollTop; });
    }
  }

  function renderRow(row: Row): HTMLElement {
    const { item, usual } = row;
    const el_ = el('div', { className: `kb-row${item.isOut ? ' is-out' : ''}` });

    // Ticked means you have it. Unticking puts it on the shopping list.
    const check = el('button', {
      className: 'kb-check',
      role: 'checkbox',
      'aria-checked': String(!item.isOut),
      'aria-label': `I have ${item.name}`,
    });
    check.appendChild(el('span', { className: 'kb-check-box' }));
    on(check, 'click', () => void toggleHave(item));
    el_.appendChild(check);

    const main = el('button', { className: 'kb-row-main', 'aria-label': `Edit ${item.name}` });
    main.appendChild(el('span', { className: 'kb-row-name' }, item.name));
    if (usual) {
      const sub = el('span', { className: 'kb-row-sub' });
      sub.appendChild(el('span', {}, 'usually buy '));
      sub.appendChild(el('span', { className: 'kb-row-n' }, String(usual.quantity)));
      sub.appendChild(el('span', {}, usual.unit === 'count' ? '' : ` ${usual.unit}`));
      main.appendChild(sub);
    }
    on(main, 'click', () => openItemForm(row));
    el_.appendChild(main);

    const del = el('button', { className: 'kb-del', 'aria-label': `Delete ${item.name}` });
    del.appendChild(svgIcon(ICON_TRASH, 19));
    on(del, 'click', () => void remove(item));
    el_.appendChild(del);

    return el_;
  }

  // ── Actions ────────────────────────────────────────────────────

  async function toggleHave(item: PantryItem) {
    let isNowOut = false;
    const ok = await mutate(
      async () => { isNowOut = await toggleOut(item.id); },
      `Couldn’t update ${item.name}.`,
    );
    if (!ok) return;
    showToast(
      isNowOut
        ? `${item.name} is out — added to your shopping list`
        : `${item.name} is back in your pantry`,
      isNowOut ? 'info' : 'success',
    );
    await loadData();
  }

  async function remove(item: PantryItem) {
    const saved = { ...item };
    const ok = await mutate(
      async () => { await deletePantryItem(item.id); },
      `Couldn’t remove ${item.name}.`,
    );
    if (!ok) return;
    showToast(`${item.name} deleted`, 'info', async () => {
      await mutate(
        async () => { await restorePantryItem(saved); },
        `Couldn’t bring ${saved.name} back.`,
      );
      await loadData();
    });
    await loadData();
  }

  // ── Load ───────────────────────────────────────────────────────

  async function loadData() {
    try {
      const [items, usuals] = await Promise.all([
        getAllPantryItems(),
        getAllTypicalOrderItems(),
      ]);
      const byName = new Map<string, TypicalOrderItem>();
      for (const u of usuals) byName.set(u.normalizedName, u);
      rows = items.map((item): Row => ({
        item,
        usual: byName.get(item.normalizedName) ?? null,
      }));
      loadFailed = false;
    } catch {
      loadFailed = true;
      rows = [];
    }
    updateOutCount();
    render();
  }

  on(outBtn, 'click', () => {
    outOnly = !outOnly;
    outBtn.setAttribute('aria-pressed', String(outOnly));
    render();
  });

  let searchTimer: number | undefined;
  on(searchInput, 'input', () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => render(), 150);
  });

  renderSkeleton();
  void loadData();

  return container;
}
