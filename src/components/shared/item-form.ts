import { el, on } from '../../utils/dom';
import { CATEGORIES, CATEGORY_LABELS, UNITS, type ItemCategory } from '../../models/types';
import { normalizeIngredientName } from '../../utils/normalize';

const LAST_CATEGORY_KEY = 'pantry-last-category';
const LAST_UNIT_KEY = 'pantry-last-unit';

let fieldSeq = 0;
const nextId = (name: string) => `if-${name}-${++fieldSeq}`;

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
  /**
   * Whether this is something the household always keeps in stock. Driven by
   * an explicit toggle, never inferred from whether a number field happens to
   * be filled in — a pre-filled quantity used to make every single add and
   * edit declare a permanent staple by accident.
   */
  isStaple: boolean;
}

export interface ExistingMatch {
  name: string;
  open: () => void;
}

export interface ItemFormOptions {
  initial?: Partial<ItemFormData>;
  submitLabel: string;
  /** Overrides the "How many" label, e.g. "Usually buy". */
  quantityLabel?: string;
  /**
   * Renders the staple toggle and seeds it. Omit on surfaces where the answer
   * is already settled — a shopping-list row is not a staple declaration, and
   * everything in the standing order is one by definition.
   */
  stapleToggle?: { checked: boolean };
  /**
   * Looks the typed name up against the store this form writes to. The join
   * key is a normalized name, so "Milk", "milks" and "MILK" are one item, and
   * a second row under that key quietly breaks the pantry/list loop.
   */
  checkExisting?: (normalizedName: string) => Promise<ExistingMatch | null>;
  /**
   * When present, the form offers a barcode scan above the name field, so the
   * camera is one extra tap only when wanted -- adding by hand stays a single
   * tap from the + button.
   */
  scan?: (apply: (data: Partial<ItemFormData>) => void) => void;
  /**
   * May be async. The form disables itself for the duration, so a repeated tap
   * on a slow write cannot add the same item twice.
   */
  onSubmit: (data: ItemFormData) => void | Promise<void>;
}

export function createItemForm(container: HTMLElement, options: ItemFormOptions): void {
  const {
    initial, submitLabel, onSubmit, quantityLabel, stapleToggle, checkExisting, scan,
  } = options;

  const defaultCategory = initial?.category ?? getLastCategory();
  const defaultUnit = initial?.unit ?? getLastUnit();

  if (scan) {
    const scanBtn = el('button', { className: 'btn btn-secondary btn-block' }, 'Scan a barcode instead');
    scanBtn.style.marginBottom = '16px';
    on(scanBtn, 'click', () => {
      scan((data) => {
        // The unsupported-browser path reports an empty name; ignore it rather
        // than blanking a field the user may have already typed into.
        if (data.name) nameInput.value = data.name;
        if (data.category) catSelect.value = data.category;
        void checkName();
        nameInput.focus();
      });
    });
    container.appendChild(scanBtn);
  }

  // ── Name ────────────────────────────────────────────────────────
  const nameId = nextId('name');
  const nameErrId = `${nameId}-msg`;
  const nameGroup = el('div', { className: 'input-group' });
  nameGroup.appendChild(el('label', { for: nameId }, 'Name'));
  const nameInput = el('input', {
    className: 'input', type: 'text', id: nameId, placeholder: 'e.g. Milk',
    autocapitalize: 'sentences', enterkeyhint: 'done',
  }) as HTMLInputElement;
  if (initial?.name) nameInput.value = initial.name;
  nameGroup.appendChild(nameInput);

  // Inline validation, next to the field it is about and announced when it
  // appears — a message drawn but never spoken is not a message.
  const nameError = el('div', { className: 'field-error', id: nameErrId, role: 'alert' });
  nameError.hidden = true;
  nameGroup.appendChild(nameError);
  container.appendChild(nameGroup);

  // ── Staple toggle ───────────────────────────────────────────────
  // The one decision that changes what this item *means*, so it gets its own
  // block rather than living as a number in a row of numbers.
  let isStaple = stapleToggle?.checked ?? false;
  let stapleBtn: HTMLButtonElement | null = null;

  const amountBlock = el('div', { className: 'input-group' });

  if (stapleToggle) {
    stapleBtn = el('button', {
      className: 'staple-toggle',
      'aria-pressed': String(isStaple),
    }) as HTMLButtonElement;
    const mark = el('span', { className: 'staple-toggle-mark', 'aria-hidden': 'true' });
    const copy = el('span', { className: 'staple-toggle-copy' });
    copy.appendChild(el('span', { className: 'staple-toggle-label' }, 'I always keep this in stock'));
    copy.appendChild(el('span', { className: 'staple-toggle-hint' },
      'It goes on your shopping list whenever it’s not in the pantry.'));
    stapleBtn.appendChild(mark);
    stapleBtn.appendChild(copy);
    on(stapleBtn, 'click', () => {
      isStaple = !isStaple;
      stapleBtn!.setAttribute('aria-pressed', String(isStaple));
      amountBlock.hidden = !isStaple;
      if (isStaple && !qtyInput.value) qtyInput.value = '1';
    });
    container.appendChild(stapleBtn);
  }

  // ── Amount + unit ───────────────────────────────────────────────
  const row = el('div', { className: 'input-row' });

  const qtyId = nextId('qty');
  const qtyGroup = el('div', { className: 'input-group' });
  qtyGroup.appendChild(el('label', { for: qtyId }, quantityLabel ?? 'How many'));
  const qtyInput = el('input', {
    className: 'input', type: 'number', id: qtyId, placeholder: '1',
    min: '0', step: 'any', inputmode: 'decimal',
  }) as HTMLInputElement;
  if (initial?.quantity !== undefined) qtyInput.value = String(initial.quantity);
  else if (!stapleToggle) qtyInput.value = '1';
  qtyGroup.appendChild(qtyInput);

  const qtyErr = el('div', { className: 'field-error', role: 'alert' });
  qtyErr.hidden = true;
  qtyGroup.appendChild(qtyErr);
  row.appendChild(qtyGroup);

  const unitId = nextId('unit');
  const unitGroup = el('div', { className: 'input-group' });
  unitGroup.appendChild(el('label', { for: unitId }, 'Unit'));
  const unitSelect = el('select', { className: 'select', id: unitId }) as HTMLSelectElement;
  for (const u of UNITS) {
    const opt = el('option', { value: u }, u);
    if (u === defaultUnit) opt.selected = true;
    unitSelect.appendChild(opt);
  }
  unitGroup.appendChild(unitSelect);
  row.appendChild(unitGroup);

  amountBlock.appendChild(row);
  if (stapleToggle) amountBlock.hidden = !isStaple;
  container.appendChild(amountBlock);

  // ── Category ────────────────────────────────────────────────────
  const catId = nextId('cat');
  const catGroup = el('div', { className: 'input-group' });
  catGroup.appendChild(el('label', { for: catId }, 'Category'));
  const catSelect = el('select', { className: 'select', id: catId }) as HTMLSelectElement;
  for (const cat of CATEGORIES) {
    const opt = el('option', { value: cat }, CATEGORY_LABELS[cat]);
    if (cat === defaultCategory) opt.selected = true;
    catSelect.appendChild(opt);
  }
  catGroup.appendChild(catSelect);
  container.appendChild(catGroup);

  // ── Duplicate check ─────────────────────────────────────────────
  let blockingMatch: ExistingMatch | null = null;
  let checkTimer: number | undefined;

  function setNameMessage(text: string | null) {
    nameError.textContent = '';
    if (!text) {
      nameError.hidden = true;
      nameInput.removeAttribute('aria-invalid');
      nameInput.removeAttribute('aria-describedby');
      return;
    }
    nameError.appendChild(el('span', {}, text));
    if (blockingMatch) {
      const open = el('button', { className: 'field-error-action' }, 'Open it instead');
      on(open, 'click', () => blockingMatch?.open());
      nameError.appendChild(open);
    }
    nameError.hidden = false;
    nameInput.setAttribute('aria-invalid', 'true');
    nameInput.setAttribute('aria-describedby', nameErrId);
  }

  async function checkName() {
    if (!checkExisting) return;
    const name = nameInput.value.trim();
    blockingMatch = null;
    if (!name) { setNameMessage(null); return; }
    if (initial?.name && normalizeIngredientName(initial.name) === normalizeIngredientName(name)) {
      setNameMessage(null);
      return;
    }
    const match = await checkExisting(normalizeIngredientName(name));
    if (nameInput.value.trim() !== name) return; // typed on since
    blockingMatch = match;
    setNameMessage(match ? `You already have ${match.name}.` : null);
  }

  if (checkExisting) {
    on(nameInput, 'input', () => {
      window.clearTimeout(checkTimer);
      checkTimer = window.setTimeout(() => void checkName(), 250);
    });
    if (initial?.name === undefined) void checkName();
  }

  // ── Submit ──────────────────────────────────────────────────────
  const submitBtn = el('button', { className: 'btn btn-primary btn-block' }, submitLabel);
  let submitting = false;

  async function submit() {
    if (submitting) return;

    const name = nameInput.value.trim();
    if (!name) {
      blockingMatch = null;
      setNameMessage('Give the item a name so you can find it later.');
      nameInput.focus();
      return;
    }
    if (checkExisting) {
      window.clearTimeout(checkTimer);
      await checkName();
      if (blockingMatch) { nameInput.focus(); return; }
    }
    setNameMessage(null);

    // Only validate the amount when it is the amount of something: an item
    // that is not a staple has no standing quantity to be wrong about.
    let quantity = 1;
    if (!stapleToggle || isStaple) {
      const raw = qtyInput.value.trim();
      const parsed = raw === '' ? 1 : Number(raw);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        qtyErr.textContent = 'Enter a number above zero.';
        qtyErr.hidden = false;
        qtyInput.setAttribute('aria-invalid', 'true');
        qtyInput.focus();
        return;
      }
      quantity = parsed;
    }
    qtyErr.hidden = true;
    qtyInput.removeAttribute('aria-invalid');

    const category = catSelect.value as ItemCategory;
    const unit = unitSelect.value;

    submitting = true;
    submitBtn.disabled = true;
    try {
      await onSubmit({ name, quantity, unit, category, isStaple: !stapleToggle || isStaple });
      // Only after the write landed: a failed save used to change the
      // remembered category and unit anyway.
      saveLastChoices(category, unit);
    } finally {
      // If the caller kept the sheet open — because the write failed — the
      // form has to be usable again for the retry.
      submitting = false;
      submitBtn.disabled = false;
    }
  }

  on(submitBtn, 'click', () => void submit());

  // Return on the iOS keyboard should submit. The button sits under the
  // keyboard, so requiring a tap means dismissing the keyboard first.
  for (const field of [nameInput, qtyInput]) {
    field.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Enter') {
        e.preventDefault();
        void submit();
      }
    });
  }
  container.appendChild(submitBtn);

  setTimeout(() => nameInput.focus(), 100);
}
