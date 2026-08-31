/**
 * Image Comparison Engine - pixelmatch visual diff for plan versions.
 * Local-first, no backend. Compares plan versions, detects changes,
 * highlights differences with configurable thresholds.
 */

import pixelmatch from 'pixelmatch';

export interface ImageDataLike {
  width: number;
  height: number;
  data: Uint8Array | Uint8ClampedArray;
}

export interface CompareOptions {
  /** Threshold for pixel difference (0-1). Default 0.1. */
  threshold?: number;
  /** Include anti-aliasing in comparison. Default true. */
  includeAA?: boolean;
  /** Alpha channel threshold (0-255). Default 0. */
  alpha?: number;
  /** Color difference algorithm. Default 'rgb'. */
  colorDelta?: 'rgb' | 'lab';
  /** Ignore specific colors (hex strings). */
  ignoreColors?: string[];
  /** Minimum diff area to report (pixels). Default 10. */
  minDiffArea?: number;
  /** Output diff image with highlighted changes. */
  outputDiff?: boolean;
  /** Diff color (R, G, B, A). Default red [255, 0, 0, 255]. */
  diffColor?: [number, number, number, number];
  /** Diff mask color for unchanged pixels. Default transparent. */
  unchangedColor?: [number, number, number, number];
}

export interface DiffResult {
  /** Number of different pixels. */
  diffPixels: number;
  /** Percentage of different pixels (0-100). */
  diffPercent: number;
  /** Whether images are considered same (diffPercent < threshold). */
  isSame: boolean;
  /** Bounding boxes of difference regions. */
  diffRegions: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    pixelCount: number;
  }>;
  /** Diff image data (if outputDiff=true). */
  diffImage?: ImageDataLike;
  /** Comparison metadata. */
  metadata: {
    width: number;
    height: number;
    threshold: number;
    timestamp: string;
  };
}

export interface PlanDiffResult extends DiffResult {
  /** Categorized changes. */
  changes: {
    /** Added elements (new walls, rooms, annotations). */
    additions: Array<{ x: number; y: number; width: number; height: number }>;
    /** Removed elements (demolished walls, removed rooms). */
    removals: Array<{ x: number; y: number; width: number; height: number }>;
    /** Modified elements (moved walls, resized rooms). */
    modifications: Array<{
      from: { x: number; y: number; width: number; height: number };
      to: { x: number; y: number; width: number; height: number };
    }>;
    /** Annotation changes (text, dimensions, labels). */
    annotations: Array<{ x: number; y: number; type: 'text' | 'dimension' | 'label' }>;
  };
  /** Change summary. */
  summary: {
    totalChanges: number;
    structuralChanges: number;
    annotationChanges: number;
    cosmeticChanges: number;
  };
}

/**
 * Load image from various sources into ImageData format.
 */
export async function loadImageData(
  source: File | Blob | HTMLImageElement | HTMLCanvasElement | string
): Promise<ImageDataLike> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      resolve({
        width: img.width,
        height: img.height,
        data: imageData.data,
      });
    };

    img.onerror = () => reject(new Error('Failed to load image'));

    if (typeof source === 'string') {
      img.src = source;
    } else if (source instanceof File || source instanceof Blob) {
      img.src = URL.createObjectURL(source);
    } else if (source instanceof HTMLImageElement) {
      img.src = source.src;
    } else if (source instanceof HTMLCanvasElement) {
      const ctx = source.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      const imageData = ctx.getImageData(0, 0, source.width, source.height);
      resolve({
        width: source.width,
        height: source.height,
        data: imageData.data,
      });
      return;
    }
  });
}

/**
 * Compare two images using pixelmatch.
 */
export async function compareImages(
  imageA: File | Blob | HTMLImageElement | HTMLCanvasElement | string,
  imageB: File | Blob | HTMLImageElement | HTMLCanvasElement | string,
  options: CompareOptions = {}
): Promise<DiffResult> {
  const [imgA, imgB] = await Promise.all([
    loadImageData(imageA),
    loadImageData(imageB),
  ]);

  if (imgA.width !== imgB.width || imgA.height !== imgB.height) {
    throw new Error(
      `Image dimensions mismatch: ${imgA.width}x${imgA.height} vs ${imgB.width}x${imgB.height}`
    );
  }

  const width = imgA.width;
  const height = imgA.height;
  const threshold = options.threshold ?? 0.1;
  const includeAA = options.includeAA ?? true;
  const alpha = options.alpha ?? 0;

  const diffData = new Uint8Array(width * height * 4);
  const diffPixels = pixelmatch(
    imgA.data,
    imgB.data,
    diffData,
    width,
    height,
    {
      threshold,
      includeAA,
      alpha,
      diffColor: options.diffColor ?? [255, 0, 0, 255],
      unchangedColor: options.unchangedColor ?? [0, 0, 0, 0],
    }
  );

  const diffPercent = (diffPixels / (width * height)) * 100;
  const isSame = diffPercent < (threshold * 100);

  // Find diff regions (connected components)
  const diffRegions = findDiffRegions(diffData, width, height, options.minDiffArea ?? 10);

  const result: DiffResult = {
    diffPixels,
    diffPercent,
    isSame,
    diffRegions,
    metadata: {
      width,
      height,
      threshold,
      timestamp: new Date().toISOString(),
    },
  };

  if (options.outputDiff) {
    result.diffImage = {
      width,
      height,
      data: diffData,
    };
  }

  return result;
}

/**
 * Find connected diff regions using flood fill.
 */
function findDiffRegions(
  diffData: Uint8Array,
  width: number,
  height: number,
  minArea: number
): DiffResult['diffRegions'] {
  const visited = new Uint8Array(width * height);
  const regions: DiffResult['diffRegions'] = [];

  const getIndex = (x: number, y: number) => y * width + x;
  const isDiff = (x: number, y: number) => {
    const idx = getIndex(x, y) * 4;
    return diffData[idx] > 0 || diffData[idx + 1] > 0 || diffData[idx + 2] > 0;
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = getIndex(x, y);
      if (visited[idx] || !isDiff(x, y)) continue;

      // Flood fill to find connected region
      const queue: Array<{ x: number; y: number }> = [{ x, y }];
      visited[idx] = 1;
      let minX = x, maxX = x, minY = y, maxY = y;
      let pixelCount = 0;

      while (queue.length > 0) {
        const { x: cx, y: cy } = queue.shift()!;
        pixelCount++;
        minX = Math.min(minX, cx);
        maxX = Math.max(maxX, cx);
        minY = Math.min(minY, cy);
        maxY = Math.max(maxY, cy);

        // Check 4-connected neighbors
        for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          const nx = cx + dx, ny = cy + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const nIdx = getIndex(nx, ny);
            if (!visited[nIdx] && isDiff(nx, ny)) {
              visited[nIdx] = 1;
              queue.push({ x: nx, y: ny });
            }
          }
        }
      }

      if (pixelCount >= minArea) {
        regions.push({
          x: minX,
          y: minY,
          width: maxX - minX + 1,
          height: maxY - minY + 1,
          pixelCount,
        });
      }
    }
  }

  return regions;
}

/**
 * Compare two plan images and categorize changes.
 */
export async function comparePlans(
  planA: File | Blob | HTMLImageElement | HTMLCanvasElement | string,
  planB: File | Blob | HTMLImageElement | HTMLCanvasElement | string,
  options: CompareOptions = {}
): Promise<PlanDiffResult> {
  const baseResult = await compareImages(planA, planB, options);

  // Categorize diff regions into change types
  const additions: PlanDiffResult['changes']['additions'] = [];
  const removals: PlanDiffResult['changes']['removals'] = [];
  const modifications: PlanDiffResult['changes']['modifications'] = [];
  const annotations: PlanDiffResult['changes']['annotations'] = [];

  // Simple heuristic: classify based on diff region properties
  // In production, this would use more sophisticated analysis
  for (const region of baseResult.diffRegions) {
    // Simple classification based on region size and position
    const area = region.width * region.height;
    if (area < 100) {
      annotations.push({ x: region.x, y: region.y, type: 'label' });
    } else if (area < 1000) {
      // Could be dimension line or small annotation
      annotations.push({ x: region.x, y: region.y, type: 'dimension' });
    } else {
      // Larger regions - could be structural
      modifications.push({
        from: { x: region.x, y: region.y, width: region.width, height: region.height },
        to: { x: region.x, y: region.y, width: region.width, height: region.height },
      });
    }
  }

  const totalChanges = baseResult.diffRegions.length;
  const structuralChanges = modifications.length;
  const annotationChanges = annotations.length;
  const cosmeticChanges = totalChanges - structuralChanges - annotationChanges;

  return {
    ...baseResult,
    changes: {
      additions,
      removals,
      modifications,
      annotations,
    },
    summary: {
      totalChanges,
      structuralChanges,
      annotationChanges,
      cosmeticChanges,
    },
  };
}

/**
 * Create a diff visualization canvas.
 */
export function createDiffCanvas(
  diffResult: DiffResult,
  originalImage?: ImageDataLike
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = diffResult.metadata.width;
  canvas.height = diffResult.metadata.height;
  const ctx = canvas.getContext('2d')!;

  if (originalImage) {
    ctx.putImageData(
      new ImageData(
        new Uint8ClampedArray(originalImage.data),
        originalImage.width,
        originalImage.height
      ),
      0,
      0
    );
  }

  if (diffResult.diffImage) {
    ctx.putImageData(
      new ImageData(
        new Uint8ClampedArray(diffResult.diffImage.data),
        diffResult.diffImage.width,
        diffResult.diffImage.height
      ),
      0,
      0
    );
  }

  return canvas;
}

/**
 * Generate a visual diff report as base64 PNG.
 */
export async function generateDiffReport(
  diffResult: DiffResult,
  originalImage?: ImageDataLike
): Promise<string> {
  const canvas = createDiffCanvas(diffResult, originalImage);
  return canvas.toDataURL('image/png');
}

/**
 * Batch compare multiple plan versions.
 */
export async function comparePlanVersions(
  versions: Array<File | Blob | HTMLImageElement | HTMLCanvasElement | string>,
  options: CompareOptions = {}
): Promise<PlanDiffResult[]> {
  const results: PlanDiffResult[] = [];

  for (let i = 1; i < versions.length; i++) {
    const diff = await comparePlans(versions[i - 1], versions[i], options);
    results.push(diff);
  }

  return results;
}

/**
 * Calculate similarity score between two images (0-1).
 */
export function calculateSimilarity(diffResult: DiffResult): number {
  return 1 - diffResult.diffPercent / 100;
}

/**
 * Create a side-by-side comparison image.
 */
export function createSideBySide(
  imageA: ImageDataLike,
  imageB: ImageDataLike,
  diffResult?: DiffResult
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const gap = 10;
  canvas.width = imageA.width * 2 + gap + (diffResult ? diffResult.metadata.width + gap : 0);
  canvas.height = Math.max(imageA.height, imageB.height, diffResult?.metadata.height ?? 0);

  const ctx = canvas.getContext('2d')!;

  // Image A
  ctx.putImageData(
    new ImageData(new Uint8ClampedArray(imageA.data), imageA.width, imageA.height),
    0,
    0
  );

  // Gap
  // Image B
  ctx.putImageData(
    new ImageData(new Uint8ClampedArray(imageB.data), imageB.width, imageB.height),
    imageA.width + gap,
    0
  );

  // Diff (if provided)
  if (diffResult && diffResult.diffImage) {
    ctx.putImageData(
      new ImageData(new Uint8ClampedArray(diffResult.diffImage.data), diffResult.diffImage.width, diffResult.diffImage.height),
      imageA.width * 2 + gap * 2,
      0
    );
  }

  return canvas;
}