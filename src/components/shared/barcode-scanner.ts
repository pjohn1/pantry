import { el, on } from '../../utils/dom';
import { openModal } from './modal';
import { isBarcodeDetectorSupported, lookupBarcode } from '../../services/barcode.service';
import type { BarcodeLookup } from '../../services/barcode.service';
import type { ItemCategory } from '../../models/types';

// BarcodeDetector Web API (not yet in TypeScript lib)
declare class BarcodeDetector {
  constructor(options?: { formats?: string[] });
  detect(source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement | ImageBitmap): Promise<Array<{ rawValue: string }>>;
}

const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code', 'code_128', 'code_39'];

export function openBarcodeScanner(onResult: (name: string, category: ItemCategory) => void): void {
  let stream: MediaStream | null = null;
  let animFrame: number | null = null;
  let scanning = false;
  // Set the instant we commit to handing a product back, so the teardown that
  // follows is not mistaken for the user walking away.
  let handingOff = false;
  let dismissed = false;
  const lookupAbort = new AbortController();

  function stopCamera() {
    scanning = false;
    if (animFrame !== null) {
      cancelAnimationFrame(animFrame);
      animFrame = null;
    }
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
  }

  openModal('Scan Barcode', (body, close) => {
    if (!isBarcodeDetectorSupported()) {
      body.appendChild(el('div', { className: 'barcode-unsupported' },
        'This browser can’t scan barcodes. Safari 17 or later, or Chrome, can — or add the item by hand.',
      ));
      const manual = el('button', { className: 'btn btn-primary btn-block' }, 'Add by hand');
      on(manual, 'click', () => {
        handingOff = true;
        close();
        onResult('', 'other');
      });
      body.appendChild(manual);
      return;
    }

    // Viewfinder
    const viewfinder = el('div', { className: 'barcode-viewfinder' });
    const video = el('video', { autoplay: '', playsinline: '', muted: '' }) as HTMLVideoElement;
    video.muted = true;
    video.className = 'barcode-video';
    const crosshair = el('div', { className: 'barcode-crosshair' });
    viewfinder.appendChild(video);
    viewfinder.appendChild(crosshair);

    const status = el('div', { className: 'barcode-status', role: 'status', 'aria-live': 'polite' },
      'Point the camera at a barcode');

    // Every state of this sheet keeps a way out and a way forward.
    const actions = el('div', { className: 'input-row' });
    const manualBtn = el('button', { className: 'btn btn-secondary' }, 'Add by hand');
    const retryBtn = el('button', { className: 'btn btn-primary' }, 'Scan again');
    retryBtn.hidden = true;
    on(manualBtn, 'click', () => {
      handingOff = true;
      close();
      onResult('', 'other');
    });
    on(retryBtn, 'click', () => {
      retryBtn.hidden = true;
      crosshair.classList.remove('barcode-crosshair-found');
      status.textContent = 'Point the camera at a barcode';
      runDetectionLoop();
    });
    actions.appendChild(manualBtn);
    actions.appendChild(retryBtn);

    body.appendChild(viewfinder);
    body.appendChild(status);
    body.appendChild(actions);

    function fail(message: string) {
      if (dismissed) return;
      status.textContent = message;
      crosshair.classList.remove('barcode-crosshair-found');
      retryBtn.hidden = false;
    }

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (dismissed) {
          // Permission dialogs are slow; the user may already be gone.
          stopCamera();
          return;
        }
        video.srcObject = stream;
        await video.play();
        runDetectionLoop();
      } catch {
        status.textContent = 'Camera access is off. Allow it in Settings, or add the item by hand.';
        retryBtn.hidden = false;
      }
    }

    function runDetectionLoop() {
      const detector = new BarcodeDetector({ formats: FORMATS });
      scanning = true;

      async function tick() {
        if (!scanning || dismissed) return;
        try {
          const results = await detector.detect(video);
          if (results.length > 0) {
            const code = results[0].rawValue;
            scanning = false;
            if (animFrame !== null) cancelAnimationFrame(animFrame);
            // Deliberately no success styling yet: the barcode is read, but
            // whether it names a product is still unknown. Painting the
            // crosshair green here is a promise the lookup may not keep.
            status.textContent = 'Looking up product…';
            await resolveCode(code);
            return;
          }
        } catch {
          // detect() can throw on individual frames; keep scanning.
        }
        animFrame = requestAnimationFrame(tick);
      }

      animFrame = requestAnimationFrame(tick);
    }

    async function resolveCode(code: string) {
      const result: BarcodeLookup = await lookupBarcode(code, lookupAbort.signal);

      // The lookup can settle long after the sheet is gone. Handing a result
      // to the caller now would open a form the user never asked for.
      if (dismissed) return;

      switch (result.kind) {
        case 'found':
          crosshair.classList.add('barcode-crosshair-found');
          status.textContent = result.name;
          handingOff = true;
          stopCamera();
          close();
          onResult(result.name, result.category);
          return;
        case 'unknown':
          fail('Not in the product database. Add it by hand, or scan a different item.');
          return;
        case 'offline':
          fail('No connection to the product database. Add it by hand — the name is all this needs.');
          return;
        case 'unavailable':
          fail(`The product database is unavailable (${result.status}). Add it by hand, or try again.`);
          return;
        case 'cancelled':
          return;
      }
    }

    startCamera();
  }, {
    onClose: () => {
      dismissed = !handingOff;
      stopCamera();
      lookupAbort.abort();
    },
  });
}
