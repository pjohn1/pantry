import { el, on } from '../../utils/dom';
import { fetchRecipeFromUrl, getAllRecipes, deleteRecipe, refreshRecipeMatches } from '../../services/recipe.service';
import { addMissingToGroceryList } from '../../services/ingredient-matcher';
import type { Recipe } from '../../models/types';
import { showToast } from '../shared/toast';

export function createRecipesView(): HTMLElement {
  const container = el('div', { className: 'recipes-view' });

  // URL input row
  const urlRow = el('div', { className: 'url-input-row' });
  const urlInput = el('input', { className: 'input', type: 'url', placeholder: 'Paste recipe URL...' });
  const fetchBtn = el('button', { className: 'btn btn-primary btn-sm' }, 'Fetch');
  urlRow.appendChild(urlInput);
  urlRow.appendChild(fetchBtn);
  container.appendChild(urlRow);

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

  function renderList() {
    listContainer.innerHTML = '';

    if (recipes.length === 0) {
      const empty = el('div', { className: 'empty-state' });
      empty.innerHTML = '<div class="empty-state-icon">&#x1F4D6;</div>';
      empty.appendChild(el('p', { className: 'empty-state-text' },
        'No saved recipes. Paste a recipe URL above to get started.'
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
    const title = el('div', { className: 'item-row-name' }, recipe.title);
    title.style.fontSize = '17px';
    title.style.fontWeight = '600';
    titleEl.appendChild(title);

    const urlDisplay = el('a', { href: recipe.url, className: 'item-row-detail' }, recipe.url);
    urlDisplay.setAttribute('target', '_blank');
    urlDisplay.setAttribute('rel', 'noopener');
    urlDisplay.style.display = 'block';
    urlDisplay.style.maxWidth = '200px';
    urlDisplay.style.overflow = 'hidden';
    urlDisplay.style.textOverflow = 'ellipsis';
    urlDisplay.style.whiteSpace = 'nowrap';
    titleEl.appendChild(urlDisplay);

    headerRow.appendChild(titleEl);

    const deleteBtn = el('button', { className: 'btn btn-sm btn-danger' }, 'Del');
    on(deleteBtn, 'click', async () => {
      await deleteRecipe(recipe.id);
      showToast('Recipe removed', 'info');
      await loadData();
    });
    headerRow.appendChild(deleteBtn);

    card.appendChild(headerRow);

    // Ingredients list
    const inPantry = recipe.ingredients.filter(i => i.inPantry).length;
    const total = recipe.ingredients.length;
    const summaryText = el('div', { className: 'item-row-detail' },
      `${inPantry}/${total} ingredients in pantry`
    );
    summaryText.style.marginBottom = '8px';
    card.appendChild(summaryText);

    const ingredientsList = el('div');
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
    card.appendChild(ingredientsList);

    // Action buttons
    const actions = el('div', { className: 'input-row' });
    actions.style.marginTop = '12px';

    const addMissingBtn = el('button', { className: 'btn btn-primary btn-sm' });
    const missingCount = recipe.ingredients.filter(i => !i.inPantry).length;
    addMissingBtn.textContent = `Add ${missingCount} missing to grocery list`;
    if (missingCount === 0) {
      (addMissingBtn as HTMLButtonElement).disabled = true;
      addMissingBtn.style.opacity = '0.5';
      addMissingBtn.textContent = 'All ingredients in pantry!';
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
