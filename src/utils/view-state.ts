/**
 * Per-tab view state that outlives the view.
 *
 * The router destroys and rebuilds a view on every hashchange, which is what
 * keeps view code free of lifecycle bookkeeping — but it also meant a search
 * query, a filter and a scroll position died every time the user glanced at
 * another tab. The cupboard and the aisle are both interrupted scenes; losing
 * your place on every look-away is the single most repeated annoyance in the
 * app.
 *
 * The state is cached, never the DOM, so the "views are fully recreated"
 * invariant still holds. Deliberately in memory only: this is where you were
 * a moment ago, not a preference, and a fresh launch should open clean.
 */
export interface ViewState {
  query: string;
  outOnly: boolean;
  scrollTop: number;
}

const DEFAULTS: ViewState = { query: '', outOnly: false, scrollTop: 0 };

const states = new Map<string, ViewState>();

export function getViewState(route: string): ViewState {
  return { ...DEFAULTS, ...states.get(route) };
}

export function patchViewState(route: string, patch: Partial<ViewState>): void {
  states.set(route, { ...getViewState(route), ...patch });
}

const bound = new WeakSet<Element>();

/**
 * Restores where the user was, and starts recording it.
 *
 * Call this **after the first render**, never from the factory. Every list
 * view used to assign `scrollTop` inside a bare `requestAnimationFrame` at
 * construction time, which fires while the view is still empty or showing a
 * skeleton — so the scroller has nothing to scroll and the browser clamps the
 * assignment to 0. The query survived a tab switch and the scroll position
 * silently did not, on all three tabs.
 *
 * The scroller is `.app-content`, which the router keeps and refills rather
 * than replacing, so its listeners would otherwise pile up one per navigation
 * and keep writing another route's position. Each one retires itself the first
 * time it fires after its own view has been torn down.
 */
export function keepPlace(container: Element, route: string): void {
  if (bound.has(container)) return;
  const scroller = container.closest('.app-content');
  if (!scroller) return;
  bound.add(container);

  requestAnimationFrame(() => {
    if (!container.isConnected) return;
    scroller.scrollTop = getViewState(route).scrollTop;

    const controller = new AbortController();
    scroller.addEventListener('scroll', () => {
      if (!container.isConnected) {
        controller.abort();
        return;
      }
      patchViewState(route, { scrollTop: scroller.scrollTop });
    }, { passive: true, signal: controller.signal });
  });
}
