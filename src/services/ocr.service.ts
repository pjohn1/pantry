import type { Worker } from 'tesseract.js';

/**
 * Receipt OCR, from this origin only.
 *
 * tesseract.js fetches its worker, its WASM core and its language data at
 * first use, and by default it fetches them from a third-party CDN. That made
 * the one feature whose whole point is "don't type it" the one feature that
 * could not run without a connection — in a supermarket car park, which is
 * exactly where a receipt gets photographed. PRODUCT.md allows two networked
 * features and this was a third. The assets are vendored under
 * `public/tesseract/` and precached by the service worker instead.
 *
 * The library itself is imported dynamically: it is a megabyte of wrapper that
 * only the shopping list's receipt button ever needs, and it used to sit in
 * the bundle that has to parse before the first row paints.
 */
const ASSETS = `${import.meta.env.BASE_URL}tesseract`;

let worker: Worker | null = null;
let onProgress: ((fraction: number) => void) | null = null;

async function getWorker(): Promise<Worker> {
  if (worker) return worker;
  const { createWorker } = await import('tesseract.js');
  worker = await createWorker('eng', 1, {
    workerPath: `${ASSETS}/worker.min.js`,
    corePath: `${ASSETS}/core`,
    langPath: `${ASSETS}/lang`,
    // Recognition is the long half; loading is reported too, so the panel has
    // something honest to say from the first second.
    logger: (m: { status: string; progress: number }) => {
      if (!onProgress) return;
      if (m.status === 'recognizing text') onProgress(0.25 + m.progress * 0.75);
      else onProgress(Math.min(0.24, m.progress * 0.24));
    },
  });
  return worker;
}

export interface OcrOptions {
  /** 0–1. Called often; the caller is expected to throttle its own paint. */
  onProgress?: (fraction: number) => void;
}

export async function extractReceiptLinesFromImage(
  image: File | Blob,
  options: OcrOptions = {},
): Promise<string[]> {
  onProgress = options.onProgress ?? null;
  const w = await getWorker();
  const url = URL.createObjectURL(image);
  try {
    const result = await w.recognize(url, {}, { text: true });
    return result.data.text
      .split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => line.length >= 2);
  } finally {
    URL.revokeObjectURL(url);
    onProgress = null;
  }
}

/**
 * Stops a scan in progress. The worker is destroyed rather than paused —
 * tesseract has no cancel — so the next scan pays the load cost again. That is
 * the right trade for a control that has to actually work: a Cancel that
 * leaves the phone grinding for another twenty seconds is not a Cancel.
 */
export async function cancelReceiptScan(): Promise<void> {
  const w = worker;
  worker = null;
  onProgress = null;
  if (w) await w.terminate().catch(() => {});
}
