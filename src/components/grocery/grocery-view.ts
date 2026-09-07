import { el, on, svgIcon } from '../../utils/dom';
import {
  getAllGroceryItems,
  regenerateGroceryList,
  addManualGroceryItem,
  toggleGroceryItem,
  deleteGroceryItem,
  restoreGroceryItem,
  clearCheckedItems,
  purchaseGroceryItem,
} from '../../services/grocery.service';
import { CATEGORIES, CATEGORY_LABELS, type GroceryListItem } from '../../models/types';
import { openModal } from '../shared/modal';
import { showToast } from '../shared/toast';
import { createItemForm, type ItemFormData } from '../shared/item-form';
import { extractReceiptLinesFromImage } from '../../services/ocr.service';
import { parseReceiptLines, processReceiptAgainstGroceryList } from '../../services/receipt.service';
import { openBarcodeScanner } from '../shared/barcode-scanner';

// svgIcon() assigns innerHTML, so an icon must be markup, not a bare `d`.
const ICON_RECEIPT =
  '<rect x="3" y="5" width="18" height="14" rx="2"/><polyline points="3 7 12 13 21 7"/>';
const ICON_BARCODE =
  '<path d="M2 2h5v5H2zM9 2h2M13 2h5v5h-5zM16 7h2M2 9h2M7 9h2M11 9v4M2 13h2M11 13h2M13 11h2M2 17h5v5H2zM7 17h2M13 17h5v5h-5z"/>';
const ICON_PLUS = '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>';

/** Why this card was pulled, in the language of the rack it came from. */
function sourceLabel(source: GroceryListItem['source']): string {
  switch (source) {
    case 'auto': return 'baseline';
    case 'out': return 'ran out';
    case 'recipe': return 'recipe';
    case 'manual': return 'by hand';
    default: return source;
  }
}

export function createGroceryView(): HTMLElement {
  const container = el('div', { className: 'kb-rack-view grocery-view' });

  // ── Toolbar ────────────────────────────────────────────────────
  const toolbar = el('div', { className: 'kb-toolbar' });

  const searchInput = el('input', {
    className: 'kb-search',
    type: 'search',
    placeholder: 'Find a card',
    'aria-label': 'Search the list',
    autocapitalize: 'none',
    autocorrect: 'off',
    spellcheck: 'false',
    enterkeyhint: 'search',
  }) as HTMLInputElement;
  toolbar.appendChild(searchInput);

  const toGetBtn = el('button', {
    className: 'kb-pulled',
    'aria-pressed': 'false',
  }) as HTMLButtonElement;
  const toGetN = el('span', { className: 'kb-pulled-n' }, '0');
  toGetBtn.appendChild(toGetN);
  toGetBtn.appendChild(el('span', {}, 'to get'));
  toolbar.appendChild(toGetBtn);
  container.appendChild(toolbar);

  const rackContainer = el('div', { className: 'kb-racks' });
  container.appendChild(rackContainer);

  // ── Dock: the camera owns the thumb zone ───────────────────────
  const receiptInput = el('input', {
    type: 'file',
    accept: 'image/*',
    'aria-hidden': 'true',
  }) as HTMLInputElement;
  receiptInput.style.display = 'none';
  container.appendChild(receiptInput);

  const dock = el('div', { className: 'kb-dock' });

  // The receipt is the flagship zero-typing path, so it leads.
  const receiptBtn = el('button', { className: 'kb-dock-btn kb-dock-scan' });
  function paintReceiptBtn(label: string) {
    receiptBtn.innerHTML = '';
    receiptBtn.appendChild(svgIcon(ICON_RECEIPT, 18));
    receiptBtn.appendChild(el('span', {}, label));
  }
  paintReceiptBtn('Receipt');
  on(receiptBtn, 'click', () => receiptInput.click());
  dock.appendChild(receiptBtn);

  const barcodeBtn = el('button', {
    className: 'kb-dock-btn kb-dock-new',
    'aria-label': 'Scan a barcode',
  });
  barcodeBtn.appendChild(svgIcon(ICON_BARCODE, 18));
  on(barcodeBtn, 'click', () => {
    openBarcodeScanner((name, category) => openAddForm({ name, category }));
  });
  dock.appendChild(barcodeBtn);

  const newBtn = el('button', {
    className: 'kb-dock-btn kb-dock-new',
    'aria-label': 'Add a card by hand',
  });
  newBtn.appendChild(svgIcon(ICON_PLUS, 20));
  on(newBtn, 'click', () => openAddForm());
  dock.appendChild(newBtn);
  container.appendChild(dock);

  // ── State ──────────────────────────────────────────────────────
  let allItems: GroceryListItem[] = [];
  let loadFailed = false;
  let toGetOnly = false;
  let openCardId: string | null = null;
  let refocusCardId: string | null = null;

  /**
   * Wraps a write. These writes move items between the grocery list and the
   * pantry, so a silent failure here corrupts the same ledger the pantry
   * tab is careful about.
   */
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
    openModal('New card', (body, close) => {
      createItemForm(body, {
        initial,
        submitLabel: 'Add to the list',
        onSubmit: async (data: ItemFormData) => {
          const ok = await mutate(
            async () => {
              await addManualGroceryItem(data.name, data.quantity, data.unit, data.category);
            },
            `Couldn’t add ${data.name}.`,
          );
          if (!ok) return;
          close();
          showToast('Card added', 'success');
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

    paintReceiptBtn('Reading…');
    receiptBtn.setAttribute('disabled', '');

    try {
      const rawLines = await extractReceiptLinesFromImage(file);
      const itemNames = parseReceiptLines(rawLines);

      if (itemNames.length === 0) {
        showToast('No items found on that receipt', 'info');
        return;
      }

      const result = await processReceiptAgainstGroceryList(itemNames);

      if (result.matched.length === 0) {
        showToast('Nothing on the list matched that receipt', 'info');
      } else {
        const n = result.matched.length;
        showToast(`${n} card${n !== 1 ? 's' : ''} filed back on the rack`, 'success');
      }
      await loadData();
    } catch {
      showToast('Couldn’t read that receipt.', 'error');
    } finally {
      receiptBtn.removeAttribute('disabled');
      paintReceiptBtn('Receipt');
    }
  });

  // ── Derivation ─────────────────────────────────────────────────

  function visibleItems(): GroceryListItem[] {
    let list = allItems;
    if (toGetOnly) list = list.filter(i => !i.checked);
    const query = searchInput.value.trim().toLowerCase();
    if (query) list = list.filter(i => i.name.toLowerCase().includes(query));
    return list;
  }

  function updateToGet() {
    const remaining = allItems.filter(i => !i.checked).length;
    toGetN.textContent = String(remaining);
    toGetBtn.hidden = remaining === 0;
    if (remaining === 0 && toGetOnly) toGetOnly = false;
    toGetBtn.setAttribute('aria-pressed', String(toGetOnly));
  }

  // ── Render ─────────────────────────────────────────────────────

  function renderSkeleton() {
    rackContainer.innerHTML = '';
    for (let i = 0; i < 5; i++) {
      const row = el('div', { className: 'kb-skeleton' });
      row.appendChild(el('div', { className: 'kb-skeleton-line' }));
      rackContainer.appendChild(row);
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
    if (allItems.length === 0) {
      return 'The reorder box is empty. Declare a baseline in Settings, pull a card from the pantry, or add one by hand.';
    }
    if (toGetOnly) return 'Everything on the list is in the cart.';
    if (query) return `No card matches “${query}”.`;
    return 'Nothing to show.';
  }

  function renderRacks() {
    const scrollParent = container.closest('.app-content');
    const scrollTop = scrollParent?.scrollTop ?? 0;

    rackContainer.innerHTML = '';

    if (loadFailed) {
      rackContainer.appendChild(notice(
        'Couldn’t read the list from this device’s storage.',
        'Try again',
        () => { renderSkeleton(); void loadData(); },
      ));
      return;
    }

    const list = visibleItems();
    if (list.length === 0) {
      rackContainer.appendChild(notice(emptyText()));
      rackContainer.appendChild(renderRackActions());
      return;
    }

    // Canonical category order, so a section never moves as items are added.
    for (const cat of CATEGORIES) {
      const inCat = list.filter(i => i.category === cat);
      if (inCat.length === 0) continue;

      // Still to get first: the aisle reads top-down.
      inCat.sort((a, b) =>
        Number(a.checked) - Number(b.checked) || a.name.localeCompare(b.name));

      const rack = el('div', { className: 'kb-rack' });
      const tag = el('div', { className: 'kb-bin-tag' });
      tag.appendChild(el('span', {}, CATEGORY_LABELS[cat]));
      const remaining = inCat.filter(i => !i.checked).length;
      if (remaining > 0) {
        tag.appendChild(el('span', { className: 'kb-bin-count' }, `${remaining} to get`));
      }
      rack.appendChild(tag);

      for (const item of inCat) rack.appendChild(renderCard(item));
      rackContainer.appendChild(rack);
    }

    rackContainer.appendChild(renderRackActions());

    if (scrollParent) {
      requestAnimationFrame(() => { scrollParent.scrollTop = scrollTop; });
    }

    if (refocusCardId) {
      const id = refocusCardId;
      refocusCardId = null;
      requestAnimationFrame(() => {
        rackContainer
          .querySelector<HTMLElement>(`[data-card-id="${id}"] .kb-card-main`)
          ?.focus();
      });
    }
  }

  function renderCard(item: GroceryListItem): HTMLElement {
    const holder = el('div', {});
    holder.dataset.cardId = item.id;

    const surface = el('div', { className: `kb-card${item.checked ? ' is-incart' : ''}` });
    surface.appendChild(el('span', { className: 'kb-punch' }));

    const main = el('button', {
      className: 'kb-card-main',
      'aria-expanded': String(openCardId === item.id),
    });
    main.appendChild(el('span', { className: 'kb-card-name' }, item.name));

    // Same fixed tracks as the pantry rack, so both tabs scan alike.
    const fields = el('span', { className: 'kb-fields' });
    fields.appendChild(el('span', { className: 'kb-field-label' }, 'Qty'));
    fields.appendChild(el('span', { className: 'kb-num' }, String(item.quantity)));
    fields.appendChild(el('span', { className: 'kb-field-unit' },
      `${item.unit} · ${sourceLabel(item.source)}`));
    main.appendChild(fields);
    surface.appendChild(main);

    on(main, 'click', () => toggleDetail(item, holder, main));

    // The aisle action is ticking a card into the cart, so that is what the
    // stamp does. Filing the card back onto the rack is the slower step and
    // lives in the detail and the swipe.
    const stampBtn = el('button', {
      className: 'kb-stamp-btn',
      'aria-label': item.checked
        ? `${item.name}: take back out of the cart`
        : `${item.name}: put in the cart`,
    });
    stampBtn.appendChild(el('span', {
      className: `kb-stamp ${item.checked ? 'kb-stamp--incart' : 'kb-stamp--toget'}`,
    }, item.checked ? 'In cart' : 'To get'));
    on(stampBtn, 'click', () => void toggleInCart(item));
    surface.appendChild(stampBtn);

    holder.appendChild(surface);

    if (openCardId === item.id) holder.appendChild(renderDetail(item));
    return holder;
  }

  function toggleDetail(item: GroceryListItem, holder: HTMLElement, main: HTMLElement) {
    if (openCardId === item.id) {
      openCardId = null;
      holder.querySelector('.kb-detail')?.remove();
      main.setAttribute('aria-expanded', 'false');
      return;
    }
    if (openCardId) {
      const prev = rackContainer.querySelector(`[data-card-id="${openCardId}"]`);
      prev?.querySelector('.kb-detail')?.remove();
      prev?.querySelector('.kb-card-main')?.setAttribute('aria-expanded', 'false');
    }
    openCardId = item.id;
    holder.appendChild(renderDetail(item));
    main.setAttribute('aria-expanded', 'true');
  }

  function renderDetail(item: GroceryListItem): HTMLElement {
    const detail = el('div', { className: 'kb-detail' });

    const row = (label: string, value: string) => {
      const r = el('div', { className: 'kb-detail-row' });
      r.appendChild(el('span', { className: 'kb-detail-label' }, label));
      r.appendChild(el('span', { className: 'kb-detail-val' }, value));
      detail.appendChild(r);
    };

    row('Name', item.name);
    row('Bin', CATEGORY_LABELS[item.category]);
    row('Quantity', `${item.quantity} ${item.unit}`);
    row('Pulled by', sourceLabel(item.source));
    row('Status', item.checked ? 'In the cart' : 'Still to get');

    // Filing is what completes the loop: the card leaves the reorder box and
    // goes back on the rack as pantry stock.
    const primary = el('button', { className: 'kb-btn kb-btn--primary' },
      'File back on the rack');
    on(primary, 'click', () => void file(item));
    detail.appendChild(primary);

    const actions = el('div', { className: 'kb-detail-actions' });
    const delBtn = el('button', { className: 'kb-btn kb-btn--danger' }, 'Delete') as HTMLButtonElement;
    on(delBtn, 'click', async () => {
      delBtn.disabled = true;
      await remove(item);
      delBtn.disabled = false;
    });
    actions.appendChild(delBtn);
    detail.appendChild(actions);

    return detail;
  }

  function renderRackActions(): HTMLElement {
    const box = el('div', { className: 'kb-rack-actions' });

    const refresh = el('button', { className: 'kb-btn' }, 'Rebuild from baseline');
    on(refresh, 'click', async () => {
      const ok = await mutate(
        async () => { await regenerateGroceryList(); },
        'Couldn’t rebuild the list.',
      );
      if (!ok) return;
      showToast('List rebuilt from your baseline', 'success');
      await loadData();
    });
    box.appendChild(refresh);

    // Named for what it does. This deletes the cards outright; it does not
    // file them into the pantry, which is what "clear checked" implied.
    const inCart = allItems.filter(i => i.checked).length;
    if (inCart > 0) {
      const discard = el('button', { className: 'kb-btn kb-btn--danger' },
        `Discard ${inCart} in cart without filing`);
      on(discard, 'click', async () => {
        const saved = allItems.filter(i => i.checked).map(i => ({ ...i }));
        const ok = await mutate(
          async () => { await clearCheckedItems(); },
          'Couldn’t discard those cards.',
        );
        if (!ok) return;
        showToast(`${saved.length} discarded`, 'info', async () => {
          for (const item of saved) {
            await mutate(
              async () => { await restoreGroceryItem(item); },
              `Couldn’t bring ${item.name} back.`,
            );
          }
          await loadData();
        });
        await loadData();
      });
      box.appendChild(discard);
    }

    return box;
  }

  // ── Actions ────────────────────────────────────────────────────

  async function toggleInCart(item: GroceryListItem) {
    refocusCardId = item.id;
    const ok = await mutate(
      async () => { await toggleGroceryItem(item.id); },
      `Couldn’t update ${item.name}.`,
    );
    if (!ok) return;
    await loadData();
  }

  async function file(item: GroceryListItem) {
    const ok = await mutate(
      async () => { await purchaseGroceryItem(item.id); },
      `Couldn’t file ${item.name} back on the rack.`,
    );
    if (!ok) return;
    if (openCardId === item.id) openCardId = null;
    showToast(`${item.name} back on the rack`, 'success');
    await loadData();
  }

  async function remove(item: GroceryListItem) {
    const saved = { ...item };
    const ok = await mutate(
      async () => { await deleteGroceryItem(item.id); },
      `Couldn’t remove ${item.name}.`,
    );
    if (!ok) return;
    if (openCardId === item.id) openCardId = null;
    showToast('Card removed', 'info', async () => {
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
      allItems = await getAllGroceryItems();
      loadFailed = false;
    } catch {
      loadFailed = true;
      allItems = [];
    }
    updateToGet();
    renderRacks();
  }

  on(toGetBtn, 'click', () => {
    toGetOnly = !toGetOnly;
    toGetBtn.setAttribute('aria-pressed', String(toGetOnly));
    renderRacks();
  });

  let searchTimer: number | undefined;
  on(searchInput, 'input', () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => renderRacks(), 150);
  });

  renderSkeleton();
  void loadData();

  return container;
}
