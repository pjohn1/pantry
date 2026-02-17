import { el, on } from '../../utils/dom';
import { fetchRecipeFromUrl, getAllRecipes, deleteRecipe, refreshRecipeMatches, saveScannedRecipe } from '../../services/recipe.service';
import { addMissingToGroceryList, matchIngredientsAgainstPantry } from '../../services/ingredient-matcher';
import type { Recipe } from '../../models/types';
import { showToast } from '../shared/toast';
import { openModal } from '../shared/modal';
import { extractTextFromImage } from '../../services/ocr.service';

export function createRecipesView(): HTMLElement {
  const container = el('div', { className: 'recipes-view' });

  // URL input row
  const urlRow = el('div', { className: 'url-input-row' });
  const urlInput = el('input', { className: 'input', type: 'url', placeholder: 'Paste recipe URL...' });
  const fetchBtn = el('button', { className: 'btn btn-primary btn-sm' }, 'Fetch');
  urlRow.appendChild(urlInput);
  urlRow.appendChild(fetchBtn);
  container.appendChild(urlRow);

  // Scan button row
  const scanRow = el('div', { className: 'input-row' });
  scanRow.style.marginTop = '8px';

  const scanBtn = el('button', { className: 'btn btn-secondary btn-block' });
  scanBtn.textContent = 'Scan ingredients from screenshot';
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
  scanRow.appendChild(scanBtn);
  container.appendChild(scanRow);

  // Status/loading area
  const statusEl = el('div');
  statusEl.style.marginTop = '8px';
  statusEl.style.fontSize = '14px';
  statusEl.style.color = 'var(--color-text-secondary)';
  container.appendChild(statusEl);

  // Recipes list
  const listContainer = el('div');
  listContainer.style.marginTop = '16px';
  container.appendChild(listContainer);

  let recipes: Recipe[] = [];

  on(fetchBtn, 'click', async () => {
    const url = urlInput.value.trim();
    if (!url) {
      urlInput.focus();
      return;
    }

    fetchBtn.textContent = 'Loading...';
    (fetchBtn as HTMLButtonElement).disabled = true;
    statusEl.textContent = 'Fetching recipe...';
    statusEl.style.color = 'var(--color-text-secondary)';

    try {
      await fetchRecipeFromUrl(url);
      urlInput.value = '';
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

  async function handleImageScan(file: File) {
    statusEl.textContent = 'Loading OCR engine...';
    statusEl.style.color = 'var(--color-text-secondary)';
    (scanBtn as HTMLButtonElement).disabled = true;

    try {
      statusEl.textContent = 'Scanning image...';
      const lines = await extractTextFromImage(file);

      if (lines.length === 0) {
        statusEl.textContent = 'No text found in image. Try a clearer screenshot.';
        statusEl.style.color = 'var(--color-danger)';
        return;
      }

      statusEl.textContent = '';

      // Show review modal
      openModal('Review Scanned Ingredients', (body, close) => {
        const instructions = el('p', { className: 'item-row-detail' });
        instructions.textContent = `Found ${lines.length} lines. Uncheck any that aren't ingredients, then save.`;
        instructions.style.marginBottom = '12px';
        body.appendChild(instructions);

        // Title input
        const titleGroup = el('div', { className: 'input-group' });
        titleGroup.appendChild(el('label', {}, 'Recipe Name'));
        const titleInput = el('input', { className: 'input', type: 'text', placeholder: 'e.g. Chicken Tikka Masala' });
        titleGroup.appendChild(titleInput);
        body.appendChild(titleGroup);

        // Editable ingredient lines with checkboxes
        const lineItems: { checkbox: HTMLElement; input: HTMLInputElement }[] = [];
        const linesContainer = el('div', { className: 'item-list' });
        linesContainer.style.marginTop = '12px';
        linesContainer.style.maxHeight = '300px';
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

        // Save button
        const saveBtn = el('button', { className: 'btn btn-primary btn-block' });
        saveBtn.style.marginTop = '16px';
        saveBtn.textContent = 'Save & Check Pantry';
        on(saveBtn, 'click', async () => {
          const selectedLines = lineItems
            .filter(li => li.checkbox.classList.contains('checked'))
            .map(li => li.input.value.trim())
            .filter(v => v.length > 0);

          if (selectedLines.length === 0) {
            showToast('No ingredients selected', 'error');
            return;
          }

          const title = titleInput.value.trim() || 'Scanned Recipe';
          const ingredients = await matchIngredientsAgainstPantry(selectedLines);
          await saveScannedRecipe(title, ingredients);

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

  function renderList() {
    listContainer.innerHTML = '';

    if (recipes.length === 0) {
      const empty = el('div', { className: 'empty-state' });
      empty.appendChild(el('p', { className: 'empty-state-text' },
        'No saved recipes. Paste a URL or scan a screenshot to get started.'
      ));
      listContainer.appendChild(empty);
      return;
    }

    for (const recipe of recipes.sort((a, b) => b.dateAdded - a.dateAdded)) {
      listContainer.appendChild(createRecipeCard(recipe));
    }
  }

  function createRecipeCard(recipe: Recipe): HTMLElement {
    const card = el('div', { className: 'card' });
    card.style.marginBottom = '12px';

    // Header row
    const headerRow = el('div');
    headerRow.style.display = 'flex';
    headerRow.style.justifyContent = 'space-between';
    headerRow.style.alignItems = 'flex-start';
    headerRow.style.marginBottom = '12px';

    const titleEl = el('div');
    titleEl.style.flex = '1';
    titleEl.style.minWidth = '0';
    const title = el('div', { className: 'item-row-name' }, recipe.title);
    title.style.fontSize = '17px';
    title.style.fontWeight = '600';
    titleEl.appendChild(title);

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

    const deleteBtn = el('button', { className: 'btn btn-sm btn-danger' }, 'Del');
    deleteBtn.style.marginLeft = '8px';
    deleteBtn.style.flexShrink = '0';
    on(deleteBtn, 'click', async () => {
      await deleteRecipe(recipe.id);
      showToast('Recipe removed', 'info');
      await loadData();
    });
    headerRow.appendChild(deleteBtn);

    card.appendChild(headerRow);

    // Ingredients summary
    const inPantry = recipe.ingredients.filter(i => i.inPantry).length;
    const total = recipe.ingredients.length;
    const summaryText = el('div', { className: 'item-row-detail' },
      `${inPantry}/${total} ingredients in pantry`
    );
    summaryText.style.marginBottom = '8px';
    card.appendChild(summaryText);

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
      const dot = el('span', { className: `ingredient-dot ${ing.inPantry ? 'in-pantry' : 'missing'}` });
      row.appendChild(dot);
      const text = el('span');
      text.textContent = ing.raw;
      text.style.fontSize = '14px';
      if (ing.inPantry) {
        text.style.color = 'var(--color-text-secondary)';
      }
      row.appendChild(text);
      ingredientDetail.appendChild(row);
    }

    card.appendChild(ingredientDetail);

    // Action buttons
    const actions = el('div', { className: 'input-row' });
    actions.style.marginTop = '12px';

    const missingCount = recipe.ingredients.filter(i => !i.inPantry).length;
    const addMissingBtn = el('button', { className: 'btn btn-primary btn-sm' });
    addMissingBtn.textContent = missingCount > 0
      ? `Add ${missingCount} missing to list`
      : 'All in pantry!';
    if (missingCount === 0) {
      (addMissingBtn as HTMLButtonElement).disabled = true;
      addMissingBtn.style.opacity = '0.5';
    }
    on(addMissingBtn, 'click', async () => {
      await addMissingToGroceryList(recipe.ingredients, recipe.id);
      showToast(`${missingCount} items added to grocery list`, 'success');
    });
    actions.appendChild(addMissingBtn);

    const refreshMatchBtn = el('button', { className: 'btn btn-secondary btn-sm' }, 'Re-check');
    on(refreshMatchBtn, 'click', async () => {
      await refreshRecipeMatches(recipe);
      showToast('Matches refreshed', 'success');
      await loadData();
    });
    actions.appendChild(refreshMatchBtn);

    card.appendChild(actions);

    return card;
  }

  async function loadData() {
    recipes = await getAllRecipes();
    renderList();
  }

  loadData();

  return container;
}
