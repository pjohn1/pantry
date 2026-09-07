import { el, on, svgIcon } from '../../utils/dom';
import {
  getAllTypicalOrderItems,
  addTypicalOrderItem,
  updateTypicalOrderItem,
  deleteTypicalOrderItem,
  findTypicalOrderItemByName,
} from '../../services/typical-order.service';
import { reconcileGroceryList } from '../../services/grocery.service';
import { exportAllData, importData, clearAllData, saveJson } from '../../services/export-import.service';
import { CATEGORIES, CATEGORY_LABELS, type TypicalOrderItem } from '../../models/types';
import { openModal } from '../shared/modal';
import { showToast } from '../shared/toast';
import { createItemForm, type ItemFormData } from '../shared/item-form';

const ICON_TRASH =
  '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>';

export function createSettingsView(): HTMLElement {
  const container = el('div', { className: 'settings-view' });

  container.appendChild(el('h1', { className: 'visually-hidden' }, 'Settings'));

  // ── The standing order ─────────────────────────────────────────
  // The product's core object. It used to live down here with no grouping and
  // a 30px add button, while the two tabs it drives never mentioned it.
  const orderSection = el('section');
  const orderHeader = el('div', { className: 'section-header' });
  orderHeader.appendChild(el('h2', { className: 'section-title' }, 'Things you usually buy'));
  const addOrderBtn = el('button', { className: 'btn btn-secondary' }, 'Add');
  on(addOrderBtn, 'click', () => openStapleForm());
  orderHeader.appendChild(addOrderBtn);
  orderSection.appendChild(orderHeader);

  orderSection.appendChild(el('p', { className: 'section-note' },
    'Your shopping list is built from this, minus whatever is already in your pantry.'));

  const orderList = el('div');
  orderSection.appendChild(orderList);
  container.appendChild(orderSection);

  // ── Data ───────────────────────────────────────────────────────
  const dataSection = el('section', { className: 'settings-section' });
  const dataHeader = el('div', { className: 'section-header' });
  dataHeader.appendChild(el('h2', { className: 'section-title' }, 'Your data'));
  dataSection.appendChild(dataHeader);

  dataSection.appendChild(el('p', { className: 'section-note' },
    'Everything lives on this device only. A backup file is the only way to move it.'));

  const dataActions = el('div', { className: 'settings-actions' });

  const exportBtn = el('button', { className: 'btn btn-secondary btn-block' }, 'Export a backup');
  on(exportBtn, 'click', async () => {
    try {
      const data = await exportAllData();
      const where = await saveJson(data, `pantry-backup-${new Date().toISOString().slice(0, 10)}.json`);
      // Only claim it worked when the browser actually took the file.
      showToast(where === 'shared' ? 'Backup shared' : 'Backup saved', 'success');
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      showToast((err as Error).message || 'Couldn’t export your data.', 'error');
    }
  });
  dataActions.appendChild(exportBtn);

  const importBtn = el('button', { className: 'btn btn-secondary btn-block' }, 'Import a backup');
  on(importBtn, 'click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      // Import replaces stores wholesale, so it asks first. It used to sit one
      // button above "Delete everything" and act instantly.
      openModal('Replace what’s here?', (body, close) => {
        body.appendChild(el('p', {},
          `Importing ${file.name} replaces your pantry, your shopping list, the things you usually buy, and anything you’ve saved with what’s in that file. This can’t be undone.`));

        const cancel = el('button', { className: 'btn btn-secondary btn-block' }, 'Cancel');
        on(cancel, 'click', close);
        body.appendChild(cancel);

        const go = el('button', { className: 'btn btn-danger btn-block' }, 'Replace everything');
        on(go, 'click', async () => {
          go.disabled = true;
          try {
            await importData(await file.text());
            close();
            showToast('Backup imported', 'success');
            await loadTypicalOrder();
          } catch (err) {
            go.disabled = false;
            showToast((err as Error).message, 'error');
          }
        });
        body.appendChild(go);
      });
    });
    input.click();
  });
  dataActions.appendChild(importBtn);

  const clearBtn = el('button', { className: 'btn btn-danger btn-block' }, 'Delete everything');
  on(clearBtn, 'click', () => {
    openModal('Delete everything?', (body, close) => {
      body.appendChild(el('p', {}, 'This permanently deletes everything: your pantry, your shopping list, the things you usually buy, and anything you’ve saved. It cannot be undone.'));

      // Cancel first, per the platform: the destructive choice is not the one
      // a thumb finds by default.
      const cancelBtn = el('button', { className: 'btn btn-secondary btn-block' }, 'Cancel');
      on(cancelBtn, 'click', close);
      body.appendChild(cancelBtn);

      const confirmBtn = el('button', { className: 'btn btn-danger btn-block' }, 'Delete everything');
      on(confirmBtn, 'click', async () => {
        confirmBtn.disabled = true;
        try {
          await clearAllData();
          close();
          showToast('Everything deleted', 'info');
          await loadTypicalOrder();
        } catch {
          confirmBtn.disabled = false;
          showToast('Couldn’t delete your data.', 'error');
        }
      });
      body.appendChild(confirmBtn);
    });
  });
  dataActions.appendChild(clearBtn);

  dataSection.appendChild(dataActions);
  container.appendChild(dataSection);

  // ── Standing-order editing ─────────────────────────────────────
  let typicalItems: TypicalOrderItem[] = [];
  let loadFailed = false;

  function openStapleForm(item?: TypicalOrderItem) {
    openModal(item ? 'Edit' : 'Add something you usually buy', (body, close) => {
      createItemForm(body, {
        initial: item
          ? { name: item.name, quantity: item.quantity, unit: item.unit, category: item.category }
          : undefined,
        submitLabel: item ? 'Save' : 'Add',
        quantityLabel: 'Usually buy',
        // No toggle here: everything in this list is a staple by definition.
        checkExisting: async (normalizedName) => {
          const match = await findTypicalOrderItemByName(normalizedName);
          if (!match || match.id === item?.id) return null;
          return {
            name: match.name,
            open: () => { close(); openStapleForm(match); },
          };
        },
        onSubmit: async (data: ItemFormData) => {
          try {
            if (item) await updateTypicalOrderItem({ ...item, ...data });
            else await addTypicalOrderItem(data);
            // The shopping list follows from this list, so it updates now
            // rather than waiting for someone to press something.
            await reconcileGroceryList();
          } catch {
            showToast(`Couldn’t save ${data.name}.`, 'error');
            return;
          }
          close();
          showToast(item ? 'Saved' : `${data.name} added`, 'success');
          await loadTypicalOrder();
        },
      });
    });
  }

  /**
   * Grouped by category with the same headings the two lists use. A flat list
   * ordered by the raw enum string turned sixty staples into one long scroll
   * with nothing to navigate by.
   */
  function renderTypicalOrder() {
    orderList.innerHTML = '';

    if (loadFailed) {
      const box = el('div', { className: 'empty-state', role: 'alert' });
      box.appendChild(el('p', { className: 'empty-state-text' },
        'Couldn’t open your saved data on this device.'));
      const retry = el('button', { className: 'btn btn-secondary' }, 'Try again');
      on(retry, 'click', () => void loadTypicalOrder());
      box.appendChild(retry);
      orderList.appendChild(box);
      return;
    }

    if (typicalItems.length === 0) {
      const empty = el('div', { className: 'empty-state' });
      empty.appendChild(el('p', { className: 'empty-state-text' },
        'Nothing here yet. Add the things you always keep in the house, and they’ll appear on your shopping list whenever the pantry runs dry.'
      ));
      orderList.appendChild(empty);
      return;
    }

    const byCat = new Map<string, TypicalOrderItem[]>();
    for (const item of typicalItems) {
      const bucket = byCat.get(item.category);
      if (bucket) bucket.push(item);
      else byCat.set(item.category, [item]);
    }

    const order = [...CATEGORIES.filter(c => byCat.has(c)), ...[...byCat.keys()].filter(
      c => !(CATEGORIES as string[]).includes(c),
    )];

    for (const cat of order) {
      const inCat = byCat.get(cat);
      if (!inCat) continue;
      inCat.sort((a, b) => a.name.localeCompare(b.name));

      orderList.appendChild(el('h3', { className: 'settings-group-head' },
        CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS] ?? CATEGORY_LABELS.other));

      const list = el('div', { className: 'item-list' });
      for (const item of inCat) list.appendChild(renderTypicalRow(item));
      orderList.appendChild(list);
    }
  }

  function renderTypicalRow(item: TypicalOrderItem): HTMLElement {
    const row = el('div', { className: 'item-row' });

    // The row is the edit target and the trailing trash is the delete, exactly
    // as on Pantry and on the shopping list. A pair of filled buttons per row
    // made a column of red the loudest thing on a maintenance screen.
    const content = el('button', { className: 'item-row-content' });
    content.appendChild(el('div', { className: 'item-row-name' }, item.name));
    const detail = item.unit === 'count'
      ? `usually buy ${item.quantity}`
      : `usually buy ${item.quantity} ${item.unit}`;
    content.appendChild(el('div', { className: 'item-row-detail' },
      item.snoozed ? `${detail} · off the list until you next buy it` : detail));
    content.appendChild(el('span', { className: 'visually-hidden' }, ' — edit'));
    on(content, 'click', () => openStapleForm(item));
    row.appendChild(content);

    const deleteBtn = el('button', {
      className: 'item-row-del', 'aria-label': `Delete ${item.name}`,
    });
    const trash = svgIcon(ICON_TRASH, 19);
    trash.setAttribute('aria-hidden', 'true');
    deleteBtn.appendChild(trash);
    on(deleteBtn, 'click', async () => {
      const saved = { ...item };
      try {
        await deleteTypicalOrderItem(item.id);
        await reconcileGroceryList();
      } catch {
        showToast(`Couldn’t remove ${saved.name}.`, 'error');
        return;
      }
      // Every other delete in the app offers an undo; this one did not.
      // A fresh id is harmless: nothing joins on typicalOrder.id.
      showToast(`${saved.name} deleted`, 'info', async () => {
        await addTypicalOrderItem({
          name: saved.name, quantity: saved.quantity,
          unit: saved.unit, category: saved.category,
        });
        await reconcileGroceryList();
        await loadTypicalOrder();
      });
      await loadTypicalOrder();
    });
    row.appendChild(deleteBtn);

    return row;
  }

  async function loadTypicalOrder() {
    try {
      typicalItems = await getAllTypicalOrderItems();
      loadFailed = false;
    } catch {
      // Unguarded, this left the whole tab permanently blank.
      loadFailed = true;
      typicalItems = [];
    }
    renderTypicalOrder();
  }

  void loadTypicalOrder();

  return container;
}
