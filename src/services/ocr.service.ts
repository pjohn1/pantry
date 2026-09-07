import type { Worker, PSM } from 'tesseract.js';
import { prepareReceiptImage } from '../utils/receipt-image';
import { linesFromOcr, type OcrLine } from '../utils/receipt-text';

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
 *
 * The photo is preprocessed before it gets here, and tesseract is told what it
 * is looking at rather than left to guess a page layout. See RECEIPT_PARAMS.
 */
const ASSETS = `${import.meta.env.BASE_URL}tesseract`;

/** Where loading hands over to preprocessing, and preprocessing to reading. */
const LOAD_TO = 0.15;
const RECOGNISE_FROM = 0.25;

/**
 * What tesseract is being shown.
 *
 * Left to itself it uses PSM 3, full automatic page segmentation, which hunts
 * for page regions and finds them: a receipt gets carved into pieces and the
 * lines come back interleaved. Mode 4 — one column, variable sizes — is the
 * honest description of a till roll, and it keeps a row of item-then-price
 * together, which matters because the price is the anchor the parser reads.
 *
 * Interword spaces are preserved for the same reason: the wide gap before the
 * price is load-bearing information, not formatting.
 *
 * No character whitelist. It is a tempting knob and a trap — it degrades the
 * LSTM decoder rather than constraining it, and every glyph it excludes is one
 * the parser then cannot see. OEM 1 (LSTM only, set at `createWorker`) is
 * right for this, and the vendored `eng.traineddata.gz` carries the model.
 */
const RECEIPT_PARAMS = {
  // `PSM.SINGLE_COLUMN`, spelled as its value. The enum is a runtime export,
  // and importing it for one string would pull tesseract into the eager bundle
  // that the dynamic import above exists to keep it out of.
  tessedit_pageseg_mode: '4' as PSM,
  preserve_interword_spaces: '1',
  // A photo has no meaningful DPI. Saying so stops tesseract inferring one
  // from the pixel dimensions and rescaling against a guess.
  user_defined_dpi: '300',
};

let worker: Worker | null = null;
let onProgress: ((fraction: number) => void) | null = null;

async function getWorker(): Promise<Worker> {
  if (worker) return worker;
  const { createWorker } = await import('tesseract.js');
  // Built into a local and published only once it is configured: a worker
  // cached before `setParameters` ran would be reused, unconfigured, by every
  // scan after the one that failed.
  const created = await createWorker('eng', 1, {
    workerPath: `${ASSETS}/worker.min.js`,
    corePath: `${ASSETS}/core`,
    langPath: `${ASSETS}/lang`,
    // Recognition is the long half; loading is reported too, so the panel has
    // something honest to say from the first second. Preprocessing sits in the
    // gap between them, which is why loading now stops short of 0.15.
    logger: (m: { status: string; progress: number }) => {
      if (!onProgress) return;
      if (m.status === 'recognizing text') onProgress(RECOGNISE_FROM + m.progress * (1 - RECOGNISE_FROM));
      else onProgress(Math.min(LOAD_TO, m.progress * LOAD_TO));
    },
  });
  await created.setParameters(RECEIPT_PARAMS);
  worker = created;
  return created;
}

export interface OcrOptions {
  /** 0–1. Called often; the caller is expected to throttle its own paint. */
  onProgress?: (fraction: number) => void;
}

export async function extractReceiptLinesFromImage(
  image: File | Blob,
  options: OcrOptions = {},
): Promise<OcrLine[]> {
  onProgress = options.onProgress ?? null;
  try {
    const w = await getWorker();

    // Preprocessing is cheap next to recognition but not free, and it happens
    // after the worker has loaded, so it owns the slice between the two.
    onProgress?.(LOAD_TO);
    let source: HTMLCanvasElement | Blob;
    try {
      source = await prepareReceiptImage(image);
    } catch {
      // A photo canvas can fail for reasons that are not the photo's fault —
      // an iOS memory ceiling, a format the decoder refuses. Reading the
      // original badly beats refusing to read it at all.
      source = image;
    }
    onProgress?.(RECOGNISE_FROM);

    const result = await w.recognize(source, {}, { text: true, blocks: true });
    return linesFromOcr(result.data);
  } finally {
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
