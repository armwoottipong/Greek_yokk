// @vitest-environment node
import { expect, it } from 'vitest'
import { toScaledExact, auditIngredientRounding } from '../../src/cloud/conversion.js'

it.each([[0.29, 100, 29], [0.01, 100, 1], [-1.25, 100, -125], [1e-2, 100, 1], [0, 100, 0], [123, 1, 123]])('converts %s at scale %s without a floating multiply error', (value, scale, result) => {
  expect(toScaledExact(value, scale, 'qty')).toEqual({ ok: true, value: result })
})
it.each([0.001, 0.1 + 0.2, 1e-20])('rejects unsupported precision %s rather than rounding', value => {
  expect(toScaledExact(value, 100, 'materials[0].stock')).toMatchObject({ ok: false, code: 'UNSUPPORTED_PRECISION', details: { path: 'materials[0].stock', value } })
})
it.each([NaN, Infinity, '0.5', undefined, null])('rejects invalid numeric value %s', value => {
  expect(toScaledExact(value, 100, 'price')).toMatchObject({ ok: false, code: 'INVALID_NUMBER' })
})
it('checks scale and safe integer boundaries before returning a number', () => {
  expect(toScaledExact(1, 0, 'qty').code).toBe('INVALID_SCALE')
  expect(toScaledExact(1, 0.5, 'qty').code).toBe('INVALID_SCALE')
  expect(toScaledExact(9007199254740991, 1, 'qty').value).toBe(9007199254740991)
  expect(toScaledExact(9007199254740991, 100, 'qty').code).toBe('UNSAFE_INTEGER')
  expect(toScaledExact(1e308, 100, 'qty').code).toBe('UNSAFE_INTEGER')
})
it('reports the explicit one-satang cost-order delta without changing costs', () => {
  const materials = [{ id: 'A', costRank: 0, unitCost: 0.01 }, { id: 'B', costRank: 1, unitCost: 0.02 }, { id: 'C', costRank: 2, unitCost: 0.005 }]
  const requirements = ['A', 'C', 'B'].map(materialId => ({ materialId, qty: 1 }))
  const before = structuredClone({ materials, requirements })
  expect(auditIngredientRounding(requirements, materials)).toEqual({ ok: true, value: { legacyCents: 4, canonicalCents: 3, deltaCents: -1 } })
  expect({ materials, requirements }).toEqual(before)
})
it('rejects duplicate ranks, missing materials and unsafe calculated costs', () => {
  expect(auditIngredientRounding([{ materialId: 'A', qty: 1 }], [{ id: 'A', costRank: 0, unitCost: 1 }, { id: 'B', costRank: 0, unitCost: 2 }]).code).toBe('INVALID_COST_RANK')
  expect(auditIngredientRounding([{ materialId: 'missing', qty: 1 }], []).code).toBe('MISSING_MATERIAL')
  expect(auditIngredientRounding([{ materialId: 'A', qty: 2 }], [{ id: 'A', costRank: 0, unitCost: 1e308 }]).code).toBe('UNSAFE_INTEGER')
})
