type RouteHandler = () => HTMLElement | Promise<HTMLElement>;

const routes: Record<string, RouteHandler> = {};

const FALLBACK_ROUTE = 'pantry';

export function registerRoute(hash: string, handler: RouteHandler): void {
  routes[hash] = handler;
}

/**
 * The route actually in effect. Registry-aware on purpose: an installed iOS
 * PWA restores its last URL, so a user left on a route that no longer exists
 * would otherwise reopen to a view that does not match the hash.
 *
 * Note this reads `routes`, so anything calling it must run after the routes
 * are registered — see the ordering comment in app-shell.ts.
 */
export function getCurrentRoute(): string {
  const hash = window.location.hash.slice(1);
  return hash in routes ? hash : FALLBACK_ROUTE;
}

export function navigateTo(hash: string): void {
  window.location.hash = hash;
}

export function initRouter(contentEl: HTMLElement): void {
  async function render() {
    const route = getCurrentRoute();

    // Canonicalise the URL so the hash, the styling and the tab bar can never
    // disagree. `replaceState` deliberately does not fire `hashchange`.
    if (window.location.hash.slice(1) !== route) {
      history.replaceState(null, '', `#${route}`);
    }

    const handler = routes[route];
    if (!handler) return;

    const view = await handler();
    contentEl.innerHTML = '';
    // Derived from the RESOLVED route, never the requested one: a view opts out
    // of the shell's padding through this, and a stale hash would leave it
    // rendering unstyled.
    contentEl.dataset.route = route;
    view.classList.add('view-enter');
    // Removed once it has played, so no view is left owning a transform.
    view.addEventListener('animationend', () => view.classList.remove('view-enter'), { once: true });
    contentEl.appendChild(view);
  }

  window.addEventListener('hashchange', render);
  render();
}
