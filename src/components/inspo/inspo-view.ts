import { el, on, svgIcon } from '../../utils/dom';
import {
  getAllInspoItems,
  saveInspoUrl,
  saveInspoImage,
  deleteInspoItem,
  restoreInspoItem,
  updateInspoItem,
  saveInspoRecipe,
  ensureCovers,
} from '../../services/inspo.service';
import { getAllPantryItems } from '../../services/pantry.service';
import { buildRecipeHandoff, parseRecipeFile } from '../../services/claude-recipe.service';
import { describeLink } from '../../services/cover.service';
import type { InspoItem } from '../../models/types';
import { openModal } from '../shared/modal';
import { showToast } from '../shared/toast';
import { setDock } from '../shared/dock';
import { getViewState, patchViewState, keepPlace } from '../../utils/view-state';
import { subscribe } from '../../utils/events';
import { coverFromFile } from '../../utils/image';

const ROUTE = 'inspo';

const ICON_PLUS = '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>';
const ICON_TRASH =
  '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>';
const ICON_PENCIL =
  '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>';

/** Which row control had focus, so a re-render can hand it back. */
interface FocusMark {
  id: string;
  control: string;
}

function savedOn(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/**
 * The two lines of a row: what it is, and where it came from.
 *
 * Resolved together rather than independently, because an untitled item has
 * only the link to name itself with — and computing each line on its own put
 * "TikTok · @nigella" on both of them.
 */
function rowText(item: InspoItem): { name: string; sub: string } {
  const title = item.title.trim();

  if (item.platform === 'recipe') {
    // A recipe names itself, so the second line spends itself on the two
    // numbers you decide by: how long it takes and how many it feeds.
    const facts: string[] = [];
    if (item.recipe?.totalMinutes) facts.push(`${item.recipe.totalMinutes} min`);
    if (item.recipe?.servings) facts.push(`serves ${item.recipe.servings}`);
    return {
      name: title || 'Recipe',
      sub: facts.length ? `Recipe · ${facts.join(' · ')}` : `Recipe · saved ${savedOn(item.dateAdded)}`,
    };
  }

  if (item.platform === 'image') {
    return title
      ? { name: title, sub: `Screenshot · ${savedOn(item.dateAdded)}` }
      : { name: 'Screenshot', sub: `Saved ${savedOn(item.dateAdded)}` };
  }

  const { sourceLabel, handle } = describeLink(item.url, title);
  if (title) return { name: title, sub: handle ? `${sourceLabel} · ${handle}` : sourceLabel };
  // Untitled: the name takes the most specific thing the link carries and the
  // line beneath takes whatever that left over.
  if (handle) return { name: handle, sub: sourceLabel };
  return { name: sourceLabel, sub: `Saved ${savedOn(item.dateAdded)}` };
}

function displayName(item: InspoItem): string {
  return rowText(item).name;
}

/**
 * The cover tile: the fetched picture when there is one, otherwise a monogram
 * drawn from the link itself.
 *
 * The placeholder is deliberately plain stock and soft ink. It used to be a
 * full-bleed tile painted in the Instagram brand gradient, or solid black,
 * with an uppercase wordmark on it — and because Instagram's public thumbnail
 * endpoint has not existed since 2020, that was what almost every card showed.
 * A brand fill is not this app's colour to spend, and a column of quiet cream
 * tiles each carrying a different letter reads as a collection rather than as
 * a wall of failed loads.
 */
function buildCover(item: InspoItem): HTMLElement {
  const tile = el('span', { className: 'kb-cover' });
  tile.dataset.cover = '';
  paintCover(tile, item);
  return tile;
}

function paintCover(tile: HTMLElement, item: InspoItem): void {
  tile.innerHTML = '';
  if (item.thumbnailUrl) {
    tile.classList.remove('kb-cover--mono');
    const img = el('img', { className: 'kb-cover-img', src: item.thumbnailUrl, alt: '' });
    img.setAttribute('loading', 'lazy');
    img.setAttribute('decoding', 'async');
    tile.appendChild(img);
    return;
  }
  tile.classList.add('kb-cover--mono');
  // Screenshots and recipes have no link to take a letter from, so the title
  // has to supply it. Keyed on the link rather than the platform so a fourth
  // kind of linkless item needs no change here.
  const mono = item.url
    ? describeLink(item.url, item.title).monogram
    : describeLink('', item.title).monogram;
  tile.appendChild(el('span', { className: 'kb-cover-mono', 'aria-hidden': 'true' }, mono));
}

export function createInspoView(): HTMLElement {
  const container = el('div', { className: 'kb-list-view inspo-view' });
  const saved = getViewState(ROUTE);

  container.appendChild(el('h1', { className: 'visually-hidden' }, 'Saved ideas'));

  // ── Toolbar ────────────────────────────────────────────────────
  // Search replaced four meal-category pills. A dozen saved links did not need
  // a taxonomy, and it was one asked for at save time and maintained by nobody.
  const toolbar = el('div', { className: 'kb-toolbar' });
  const searchInput = el('input', {
    className: 'kb-search',
    type: 'search',
    placeholder: 'Search what you’ve saved',
    'aria-label': 'Search what you’ve saved',
    autocapitalize: 'none',
    autocorrect: 'off',
    spellcheck: 'false',
    enterkeyhint: 'search',
  }) as HTMLInputElement;
  searchInput.value = saved.query;
  toolbar.appendChild(searchInput);
  container.appendChild(toolbar);

  const listEl = el('div', { className: 'kb-list', role: 'list' });
  container.appendChild(listEl);

  const addBtn = el('button', {
    className: 'kb-dock-btn kb-dock-btn--primary',
    'aria-label': 'Save an idea',
  });
  addBtn.appendChild(svgIcon(ICON_PLUS, 22));
  on(addBtn, 'click', () => openAddSheet());
  setDock(addBtn);

  // ── State ──────────────────────────────────────────────────────
  let items: InspoItem[] = [];
  let loadFailed = false;
  let refocus: FocusMark | null = null;

  function markFocus(id: string, control: string) {
    refocus = { id, control };
  }

  function restoreFocus() {
    if (!refocus) return;
    const { id, control } = refocus;
    refocus = null;
    const exact = listEl.querySelector<HTMLElement>(
      `[data-item-id="${id}"] [data-control="${control}"]`,
    );
    if (exact) { exact.focus(); return; }
    listEl.querySelector<HTMLElement>(`[data-control="${control}"]`)?.focus();
  }

  function replaceItem(next: InspoItem) {
    const idx = items.findIndex(i => i.id === next.id);
    if (idx !== -1) items[idx] = next;
  }

  // ── Rows ───────────────────────────────────────────────────────

  function buildRow(item: InspoItem): HTMLElement {
    const row = el('div', { className: 'kb-row kb-row--saved', role: 'listitem' });
    row.dataset.itemId = item.id;
    const { name, sub } = rowText(item);

    // The whole title block is the primary verb, because on a saved idea that
    // verb is unambiguously "open it". Both maintenance verbs stay visible
    // one-tap targets beside it — the same two controls the old card had, laid
    // out on stock rather than floated over a photograph.
    const openBtn = el('button', {
      className: 'kb-row-open',
      'aria-label': item.url
        ? `Open ${name} on ${describeLink(item.url).sourceLabel}`
        : `Open ${name}`,
    });
    openBtn.dataset.control = 'open';
    openBtn.appendChild(buildCover(item));

    const main = el('span', { className: 'kb-row-main' });
    main.appendChild(el('span', { className: 'kb-row-name' }, name));
    main.appendChild(el('span', { className: 'kb-row-sub' }, sub));
    openBtn.appendChild(main);

    on(openBtn, 'click', () => {
      if (item.platform === 'recipe') openRecipeSheet(item);
      else if (item.platform === 'image') openImageSheet(item);
      else if (item.url) window.open(item.url, '_blank', 'noopener,noreferrer');
    });
    row.appendChild(openBtn);

    const editBtn = el('button', { className: 'kb-edit', 'aria-label': `Edit ${name}` });
    editBtn.dataset.control = 'edit';
    const pencil = svgIcon(ICON_PENCIL, 19);
    pencil.setAttribute('aria-hidden', 'true');
    editBtn.appendChild(pencil);
    on(editBtn, 'click', () => { markFocus(item.id, 'edit'); openEditSheet(item); });
    row.appendChild(editBtn);

    const deleteBtn = el('button', { className: 'kb-del', 'aria-label': `Delete ${name}` });
    deleteBtn.dataset.control = 'delete';
    const trash = svgIcon(ICON_TRASH, 19);
    trash.setAttribute('aria-hidden', 'true');
    deleteBtn.appendChild(trash);
    on(deleteBtn, 'click', async () => {
      markFocus(item.id, 'delete');
      const snapshot = { ...item };
      try {
        await deleteInspoItem(item.id);
      } catch {
        showToast(`Couldn’t delete ${name}.`, 'error');
        return;
      }
      items = items.filter(i => i.id !== item.id);
      render();
      showToast(`${name} deleted`, 'info', async () => {
        try {
          await restoreInspoItem(snapshot);
        } catch {
          showToast(`Couldn’t bring ${name} back.`, 'error');
          return;
        }
        items = [snapshot, ...items].sort((a, b) => b.dateAdded - a.dateAdded);
        render();
      });
    });
    row.appendChild(deleteBtn);

    return row;
  }

  // ── Render ─────────────────────────────────────────────────────

  let skeletonTimer: number | undefined;

  function scheduleSkeleton() {
    skeletonTimer = window.setTimeout(() => {
      listEl.innerHTML = '';
      for (let i = 0; i < 6; i++) {
        const r = el('div', { className: 'kb-skeleton kb-skeleton--saved' });
        r.appendChild(el('div', { className: 'kb-skeleton-line' }));
        listEl.appendChild(r);
      }
    }, 120);
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

  function visibleItems(): InspoItem[] {
    const query = searchInput.value.trim().toLowerCase();
    if (!query) return items;
    return items.filter(item => {
      const { sourceLabel, handle } = describeLink(item.url, item.title);
      const fields = [item.title, sourceLabel, handle, item.url];
      // A recipe is looked for by what goes in it — you have salmon, you want
      // the salmon one — so its ingredients are part of its text.
      if (item.recipe) {
        fields.push(item.recipe.summary);
        for (const ing of item.recipe.ingredients) fields.push(ing.name);
      }
      return fields.some(field => field?.toLowerCase().includes(query));
    });
  }

  function render() {
    listEl.innerHTML = '';

    if (loadFailed) {
      const box = notice(
        'Couldn’t open what you’ve saved on this device.',
        'Try again',
        () => { scheduleSkeleton(); void loadData(); },
      );
      box.setAttribute('role', 'alert');
      listEl.appendChild(box);
      return;
    }

    if (items.length === 0) {
      listEl.appendChild(notice(
        'Nothing saved yet. Make a recipe with Claude out of what’s in your pantry, paste a TikTok, Instagram or YouTube link, or add a screenshot of something you want to cook.',
      ));
      return;
    }

    const list = visibleItems();
    if (list.length === 0) {
      listEl.appendChild(notice(`Nothing matches “${searchInput.value.trim()}”.`));
      return;
    }

    for (const item of list) listEl.appendChild(buildRow(item));
    restoreFocus();
  }

  // ── Sheets ─────────────────────────────────────────────────────

  /**
   * Title and cover. There is nothing else left to edit: the meal category it
   * used to ask for is gone, and the link itself is not something you correct
   * after the fact — you save the right one.
   */
  function openEditSheet(item: InspoItem) {
    openModal('Edit saved idea', (body, close) => {
      const titleGroup = el('div', { className: 'input-group' });
      titleGroup.appendChild(el('label', { for: 'inspo-edit-title' }, 'Title'));
      const titleInput = el('input', {
        className: 'input', type: 'text', id: 'inspo-edit-title',
        placeholder: 'What is it?',
      }) as HTMLInputElement;
      titleInput.value = item.title;
      titleGroup.appendChild(titleInput);
      body.appendChild(titleGroup);

      // The escape hatch. Most links will never hand a browser their picture,
      // so the one guaranteed way to get a real cover is to let the user set
      // one — and once set, it lives on the device and works offline forever.
      let cover = item.thumbnailUrl;
      const coverGroup = el('div', { className: 'input-group' });
      coverGroup.appendChild(el('label', {}, 'Cover'));

      const coverRow = el('div', { className: 'inspo-cover-edit' });
      const preview = el('span', { className: 'kb-cover' });
      const repaint = () => {
        paintCover(preview, { ...item, thumbnailUrl: cover });
        drawActions();
      };
      coverRow.appendChild(preview);

      const coverActions = el('div', { className: 'inspo-cover-actions' });
      const fileLabel = el('label', { className: 'btn btn-secondary' }, 'Choose a photo');
      const fileInput = el('input', { type: 'file', accept: 'image/*' }) as HTMLInputElement;
      fileInput.hidden = true;
      fileLabel.appendChild(fileInput);

      // "Use the link's" appears only when there is a cover to fall back from.
      // Standing there greyed out on an item that has none was one more control
      // than the row needed, and two buttons plus the tile overflowed 390px.
      const clearBtn = el('button', { className: 'btn btn-secondary' }, 'Use the link’s');
      on(clearBtn, 'click', () => { cover = ''; repaint(); });

      function drawActions() {
        coverActions.innerHTML = '';
        coverActions.appendChild(fileLabel);
        if (cover && item.platform !== 'image') coverActions.appendChild(clearBtn);
      }
      coverRow.appendChild(coverActions);
      coverGroup.appendChild(coverRow);
      body.appendChild(coverGroup);
      repaint();

      on(fileInput, 'change', async () => {
        const file = fileInput.files?.[0];
        if (!file) return;
        try {
          cover = await coverFromFile(file);
          repaint();
        } catch {
          showToast('Couldn’t load that image.', 'error');
        }
      });

      const saveBtn = el('button', { className: 'btn btn-primary btn-block' }, 'Save');
      on(saveBtn, 'click', async () => {
        saveBtn.disabled = true;
        const title = titleInput.value.trim();
        try {
          // Clearing the cover clears the attempt stamp with it, so the next
          // background pass is allowed to look again rather than waiting a day.
          await updateInspoItem(item.id, {
            title,
            thumbnailUrl: cover,
            ...(cover ? {} : { coverTriedAt: 0 }),
          });
        } catch {
          saveBtn.disabled = false;
          showToast('Couldn’t save that.', 'error');
          return;
        }
        replaceItem({ ...item, title, thumbnailUrl: cover, ...(cover ? {} : { coverTriedAt: 0 }) });
        close();
        showToast('Saved', 'success');
        render();
        if (!cover) void backgroundCovers();
      });
      body.appendChild(saveBtn);

      setTimeout(() => titleInput.focus(), 100);
    });
  }

  function openImageSheet(item: InspoItem) {
    openModal(displayName(item), (body) => {
      const box = el('div', { className: 'inspo-image-modal' });
      box.appendChild(el('img', {
        src: item.thumbnailUrl, alt: item.title || 'Saved image',
      }));
      body.appendChild(box);
    });
  }

  /**
   * The reader.
   *
   * A recipe saved from Claude has nowhere else to be read — there is no link
   * to leave for — so this sheet is the whole of it: what it is, what goes in,
   * and what to do, on one scroll.
   */
  function openRecipeSheet(item: InspoItem) {
    const recipe = item.recipe;
    if (!recipe) return;

    openModal(displayName(item), (body) => {
      const box = el('div', { className: 'inspo-recipe' });

      const facts: string[] = [];
      if (recipe.totalMinutes) facts.push(`${recipe.totalMinutes} min`);
      if (recipe.servings) facts.push(`Serves ${recipe.servings}`);
      if (facts.length) box.appendChild(el('p', { className: 'inspo-recipe-meta' }, facts.join(' · ')));

      if (recipe.summary) box.appendChild(el('p', { className: 'inspo-recipe-summary' }, recipe.summary));

      if (recipe.ingredients.length) {
        box.appendChild(el('h3', { className: 'inspo-recipe-head' }, 'What you need'));
        const ings = el('ul', { className: 'inspo-recipe-ings' });
        for (const ing of recipe.ingredients) {
          const amount = [ing.quantity, ing.unit].filter(Boolean).join(' ');
          const li = el('li', { className: 'inspo-recipe-ing' });
          li.appendChild(el('span', {}, amount ? `${amount} ${ing.name}` : ing.name));
          // Said in words, not colour. The one signal ink in this app means a
          // staple you have run out of, and a recipe wanting honey is not that.
          if (!ing.have) li.appendChild(el('span', { className: 'inspo-recipe-buy' }, 'to buy'));
          ings.appendChild(li);
        }
        box.appendChild(ings);
      }

      box.appendChild(el('h3', { className: 'inspo-recipe-head' }, 'How to make it'));
      const steps = el('ol', { className: 'inspo-recipe-steps' });
      for (const step of recipe.steps) steps.appendChild(el('li', {}, step));
      box.appendChild(steps);

      if (recipe.notes) box.appendChild(el('p', { className: 'inspo-recipe-notes' }, recipe.notes));

      body.appendChild(box);
    });
  }

  function openAddSheet() {
    openModal('Save an idea', (body, close) => {
      // ── Make a recipe with Claude ──────────────────────────────
      // The one path by which pantry contents leave this device, and they leave
      // as a link the user taps: the app makes no request, holds no key and has
      // no server behind it. Nothing is transmitted until send is pressed in
      // Claude, which is where the prompt is read before it goes.
      const claudeBtn = el('button', { className: 'btn btn-primary btn-block' },
        'Make a recipe with Claude');
      body.appendChild(claudeBtn);
      body.appendChild(el('div', { className: 'inspo-sheet-rule' }));

      // Read the pantry as the sheet opens rather than when the button is
      // tapped. A window.open that follows an await has left the user gesture
      // behind, and iOS blocks it — so the handler below has to be synchronous.
      let handoff: { prompt: string; url: string; stocked: number } | null = null;
      void getAllPantryItems()
        .then(pantry => {
          handoff = {
            ...buildRecipeHandoff(pantry),
            stocked: pantry.filter(item => !item.isOut).length,
          };
        })
        .catch(() => { handoff = null; });

      on(claudeBtn, 'click', () => {
        if (!handoff) {
          showToast('Still reading your pantry — try that again.', 'error');
          return;
        }
        // An empty pantry would send Claude a prompt with nothing in it, and
        // get back three recipes for a kitchen that isn't this one.
        if (handoff.stocked === 0) {
          showToast('Add something to your pantry first.', 'error');
          return;
        }
        // The clipboard is the safety net if the composer does not prefill.
        // Best effort and never awaited: the link is what has to work.
        void navigator.clipboard?.writeText(handoff.prompt).catch(() => {});
        window.open(handoff.url, '_blank', 'noopener,noreferrer');
        close();
        showToast('Opening Claude. The prompt is copied too, in case it doesn’t fill in.');
      });

      const titleGroup = el('div', { className: 'input-group' });
      titleGroup.appendChild(el('label', { for: 'inspo-add-title' }, 'Title'));
      const titleInput = el('input', {
        className: 'input', type: 'text', id: 'inspo-add-title',
        placeholder: 'e.g. Honey garlic salmon',
      }) as HTMLInputElement;
      titleGroup.appendChild(titleInput);
      body.appendChild(titleGroup);

      const tabs = el('div', { className: 'inspo-modal-tabs', role: 'tablist' });
      const linkTab = el('button', {
        className: 'inspo-modal-tab active', role: 'tab', 'aria-selected': 'true',
      }, 'Link');
      const imageTab = el('button', {
        className: 'inspo-modal-tab', role: 'tab', 'aria-selected': 'false',
      }, 'Screenshot');
      const recipeTab = el('button', {
        className: 'inspo-modal-tab', role: 'tab', 'aria-selected': 'false',
      }, 'Recipe');
      tabs.appendChild(linkTab);
      tabs.appendChild(imageTab);
      tabs.appendChild(recipeTab);
      body.appendChild(tabs);

      const linkPanel = el('div', { className: 'inspo-panel' });
      const urlGroup = el('div', { className: 'input-group' });
      // The tab directly above already says Link, and the placeholder says what
      // to paste. Kept for the field's accessible name, not printed twice.
      urlGroup.appendChild(el('label', { className: 'visually-hidden', for: 'inspo-add-url' }, 'Link'));
      const urlInput = el('input', {
        className: 'input', type: 'url', id: 'inspo-add-url', inputmode: 'url',
        autocapitalize: 'none', autocorrect: 'off', spellcheck: 'false',
        placeholder: 'Paste a TikTok, Instagram or YouTube link',
      }) as HTMLInputElement;
      urlGroup.appendChild(urlInput);
      const urlError = el('div', { className: 'field-error', role: 'alert' });
      urlError.hidden = true;
      urlGroup.appendChild(urlError);
      linkPanel.appendChild(urlGroup);
      const addUrlBtn = el('button', { className: 'btn btn-primary btn-block' }, 'Save link');
      linkPanel.appendChild(addUrlBtn);

      const imagePanel = el('div', { className: 'inspo-panel' });
      imagePanel.hidden = true;
      const fileLabel = el('label', { className: 'btn btn-secondary btn-block' }, 'Choose a photo or screenshot');
      const fileInput = el('input', { type: 'file', accept: 'image/*' }) as HTMLInputElement;
      fileInput.hidden = true;
      fileLabel.appendChild(fileInput);
      const previewEl = el('div', { className: 'inspo-preview' });
      const addImageBtn = el('button', { className: 'btn btn-primary btn-block' }, 'Save image');
      addImageBtn.hidden = true;
      imagePanel.appendChild(fileLabel);
      imagePanel.appendChild(previewEl);
      imagePanel.appendChild(addImageBtn);

      // The other half of the round trip: the file Claude wrote comes back
      // here. Two ways in, because on a phone they are genuinely different
      // journeys — a file saved to Files, or a code block copied in Claude.
      const recipePanel = el('div', { className: 'inspo-panel' });
      recipePanel.hidden = true;
      const recipeFileLabel = el('label', { className: 'btn btn-secondary btn-block' },
        'Choose a recipe file');
      const recipeFileInput = el('input', {
        type: 'file', accept: '.html,.json,text/html,application/json',
      }) as HTMLInputElement;
      recipeFileInput.hidden = true;
      recipeFileLabel.appendChild(recipeFileInput);
      recipePanel.appendChild(recipeFileLabel);

      const pasteGroup = el('div', { className: 'input-group' });
      pasteGroup.appendChild(el('label', { for: 'inspo-add-recipe' }, 'Or paste what Claude wrote'));
      const pasteInput = el('textarea', {
        className: 'input inspo-paste', id: 'inspo-add-recipe', rows: '4',
        placeholder: 'Paste the recipe file, or just the block of JSON inside it',
        autocapitalize: 'none', autocorrect: 'off', spellcheck: 'false',
      }) as HTMLTextAreaElement;
      pasteGroup.appendChild(pasteInput);
      recipePanel.appendChild(pasteGroup);
      const addRecipeBtn = el('button', { className: 'btn btn-primary btn-block' }, 'Import recipes');
      recipePanel.appendChild(addRecipeBtn);

      body.appendChild(linkPanel);
      body.appendChild(imagePanel);
      body.appendChild(recipePanel);

      type AddTab = 'link' | 'image' | 'recipe';
      function selectTab(which: AddTab) {
        for (const [tab, panel, name] of [
          [linkTab, linkPanel, 'link'],
          [imageTab, imagePanel, 'image'],
          [recipeTab, recipePanel, 'recipe'],
        ] as [HTMLElement, HTMLElement, AddTab][]) {
          const selected = name === which;
          tab.classList.toggle('active', selected);
          tab.setAttribute('aria-selected', String(selected));
          panel.hidden = !selected;
        }
        // A recipe brings its own title — several, in fact — so the shared
        // field above has nothing to say about one.
        titleGroup.hidden = which === 'recipe';
      }
      on(linkTab, 'click', () => selectTab('link'));
      on(imageTab, 'click', () => selectTab('image'));
      on(recipeTab, 'click', () => selectTab('recipe'));

      async function importRecipes(text: string, trigger: HTMLButtonElement | null) {
        if (trigger) { trigger.disabled = true; trigger.textContent = 'Importing…'; }
        // Held outside the try so that a write failing partway still shows what
        // did land. Several rows go in one at a time and there is no
        // transaction across them; the list on screen has to match the store
        // either way, or the next delete acts on a row that isn't there.
        const saved: InspoItem[] = [];
        try {
          const parsed = parseRecipeFile(text);
          for (const { title, recipe } of parsed) saved.push(await saveInspoRecipe(title, recipe));
          // Newest first, which is the order a reload would rebuild: each save
          // stamps a later dateAdded than the one before it.
          items = [...saved.reverse(), ...items];
          close();
          showToast(saved.length === 1 ? 'Saved 1 recipe' : `Saved ${saved.length} recipes`, 'success');
          render();
        } catch (err) {
          if (saved.length > 0) {
            items = [...saved.reverse(), ...items];
            render();
          }
          showToast((err as Error).message || 'Couldn’t read those recipes.', 'error');
          if (trigger) { trigger.disabled = false; trigger.textContent = 'Import recipes'; }
        }
      }

      on(recipeFileInput, 'change', async () => {
        const file = recipeFileInput.files?.[0];
        if (!file) return;
        // Cleared so that picking the same file twice fires again — the fix
        // this app already applies to the receipt input and to nothing else.
        recipeFileInput.value = '';
        try {
          await importRecipes(await file.text(), null);
        } catch {
          showToast('Couldn’t open that file.', 'error');
        }
      });

      on(addRecipeBtn, 'click', () => {
        const text = pasteInput.value.trim();
        if (!text) {
          showToast('Paste what Claude gave you first.', 'error');
          pasteInput.focus();
          return;
        }
        void importRecipes(text, addRecipeBtn);
      });

      let selectedDataUrl = '';
      on(fileInput, 'change', async () => {
        const file = fileInput.files?.[0];
        if (!file) return;
        try {
          selectedDataUrl = await coverFromFile(file);
          previewEl.innerHTML = '';
          const prevImg = el('img', { src: selectedDataUrl, alt: 'The image you chose' });
          prevImg.className = 'inspo-preview-img';
          previewEl.appendChild(prevImg);
          addImageBtn.hidden = false;
        } catch {
          showToast('Couldn’t load that image.', 'error');
        }
      });

      on(addUrlBtn, 'click', async () => {
        const url = urlInput.value.trim();
        if (!url) {
          urlError.textContent = 'Paste a link first, or switch to Screenshot.';
          urlError.hidden = false;
          urlInput.focus();
          return;
        }
        urlError.hidden = true;
        addUrlBtn.disabled = true;
        addUrlBtn.textContent = 'Saving…';
        try {
          const item = await saveInspoUrl(url, titleInput.value.trim() || undefined);
          items = [item, ...items];
          close();
          showToast('Saved', 'success');
          render();
          // The row is already on screen with its monogram; the picture, if
          // there is one to be had, arrives behind it.
          void backgroundCovers();
        } catch (err) {
          showToast((err as Error).message || 'Couldn’t save that link.', 'error');
          addUrlBtn.disabled = false;
          addUrlBtn.textContent = 'Save link';
        }
      });

      on(addImageBtn, 'click', async () => {
        if (!selectedDataUrl) return;
        addImageBtn.disabled = true;
        addImageBtn.textContent = 'Saving…';
        try {
          const item = await saveInspoImage(selectedDataUrl, titleInput.value.trim() || undefined);
          items = [item, ...items];
          close();
          showToast('Saved', 'success');
          render();
        } catch (err) {
          showToast((err as Error).message || 'Couldn’t save that image.', 'error');
          addImageBtn.disabled = false;
          addImageBtn.textContent = 'Save image';
        }
      });

      setTimeout(() => titleInput.focus(), 100);
    });
  }

  // ── Covers, arriving late ──────────────────────────────────────
  // One row's tile is swapped where it stands. Re-rendering the list to show a
  // picture would move the ground under a thumb that is already scrolling.
  let unsubscribe: (() => void) | null = null;
  unsubscribe = subscribe('inspo-cover', (data?: { id: string; thumbnailUrl: string }) => {
    if (!container.isConnected) {
      unsubscribe?.();
      unsubscribe = null;
      return;
    }
    if (!data) return;
    const item = items.find(i => i.id === data.id);
    if (!item) return;
    item.thumbnailUrl = data.thumbnailUrl;
    const tile = listEl.querySelector<HTMLElement>(
      `[data-item-id="${data.id}"] [data-cover]`,
    );
    if (tile) paintCover(tile, item);
  });

  function backgroundCovers() {
    return ensureCovers(items).catch(() => {});
  }

  // ── Load ───────────────────────────────────────────────────────

  async function loadData() {
    try {
      items = await getAllInspoItems();
      loadFailed = false;
    } catch {
      loadFailed = true;
      items = [];
    }
    window.clearTimeout(skeletonTimer);
    render();
    // After the rows exist, never before: a scroll position assigned to an
    // empty scroller is clamped to 0.
    keepPlace(container, ROUTE);
    void backgroundCovers();
  }

  let searchTimer: number | undefined;
  on(searchInput, 'input', () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
      patchViewState(ROUTE, { query: searchInput.value });
      render();
    }, 150);
  });

  scheduleSkeleton();
  void loadData();

  return container;
}
