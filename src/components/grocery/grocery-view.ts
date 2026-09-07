import { el, on, svgIcon } from '../../utils/dom';
import {
  getAllGroceryItems,
  reconcileGroceryList,
  addManualGroceryItem,
  updateGroceryItem,
  deleteGroceryItem,
  restoreGroceryItem,
  purchaseGroceryItem,
  undoPurchase,
  type PurchaseSnapshot,
} from '../../services/grocery.service';
import { CATEGORIES, CATEGORY_LABELS, type GroceryListItem } from '../../models/types';
import { openModal } from '../shared/modal';
import { showToast } from '../shared/toast';
import { createItemForm, type ItemFormData } from '../shared/item-form';
import { extractReceiptLinesFromImage, cancelReceiptScan } from '../../services/ocr.service';
import {
  parseReceiptLines,
  matchReceiptAgainstGroceryList,
  applyReceiptMatches,
  addReceiptLineToPantry,
  type ReceiptMatch,
  type ReceiptReview,
} from '../../services/receipt.service';
import { openBarcodeScanner } from '../shared/barcode-scanner';
import { setDock } from '../shared/dock';
import { getViewState, patchViewState, keepPlace } from '../../utils/view-state';

const ROUTE = 'grocery';

const ICON_PLUS = '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>';
const ICON_TRASH =
  '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>';
// A till roll: torn bottom edge, two lines of print and a total. The old glyph
// was an envelope, on the button labelled "Scan a receipt".
const ICON_RECEIPT =
  '<path d="M5 3h14v16.5l-2.33-1.5-2.34 1.5-2.33-1.5-2.34 1.5L7.33 18 5 19.5z"/>' +
  '<line x1="8.5" y1="7.5" x2="15.5" y2="7.5"/><line x1="8.5" y1="11" x2="15.5" y2="11"/>' +
  '<line x1="8.5" y1="14.5" x2="12.5" y2="14.5"/>';

/** Why a row is on the list. The thing the aisle actually needs to know. */
const SOURCE_LABEL: Record<string, string> = {
  out: 'you ran out',
  auto: 'you usually buy this',
};

interface FocusMark {
  id: string;
  control: string;
}

export function createGroceryView(): HTMLElement {
  const container = el('div', { className: 'kb-list-view grocery-view' });
  const saved = getViewState(ROUTE);

  container.appendChild(el('h1', { className: 'visually-hidden' }, 'Your shopping list'));

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
  searchInput.value = saved.query;
  toolbar.appendChild(searchInput);
  container.appendChild(toolbar);

  const listEl = el('div', { className: 'kb-list' });
  container.appendChild(listEl);

  // ── Dock ───────────────────────────────────────────────────────
  // A receipt settles a whole trip, so the camera sits beside add as a bulk
  // action — both in the thumb's reach rather than in the top corner.
  const receiptInput = el('input', {
    type: 'file', accept: 'image/*', 'aria-hidden': 'true', tabindex: '-1',
  }) as HTMLInputElement;
  receiptInput.style.display = 'none';
  container.appendChild(receiptInput);

  const receiptBtn = el('button', {
    className: 'kb-dock-btn',
    'aria-label': 'Scan a receipt',
  }) as HTMLButtonElement;
  receiptBtn.appendChild(svgIcon(ICON_RECEIPT, 22));
  on(receiptBtn, 'click', () => receiptInput.click());

  const addBtn = el('button', {
    className: 'kb-dock-btn kb-dock-btn--primary',
    'aria-label': 'Add an item to your list',
  });
  addBtn.appendChild(svgIcon(ICON_PLUS, 22));
  on(addBtn, 'click', () => openAddForm());

  setDock(receiptBtn, addBtn);

  // ── State ──────────────────────────────────────────────────────
  let items: GroceryListItem[] = [];
  let loadFailed = false;
  let refocus: FocusMark | null = null;
  /** Non-null while a receipt is being read: the panel shown in the list. */
  let scan: { render: () => HTMLElement; progress: number } | null = null;

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
    listEl.querySelector<HTMLElement>(`[data-control="${control}"]`)?.focus();
  }

  function openAddForm(item?: GroceryListItem) {
    openModal(item ? 'Edit item' : 'Add an item', (body, close) => {
      createItemForm(body, {
        initial: item
          ? { name: item.name, quantity: item.quantity, unit: item.unit, category: item.category }
          : undefined,
        submitLabel: item ? 'Save' : 'Add to list',
        // A shopping-list row is an amount to buy, not a declaration about the
        // household — that decision belongs on the pantry item.
        scan: (apply) => openBarcodeScanner((name, category) => apply({ name, category })),
        onSubmit: async (data: ItemFormData) => {
          const ok = await mutate(
            async () => {
              if (item) {
                await updateGroceryItem({
                  ...item, name: data.name, quantity: data.quantity,
                  unit: data.unit, category: data.category,
                });
              } else {
                await addManualGroceryItem(data.name, data.quantity, data.unit, data.category);
              }
            },
            `Couldn’t ${item ? 'save' : 'add'} ${data.name}.`,
          );
          if (!ok) return;
          close();
          showToast(item ? 'Saved' : `${data.name} added`, 'success');
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
    void runReceipt(file);
  });

  async function runReceipt(file: File) {
    // A visible, cancellable panel in the list rather than a toast that
    // vanishes after 2.5 seconds of a job that takes thirty.
    scan = { render: renderScanPanel, progress: 0 };
    receiptBtn.disabled = true;
    receiptBtn.setAttribute('aria-busy', 'true');
    render();

    let cancelled = false;
    cancelScan = async () => {
      cancelled = true;
      await cancelReceiptScan();
      finish();
      showToast('Receipt scan stopped', 'info');
    };

    function finish() {
      scan = null;
      cancelScan = null;
      receiptBtn.disabled = false;
      receiptBtn.removeAttribute('aria-busy');
      render();
    }

    try {
      const lines = await extractReceiptLinesFromImage(file, {
        onProgress: (fraction) => {
          if (!scan) return;
          const next = Math.round(fraction * 100);
          if (next === scan.progress) return;
          scan.progress = next;
          paintProgress(next);
        },
      });
      if (cancelled) return;

      const names = parseReceiptLines(lines);
      const review = await matchReceiptAgainstGroceryList(names);
      if (cancelled) return;

      finish();

      if (review.matched.length === 0 && review.unmatched.length === 0) {
        showToast('Couldn’t find any items on that receipt', 'info');
        return;
      }
      openReceiptReview(review);
    } catch {
      if (cancelled) return;
      finish();
      showToast('Couldn’t read that receipt.', 'error');
    }
  }

  let cancelScan: (() => Promise<void>) | null = null;
  let progressEl: HTMLElement | null = null;

  function paintProgress(percent: number) {
    if (progressEl) progressEl.textContent = `${percent}%`;
  }

  function renderScanPanel(): HTMLElement {
    const box = el('div', { className: 'kb-notice', role: 'status', 'aria-live': 'polite' });
    const text = el('p', { className: 'kb-notice-text' });
    text.appendChild(el('span', {}, 'Reading your receipt — '));
    progressEl = el('span', { className: 'kb-progress' }, `${scan?.progress ?? 0}%`);
    text.appendChild(progressEl);
    text.appendChild(el('span', {}, '. This can take a minute.'));
    box.appendChild(text);

    const stop = el('button', { className: 'kb-btn' }, 'Cancel');
    on(stop, 'click', () => void cancelScan?.());
    box.appendChild(stop);
    return box;
  }

  /**
   * The receipt's verdict, as a decision rather than a report. Every matched
   * row shows the line that matched it, so a fuzzy guess is visible and one
   * tap away from being corrected — and nothing is written until the button
   * at the bottom is pressed.
   */
  function openReceiptReview(review: ReceiptReview) {
    openModal('What you bought', (body, close) => {
      const takeMatched = new Set(review.matched.map(m => m.item.id));
      const takeExtra = new Set<string>();

      const submit = el('button', { className: 'btn btn-primary btn-block' });
      function syncSubmit() {
        const n = takeMatched.size + takeExtra.size;
        submit.textContent = n === 0
          ? 'Nothing to move'
          : `Move ${n} to my pantry`;
        submit.disabled = n === 0;
      }

      if (review.matched.length > 0) {
        body.appendChild(el('h3', { className: 'kb-review-head' }, 'On your list'));
        const list = el('div', { className: 'kb-review-list', role: 'list' });
        for (const match of review.matched) {
          list.appendChild(reviewRow(
            match.item.name,
            `matched “${match.line}”`,
            true,
            (on_) => { on_ ? takeMatched.add(match.item.id) : takeMatched.delete(match.item.id); syncSubmit(); },
          ));
        }
        body.appendChild(list);
      }

      if (review.unmatched.length > 0) {
        body.appendChild(el('h3', { className: 'kb-review-head' }, 'Also on this receipt'));
        const list = el('div', { className: 'kb-review-list', role: 'list' });
        for (const line of review.unmatched.slice(0, 30)) {
          list.appendChild(reviewRow(
            line,
            'not on your list',
            false,
            (on_) => { on_ ? takeExtra.add(line) : takeExtra.delete(line); syncSubmit(); },
          ));
        }
        body.appendChild(list);
      }

      syncSubmit();
      on(submit, 'click', async () => {
        const matches: ReceiptMatch[] = review.matched.filter(m => takeMatched.has(m.item.id));
        const extras = [...takeExtra];
        const ok = await mutate(
          async () => {
            await applyReceiptMatches(matches);
            for (const line of extras) await addReceiptLineToPantry(line);
          },
          'Couldn’t update your pantry from that receipt.',
        );
        if (!ok) return;
        close();
        const n = matches.length + extras.length;
        showToast(`${n} item${n !== 1 ? 's' : ''} moved to your pantry`, 'success');
        await loadData();
      });
      body.appendChild(submit);
    });
  }

  function reviewRow(
    name: string,
    detail: string,
    checked: boolean,
    onChange: (checked: boolean) => void,
  ): HTMLElement {
    const row = el('div', { className: 'kb-review-row', role: 'listitem' });
    let on_ = checked;

    const check = el('button', {
      className: 'kb-check',
      role: 'checkbox',
      'aria-checked': String(on_),
      'aria-label': name,
    });
    check.appendChild(el('span', { className: 'kb-check-box' }));
    on(check, 'click', () => {
      on_ = !on_;
      check.setAttribute('aria-checked', String(on_));
      onChange(on_);
    });
    row.appendChild(check);

    const main = el('div', { className: 'kb-review-main' });
    main.appendChild(el('span', { className: 'kb-review-name' }, name));
    main.appendChild(el('span', { className: 'kb-review-line' }, detail));
    row.appendChild(main);

    return row;
  }

  // ── Render ─────────────────────────────────────────────────────

  function visibleItems(): GroceryListItem[] {
    const query = searchInput.value.trim().toLowerCase();
    if (!query) return items;
    return items.filter(i =>
      i.name.toLowerCase().includes(query) || i.normalizedName.includes(query));
  }

  let skeletonTimer: number | undefined;

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

  function group(list: GroceryListItem[]): Array<[string, GroceryListItem[]]> {
    const byCat = new Map<string, GroceryListItem[]>();
    for (const item of list) {
      const bucket = byCat.get(item.category);
      if (bucket) bucket.push(item);
      else byCat.set(item.category, [item]);
    }

    const out: Array<[string, GroceryListItem[]]> = [];
    for (const cat of CATEGORIES) {
      const inCat = byCat.get(cat);
      if (!inCat) continue;
      byCat.delete(cat);
      out.push([CATEGORY_LABELS[cat], inCat]);
    }
    // A row whose category is off the vocabulary still has to be buyable.
    const strays: GroceryListItem[] = [];
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

    if (scan) listEl.appendChild(scan.render());

    if (loadFailed) {
      const box = notice(
        'Couldn’t open your shopping list on this device.',
        'Try again',
        () => { scheduleSkeleton(); void loadData(); },
      );
      box.setAttribute('role', 'alert');
      listEl.appendChild(box);
      return;
    }

    const list = visibleItems();
    if (list.length === 0) {
      const query = searchInput.value.trim();
      listEl.appendChild(notice(
        items.length > 0 && query
          ? `Nothing matches “${query}”.`
          : 'Your shopping list is empty. It fills itself from the things you usually buy, plus anything you mark as out in your pantry.',
      ));
      return;
    }

    // How far through the trip you are, which nothing used to say.
    listEl.appendChild(el('p', { className: 'kb-list-note' },
      `${list.length} to get`));

    for (const [label, inCat] of group(list)) {
      inCat.sort((a, b) => a.name.localeCompare(b.name));

      const headId = `grocery-cat-${++headSeq}`;
      const groupEl = el('div', {
        className: 'kb-group', role: 'group', 'aria-labelledby': headId,
      });
      const head = el('h2', { className: 'kb-group-head', id: headId });
      head.appendChild(el('span', {}, label));
      groupEl.appendChild(head);

      const rowsEl = el('div', { role: 'list' });
      for (const item of inCat) rowsEl.appendChild(renderRow(item));
      groupEl.appendChild(rowsEl);

      listEl.appendChild(groupEl);
    }

    if (scroller) {
      requestAnimationFrame(() => { scroller.scrollTop = scrollTop; });
    }
    restoreFocus();
  }

  function renderRow(item: GroceryListItem): HTMLElement {
    const row = el('div', {
      className: 'kb-row', role: 'listitem', 'data-item-id': item.id,
    });

    // Ticking means you have it: it moves into your pantry and off the list.
    const check = el('button', {
      className: 'kb-check',
      role: 'checkbox',
      'aria-checked': 'false',
      'aria-label': `Got ${item.name}`,
      'data-control': 'check',
    });
    check.appendChild(el('span', { className: 'kb-check-box' }));
    on(check, 'click', () => {
      markFocus(item.id, 'check');
      void gotIt(item);
    });
    row.appendChild(check);

    const main = el('button', { className: 'kb-row-main', 'data-control': 'main' });
    main.appendChild(el('span', { className: 'kb-row-name' }, item.name));

    // Amount when it says something, otherwise why this row is here at all.
    const sub = el('span', { className: 'kb-row-sub' });
    if (!(item.quantity === 1 && item.unit === 'count')) {
      sub.appendChild(el('span', { className: 'kb-row-n' }, String(item.quantity)));
      if (item.unit !== 'count') sub.appendChild(el('span', {}, ` ${item.unit}`));
    } else if (SOURCE_LABEL[item.source]) {
      sub.appendChild(el('span', {}, SOURCE_LABEL[item.source]));
    }
    if (sub.childNodes.length > 0) main.appendChild(sub);
    main.appendChild(el('span', { className: 'visually-hidden' }, ' — edit'));
    on(main, 'click', () => openAddForm(item));
    row.appendChild(main);

    const del = el('button', {
      className: 'kb-del', 'aria-label': `Delete ${item.name}`, 'data-control': 'delete',
    });
    del.appendChild(svgIcon(ICON_TRASH, 19));
    on(del, 'click', () => {
      markFocus(item.id, 'delete');
      void remove(item);
    });
    row.appendChild(del);

    return row;
  }

  // ── Actions ────────────────────────────────────────────────────

  async function gotIt(item: GroceryListItem) {
    let snapshot: PurchaseSnapshot | null = null;
    const ok = await mutate(
      async () => { snapshot = await purchaseGroceryItem(item.id); },
      `Couldn’t move ${item.name} to your pantry.`,
    );
    if (!ok) return;

    // The highest-frequency tap in the app, made on a moving cart. It writes
    // to two stores, so the undo carries what both looked like before.
    const taken: PurchaseSnapshot | null = snapshot;
    showToast(
      `${item.name} moved to your pantry`,
      'success',
      taken
        ? async () => {
            await mutate(
              async () => { await undoPurchase(taken); },
              `Couldn’t put ${item.name} back on your list.`,
            );
            await loadData();
          }
        : undefined,
    );
    await loadData();
  }

  async function remove(item: GroceryListItem) {
    const saved_ = { ...item };
    const ok = await mutate(
      async () => { await deleteGroceryItem(item.id); },
      `Couldn’t remove ${item.name}.`,
    );
    if (!ok) return;
    showToast(
      saved_.source === 'auto'
        ? `${item.name} removed until you next buy it`
        : `${item.name} deleted`,
      'info',
      async () => {
        await mutate(
          async () => { await restoreGroceryItem(saved_); },
          `Couldn’t bring ${saved_.name} back.`,
        );
        await loadData();
      },
    );
    await loadData();
  }

  // ── Load ───────────────────────────────────────────────────────

  async function loadData() {
    try {
      // The list is derived, not maintained: it brings itself into line with
      // the standing order on every open. This used to be a button below the
      // fold labelled "Refresh list".
      items = await reconcileGroceryList();
      loadFailed = false;
    } catch {
      try {
        items = await getAllGroceryItems();
        loadFailed = false;
      } catch {
        loadFailed = true;
        items = [];
      }
    }
    window.clearTimeout(skeletonTimer);
    render();
    // After the rows exist, never before: a scroll position assigned to an
    // empty scroller is clamped to 0.
    keepPlace(container, ROUTE);
  }

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
