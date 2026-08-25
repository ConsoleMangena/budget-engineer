import { describe, it, expect } from 'vitest'
import {
  recallAtK,
  precisionAtK,
  mrrAtK,
  ndcgAtK,
  isRelevantHit,
  countRelevantInCorpus,
  relevantIndices,
  evaluateRetrieval,
  evaluateBatch,
  hitText,
  BATCH_GATES,
} from '@/engine/rag/retrieval-eval-metrics'
import type { RetrievalEvalCase, RetrievalEvalMetrics } from '@/engine/rag/retrieval-eval-metrics'
import type { HybridHit } from '@/engine/rag/hybridSearch'

function relevantHit(overrides: Partial<HybridHit> = {}): HybridHit {
  return {
    chunkId: 'c1', docId: 'doc1', sectionId: 'doc1:sec-1-1', heading: 'Test', text: 'test text',
    score: 0.5, text_child: 'default child text', text_parent: 'parent',
    source_type: 'bylaws_1977', clause: '1.1', rrf: 0.5, ...overrides,
  }
}

function irrelevantHit(id = 'irr'): HybridHit {
  return {
    chunkId: id, docId: 'other', sectionId: 'other:sec-99', heading: 'Irrelevant',
    text: 'unrelated', score: 0.1, text_child: 'completely unrelated content here',
    text_parent: 'none', source_type: 'unknown', clause: '99.1', rrf: 0.1,
  }
}

const baseCase: RetrievalEvalCase = {
  id: 'test-case', query: 'test query', k: 5,
  expectedSectionIds: ['doc1:sec-1-1'],
  expectedSourceTypes: ['bylaws_1977'],
  expectedContains: ['target phrase'],
  minRecall: 0.8,
}

const relevantHitForBase: HybridHit = relevantHit({ text_child: 'the target phrase is here' })

describe('hitText', () => {
  it('returns text_child lowercased', () => {
    expect(hitText(relevantHit({ text_child: 'Hello World' }))).toBe('hello world')
  })
  it('returns empty string when text_child is undefined', () => {
    expect(hitText(relevantHit({ text_child: undefined }))).toBe('')
  })
})

describe('isRelevantHit', () => {
  it('matches by sectionId', () => {
    expect(isRelevantHit(relevantHit({ sectionId: 'doc1:sec-1-1' }), baseCase)).toBe(true)
  })
  it('does not match unknown sectionId with non-matching text', () => {
    expect(isRelevantHit(irrelevantHit(), baseCase)).toBe(false)
  })
  it('matches by text contains (case-insensitive)', () => {
    const caseDef = { ...baseCase, expectedSectionIds: [], expectedContains: ['hello'] }
    expect(isRelevantHit(relevantHit({ text_child: 'HELLO world' }), caseDef)).toBe(true)
  })
  it('empty contains phrase does not match', () => {
    const caseDef = { ...baseCase, expectedSectionIds: [], expectedContains: [''] }
    expect(isRelevantHit(relevantHit(), caseDef)).toBe(false)
  })
  it('no expected sectionIds and no contains = not relevant', () => {
    const caseDef = { ...baseCase, expectedSectionIds: [], expectedContains: [] }
    expect(isRelevantHit(relevantHit(), caseDef)).toBe(false)
  })
})

describe('countRelevantInCorpus', () => {
  it('counts chunks matching sectionId', () => {
    const c: RetrievalEvalCase = { ...baseCase, expectedSectionIds: ['d:sec-1-1'], expectedContains: [] }
    const chunks = [{ id: '1', docId: 'd', sectionId: 'd:sec-1-1', heading: '', path: [], text: 'text' }]
    expect(countRelevantInCorpus(chunks, c)).toBe(1)
  })
  it('counts chunks matching text', () => {
    const c: RetrievalEvalCase = { ...baseCase, expectedSectionIds: [], expectedContains: ['fire'] }
    const chunks = [{ id: '1', docId: 'd', sectionId: 'x', heading: '', path: [], text: 'fire resistance' }]
    expect(countRelevantInCorpus(chunks, c)).toBe(1)
  })
  it('counts union of sectionId and text matches', () => {
    const c: RetrievalEvalCase = { ...baseCase, expectedSectionIds: ['d:sec-1-1'], expectedContains: ['fire'] }
    const chunks = [
      { id: '1', docId: 'd', sectionId: 'd:sec-1-1', heading: '', path: [], text: 'unrelated' },
      { id: '2', docId: 'd', sectionId: 'other', heading: '', path: [], text: 'fire code' },
    ]
    expect(countRelevantInCorpus(chunks, c)).toBe(2)
  })
  it('returns 0 for empty chunks', () => {
    expect(countRelevantInCorpus([], baseCase)).toBe(0)
  })
})

describe('recallAtK', () => {
  it('returns 0 when totalRelevant is 0', () => {
    expect(recallAtK([relevantHitForBase], baseCase, 0)).toBe(0)
  })
  it('returns 1 when all relevant items retrieved', () => {
    expect(recallAtK([relevantHitForBase, relevantHitForBase], baseCase, 2)).toBe(1)
  })
  it('returns partial recall', () => {
    expect(recallAtK([relevantHitForBase], baseCase, 4)).toBeCloseTo(0.25)
  })
  it('caps at 1.0', () => {
    expect(recallAtK([relevantHitForBase, relevantHitForBase], baseCase, 1)).toBe(1)
  })
})

describe('precisionAtK', () => {
  it('returns 0 when k is 0', () => {
    expect(precisionAtK([], baseCase, 0)).toBe(0)
  })
  it('computes precision correctly', () => {
    const hits = [relevantHitForBase, irrelevantHit()]
    expect(precisionAtK(hits, baseCase, 2)).toBeCloseTo(0.5)
  })
  it('returns 1 when all are relevant', () => {
    expect(precisionAtK([relevantHitForBase, relevantHitForBase], baseCase, 2)).toBe(1)
  })
})

describe('mrrAtK', () => {
  it('returns 0 when no relevant hits', () => {
    expect(mrrAtK([irrelevantHit()], baseCase)).toBe(0)
  })
  it('returns 1 for first-hit relevance', () => {
    expect(mrrAtK([relevantHitForBase], baseCase)).toBe(1)
  })
  it('returns 0.5 for second-hit relevance', () => {
    expect(mrrAtK([irrelevantHit('a'), relevantHitForBase], baseCase)).toBeCloseTo(0.5)
  })
  it('returns 1/3 for third-hit relevance', () => {
    expect(mrrAtK([irrelevantHit('a'), irrelevantHit('b'), relevantHitForBase], baseCase)).toBeCloseTo(1 / 3)
  })
})

describe('ndcgAtK', () => {
  it('returns 0 for empty hits', () => {
    expect(ndcgAtK([], baseCase, 5)).toBe(0)
  })
  it('returns 1.0 for perfect ranking (all relevant at top)', () => {
    const hits = [relevantHitForBase, relevantHitForBase, irrelevantHit()]
    expect(ndcgAtK(hits, { ...baseCase, k: 3 }, 2)).toBeCloseTo(1.0)
  })
  it('returns less than 1 for inverse ranking', () => {
    const perfect = ndcgAtK([relevantHitForBase, irrelevantHit()], { ...baseCase, k: 2 }, 1)
    const inv = ndcgAtK([irrelevantHit(), relevantHitForBase], { ...baseCase, k: 2 }, 1)
    expect(inv).toBeLessThan(perfect)
  })
  it('returns 0 when no relevant hits', () => {
    expect(ndcgAtK([irrelevantHit('a'), irrelevantHit('b')], { ...baseCase, k: 2 }, 1)).toBe(0)
  })
})

describe('relevantIndices', () => {
  it('returns 0-indexed positions of relevant hits', () => {
    const hits = [irrelevantHit('a'), relevantHitForBase, irrelevantHit('b'), relevantHitForBase]
    expect(relevantIndices(hits, baseCase)).toEqual([1, 3])
  })
  it('returns empty array when none relevant', () => {
    expect(relevantIndices([irrelevantHit()], baseCase)).toEqual([])
  })
})

describe('evaluateRetrieval', () => {
  it('returns complete metrics object', () => {
    const hits = [relevantHitForBase, irrelevantHit()]
    const result = evaluateRetrieval(baseCase, hits, 2)
    expect(result.caseId).toBe('test-case')
    expect(result.k).toBe(5)
    expect(result.totalRelevant).toBe(2)
    expect(result.hits).toHaveLength(2)
    expect(typeof result.recallAtK).toBe('number')
    expect(typeof result.mrr).toBe('number')
    expect(typeof result.ndcgAtK).toBe('number')
    expect(typeof result.passRecall).toBe('boolean')
    expect(typeof result.passMrr).toBe('boolean')
  })
  it('passRecall is true when recall meets minRecall', () => {
    const hits = [relevantHitForBase, relevantHitForBase]
    expect(evaluateRetrieval(baseCase, hits, 2).passRecall).toBe(true)
  })
  it('passRecall is false when recall is below minRecall', () => {
    const hits = [irrelevantHit()]
    expect(evaluateRetrieval(baseCase, hits, 10).passRecall).toBe(false)
  })
  it('uses default minMrr 0.5 when minMrr not specified', () => {
    expect(evaluateRetrieval(baseCase, [irrelevantHit()], 1).minMrr).toBe(0.5)
  })
})

describe('evaluateBatch', () => {
  const passing: RetrievalEvalMetrics = {
    caseId: 'a', query: '', k: 5, hits: [], relevantIndices: [], totalRelevant: 1,
    recallAtK: 1.0, precisionAtK: 1.0, mrr: 1.0, ndcgAtK: 1.0,
    topSourceTypes: [], passRecall: true, passMrr: true, passSourceType: true,
    minRecall: 0.8, minMrr: 0.5,
  }
  const failing: RetrievalEvalMetrics = {
    ...passing, caseId: 'b', recallAtK: 0.2, passRecall: false,
  }

  it('returns pass=true when all cases pass', () => {
    const batch = evaluateBatch([passing, passing])
    expect(batch.pass).toBe(true)
    expect(batch.failures).toHaveLength(0)
    expect(batch.avgRecallAtK).toBeCloseTo(1.0)
    expect(batch.worstRecall).toBe(1.0)
  })
  it('returns pass=false when any case fails', () => {
    const batch = evaluateBatch([passing, failing])
    expect(batch.pass).toBe(false)
    expect(batch.failures).toHaveLength(1)
    expect(batch.worstRecall).toBeCloseTo(0.2)
  })
  it('empty results → pass=false', () => {
    const batch = evaluateBatch([])
    expect(batch.pass).toBe(false)
    expect(batch.avgRecallAtK).toBe(0)
  })
  it('exposes BATCH_GATES', () => {
    expect(BATCH_GATES.avgRecallAtK).toBe(0.8)
    expect(BATCH_GATES.avgMrr).toBe(0.7)
    expect(BATCH_GATES.avgNdcgAtK).toBe(0.75)
    expect(BATCH_GATES.minRecallFloor).toBe(0.5)
  })
  it('computes average metrics correctly', () => {
    const m1: RetrievalEvalMetrics = { ...passing, recallAtK: 0.8, mrr: 0.7, ndcgAtK: 0.9 }
    const m2: RetrievalEvalMetrics = { ...passing, recallAtK: 1.0, mrr: 0.9, ndcgAtK: 0.8 }
    const batch = evaluateBatch([m1, m2])
    expect(batch.avgRecallAtK).toBeCloseTo(0.9)
    expect(batch.avgMrr).toBeCloseTo(0.8)
    expect(batch.avgNdcgAtK).toBeCloseTo(0.85)
  })
})
