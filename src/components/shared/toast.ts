type ToastType = 'success' | 'error' | 'info';

// An error the user has to read and act on should not vanish at the same speed
// as a confirmation they only need to glimpse.
const DURATION: Record<ToastType, number> = {
  success: 2500,
  info: 2500,
  error: 6000,
};

const ACTION_DURATION = 5000;

export function showToast(
  message: string,
  type: ToastType = 'info',
  onAction?: () => void,
  actionLabel = 'Undo',
): void {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  function dismiss() {
    toast.style.transition = 'opacity 0.3s';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }

  if (onAction) {
    toast.classList.add('has-undo');
    const msgSpan = document.createElement('span');
    msgSpan.textContent = message;
    toast.appendChild(msgSpan);

    const actionBtn = document.createElement('button');
    actionBtn.className = 'toast-undo-btn';
    actionBtn.textContent = actionLabel;
    toast.appendChild(actionBtn);

    // An action worth offering is worth time to reach, and a one-handed reach
    // across the screen is slower than a glance.
    const timer = setTimeout(dismiss, ACTION_DURATION);

    actionBtn.addEventListener('click', () => {
      clearTimeout(timer);
      toast.remove();
      onAction();
    });
  } else {
    toast.textContent = message;
    setTimeout(dismiss, DURATION[type]);
  }

  container.appendChild(toast);
}
