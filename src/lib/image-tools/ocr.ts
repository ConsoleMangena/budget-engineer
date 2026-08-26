export interface OcrWord {
  text: string
  confidence: number
  bbox: { x0: number; y0: number; x1: number; y1: number }
}

export interface OcrLine {
  text: string
  confidence: number
  bbox: { x0: number; y0: number; x1: number; y1: number }
}

export interface OcrResult {
  text: string
  confidence: number
  words: OcrWord[]
  lines: OcrLine[]
}

export interface OcrOptions {
  language?: string
  onProgress?: (progress: number) => void
}

export async function extractTextFromImage(
  source: string | File | Blob,
  options?: OcrOptions,
): Promise<OcrResult> {
  const Tesseract = await import('tesseract.js')
  const language = options?.language ?? 'eng'

  const imageSource = source instanceof Blob || source instanceof File
    ? source
    : source

  const { data } = await Tesseract.recognize(imageSource, language, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text' && options?.onProgress) {
        options.onProgress(Math.round(m.progress * 100))
      }
    },
  })

  return {
    text: data.text.trim(),
    confidence: Math.round(data.confidence * 10) / 10,
    words: data.words.map((w) => ({
      text: w.text,
      confidence: Math.round(w.confidence * 10) / 10,
      bbox: { x0: w.bbox.x0, y0: w.bbox.y0, x1: w.bbox.x1, y1: w.bbox.y1 },
    })),
    lines: data.lines.map((l) => ({
      text: l.text.trim(),
      confidence: Math.round(l.confidence * 10) / 10,
      bbox: { x0: l.bbox.x0, y0: l.bbox.y0, x1: l.bbox.x1, y1: l.bbox.y1 },
    })),
  }
}
