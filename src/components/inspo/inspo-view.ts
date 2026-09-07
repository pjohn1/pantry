import { el, on, svgIcon } from '../../utils/dom';
import {
  getAllInspoItems,
  saveInspoUrl,
  saveInspoImage,
  deleteInspoItem,
  restoreInspoItem,
  updateInspoItem,
  ensureCovers,
} from '../../services/inspo.service';
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
  const mono = item.platform === 'image'
    ? describeLink('', item.title).monogram
    : describeLink(item.url, item.title).monogram;
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
      'aria-label': item.platform === 'image'
        ? `Open ${name}`
        : `Open ${name} on ${describeLink(item.url).sourceLabel}`,
    });
    openBtn.dataset.control = 'open';
    openBtn.appendChild(buildCover(item));

    const main = el('span', { className: 'kb-row-main' });
    main.appendChild(el('span', { className: 'kb-row-name' }, name));
    main.appendChild(el('span', { className: 'kb-row-sub' }, sub));
    openBtn.appendChild(main);

    on(openBtn, 'click', () => {
      if (item.platform === 'image') openImageSheet(item);
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
      return [item.title, sourceLabel, handle, item.url]
        .some(field => field?.toLowerCase().includes(query));
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
        'Nothing saved yet. Paste a TikTok, Instagram or YouTube link, or add a screenshot of something you want to cook.',
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

  function openAddSheet() {
    openModal('Save an idea', (body, close) => {
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
      tabs.appendChild(linkTab);
      tabs.appendChild(imageTab);
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
