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
    id: 'inspo',
    label: 'Saved',
    icon: '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  },
];

export function createTabBar(): HTMLElement {
  const nav = el('nav', { className: 'tab-bar', 'aria-label': 'Sections' });
  let badgeEl: HTMLElement | null = null;
  let groceryCount = 0;

  function render() {
    const current = getCurrentRoute();
    nav.innerHTML = '';
    for (const tab of TABS) {
      const isActive = current === tab.id;
      // Selection was carried by hue alone: four buttons that announced
      // identically and differed only in colour.
      const item = el('button', {
        className: `tab-bar-item${isActive ? ' active' : ''}`,
        ...(isActive ? { 'aria-current': 'page' } : {}),
      });
      const icon = svgIcon(tab.icon);
      icon.setAttribute('aria-hidden', 'true');
      item.appendChild(icon);
      item.appendChild(el('span', {}, tab.label));

      if (tab.id === 'grocery') {
        badgeEl = el('span', { className: 'tab-badge' });
        setBadge(badgeEl, groceryCount);
        item.appendChild(badgeEl);
      }

      item.addEventListener('click', () => navigateTo(tab.id));
      nav.appendChild(item);
    }
  }

  function setBadge(node: HTMLElement, count: number) {
    node.textContent = String(count);
    node.hidden = count === 0;
    // A bare numeral next to a tab label reads as part of it otherwise.
    node.setAttribute('aria-label', `${count} item${count === 1 ? '' : 's'} to get`);
  }

  function updateBadge(count: number) {
    groceryCount = count;
    if (badgeEl) setBadge(badgeEl, count);
  }

  subscribe('grocery-count', (count: number) => updateBadge(count));

  render();
  window.addEventListener('hashchange', render);

  return nav;
}
