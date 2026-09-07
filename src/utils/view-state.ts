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
