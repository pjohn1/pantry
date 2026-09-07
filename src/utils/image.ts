/**
 * Canvas re-encoding for the two kinds of cover a saved idea can have: one the
 * user picked off their camera roll, and one fetched from the link's own
 * source.
 *
 * Both end as a JPEG data URL in IndexedDB rather than as a remote address.
 * That is the point: the Saved tab is read while deciding what to cook, which
 * is exactly when a phone is least likely to have signal, and a social CDN's
 * thumbnail URL expires — which is why cards saved months ago show nothing
 * today.
 */

/** Long enough for a slow CDN, short enough not to strand a background pass. */
const LOAD_TIMEOUT_MS = 8000;

function drawToDataUrl(img: HTMLImageElement, maxSize: number, quality: number): string {
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2D context');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}

/**
 * A photo or screenshot the user chose. 600px because this one is also what
 * the full-screen view shows.
 */
export function coverFromFile(file: File, maxSize = 600): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    const done = (fn: () => void) => { URL.revokeObjectURL(objectUrl); fn(); };
    img.onload = () => {
      try {
        const out = drawToDataUrl(img, maxSize, 0.8);
        done(() => resolve(out));
      } catch (err) {
        done(() => reject(err));
      }
    };
    img.onerror = () => done(() => reject(new Error('Couldn’t read that image.')));
    img.src = objectUrl;
  });
}

/**
 * A cover fetched from the link's own source.
 *
 * `crossOrigin = 'anonymous'` is load-bearing rather than defensive: without
 * it a cross-origin image paints happily but taints the canvas, and
 * `toDataURL()` then throws `SecurityError`. Requesting CORS up front means a
 * host that refuses fails at load, where the caller can fall back to keeping
 * the remote address instead of getting a surprise mid-encode.
 *
 * 400px is ample — the tile draws at 56px, so even a 3× display asks for 168.
 */
export function coverFromUrl(url: string, maxSize = 400): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';

    const timer = setTimeout(() => {
      img.src = '';
      reject(new Error('Timed out'));
    }, LOAD_TIMEOUT_MS);

    img.onload = () => {
      clearTimeout(timer);
      // A login-page redirect or an expired link often still resolves, as a
      // 1px tracking pixel or an error sprite. Neither is a cover.
      if (img.naturalWidth < 64 || img.naturalHeight < 64) {
        reject(new Error('Too small to be a cover'));
        return;
      }
      try {
        resolve(drawToDataUrl(img, maxSize, 0.72));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => {
      clearTimeout(timer);
      reject(new Error('Couldn’t load that image.'));
    };

    img.src = url;
  });
}

/**
 * Whether an address paints at all, ignoring CORS. Used for the sources that
 * will never allow a canvas read, where the honest outcome is to keep the
 * remote URL and let an `<img>` do what only an `<img>` can.
 */
export function imageLoads(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    const timer = setTimeout(() => { img.src = ''; resolve(false); }, LOAD_TIMEOUT_MS);
    img.onload = () => {
      clearTimeout(timer);
      resolve(img.naturalWidth >= 64 && img.naturalHeight >= 64);
    };
    img.onerror = () => { clearTimeout(timer); resolve(false); };
    img.src = url;
  });
}
