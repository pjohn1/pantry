import { el, on, svgIcon } from '../../utils/dom';
import {
  getAllInspoItems,
  saveInspoUrl,
  saveInspoImage,
  deleteInspoItem,
  restoreInspoItem,
  updateInspoItem,
} from '../../services/inspo.service';
import type { InspoItem, InspoPlatform, RecipeMealCategory } from '../../models/types';
import { RECIPE_MEAL_CATEGORIES, RECIPE_MEAL_CATEGORY_LABELS } from '../../models/types';
import { openModal } from '../shared/modal';
import { showToast } from '../shared/toast';
import { setDock } from '../shared/dock';

const PLATFORM_COLORS: Record<InspoPlatform, string> = {
  tiktok: '#010101',
  instagram: 'linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
  image: '#3a3a3c',
  other: '#2c2c2e',
};

const PLATFORM_LABELS: Record<InspoPlatform, string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
  image: 'Image',
  other: 'Link',
};

const PLATFORM_ICONS: Record<InspoPlatform, string> = {
  tiktok: '<path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z"/>',
  instagram: '<rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
  other: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
};

const ICON_PLUS = '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>';
const TRASH_ICON = '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>';
const PENCIL_ICON = '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>';

/** Light values plus a dark counterpart: these badges carry white text. */
const MEAL_CATEGORY_COLORS: Record<RecipeMealCategory, string> = {
  breakfast: '#8a4b00',
  lunch:     '#1f6b32',
  dinner:    '#0a4fa8',
  snack:     '#6b2f8f',
};

function resizeImageToDataUrl(file: File, maxSize = 600): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = reject;
    img.src = objectUrl;
  });
}

export async function createInspoView(): Promise<HTMLElement> {
  const container = el('div', { className: 'inspo-view' });
  let allItems = await getAllInspoItems();
  let activeFilter: 'all' | RecipeMealCategory = 'all';

  container.appendChild(el('h1', { className: 'visually-hidden' }, 'Saved ideas'));

  // ── Filter pills ──────────────────────────────────────────────
  const filterRow = el('div', {
    className: 'filter-pills inspo-filters', role: 'group', 'aria-label': 'Filter by meal',
  });

  const allPill = el('button', { className: 'filter-pill active', 'aria-pressed': 'true' }, 'All');
  on(allPill, 'click', () => setFilter('all'));
  filterRow.appendChild(allPill);

  for (const cat of RECIPE_MEAL_CATEGORIES) {
    const pill = el('button', {
      className: 'filter-pill', 'aria-pressed': 'false',
    }, RECIPE_MEAL_CATEGORY_LABELS[cat]);
    on(pill, 'click', () => setFilter(cat));
    filterRow.appendChild(pill);
  }
  container.appendChild(filterRow);

  function setFilter(f: 'all' | RecipeMealCategory) {
    activeFilter = f;
    filterRow.querySelectorAll('.filter-pill').forEach((p, i) => {
      const val = i === 0 ? 'all' : RECIPE_MEAL_CATEGORIES[i - 1];
      const on_ = val === f;
      p.classList.toggle('active', on_);
      // Selection was carried by colour alone.
      p.setAttribute('aria-pressed', String(on_));
    });
    renderGrid();
  }

  // ── Grid ──────────────────────────────────────────────────────
  const grid = el('div', { className: 'inspo-grid', role: 'list' });
  container.appendChild(grid);

  function renderGrid() {
    grid.innerHTML = '';
    const visible = activeFilter === 'all'
      ? allItems
      : allItems.filter(i => i.mealCategory === activeFilter);

    if (visible.length === 0) {
      const empty = el('div', { className: 'inspo-empty' });
      const msg = allItems.length === 0
        ? 'Nothing saved yet. Paste a TikTok or Instagram link, or add a screenshot.'
        : `Nothing saved for ${RECIPE_MEAL_CATEGORY_LABELS[activeFilter as RecipeMealCategory].toLowerCase()} yet.`;
      empty.appendChild(el('p', { className: 'empty-state-text' }, msg));
      grid.appendChild(empty);
      return;
    }

    for (const item of visible) {
      grid.appendChild(createCard(item));
    }
  }

  function createCard(item: InspoItem): HTMLElement {
    const card = el('div', { className: 'inspo-card', role: 'listitem' });
    card.dataset.id = item.id;
    const label = item.title || PLATFORM_LABELS[item.platform];

    // ── Thumbnail ───────────────────────────────────────────────
    // A button, not a div: this is the card's primary action, and it used to be
    // unreachable by keyboard and unannounced by a screen reader.
    const thumb = el('button', {
      className: 'inspo-thumb',
      'aria-label': item.platform === 'image' ? `Open ${label}` : `Open ${label} on ${PLATFORM_LABELS[item.platform]}`,
    });

    if (item.thumbnailUrl) {
      const img = el('img', { src: item.thumbnailUrl, alt: '' });
      thumb.appendChild(img);
    } else {
      const placeholder = el('div', { className: 'inspo-placeholder' });
      placeholder.style.background = PLATFORM_COLORS[item.platform];
      const icon = svgIcon(PLATFORM_ICONS[item.platform]);
      icon.setAttribute('aria-hidden', 'true');
      placeholder.appendChild(icon);
      placeholder.appendChild(el('span', {}, PLATFORM_LABELS[item.platform]));
      thumb.appendChild(placeholder);
    }

    on(thumb, 'click', () => {
      if (item.platform === 'image') {
        openImageModal(item);
      } else if (item.url) {
        window.open(item.url, '_blank', 'noopener,noreferrer');
      }
    });

    // ── Overlay footer (inside thumb) ───────────────────────────
    const footer = el('div', { className: 'inspo-footer' });
    footer.appendChild(el('div', { className: 'inspo-footer-title' }, label));

    const meta = el('div', { className: 'inspo-footer-meta' });

    if (item.mealCategory) {
      const badge = el('span', { className: 'inspo-cat-badge' },
        RECIPE_MEAL_CATEGORY_LABELS[item.mealCategory]
      );
      badge.style.background = MEAL_CATEGORY_COLORS[item.mealCategory];
      meta.appendChild(badge);
    }

    meta.appendChild(el('div', { className: 'inspo-footer-spacer' }));

    const editBtn = el('button', {
      className: 'inspo-icon-btn', 'aria-label': `Edit ${label}`,
    });
    const pencil = svgIcon(PENCIL_ICON);
    pencil.setAttribute('aria-hidden', 'true');
    editBtn.appendChild(pencil);
    on(editBtn, 'click', (e) => { e.stopPropagation(); openEditModal(item); });
    meta.appendChild(editBtn);

    const deleteBtn = el('button', {
      className: 'inspo-icon-btn', 'aria-label': `Delete ${label}`,
    });
    const trash = svgIcon(TRASH_ICON);
    trash.setAttribute('aria-hidden', 'true');
    deleteBtn.appendChild(trash);
    on(deleteBtn, 'click', async (e) => {
      e.stopPropagation();
      // Delete-then-undo, like every other destructive action in the app. The
      // native confirm() here was the only blocking dialog left.
      const saved = { ...item };
      try {
        await deleteInspoItem(item.id);
      } catch {
        showToast(`Couldn’t delete ${label}.`, 'error');
        return;
      }
      allItems = allItems.filter(i => i.id !== item.id);
      renderGrid();
      showToast(`${label} deleted`, 'info', async () => {
        try {
          await restoreInspoItem(saved);
        } catch {
          showToast(`Couldn’t bring ${label} back.`, 'error');
          return;
        }
        allItems = [saved, ...allItems];
        renderGrid();
      });
    });
    meta.appendChild(deleteBtn);

    footer.appendChild(meta);
    thumb.appendChild(footer);
    card.appendChild(thumb);
    return card;
  }

  /** A meal picker built from the shared pill, with real pressed state. */
  function buildCategoryPicker(initial?: RecipeMealCategory) {
    const wrap = el('div', {
      className: 'recipe-cat-picker', role: 'group', 'aria-label': 'Meal',
    });
    let selected: RecipeMealCategory | undefined = initial;

    for (const cat of RECIPE_MEAL_CATEGORIES) {
      const pill = el('button', {
        className: `filter-pill recipe-cat-pill${selected === cat ? ' active' : ''}`,
        'aria-pressed': String(selected === cat),
      }, RECIPE_MEAL_CATEGORY_LABELS[cat]);
      pill.style.setProperty('--cat-color', MEAL_CATEGORY_COLORS[cat]);
      on(pill, 'click', () => {
        const turningOff = selected === cat;
        selected = turningOff ? undefined : cat;
        wrap.querySelectorAll('.recipe-cat-pill').forEach(p => {
          p.classList.remove('active');
          p.setAttribute('aria-pressed', 'false');
        });
        if (!turningOff) {
          pill.classList.add('active');
          pill.setAttribute('aria-pressed', 'true');
        }
      });
      wrap.appendChild(pill);
    }

    return { el: wrap, get value() { return selected; } };
  }

  // ── Edit ──────────────────────────────────────────────────────
  // Through the shared sheet, which brings Escape, a focus trap, focus
  // restoration and dialog semantics that this view had none of.
  function openEditModal(item: InspoItem) {
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

      const catGroup = el('div', { className: 'input-group' });
      catGroup.appendChild(el('label', {}, 'Meal'));
      const picker = buildCategoryPicker(item.mealCategory);
      catGroup.appendChild(picker.el);
      body.appendChild(catGroup);

      const saveBtn = el('button', { className: 'btn btn-primary btn-block' }, 'Save');
      on(saveBtn, 'click', async () => {
        saveBtn.disabled = true;
        const title = titleInput.value.trim();
        try {
          await updateInspoItem(item.id, { title, mealCategory: picker.value ?? null });
        } catch {
          saveBtn.disabled = false;
          showToast('Couldn’t save that.', 'error');
          return;
        }
        const idx = allItems.findIndex(i => i.id === item.id);
        if (idx !== -1) {
          allItems[idx] = { ...allItems[idx], title, mealCategory: picker.value };
        }
        close();
        showToast('Saved', 'success');
        renderGrid();
      });
      body.appendChild(saveBtn);

      setTimeout(() => titleInput.focus(), 100);
    });
  }

  // ── Full-screen image ─────────────────────────────────────────
  function openImageModal(item: InspoItem) {
    openModal(item.title || 'Saved image', (body) => {
      const box = el('div', { className: 'inspo-image-modal' });
      box.appendChild(el('img', {
        src: item.thumbnailUrl, alt: item.title || 'Saved image',
      }));
      body.appendChild(box);
    });
  }

  // ── Add ───────────────────────────────────────────────────────
  function openAddModal() {
    openModal('Save an idea', (body, close) => {
      const titleGroup = el('div', { className: 'input-group' });
      titleGroup.appendChild(el('label', { for: 'inspo-add-title' }, 'Title'));
      const titleInput = el('input', {
        className: 'input', type: 'text', id: 'inspo-add-title',
        placeholder: 'e.g. Honey garlic salmon',
      }) as HTMLInputElement;
      titleGroup.appendChild(titleInput);
      body.appendChild(titleGroup);

      const catGroup = el('div', { className: 'input-group' });
      catGroup.appendChild(el('label', {}, 'Meal'));
      const picker = buildCategoryPicker();
      catGroup.appendChild(picker.el);
      body.appendChild(catGroup);

      // Source tabs: link or screenshot.
      const tabs = el('div', { className: 'inspo-modal-tabs', role: 'tablist' });
      const linkTab = el('button', {
        className: 'inspo-modal-tab active', role: 'tab', 'aria-selected': 'true',
      }, 'Link');
      const imageTab = el('button', {
        className: 'inspo-modal-tab', role: 'tab', 'aria-selected': 'false',
      }, 'Screenshot');
      tabs.appendChild(linkTab);
      tabs.appendChild(imageTab);
      body.appendChild(tabs);

      const linkPanel = el('div', { className: 'inspo-panel' });
      const urlGroup = el('div', { className: 'input-group' });
      urlGroup.appendChild(el('label', { for: 'inspo-add-url' }, 'Link'));
      const urlInput = el('input', {
        className: 'input', type: 'url', id: 'inspo-add-url', inputmode: 'url',
        autocapitalize: 'none', autocorrect: 'off', spellcheck: 'false',
        placeholder: 'Paste a TikTok or Instagram link',
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
      fileInput.style.display = 'none';
      fileLabel.appendChild(fileInput);
      const previewEl = el('div', { className: 'inspo-preview' });
      const addImageBtn = el('button', { className: 'btn btn-primary btn-block' }, 'Save image');
      addImageBtn.hidden = true;
      imagePanel.appendChild(fileLabel);
      imagePanel.appendChild(previewEl);
      imagePanel.appendChild(addImageBtn);

      body.appendChild(linkPanel);
      body.appendChild(imagePanel);

      function selectTab(link: boolean) {
        linkTab.classList.toggle('active', link);
        imageTab.classList.toggle('active', !link);
        linkTab.setAttribute('aria-selected', String(link));
        imageTab.setAttribute('aria-selected', String(!link));
        linkPanel.hidden = !link;
        imagePanel.hidden = link;
      }
      on(linkTab, 'click', () => selectTab(true));
      on(imageTab, 'click', () => selectTab(false));

      let selectedDataUrl = '';
      on(fileInput, 'change', async () => {
        const file = fileInput.files?.[0];
        if (!file) return;
        try {
          selectedDataUrl = await resizeImageToDataUrl(file);
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
          // A silent no-op used to be the entire feedback here.
          urlError.textContent = 'Paste a link first, or switch to Screenshot.';
          urlError.hidden = false;
          urlInput.focus();
          return;
        }
        urlError.hidden = true;
        addUrlBtn.disabled = true;
        addUrlBtn.textContent = 'Saving…';
        try {
          const item = await saveInspoUrl(url, titleInput.value.trim() || undefined, picker.value);
          allItems = [item, ...allItems];
          renderGrid();
          close();
          showToast('Saved', 'success');
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
          const item = await saveInspoImage(selectedDataUrl, titleInput.value.trim() || undefined, picker.value);
          allItems = [item, ...allItems];
          renderGrid();
          close();
          showToast('Saved', 'success');
        } catch (err) {
          showToast((err as Error).message || 'Couldn’t save that image.', 'error');
          addImageBtn.disabled = false;
          addImageBtn.textContent = 'Save image';
        }
      });

      setTimeout(() => titleInput.focus(), 100);
    });
  }

  renderGrid();

  // The dock, so the add button is a child of #app rather than of the router's
  // content element — which is what The Floating Control Rule requires and
  // what the old `.fab` quietly violated.
  const addBtn = el('button', {
    className: 'kb-dock-btn kb-dock-btn--primary', 'aria-label': 'Save an idea',
  });
  addBtn.appendChild(svgIcon(ICON_PLUS, 22));
  on(addBtn, 'click', openAddModal);
  setDock(addBtn);

  return container;
}
