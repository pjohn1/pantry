import { el } from '../../utils/dom';

/**
 * The bottom-right action dock.
 *
 * A view's primary verbs belong in the thumb's reach, but the router replaces
 * its content element on every navigation and a `position: fixed` descendant
 * of that element is exactly what The Floating Control Rule (layout.css)
 * forbids — the last bottom control built that way ended up completely
 * untappable. So the dock lives once, as a child of `#app`, and views hand it
 * their buttons rather than drawing their own.
 */
let host: HTMLElement | null = null;

function getHost(): HTMLElement | null {
  if (host?.isConnected) return host;
  const app = document.getElementById('app');
  if (!app) return null;
  host = el('div', { className: 'kb-dock' });
  host.hidden = true;
  app.appendChild(host);
  return host;
}

/** 52px per button plus the 10px gap between them. */
const BUTTON = 52;
const GAP = 10;

/**
 * Publishes the dock's height on `#app` so everything else anchored to the
 * bottom can clear it: the list's own padding, so the last row is never
 * stranded underneath, and the toast, so a confirmation never lands on top of
 * the button that produced it.
 */
function publishHeight(count: number): void {
  const app = document.getElementById('app');
  if (!app) return;
  const h = count === 0 ? 0 : count * BUTTON + (count - 1) * GAP;
  app.style.setProperty('--kb-dock-h', `${h}px`);
}

export function setDock(...actions: HTMLElement[]): void {
  const el_ = getHost();
  if (!el_) return;
  el_.innerHTML = '';
  for (const a of actions) el_.appendChild(a);
  el_.hidden = actions.length === 0;
  publishHeight(actions.length);
}

export function clearDock(): void {
  publishHeight(0);
  if (!host?.isConnected) return;
  host.innerHTML = '';
  host.hidden = true;
}
