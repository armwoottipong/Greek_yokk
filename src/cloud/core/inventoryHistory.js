import { collection, doc, getDocFromServer, getDocsFromServer, limit, orderBy, query } from 'firebase/firestore'

const HISTORY_LIMIT = 500
const asTimestamp = value => {
  if (value && typeof value.toDate === 'function') return value.toDate().toISOString()
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'number') return new Date(value).toISOString()
  return value ?? null
}
const quantity = value => Number.isFinite(value) ? value / 100 : undefined
const displayName = material => material?.name || material?.id || 'วัตถุดิบ'

function entry(base, fields) {
  return {
    id: fields.id,
    timestamp: asTimestamp(fields.timestamp),
    module: 'stock',
    action: fields.action,
    title: fields.title,
    description: fields.description,
    targetId: fields.targetId ?? '',
    targetName: fields.targetName ?? '',
    targetEmoji: fields.targetEmoji ?? '',
    ...(fields.delta !== undefined ? { delta: fields.delta } : {}),
    ...(fields.unit !== undefined ? { unit: fields.unit } : {}),
    ...(fields.beforeStock !== undefined ? { beforeStock: fields.beforeStock } : {}),
    ...(fields.afterStock !== undefined ? { afterStock: fields.afterStock } : {}),
    ...(fields.cost !== undefined ? { cost: fields.cost } : {}),
    ...(fields.lossCents !== undefined ? { lossCents: fields.lossCents } : {}),
    reason: fields.reason || '',
    note: fields.note || '',
    user: fields.user || '',
    ...base,
  }
}

function materialDetails(id, materials) {
  return materials.find(material => material.id === id) || null
}

function operationEntries(operation, materials) {
  const opId = operation.opId || operation.id || 'operation'
  const timestamp = operation.createdAt
  const user = operation.uid || ''
  const kind = operation.kind
  const getMaterial = id => materialDetails(id, materials)
  const targetFields = id => {
    const material = getMaterial(id)
    return { targetId: id, targetName: displayName(material), targetEmoji: material?.emoji || '', unit: material?.unit }
  }
  const make = (suffix, fields) => entry({}, { id: `${opId}:${suffix}`, timestamp, user, reason: '', note: '', ...fields })

  if (kind === 'stock_in' || kind === 'package_stock_in') {
    const material = getMaterial(operation.materialId)
    const delta = quantity(operation.qtyQ)
    if (delta === undefined) return []
    const target = targetFields(operation.materialId)
    const cost = Number.isFinite(operation.unitCost) ? operation.unitCost : undefined
    return [make(kind, {
      ...target, action: 'stock_in', title: 'รับเข้าสต็อก', delta,
      description: `รับเข้า ${target.targetName} +${delta} ${target.unit || ''}`.trim(),
      note: operation.note || '', ...(cost !== undefined ? { cost } : {}),
      ...(Number.isFinite(operation.beforeStockQ) ? { beforeStock: quantity(operation.beforeStockQ) } : {}),
      ...(material?.stock !== undefined && operation.beforeStockQ !== undefined ? { afterStock: quantity(operation.beforeStockQ + operation.qtyQ) } : {}),
    })]
  }

  if (kind === 'produce') {
    const rows = []
    const output = getMaterial(operation.outputId)
    const produced = quantity(operation.qtyQ)
    if (produced !== undefined) rows.push(make(`produce:${operation.outputId}`, {
      ...targetFields(operation.outputId), action: 'produce', title: 'ผลิตตามสูตร', delta: produced,
      description: `ผลิต ${displayName(output)} +${produced} ${output?.unit || ''}`.trim(),
      note: operation.note || '', ...(Number.isFinite(operation.rawCostBaht) ? { cost: operation.rawCostBaht } : {}),
    }))
    for (const input of operation.inputs || []) {
      const taken = quantity(input.take)
      if (taken === undefined) continue
      const material = getMaterial(input.materialId)
      rows.push(make(`produce-input:${input.materialId}`, {
        ...targetFields(input.materialId), action: 'produce_deduct', title: 'ตัดวัตถุดิบเพื่อผลิต', delta: -taken,
        description: `ตัด ${displayName(material)} -${taken} ${material?.unit || ''} เพื่อผลิต ${displayName(output)}`.trim(),
        note: operation.note || '', ...(Number.isFinite(input.ingredientCostBaht) ? { cost: input.ingredientCostBaht } : {}),
      }))
    }
    return rows
  }

  if (kind === 'stock_count') {
    return (operation.rows || []).flatMap((row, index) => {
      const deltaQ = (row.counts || []).reduce((sum, count) => sum + (Number.isFinite(count.to) && Number.isFinite(count.from) ? count.to - count.from : 0), 0)
      const delta = quantity(deltaQ)
      if (delta === undefined) return []
      const material = getMaterial(row.materialId)
      const waste = row.mode === 'waste'
      const loss = Number.isFinite(row.lossCents) ? row.lossCents / 100 : undefined
      return [make(`count:${row.materialId}:${index}`, {
        ...targetFields(row.materialId), action: waste ? 'waste' : 'adjust', title: waste ? 'บันทึกตัดทิ้งของเสีย' : 'ปรับยอดนับจริง', delta,
        description: `${waste ? 'ตัดทิ้งของเสีย' : 'ตรวจนับสต็อก'} ${displayName(material)} ${delta > 0 ? '+' : ''}${delta} ${material?.unit || ''}`.trim(),
        reason: row.reason || '', note: row.note || '', ...(loss !== undefined ? { cost: loss, lossCents: row.lossCents } : {}),
      })]
    })
  }

  if (kind === 'switch_lot') {
    const target = targetFields(operation.materialId)
    return [make(kind, { ...target, action: 'switch_lot', title: 'สลับล็อตใช้งาน', description: `เปลี่ยนล็อตใช้งานของ ${target.targetName}` })]
  }

  const simpleMaterialId = operation.materialId || operation.targetId
  const simpleMaterial = getMaterial(simpleMaterialId)
  if (kind === 'material_delete') {
    const snapshot=operation.materialSnapshot||{}
    return [make(kind,{targetId:simpleMaterialId,targetName:displayName(snapshot),targetEmoji:snapshot.emoji||'',action:'delete',title:'ลบวัตถุดิบถาวร',description:`ลบ ${displayName(snapshot)}`})]
  }
  if (kind === 'material_create') {
    const snapshot = operation.materialSnapshot || {}
    return [make(kind, { targetId: snapshot.id || simpleMaterialId, targetName: displayName(snapshot), targetEmoji: snapshot.emoji || '', action: 'create', title: 'สร้างวัตถุดิบ', description: `เพิ่ม ${displayName(snapshot)} ลงในระบบ` })]
  }
  if (kind === 'material_archive') {
    const archived = operation.deleted === true
    return [make(kind, { ...targetFields(simpleMaterialId), action: archived ? 'delete' : 'restore', title: archived ? 'จัดเก็บวัตถุดิบ' : 'กู้คืนวัตถุดิบ', description: `${archived ? 'จัดเก็บ' : 'กู้คืน'} ${displayName(simpleMaterial)}` })]
  }
  const edits = {
    material_metadata: ['edit', 'แก้ไขข้อมูลวัตถุดิบ', operation.metadata],
    material_measure: ['edit', 'แก้ไขหน่วยและต้นทุน', operation.measure],
    material_details: ['edit', 'แก้ไขรายละเอียดวัตถุดิบ', operation.details],
    material_type: ['edit', 'เปลี่ยนประเภทวัตถุดิบ', { previousType: operation.previousType, inventoryType: operation.inventoryType }],
    production_recipe: ['edit', 'แก้ไขสูตรการผลิต', operation.recipe],
  }
  if (edits[kind]) {
    const [action, title, values] = edits[kind]
    const details = values && Object.keys(values).length ? `: ${Object.entries(values).map(([key, value]) => `${key} ${Array.isArray(value) ? value.join(', ') : String(value)}`).join(', ')}` : ''
    const targetId = kind === 'material_type' ? operation.targetId : simpleMaterialId
    return [make(kind, { ...targetFields(targetId), action, title, description: `${title} ${displayName(getMaterial(targetId))}${details}` })]
  }
  return []
}

function orderEntries(order, materials) {
  if (order.kind !== 'sale_set') return []
  const opId = order.opId || order.orderId || 'order'
  return (order.inventory || []).flatMap(row => {
    const delta = quantity(row.take)
    if (delta === undefined || delta === 0) return []
    const material = materialDetails(row.materialId, materials)
    const hasCost = Number.isFinite(row.ingredientCostBaht) || Number.isFinite(row.packagingCostCents)
    const cost = (Number.isFinite(row.ingredientCostBaht) ? row.ingredientCostBaht : 0) + (Number.isFinite(row.packagingCostCents) ? row.packagingCostCents / 100 : 0)
    return [entry({}, {
      id: `${opId}:sale:${row.materialId}`, timestamp: order.createdAt, module: 'stock', action: 'sale_deduct',
      title: 'ตัดสต็อกจากการขาย', targetId: row.materialId, targetName: displayName(material), targetEmoji: material?.emoji || '',
      delta: -delta, unit: material?.unit || '', description: `ตัดสต็อก ${displayName(material)} -${delta} ${material?.unit || ''} จากออเดอร์ #${opId}`.trim(),
      reason: '', note: 'ตัดสต็อกตามสูตรเมนูอัตโนมัติ', user: order.uid || 'ระบบ POS',
      ...(hasCost ? { cost } : {}),
    })]
  })
}

function cancellationEntries(operation, order, materials) {
  if (!order || order.kind !== 'sale_set') return [entry({},{id:`${operation.opId}:return:unknown`,timestamp:operation.createdAt,action:'order_cancel',title:'คืนบิล',description:`คืนบิล ${operation.orderId} · ไม่พบรายละเอียดบิลต้นทาง`,user:operation.uid||''})]
  const opId = operation.opId || operation.id || 'cancel'
  return (order.inventory || []).flatMap(row => {
    const delta = quantity(row.take)
    if (delta === undefined || delta === 0) return []
    const material = materialDetails(row.materialId, materials)
    const hasCost = Number.isFinite(row.ingredientCostBaht) || Number.isFinite(row.packagingCostCents)
    const cost = (Number.isFinite(row.ingredientCostBaht) ? row.ingredientCostBaht : 0) + (Number.isFinite(row.packagingCostCents) ? row.packagingCostCents / 100 : 0)
    return [entry({}, {
      id: `${opId}:return:${row.materialId}`, timestamp: operation.createdAt, module: 'stock', action: 'order_cancel',
      title: 'คืนสต็อกจากการคืนบิล', targetId: row.materialId, targetName: displayName(material), targetEmoji: material?.emoji || '',
      delta, unit: material?.unit || '', description: `คืนสต็อก ${displayName(material)} +${delta} ${material?.unit || ''} จากออเดอร์ #${order.opId || operation.orderId}`.trim(),
      reason: '', note: '', user: operation.uid || '',
      ...(hasCost ? { cost } : {}),
    })]
  })
}

function parseLegacyLogs(legacyLogs) {
  return legacyLogs.flatMap(record => {
    if (record?.id && String(record.id).startsWith('activityLogs_') && record.json !== undefined) {
      try {
        const parsed = typeof record.json === 'string' ? JSON.parse(record.json) : record.json
        if (Array.isArray(parsed)) return parsed
        if (Array.isArray(parsed?.activityLogs)) return parsed.activityLogs
        if (parsed && typeof parsed === 'object') return [{...parsed,id:parsed.id||record.id}]
      } catch { return [] }
      return []
    }
    return [record]
  }).filter(log => log && typeof log === 'object' && !Array.isArray(log) && (log.module === 'stock' || log.action === 'stock_in' || log.action === 'adjust' || log.action === 'produce' || log.action === 'waste' || log.action === 'switch_lot' || log.action === 'sale_deduct'))
}

function dedupe(logs) {
  const ids = new Set()
  const signatures = new Set()
  return logs.filter(log => {
    if (ids.has(log.id)) return false
    const signature = [log.timestamp, log.action, log.targetId, log.delta, log.title].join('|')
    if (signature !== '||||' && signatures.has(signature)) return false
    ids.add(log.id)
    signatures.add(signature)
    return true
  })
}

export function projectInventoryHistory({ operations = [], orders = [], sourceOrders = [], legacyLogs = [], materials = [], display, clearedThroughRevision = 0 }) {
  void display
  // Deleted materials still have immutable identity snapshots in their receipts.
  materials=[...materials,...operations.filter(o=>o.kind==='material_delete'&&o.materialSnapshot).map(o=>o.materialSnapshot)]
  const byOrder = new Map([...orders,...sourceOrders].map(order => [order.opId, order]))
  const projected = []
  for (const operation of operations) {
    if(clearedThroughRevision>0&&!(operation.shopRevision>clearedThroughRevision))continue
    if (operation.kind === 'cancel') projected.push(...cancellationEntries(operation, byOrder.get(operation.orderId), materials))
    else projected.push(...operationEntries(operation, materials))
  }
  for (const order of orders) if(!clearedThroughRevision||order.shopRevision>clearedThroughRevision)projected.push(...orderEntries(order, materials))
  const normalizedLegacy = parseLegacyLogs(clearedThroughRevision>0?[]:legacyLogs).map(log => {
    const id=log.targetId||log.materialId||''
    const material=materials.find(m=>m.id===id||m.legacyId===id)
    return {...log,timestamp:asTimestamp(log.timestamp),module:'stock',targetId:material?.id||id,
      targetName:log.targetName||displayName(material),targetEmoji:log.targetEmoji||material?.emoji||'',
      reason:log.reason||'',note:log.note||'',user:log.user||''}
  })
  return dedupe([...projected, ...normalizedLegacy]).sort((a, b) => {
    const left = new Date(a.timestamp || 0).getTime(), right = new Date(b.timestamp || 0).getTime()
    return (Number.isFinite(right) ? right : 0) - (Number.isFinite(left) ? left : 0)
  })
}

function decodeLegacyRecord(document) {
  if (!document.id.startsWith('activityLogs_')) return null
  return { id: document.id, json: document.data()?.json }
}

export async function loadInventoryHistory({ db, shopId, generation, materials = [], display, clearedThroughRevision = 0 } = {}) {
  if (!db || !shopId || !generation) throw new Error('INVALID_HISTORY_SCOPE')
  const root = `shops/${shopId}/generations/${generation}`
  const [operationSnapshot, orderSnapshot, legacySnapshot] = await Promise.all([
    getDocsFromServer(query(collection(db, `${root}/operations`), orderBy('createdAt', 'desc'), limit(HISTORY_LIMIT))),
    getDocsFromServer(query(collection(db, `${root}/orders`), orderBy('createdAt', 'desc'), limit(HISTORY_LIMIT))),
    getDocsFromServer(collection(db, `${root}/legacyRecords`)),
  ])
  const operations = operationSnapshot.docs.map(document => document.data())
  const orders = orderSnapshot.docs.map(document => document.data())
  const knownOrders=new Set(orders.map(o=>o.opId))
  const missingIds=[...new Set(operations.filter(o=>o.kind==='cancel'&&(!clearedThroughRevision||o.shopRevision>clearedThroughRevision)).map(o=>o.orderId))].filter(id=>typeof id==='string'&&/^[A-Za-z0-9_-]{1,120}$/.test(id)&&!knownOrders.has(id))
  const sourceOrders=[]
  // Resolve old source bills in bounded groups, without widening the visible sale window.
  for(let i=0;i<missingIds.length;i+=20){
    const snapshots=await Promise.all(missingIds.slice(i,i+20).map(id=>getDocFromServer(doc(db,`${root}/orders/${id}`))))
    sourceOrders.push(...snapshots.filter(d=>d.exists()).map(d=>d.data()))
  }
  const legacyLogs = legacySnapshot.docs.map(decodeLegacyRecord).filter(Boolean)
  return {
    logs: projectInventoryHistory({ operations, orders, sourceOrders, legacyLogs, materials, display, clearedThroughRevision }),
    truncated: operationSnapshot.size >= HISTORY_LIMIT || orderSnapshot.size >= HISTORY_LIMIT,
  }
}
