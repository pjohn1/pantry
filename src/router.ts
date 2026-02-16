type RouteHandler = () => HTMLElement | Promise<HTMLElement>;

const routes: Record<string, RouteHandler> = {};

export function registerRoute(hash: string, handler: RouteHandler): void {
  routes[hash] = handler;
}

export function getCurrentRoute(): string {
  return window.location.hash.slice(1) || 'pantry';
}

export function navigateTo(hash: string): void {
  window.location.hash = hash;
}

export function initRouter(contentEl: HTMLElement): void {
  async function render() {
    const route = getCurrentRoute();
    const handler = routes[route] || routes['pantry'];
    if (handler) {
      const view = await handler();
      contentEl.innerHTML = '';
      contentEl.appendChild(view);
    }
  }

  window.addEventListener('hashchange', render);
  render();
}
