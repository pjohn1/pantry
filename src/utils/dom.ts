export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Record<string, string>,
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      if (key === 'className') {
        element.className = value;
      } else {
        element.setAttribute(key, value);
      }
    }
  }
  for (const child of children) {
    element.append(child);
  }
  return element;
}

export function on<K extends keyof HTMLElementEventMap>(
  element: HTMLElement,
  event: K,
  handler: (e: HTMLElementEventMap[K]) => void
): void {
  element.addEventListener(event, handler);
}

export function clear(element: HTMLElement): void {
  element.innerHTML = '';
}

export function show(element: HTMLElement): void {
  element.style.display = '';
}

export function hide(element: HTMLElement): void {
  element.style.display = 'none';
}

export function svgIcon(path: string, size = 24): SVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.innerHTML = path;
  return svg;
}
