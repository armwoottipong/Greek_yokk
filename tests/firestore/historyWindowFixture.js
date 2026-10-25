import { proofFixture } from './proofFixture.js'
import { recomputeFromDomain } from './proofDomainAdapter.js'

export function historyWindowFixture({ prefix = 6, suffix = 5, quantities = [1000, 2000, 3000, 4000], fixture = proofFixture() } = {}) {
  const f = fixture, material = f.materials[0]
  const otherProofs = f.order.inventory.map(row => row.four)
  const values = [...Array(prefix).fill(0), ...quantities, ...Array(suffix).fill(0)]
  material.lots = values.map((qty, i) => ({ ...structuredClone(material.lots[0]), id: `LOT-${i}`, qty, isInUse: i === prefix, receiveDay: 20000 + i }))
  material.stock = values.reduce((n, q) => n + q, 0)
  material.activeLotId = `LOT-${prefix}`
  recomputeFromDomain(f)
  for (let i = 1; i < otherProofs.length; i++) {
    if (otherProofs[i]) f.order.inventory[i].four = otherProofs[i]
  }
  const row = f.order.inventory[0], selected = material.lots.slice(prefix, prefix + 4)
  row.four = { offset: prefix, ids: selected.map(l => l.id), order: [0, 1, 2, 3], takes: selected.map((l, i) => l.qty - f.nextMaterials[0].lots[prefix + i].qty) }
  row.lot0Id = row.four.ids[0]; row.lot1Id = row.four.ids[1]
  row.take0 = row.four.takes[0]; row.take1 = row.four.takes[1]
  f.order.inventoryBlockSize = 1; f.order.witnessCount = f.materials.length
  return f
}
