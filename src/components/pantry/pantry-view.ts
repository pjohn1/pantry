import { el, on, svgIcon } from '../../utils/dom';
import {
  getAllPantryItems, addPantryItem, updatePantryItem,
  deletePantryItem, restorePantryItem, toggleOut, findPantryItemByName,
} from '../../services/pantry.service';
import {
  getAllTypicalOrderItems, addTypicalOrderItem,
  updateTypicalOrderItem, deleteTypicalOrderItem,
} from '../../services/typical-order.service';
import { reconcileGroceryList } from '../../services/grocery.service';
import {
  CATEGORIES, CATEGORY_LABELS,
  type PantryItem, type TypicalOrderItem,
} from '../../models/types';
import { openModal } from '../shared/modal';
import { showToast } from '../shared/toast';
import { createItemForm, type ItemFormData } from '../shared/item-form';
import { openBarcodeScanner } from '../shared/barcode-scanner';
import { setDock } from '../shared/dock';
import { getViewState, patchViewState, keepPlace } from '../../utils/view-state';

const ROUTE = 'pantry';

const ICON_PLUS = '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>';
const ICON_TRASH =
  '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>';

interface Row {
  item: PantryItem;
  /** The standing amount for this item, when there is one. */
  usual: TypicalOrderItem | null;
}

/** Which row control had focus, so a re-render can hand it back. */
interface FocusMark {
  id: string;
  control: string;
}

export function createPantryView(): HTMLElement {
  const container = el('div', { className: 'kb-list-view pantry-view' });
  const saved = getViewState(ROUTE);

  container.appendChild(el('h1', { className: 'visually-hidden' }, 'Your pantry'));

  // ── Toolbar ────────────────────────────────────────────────────
  // Search and the filter only. The add button lives in the dock, within a
  // thumb's reach of where the hand already is.
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
  searchInput.value = saved.query;
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
  container.appendChild(toolbar);

  const listEl = el('div', { className: 'kb-list' });
  container.appendChild(listEl);

  const addBtn = el('button', {
    className: 'kb-dock-btn kb-dock-btn--primary',
    'aria-label': 'Add an item to your pantry',
  });
  addBtn.appendChild(svgIcon(ICON_PLUS, 22));
  on(addBtn, 'click', () => openItemForm());
  setDock(addBtn);

  // ── State ──────────────────────────────────────────────────────
  let rows: Row[] = [];
  let loadFailed = false;
  let outOnly = saved.outOnly;
  let refocus: FocusMark | null = null;

  async function mutate(run: () => Promise<void>, failure: string): Promise<boolean> {
    try {
      await run();
      return true;
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : failure;
      showToast(message, 'error', async () => {
        if (await mutate(run, failure)) await loadData();
      }, 'Retry');
      await loadData();
      return false;
    }
  }

  /** Remembers which control the user was on, so a re-render can restore it. */
  function markFocus(id: string, control: string) {
    refocus = { id, control };
  }

  function restoreFocus() {
    if (!refocus) return;
    const { id, control } = refocus;
    refocus = null;
    const exact = listEl.querySelector<HTMLElement>(
      `[data-item-id="${id}"] [data-control="${control}"]`,
    );
    if (exact) { exact.focus(); return; }
    // The row is gone — deleted, or filtered out by its own new state. Land on
    // the same control in whatever row took its place rather than on <body>.
    const anyRow = listEl.querySelector<HTMLElement>(`[data-control="${control}"]`);
    anyRow?.focus();
  }

  /** One tap from the dock, or from a row's name to edit it. */
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
        // Seeded from whether a standing order actually exists, so opening a
        // sheet and saving it unchanged is a genuine no-op.
        stapleToggle: { checked: row?.usual != null },
        checkExisting: async (normalizedName) => {
          const match = await findPantryItemByName(normalizedName);
          if (!match || match.id === item?.id) return null;
          return {
            name: match.name,
            open: () => {
              close();
              const target = rows.find(r => r.item.id === match.id);
              if (target) openItemForm(target);
            },
          };
        },
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
            // The shopping list is derived from the standing order, so it has
            // to follow a change to it without being asked.
            await reconcileGroceryList();
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
    if (!data.isStaple) {
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
    if (query) {
      // Also against the normalized name, so "tomatoes" finds "Tomato".
      list = list.filter(r =>
        r.item.name.toLowerCase().includes(query) ||
        r.item.normalizedName.includes(query));
    }
    return list;
  }

  function updateOutCount() {
    const out = rows.filter(r => r.item.isOut).length;
    outN.textContent = String(out);
    // Disabled, never hidden: a control that disappears whenever the pantry is
    // whole never becomes a habit, and its removal used to resize the search
    // field mid-session.
    outBtn.disabled = out === 0;
    if (out === 0 && outOnly) outOnly = false;
    outBtn.setAttribute('aria-pressed', String(outOnly));
  }

  // ── Render ─────────────────────────────────────────────────────

  let skeletonTimer: number | undefined;

  /**
   * Only if the read is actually slow. IndexedDB is already open and warm on
   * every navigation after the first, and a skeleton flash over a 5ms read
   * makes a local database look like a network round trip.
   */
  function scheduleSkeleton() {
    skeletonTimer = window.setTimeout(() => {
      listEl.innerHTML = '';
      for (let i = 0; i < 6; i++) {
        const r = el('div', { className: 'kb-skeleton' });
        r.appendChild(el('div', { className: 'kb-skeleton-line' }));
        listEl.appendChild(r);
      }
    }, 120);
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
    // Query first: searching inside the out filter with no hits used to report
    // "You have everything" while the filter above it read "2 out".
    if (rows.length === 0) return '';
    if (query) return `Nothing matches “${query}”.`;
    if (outOnly) return 'You have everything. Nothing is out.';
    return 'Nothing to show.';
  }

  /**
   * Groups by the categories the items actually carry, in the fixed order, with
   * anything unrecognised gathered under Other. Iterating the enum instead
   * meant a row whose category was not in it — which an imported backup can
   * carry — rendered nowhere at all, with no count and no notice.
   */
  function group(list: Row[]): Array<[string, Row[]]> {
    const byCat = new Map<string, Row[]>();
    for (const row of list) {
      const key = row.item.category;
      const bucket = byCat.get(key);
      if (bucket) bucket.push(row);
      else byCat.set(key, [row]);
    }

    const out: Array<[string, Row[]]> = [];
    for (const cat of CATEGORIES) {
      const inCat = byCat.get(cat);
      if (!inCat) continue;
      byCat.delete(cat);
      out.push([CATEGORY_LABELS[cat], inCat]);
    }
    // Whatever is left is off the vocabulary; it still belongs on screen.
    const strays: Row[] = [];
    for (const rest of byCat.values()) strays.push(...rest);
    if (strays.length > 0) {
      const other = out.find(([label]) => label === CATEGORY_LABELS.other);
      if (other) other[1].push(...strays);
      else out.push([CATEGORY_LABELS.other, strays]);
    }
    return out;
  }

  let headSeq = 0;

  function render() {
    const scroller = container.closest('.app-content');
    const scrollTop = scroller?.scrollTop ?? 0;
    listEl.innerHTML = '';

    if (loadFailed) {
      const box = notice(
        'Couldn’t open your pantry on this device.',
        'Try again',
        () => { scheduleSkeleton(); void loadData(); },
      );
      box.setAttribute('role', 'alert');
      listEl.appendChild(box);
      return;
    }

    if (rows.length === 0) {
      // Day one. The standing order is the whole mechanism, and nothing used
      // to name it or offer a way in.
      const box = notice(
        'Nothing here yet. Start with the things you always keep in stock, and your shopping list will write itself.',
        'Set up your staples',
        () => { window.location.hash = 'settings'; },
      );
      listEl.appendChild(box);
      return;
    }

    const list = visibleRows();
    if (list.length === 0) {
      listEl.appendChild(notice(emptyText()));
      return;
    }

    for (const [label, inCat] of group(list)) {
      // What you're out of comes first: that's what you're looking for.
      inCat.sort((a, b) =>
        Number(b.item.isOut) - Number(a.item.isOut) ||
        a.item.name.localeCompare(b.item.name));

      const headId = `pantry-cat-${++headSeq}`;
      const groupEl = el('div', {
        className: 'kb-group', role: 'group', 'aria-labelledby': headId,
      });
      const head = el('h2', { className: 'kb-group-head', id: headId });
      head.appendChild(el('span', {}, label));
      const outHere = inCat.filter(r => r.item.isOut).length;
      if (outHere > 0) {
        head.appendChild(el('span', { className: 'kb-group-count' }, `${outHere} out`));
      }
      groupEl.appendChild(head);

      const rowsEl = el('div', { role: 'list' });
      for (const row of inCat) rowsEl.appendChild(renderRow(row));
      groupEl.appendChild(rowsEl);

      listEl.appendChild(groupEl);
    }

    if (scroller) {
      requestAnimationFrame(() => { scroller.scrollTop = scrollTop; });
    }
    restoreFocus();
  }

  function renderRow(row: Row): HTMLElement {
    const { item, usual } = row;
    const el_ = el('div', {
      className: `kb-row${item.isOut ? ' is-out' : ''}`,
      role: 'listitem',
      'data-item-id': item.id,
    });

    // Ticked means you have it. Unticking puts it on the shopping list.
    const check = el('button', {
      className: 'kb-check',
      role: 'checkbox',
      'aria-checked': String(!item.isOut),
      'aria-label': `I have ${item.name}`,
      'data-control': 'check',
    });
    check.appendChild(el('span', { className: 'kb-check-box' }));
    on(check, 'click', () => {
      markFocus(item.id, 'check');
      void toggleHave(item);
    });
    el_.appendChild(check);

    // No aria-label: it would override the children and hide the standing
    // amount, which is the one thing on this row the product is about.
    const main = el('button', { className: 'kb-row-main', 'data-control': 'main' });
    main.appendChild(el('span', { className: 'kb-row-name' }, item.name));
    if (usual) {
      const sub = el('span', { className: 'kb-row-sub' });
      sub.appendChild(el('span', {}, 'usually buy '));
      sub.appendChild(el('span', { className: 'kb-row-n' }, String(usual.quantity)));
      sub.appendChild(el('span', {}, usual.unit === 'count' ? '' : ` ${usual.unit}`));
      main.appendChild(sub);
    }
    main.appendChild(el('span', { className: 'visually-hidden' }, ' — edit'));
    on(main, 'click', () => openItemForm(row));
    el_.appendChild(main);

    const del = el('button', {
      className: 'kb-del', 'aria-label': `Delete ${item.name}`, 'data-control': 'delete',
    });
    del.appendChild(svgIcon(ICON_TRASH, 19));
    on(del, 'click', () => {
      markFocus(item.id, 'delete');
      void remove(item);
    });
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
    // toggleOut is its own inverse, keyed by id, so undo is exact.
    showToast(
      isNowOut
        ? `${item.name} is out — added to your shopping list`
        : `${item.name} is back in your pantry`,
      isNowOut ? 'info' : 'success',
      async () => {
        await mutate(
          async () => { await toggleOut(item.id); },
          `Couldn’t undo ${item.name}.`,
        );
        await loadData();
      },
    );
    await loadData();
  }

  async function remove(item: PantryItem) {
    const saved_ = { ...item };
    const ok = await mutate(
      async () => { await deletePantryItem(item.id); },
      `Couldn’t remove ${item.name}.`,
    );
    if (!ok) return;
    showToast(`${item.name} deleted`, 'info', async () => {
      await mutate(
        async () => { await restorePantryItem(saved_); },
        `Couldn’t bring ${saved_.name} back.`,
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
    window.clearTimeout(skeletonTimer);
    updateOutCount();
    render();
    // After the rows exist, never before: a scroll position assigned to an
    // empty scroller is clamped to 0.
    keepPlace(container, ROUTE);
  }

  on(outBtn, 'click', () => {
    outOnly = !outOnly;
    outBtn.setAttribute('aria-pressed', String(outOnly));
    patchViewState(ROUTE, { outOnly });
    render();
  });

  let searchTimer: number | undefined;
  on(searchInput, 'input', () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
      patchViewState(ROUTE, { query: searchInput.value });
      render();
    }, 150);
  });

  scheduleSkeleton();
  void loadData();

  return container;
}
