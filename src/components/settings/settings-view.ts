import { el, on } from '../../utils/dom';
import {
  getAllTypicalOrderItems,
  addTypicalOrderItem,
  updateTypicalOrderItem,
  deleteTypicalOrderItem,
} from '../../services/typical-order.service';
import { exportAllData, importData, clearAllData, downloadJson } from '../../services/export-import.service';
import { CATEGORY_LABELS, type TypicalOrderItem } from '../../models/types';
import { openModal } from '../shared/modal';
import { showToast } from '../shared/toast';
import { createItemForm, type ItemFormData } from '../shared/item-form';

export function createSettingsView(): HTMLElement {
  const container = el('div', { className: 'settings-view' });

  // Typical order section
  const orderSection = el('div');
  const orderHeader = el('div', { className: 'section-header' });
  orderHeader.appendChild(el('span', { className: 'section-title' }, 'Typical Grocery Order'));
  const addOrderBtn = el('button', { className: 'btn btn-sm btn-primary' }, '+ Add');
  on(addOrderBtn, 'click', () => {
    openModal('Add Typical Order Item', (body, close) => {
      createItemForm(body, {
        submitLabel: 'Add to Typical Order',
        onSubmit: async (data: ItemFormData) => {
          await addTypicalOrderItem(data);
          close();
          showToast('Item added to typical order', 'success');
          await loadTypicalOrder();
        },
      });
    });
  });
  orderHeader.appendChild(addOrderBtn);
  orderSection.appendChild(orderHeader);

  const orderList = el('div');
  orderSection.appendChild(orderList);
  container.appendChild(orderSection);

  // Data management section
  const dataSection = el('div');
  dataSection.style.marginTop = '32px';
  dataSection.appendChild(el('div', { className: 'section-header' },
    el('span', { className: 'section-title' }, 'Data Management')
  ));

  const dataActions = el('div');
  dataActions.style.display = 'flex';
  dataActions.style.flexDirection = 'column';
  dataActions.style.gap = '8px';

  const exportBtn = el('button', { className: 'btn btn-secondary btn-block' }, 'Export Data');
  on(exportBtn, 'click', async () => {
    const data = await exportAllData();
    downloadJson(data, `pantry-backup-${new Date().toISOString().slice(0, 10)}.json`);
    showToast('Data exported', 'success');
  });
  dataActions.appendChild(exportBtn);

  const importBtn = el('button', { className: 'btn btn-secondary btn-block' }, 'Import Data');
  on(importBtn, 'click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        await importData(text);
        showToast('Data imported successfully', 'success');
        await loadTypicalOrder();
      } catch (err) {
        showToast(`Import failed: ${(err as Error).message}`, 'error');
      }
    });
    input.click();
  });
  dataActions.appendChild(importBtn);

  const clearBtn = el('button', { className: 'btn btn-danger btn-block' }, 'Clear All Data');
  on(clearBtn, 'click', () => {
    openModal('Clear All Data', (body, close) => {
      body.appendChild(el('p', {}, 'This will permanently delete all your pantry items, grocery list, typical order, and saved recipes. This cannot be undone.'));
      const confirmBtn = el('button', { className: 'btn btn-danger btn-block' }, 'Yes, Clear Everything');
      on(confirmBtn, 'click', async () => {
        await clearAllData();
        close();
        showToast('All data cleared', 'info');
        await loadTypicalOrder();
      });
      body.appendChild(confirmBtn);
      const cancelBtn = el('button', { className: 'btn btn-secondary btn-block' }, 'Cancel');
      on(cancelBtn, 'click', close);
      body.appendChild(cancelBtn);
    });
  });
  dataActions.appendChild(clearBtn);

  dataSection.appendChild(dataActions);
  container.appendChild(dataSection);

  let typicalItems: TypicalOrderItem[] = [];

  function renderTypicalOrder() {
    orderList.innerHTML = '';

    if (typicalItems.length === 0) {
      const empty = el('div', { className: 'empty-state' });
      empty.appendChild(el('p', { className: 'empty-state-text' },
        'No typical order items. Add items you regularly buy.'
      ));
      orderList.appendChild(empty);
      return;
    }

    const list = el('div', { className: 'item-list' });
    const sorted = [...typicalItems].sort((a, b) =>
      a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
    );

    for (const item of sorted) {
      const row = el('div', { className: 'item-row' });

      const content = el('div', { className: 'item-row-content' });
      content.appendChild(el('div', { className: 'item-row-name' }, item.name));
      content.appendChild(el('div', { className: 'item-row-detail' },
        `${item.quantity} ${item.unit} \u2022 ${CATEGORY_LABELS[item.category]}`
      ));
      row.appendChild(content);

      const actions = el('div', { className: 'item-row-actions' });

      const editBtn = el('button', { className: 'btn btn-sm btn-secondary' }, 'Edit');
      on(editBtn, 'click', () => {
        openModal('Edit Typical Order Item', (body, close) => {
          createItemForm(body, {
            initial: { name: item.name, quantity: item.quantity, unit: item.unit, category: item.category },
            submitLabel: 'Save',
            onSubmit: async (data: ItemFormData) => {
              await updateTypicalOrderItem({ ...item, ...data });
              close();
              showToast('Item updated', 'success');
              await loadTypicalOrder();
            },
          });
        });
      });
      actions.appendChild(editBtn);

      const deleteBtn = el('button', { className: 'btn btn-sm btn-danger' }, 'Del');
      on(deleteBtn, 'click', async () => {
        await deleteTypicalOrderItem(item.id);
        showToast('Item removed', 'info');
        await loadTypicalOrder();
      });
      actions.appendChild(deleteBtn);

      row.appendChild(actions);
      list.appendChild(row);
    }

    orderList.appendChild(list);
  }

  async function loadTypicalOrder() {
    typicalItems = await getAllTypicalOrderItems();
    renderTypicalOrder();
  }

  loadTypicalOrder();

  return container;
}
