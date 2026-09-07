import { el } from '../../utils/dom';

export interface SwipeAction {
  label: string;
  /** Modifier class, e.g. `kb-action--pull`. */
  className: string;
  onAction: () => void;
}

/** Width of one action, kept in sync with `.kb-action` in world-kanban.css. */
const ACTION_WIDTH = 86;

/** Only one row stays open at a time, the way a platform list behaves. */
let closeOpenRow: (() => void) | null = null;

/**
 * Wraps a row surface in trailing swipe actions.
 *
 * Row actions used to be four buttons competing inside the row, three of
 * them under 44px. Moving them behind a swipe is the platform convention,
 * costs no permanent pixels, and hands the row back to the ledger.
 *
 * The action buttons stay in the DOM rather than being built on demand, so
 * they remain reachable by keyboard and screen reader even while visually
 * tucked behind the card.
 */
export function createSwipeRow(surface: HTMLElement, actions: SwipeAction[]): HTMLElement {
  const wrap = el('div', { className: 'kb-swipe' });
  const layer = el('div', { className: 'kb-swipe-actions' });

  for (const action of actions) {
    const btn = el('button', { className: `kb-action ${action.className}` }, action.label);
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      close();
      action.onAction();
    });
    layer.appendChild(btn);
  }

  const moving = el('div', { className: 'kb-swipe-surface' });
  moving.appendChild(surface);
  moving.style.touchAction = 'pan-y';

  wrap.appendChild(layer);
  wrap.appendChild(moving);

  const openWidth = actions.length * ACTION_WIDTH;
  let startX = 0;
  let startY = 0;
  let offset = 0;
  let dragging = false;
  let horizontal = false;
  let isOpen = false;
  let lastSwipeEnd = 0;

  function paint(x: number) {
    moving.style.transform = x === 0 ? '' : `translate3d(${x}px, 0, 0)`;
  }

  function open() {
    if (closeOpenRow && closeOpenRow !== close) closeOpenRow();
    isOpen = true;
    offset = -openWidth;
    paint(offset);
    closeOpenRow = close;
  }

  function close() {
    isOpen = false;
    offset = 0;
    paint(0);
    if (closeOpenRow === close) closeOpenRow = null;
  }

  moving.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    startX = e.clientX;
    startY = e.clientY;
    dragging = true;
    horizontal = false;
  });

  moving.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    if (!horizontal) {
      // Wait until the gesture declares itself, so vertical scrolling
      // through the rack is never stolen by a row.
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (Math.abs(dy) >= Math.abs(dx)) {
        dragging = false;
        return;
      }
      horizontal = true;
      wrap.classList.add('is-dragging');
      moving.setPointerCapture?.(e.pointerId);
    }

    offset = Math.max(-openWidth, Math.min(0, (isOpen ? -openWidth : 0) + dx));
    paint(offset);
  });

  function endDrag() {
    if (!dragging) return;
    dragging = false;
    wrap.classList.remove('is-dragging');
    if (!horizontal) return;
    lastSwipeEnd = Date.now();
    if (offset < -openWidth * 0.4) open();
    else close();
  }

  moving.addEventListener('pointerup', endDrag);
  moving.addEventListener('pointercancel', endDrag);

  // A tap that ends a swipe, or a tap on an open row, must not also
  // activate the card underneath.
  moving.addEventListener('click', (e) => {
    if (isOpen) {
      e.stopPropagation();
      e.preventDefault();
      close();
      return;
    }
    if (Date.now() - lastSwipeEnd < 300) {
      e.stopPropagation();
      e.preventDefault();
    }
  }, true);

  return wrap;
}

/** Closes whichever row is open. Called before a re-render. */
export function closeAnyOpenSwipeRow(): void {
  closeOpenRow?.();
}
