import { el, on, svgIcon } from '../../utils/dom';
import {
  fetchRecipeFromUrl,
  getAllRecipes,
  deleteRecipe,
  refreshRecipeMatches,
  saveScannedRecipe,
  updateRecipe,
} from '../../services/recipe.service';
import { addMissingToGroceryList, matchIngredientsAgainstPantry } from '../../services/ingredient-matcher';
import type { Recipe, RecipeMealCategory } from '../../models/types';
import { RECIPE_MEAL_CATEGORIES, RECIPE_MEAL_CATEGORY_LABELS } from '../../models/types';
import { showToast } from '../shared/toast';
import { openModal } from '../shared/modal';
import { extractTextFromImage } from '../../services/ocr.service';

const MEAL_CATEGORY_COLORS: Record<RecipeMealCategory, string> = {
  breakfast: '#FF9500',
  lunch:     '#34C759',
  dinner:    '#007AFF',
  snack:     '#AF52DE',
};

const TRASH_ICON = '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>';
const PENCIL_ICON = '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>';

export function createRecipesView(): HTMLElement {
  const container = el('div', { className: 'recipes-view' });

  // ── Add section ──────────────────────────────────────────────
  const addSection = el('div', { className: 'recipe-add-section' });

  // Title input
  const titleInput = el('input', {
    className: 'input',
    type: 'text',
    placeholder: 'Recipe name (optional, auto-detected for URLs)',
  }) as HTMLInputElement;
  addSection.appendChild(titleInput);

  // Category picker
  const catRow = el('div', { className: 'recipe-cat-picker' });
  let selectedAddCategory: RecipeMealCategory | undefined;

  for (const cat of RECIPE_MEAL_CATEGORIES) {
    const pill = el('button', { className: 'filter-pill recipe-cat-pill' }, RECIPE_MEAL_CATEGORY_LABELS[cat]);
    pill.dataset.cat = cat;
    pill.style.setProperty('--cat-color', MEAL_CATEGORY_COLORS[cat]);
    on(pill, 'click', () => {
      if (selectedAddCategory === cat) {
        selectedAddCategory = undefined;
        pill.classList.remove('active');
      } else {
        selectedAddCategory = cat;
        catRow.querySelectorAll('.recipe-cat-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
      }
    });
    catRow.appendChild(pill);
  }
  addSection.appendChild(catRow);

  // URL input row
  const urlRow = el('div', { className: 'url-input-row' });
  const urlInput = el('input', { className: 'input', type: 'url', placeholder: 'Paste recipe URL…' }) as HTMLInputElement;
  const fetchBtn = el('button', { className: 'btn btn-primary btn-sm' }, 'Fetch');
  urlRow.appendChild(urlInput);
  urlRow.appendChild(fetchBtn);
  addSection.appendChild(urlRow);

  // Scan button
  const scanBtn = el('button', { className: 'btn btn-secondary btn-block' });
  scanBtn.textContent = 'Scan ingredients from screenshot';
  addSection.appendChild(scanBtn);

  container.appendChild(addSection);

  // Status
  const statusEl = el('div', { className: 'recipe-status' });
  container.appendChild(statusEl);

  // ── Filter pills ──────────────────────────────────────────────
  const filterRow = el('div', { className: 'filter-pills' });
  filterRow.style.marginTop = '16px';
  let activeFilter: 'all' | RecipeMealCategory = 'all';

  const allPill = el('button', { className: 'filter-pill active' }, 'All');
  on(allPill, 'click', () => setFilter('all'));
  filterRow.appendChild(allPill);

  for (const cat of RECIPE_MEAL_CATEGORIES) {
    const pill = el('button', { className: 'filter-pill' }, RECIPE_MEAL_CATEGORY_LABELS[cat]);
    on(pill, 'click', () => setFilter(cat));
    filterRow.appendChild(pill);
  }
  container.appendChild(filterRow);

  function setFilter(f: 'all' | RecipeMealCategory) {
    activeFilter = f;
    filterRow.querySelectorAll('.filter-pill').forEach((p, i) => {
      const val = i === 0 ? 'all' : RECIPE_MEAL_CATEGORIES[i - 1];
      p.classList.toggle('active', val === f);
    });
    renderList();
  }

  // ── Recipe list ───────────────────────────────────────────────
  const listContainer = el('div');
  listContainer.style.marginTop = '12px';
  container.appendChild(listContainer);

  let recipes: Recipe[] = [];

  // ── Fetch handler ─────────────────────────────────────────────
  on(fetchBtn, 'click', async () => {
    const url = urlInput.value.trim();
    if (!url) { urlInput.focus(); return; }

    fetchBtn.textContent = 'Loading…';
    (fetchBtn as HTMLButtonElement).disabled = true;
    statusEl.textContent = 'Fetching recipe…';
    statusEl.style.color = 'var(--color-text-secondary)';

    try {
      await fetchRecipeFromUrl(url, titleInput.value || undefined, selectedAddCategory);
      urlInput.value = '';
      titleInput.value = '';
      selectedAddCategory = undefined;
      catRow.querySelectorAll('.recipe-cat-pill').forEach(p => p.classList.remove('active'));
      statusEl.textContent = '';
      showToast('Recipe added!', 'success');
      await loadData();
    } catch (err) {
      statusEl.textContent = `Error: ${(err as Error).message}`;
      statusEl.style.color = 'var(--color-danger)';
    } finally {
      fetchBtn.textContent = 'Fetch';
      (fetchBtn as HTMLButtonElement).disabled = false;
    }
  });

  // ── Scan handler ──────────────────────────────────────────────
  on(scanBtn, 'click', () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      await handleImageScan(file);
    });
    fileInput.click();
  });

  async function handleImageScan(file: File) {
    statusEl.textContent = 'Scanning image…';
    statusEl.style.color = 'var(--color-text-secondary)';
    (scanBtn as HTMLButtonElement).disabled = true;

    try {
      const lines = await extractTextFromImage(file);
      if (lines.length === 0) {
        statusEl.textContent = 'No text found. Try a clearer screenshot.';
        statusEl.style.color = 'var(--color-danger)';
        return;
      }
      statusEl.textContent = '';

      openModal('Review Scanned Ingredients', (body, close) => {
        const instructions = el('p', { className: 'item-row-detail' });
        instructions.textContent = `Found ${lines.length} lines. Uncheck any that aren't ingredients, then save.`;
        instructions.style.marginBottom = '12px';
        body.appendChild(instructions);

        // Title input
        const titleGroup = el('div', { className: 'input-group' });
        titleGroup.appendChild(el('label', {}, 'Recipe Name'));
        const scanTitleInput = el('input', {
          className: 'input',
          type: 'text',
          placeholder: 'e.g. Chicken Tikka Masala',
        }) as HTMLInputElement;
        titleGroup.appendChild(scanTitleInput);
        body.appendChild(titleGroup);

        // Category picker
        const catGroup = el('div', { className: 'input-group' });
        catGroup.style.marginTop = '4px';
        catGroup.appendChild(el('label', {}, 'Category'));
        const scanCatRow = el('div', { className: 'recipe-cat-picker' });
        let scanCategory: RecipeMealCategory | undefined;
        for (const cat of RECIPE_MEAL_CATEGORIES) {
          const pill = el('button', { className: 'filter-pill recipe-cat-pill' }, RECIPE_MEAL_CATEGORY_LABELS[cat]);
          pill.style.setProperty('--cat-color', MEAL_CATEGORY_COLORS[cat]);
          on(pill, 'click', () => {
            if (scanCategory === cat) {
              scanCategory = undefined;
              pill.classList.remove('active');
            } else {
              scanCategory = cat;
              scanCatRow.querySelectorAll('.recipe-cat-pill').forEach(p => p.classList.remove('active'));
              pill.classList.add('active');
            }
          });
          scanCatRow.appendChild(pill);
        }
        catGroup.appendChild(scanCatRow);
        body.appendChild(catGroup);

        // Ingredient lines
        const lineItems: { checkbox: HTMLElement; input: HTMLInputElement }[] = [];
        const linesContainer = el('div', { className: 'item-list' });
        linesContainer.style.marginTop = '12px';
        linesContainer.style.maxHeight = '240px';
        linesContainer.style.overflowY = 'auto';

        for (const line of lines) {
          const row = el('div', { className: 'item-row' });
          row.style.padding = '8px 12px';
          row.style.gap = '8px';
          const cb = el('div', { className: 'checkbox checked' });
          let checked = true;
          on(cb, 'click', () => {
            checked = !checked;
            cb.className = `checkbox${checked ? ' checked' : ''}`;
          });
          row.appendChild(cb);
          const input = el('input', { className: 'input', type: 'text' }) as HTMLInputElement;
          input.value = line;
          input.style.fontSize = '14px';
          input.style.minHeight = '36px';
          input.style.padding = '6px 10px';
          row.appendChild(input);
          lineItems.push({ checkbox: cb, input });
          linesContainer.appendChild(row);
        }
        body.appendChild(linesContainer);

        const saveBtn = el('button', { className: 'btn btn-primary btn-block' });
        saveBtn.style.marginTop = '16px';
        saveBtn.textContent = 'Save & Check Pantry';
        on(saveBtn, 'click', async () => {
          const selectedLines = lineItems
            .filter(li => li.checkbox.classList.contains('checked'))
            .map(li => li.input.value.trim())
            .filter(v => v.length > 0);
          if (selectedLines.length === 0) { showToast('No ingredients selected', 'error'); return; }
          const title = scanTitleInput.value.trim() || 'Scanned Recipe';
          const ingredients = await matchIngredientsAgainstPantry(selectedLines);
          await saveScannedRecipe(title, ingredients, scanCategory);
          close();
          showToast(`${selectedLines.length} ingredients saved`, 'success');
          await loadData();
        });
        body.appendChild(saveBtn);
      });
    } catch (err) {
      statusEl.textContent = `Scan error: ${(err as Error).message}`;
      statusEl.style.color = 'var(--color-danger)';
    } finally {
      (scanBtn as HTMLButtonElement).disabled = false;
    }
  }

  // ── Render ────────────────────────────────────────────────────
  function renderList() {
    listContainer.innerHTML = '';

    const filtered = activeFilter === 'all'
      ? recipes
      : recipes.filter(r => r.mealCategory === activeFilter);

    const sorted = [...filtered].sort((a, b) => b.dateAdded - a.dateAdded);

    if (sorted.length === 0) {
      const empty = el('div', { className: 'empty-state' });
      empty.appendChild(el('p', { className: 'empty-state-text' },
        recipes.length === 0
          ? 'No saved recipes. Paste a URL or scan a screenshot to get started.'
          : `No ${RECIPE_MEAL_CATEGORY_LABELS[activeFilter as RecipeMealCategory]} recipes saved yet.`
      ));
      listContainer.appendChild(empty);
      return;
    }

    for (const recipe of sorted) {
      listContainer.appendChild(createRecipeCard(recipe));
    }
  }

  function createRecipeCard(recipe: Recipe): HTMLElement {
    const card = el('div', { className: 'card' });
    card.style.marginBottom = '12px';

    // Header
    const headerRow = el('div', { className: 'recipe-card-header' });

    const titleEl = el('div', { className: 'recipe-card-title-block' });

    // Category badge
    if (recipe.mealCategory) {
      const badge = el('span', { className: 'recipe-cat-badge' },
        RECIPE_MEAL_CATEGORY_LABELS[recipe.mealCategory]
      );
      badge.style.background = MEAL_CATEGORY_COLORS[recipe.mealCategory];
      titleEl.appendChild(badge);
    }

    const titleText = el('div', { className: 'item-row-name' }, recipe.title);
    titleText.style.fontSize = '17px';
    titleText.style.fontWeight = '600';
    titleEl.appendChild(titleText);

    if (recipe.url) {
      const urlDisplay = el('a', { href: recipe.url, className: 'item-row-detail' }, recipe.url);
      urlDisplay.setAttribute('target', '_blank');
      urlDisplay.setAttribute('rel', 'noopener');
      urlDisplay.style.display = 'block';
      urlDisplay.style.overflow = 'hidden';
      urlDisplay.style.textOverflow = 'ellipsis';
      urlDisplay.style.whiteSpace = 'nowrap';
      titleEl.appendChild(urlDisplay);
    }

    headerRow.appendChild(titleEl);

    // Action buttons (edit + delete)
    const cardActions = el('div', { className: 'recipe-card-actions' });

    const editBtn = el('button', { className: 'recipe-icon-btn' });
    editBtn.title = 'Edit';
    editBtn.appendChild(svgIcon(PENCIL_ICON));
    on(editBtn, 'click', () => openEditModal(recipe));
    cardActions.appendChild(editBtn);

    const deleteBtn = el('button', { className: 'recipe-icon-btn recipe-icon-btn-danger' });
    deleteBtn.title = 'Delete';
    deleteBtn.appendChild(svgIcon(TRASH_ICON));
    on(deleteBtn, 'click', () => {
      openModal('Delete Recipe', (body, close) => {
        body.appendChild(el('p', {}, `Remove "${recipe.title}" and all its ingredient data?`));
        const confirmBtn = el('button', { className: 'btn btn-danger btn-block' }, 'Delete Recipe');
        on(confirmBtn, 'click', async () => {
          await deleteRecipe(recipe.id);
          close();
          showToast('Recipe removed', 'success');
          await loadData();
        });
        body.appendChild(confirmBtn);
        const cancelBtn = el('button', { className: 'btn btn-secondary btn-block' }, 'Cancel');
        on(cancelBtn, 'click', close);
        body.appendChild(cancelBtn);
      });
    });
    cardActions.appendChild(deleteBtn);

    headerRow.appendChild(cardActions);
    card.appendChild(headerRow);

    // Ingredients summary
    const inPantry = recipe.ingredients.filter(i => i.inPantry).length;
    const total = recipe.ingredients.length;
    const summaryText = el('div', { className: 'item-row-detail' }, `${inPantry}/${total} ingredients in pantry`);
    summaryText.style.marginBottom = '8px';
    card.appendChild(summaryText);

    // Expandable ingredients
    let expanded = false;
    const toggleBtn = el('button', { className: 'btn btn-sm btn-secondary' }, 'Show ingredients');
    on(toggleBtn, 'click', () => {
      expanded = !expanded;
      toggleBtn.textContent = expanded ? 'Hide ingredients' : 'Show ingredients';
      ingredientDetail.style.display = expanded ? 'block' : 'none';
    });
    card.appendChild(toggleBtn);

    const ingredientDetail = el('div');
    ingredientDetail.style.display = 'none';
    ingredientDetail.style.marginTop = '8px';
    for (const ing of recipe.ingredients) {
      const row = el('div', { className: 'ingredient-status' });
      row.appendChild(el('span', { className: `ingredient-dot ${ing.inPantry ? 'in-pantry' : 'missing'}` }));
      const text = el('span');
      text.textContent = ing.raw;
      text.style.fontSize = '14px';
      if (ing.inPantry) text.style.color = 'var(--color-text-secondary)';
      row.appendChild(text);
      ingredientDetail.appendChild(row);
    }
    card.appendChild(ingredientDetail);

    // Action row
    const actions = el('div', { className: 'input-row' });
    actions.style.marginTop = '12px';

    const missingCount = recipe.ingredients.filter(i => !i.inPantry).length;
    const addMissingBtn = el('button', { className: 'btn btn-primary btn-sm' });
    addMissingBtn.textContent = missingCount > 0 ? `Add ${missingCount} missing to list` : 'All in pantry!';
    if (missingCount === 0) {
      (addMissingBtn as HTMLButtonElement).disabled = true;
      addMissingBtn.style.opacity = '0.5';
    }
    on(addMissingBtn, 'click', async () => {
      await addMissingToGroceryList(recipe.ingredients, recipe.id);
      showToast(`${missingCount} items added to grocery list`, 'success');
    });
    actions.appendChild(addMissingBtn);

    const refreshBtn = el('button', { className: 'btn btn-secondary btn-sm' }, 'Re-check');
    on(refreshBtn, 'click', async () => {
      await refreshRecipeMatches(recipe);
      showToast('Matches refreshed', 'success');
      await loadData();
    });
    actions.appendChild(refreshBtn);

    card.appendChild(actions);
    return card;
  }

  function openEditModal(recipe: Recipe) {
    openModal('Edit Recipe', (body, close) => {
      // Title
      const titleGroup = el('div', { className: 'input-group' });
      titleGroup.appendChild(el('label', {}, 'Recipe Name'));
      const editTitleInput = el('input', {
        className: 'input',
        type: 'text',
        placeholder: 'Recipe name',
      }) as HTMLInputElement;
      editTitleInput.value = recipe.title;
      titleGroup.appendChild(editTitleInput);
      body.appendChild(titleGroup);

      // Category
      const catGroup = el('div', { className: 'input-group' });
      catGroup.style.marginTop = '4px';
      catGroup.appendChild(el('label', {}, 'Category'));
      const editCatRow = el('div', { className: 'recipe-cat-picker' });
      let editCategory: RecipeMealCategory | undefined = recipe.mealCategory;

      for (const cat of RECIPE_MEAL_CATEGORIES) {
        const pill = el('button', { className: `filter-pill recipe-cat-pill${editCategory === cat ? ' active' : ''}` },
          RECIPE_MEAL_CATEGORY_LABELS[cat]
        );
        pill.style.setProperty('--cat-color', MEAL_CATEGORY_COLORS[cat]);
        on(pill, 'click', () => {
          if (editCategory === cat) {
            editCategory = undefined;
            pill.classList.remove('active');
          } else {
            editCategory = cat;
            editCatRow.querySelectorAll('.recipe-cat-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
          }
        });
        editCatRow.appendChild(pill);
      }
      catGroup.appendChild(editCatRow);
      body.appendChild(catGroup);

      const saveBtn = el('button', { className: 'btn btn-primary btn-block' }, 'Save');
      saveBtn.style.marginTop = '8px';
      on(saveBtn, 'click', async () => {
        const newTitle = editTitleInput.value.trim();
        if (!newTitle) { showToast('Title cannot be empty', 'error'); return; }
        await updateRecipe(recipe.id, {
          title: newTitle,
          mealCategory: editCategory ?? null,
        });
        close();
        await loadData();
      });
      body.appendChild(saveBtn);
    });
  }

  async function loadData() {
    recipes = await getAllRecipes();
    renderList();
  }

  loadData();
  return container;
}
