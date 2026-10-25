import { proofFixture } from './proofFixture.js'
import { recomputeFromDomain } from './proofDomainAdapter.js'

export function mixedLotFixture({ lines = 6, multiMaterials = 1, lotCount = 4, prepare } = {}) {
  const f = proofFixture(), pair = f.order.lines
  f.order.lines = Array.from({ length: lines }, (_, i) => structuredClone(pair[i % 2]))
  for (const m of f.materials.slice(0, multiMaterials)) {
    const part = Math.floor(m.stock / lotCount)
    m.lots = Array.from({ length: lotCount }, (_, i) => ({
      ...structuredClone(m.lots[0]), id: `${m.id}-${i}`,
      qty: i === lotCount - 1 ? m.stock - part * (lotCount - 1) : part,
      receiveDay: 20000 + i, isInUse: i === 0,
    }))
  }
  prepare?.(f)
  recomputeFromDomain(f)
  for (let i = 0; i < multiMaterials; i++) {
    const m = f.materials[i], row = f.order.inventory[i]
    row.four = {
      ids: [...m.lots.map(l => l.id), ...Array(4 - lotCount).fill('')],
      order: [0, 1, 2, 3],
      takes: [...m.lots.map((l, j) => l.qty - f.nextMaterials[i].lots[j].qty), ...Array(4 - lotCount).fill(0)],
    }
  }
  f.order.inventoryBlockSize = 1
  f.order.witnessCount = f.materials.length
  return f
}
