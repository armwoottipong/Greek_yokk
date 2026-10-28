import { aggregateRequirements, expandItemRequirements } from './inventory.js'

const round = n => Math.round(n * 100) / 100
export {PACKAGE_ADJUSTMENT_REASONS} from './packageReasons.js'
import {PACKAGE_ADJUSTMENT_REASONS} from './packageReasons.js'

// Allocation fields remain zero until finalizePackagePlan is given a projection
// or the authoritative checkout allocation. Planning never consumes inventory.
export function buildPackagePlan(cart, materials, adjustments = []) {
  const materialById = new Map(materials.map(material => [material.id, material]))
  const itemsById = new Map(), issues = []
  const issue = (materialId, code, message) => {
    if (!issues.some(existing => existing.materialId === materialId && existing.code === code))
      issues.push({ materialId, code, ...(message ? { message } : {}) })
  }
  const ensureItem = material => {
    if (!itemsById.has(material.id)) itemsById.set(material.id, {
      materialId: material.id,
      materialName: material.name,
      unit: material.unit,
      baselineQty: 0,
      adjustmentQty: 0,
      requestedQty: 0,
      fulfilledQty: 0,
      shortageQty: 0,
      unitCost: material.unitCost,
      fulfilledCost: 0,
      expectedShortageCost: 0,
      reason: null,
      note: '',
      sources: []
    })
    return itemsById.get(material.id)
  }

  for (const item of cart) {
    let requirements
    try {
      requirements = expandItemRequirements(item.menu, item.selectedAddons, item.qty, materials)
    } catch (error) {
      issue(error.materialId, error.code || 'INVALID_REQUIREMENTS', error.message)
      continue
    }
    for (const requirement of requirements.filter(row => row.inventoryType === 'packaging')) {
      const material = materialById.get(requirement.materialId)
      if (material.isDeleted) {
        issue(material.id, 'ARCHIVED_MATERIAL')
        continue
      }
      const planItem = ensureItem(material)
      planItem.baselineQty = round(planItem.baselineQty + requirement.qty)
      const source = planItem.sources.find(row => row.sourceType === requirement.sourceType &&
        row.sourceId === requirement.sourceId && row.sourceName === requirement.sourceName)
      if (source) source.qty = round(source.qty + requirement.qty)
      else planItem.sources.push({
        sourceType: requirement.sourceType,
        sourceId: requirement.sourceId,
        sourceName: requirement.sourceName,
        qty: requirement.qty
      })
    }
  }

  const adjustedIds = new Set()
  for (const adjustment of adjustments) {
    const materialId = adjustment?.materialId, material = materialById.get(materialId)
    if (!material) { issue(materialId, 'MISSING_MATERIAL'); continue }
    if (material.isDeleted) { issue(materialId, 'ARCHIVED_MATERIAL'); continue }
    if (material.inventoryType !== 'packaging') { issue(materialId, 'NOT_PACKAGING'); continue }
    if (adjustedIds.has(materialId)) { issue(materialId, 'DUPLICATE_ADJUSTMENT'); continue }
    adjustedIds.add(materialId)
    if (typeof adjustment.deltaQty !== 'number' || !Number.isFinite(adjustment.deltaQty) ||
      !Number.isFinite(round(adjustment.deltaQty))) {
      issue(materialId, 'INVALID_ADJUSTMENT_QUANTITY'); continue
    }
    if (!PACKAGE_ADJUSTMENT_REASONS.includes(adjustment.reason)) {
      issue(materialId, 'INVALID_ADJUSTMENT_REASON'); continue
    }
    if (typeof adjustment.note !== 'string') { issue(materialId, 'INVALID_ADJUSTMENT_NOTE'); continue }
    if (adjustment.reason === 'other' && !adjustment.note.trim()) {
      issue(materialId, 'ADJUSTMENT_NOTE_REQUIRED'); continue
    }
    const planItem = ensureItem(material)
    planItem.adjustmentQty = round(adjustment.deltaQty)
    planItem.reason = adjustment.reason
    planItem.note = adjustment.note
  }
  const items = [...itemsById.values()]
  for (const item of items) item.requestedQty = Math.max(0, round(item.baselineQty + item.adjustmentQty))
  return { ok: issues.length === 0, items, issues }
}

export function packageRequirements(planItems) {
  return aggregateRequirements(planItems.map(item => ({ materialId: item.materialId, qty: item.requestedQty })))
}

export function finalizePackagePlan(planItems, allocationResult) {
  if (!allocationResult?.ok) throw new Error('ไม่สามารถสรุป Package จากการจัดสรรที่ไม่สำเร็จ')
  const fulfilled = new Map(aggregateRequirements(allocationResult.allocations || []).map(row => [row.materialId, row.qty]))
  const shortages = new Map(aggregateRequirements(allocationResult.shortages || []).map(row => [row.materialId, row.qty]))
  return planItems.map(item => {
    const fulfilledQty = fulfilled.get(item.materialId) || 0
    const shortageQty = shortages.get(item.materialId) || 0
    return {
      ...item,
      sources: item.sources.map(source => ({ ...source })),
      fulfilledQty,
      shortageQty,
      fulfilledCost: round(fulfilledQty * item.unitCost),
      expectedShortageCost: round(shortageQty * item.unitCost)
    }
  })
}
