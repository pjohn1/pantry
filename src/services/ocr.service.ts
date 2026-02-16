import Tesseract from 'tesseract.js';

let worker: Tesseract.Worker | null = null;

async function getWorker(): Promise<Tesseract.Worker> {
  if (!worker) {
    worker = await Tesseract.createWorker('eng');
  }
  return worker;
}

export async function extractTextFromImage(
  image: File | Blob,
  onProgress?: (progress: number) => void
): Promise<string[]> {
  const w = await getWorker();

  // Convert to image URL for tesseract
  const url = URL.createObjectURL(image);

  try {
    const result = await w.recognize(url, {}, {
      text: true,
    });

    if (onProgress) onProgress(1);

    const text = result.data.text;

    // Split into lines and clean up
    const lines = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => {
        if (!line) return false;
        if (line.length < 2) return false;
        // Filter out common non-ingredient lines
        const lower = line.toLowerCase();
        if (lower === 'ingredients' || lower === 'ingredients:') return false;
        if (lower === 'directions' || lower === 'instructions') return false;
        if (lower.startsWith('step ')) return false;
        if (lower.startsWith('method')) return false;
        if (lower.startsWith('serves ') || lower.startsWith('yield')) return false;
        if (lower.startsWith('prep time') || lower.startsWith('cook time') || lower.startsWith('total time')) return false;
        return true;
      });

    return lines;
  } finally {
    URL.revokeObjectURL(url);
  }
}
