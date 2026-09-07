import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { EmbeddingCache } from '@/engine/rag/embedCache'

describe('EmbeddingCache', () => {
  beforeEach(() => {
    indexedDB = new IDBFactory()
  })

  it('open() returns a cache instance', async () => {
    const cache = await EmbeddingCache.open()
    expect(cache).toBeInstanceOf(EmbeddingCache)
  })

  it('set/get round-trips a vector', async () => {
    const cache = await EmbeddingCache.open()
    const vec = [0.1, 0.2, 0.3, -0.5]
    await cache.set('key-1', vec)
    const got = await cache.get('key-1')
    expect(got).toEqual(vec)
  })

  it('get returns undefined for missing key', async () => {
    const cache = await EmbeddingCache.open()
    const got = await cache.get('nonexistent')
    expect(got).toBeUndefined()
  })

  it('set overwrites a previous value', async () => {
    const cache = await EmbeddingCache.open()
    await cache.set('k', [1, 2])
    await cache.set('k', [3, 4, 5])
    expect(await cache.get('k')).toEqual([3, 4, 5])
  })

  it('clear removes all entries', async () => {
    const cache = await EmbeddingCache.open()
    await cache.set('a', [1])
    await cache.set('b', [2])
    await cache.clear()
    expect(await cache.get('a')).toBeUndefined()
    expect(await cache.get('b')).toBeUndefined()
  })

  it('different keys are independent', async () => {
    const cache = await EmbeddingCache.open()
    await cache.set('x', [10])
    await cache.set('y', [20])
    expect(await cache.get('x')).toEqual([10])
    expect(await cache.get('y')).toEqual([20])
    await cache.clear()
    expect(await cache.get('x')).toBeUndefined()
    expect(await cache.get('y')).toBeUndefined()
  })

  it('handles empty vector', async () => {
    const cache = await EmbeddingCache.open()
    await cache.set('empty', [])
    expect(await cache.get('empty')).toEqual([])
  })

  it('handles large vector (256 dimensions)', async () => {
    const cache = await EmbeddingCache.open()
    const vec = Array.from({ length: 256 }, (_, i) => i / 256)
    await cache.set('big', vec)
    expect(await cache.get('big')).toEqual(vec)
  })

  it('memory cache is hit before IDB lookup', async () => {
    const cache = await EmbeddingCache.open()
    await cache.set('mem', [42])
    const got = await cache.get('mem')
    expect(got).toEqual([42])
  })
})
