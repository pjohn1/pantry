import { el, on } from '../../utils/dom';
import { findRecipesByPantry, saveSuggestedRecipe } from '../../services/cook.service';
import type { MealType, SuggestedRecipe } from '../../models/types';
import { showToast } from '../shared/toast';

const MEAL_TYPES: { id: MealType; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'dinner', label: 'Dinner' },
];

export function createCookView(): HTMLElement {
  const container = el('div', { className: 'cook-view' });

  // Summary bar
  const summary = el('div', { className: 'summary-bar' });
  summary.textContent = 'Find recipes based on your pantry';
  container.appendChild(summary);

  // Meal type filter pills
  const pills = el('div', { className: 'filter-pills' });
  let activeMealType: MealType = 'all';

  for (const mt of MEAL_TYPES) {
    const pill = el('button', { className: `filter-pill${mt.id === 'all' ? ' active' : ''}` }, mt.label);
    on(pill, 'click', () => {
      activeMealType = mt.id;
      renderPills();
    });
    pills.appendChild(pill);
  }
  container.appendChild(pills);

  // Find button
  const findBtn = el('button', { className: 'btn btn-primary btn-block' }, 'Find Recipes');
  findBtn.style.marginTop = '8px';
  container.appendChild(findBtn);

  // Status area
  const statusEl = el('div');
  statusEl.style.marginTop = '8px';
  statusEl.style.fontSize = '14px';
  statusEl.style.color = 'var(--color-text-secondary)';
  statusEl.style.textAlign = 'center';
  container.appendChild(statusEl);

  // Results list
  const listContainer = el('div');
  listContainer.style.marginTop = '16px';
  container.appendChild(listContainer);

  const savedIds = new Set<string>();

  function renderPills() {
    const buttons = pills.querySelectorAll('.filter-pill');
    buttons.forEach((btn, i) => {
      btn.className = `filter-pill${MEAL_TYPES[i].id === activeMealType ? ' active' : ''}`;
    });
  }

  on(findBtn, 'click', async () => {
    findBtn.textContent = 'Searching...';
    (findBtn as HTMLButtonElement).disabled = true;
    statusEl.textContent = 'Searching TheMealDB...';
    listContainer.innerHTML = '';

    try {
      const results = await findRecipesByPantry(activeMealType);
      statusEl.textContent = '';

      if (results.length === 0) {
        const empty = el('div', { className: 'empty-state' });
        empty.appendChild(el('p', { className: 'empty-state-text' },
          'No matching recipes found. Try a different meal type or add more items to your pantry.'
        ));
        listContainer.appendChild(empty);
      } else {
        summary.textContent = `${results.length} recipe${results.length !== 1 ? 's' : ''} found`;
        for (const recipe of results) {
          listContainer.appendChild(createRecipeCard(recipe));
        }
      }
    } catch (err) {
      statusEl.textContent = `Error: ${(err as Error).message}`;
      statusEl.style.color = 'var(--color-danger)';
    } finally {
      findBtn.textContent = 'Find Recipes';
      (findBtn as HTMLButtonElement).disabled = false;
    }
  });

  function createRecipeCard(recipe: SuggestedRecipe): HTMLElement {
    const card = el('div', { className: 'card' });
    card.style.marginBottom = '12px';

    // Image + info layout
    const topRow = el('div');
    topRow.style.display = 'flex';
    topRow.style.gap = '12px';
    topRow.style.marginBottom = '12px';

    if (recipe.image) {
      const img = el('img', { src: `${recipe.image}/preview` });
      img.style.width = '80px';
      img.style.height = '80px';
      img.style.borderRadius = '8px';
      img.style.objectFit = 'cover';
      img.style.flexShrink = '0';
      topRow.appendChild(img);
    }

    const info = el('div');
    info.style.flex = '1';
    info.style.minWidth = '0';

    const title = el('div', { className: 'item-row-name' }, recipe.title);
    title.style.fontSize = '17px';
    title.style.fontWeight = '600';
    info.appendChild(title);

    const categoryLabel = el('div', { className: 'item-row-detail' }, recipe.category);
    info.appendChild(categoryLabel);

    const matchLabel = el('div', { className: 'item-row-detail' });
    matchLabel.textContent = `${recipe.matchCount}/${recipe.totalIngredients} ingredients in pantry`;
    matchLabel.style.marginTop = '4px';
    matchLabel.style.fontWeight = '500';
    matchLabel.style.color = recipe.matchCount >= recipe.totalIngredients / 2
      ? 'var(--color-success)' : 'var(--color-text-secondary)';
    info.appendChild(matchLabel);

    topRow.appendChild(info);
    card.appendChild(topRow);

    // Expandable ingredient list
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

    for (const name of recipe.matchedNames) {
      const row = el('div', { className: 'ingredient-status' });
      row.appendChild(el('span', { className: 'ingredient-dot in-pantry' }));
      const text = el('span');
      text.textContent = name;
      text.style.fontSize = '14px';
      text.style.color = 'var(--color-text-secondary)';
      row.appendChild(text);
      ingredientDetail.appendChild(row);
    }
    for (const name of recipe.missingNames) {
      const row = el('div', { className: 'ingredient-status' });
      row.appendChild(el('span', { className: 'ingredient-dot missing' }));
      const text = el('span');
      text.textContent = name;
      text.style.fontSize = '14px';
      row.appendChild(text);
      ingredientDetail.appendChild(row);
    }

    card.appendChild(ingredientDetail);

    // Save button
    const actions = el('div', { className: 'input-row' });
    actions.style.marginTop = '12px';

    const saveBtn = el('button', { className: 'btn btn-primary btn-sm' }, 'Save to Recipes');
    if (savedIds.has(recipe.mealDbId)) {
      saveBtn.textContent = 'Saved';
      (saveBtn as HTMLButtonElement).disabled = true;
      saveBtn.style.opacity = '0.5';
    }
    on(saveBtn, 'click', async () => {
      (saveBtn as HTMLButtonElement).disabled = true;
      saveBtn.textContent = 'Saving...';
      try {
        await saveSuggestedRecipe(recipe);
        savedIds.add(recipe.mealDbId);
        saveBtn.textContent = 'Saved';
        saveBtn.style.opacity = '0.5';
        showToast('Recipe saved!', 'success');
      } catch (err) {
        saveBtn.textContent = 'Save to Recipes';
        (saveBtn as HTMLButtonElement).disabled = false;
        showToast(`Error: ${(err as Error).message}`, 'error');
      }
    });
    actions.appendChild(saveBtn);

    card.appendChild(actions);

    return card;
  }

  return container;
}
