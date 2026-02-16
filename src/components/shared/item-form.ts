import { el } from '../../utils/dom';
import { CATEGORIES, CATEGORY_LABELS, UNITS, type ItemCategory } from '../../models/types';

export interface ItemFormData {
  name: string;
  quantity: number;
  unit: string;
  category: ItemCategory;
}

export interface ItemFormOptions {
  initial?: Partial<ItemFormData>;
  submitLabel: string;
  onSubmit: (data: ItemFormData) => void;
}

export function createItemForm(container: HTMLElement, options: ItemFormOptions): void {
  const { initial, submitLabel, onSubmit } = options;

  // Name
  const nameGroup = el('div', { className: 'input-group' });
  nameGroup.appendChild(el('label', {}, 'Name'));
  const nameInput = el('input', { className: 'input', type: 'text', placeholder: 'e.g. Milk' });
  if (initial?.name) nameInput.value = initial.name;
  nameGroup.appendChild(nameInput);
  container.appendChild(nameGroup);

  // Quantity + Unit row
  const row = el('div', { className: 'input-row' });

  const qtyGroup = el('div', { className: 'input-group' });
  qtyGroup.appendChild(el('label', {}, 'Quantity'));
  const qtyInput = el('input', { className: 'input', type: 'number', placeholder: '1' });
  qtyInput.setAttribute('min', '0');
  qtyInput.setAttribute('step', 'any');
  qtyInput.value = String(initial?.quantity ?? 1);
  qtyGroup.appendChild(qtyInput);
  row.appendChild(qtyGroup);

  const unitGroup = el('div', { className: 'input-group' });
  unitGroup.appendChild(el('label', {}, 'Unit'));
  const unitSelect = el('select', { className: 'select' });
  for (const u of UNITS) {
    const opt = el('option', { value: u }, u);
    if (u === (initial?.unit ?? 'count')) opt.selected = true;
    unitSelect.appendChild(opt);
  }
  unitGroup.appendChild(unitSelect);
  row.appendChild(unitGroup);
  container.appendChild(row);

  // Category
  const catGroup = el('div', { className: 'input-group' });
  catGroup.appendChild(el('label', {}, 'Category'));
  const catSelect = el('select', { className: 'select' });
  for (const cat of CATEGORIES) {
    const opt = el('option', { value: cat }, CATEGORY_LABELS[cat]);
    if (cat === (initial?.category ?? 'other')) opt.selected = true;
    catSelect.appendChild(opt);
  }
  catGroup.appendChild(catSelect);
  container.appendChild(catGroup);

  // Submit
  const submitBtn = el('button', { className: 'btn btn-primary btn-block' }, submitLabel);
  submitBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (!name) {
      nameInput.focus();
      return;
    }
    onSubmit({
      name,
      quantity: parseFloat(qtyInput.value) || 1,
      unit: unitSelect.value,
      category: catSelect.value as ItemCategory,
    });
  });
  container.appendChild(submitBtn);

  // Focus name input
  setTimeout(() => nameInput.focus(), 100);
}
