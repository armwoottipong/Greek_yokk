function isNonNegativeNumber(value) {
  return (typeof value === 'number' || (typeof value === 'string' && value.trim() !== '')) &&
    Number.isFinite(Number(value)) && Number(value) >= 0
}

export function isValidGp(value) {
  return isNonNegativeNumber(value) && Number(value) < 100
}

export function recommendedPrice(storefrontPrice, gpPercent) {
  if (!isNonNegativeNumber(storefrontPrice) || !isValidGp(gpPercent)) return null
  // Round up to cents so the suggestion covers the storefront price after GP.
  const cents = Number(storefrontPrice) / (1 - Number(gpPercent) / 100) * 100
  return Number.isFinite(cents) ? Math.ceil(cents - Number.EPSILON * Math.abs(cents)) / 100 : null
}

export function netAfterGp(sellingPrice, gpPercent) {
  if (!isNonNegativeNumber(sellingPrice) || !isValidGp(gpPercent)) return null
  const price = Number(sellingPrice)
  const gpAmount = Math.round(price * (Number(gpPercent) / 100) * 100) / 100
  return Math.round((price - gpAmount) * 100) / 100
}
