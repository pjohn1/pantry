type Listener = (data?: any) => void;
const listeners = new Map<string, Set<Listener>>();

export function emit(event: string, data?: any): void {
  listeners.get(event)?.forEach(fn => fn(data));
}

export function subscribe(event: string, fn: Listener): () => void {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event)!.add(fn);
  return () => { listeners.get(event)?.delete(fn); };
}
