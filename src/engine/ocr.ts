/**
 * OCR Engine - Tesseract.js image-to-text extraction for scanned plans.
 * Local WASM, no backend. Extracts text from scanned construction plans,
 * architectural drawings, and site photos.
 */

import { createWorker, PSM, OEM, Rectangle } from 'tesseract.js';

export interface OcrOptions {
  /** Language(s) for OCR. Default 'eng'. */
  lang?: string;
  /** Page segmentation mode. Default PSM.AUTO. */
  psm?: PSM;
  /** OCR Engine Mode. Default OEM.LSTM_ONLY. */
  oem?: OEM;
  /** Region of interest to extract text from. */
  rectangle?: Rectangle;
  /** Logger callback for progress. */
  logger?: (m: { status: string; progress: number }) => void;
  /** Whether to use cached worker. Default true. */
  cacheWorker?: boolean;
}

export interface OcrResult {
  /** Extracted text. */
  text: string;
  /** Confidence score (0-100). */
  confidence: number;
  /** Detected language. */
  language: string;
  /** Word-level results with bounding boxes. */
  words: Array<{
    text: string;
    confidence: number;
    bbox: { x0: number; y0: number; x1: number; y1: number };
  }>;
  /** Line-level results. */
  lines: Array<{
    text: string;
    confidence: number;
    bbox: { x0: number; y0: number; x1: number; y1: number };
  }>;
  /** Paragraph-level results. */
  paragraphs: Array<{
    text: string;
    confidence: number;
    bbox: { x0: number; y0: number; x1: number; y1: number };
  }>;
  /** Raw Tesseract data. */
  raw: unknown;
}

export interface PlanOcrResult extends OcrResult {
  /** Extracted dimensions from plan text. */
  dimensions: Array<{
    label: string;
    value: number;
    unit: string;
    rawText: string;
  }>;
  /** Detected room labels. */
  roomLabels: string[];
  /** Detected material specifications. */
  materials: string[];
}

/** Global worker cache for reuse. */
let workerCache: Awaited<ReturnType<typeof createWorker>> | null = null;

/**
 * Initialize or reuse Tesseract worker.
 */
async function getWorker(options: OcrOptions = {}): Promise<Awaited<ReturnType<typeof createWorker>>> {
  if (workerCache && options.cacheWorker !== false) {
    return workerCache;
  }

  const worker = await createWorker({
    logger: options.logger ?? (() => {}),
    errorHandler: (err) => console.error('[OCR] Worker error:', err),
  });

  await worker.loadLanguage(options.lang ?? 'eng');
  await worker.initialize(options.lang ?? 'eng', options.oem ?? OEM.LSTM_ONLY);
  await worker.setParameters({
    tessedit_pageseg_mode: options.psm ?? PSM.AUTO,
  });

  if (options.cacheWorker !== false) {
    workerCache = worker;
  }

  return worker;
}

/**
 * Extract text from an image (File, Blob, HTMLImageElement, HTMLCanvasElement, or data URL).
 */
export async function extractText(
  image: File | Blob | HTMLImageElement | HTMLCanvasElement | string,
  options: OcrOptions = {}
): Promise<OcrResult> {
  const worker = await getWorker(options);

  if (options.rectangle) {
    await worker.setRectangle(options.rectangle);
  }

  const { data } = await worker.recognize(image);

  return {
    text: data.text,
    confidence: data.confidence,
    language: data.language ?? (options.lang ?? 'eng'),
    words: data.words.map((w) => ({
      text: w.text,
      confidence: w.confidence,
      bbox: {
        x0: w.bbox.x0,
        y0: w.bbox.y0,
        x1: w.bbox.x1,
        y1: w.bbox.y1,
      },
    })),
    lines: data.lines.map((l) => ({
      text: l.text,
      confidence: l.confidence,
      bbox: {
        x0: l.bbox.x0,
        y0: l.bbox.y0,
        x1: l.bbox.x1,
        y1: l.bbox.y1,
      },
    })),
    paragraphs: data.paragraphs.map((p) => ({
      text: p.text,
      confidence: p.confidence,
      bbox: {
        x0: p.bbox.x0,
        y0: p.bbox.y0,
        x1: p.bbox.x1,
        y1: p.bbox.y1,
      },
    })),
    raw: data,
  };
}

/**
 * Extract text specifically from a construction plan image.
 * Parses dimensions, room labels, and material specs.
 */
export async function extractPlanText(
  image: File | Blob | HTMLImageElement | HTMLCanvasElement | string,
  options: OcrOptions = {}
): Promise<PlanOcrResult> {
  const baseResult = await extractText(image, options);

  // Extract dimension patterns (e.g., "3.5m", "2.4m", "10'0\"", "3000mm")
  const dimensionRegex = /(\d+(?:\.\d+)?)\s*(?:m|mm|cm|ft|'|"|in)\b/gi;
  const dimensionMatches = baseResult.text.matchAll(dimensionRegex);

  const dimensions: PlanOcrResult['dimensions'] = [];
  for (const match of dimensionMatches) {
    const rawText = match[0];
    const valueStr = match[1];
    const value = parseFloat(valueStr);
    const unit = rawText.replace(valueStr, '').trim() || 'm';
    dimensions.push({
      label: `dimension_${dimensions.length + 1}`,
      value,
      unit,
      rawText,
    });
  }

  // Extract room labels (capitalized words, often room names)
  const roomLabelRegex = /\b(?:Bedroom|Bathroom|Kitchen|Living|Dining|Office|Study|Hall|Corridor|Garage|Store|Utility|WC|Toilet|Ensuite|Master|Guest|Laundry|Pantry|Balcony|Veranda|Porch|Terrace)\b/gi;
  const roomLabels = [...new Set(baseResult.text.match(roomLabelRegex)?.map((r) => r.toLowerCase()) ?? [])];

  // Extract material specifications
  const materialRegex = /\b(?:concrete|brick|block|steel|timber|wood|glass|tile|plaster|cement|sand|aggregate|rebar|mesh|insulation|membrane|waterproofing|damp-proof|course|DPC|DPM|screed|render|paint|varnish|stain|sealant|adhesive|grout|mortar|cement:sand|1:3|1:4|1:5|1:6|M10|M15|M20|M25|M30|C20|C25|C30|C35|C40)\b/gi;
  const materials = [...new Set(baseResult.text.match(materialRegex)?.map((m) => m.toLowerCase()) ?? [])];

  return {
    ...baseResult,
    dimensions,
    roomLabels,
    materials,
  };
}

/**
 * Extract text from multiple images (batch processing).
 */
export async function extractBatch(
  images: Array<File | Blob | HTMLImageElement | HTMLCanvasElement | string>,
  options: OcrOptions = {}
): Promise<OcrResult[]> {
  const results: OcrResult[] = [];
  for (const image of images) {
    const result = await extractText(image, options);
    results.push(result);
  }
  return results;
}

/**
 * Terminate the cached worker to free resources.
 */
export async function terminateWorker(): Promise<void> {
  if (workerCache) {
    await workerCache.terminate();
    workerCache = null;
  }
}

/**
 * Check if Tesseract.js is available (WASM loaded).
 */
export async function isOcrAvailable(): Promise<boolean> {
  try {
    const worker = await createWorker();
    await worker.terminate();
    return true;
  } catch {
    return false;
  }
}

/** Pre-trained model paths for offline use. */
export const MODEL_PATHS = {
  eng: 'eng.traineddata',
  afr: 'afr.traineddata',
  // Add more languages as needed
} as const;

/**
 * Load custom trained data for specialized plan reading.
 * Place traineddata files in public/tessdata/ or provide custom path.
 */
export async function loadCustomTrainedData(
  lang: string,
  dataUrl: string
): Promise<void> {
  const worker = await getWorker({ lang });
  await worker.loadLanguage(lang, dataUrl);
  await worker.initialize(lang);
}