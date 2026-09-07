import { el, on } from '../../utils/dom';

export interface ModalOptions {
  /**
   * Runs once when the sheet is dismissed by any route: the close button, the
   * backdrop, Escape, or the `close()` handed to the body builder. Anything
   * holding a resource — a camera stream, an in-flight request — should release
   * it here rather than watching the DOM for its own removal.
   */
  onClose?: () => void;
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function openModal(
  title: string,
  buildBody: (container: HTMLElement, close: () => void) => void,
  options: ModalOptions = {},
): void {
  const overlay = el('div', { className: 'modal-overlay' });
  const modal = el('div', { className: 'modal', role: 'dialog', 'aria-modal': 'true' });
  modal.setAttribute('aria-label', title);

  const header = el('div', { className: 'modal-header' });
  const titleEl = el('h2', { className: 'modal-title' }, title);
  const closeBtn = el('button', { className: 'modal-close', 'aria-label': 'Close' }, '×');
  header.appendChild(titleEl);
  header.appendChild(closeBtn);

  const body = el('div', { className: 'modal-body' });

  modal.appendChild(header);
  modal.appendChild(body);
  overlay.appendChild(modal);

  // Return focus where the user left it, not to the top of the document.
  const previouslyFocused = document.activeElement as HTMLElement | null;
  let closed = false;

  function close() {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKeydown);
    viewport?.removeEventListener('resize', syncKeyboardInset);
    viewport?.removeEventListener('scroll', syncKeyboardInset);
    overlay.remove();
    previouslyFocused?.focus?.();
    options.onClose?.();
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (e.key !== 'Tab') return;
    // Keep Tab inside the sheet; a focus ring wandering behind the backdrop is
    // how keyboard users get stranded in a modal.
    const focusable = Array.from(modal.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  // `dvh` does not account for the iOS keyboard, so a focused input can push a
  // sheet's submit button under it. visualViewport reports the real space left.
  const viewport = window.visualViewport;
  function syncKeyboardInset() {
    if (!viewport) return;
    const hidden = Math.max(
      0,
      window.innerHeight - viewport.height - viewport.offsetTop,
    );
    modal.style.setProperty('--keyboard-inset', `${Math.round(hidden)}px`);
  }

  on(closeBtn, 'click', close);
  on(overlay, 'click', (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener('keydown', onKeydown);
  viewport?.addEventListener('resize', syncKeyboardInset);
  viewport?.addEventListener('scroll', syncKeyboardInset);
  syncKeyboardInset();

  buildBody(body, close);

  document.body.appendChild(overlay);
}
