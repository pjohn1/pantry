import { el, on, svgIcon } from '../../utils/dom';
import {
  getAllInspoItems,
  saveInspoUrl,
  saveInspoImage,
  deleteInspoItem,
  updateInspoItem,
} from '../../services/inspo.service';
import type { InspoItem, InspoPlatform, RecipeMealCategory } from '../../models/types';
import { RECIPE_MEAL_CATEGORIES, RECIPE_MEAL_CATEGORY_LABELS } from '../../models/types';
import { showToast } from '../shared/toast';

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

const TRASH_ICON = '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>';
const PENCIL_ICON = '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>';

const MEAL_CATEGORY_COLORS: Record<RecipeMealCategory, string> = {
  breakfast: '#FF9500',
  lunch:     '#34C759',
  dinner:    '#007AFF',
  snack:     '#AF52DE',
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

  // ── Filter pills ──────────────────────────────────────────────
  const filterRow = el('div', { className: 'filter-pills inspo-filters' });

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
    renderGrid();
  }

  // ── Grid ──────────────────────────────────────────────────────
  const grid = el('div', { className: 'inspo-grid' });
  container.appendChild(grid);

  function renderGrid() {
    grid.innerHTML = '';
    const visible = activeFilter === 'all'
      ? allItems
      : allItems.filter(i => i.mealCategory === activeFilter);

    if (visible.length === 0) {
      const empty = el('div', { className: 'inspo-empty' });
      const msg = allItems.length === 0
        ? 'Save TikTok or Instagram recipes here'
        : `No ${RECIPE_MEAL_CATEGORY_LABELS[activeFilter as RecipeMealCategory]} recipes saved yet`;
      empty.appendChild(el('p', { className: 'empty-state-text' }, msg));
      grid.appendChild(empty);
      return;
    }

    for (const item of visible) {
      grid.appendChild(createCard(item));
    }
  }

  function createCard(item: InspoItem): HTMLElement {
    const card = el('div', { className: 'inspo-card' });
    card.dataset.id = item.id;

    // ── Thumbnail ───────────────────────────────────────────────
    const thumb = el('div', { className: 'inspo-thumb' });

    if (item.thumbnailUrl) {
      const img = el('img', { src: item.thumbnailUrl, alt: item.title || PLATFORM_LABELS[item.platform] });
      thumb.appendChild(img);
    } else {
      const placeholder = el('div', { className: 'inspo-placeholder' });
      placeholder.style.background = PLATFORM_COLORS[item.platform];
      placeholder.appendChild(svgIcon(PLATFORM_ICONS[item.platform]));
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

    // Title row
    const titleEl = el('div', { className: 'inspo-footer-title' },
      item.title || PLATFORM_LABELS[item.platform]
    );
    footer.appendChild(titleEl);

    // Meta row: badge | spacer | edit | delete
    const meta = el('div', { className: 'inspo-footer-meta' });

    if (item.mealCategory) {
      const badge = el('span', { className: 'inspo-cat-badge' },
        RECIPE_MEAL_CATEGORY_LABELS[item.mealCategory]
      );
      badge.style.background = MEAL_CATEGORY_COLORS[item.mealCategory];
      meta.appendChild(badge);
    }

    meta.appendChild(el('div', { className: 'inspo-footer-spacer' }));

    const editBtn = el('button', { className: 'inspo-icon-btn' });
    editBtn.title = 'Edit';
    editBtn.appendChild(svgIcon(PENCIL_ICON));
    on(editBtn, 'click', (e) => { e.stopPropagation(); openEditModal(item); });
    meta.appendChild(editBtn);

    const deleteBtn = el('button', { className: 'inspo-icon-btn inspo-icon-btn-danger' });
    deleteBtn.title = 'Delete';
    deleteBtn.appendChild(svgIcon(TRASH_ICON));
    on(deleteBtn, 'click', async (e) => {
      e.stopPropagation();
      if (!confirm(`Delete this ${item.title || PLATFORM_LABELS[item.platform]}?`)) return;
      try {
        await deleteInspoItem(item.id);
        allItems = allItems.filter(i => i.id !== item.id);
        renderGrid();
      } catch {
        showToast('Failed to delete', 'error');
      }
    });
    meta.appendChild(deleteBtn);

    footer.appendChild(meta);
    thumb.appendChild(footer);   // footer lives inside the thumbnail
    card.appendChild(thumb);
    return card;
  }

  // ── Edit modal ────────────────────────────────────────────────
  function openEditModal(item: InspoItem) {
    const overlay = el('div', { className: 'modal-overlay' });
    const modal = el('div', { className: 'modal' });

    const header = el('div', { className: 'modal-header' });
    header.appendChild(el('div', { className: 'modal-title' }, 'Edit Saved Recipe'));
    const closeBtn = el('button', { className: 'modal-close' }, '✕');
    on(closeBtn, 'click', () => overlay.remove());
    header.appendChild(closeBtn);
    modal.appendChild(header);

    const body = el('div', { className: 'modal-body' });

    const titleGroup = el('div', { className: 'input-group' });
    titleGroup.appendChild(el('label', {}, 'Title'));
    const titleInput = el('input', {
      className: 'input',
      type: 'text',
      placeholder: 'Recipe title…',
    }) as HTMLInputElement;
    titleInput.value = item.title;
    titleGroup.appendChild(titleInput);
    body.appendChild(titleGroup);

    const catGroup = el('div', { className: 'input-group' });
    catGroup.appendChild(el('label', {}, 'Category'));
    const catPills = el('div', { className: 'recipe-cat-picker' });
    let editCategory: RecipeMealCategory | undefined = item.mealCategory;
    for (const cat of RECIPE_MEAL_CATEGORIES) {
      const pill = el('button', {
        className: `filter-pill recipe-cat-pill${editCategory === cat ? ' active' : ''}`,
      }, RECIPE_MEAL_CATEGORY_LABELS[cat]);
      pill.style.setProperty('--cat-color', MEAL_CATEGORY_COLORS[cat]);
      on(pill, 'click', () => {
        if (editCategory === cat) {
          editCategory = undefined;
          pill.classList.remove('active');
        } else {
          editCategory = cat;
          catPills.querySelectorAll('.recipe-cat-pill').forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
        }
      });
      catPills.appendChild(pill);
    }
    catGroup.appendChild(catPills);
    body.appendChild(catGroup);

    const saveBtn = el('button', { className: 'btn btn-primary btn-block' }, 'Save');
    on(saveBtn, 'click', async () => {
      await updateInspoItem(item.id, {
        title: titleInput.value.trim(),
        mealCategory: editCategory ?? null,
      });
      // Update in-memory list
      const idx = allItems.findIndex(i => i.id === item.id);
      if (idx !== -1) {
        allItems[idx] = { ...allItems[idx], title: titleInput.value.trim(), mealCategory: editCategory };
      }
      overlay.remove();
      renderGrid();
    });
    body.appendChild(saveBtn);

    modal.appendChild(body);
    on(overlay, 'click', (e) => { if (e.target === overlay) overlay.remove(); });
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    setTimeout(() => titleInput.focus(), 50);
  }

  // ── Full-screen image modal ───────────────────────────────────
  function openImageModal(item: InspoItem) {
    const overlay = el('div', { className: 'modal-overlay' });
    const box = el('div', { className: 'inspo-image-modal' });
    const img = el('img', { src: item.thumbnailUrl, alt: item.title || 'Saved image' });
    const closeBtn = el('button', { className: 'inspo-image-close' }, '✕');
    on(closeBtn, 'click', () => overlay.remove());
    on(overlay, 'click', (e) => { if (e.target === overlay) overlay.remove(); });
    box.appendChild(closeBtn);
    box.appendChild(img);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  }

  // ── Add modal ─────────────────────────────────────────────────
  function openAddModal() {
    const overlay = el('div', { className: 'modal-overlay' });
    const modal = el('div', { className: 'modal' });

    const header = el('div', { className: 'modal-header' });
    header.appendChild(el('div', { className: 'modal-title' }, 'Save Recipe Inspo'));
    const closeBtn = el('button', { className: 'modal-close' }, '✕');
    on(closeBtn, 'click', () => overlay.remove());
    header.appendChild(closeBtn);
    modal.appendChild(header);

    const body = el('div', { className: 'modal-body' });

    // Shared: title input
    const titleGroup = el('div', { className: 'input-group' });
    titleGroup.appendChild(el('label', {}, 'Title'));
    const titleInput = el('input', {
      className: 'input',
      type: 'text',
      placeholder: 'e.g. Honey Garlic Salmon',
    }) as HTMLInputElement;
    titleGroup.appendChild(titleInput);
    body.appendChild(titleGroup);

    // Shared: category picker
    const catGroup = el('div', { className: 'input-group' });
    catGroup.appendChild(el('label', {}, 'Category'));
    const catPills = el('div', { className: 'recipe-cat-picker' });
    let selectedCategory: RecipeMealCategory | undefined;
    for (const cat of RECIPE_MEAL_CATEGORIES) {
      const pill = el('button', { className: 'filter-pill recipe-cat-pill' },
        RECIPE_MEAL_CATEGORY_LABELS[cat]
      );
      pill.style.setProperty('--cat-color', MEAL_CATEGORY_COLORS[cat]);
      on(pill, 'click', () => {
        if (selectedCategory === cat) {
          selectedCategory = undefined;
          pill.classList.remove('active');
        } else {
          selectedCategory = cat;
          catPills.querySelectorAll('.recipe-cat-pill').forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
        }
      });
      catPills.appendChild(pill);
    }
    catGroup.appendChild(catPills);
    body.appendChild(catGroup);

    // Source tabs: Link | Screenshot
    const tabs = el('div', { className: 'inspo-modal-tabs' });
    const linkTab = el('button', { className: 'inspo-modal-tab active' }, 'Link');
    const imageTab = el('button', { className: 'inspo-modal-tab' }, 'Screenshot');
    tabs.appendChild(linkTab);
    tabs.appendChild(imageTab);
    body.appendChild(tabs);

    // Link panel
    const linkPanel = el('div', { className: 'inspo-panel' });
    const urlInput = el('input', {
      className: 'input',
      type: 'text',
      placeholder: 'Paste TikTok or Instagram URL…',
    }) as HTMLInputElement;
    const addUrlBtn = el('button', { className: 'btn btn-primary btn-block' }, 'Save Link');
    linkPanel.appendChild(urlInput);
    linkPanel.appendChild(addUrlBtn);

    // Image panel
    const imagePanel = el('div', { className: 'inspo-panel' });
    imagePanel.style.display = 'none';
    const fileLabel = el('label', { className: 'btn btn-secondary btn-block' }, 'Choose Photo or Screenshot');
    const fileInput = el('input', { type: 'file', accept: 'image/*' }) as HTMLInputElement;
    fileInput.style.display = 'none';
    fileLabel.appendChild(fileInput);
    const previewEl = el('div', { className: 'inspo-preview' });
    const addImageBtn = el('button', { className: 'btn btn-primary btn-block' }, 'Save Image');
    addImageBtn.style.display = 'none';
    imagePanel.appendChild(fileLabel);
    imagePanel.appendChild(previewEl);
    imagePanel.appendChild(addImageBtn);

    body.appendChild(linkPanel);
    body.appendChild(imagePanel);
    modal.appendChild(body);

    // Tab switching
    on(linkTab, 'click', () => {
      linkTab.classList.add('active'); imageTab.classList.remove('active');
      linkPanel.style.display = ''; imagePanel.style.display = 'none';
    });
    on(imageTab, 'click', () => {
      imageTab.classList.add('active'); linkTab.classList.remove('active');
      imagePanel.style.display = ''; linkPanel.style.display = 'none';
    });

    // File preview
    let selectedDataUrl = '';
    on(fileInput, 'change', async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      try {
        selectedDataUrl = await resizeImageToDataUrl(file);
        previewEl.innerHTML = '';
        const prevImg = el('img', { src: selectedDataUrl, alt: 'Preview' });
        prevImg.style.width = '100%';
        prevImg.style.borderRadius = '8px';
        prevImg.style.marginTop = '8px';
        previewEl.appendChild(prevImg);
        addImageBtn.style.display = '';
      } catch {
        showToast('Could not load image', 'error');
      }
    });

    // Save URL
    on(addUrlBtn, 'click', async () => {
      const url = urlInput.value.trim();
      if (!url) return;
      (addUrlBtn as HTMLButtonElement).disabled = true;
      addUrlBtn.textContent = 'Saving…';
      try {
        const item = await saveInspoUrl(url, titleInput.value.trim() || undefined, selectedCategory);
        allItems = [item, ...allItems];
        renderGrid();
        overlay.remove();
        showToast('Saved!', 'success');
      } catch (err) {
        showToast(`Error: ${(err as Error).message}`, 'error');
        (addUrlBtn as HTMLButtonElement).disabled = false;
        addUrlBtn.textContent = 'Save Link';
      }
    });

    // Save image
    on(addImageBtn, 'click', async () => {
      if (!selectedDataUrl) return;
      (addImageBtn as HTMLButtonElement).disabled = true;
      addImageBtn.textContent = 'Saving…';
      try {
        const item = await saveInspoImage(selectedDataUrl, titleInput.value.trim() || undefined, selectedCategory);
        allItems = [item, ...allItems];
        renderGrid();
        overlay.remove();
        showToast('Saved!', 'success');
      } catch (err) {
        showToast(`Error: ${(err as Error).message}`, 'error');
        (addImageBtn as HTMLButtonElement).disabled = false;
        addImageBtn.textContent = 'Save Image';
      }
    });

    on(overlay, 'click', (e) => { if (e.target === overlay) overlay.remove(); });
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    setTimeout(() => titleInput.focus(), 50);
  }

  renderGrid();

  // FAB
  const fab = el('button', { className: 'fab' }, '+');
  on(fab, 'click', openAddModal);
  container.appendChild(fab);

  return container;
}
