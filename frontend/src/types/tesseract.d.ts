declare module 'tesseract.js' {
  interface RecognizeResult {
    data: {
      text: string
      confidence: number
      words: Array<{
        text: string
        confidence: number
        bbox: { x0: number; y0: number; x1: number; y1: number }
      }>
      lines: Array<{
        text: string
        confidence: number
        bbox: { x0: number; y0: number; x1: number; y1: number }
      }>
    }
  }

  export function recognize(
    image: string | Blob | File,
    lang?: string,
    opts?: {
      logger?: (m: { status: string; progress: number }) => void
    },
  ): Promise<RecognizeResult>
}
