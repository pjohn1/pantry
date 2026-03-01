import { el, on } from '../../utils/dom';
import {
  getAllInspoItems,
  saveInspoUrl,
  saveInspoImage,
  deleteInspoItem,
} from '../../services/inspo.service';
import type { InspoItem, InspoPlatform } from '../../models/types';
import { showToast } from '../shared/toast';

const PLATFORM_COLORS: Record<InspoPlatform, string> = {
  tiktok: '#010101',
  instagram: '#e1306c',
  image: '#636366',
  other: '#3a3a3c',
};

const PLATFORM_LABELS: Record<InspoPlatform, string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
  image: 'Image',
  other: 'Link',
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
  const items = await getAllInspoItems();

  // Grid
  const grid = el('div', { className: 'inspo-grid' });
  container.appendChild(grid);

  function renderGrid(list: InspoItem[]) {
    grid.innerHTML = '';
    if (list.length === 0) {
      const empty = el('div', { className: 'inspo-empty' });
      empty.appendChild(el('p', { className: 'empty-state-text' }, 'Save TikTok or Instagram recipes here'));
      grid.appendChild(empty);
      return;
    }

    for (const item of list) {
      grid.appendChild(createCell(item));
    }
  }

  function createCell(item: InspoItem): HTMLElement {
    const cell = el('div', { className: 'inspo-cell' });
    cell.dataset.id = item.id;

    if (item.thumbnailUrl) {
      const img = el('img', { src: item.thumbnailUrl, alt: item.title || PLATFORM_LABELS[item.platform] });
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      img.style.display = 'block';
      cell.appendChild(img);
    } else {
      const placeholder = el('div', { className: 'inspo-placeholder' });
      placeholder.style.background = PLATFORM_COLORS[item.platform];
      placeholder.appendChild(el('span', {}, PLATFORM_LABELS[item.platform]));
      cell.appendChild(placeholder);
    }

    // Tap to open URL / show image; long-press to delete
    let pressTimer: ReturnType<typeof setTimeout> | null = null;
    let didLongPress = false;

    const startPress = () => {
      didLongPress = false;
      pressTimer = setTimeout(() => {
        didLongPress = true;
        confirmDelete(item, cell);
      }, 600);
    };

    const endPress = () => {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
    };

    const handleTap = () => {
      if (didLongPress) return;
      if (item.platform === 'image') {
        openImageModal(item);
      } else if (item.url) {
        window.open(item.url, '_blank', 'noopener,noreferrer');
      }
    };

    cell.addEventListener('touchstart', startPress, { passive: true });
    cell.addEventListener('touchend', endPress);
    cell.addEventListener('touchcancel', endPress);
    on(cell, 'click', handleTap);

    // Prevent context menu on long-press on mobile
    cell.addEventListener('contextmenu', (e) => e.preventDefault());

    return cell;
  }

  async function confirmDelete(item: InspoItem, cell: HTMLElement) {
    if (!confirm(`Delete this ${PLATFORM_LABELS[item.platform]} item?`)) return;
    try {
      await deleteInspoItem(item.id);
      cell.remove();
      const remaining = grid.querySelectorAll('.inspo-cell');
      if (remaining.length === 0) renderGrid([]);
    } catch {
      showToast('Failed to delete', 'error');
    }
  }

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

  // Add modal
  function openAddModal() {
    const overlay = el('div', { className: 'modal-overlay' });
    const modal = el('div', { className: 'modal' });

    const header = el('div', { className: 'modal-header' });
    const title = el('div', { className: 'modal-title' }, 'Save Recipe Inspo');
    const closeBtn = el('button', { className: 'modal-close' }, '✕');
    on(closeBtn, 'click', () => overlay.remove());
    header.appendChild(title);
    header.appendChild(closeBtn);
    modal.appendChild(header);

    const body = el('div', { className: 'modal-body' });

    // Tab toggle
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
      linkTab.classList.add('active');
      imageTab.classList.remove('active');
      linkPanel.style.display = '';
      imagePanel.style.display = 'none';
    });
    on(imageTab, 'click', () => {
      imageTab.classList.add('active');
      linkTab.classList.remove('active');
      imagePanel.style.display = '';
      linkPanel.style.display = 'none';
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
        const item = await saveInspoUrl(url);
        grid.innerHTML = '';
        const allItems = await getAllInspoItems();
        renderGrid(allItems);
        overlay.remove();
        showToast('Saved!', 'success');
        void item;
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
        await saveInspoImage(selectedDataUrl);
        const allItems = await getAllInspoItems();
        renderGrid(allItems);
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

    // Focus URL input after modal opens
    setTimeout(() => urlInput.focus(), 50);
  }

  renderGrid(items);

  // FAB
  const fab = el('button', { className: 'fab' }, '+');
  on(fab, 'click', openAddModal);
  container.appendChild(fab);

  return container;
}
