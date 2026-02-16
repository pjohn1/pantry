import { el } from '../../utils/dom';
import { CATEGORIES, CATEGORY_LABELS, UNITS, type ItemCategory } from '../../models/types';

const LAST_CATEGORY_KEY = 'pantry-last-category';
const LAST_UNIT_KEY = 'pantry-last-unit';

function getLastCategory(): ItemCategory {
  return (localStorage.getItem(LAST_CATEGORY_KEY) as ItemCategory) || 'other';
}

function getLastUnit(): string {
  return localStorage.getItem(LAST_UNIT_KEY) || 'count';
}

function saveLastChoices(category: ItemCategory, unit: string): void {
  localStorage.setItem(LAST_CATEGORY_KEY, category);
  localStorage.setItem(LAST_UNIT_KEY, unit);
}

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

  const defaultCategory = initial?.category ?? getLastCategory();
  const defaultUnit = initial?.unit ?? getLastUnit();

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
    if (u === defaultUnit) opt.selected = true;
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
    if (cat === defaultCategory) opt.selected = true;
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
    const category = catSelect.value as ItemCategory;
    const unit = unitSelect.value;
    saveLastChoices(category, unit);
    onSubmit({
      name,
      quantity: parseFloat(qtyInput.value) || 1,
      unit,
      category,
    });
  });
  container.appendChild(submitBtn);

  // Focus name input
  setTimeout(() => nameInput.focus(), 100);
}
