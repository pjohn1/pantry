import { el, on, svgIcon } from '../../utils/dom';
import {
  getAllPantryItems, addPantryItem, updatePantryItem,
  deletePantryItem, restorePantryItem, toggleOut,
} from '../../services/pantry.service';
import {
  getAllTypicalOrderItems, addTypicalOrderItem, updateTypicalOrderItem,
} from '../../services/typical-order.service';
import {
  CATEGORIES, CATEGORY_LABELS,
  type PantryItem, type TypicalOrderItem,
} from '../../models/types';
import { openModal } from '../shared/modal';
import { showToast } from '../shared/toast';
import { createItemForm, type ItemFormData } from '../shared/item-form';
import { openBarcodeScanner } from '../shared/barcode-scanner';
import { createSwipeRow, closeAnyOpenSwipeRow } from '../shared/swipe-row';

// svgIcon() assigns innerHTML, so an icon must be markup, not a bare `d`.
const ICON_BARCODE =
  '<path d="M2 2h5v5H2zM9 2h2M13 2h5v5h-5zM16 7h2M2 9h2M7 9h2M11 9v4M2 13h2M11 13h2M13 11h2M2 17h5v5H2zM7 17h2M13 17h5v5h-5z"/>';
const ICON_PLUS = '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>';

function formatDate(ts: number): string {
  const d = new Date(ts);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

/**
 * A kanban card is on the bin or it has been pulled — nothing in between.
 * That is also what this product decided: depletion is binary, and the
 * recorded quantity is reference information, not a tracked value. So the
 * signal is never derived from quantity; it comes from `isOut` alone.
 *
 * `plain` is an item with no declared baseline: it can still be pulled, but
 * there is no baseline to measure it against, so it spends no signal ink.
 */
type CardStatus = 'out' | 'stocked' | 'plain';

interface Card {
  item: PantryItem;
  /** The typical-order entry that declares this item a staple, if any. */
  typical: TypicalOrderItem | null;
  status: CardStatus;
}

const STATUS_RANK: Record<CardStatus, number> = { out: 0, stocked: 1, plain: 2 };

/** Colour is reserved for a declared state; a bare action stays neutral. */
const STAMP: Record<CardStatus, { label: string; cls: string; action: string }> = {
  out: { label: 'Out', cls: 'kb-stamp--out', action: 'put back on the rack' },
  stocked: { label: 'Stocked', cls: 'kb-stamp--stocked', action: 'pull this card' },
  plain: { label: 'Pull', cls: 'kb-stamp--plain', action: 'pull this card' },
};

export function createPantryView(): HTMLElement {
  const container = el('div', { className: 'kb-rack-view pantry-view' });

  // ── Toolbar ────────────────────────────────────────────────────
  const toolbar = el('div', { className: 'kb-toolbar' });

  const searchInput = el('input', {
    className: 'kb-search',
    type: 'search',
    placeholder: 'Find a card',
    'aria-label': 'Search pantry',
    autocapitalize: 'none',
    autocorrect: 'off',
    spellcheck: 'false',
    enterkeyhint: 'search',
  }) as HTMLInputElement;
  toolbar.appendChild(searchInput);

  const pulledBtn = el('button', {
    className: 'kb-pulled',
    'aria-pressed': 'false',
  }) as HTMLButtonElement;
  const pulledN = el('span', { className: 'kb-pulled-n' }, '0');
  pulledBtn.appendChild(pulledN);
  pulledBtn.appendChild(el('span', {}, 'pulled'));
  toolbar.appendChild(pulledBtn);
  container.appendChild(toolbar);

  const rackContainer = el('div', { className: 'kb-racks' });
  container.appendChild(rackContainer);

  // ── Dock: the camera owns the thumb zone ───────────────────────
  const dock = el('div', { className: 'kb-dock' });

  const scanBtn = el('button', { className: 'kb-dock-btn kb-dock-scan' });
  scanBtn.appendChild(svgIcon(ICON_BARCODE, 18));
  scanBtn.appendChild(el('span', {}, 'Scan'));
  on(scanBtn, 'click', () => {
    openBarcodeScanner((name, category) => openItemForm({ name, category }));
  });
  dock.appendChild(scanBtn);

  const newBtn = el('button', {
    className: 'kb-dock-btn kb-dock-new',
    'aria-label': 'New card',
  });
  newBtn.appendChild(svgIcon(ICON_PLUS, 20));
  on(newBtn, 'click', () => openItemForm());
  dock.appendChild(newBtn);
  container.appendChild(dock);

  // ── State ──────────────────────────────────────────────────────
  let cards: Card[] = [];
  let loadFailed = false;
  let pulledOnly = false;
  let openCardId: string | null = null;
  /** Set before a write so focus returns to the card after the re-render. */
  let refocusCardId: string | null = null;

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

  function openItemForm(initial?: Partial<ItemFormData>, existing?: PantryItem) {
    openModal(existing ? 'Edit card' : 'New card', (body, close) => {
      createItemForm(body, {
        initial: initial ?? (existing
          ? { name: existing.name, quantity: existing.quantity, unit: existing.unit, category: existing.category }
          : undefined),
        submitLabel: existing ? 'Save' : 'Add card',
        onSubmit: async (data: ItemFormData) => {
          const ok = await mutate(
            async () => {
              if (existing) await updatePantryItem({ ...existing, ...data });
              else await addPantryItem(data);
            },
            existing ? `Couldn’t save changes to ${data.name}.` : `Couldn’t save ${data.name}.`,
          );
          if (!ok) return;
          close();
          showToast(existing ? 'Card updated' : 'Card added', 'success');
          await loadData();
        },
      });
    });
  }

  // ── Derivation ─────────────────────────────────────────────────

  function visibleCards(): Card[] {
    let list = cards;
    if (pulledOnly) list = list.filter(c => c.status === 'out');
    const query = searchInput.value.trim().toLowerCase();
    if (query) list = list.filter(c => c.item.name.toLowerCase().includes(query));
    return list;
  }

  function updatePulled() {
    const out = cards.filter(c => c.status === 'out').length;
    pulledN.textContent = String(out);
    pulledBtn.hidden = out === 0;
    if (out === 0 && pulledOnly) pulledOnly = false;
    pulledBtn.setAttribute('aria-pressed', String(pulledOnly));
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
    if (cards.length === 0) return 'No cards on the rack yet. Scan a barcode, or add one by hand.';
    if (pulledOnly) return 'No cards are pulled. Nothing is waiting to be restocked.';
    if (query) return `No card matches “${query}”.`;
    return 'Nothing to show.';
  }

  function renderRacks() {
    const scrollParent = container.closest('.app-content');
    const scrollTop = scrollParent?.scrollTop ?? 0;

    closeAnyOpenSwipeRow();
    rackContainer.innerHTML = '';

    if (loadFailed) {
      rackContainer.appendChild(notice(
        'Couldn’t read the rack from this device’s storage.',
        'Try again',
        () => { renderSkeleton(); void loadData(); },
      ));
      return;
    }

    const list = visibleCards();
    if (list.length === 0) {
      rackContainer.appendChild(notice(emptyText()));
      return;
    }

    // Canonical category order, so section position never shifts as items
    // are added and muscle memory can actually form.
    for (const cat of CATEGORIES) {
      const inCat = list.filter(c => c.item.category === cat);
      if (inCat.length === 0) continue;

      inCat.sort((a, b) =>
        STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
        a.item.name.localeCompare(b.item.name));

      const rack = el('div', { className: 'kb-rack' });
      const tag = el('div', { className: 'kb-bin-tag' });
      tag.appendChild(el('span', {}, CATEGORY_LABELS[cat]));
      // One stable meaning: how many cards are off this bin, and nothing at
      // all when the bin is whole, so the slot only ever reports a problem.
      const pulledHere = inCat.filter(c => c.status === 'out').length;
      if (pulledHere > 0) {
        tag.appendChild(el('span', { className: 'kb-bin-count' }, `${pulledHere} pulled`));
      }
      rack.appendChild(tag);

      for (const card of inCat) rack.appendChild(renderCard(card));
      rackContainer.appendChild(rack);
    }

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

  function renderCard(card: Card): HTMLElement {
    const { item, typical, status } = card;
    const holder = el('div', {});
    holder.dataset.cardId = item.id;

    // Not a button: the row carries two distinct actions, and a button
    // inside a button is invalid.
    const surface = el('div', { className: `kb-card${status === 'out' ? ' is-pulled' : ''}` });
    surface.appendChild(el('span', { className: 'kb-punch' }));

    const main = el('button', {
      className: 'kb-card-main',
      'aria-expanded': String(openCardId === item.id),
    });
    main.appendChild(el('span', { className: 'kb-card-name' }, item.name));

    // The baseline is the mechanism, and it is the one number worth reading
    // in an aisle: it says how many to buy. The recorded quantity is
    // reference information and lives in the detail, where it cannot be
    // mistaken for the current ledger.
    const fields = el('span', { className: 'kb-fields' });
    if (typical) {
      fields.appendChild(el('span', { className: 'kb-field-label' }, 'Par'));
      fields.appendChild(el('span', { className: 'kb-num' }, String(typical.quantity)));
      fields.appendChild(el('span', { className: 'kb-field-unit' }, typical.unit));
    } else {
      fields.appendChild(el('span', { className: 'kb-field-label' }, 'No par'));
    }
    main.appendChild(fields);
    surface.appendChild(main);

    on(main, 'click', () => toggleDetail(card, holder, main));

    // The stamp is the primary action, because stamping a card is this
    // world's own ritual for pulling it. Before this, the only way to pull
    // was a horizontal swipe, which left the whole aisle loop behind a
    // gesture nothing on screen advertised.
    const stamp = STAMP[status];
    const stampBtn = el('button', {
      className: 'kb-stamp-btn',
      'aria-label': `${item.name}: ${stamp.action}`,
    });
    stampBtn.appendChild(el('span', { className: `kb-stamp ${stamp.cls}` }, stamp.label));
    on(stampBtn, 'click', () => void pull(item));
    surface.appendChild(stampBtn);

    // Swipe stays, as the accelerator rather than the only door.
    holder.appendChild(createSwipeRow(surface, [
      item.isOut
        ? { label: 'Restock', className: 'kb-action--restock', onAction: () => void pull(item) }
        : { label: 'Pull', className: 'kb-action--pull', onAction: () => void pull(item) },
      { label: 'Delete', className: 'kb-action--delete', onAction: () => void remove(item) },
    ]));

    if (openCardId === item.id) holder.appendChild(renderDetail(card));
    return holder;
  }

  /** Expands in place without rebuilding the rack, so focus and scroll hold. */
  function toggleDetail(card: Card, holder: HTMLElement, main: HTMLElement) {
    if (openCardId === card.item.id) {
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
    openCardId = card.item.id;
    holder.appendChild(renderDetail(card));
    main.setAttribute('aria-expanded', 'true');
  }

  function renderDetail(card: Card): HTMLElement {
    const { item, typical } = card;
    const detail = el('div', { className: 'kb-detail' });

    const row = (label: string, value: string) => {
      const r = el('div', { className: 'kb-detail-row' });
      r.appendChild(el('span', { className: 'kb-detail-label' }, label));
      r.appendChild(el('span', { className: 'kb-detail-val' }, value));
      detail.appendChild(r);
      return r;
    };

    // The card row clamps long names; the full text has to live somewhere.
    row('Name', item.name);
    row('Bin', CATEGORY_LABELS[item.category]);

    // Declaring a staple was only possible from Settings, so most cards read
    // "No par" and the mechanism had almost nothing to show. It is now set
    // from the card it describes.
    const baselineRow = row('Baseline', typical ? `${typical.quantity} ${typical.unit}` : 'Not a staple');
    const baselineBtn = el('button', { className: 'kb-inline-btn' },
      typical ? 'Change' : 'Make staple');
    on(baselineBtn, 'click', () => {
      baselineBtn.remove();
      const editor = el('span', { className: 'kb-baseline-edit' });
      const input = el('input', {
        className: 'kb-baseline-input',
        type: 'number',
        min: '1',
        step: '1',
        'aria-label': `Baseline for ${item.name}`,
      }) as HTMLInputElement;
      input.value = String(typical?.quantity ?? item.quantity ?? 1);
      const save = el('button', { className: 'kb-inline-btn' }, 'Set');
      on(save, 'click', async () => {
        const n = Math.max(1, Math.round(parseFloat(input.value) || 1));
        refocusCardId = item.id;
        const ok = await mutate(
          async () => {
            if (typical) await updateTypicalOrderItem({ ...typical, quantity: n });
            else await addTypicalOrderItem({
              name: item.name, quantity: n, unit: item.unit, category: item.category,
            });
          },
          `Couldn’t set a baseline for ${item.name}.`,
        );
        if (!ok) return;
        showToast(typical ? 'Baseline updated' : `${item.name} is now a staple`, 'success');
        await loadData();
      });
      editor.appendChild(input);
      editor.appendChild(save);
      baselineRow.appendChild(editor);
      input.focus();
    });
    baselineRow.appendChild(baselineBtn);

    // Reference only, and dated, so it can never read as the live ledger.
    row('Recorded', `${item.quantity} ${item.unit} · ${formatDate(item.dateAdded)}`);
    if (item.purchaseDate) row('Last bought', formatDate(item.purchaseDate));

    // The primary action gets the first and widest slot.
    const primary = el('button', { className: 'kb-btn kb-btn--primary' },
      item.isOut ? 'Put back on the rack' : 'Pull this card');
    on(primary, 'click', () => void pull(item));
    detail.appendChild(primary);

    const actions = el('div', { className: 'kb-detail-actions' });
    const editBtn = el('button', { className: 'kb-btn' }, 'Edit');
    on(editBtn, 'click', () => openItemForm(undefined, item));
    actions.appendChild(editBtn);

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

  // ── Actions ────────────────────────────────────────────────────

  async function pull(item: PantryItem) {
    let isNowOut = false;
    refocusCardId = item.id;
    const ok = await mutate(
      async () => { isNowOut = await toggleOut(item.id); },
      `Couldn’t update ${item.name}.`,
    );
    if (!ok) return;
    // Running out is not good news; only restocking is.
    showToast(
      isNowOut ? `${item.name} pulled — on the grocery list` : `${item.name} back on the rack`,
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
    if (openCardId === item.id) openCardId = null;
    showToast('Card removed', 'info', async () => {
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
      const [items, typical] = await Promise.all([
        getAllPantryItems(),
        getAllTypicalOrderItems(),
      ]);
      const byName = new Map<string, TypicalOrderItem>();
      for (const t of typical) byName.set(t.normalizedName, t);

      cards = items.map((item): Card => {
        const staple = byName.get(item.normalizedName) ?? null;
        // Never derived from quantity: depletion is binary.
        const status: CardStatus = item.isOut ? 'out' : staple ? 'stocked' : 'plain';
        return { item, typical: staple, status };
      });
      loadFailed = false;
    } catch {
      loadFailed = true;
      cards = [];
    }
    updatePulled();
    renderRacks();
  }

  on(pulledBtn, 'click', () => {
    pulledOnly = !pulledOnly;
    pulledBtn.setAttribute('aria-pressed', String(pulledOnly));
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
