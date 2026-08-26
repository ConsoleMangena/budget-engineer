export interface ContrastPairResult {
  foreground: string
  background: string
  ratio: number
  aa: { normal: boolean; large: boolean }
  aaa: { normal: boolean; large: boolean }
}

export interface ContrastCheckResult {
  pairs: ContrastPairResult[]
  summary: {
    totalPairs: number
    passAA: number
    passAAA: number
    failAA: number
  }
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  return [
    parseInt(full.substring(0, 2), 16),
    parseInt(full.substring(2, 4), 16),
    parseInt(full.substring(4, 6), 16),
  ]
}

export function relativeLuminance(r: number, g: number, b: number): number {
  const transform = (c: number) => {
    const sRGB = c / 255
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * transform(r) + 0.7152 * transform(g) + 0.0722 * transform(b)
}

export function contrastRatio(hex1: string, hex2: string): number {
  const [r1, g1, b1] = hexToRgb(hex1)
  const [r2, g2, b2] = hexToRgb(hex2)
  const l1 = relativeLuminance(r1, g1, b1)
  const l2 = relativeLuminance(r2, g2, b2)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2))
}

export function checkContrast(colors: string[]): ContrastCheckResult {
  const normalized = colors.map((c) => (c.startsWith('#') ? c : `#${c}`))
  const pairs: ContrastPairResult[] = []

  for (let i = 0; i < normalized.length; i++) {
    for (let j = i + 1; j < normalized.length; j++) {
      const fg = normalized[i]
      const bg = normalized[j]
      const ratio = contrastRatio(fg, bg)
      pairs.push({
        foreground: fg,
        background: bg,
        ratio,
        aa: { normal: ratio >= 4.5, large: ratio >= 3 },
        aaa: { normal: ratio >= 7, large: ratio >= 4.5 },
      })
    }
  }

  const passAA = pairs.filter((p) => p.aa.normal).length
  const passAAA = pairs.filter((p) => p.aaa.normal).length

  return {
    pairs,
    summary: {
      totalPairs: pairs.length,
      passAA,
      passAAA,
      failAA: pairs.length - passAA,
    },
  }
}
