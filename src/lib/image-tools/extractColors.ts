export interface ExtractedColor {
  hex: string
  r: number
  g: number
  b: number
  area: number
  hue: number
  saturation: number
  lightness: number
}

export interface ExtractColorsResult {
  colors: ExtractedColor[]
  dominant: ExtractedColor
  totalPixels: number
}

export interface ExtractColorsOptions {
  colorCount?: number
  maxDimension?: number
  minArea?: number
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  if (max === min) return [0, 0, Math.round(l * 100)]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === rn
    ? ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6
    : max === gn
      ? ((bn - rn) / d + 2) / 6
      : ((rn - gn) / d + 4) / 6
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')
}

interface Bucket {
  pixels: [number, number, number][]
}

function medianCut(pixels: [number, number, number][], depth: number): Bucket[] {
  if (depth === 0 || pixels.length === 0) {
    return [{ pixels }]
  }

  let minR = 255, maxR = 0, minG = 255, maxG = 0, minB = 255, maxB = 0
  for (const [r, g, b] of pixels) {
    if (r < minR) minR = r; if (r > maxR) maxR = r
    if (g < minG) minG = g; if (g > maxG) maxG = g
    if (b < minB) minB = b; if (b > maxB) maxB = b
  }

  const rangeR = maxR - minR, rangeG = maxG - minG, rangeB = maxB - minB
  let channel: 'r' | 'g' | 'b' = 'r'
  if (rangeG >= rangeR && rangeG >= rangeB) channel = 'g'
  else if (rangeB >= rangeR && rangeB >= rangeG) channel = 'b'

  const idx = channel === 'r' ? 0 : channel === 'g' ? 1 : 2
  pixels.sort((a, b) => a[idx] - b[idx])
  const mid = Math.floor(pixels.length / 2)

  return [
    ...medianCut(pixels.slice(0, mid), depth - 1),
    ...medianCut(pixels.slice(mid), depth - 1),
  ]
}

export async function extractColorsFromImage(
  source: string | File | Blob,
  options?: ExtractColorsOptions,
): Promise<ExtractColorsResult> {
  const colorCount = options?.colorCount ?? 8
  const maxDim = options?.maxDimension ?? 200

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image()
    el.crossOrigin = 'anonymous'
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error('Failed to load image'))
    if (typeof source === 'string') {
      el.src = source
    } else {
      const url = URL.createObjectURL(source)
      el.onload = () => { URL.revokeObjectURL(url); resolve(el) }
      el.src = url
    }
  })

  let { width, height } = img
  if (width > maxDim || height > maxDim) {
    const scale = maxDim / Math.max(width, height)
    width = Math.round(width * scale)
    height = Math.round(height * scale)
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, width, height)
  const { data } = ctx.getImageData(0, 0, width, height)

  const pixels: [number, number, number][] = []
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue
    pixels.push([data[i], data[i + 1], data[i + 2]])
  }

  const totalPixels = pixels.length
  if (totalPixels === 0) {
    const fallback: ExtractedColor = {
      hex: '#000000', r: 0, g: 0, b: 0, area: 1, hue: 0, saturation: 0, lightness: 0,
    }
    return { colors: [fallback], dominant: fallback, totalPixels: 0 }
  }

  const depth = Math.ceil(Math.log2(colorCount))
  const buckets = medianCut(pixels, depth)

  const colors: ExtractedColor[] = buckets
    .map((bucket) => {
      const pxs = bucket.pixels
      if (pxs.length === 0) return null
      const r = Math.round(pxs.reduce((s, p) => s + p[0], 0) / pxs.length)
      const g = Math.round(pxs.reduce((s, p) => s + p[1], 0) / pxs.length)
      const b = Math.round(pxs.reduce((s, p) => s + p[2], 0) / pxs.length)
      const [h, s, l] = rgbToHsl(r, g, b)
      return {
        hex: rgbToHex(r, g, b),
        r, g, b,
        area: pxs.length / totalPixels,
        hue: h,
        saturation: s,
        lightness: l,
      }
    })
    .filter((c): c is ExtractedColor => c != null)
    .sort((a, b) => b.area - a.area)
    .slice(0, colorCount)

  const minArea = options?.minArea ?? 0.01
  const filtered = colors.filter((c) => c.area >= minArea)

  return {
    colors: filtered.length > 0 ? filtered : [colors[0]],
    dominant: colors[0],
    totalPixels,
  }
}
