/**
 * Getting a phone photo of a receipt into the shape OCR wants.
 *
 * Until now the camera file went straight to tesseract, which is the worst of
 * both ends: a 12-megapixel photo is slow to recognise and no more legible for
 * it, while a receipt shot in a car at dusk is grey on grey. Thermal print is
 * the hardest case there is — thin strokes, low contrast, and a curl of paper
 * that shadows half of itself.
 *
 * Two steps, both conservative. Scale so the glyphs land near the height
 * tesseract is trained for, and stretch the contrast so the ink separates from
 * the paper. Deliberately *not* a third: no binarisation. Tesseract runs its
 * own Otsu internally, and a local threshold over thin thermal strokes erodes
 * them more often than it rescues them — the failure is silent and looks like
 * bad OCR rather than a bad choice made here.
 *
 * Reuses the decode approach in `image.ts`: `new Image()` over an object URL is
 * the path already proven on iOS for a file off the camera roll.
 */

/** Where tesseract reads best: roughly a 20-30px cap height on receipt print. */
const TARGET_LONG_EDGE = 2000;
/** Under this, upscaling is worth the blur — the glyphs are too small to read. */
const MIN_LONG_EDGE = 1200;
/**
 * iOS gives up on a canvas somewhere past 16.7M pixels and hands back a blank
 * one, with no error to catch. Stay far below it.
 */
const MAX_PIXELS = 4_000_000;

/** Ends of the histogram to clip. Enough to ignore a specular highlight. */
const CLIP_FRACTION = 0.02;
/**
 * A stretch needs something to stretch. Below this spread the image is either
 * blank or uniformly dark, and rescaling it only amplifies sensor noise into
 * something that looks like text.
 */
const MINIMUM_SPREAD = 32;

function scaleFor(width: number, height: number): number {
  const longEdge = Math.max(width, height);
  let scale = 1;
  if (longEdge > TARGET_LONG_EDGE) scale = TARGET_LONG_EDGE / longEdge;
  else if (longEdge < MIN_LONG_EDGE) scale = MIN_LONG_EDGE / longEdge;

  const area = width * scale * height * scale;
  if (area > MAX_PIXELS) scale = Math.sqrt(MAX_PIXELS / (width * height));
  return scale;
}

/**
 * Grey, then a percentile contrast stretch.
 *
 * The percentile matters: a true min/max stretch is decided by one blown-out
 * pixel and one shadow, so a single highlight on glossy paper would flatten the
 * whole receipt. Clipping the ends first means the stretch is set by the paper
 * and the ink rather than by outliers.
 */
function enhance(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  const histogram = new Uint32Array(256);

  for (let i = 0; i < data.length; i += 4) {
    // Rec. 601 luma. Receipt ink is neutral, so a weighted grey loses nothing
    // and keeps a coloured store logo from reading as darker than it prints.
    const luma = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000 | 0;
    data[i] = data[i + 1] = data[i + 2] = luma;
    histogram[luma]++;
  }

  const clip = width * height * CLIP_FRACTION;
  let low = 0;
  let high = 255;

  for (let value = 0, seen = 0; value < 256; value++) {
    seen += histogram[value];
    if (seen >= clip) { low = value; break; }
  }
  for (let value = 255, seen = 0; value >= 0; value--) {
    seen += histogram[value];
    if (seen >= clip) { high = value; break; }
  }

  if (high - low >= MINIMUM_SPREAD) {
    const span = high - low;
    const lut = new Uint8Array(256);
    for (let value = 0; value < 256; value++) {
      lut[value] = Math.max(0, Math.min(255, Math.round(((value - low) / span) * 255)));
    }
    for (let i = 0; i < data.length; i += 4) {
      const stretched = lut[data[i]];
      data[i] = data[i + 1] = data[i + 2] = stretched;
    }
  }

  ctx.putImageData(image, 0, 0);
}

function decode(image: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(image);
    const done = (fn: () => void) => { URL.revokeObjectURL(objectUrl); fn(); };
    img.onload = () => done(() => resolve(img));
    img.onerror = () => done(() => reject(new Error('Couldn’t read that photo.')));
    img.src = objectUrl;
  });
}

/**
 * The photo, ready to recognise.
 *
 * Returns a canvas rather than a re-encoded file: tesseract's `ImageLike`
 * accepts one directly, and a JPEG round trip would ring every glyph edge with
 * exactly the artefacts OCR trips over.
 */
export async function prepareReceiptImage(image: File | Blob): Promise<HTMLCanvasElement> {
  const img = await decode(image);
  const scale = scaleFor(img.naturalWidth, img.naturalHeight);

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('No 2D context');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  enhance(ctx, canvas.width, canvas.height);

  return canvas;
}
