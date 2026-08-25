import { describe, it, expect } from 'vitest'
import {
  extractCrossReferences,
  buildCrossReferenceGraph,
  resolveRefTarget,
  findReferencedChunks,
} from '@/engine/rag/crossref'
import type { CodeDocument, TextChunk } from '@/engine/rag/types'

describe('extractCrossReferences', () => {
  it('extracts clause references', () => {
    const refs = extractCrossReferences('See clause 4.1.3 for details')
    expect(refs).toHaveLength(1)
    expect(refs[0].to).toBe('clause-4.1.3')
    expect(refs[0].context).toContain('clause 4.1.3')
  })
  it('extracts section references', () => {
    const refs = extractCrossReferences('Refer to section 12.5')
    expect(refs).toHaveLength(1)
    expect(refs[0].to).toBe('section-12.5')
  })
  it('extracts regulation references (reg)', () => {
    const refs = extractCrossReferences('As per reg 3.2.1')
    expect(refs).toHaveLength(1)
    expect(refs[0].to).toBe('regulation-3.2.1')
  })
  it('extracts regulation references (regulation)', () => {
    const refs = extractCrossReferences('per regulation 7.1')
    expect(refs).toHaveLength(1)
    expect(refs[0].to).toBe('regulation-7.1')
  })
  it('extracts annex references', () => {
    const refs = extractCrossReferences('See annexure B for the table')
    expect(refs).toHaveLength(1)
    expect(refs[0].to).toBe('annex-b')
  })
  it('extracts annexure variant as annex prefix', () => {
    const refs = extractCrossReferences('Per annexure A')
    expect(refs).toHaveLength(1)
    expect(refs[0].to).toBe('annex-a')
  })
  it('deduplicates same target', () => {
    expect(extractCrossReferences('clause 4.1 and clause 4.1 again')).toHaveLength(1)
  })
  it('extracts multiple different references', () => {
    const refs = extractCrossReferences('See clause 4.1 and section 12.3 and reg 5.6')
    expect(refs).toHaveLength(3)
  })
  it('returns empty for text with no references', () => {
    expect(extractCrossReferences('Just plain text.')).toEqual([])
  })
  it('returns empty for empty text', () => {
    expect(extractCrossReferences('')).toEqual([])
  })
})

describe('buildCrossReferenceGraph', () => {
  const doc: CodeDocument = {
    id: 'test-doc',
    title: 'Test Code',
    sections: [
      { id: 'test-doc:sec-1-1', heading: 'Section 1', level: 1, text: '' },
      { id: 'test-doc:sec-2-1', heading: 'Section 2', level: 1, text: '' },
    ],
  }

  const chunks: TextChunk[] = [
    {
      id: 'c1', docId: 'test-doc', sectionId: 'test-doc:sec-1-1',
      heading: 'Section 1', path: ['Section 1'],
      text: 'See clause 2.1 for the related requirement.',
    },
    {
      id: 'c2', docId: 'test-doc', sectionId: 'test-doc:sec-2-1',
      heading: 'Section 2', path: ['Section 2'],
      text: 'This section has no cross-references.',
    },
  ]

  it('collects all section ids as nodes', () => {
    const graph = buildCrossReferenceGraph([doc], chunks)
    expect(graph.nodes).toContain('test-doc:sec-1-1')
    expect(graph.nodes).toContain('test-doc:sec-2-1')
  })
  it('edges come from chunk text references', () => {
    const graph = buildCrossReferenceGraph([doc], chunks)
    expect(graph.edges.length).toBeGreaterThanOrEqual(1)
    expect(graph.edges[0].from).toBe('test-doc:sec-1-1')
  })
  it('referencesFor returns edges for a node', () => {
    const graph = buildCrossReferenceGraph([doc], chunks)
    expect(graph.referencesFor('test-doc:sec-1-1').length).toBeGreaterThanOrEqual(1)
  })
  it('referencesFor returns empty array for nodes with no refs', () => {
    expect(buildCrossReferenceGraph([doc], chunks).referencesFor('test-doc:sec-2-1')).toEqual([])
  })
  it('referencesFor returns empty for unknown node', () => {
    expect(buildCrossReferenceGraph([doc], chunks).referencesFor('nonexistent')).toEqual([])
  })
  it('chunks from docs when chunks param omitted', () => {
    expect(buildCrossReferenceGraph([doc]).nodes.length).toBeGreaterThanOrEqual(2)
  })
})

describe('resolveRefTarget', () => {
  const sections = [
    { id: 'code:4.1.3' },
    { id: 'code:4.2.1' },
    { id: 'code:12.5.6' },
  ]

  it('resolves clause reference by numeric suffix', () => {
    expect(resolveRefTarget('clause-4.1.3', sections)).toBe('code:4.1.3')
  })
  it('resolves section reference by numeric suffix', () => {
    expect(resolveRefTarget('section-5.6', sections)).toBe('code:12.5.6')
  })
  it('resolves regulation reference by numeric suffix', () => {
    expect(resolveRefTarget('regulation-4.2.1', sections)).toBe('code:4.2.1')
  })
  it('returns undefined for non-numeric target (annex)', () => {
    expect(resolveRefTarget('annex-b', sections)).toBeUndefined()
  })
  it('returns undefined for no matching section', () => {
    expect(resolveRefTarget('clause-99.99', sections)).toBeUndefined()
  })
})

describe('findReferencedChunks', () => {
  const doc: CodeDocument = {
    id: 'doc', title: 'Test',
    sections: [
      { id: 'doc:sec-1', heading: 'S1', level: 1, text: '' },
      { id: 'doc:sec-2', heading: 'S2', level: 1, text: '' },
      { id: 'doc:sec-3', heading: 'S3', level: 1, text: '' },
    ],
  }
  const sections = doc.sections
  const chunks: TextChunk[] = [
    { id: 'c1', docId: 'doc', sectionId: 'doc:sec-1', heading: '', path: [], text: 'See clause 2' },
    { id: 'c2', docId: 'doc', sectionId: 'doc:sec-2', heading: '', path: [], text: 'See clause 3' },
  ]

  it('follows references to depth 1', () => {
    const graph = buildCrossReferenceGraph([doc], chunks)
    const refs = findReferencedChunks(graph, sections, 'doc:sec-1', 1)
    expect(refs).toContain('doc:sec-2')
  })
  it('follows references to depth 2', () => {
    const graph = buildCrossReferenceGraph([doc], chunks)
    const refs = findReferencedChunks(graph, sections, 'doc:sec-1', 2)
    expect(refs).toContain('doc:sec-2')
    expect(refs).toContain('doc:sec-3')
  })
  it('returns empty for node with no references', () => {
    const graph = buildCrossReferenceGraph([doc], chunks)
    expect(findReferencedChunks(graph, sections, 'doc:sec-3', 1)).toEqual([])
  })
  it('handles circular references without infinite loop', () => {
    const circularChunks: TextChunk[] = [
      { id: 'c1', docId: 'doc', sectionId: 'doc:sec-1', heading: '', path: [], text: 'See clause 2' },
      { id: 'c2', docId: 'doc', sectionId: 'doc:sec-2', heading: '', path: [], text: 'See clause 1' },
    ]
    const graph = buildCrossReferenceGraph([doc], circularChunks)
    const refs = findReferencedChunks(graph, sections, 'doc:sec-1', 5)
    expect(refs).toContain('doc:sec-2')
    expect(refs).toContain('doc:sec-1')
  })
  it('returns empty for unknown fromSectionId', () => {
    const graph = buildCrossReferenceGraph([doc], chunks)
    expect(findReferencedChunks(graph, sections, 'nonexistent', 1)).toEqual([])
  })
})
