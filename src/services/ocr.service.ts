import Tesseract from 'tesseract.js';

let worker: Tesseract.Worker | null = null;

async function getWorker(): Promise<Tesseract.Worker> {
  if (!worker) {
    worker = await Tesseract.createWorker('eng');
  }
  return worker;
}

export async function extractReceiptLinesFromImage(
  image: File | Blob,
): Promise<string[]> {
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
  }
}
