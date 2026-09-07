import { describe, it, expect } from 'vitest'
import {
  evaluateRetrievalQuality,
  applyDegradationPolicy,
  NOT_FOUND_REASON,
  NOT_FOUND_MESSAGE,
  WEAK_RETRIEVAL_MESSAGE,
} from '@/engine/rag/gracefulDegradation'
import type { ScoredHit } from '@/engine/rag/gracefulDegradation'

function scored(overrides: Partial<ScoredHit> = {}): ScoredHit {
  return { text: 'default text content', ...overrides }
}

describe('evaluateRetrievalQuality', () => {
  describe('verdict = strong', () => {
    it('all hits above threshold → strong', () => {
      const hits = [scored({ rerankScore: 0.9 }), scored({ rerankScore: 0.8 }), scored({ rerankScore: 0.75 })]
      expect(evaluateRetrievalQuality(hits, { threshold: 0.7 }).verdict).toBe('strong')
    })
    it('more than half above threshold → strong', () => {
      const hits = [scored({ rerankScore: 0.9 }), scored({ rerankScore: 0.8 }), scored({ rerankScore: 0.3 })]
      expect(evaluateRetrievalQuality(hits, { threshold: 0.7 }).verdict).toBe('strong')
    })
  })

  describe('verdict = weak', () => {
    it('below threshold but with lexical overlap → weak', () => {
      const hits = [scored({ rerankScore: 0.5, text: 'test content here' })]
      const q = evaluateRetrievalQuality(hits, { threshold: 0.7, query: 'test query' })
      expect(q.verdict).toBe('weak')
      expect(q.topOverlap).toBeGreaterThan(0)
    })
    it('above threshold but less than half → weak', () => {
      const hits = [scored({ rerankScore: 0.8 }), scored({ rerankScore: 0.3 }), scored({ rerankScore: 0.3 }), scored({ rerankScore: 0.3 })]
      expect(evaluateRetrievalQuality(hits, { threshold: 0.7 }).verdict).toBe('weak')
    })
  })

  describe('verdict = poor', () => {
    it('no hits above threshold and no overlap → poor', () => {
      const hits = [scored({ rerankScore: 0.3, text: 'completely unrelated content' })]
      const q = evaluateRetrievalQuality(hits, { threshold: 0.7, query: 'quantum physics' })
      expect(q.verdict).toBe('poor')
      expect(q.topOverlap).toBe(0)
    })
    it('empty hits → poor', () => {
      const q = evaluateRetrievalQuality([], { threshold: 0.7 })
      expect(q.verdict).toBe('poor')
      expect(q.aboveThreshold).toBe(0)
    })
  })

  describe('metrics', () => {
    it('topScore reflects first hit score (uses array index 0)', () => {
      const hits = [scored({ rerankScore: 0.3 }), scored({ rerankScore: 0.9 })]
      const q = evaluateRetrievalQuality(hits, { threshold: 0.7 })
      expect(q.topScore).toBe(0.3)
    })
    it('minScore reflects the lowest score', () => {
      const hits = [scored({ rerankScore: 0.9 }), scored({ rerankScore: 0.2 })]
      expect(evaluateRetrievalQuality(hits, { threshold: 0.7 }).minScore).toBe(0.2)
    })
    it('total reflects the unfiltered hit count', () => {
      const hits = [scored(), scored(), scored()]
      expect(evaluateRetrievalQuality(hits, { threshold: 0.7 }).total).toBe(3)
    })
    it('k limits the scored window', () => {
      const hits = [
        scored({ rerankScore: 0.9 }), scored({ rerankScore: 0.9 }), scored({ rerankScore: 0.9 }),
        scored({ rerankScore: 0.9 }), scored({ rerankScore: 0.9 }), scored({ rerankScore: 0.9 }),
        scored({ rerankScore: 0.1 }),
      ]
      expect(evaluateRetrievalQuality(hits, { threshold: 0.7, k: 3 }).aboveThreshold).toBe(3)
    })
    it('topOverlap is 0 when no query provided', () => {
      const hits = [scored({ rerankScore: 0.5, text: 'test content' })]
      expect(evaluateRetrievalQuality(hits, { threshold: 0.7 }).topOverlap).toBe(0)
    })
    it('verdict uses rerankScore over score', () => {
      const hits = [scored({ rerankScore: 0.9, score: 0.1 })]
      expect(evaluateRetrievalQuality(hits, { threshold: 0.7 }).verdict).toBe('strong')
    })
  })
})

describe('applyDegradationPolicy', () => {
  describe('poor verdict', () => {
    it('returns found=false with NOT_FOUND message', () => {
      const hits = [scored({ rerankScore: 0.2, text: 'unrelated' })]
      const result = applyDegradationPolicy(hits, 0.3, 0.7, 'obscure query')
      expect(result.found).toBe(false)
      expect(result.fellBack).toBe(true)
      expect(result.fallbackReason).toBe(NOT_FOUND_REASON)
      expect(result.message).toBe(NOT_FOUND_MESSAGE)
      expect(result.needsClarification).toBe(true)
      expect(result.verdict).toBe('poor')
    })
  })

  describe('weak verdict', () => {
    it('returns found=true with WEAK message and fallback reason', () => {
      const hits = [scored({ rerankScore: 0.5, text: 'test content' })]
      const result = applyDegradationPolicy(hits, 0.5, 0.7, 'test query')
      expect(result.found).toBe(true)
      expect(result.fellBack).toBe(true)
      expect(result.fallbackReason).toBe('low-retrieval-confidence')
      expect(result.message).toBe(WEAK_RETRIEVAL_MESSAGE)
      expect(result.verdict).toBe('weak')
    })
    it('needsClarification when confidence < threshold', () => {
      const hits = [scored({ rerankScore: 0.5, text: 'test content' })]
      expect(applyDegradationPolicy(hits, 0.3, 0.7, 'test query').needsClarification).toBe(true)
    })
    it('needsClarification=false when confidence >= threshold', () => {
      const hits = [scored({ rerankScore: 0.5, text: 'test content' })]
      expect(applyDegradationPolicy(hits, 0.8, 0.7, 'test query').needsClarification).toBe(false)
    })
  })

  describe('strong verdict', () => {
    it('returns found=true, no fallback', () => {
      const hits = [scored({ rerankScore: 0.9, text: 'relevant content' }), scored({ rerankScore: 0.8, text: 'also relevant' })]
      const result = applyDegradationPolicy(hits, 0.85, 0.7, 'test')
      expect(result.found).toBe(true)
      expect(result.fellBack).toBe(false)
      expect(result.message).toBe('')
      expect(result.verdict).toBe('strong')
    })
  })

  describe('edge cases', () => {
    it('defaults threshold to 0.7 when omitted', () => {
      const hits = [scored({ rerankScore: 0.8 })]
      expect(applyDegradationPolicy(hits, 0.5).verdict).toBe('strong')
    })
    it('empty query string with low overlap → poor', () => {
      const hits = [scored({ rerankScore: 0.3, text: 'content' })]
      expect(applyDegradationPolicy(hits, 0.3, 0.7, '').verdict).toBe('poor')
    })
    it('empty hits array → poor', () => {
      const result = applyDegradationPolicy([], 0, 0.7, 'q')
      expect(result.verdict).toBe('poor')
      expect(result.found).toBe(false)
    })
  })
})
