import { el } from '../utils/dom';
import { createTabBar } from './tab-bar';
import { initRouter, registerRoute } from '../router';
import { createPantryView } from './pantry/pantry-view';
import { createGroceryView } from './grocery/grocery-view';
import { createSettingsView } from './settings/settings-view';
import { createInspoView } from './inspo/inspo-view';

export function createApp(): void {
  const app = document.getElementById('app')!;

  const content = el('main', { className: 'app-content' });

  // Toast container. A live region, so the confirmation a ledger most needs to
  // give — "it saved" — is announced and not only drawn.
  const toastContainer = el('div', {
    className: 'toast-container',
    role: 'status',
    'aria-live': 'polite',
  });
  toastContainer.id = 'toast-container';

  app.appendChild(content);
  app.appendChild(toastContainer);

  // Register routes
  registerRoute('pantry', createPantryView);
  registerRoute('grocery', createGroceryView);
  registerRoute('inspo', createInspoView);
  registerRoute('settings', createSettingsView);

  // The tab bar asks the router which route is active, and that answer is now
  // registry-aware, so it has to be built after the routes are registered.
  const tabBar = createTabBar();
  app.insertBefore(tabBar, toastContainer);

  initRouter(content);
}
