import { expect, it } from 'vitest'
import { recommendedPrice, netAfterGp } from '../../src/domain/pricing'

it.each([[100, 30, 142.86], [100, 20, 125], [125, 20, 156.25], [100, 0, 100], [0, 30, 0], [99.5, 25.5, 133.56]])('grosses up %s with GP %s and rounds up to cents', (price, gp, expected) => {
  expect(recommendedPrice(price, gp)).toBe(expected)
})
it.each(['', ' ', null, undefined, -1, Infinity, NaN])('does not interpret invalid or missing prices %s as free', price => {
  expect(recommendedPrice(price, 30)).toBeNull()
  expect(netAfterGp(price, 30)).toBeNull()
})
it.each([100, -1, Infinity, '', null])('does not calculate with invalid GP %s', gp => {
  expect(recommendedPrice(100, gp)).toBeNull()
  expect(netAfterGp(100, gp)).toBeNull()
})
it('matches checkout rounding of GP to cents', () => {
  expect(netAfterGp(142.86, 30)).toBe(100)
  expect(netAfterGp(130, 30)).toBe(91)
  expect(netAfterGp(150, 0)).toBe(150)
})
