import { el } from '../../utils/dom';
import { openModal } from './modal';
import { isBarcodeDetectorSupported, lookupBarcode } from '../../services/barcode.service';
import type { ItemCategory } from '../../models/types';

// BarcodeDetector Web API (not yet in TypeScript lib)
declare class BarcodeDetector {
  constructor(options?: { formats?: string[] });
  detect(source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement | ImageBitmap): Promise<Array<{ rawValue: string }>>;
}

export function openBarcodeScanner(onResult: (name: string, category: ItemCategory) => void): void {
  openModal('Scan Barcode', (body, close) => {
    if (!isBarcodeDetectorSupported()) {
      const msg = el('div', { className: 'barcode-unsupported' },
        'Barcode scanning is not supported in this browser. Try Chrome or Safari 17+.'
      );
      body.appendChild(msg);
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

    const status = el('div', { className: 'barcode-status' }, 'Point camera at a barcode...');

    body.appendChild(viewfinder);
    body.appendChild(status);

    let stream: MediaStream | null = null;
    let animFrame: number | null = null;
    let active = true;

    function stopCamera() {
      active = false;
      if (animFrame !== null) {
        cancelAnimationFrame(animFrame);
        animFrame = null;
      }
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
        stream = null;
      }
    }

    // Stop camera when modal is closed
    const overlay = body.closest('.modal-overlay') as HTMLElement | null;
    if (overlay) {
      const obs = new MutationObserver(() => {
        if (!document.body.contains(overlay)) {
          stopCamera();
          obs.disconnect();
        }
      });
      obs.observe(document.body, { childList: true });
    }

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        video.srcObject = stream;
        await video.play();
        runDetectionLoop();
      } catch {
        status.textContent = 'Camera access denied. Please allow camera permissions and try again.';
      }
    }

    function runDetectionLoop() {
      const detector = new BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code', 'code_128', 'code_39'],
      });

      async function tick() {
        if (!active) return;
        try {
          const results = await detector.detect(video);
          if (results.length > 0) {
            const code = results[0].rawValue;
            active = false;
            if (animFrame !== null) cancelAnimationFrame(animFrame);
            status.textContent = 'Looking up product...';
            crosshair.classList.add('barcode-crosshair-found');
            const result = await lookupBarcode(code);
            stopCamera();
            close();
            onResult(result?.name ?? '', result?.category ?? 'other');
            return;
          }
        } catch {
          // detect() can throw on some frames; continue
        }
        animFrame = requestAnimationFrame(tick);
      }

      animFrame = requestAnimationFrame(tick);
    }

    startCamera();
  });
}
