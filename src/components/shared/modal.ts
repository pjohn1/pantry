import { el, on } from '../../utils/dom';

export function openModal(title: string, buildBody: (container: HTMLElement, close: () => void) => void): void {
  const overlay = el('div', { className: 'modal-overlay' });
  const modal = el('div', { className: 'modal' });

  const header = el('div', { className: 'modal-header' });
  const titleEl = el('h2', { className: 'modal-title' }, title);
  const closeBtn = el('button', { className: 'modal-close' }, '\u00D7');
  header.appendChild(titleEl);
  header.appendChild(closeBtn);

  const body = el('div', { className: 'modal-body' });

  modal.appendChild(header);
  modal.appendChild(body);
  overlay.appendChild(modal);

  function close() {
    overlay.remove();
  }

  on(closeBtn, 'click', close);
  on(overlay, 'click', (e) => {
    if (e.target === overlay) close();
  });

  buildBody(body, close);

  document.body.appendChild(overlay);
}
