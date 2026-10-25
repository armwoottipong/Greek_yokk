const invalid = (code, path, value, scale) => ({ ok: false, code, details: { path, value, ...(scale === undefined ? {} : { scale }) } })
const MAX_INTEGER = BigInt(Number.MAX_SAFE_INTEGER)

// Parse the number's decimal representation, rather than rounding a binary
// floating-point multiplication. Unsupported source precision is a diagnostic.
export function toScaledExact(value, scale, path = '') {
  if (typeof value !== 'number' || !Number.isFinite(value)) return invalid('INVALID_NUMBER', path, value, scale)
  if (!Number.isSafeInteger(scale) || scale <= 0) return invalid('INVALID_SCALE', path, value, scale)
  const [mantissa, exponent = '0'] = value.toString().toLowerCase().split('e')
  const negative = mantissa.startsWith('-')
  const [whole, fraction = ''] = mantissa.replace('-', '').split('.')
  const places = fraction.length - Number(exponent)
  let scaled = BigInt(whole + fraction) * BigInt(scale)
  if (places > 0) {
    const divisor = 10n ** BigInt(places)
    if (scaled % divisor !== 0n) return invalid('UNSUPPORTED_PRECISION', path, value, scale)
    scaled /= divisor
  } else scaled *= 10n ** BigInt(-places)
  if (scaled > MAX_INTEGER) return invalid('UNSAFE_INTEGER', path, value, scale)
  return { ok: true, value: Number(negative ? -scaled : scaled) }
}

// Diagnostic only: historical totals are never rewritten to the canonical order.
export function auditIngredientRounding(requirements, materials) {
  if (!Array.isArray(materials) || !Array.isArray(requirements)) return invalid('INVALID_COLLECTION', '', null)
  const ranks = new Set(), byId = new Map()
  for (let i = 0; i < materials.length; i++) {
    const m = materials[i]
    if (!m || !Number.isSafeInteger(m.costRank) || m.costRank < 0 || ranks.has(m.costRank)) return invalid('INVALID_COST_RANK', `materials[${i}].costRank`, m?.costRank)
    if (typeof m.id !== 'string' || byId.has(m.id)) return invalid('INVALID_MATERIAL_ID', `materials[${i}].id`, m.id)
    if (typeof m.unitCost !== 'number' || !Number.isFinite(m.unitCost) || m.unitCost < 0) return invalid('INVALID_NUMBER', `materials[${i}].unitCost`, m.unitCost)
    ranks.add(m.costRank); byId.set(m.id, m)
  }
  const seen = new Set(), rows = []
  for (let i = 0; i < requirements.length; i++) {
    const r = requirements[i]
    if (!r || typeof r.qty !== 'number' || !Number.isFinite(r.qty) || r.qty < 0) return invalid('INVALID_NUMBER', `requirements[${i}].qty`, r?.qty)
    if (!byId.has(r.materialId)) return invalid('MISSING_MATERIAL', `requirements[${i}].materialId`, r.materialId)
    if (seen.has(r.materialId)) return invalid('DUPLICATE_REQUIREMENT', `requirements[${i}].materialId`, r.materialId)
    seen.add(r.materialId)
    rows.push({ amount: r.qty * byId.get(r.materialId).unitCost, rank: byId.get(r.materialId).costRank })
  }
  const legacyCents = Math.round(rows.reduce((n, r) => n + r.amount, 0) * 100)
  const canonicalCents = Math.round([...rows].sort((a, b) => a.rank - b.rank).reduce((n, r) => n + r.amount, 0) * 100)
  if (!Number.isSafeInteger(legacyCents) || !Number.isSafeInteger(canonicalCents)) return invalid('UNSAFE_INTEGER', 'ingredientCost', null)
  return { ok: true, value: { legacyCents, canonicalCents, deltaCents: canonicalCents - legacyCents } }
}
