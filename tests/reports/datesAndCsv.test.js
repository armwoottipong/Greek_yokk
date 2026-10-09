import { describe, it, expect } from 'vitest'
import { businessDateKey } from '../../src/domain/businessDate.js'
import { csvField } from '../../src/domain/csv.js'
describe('business calendar and CSV', () => {
 it('uses Bangkok midnight including month and year rollover', () => {
  expect(businessDateKey('2026-10-09T17:20:00Z')).toBe('2026-10-10')
  expect(businessDateKey('2026-12-31T17:00:00Z')).toBe('2027-01-01')
  expect(businessDateKey('2026-10-31T17:00:00Z')).toBe('2026-11-01')
  expect(businessDateKey('2026-10-08T18:00:00Z')).toBe('2026-10-09')
 })
 it('escapes embedded quotes commas newlines and retains Thai', () => {
  expect(csvField('note "broken",\nnext')).toBe('"note ""broken"",\nnext"')
  expect(csvField('ไทย')).toBe('ไทย')
  expect(csvField(null)).toBe('')
 })
})
