import { el, svgIcon } from '../utils/dom';
import { getCurrentRoute, navigateTo } from '../router';
import { subscribe } from '../utils/events';

interface Tab {
  id: string;
  label: string;
  icon: string;
}

const TABS: Tab[] = [
  {
    id: 'pantry',
    label: 'Pantry',
    icon: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  },
  {
    id: 'grocery',
    label: 'Grocery',
    icon: '<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>',
  },
  {
    id: 'recipes',
    label: 'Recipes',
    icon: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  },
  {
    id: 'cook',
    label: 'Cook',
    icon: '<path d="M12 3v4M8 4v3M16 4v3"/><path d="M3 11h18"/><path d="M3 15c1.5-1 3-2 4.5-2s3 2 4.5 2 3-1 4.5-2"/><rect x="3" y="11" width="18" height="8" rx="1" fill="none"/><path d="M5 19v2M19 19v2"/>',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  },
];

export function createTabBar(): HTMLElement {
  const nav = el('nav', { className: 'tab-bar' });
  let badgeEl: HTMLElement | null = null;
  let groceryCount = 0;

  function render() {
    const current = getCurrentRoute();
    nav.innerHTML = '';
    for (const tab of TABS) {
      const isActive = current === tab.id;
      const item = el('button', {
        className: `tab-bar-item${isActive ? ' active' : ''}`,
      });
      item.appendChild(svgIcon(tab.icon));
      item.appendChild(el('span', {}, tab.label));

      if (tab.id === 'grocery') {
        badgeEl = el('span', { className: 'tab-badge' });
        badgeEl.textContent = String(groceryCount);
        if (groceryCount === 0) badgeEl.style.display = 'none';
        item.appendChild(badgeEl);
      }

      item.addEventListener('click', () => navigateTo(tab.id));
      nav.appendChild(item);
    }
  }

  function updateBadge(count: number) {
    groceryCount = count;
    if (badgeEl) {
      badgeEl.textContent = String(count);
      badgeEl.style.display = count > 0 ? '' : 'none';
    }
  }

  subscribe('grocery-count', (count: number) => updateBadge(count));

  render();
  window.addEventListener('hashchange', render);

  return nav;
}
