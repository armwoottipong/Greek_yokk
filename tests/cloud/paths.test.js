// @vitest-environment node
import { expect, it } from 'vitest'
import { encodeLegacyId, decodeLegacyId, cloudPath } from '../../src/cloud/paths.js'

it.each(['a/b', '__name__', '..', 'โยเกิร์ต 🍓', 'A', 'a', 'e\u0301', 'é'])('round-trips the legacy ID %s through a safe segment', value => {
  const encoded = encodeLegacyId(value)
  expect(encoded).toMatch(/^l_[A-Za-z0-9_-]+$/)
  expect(decodeLegacyId(encoded)).toBe(value)
})
it('does not collide or normalize distinct legacy IDs', () => {
  const ids = ['a/b', 'a_b', 'a-b', 'e\u0301', 'é', 'A', 'a']
  expect(new Set(ids.map(encodeLegacyId)).size).toBe(ids.length)
})
it.each(['', 1, null, '\ud800', 'x'.repeat(1200)])('rejects invalid or oversized IDs %s', id => {
  expect(() => encodeLegacyId(id)).toThrow()
})
it.each(['a/b', 'l_', 'l_A', 'l_YR', 'l_!!', 'l__w'])('rejects malformed or noncanonical encoded IDs %s', id => {
  expect(() => decodeLegacyId(id)).toThrow()
})
it('constructs paths only within validated shop, generation and collection', () => {
  expect(cloudPath('shop', 'g1', 'materials', 'a/b')).toBe(`shops/shop/generations/g1/materials/${encodeLegacyId('a/b')}`)
  for (const shop of ['../shop', 'shop/other', '__reserved__']) expect(() => cloudPath(shop, 'g1', 'materials', 'x')).toThrow()
  expect(() => cloudPath('shop', '../g2', 'materials', 'x')).toThrow()
  expect(() => cloudPath('shop', 'g1', '../orders', 'x')).toThrow()
})
