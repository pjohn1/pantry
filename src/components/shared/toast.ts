export function showToast(message: string, type: 'success' | 'error' | 'info' = 'info', onUndo?: () => void): void {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  if (onUndo) {
    toast.classList.add('has-undo');
    const msgSpan = document.createElement('span');
    msgSpan.textContent = message;
    toast.appendChild(msgSpan);

    const undoBtn = document.createElement('button');
    undoBtn.className = 'toast-undo-btn';
    undoBtn.textContent = 'Undo';
    toast.appendChild(undoBtn);

    const timer = setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 3000);

    undoBtn.addEventListener('click', () => {
      clearTimeout(timer);
      toast.remove();
      onUndo();
    });
  } else {
    toast.textContent = message;
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  container.appendChild(toast);
}
