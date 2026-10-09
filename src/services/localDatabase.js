import {
  normalizeDatabase
} from '../domain/database'
export const DATABASE_KEY = 'GY_DATABASE_V3'
const legacyKeys = {
  materials: 'GY_MATERIALS',
  menus: 'GY_MENUS',
  addons: 'GY_ADDONS',
  platforms: 'GY_PLATFORMS',
  orders: 'GY_ORDERS',
  activityLogs: 'GY_ACTIVITY_LOGS',
  categories: 'GY_CATEGORIES'
}
export function loadDatabase(storage) {
  try {
    const canonical = storage.getItem(DATABASE_KEY)
    if (canonical !== null) return normalizeDatabase(JSON.parse(canonical), {
      source: 'canonical'
    })
    const raw = {}
    for (const [field, key] of Object.entries(legacyKeys)) {
      const data = storage.getItem(key);
      if (data !== null) raw[field] = JSON.parse(data)
    }
    raw.gasApiUrl = storage.getItem('GY_GAS_API_URL') || ''
    return normalizeDatabase(raw, {
      source: 'legacy'
    })
  } catch (error) {
    return {
      ok: false,
      errors: [{
        path: 'storage',
        code: 'LOAD_FAILED',
        message: error.message
      }]
    }
  }
}
export function saveDatabase(storage, candidate, {
  expectedRevision,
  allowRecovery = false,
  preservePrevious = false
} = {}) {
  try {
    const result = normalizeDatabase(candidate)
    if (!result.ok) return {
      ok: false,
      code: 'VALIDATION_FAILED',
      message: result.errors.map(e => `${e.path}: ${e.message}`).join('\n')
    }
    const current = storage.getItem(DATABASE_KEY)
    let revision = 0,
      invalidCurrent = false
    if (current !== null) {
      try {
        const parsed = JSON.parse(current);
        invalidCurrent = !normalizeDatabase(parsed).ok;
        revision = Number.isInteger(parsed.revision) ? parsed.revision : 0
      } catch {
        invalidCurrent = true
      }
    }
    if (invalidCurrent && !allowRecovery) return {
      ok: false,
      code: 'RECOVERY_REQUIRED',
      message: 'ข้อมูลที่บันทึกเสีย กรุณากู้คืนจากไฟล์สำรอง'
    }
    if (invalidCurrent) storage.setItem(`GY_CORRUPT_RECOVERY_V3-${crypto.randomUUID()}`, current)
    if (expectedRevision !== undefined && revision !== expectedRevision && !invalidCurrent) return {
      ok: false,
      code: 'REVISION_CONFLICT',
      message: 'ข้อมูลถูกเปลี่ยนจากหน้าต่างอื่น กรุณาโหลดข้อมูลล่าสุดก่อนบันทึก'
    }
    if (preservePrevious && current !== null && !invalidCurrent) storage.setItem(
      `GY_REPLACEMENT_RECOVERY_V3-${crypto.randomUUID()}`, current)
    if (current === null && storage.getItem('GY_LEGACY_RECOVERY_V3') === null) {
      const recovery = {};
      for (const key of [...Object.values(legacyKeys), 'GY_GAS_API_URL']) recovery[key] = storage.getItem(key)
      storage.setItem('GY_LEGACY_RECOVERY_V3', JSON.stringify(recovery))
    }
    const next = {
      ...result.value,
      revision: revision + 1
    }
    storage.setItem(DATABASE_KEY, JSON.stringify(next))
    return {
      ok: true,
      revision: next.revision,
      value: next
    }
  } catch (error) {
    return {
      ok: false,
      code: 'SAVE_FAILED',
      message: error.message
    }
  }
}
