export interface ImageCompareResult {
  totalPixels: number
  differentPixels: number
  mismatchPercentage: number
  dimensions: { width: number; height: number }
  threshold: number
}

export interface ImageCompareOptions {
  threshold?: number
  maxDimension?: number
}

function loadImage(source: string | File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))

    if (typeof source === 'string') {
      img.src = source
    } else {
      const url = URL.createObjectURL(source)
      img.onload = () => {
        URL.revokeObjectURL(url)
        resolve(img)
      }
      img.src = url
    }
  })
}

function imageToImageData(
  img: HTMLImageElement,
  maxDimension?: number,
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; width: number; height: number } {
  let { width, height } = img
  if (maxDimension && (width > maxDimension || height > maxDimension)) {
    const scale = maxDimension / Math.max(width, height)
    width = Math.round(width * scale)
    height = Math.round(height * scale)
  }
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, width, height)
  return { canvas, ctx, width, height }
}

export async function compareImages(
  source1: string | File | Blob,
  source2: string | File | Blob,
  options?: ImageCompareOptions,
): Promise<ImageCompareResult> {
  const threshold = options?.threshold ?? 0.1
  const [img1, img2] = await Promise.all([loadImage(source1), loadImage(source2)])

  const d1 = imageToImageData(img1, options?.maxDimension)
  const d2 = imageToImageData(img2, options?.maxDimension)

  const width = Math.min(d1.width, d2.width)
  const height = Math.min(d1.height, d2.height)

  const data1 = d1.ctx.getImageData(0, 0, width, height).data
  const data2 = d2.ctx.getImageData(0, 0, width, height).data

  let differentPixels = 0
  const totalPixels = width * height

  for (let i = 0; i < data1.length; i += 4) {
    const dr = Math.abs(data1[i] - data2[i])
    const dg = Math.abs(data1[i + 1] - data2[i + 1])
    const db = Math.abs(data1[i + 2] - data2[i + 2])
    const da = Math.abs(data1[i + 3] - data2[i + 3])
    const pixelDiff = Math.max(dr, dg, db, da) / 255
    if (pixelDiff > threshold) {
      differentPixels++
    }
  }

  return {
    totalPixels,
    differentPixels,
    mismatchPercentage: Number(((differentPixels / totalPixels) * 100).toFixed(2)),
    dimensions: { width, height },
    threshold,
  }
}
