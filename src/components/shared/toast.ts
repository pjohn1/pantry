type ToastType = 'success' | 'error' | 'info';

// An error the user has to read and act on should not vanish at the same speed
// as a confirmation they only need to glimpse.
const DURATION: Record<ToastType, number> = {
  success: 2500,
  info: 2500,
  error: 6000,
};

const ACTION_DURATION = 5000;

/**
 * One toast at a time.
 *
 * Working down a shopping list is a burst of eight or ten writes in a few
 * seconds, and each used to append its own pill — a growing stack that sat on
 * top of the controls. Reusing a single node means the last thing that
 * happened is always the thing on screen, and the strip never grows.
 */
let live: { el: HTMLElement; timer: number } | null = null;

function clearLive(remove: boolean): void {
  if (!live) return;
  window.clearTimeout(live.timer);
  if (remove) live.el.remove();
  live = null;
}

export function showToast(
  message: string,
  type: ToastType = 'info',
  onAction?: () => void,
  actionLabel = 'Undo',
): void {
  const container = document.getElementById('toast-container');
  if (!container) return;

  clearLive(true);

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const msgSpan = document.createElement('span');
  msgSpan.className = 'toast-message';
  msgSpan.textContent = message;
  toast.appendChild(msgSpan);

  function dismiss() {
    if (!live || live.el !== toast) return;
    live = null;
    toast.classList.add('is-leaving');
    setTimeout(() => toast.remove(), 300);
  }

  if (onAction) {
    toast.classList.add('has-undo');

    const actionBtn = document.createElement('button');
    actionBtn.className = 'toast-undo-btn';
    actionBtn.textContent = actionLabel;
    toast.appendChild(actionBtn);

    actionBtn.addEventListener('click', () => {
      clearLive(false);
      toast.remove();
      onAction();
    });
  }

  container.appendChild(toast);

  // An action worth offering is worth time to reach.
  live = {
    el: toast,
    timer: window.setTimeout(dismiss, onAction ? ACTION_DURATION : DURATION[type]),
  };
}
