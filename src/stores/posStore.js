import { getEffectiveRequirements, allocateInventory, aggregateRequirements, rebaseInventoryDraft } from '@/domain/inventory'
import { businessDateKey } from '@/domain/businessDate'
import { normalizeDatabase, clone, DATABASE_FIELDS } from '@/domain/database'
import { loadDatabase, saveDatabase } from '@/services/localDatabase'
import { createEntityId } from '@/domain/ids'
import { defineStore } from 'pinia'
import {
  DEFAULT_MATERIALS,
  DEFAULT_MENUS,
  DEFAULT_ADDONS,
  DEFAULT_PLATFORMS,
  DEFAULT_ORDERS,
  DEFAULT_PRESET_EMOJIS,
  DEFAULT_CATEGORIES,
  EMOJI_CATALOG
} from '@/data/initialData'

// ========================================================
// DATE & EXPIRATION HELPER UTILITIES
// ========================================================
export function getTodayString() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function addDays(dateStr, days) {
  if (!dateStr || days === null || days === undefined || days === '') return ''
  const parts = String(dateStr).split('-')
  if (parts.length !== 3) return ''
  const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10))
  if (isNaN(d.getTime())) return ''
  d.setDate(d.getDate() + Number(days))
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getExpiryDiffDays(expiryDateStr) {
  if (!expiryDateStr) return null
  const parts = String(expiryDateStr).split('-')
  if (parts.length !== 3) return null
  const exp = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10))
  if (isNaN(exp.getTime())) return null
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diffTime = exp.getTime() - today.getTime()
  return Math.round(diffTime / (1000 * 60 * 60 * 24))
}

export function formatDisplayDate(dateStr) {
  if (!dateStr) return '-'
  try {
    const parts = String(dateStr).split('-')
    if (parts.length !== 3) return dateStr
    const y = parts[0]
    const m = parts[1]
    const d = parts[2]
    return `${d}/${m}/${y}`
  } catch (e) {
    return dateStr
  }
}

export function isExpired(mat) {
  if (!mat || !mat.expiryDate) return false
  const diff = getExpiryDiffDays(mat.expiryDate)
  return diff !== null && diff < 0
}

export function formatThaiDate(dateStr, includeYear = false) {
  if (!dateStr) return '-'
  try {
    const parts = String(dateStr).split('-')
    if (parts.length !== 3) return dateStr
    const y = parts[0]
    const m = parts[1]
    const d = parts[2]
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
    const mIdx = parseInt(m, 10) - 1
    const dayNum = parseInt(d, 10)
    const monthName = months[mIdx] || m
    if (includeYear) {
      const thaiYear = parseInt(y, 10) + 543
      return `${dayNum} ${monthName} ${thaiYear}`
    }
    return `${dayNum} ${monthName}`
  } catch (e) {
    return dateStr
  }
}

export function getExpiryStatus(mat) {
  if (!mat || !mat.expiryDate) {
    return {
      status: 'none',
      diff: null,
      label: 'ไม่ระบุวันหมดอายุ',
      text: '-',
      shortText: '-',
      badgeClass: 'text-stone-400 bg-stone-50 border border-stone-200/50',
      icon: '⚪'
    }
  }

  const diff = getExpiryDiffDays(mat.expiryDate)
  if (diff === null) {
    return {
      status: 'none',
      diff: null,
      label: 'ไม่ระบุวันหมดอายุ',
      text: '-',
      shortText: '-',
      badgeClass: 'text-stone-400 bg-stone-50 border border-stone-200/50',
      icon: '⚪'
    }
  }

  if (diff < 0) {
    return {
      status: 'expired',
      diff,
      label: 'หมดอายุแล้ว',
      text: 'หมดอายุแล้ว',
      shortText: 'หมดอายุแล้ว',
      badgeClass: 'bg-rose-100 text-rose-700 font-bold border border-rose-300',
      icon: '🔴'
    }
  }

  if (diff === 0) {
    return {
      status: 'today',
      diff: 0,
      label: 'หมดอายุวันนี้!',
      text: 'หมดอายุวันนี้',
      shortText: 'วันนี้',
      badgeClass: 'bg-rose-100 text-rose-800 font-bold border border-rose-400',
      icon: '⚠️'
    }
  }

  return {
    status: 'fresh',
    diff,
    label: 'ปกติ',
    text: 'ปกติ',
    shortText: 'ปกติ',
    badgeClass: 'bg-emerald-50 text-emerald-700 font-medium border border-emerald-200',
    icon: '🟢'
  }
}

export function getDaysAgo(dateStr) {
  if (!dateStr) return null
  const parts = String(dateStr).split('-')
  if (parts.length !== 3) return null
  const rec = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10))
  if (isNaN(rec.getTime())) return null
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diffTime = today.getTime() - rec.getTime()
  return Math.round(diffTime / (1000 * 60 * 60 * 24))
}

export function getReceiveAgeStatus(receiveDateStr) {
  const daysAgo = getDaysAgo(receiveDateStr)
  if (daysAgo === null) return { text: '-', shortText: '-', daysAgo: null, badgeClass: 'text-stone-400 bg-stone-50' }
  if (daysAgo <= 0) return { text: 'รับเข้าวันนี้', shortText: 'วันนี้', daysAgo: 0, badgeClass: 'bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200' }
  if (daysAgo === 1) return { text: 'รับมา 1 วันที่แล้ว', shortText: '1 วัน', daysAgo: 1, badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200' }
  if (daysAgo <= 3) return { text: `รับมา ${daysAgo} วันแล้ว`, shortText: `${daysAgo} วัน`, daysAgo, badgeClass: 'bg-amber-50 text-amber-800 font-medium border border-amber-200' }
  return { text: `รับมา ${daysAgo} วันแล้ว (ควรใช้ก่อน)`, shortText: `${daysAgo} วัน`, daysAgo, badgeClass: 'bg-amber-100 text-amber-900 font-bold border border-amber-300' }
}

export function generateDefaultActivityLogs() {
  const now = Date.now()
  return [
    {
      id: 'LOG-001',
      timestamp: new Date(now - 15 * 60 * 1000).toISOString(),
      module: 'stock',
      action: 'adjust',
      title: 'ปรับยอดนับจริง (Stock Audit)',
      description: 'ตรวจนับสต็อก นมสด Meiji: เดิม 5,000 ml เป็น 4,500 ml (-500 ml)',
      targetId: 'MAT002',
      targetName: 'นมสด Meiji',
      targetEmoji: '🥛',
      delta: -500,
      unit: 'ml',
      beforeStock: 5000,
      afterStock: 4500,
      reason: 'ของเสีย/หมดอายุ',
      note: 'นมบูดก่อนกำหนด คัดทิ้งเรียบร้อย',
      user: 'ผู้จัดการสาขา'
    },
    {
      id: 'LOG-002',
      timestamp: new Date(now - 45 * 60 * 1000).toISOString(),
      module: 'stock',
      action: 'produce',
      title: 'ผลิตตามสูตร (Batch Produce)',
      description: 'ผลิต กรีกโยเกิร์ตแท้ +1,200 g (หักนมสด 5,000 ml, หัวเชื้อ 300 g)',
      targetId: 'MAT001',
      targetName: 'กรีกโยเกิร์ตแท้',
      targetEmoji: '🥣',
      delta: 1200,
      unit: 'g',
      beforeStock: 0,
      afterStock: 1200,
      reason: '',
      note: 'รอบผลิตเช้า หมัก 14 ชม. กรองน้ำเวย์ออก',
      user: 'บาริสต้า'
    },
    {
      id: 'LOG-003',
      timestamp: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      module: 'stock',
      action: 'stock_in',
      title: 'รับเข้าสต็อก (Stock In)',
      description: 'รับเข้า นมสด Meiji +10,000 ml (5 ขวด @ ฿54/ขวด)',
      targetId: 'MAT002',
      targetName: 'นมสด Meiji',
      targetEmoji: '🥛',
      delta: 10000,
      unit: 'ml',
      beforeStock: 0,
      afterStock: 10000,
      reason: '',
      note: 'ซื้อตรงจากแม็คโคร ล็อตใหม่ วันหมดอายุ 15/10',
      user: 'ผู้จัดการสาขา'
    },
    {
      id: 'LOG-004',
      timestamp: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
      module: 'pos',
      action: 'order_complete',
      title: 'ขายหน้าร้าน (POS Order)',
      description: 'ออเดอร์ #ORD-261003-101 ขาย Classic Bowl ฿129 (QR PromptPay)',
      targetId: 'ORD-261003-101',
      targetName: 'Classic Greek Yogurt Bowl',
      targetEmoji: '🧾',
      delta: 129,
      unit: '฿',
      reason: '',
      note: 'หน้าร้าน Take away',
      user: 'แคชเชียร์'
    },
    {
      id: 'LOG-005',
      timestamp: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
      module: 'stock',
      action: 'sale_deduct',
      title: 'ตัดสต็อกจากการขาย',
      description: 'ตัดสต็อก กรีกโยเกิร์ตแท้ -150 g จากออเดอร์ #ORD-261003-101',
      targetId: 'MAT001',
      targetName: 'กรีกโยเกิร์ตแท้',
      targetEmoji: '🥣',
      delta: -150,
      unit: 'g',
      beforeStock: 1200,
      afterStock: 1050,
      reason: '',
      note: 'ตัดสต็อกตามสูตรเมนูอัตโนมัติ',
      user: 'ระบบ POS'
    },
    {
      id: 'LOG-006',
      timestamp: new Date(now - 4 * 60 * 60 * 1000).toISOString(),
      module: 'stock',
      action: 'adjust',
      title: 'ปรับยอดนับจริง (Stock Audit)',
      description: 'ตรวจนับสต็อก สตรอว์เบอร์รี่สด: เดิม 1,000 g เป็น 900 g (-100 g)',
      targetId: 'MAT004',
      targetName: 'สตรอว์เบอร์รี่สด',
      targetEmoji: '🍓',
      delta: -100,
      unit: 'g',
      beforeStock: 1000,
      afterStock: 900,
      reason: 'ทำหก/แตกเสียหาย',
      note: 'ผลช้ำระหว่างตัดแต่งขั้ว',
      user: 'พนักงานครัว'
    },
    {
      id: 'LOG-007',
      timestamp: new Date(now - 6 * 60 * 60 * 1000).toISOString(),
      module: 'menu',
      action: 'create',
      title: 'สร้างเมนูใหม่',
      description: 'เพิ่มเมนู Strawberry Biscoff Bowl ลงในระบบ',
      targetId: 'MENU-NEW',
      targetName: 'Strawberry Biscoff Bowl',
      targetEmoji: '🍓',
      reason: '',
      note: 'หมวดหมู่ Acai & Greek Bowls',
      user: 'ผู้จัดการสาขา'
    },
    {
      id: 'LOG-008',
      timestamp: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
      module: 'system',
      action: 'sync',
      title: 'ซิงค์ข้อมูล Google Sheets',
      description: 'ส่งยอดขายและอัปเดตสต็อกคงคลังขึ้น Google Sheets สำเร็จ',
      targetId: 'SYSTEM',
      targetName: 'Google Sheets Live',
      targetEmoji: '☁️',
      reason: '',
      note: 'Auto Sync 24-hr schedule',
      user: 'ระบบ'
    }
  ]
}

const posDefinition = {
  state: () => {
    const loaded = loadDatabase(localStorage)
    const storageError = loaded.ok ? null : loaded.errors.map(e => e.path + ': ' + e.message).join('\n')
    const database = loaded.ok ? loaded.value : normalizeDatabase({}).value
    const storedMaterials = database.materials
    const storedMenus = database.menus
    const storedAddons = database.addons
    const storedPlatforms = database.platforms
    const storedOrders = database.orders
    const storedActivityLogs = database.activityLogs
    const initialCategories = database.categories
    const storedGasUrl = database.gasApiUrl

    // Persist active view/tab so page refresh stays on the same page
    const validTabs = ['dashboard', 'pos', 'menu', 'addon', 'stock', 'settings']
    let initialTab = 'dashboard'
    try {
      const hashTab = window.location.hash ? window.location.hash.replace('#', '').toLowerCase() : ''
      const storedTab = localStorage.getItem('GY_CURRENT_TAB')
      if (validTabs.includes(hashTab)) {
        initialTab = hashTab
      } else if (validTabs.includes(storedTab)) {
        initialTab = storedTab
      }
    } catch (e) {
      initialTab = 'dashboard'
    }

    return {
      storageError,
      currentTab: initialTab, // 'dashboard' | 'pos' | 'menu' | 'addon' | 'stock' | 'settings'
      dashboardPeriod: 'today', // 'today' | 'week' | 'month' | 'all'

      // Master Collections with strict number parsing and default recipe migration
      materials: storedMaterials,
      databaseRevision: database.revision,
      committedDatabase: clone(database),
      stockShortages: database.stockShortages,
      menus: storedMenus,
      addons: storedAddons,
      platforms: storedPlatforms,
      orders: storedOrders,
      activityLogs: storedActivityLogs,

      // POS Active State
      currentPlatformId: storedPlatforms.find(p => p.isActive !== false)?.id || 'PLAT01',
      cart: [],
      orderNote: '',
      paymentMethod: 'QR PromptPay',

      // Modals State
      modals: {
        menuEdit: { isOpen: false, menuId: null },
        addonEdit: { isOpen: false, addonId: null },
        materialEdit: { isOpen: false, materialId: null },
        stockIn: { isOpen: false, materialId: null },
        stockAdjust: { isOpen: false, materialId: null },
        stocktake: { isOpen: false },
        waste: { isOpen: false, materialId: null, lotId: null },
        activityLog: { isOpen: false, module: 'all', targetMaterialId: null },
        customOrder: { isOpen: false, menuId: null },
        receipt: { isOpen: false, order: null },
        lowStockWarning: { isOpen: false, warningItems: [], onConfirm: null },
        emojiPicker: { isOpen: false, targetCallback: null },
        confirm: {
          isOpen: false,
          title: '',
          message: '',
          confirmText: 'ยืนยัน',
          cancelText: 'ยกเลิก',
          type: 'warning', // 'warning' | 'danger' | 'save' | 'info'
          onConfirm: null,
          onCancel: null
        },
        lotDepletion: {
          isOpen: false,
          materialId: null,
          materialName: '',
          materialEmoji: '',
          unit: '',
          currentLot: null,
          nextLot: null,
          neededQty: 0,
          availableInCurrent: 0,
          shortageQty: 0,
          actionContext: 'produce',
          onConfirm: null,
          onCancel: null
        }
      },

      // Google Sheets live sync
      gasApiUrl: storedGasUrl,
      isSyncing: false,
      lastSyncTime: null,

      // Toast notifications
      toasts: [],

      // Categories Management
      categories: initialCategories,

      // Emoji Catalog
      presetEmojis: DEFAULT_PRESET_EMOJIS,
      emojiCatalog: EMOJI_CATALOG,

      // Stock Staged / Draft System (All stock actions are Draft until confirmed at main stock popup)
      stockDraftSnapshot: null,
      transactionDepth: 0,
      transactionToasts: [],
      stockDraftConflict: null,
      stockDraftActions: []
    }
  },

  getters: {
    hasStockDrafts: (state) => {
      if (!state.stockDraftSnapshot) return false
      return state.materials.some(m => {
        const snap = state.stockDraftSnapshot.find(s => s.id === m.id)
        if (!snap) return true
        const diff = Math.round(((Number(m.stock) || 0) - (Number(snap.stock) || 0)) * 100) / 100
        if (diff !== 0) return true
        const snapActiveLotId = snap.lots?.find(l => l.isInUse)?.id
        const curActiveLotId = m.lots?.find(l => l.isInUse)?.id
        return Boolean(snapActiveLotId && curActiveLotId && snapActiveLotId !== curActiveLotId)
      })
    },

    stockDraftSummary: (state) => {
      const changedMap = new Map()
      if (!state.stockDraftSnapshot) return { count: 0, items: [], text: '' }

      state.materials.forEach(m => {
        const snap = state.stockDraftSnapshot.find(s => s.id === m.id)
        const snapStock = snap ? (Number(snap.stock) || 0) : 0
        const curStock = Number(m.stock) || 0
        const diff = Math.round((curStock - snapStock) * 100) / 100

        const snapActiveLotId = snap?.lots?.find(l => l.isInUse)?.id
        const curActiveLotId = m.lots?.find(l => l.isInUse)?.id
        const lotSwitched = Boolean(snapActiveLotId && curActiveLotId && snapActiveLotId !== curActiveLotId)

        if (diff !== 0 || lotSwitched) {
          const matchingAction = Array.isArray(state.stockDraftActions)
            ? state.stockDraftActions.slice().reverse().find(a => a.materialId === m.id)
            : null

          let actionType = diff > 0 ? 'produce' : diff < 0 ? 'adjust' : 'switch_lot'
          let title = diff > 0 ? 'ปรับเพิ่มสต็อก' : diff < 0 ? 'ปรับลดสต็อก' : 'สลับล็อตใช้งาน'
          let description = `${m.name} ${diff > 0 ? '+' : ''}${diff} ${m.unit}`

          if (matchingAction) {
            actionType = matchingAction.type || actionType
            title = matchingAction.title || title
            description = matchingAction.description || description
          }

          changedMap.set(m.id, {
            id: matchingAction?.id || `draft-${m.id}`,
            materialId: m.id,
            name: m.name,
            emoji: m.emoji,
            unit: m.unit,
            actionType,
            title,
            description,
            delta: diff
          })
        }
      })

      const items = Array.from(changedMap.values())
      return {
        count: items.length,
        items,
        text: items.map(i => `${i.name} ${i.delta > 0 ? '+' : ''}${i.delta || ''} ${i.unit || ''}`.trim()).join(', ')
      }
    },
    // Category getters
    menuCategories: (state) => state.categories?.menu || [],
    materialCategories: (state) => state.categories?.material || [],
    addonCategories: (state) => state.categories?.addon || [],

    categoryUsageCounts: (state) => {
      const counts = { menu: {}, material: {}, addon: {} }
      state.menus.forEach(m => {
        if (m.category) counts.menu[m.category] = (counts.menu[m.category] || 0) + 1
      })
      state.materials.filter(m => !m.isDeleted).forEach(m => {
        if (m.category) counts.material[m.category] = (counts.material[m.category] || 0) + 1
      })
      state.addons.forEach(a => {
        if (a.category) counts.addon[a.category] = (counts.addon[a.category] || 0) + 1
      })
      return counts
    },

    // Current selected platform object
    currentPlatform: (state) => {
      return state.platforms.find(p => p.id === state.currentPlatformId) || state.platforms[0]
    },

    // Fast material lookup map
    matMap: (state) => {
      const map = {}
      state.materials.forEach(m => { map[m.id] = m })
      return map
    },

    // Active (non-deleted) materials
    activeMaterials: (state) => {
      return state.materials.filter(m => !m.isDeleted)
    },

    // Main ingredients (ตักเสิร์ฟหน้าร้าน / เมนู)
    mainMaterials: (state) => {
      return state.materials.filter(m => !m.isDeleted && !m.isSubIngredient)
    },

    // Sub-ingredients (วัตถุดิบรอง สำหรับผลิต/หมักเบสโยเกิร์ต)
    subMaterials: (state) => {
      return state.materials.filter(m => !m.isDeleted && Boolean(m.isSubIngredient))
    },

    // Low stock materials
    lowStockMaterials: (state) => {
      return state.materials.filter(m => !m.isDeleted && m.stock <= m.minAlert)
    },

    // Out of stock materials
    outOfStockMaterials: (state) => {
      return state.materials.filter(m => !m.isDeleted && m.stock <= 0)
    },

    // Expiration status getter (returns function to evaluate any material)
    getExpiryStatus: () => (mat) => getExpiryStatus(mat),

    // Expiring materials (expires in 0-2 days)
    expiringMaterials: (state) => {
      return state.materials.filter(m => {
        if (m.isDeleted || !m.expiryDate) return false
        const diff = getExpiryDiffDays(m.expiryDate)
        return diff !== null && diff >= 0 && diff <= 2
      })
    },

    // Expired materials (diff < 0)
    expiredMaterials: (state) => {
      return state.materials.filter(m => {
        if (m.isDeleted || !m.expiryDate) return false
        const diff = getExpiryDiffDays(m.expiryDate)
        return diff !== null && diff < 0
      })
    },

    // Category Tracking Mode Getter
    getCategoryTrackingMode: (state) => (categoryName) => {
      if (!categoryName) return 'none'
      const cat = (state.categories?.material || []).find(
        c => c.name === categoryName || c.label === categoryName
      )
      return cat?.dateTrackingMode || 'none'
    },

    // Material Tracking Mode Getter
    getMaterialTrackingMode: (state) => (mat) => {
      if (!mat || !mat.category) return 'none'
      const cat = (state.categories?.material || []).find(
        c => c.name === mat.category || c.label === mat.category
      )
      return cat?.dateTrackingMode || 'none'
    },

    // Real-time lot action preview (Merge vs New Lot vs Direct Sum)
    getLotActionPreview: (state) => (mat, receiveDate, expiryDate) => {
      if (!mat) return { action: 'none', label: '', shortLabel: '', icon: '', badgeClass: '' }
      const cat = state.categories.material?.find(
        c => c.name === mat.category || c.label === mat.category
      )
      const mode = cat?.dateTrackingMode || 'none'

      if (mode === 'none') {
        return {
          action: 'direct_sum',
          label: 'สินค้าไม่คุมวันหมดอายุ — จะบวกทบเข้ายอดคงเหลือรวมทันที (ไม่แยกขยะล็อต)',
          shortLabel: 'บวกทบยอดรวม',
          icon: '📦',
          badgeClass: 'bg-stone-50 text-stone-700 border border-stone-200/80'
        }
      }

      const recDate = receiveDate || getTodayString()
      const expDate = expiryDate || null

      if (!mat.lots || mat.lots.length === 0) {
        return {
          action: 'new_lot',
          label: 'ยังไม่มีประวัติล็อต — จะเปิดเป็นล็อตใหม่ (เริ่มนับอายุสต็อก)',
          shortLabel: 'เปิดล็อตใหม่',
          icon: '✨',
          badgeClass: 'bg-emerald-50 text-emerald-800 border border-emerald-200'
        }
      }

      let matchingLot = null
      if (mode === 'expiry_and_receive') {
        matchingLot = mat.lots.find(l => (l.receiveDate === recDate || !l.receiveDate) && (l.expiryDate || null) === expDate && l.qty > 0)
          || mat.lots.find(l => (l.expiryDate || null) === expDate && l.qty > 0)
      } else if (mode === 'receive_only') {
        matchingLot = mat.lots.find(l => l.receiveDate === recDate && l.qty > 0)
      }

      if (matchingLot) {
        return {
          action: 'merge',
          targetLot: matchingLot,
          label: `วันหมดอายุ/รอบรับตรงกับล็อตเดิม — จะรวมยอดเข้าล็อตเดิม (คงเหลือเดิม ${Number(matchingLot.qty || 0).toLocaleString()} ${mat.unit})`,
          shortLabel: 'รวมเข้าล็อตเดิม',
          icon: '🔄',
          badgeClass: 'bg-sky-50 text-sky-800 border border-sky-200'
        }
      }

      const expText = expDate ? ` (Exp: ${formatThaiDate(expDate)})` : ''
      return {
        action: 'new_lot',
        label: `วันหมดอายุใหม่${expText} — จะเปิดเป็นล็อตใหม่ (จัดคิวใช้อัตโนมัติแบบ FIFO)`,
        shortLabel: 'เปิดล็อตใหม่ (FIFO)',
        icon: '✨',
        badgeClass: 'bg-amber-50 text-amber-900 border border-amber-200'
      }
    },

    // Sorted active lots for a material
    getMaterialLots: () => (mat, showDepleted = false) => {
      if (!mat || !mat.lots) return []
      let list = showDepleted ? [...mat.lots] : mat.lots.filter(l => l.qty > 0)
      return list.sort((a, b) => {
        if (a.isInUse && !b.isInUse) return -1
        if (!a.isInUse && b.isInUse) return 1
        if (a.expiryDate && b.expiryDate) return a.expiryDate.localeCompare(b.expiryDate)
        if (a.receiveDate && b.receiveDate) return a.receiveDate.localeCompare(b.receiveDate)
        return 0
      })
    },

    // Material In-Use Active Lot
    getMaterialActiveLot: () => (mat) => {
      if (!mat || !mat.lots || mat.lots.length === 0) return null
      return mat.lots.find(l => l.isInUse && l.qty > 0) || mat.lots.find(l => l.qty > 0) || mat.lots[0]
    },

    // ========================================================
    // RAW MATERIAL COST & BUDGET VALUATION (งบต้นทุนวัตถุดิบโดยรวม)
    // ========================================================
    
    // 1. Total baseline valuation of all raw materials & packaging currently in stock (มูลค่ายอดจริงปัจจุบัน - Committed Asset)
    totalInventoryValuation: (state) => {
      const source = state.stockDraftSnapshot || state.materials
      return source
        .filter(m => !m.isDeleted)
        .reduce((sum, m) => sum + (Math.max(0, m.stock) * (m.unitCost || 0)), 0)
    },

    // 1b. Projected total valuation including pending draft adjustments (มูลค่าคาดการณ์รวมแบบร่าง)
    projectedInventoryValuation: (state) => {
      return state.materials
        .filter(m => !m.isDeleted)
        .reduce((sum, m) => sum + (Math.max(0, m.stock) * (m.unitCost || 0)), 0)
    },

    // 1c. Draft valuation difference in Baht (+ for increase, - for decrease)
    draftInventoryValuationDiff: (state) => {
      if (!state.stockDraftSnapshot) return 0
      const baseline = state.stockDraftSnapshot
        .filter(m => !m.isDeleted)
        .reduce((sum, m) => sum + (Math.max(0, m.stock) * (m.unitCost || 0)), 0)
      const current = state.materials
        .filter(m => !m.isDeleted)
        .reduce((sum, m) => sum + (Math.max(0, m.stock) * (m.unitCost || 0)), 0)
      return Math.round((current - baseline) * 100) / 100
    },

    // 2. Inventory Valuation broken down by category (มูลค่าตามหมวดหมู่)
    inventoryValuationByCategory: (state) => {
      const breakdown = {}
      state.materials.filter(m => !m.isDeleted).forEach(m => {
        const cat = m.category || 'อื่นๆ'
        if (!breakdown[cat]) {
          breakdown[cat] = { category: cat, totalValue: 0, itemCount: 0, items: [] }
        }
        const val = Math.max(0, m.stock) * (m.unitCost || 0)
        breakdown[cat].totalValue += val
        breakdown[cat].itemCount += 1
        breakdown[cat].items.push({ name: m.name, emoji: m.emoji, stock: m.stock, unit: m.unit, value: val })
      })
      return Object.values(breakdown).sort((a, b) => b.totalValue - a.totalValue)
    },

    // 3. Estimated budget required to restock all low-stock items back to safe buffer (งบเติมสต็อกที่ต้องใช้)
    // Only calculate for purchased items (!hasSubRecipe) to avoid double-counting with produced Greek Yogurt
    reorderBudgetNeeded: (state) => {
      return state.materials
        .filter(m => !m.isDeleted && !m.hasSubRecipe && m.stock <= m.minAlert)
        .reduce((sum, m) => {
          const targetStock = m.minAlert * 2
          const deficit = Math.max(0, targetStock - m.stock)
          return sum + (deficit * (m.unitCost || 0))
        }, 0)
    },

    // 4. Production Capacity for in-house produced items (e.g. Greek Yogurt) from available unexpired sub-ingredients
    productionCapacity: (state) => {
      const result = {}
      state.materials
        .filter(m => !m.isDeleted && m.hasSubRecipe && m.subRecipe && m.subRecipe.length > 0)
        .forEach(m => {
          let maxBatches = Infinity
          let limitingMat = null

          for (const req of m.subRecipe) {
            const subMat = state.materials.find(sm => sm.id === req.materialId)
            if (!subMat) {
              maxBatches = 0
              break
            }
            let unexpiredStock = 0
            if (subMat.lots && subMat.lots.length > 0) {
              unexpiredStock = subMat.lots
                .filter(l => l.qty > 0 && !isExpired(l))
                .reduce((sum, l) => sum + (Number(l.qty) || 0), 0)
            } else {
              unexpiredStock = isExpired(subMat) ? 0 : (Number(subMat.stock) || 0)
            }

            const batches = req.qty > 0 ? Math.floor(unexpiredStock / req.qty) : 0
            if (batches < maxBatches) {
              maxBatches = batches
              limitingMat = subMat
            }
          }

          const batchesPossible = maxBatches === Infinity ? 0 : maxBatches
          result[m.id] = {
            batches: batchesPossible,
            yieldAmount: batchesPossible * (Number(m.yieldQty) || 0),
            unit: m.unit,
            limitingMaterial: limitingMat?.name || null
          }
        })
      return result
    },

    // Sales & Profit Analytics
    filteredOrders: (state) => {
      const now = new Date()
      const todayStr = businessDateKey(now)
      return state.orders.filter(ord => {
        if (!ord.createdAt) return false
        const ordDateStr = businessDateKey(ord.createdAt)
        if (state.dashboardPeriod === 'today') return ordDateStr === todayStr
        if (state.dashboardPeriod === 'week') {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          return new Date(ord.createdAt) >= sevenDaysAgo
        }
        if (state.dashboardPeriod === 'month') {
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          return new Date(ord.createdAt) >= thirtyDaysAgo
        }
        return true
      })
    },

    dashboardMetrics() {
      const orders = this.filteredOrders
      const totalSales = orders.reduce((sum, o) => sum + (o.subtotal || 0), 0)
      const totalGp = orders.reduce((sum, o) => sum + (o.gpAmount || 0), 0)
      const netRevenue = orders.reduce((sum, o) => sum + (o.netRevenue || 0), 0)
      const totalFoodCost = orders.reduce((sum, o) => sum + (o.foodCost || 0), 0)
      const grossProfit = orders.reduce((sum, o) => sum + (o.grossProfit || 0), 0)
      const orderCount = orders.length
      const avgOrderValue = orderCount > 0 ? (totalSales / orderCount) : 0
      const foodCostRatio = totalSales > 0 ? ((totalFoodCost / totalSales) * 100) : 0

      return {
        totalSales,
        totalGp,
        netRevenue,
        totalFoodCost,
        grossProfit,
        orderCount,
        avgOrderValue,
        foodCostRatio
      }
    },

    // Cart Calculation
    cartSummary() {
      const plat = this.currentPlatform
      let subtotal = 0
      let totalFoodCost = 0

      this.cart.forEach(item => {
        const menuPrice = (item.menu.prices && item.menu.prices[plat.id] !== undefined)
          ? Number(item.menu.prices[plat.id])
          : 0
        let itemUnitPrice = menuPrice

        // Add-ons price
        if (item.selectedAddons && item.selectedAddons.length > 0) {
          item.selectedAddons.forEach(addon => {
            const addPrice = (addon.prices && addon.prices[plat.id] !== undefined)
              ? Number(addon.prices[plat.id])
              : 0
            itemUnitPrice += addPrice
          })
        }

        subtotal += (itemUnitPrice * item.qty)

        let singleItemCost = 0
        const materials=this.stockDraftSnapshot||this.materials
        for(const r of getEffectiveRequirements(item.menu,item.selectedAddons,1,materials))singleItemCost+=r.qty*(materials.find(m=>m.id===r.materialId)?.unitCost||0)
        totalFoodCost += (singleItemCost * item.qty)
      })

      const gpPercent = plat.gpPercent || 0
      const gpAmount = Math.round((subtotal * (gpPercent / 100)) * 100) / 100
      const netRevenue = Math.round((subtotal - gpAmount) * 100) / 100
      const grossProfit = Math.round((netRevenue - totalFoodCost) * 100) / 100

      return {
        itemCount: this.cart.reduce((sum, item) => sum + item.qty, 0),
        subtotal,
        gpPercent,
        gpAmount,
        netRevenue,
        totalFoodCost,
        grossProfit
      }
    },

    // Warning getter for materials in POS cart whose active lots are depleted or nearly empty
    cartLotWarnings() {
      if (!this.cart || this.cart.length === 0) return []
      const required = {}
      this.cart.forEach(item => {
        if (item.menu.hasPackage !== false && item.menu.recipe) {
          item.menu.recipe.forEach(r => {
            required[r.materialId] = (required[r.materialId] || 0) + (r.qty * item.qty)
          })
        } else if (item.menu.recipe) {
          item.menu.recipe.forEach(r => {
            const m = this.materials.find(x => x.id === r.materialId)
            if (m && m.category !== 'Packaging') {
              required[r.materialId] = (required[r.materialId] || 0) + (r.qty * item.qty)
            }
          })
        }
        if (item.selectedAddons) {
          item.selectedAddons.forEach(a => {
            if (a.materialId && a.amountUsed) {
              required[a.materialId] = (required[a.materialId] || 0) + (a.amountUsed * item.qty)
            }
          })
        }
      })

      const warnings = []
      for (const [matId, neededQty] of Object.entries(required)) {
        const mat = this.materials.find(m => m.id === matId)
        if (!mat || !mat.lots || mat.lots.length === 0) continue

        const check = this.checkLotDepletion(matId, neededQty)
        if ((check.willDeplete || check.isShort || check.isLow) && check.nextLot) {
          warnings.push({
            material: mat,
            currentLot: check.currentLot,
            nextLot: check.nextLot,
            neededQty: Number(neededQty) || 0,
            availableInCurrent: check.availableInCurrent,
            remainingAfter: check.remainingAfter,
            shortageQty: check.shortageQty,
            willDeplete: check.willDeplete,
            isShort: check.isShort,
            isLow: check.isLow
          })
        }
      }
      return warnings
    }
  },

  actions: {
    // Tab switching with unsaved changes safeguard
    async switchTab(tab) {
      if (this.currentTab === tab) return

      const hasActiveEdit = Boolean(
        this.modals.menuEdit.isOpen ||
        this.modals.materialEdit.isOpen ||
        this.modals.addonEdit.isOpen ||
        this.modals.stockIn.isOpen ||
        this.modals.stockAdjust.isOpen
      )

      if (hasActiveEdit) {
        const ok = await this.confirmDialog({
          title: 'มีหน้าต่างแก้ไขเปิดอยู่',
          message: 'คุณกำลังเปิดหน้าต่างแก้ไขข้อมูลอยู่ หากสลับหน้าระบบจะปิดหน้าต่างแก้ไขลง\nต้องการสลับหน้าต่างหรือไม่?',
          confirmText: 'สลับหน้าต่าง',
          cancelText: 'อยู่หน้านี้ต่อ',
          type: 'warning'
        })
        if (!ok) return

        // Close all active edit modals
        this.modals.menuEdit.isOpen = false
        this.modals.materialEdit.isOpen = false
        this.modals.addonEdit.isOpen = false
        this.modals.stockIn.isOpen = false
        this.modals.stockAdjust.isOpen = false
      }

      this.currentTab = tab
      try {
        localStorage.setItem('GY_CURRENT_TAB', tab)
        if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
          window.history.replaceState(null, '', `#${tab}`)
        }
      } catch (e) {}
    },

    // Promise-based Confirm Dialog (Greek Yogg Design System)
    confirmDialog({ title, message, confirmText = 'ยืนยัน', cancelText = 'ยกเลิก', type = 'warning' }) {
      return new Promise((resolve) => {
        this.modals.confirm = {
          isOpen: true,
          title,
          message,
          confirmText,
          cancelText,
          type,
          onConfirm: () => {
            this.modals.confirm.isOpen = false
            resolve(true)
          },
          onCancel: () => {
            this.modals.confirm.isOpen = false
            resolve(false)
          }
        }
      })
    },

    // Real-time Lot Depletion & Low-Stock Dialog
    promptLotDepletion({
      material,
      currentLot,
      nextLot,
      neededQty = 0,
      availableInCurrent = 0,
      shortageQty = null,
      remainingAfter = null,
      willDeplete = true,
      isLow = false,
      actionContext = 'produce'
    }) {
      const needed = Number(neededQty) || 0
      const available = Number(availableInCurrent) || (Number(currentLot?.qty) || 0)
      const shortage = shortageQty !== null ? shortageQty : Math.max(0, Math.round((needed - available) * 100) / 100)
      const remaining = remainingAfter !== null ? remainingAfter : Math.max(0, Math.round((available - needed) * 100) / 100)

      return new Promise((resolve) => {
        this.modals.lotDepletion = {
          isOpen: true,
          materialId: material.id,
          materialName: material.name,
          materialEmoji: material.emoji || '📦',
          unit: material.unit || '',
          currentLot,
          nextLot,
          neededQty: needed,
          availableInCurrent: available,
          shortageQty: shortage,
          remainingAfter: remaining,
          willDeplete: willDeplete !== undefined ? willDeplete : (available <= needed),
          isLow,
          actionContext,
          onConfirm: () => {
            this.modals.lotDepletion.isOpen = false
            resolve(true)
          },
          onCancel: () => {
            this.modals.lotDepletion.isOpen = false
            resolve(false)
          }
        }
      })
    },

    // Check if an upcoming deduction from a material will deplete or leave active lot low
    checkLotDepletion(materialId, neededQty) {
      const mat = this.materials.find(m => m.id === materialId)
      if (!mat || !mat.lots || mat.lots.length === 0) {
        return {
          willDeplete: false,
          isShort: false,
          isLow: false,
          currentLot: null,
          nextLot: null,
          availableInCurrent: 0,
          remainingAfter: 0,
          shortageQty: 0
        }
      }

      const isLotExpired = (lot) => isExpired(lot)

      const activeLot = mat.lots.find(l => l.isInUse && l.qty > 0 && !isLotExpired(l)) || mat.lots.find(l => l.qty > 0 && !isLotExpired(l)) || mat.lots[0]
      const curQty = Number(activeLot?.qty) || 0
      const reqQty = Number(neededQty) || 0
      const minAlert = Number(mat.minAlert) || 0

      const otherLots = mat.lots
        .filter(l => l.id !== activeLot?.id && l.qty > 0 && !isLotExpired(l))
        .sort((a, b) => {
          if (a.expiryDate && b.expiryDate) return a.expiryDate.localeCompare(b.expiryDate)
          return (a.receiveDate || '').localeCompare(b.receiveDate || '')
        })
      const nextLot = otherLots[0] || null

      const willDeplete = Boolean(activeLot && curQty <= reqQty && curQty > 0)
      const isShort = Boolean(activeLot && curQty < reqQty)
      const shortageQty = Math.max(0, Math.round((reqQty - curQty) * 100) / 100)
      const remainingAfter = Math.max(0, Math.round((curQty - reqQty) * 100) / 100)

      // isLow: if remaining after deduction is <= minAlert (or if active lot is already <= minAlert)
      const isLow = Boolean(activeLot && (remainingAfter <= minAlert || curQty <= minAlert) && remainingAfter > 0)

      return {
        willDeplete,
        isShort,
        isLow,
        currentLot: activeLot,
        nextLot,
        availableInCurrent: curQty,
        remainingAfter,
        shortageQty
      }
    },

    // Silently switch active lot (e.g. during automatic rollover after user confirmation)
    switchActiveLotSilently(materialId, lotId) {
      const mat = this.materials.find(m => m.id === materialId)
      if (!mat || !mat.lots) return
      mat.lots.forEach(l => {
        l.isInUse = (l.id === lotId)
      })
      const targetLot = mat.lots.find(l => l.id === lotId)
      if (targetLot) {
        if (targetLot.receiveDate) mat.lastStockInDate = targetLot.receiveDate
        if (targetLot.expiryDate) mat.expiryDate = targetLot.expiryDate
      }
    },

    setPlatform(platId) {
      this.currentPlatformId = platId
    },

    // Toast Notifications
    showToast(message, type = 'success') {
      if (this.transactionDepth) { this.transactionToasts.push({message,type}); return }
      const id = Date.now() + Math.random()
      this.toasts.push({ id, message, type })
      setTimeout(() => {
        this.toasts = this.toasts.filter(t => t.id !== id)
      }, 3500)
    },

    // ========================================================
    // STORAGE & SYNC
    // ========================================================
    databaseSnapshot({ committedMaterials = true } = {}) {
      const data = {schemaVersion: 3, revision: this.databaseRevision}
      for (const field of DATABASE_FIELDS) data[field] = clone(this[field])
      if (committedMaterials && this.stockDraftSnapshot) data.materials = clone(this.stockDraftSnapshot)
      return data
    },
    exportDatabase() { return this.databaseSnapshot() },
    publishDatabase(database, { preserveDraft = false } = {}) {
      const draft = preserveDraft && this.stockDraftSnapshot ? clone(this.materials) : null
      for (const field of DATABASE_FIELDS) this[field] = clone(database[field])
      this.databaseRevision = database.revision
      this.committedDatabase = clone(database)
      if (draft) { this.stockDraftSnapshot = clone(database.materials); this.materials = draft }
    },
    commitDatabase(candidate, { preserveDraft = false, recovery = false } = {}) {
      if (this.storageError && !recovery) return {ok:false, code:'RECOVERY_REQUIRED', message:this.storageError}
      const result = saveDatabase(localStorage, candidate, {expectedRevision: this.databaseRevision})
      if (result.ok) { this.publishDatabase(result.value,{preserveDraft}); this.storageError = null }
      else { this.showToast('บันทึกไม่สำเร็จ: ' + result.message, 'error') }
      return result
    },
    persistLocal() {
      if(this.transactionDepth)return {ok:true,pending:true}

      const result = this.commitDatabase(this.databaseSnapshot(), {preserveDraft: true})
      if (!result.ok) this.publishDatabase(this.committedDatabase)
      return result
    },
    replaceDatabase(raw, { source = 'import' } = {}) {
      const normalized = normalizeDatabase(raw,{source})
      if (!normalized.ok) return {ok:false,code:'VALIDATION_FAILED',message:normalized.errors.map(e=>e.path+': '+e.message).join('\n')}
      const result = this.commitDatabase(normalized.value,{recovery:true})
      if (!result.ok) return result
      this.stockDraftSnapshot = null
      this.stockDraftActions = []
      this.stockDraftConflict = null
      this.clearCart()
      this.currentPlatformId = this.platforms.find(p=>p.isActive!==false).id
      for (const modal of Object.values(this.modals)) { modal.isOpen=false; if('onConfirm' in modal)modal.onConfirm=null; if('onCancel' in modal)modal.onCancel=null; if('targetCallback' in modal)modal.targetCallback=null }
      return result
    },

    // ========================================================
    // STOCK DRAFT / STAGED ACTIONS (Real Final Save at Main Stock Popup)
    // ========================================================
    initStockDraftSnapshot() {
      this.stockDraftSnapshot = JSON.parse(JSON.stringify(this.materials))
      this.stockDraftActions = []
    },

    addStockDraftAction(action) {
      if (!this.stockDraftSnapshot) {
        this.initStockDraftSnapshot()
      }
      this.stockDraftActions.push({
        id: `draft-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        timestamp: new Date().toISOString(),
        ...action
      })
    },

    reconcileMaterialDraft(materialId) {
      if (!this.stockDraftSnapshot) return
      const mat = this.materials.find(m => m.id === materialId)
      const snap = this.stockDraftSnapshot.find(s => s.id === materialId)
      if (!mat || !snap) return

      const diff = Math.round(((Number(mat.stock) || 0) - (Number(snap.stock) || 0)) * 100) / 100
      const snapActiveLotId = snap.lots?.find(l => l.isInUse)?.id
      const curActiveLotId = mat.lots?.find(l => l.isInUse)?.id
      const lotSwitched = Boolean(snapActiveLotId && curActiveLotId && snapActiveLotId !== curActiveLotId)

      if (diff === 0 && !lotSwitched) {
        // Fully reverted back to snapshot state
        mat.stock = snap.stock
        if (snap.lots) {
          mat.lots = JSON.parse(JSON.stringify(snap.lots))
        }
        mat.lastStockInDate = snap.lastStockInDate
        mat.expiryDate = snap.expiryDate
        mat.unitCost = snap.unitCost
        mat.packCost = snap.packCost

        // Remove any pending draft actions for this material
        if (Array.isArray(this.stockDraftActions)) {
          this.stockDraftActions = this.stockDraftActions.filter(a => a.materialId !== materialId)
        }
      }
    },

    commitStockDrafts() {
      if(this.stockDraftConflict)return {ok:false,code:'DRAFT_CONFLICT',message:'แบบร่างขัดแย้งกับรายการขาย กรุณายกเลิกและตรวจนับใหม่'}
      const candidate=this.databaseSnapshot({committedMaterials:false})
      const logs=this.stockDraftActions.flatMap(a=>[a.log,...(a.subLogs||[])].filter(Boolean)).map(log=>this.makeActivityLog(log))
      candidate.activityLogs=[...logs,...candidate.activityLogs].slice(0,500)
      const result=this.commitDatabase(candidate)
      if(!result.ok)return result
      this.stockDraftSnapshot=clone(this.materials)
      this.stockDraftActions=[]
      this.showToast('บันทึกข้อมูลคลังสำเร็จ','success')
      return {...result,success:true}
    },

    discardStockDrafts() {
      if (this.stockDraftSnapshot) {
        this.materials = JSON.parse(JSON.stringify(this.stockDraftSnapshot))
      }
      this.stockDraftActions = []
      this.stockDraftSnapshot = JSON.parse(JSON.stringify(this.materials))
      this.showToast('ยกเลิกรายการทั้งหมดแล้ว คืนค่าสต็อกเดิมเรียบร้อย', 'info')
    },

    clearAllData() {
      const result=this.replaceDatabase({platforms:clone(this.platforms),categories:clone(this.categories),gasApiUrl:this.gasApiUrl},{source:'clear'})
      if(result.ok)this.showToast('ล้างข้อมูลเรียบร้อยแล้ว','info')
      return result
    },
    resetDemoData() {
      const result=this.replaceDatabase({materials:DEFAULT_MATERIALS,menus:DEFAULT_MENUS,addons:DEFAULT_ADDONS,platforms:DEFAULT_PLATFORMS,orders:DEFAULT_ORDERS,activityLogs:generateDefaultActivityLogs(),categories:DEFAULT_CATEGORIES,gasApiUrl:this.gasApiUrl},{source:'demo'})
      if(result.ok)this.showToast('โหลดข้อมูลตัวอย่างสำเร็จ','info')
      return result
    },

    // ========================================================
    // ACTIVITY LOGS & AUDIT TRAIL
    // ========================================================
    makeActivityLog(logData) {
      if (!this.activityLogs) this.activityLogs = []
      const targetId = logData.targetId || logData.materialId || null
      const targetName = logData.targetName || logData.materialName || ''
      const targetEmoji = logData.targetEmoji || (targetId && this.matMap[targetId]?.emoji) || ''
      const unit = logData.unit || logData.materialUnit || ''
      const title = logData.title || logData.actionLabel || 'บันทึกกิจกรรม'
      const user = logData.user || logData.operator || 'ผู้ดูแลระบบ / แคชเชียร์'

      const newLog = {
        id: 'LOG-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        timestamp: new Date().toISOString(),
        module: logData.module || 'stock', // 'stock' | 'pos' | 'menu' | 'addon' | 'system'
        action: logData.action || 'info', // 'adjust' | 'stock_in' | 'produce' | 'produce_deduct' | 'sale_deduct' | 'quick_adjust' | 'create' | 'edit' | 'delete' | 'order_complete'
        title,
        description: logData.description || (logData.note ? `${title}: ${logData.note}` : `${title} ${targetName}`),
        targetId,
        targetName,
        targetEmoji,
        delta: logData.delta !== undefined ? logData.delta : null,
        unit,
        beforeStock: logData.beforeStock !== undefined ? logData.beforeStock : null,
        afterStock: logData.afterStock !== undefined ? logData.afterStock : null,
        reason: logData.reason || '',
        note: logData.note || '',
        cost: logData.cost || null,
        user
      }
      return newLog
    },
    addActivityLog(logData) {
      const log=this.makeActivityLog(logData)
      this.activityLogs=[log,...(this.activityLogs||[])].slice(0,500)
      this.persistLocal()
      return log
    },

    openActivityLog(module = 'all', targetMaterialId = null) {
      this.modals.activityLog.module = module || 'all'
      this.modals.activityLog.targetMaterialId = targetMaterialId || null
      this.modals.activityLog.isOpen = true
    },

    closeActivityLog() {
      this.modals.activityLog.isOpen = false
      this.modals.activityLog.targetMaterialId = null
    },

    clearActivityLogs() {
      this.activityLogs = []
      this.persistLocal()
      this.showToast('ล้างประวัติกิจกรรมเรียบร้อยแล้ว', 'info')
    },

    // ========================================================
    // CATEGORY MANAGEMENT
    // ========================================================
    openEmojiPicker(callback) {
      this.modals.emojiPicker = {
        isOpen: true,
        targetCallback: callback
      }
    },

    saveCategory(type, categoryData) {
      if (!this.categories || !this.categories[type]) {
        return { success: false, error: 'Invalid category type' }
      }
      const name = (categoryData.name || '').trim()
      if (!name) {
        this.showToast('กรุณากรอกชื่อหมวดหมู่', 'error')
        return { success: false, error: 'Empty name' }
      }

      const existingIndex = this.categories[type].findIndex(c => c.id === categoryData.id)
      if (existingIndex >= 0) {
        const oldCat = this.categories[type][existingIndex]
        const oldName = oldCat.name

        // Check duplicate name
        const duplicate = this.categories[type].some(
          (c, idx) => idx !== existingIndex && c.name.toLowerCase() === name.toLowerCase()
        )
        if (duplicate) {
          this.showToast(`มีหมวดหมู่ชื่อ "${name}" อยู่แล้ว`, 'error')
          return { success: false, error: 'Duplicate name' }
        }

        this.categories[type][existingIndex] = {
          ...oldCat,
          ...categoryData,
          name,
          label: categoryData.label !== undefined ? categoryData.label : oldCat.label,
          dateTrackingMode: categoryData.dateTrackingMode !== undefined ? categoryData.dateTrackingMode : (oldCat.dateTrackingMode || 'none')
        }

        // Cascade rename to existing items
        if (oldName !== name) {
          if (type === 'menu') {
            this.menus.forEach(m => {
              if (m.category === oldName) m.category = name
            })
          } else if (type === 'material') {
            this.materials.forEach(m => {
              if (m.category === oldName) m.category = name
            })
          } else if (type === 'addon') {
            this.addons.forEach(a => {
              if (a.category === oldName) a.category = name
            })
          }
        }

        this.persistLocal()
        this.showToast(`บันทึกการแก้ไขหมวดหมู่ "${name}" สำเร็จ`, 'success')
        return { success: true }
      } else {
        // Add new category
        const duplicate = this.categories[type].some(
          c => c.name.toLowerCase() === name.toLowerCase()
        )
        if (duplicate) {
          this.showToast(`มีหมวดหมู่ชื่อ "${name}" อยู่แล้ว`, 'error')
          return { success: false, error: 'Duplicate name' }
        }

        const newId = `cat-${type}-${Date.now()}`
        this.categories[type].push({
          id: newId,
          name,
          label: categoryData.label || name,
          icon: categoryData.icon || (type === 'menu' ? '🥣' : type === 'material' ? '📦' : '✨'),
          dateTrackingMode: categoryData.dateTrackingMode || 'none'
        })

        this.persistLocal()
        this.showToast(`เพิ่มหมวดหมู่ "${name}" สำเร็จ`, 'success')
        return { success: true }
      }
    },

    deleteCategory(type, categoryId) {
      if (!this.categories || !this.categories[type]) {
        return { success: false, error: 'Invalid category type' }
      }
      const cat = this.categories[type].find(c => c.id === categoryId)
      if (!cat) return { success: false, error: 'Category not found' }

      // Check if any items use this category
      let inUseCount = 0
      if (type === 'menu') {
        inUseCount = this.menus.filter(m => m.category === cat.name).length
      } else if (type === 'material') {
        inUseCount = this.materials.filter(m => !m.isDeleted && m.category === cat.name).length
      } else if (type === 'addon') {
        inUseCount = this.addons.filter(a => a.category === cat.name).length
      }

      if (inUseCount > 0) {
        const itemTypeLabel = type === 'menu' ? 'เมนู' : type === 'material' ? 'วัตถุดิบ' : 'Add-on'
        this.showToast(`ไม่สามารถลบหมวดหมู่ "${cat.name}" ได้ เนื่องจากมี ${inUseCount} ${itemTypeLabel} ใช้งานอยู่`, 'error')
        return { success: false, inUseCount }
      }

      this.categories[type] = this.categories[type].filter(c => c.id !== categoryId)
      this.persistLocal()
      this.showToast(`ลบหมวดหมู่ "${cat.name}" เรียบร้อยแล้ว`, 'info')
      return { success: true }
    },

    saveGasUrl(url) {
      this.gasApiUrl = url.trim()
      this.persistLocal()
      this.showToast('บันทึก Google Sheets API URL สำเร็จ', 'success')
    },

    async syncWithGas() {
      if (!this.gasApiUrl) {
        this.showToast('กรุณาระบุ Web App URL ในหน้าตั้งค่าก่อนซิงค์', 'error')
        return
      }
      this.isSyncing = true
      try {
        const payload = {
          action: 'syncAll',
          data: {
            materials: this.materials,
            menus: this.menus,
            addons: this.addons,
            orders: this.orders
          }
        }
        await fetch(this.gasApiUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        this.lastSyncTime = new Date().toLocaleTimeString('th-TH')
        this.showToast('ส่งข้อมูลซิงค์ไปยัง Google Sheets เรียบร้อย', 'success')
      } catch (err) {
        console.error('GAS Sync error:', err)
        this.showToast('การซิงค์ขัดข้อง: ' + err.message, 'error')
      } finally {
        this.isSyncing = false
      }
    },

    // ========================================================
    // MENU CRUD & MANAGEMENT
    // ========================================================
    saveMenu(menuData) {
      if (menuData.id) {
        const idx = this.menus.findIndex(m => m.id === menuData.id)
        if (idx >= 0) {
          this.menus[idx] = { ...this.menus[idx], ...menuData }
        }
      } else {
        const newId = createEntityId('MENU',this.menus.map(m=>m.id))
        this.menus.push({ ...menuData, id: newId, isActive: true })
      }
      this.persistLocal()
      this.showToast(`บันทึกเมนู "${menuData.name}" สำเร็จ`, 'success')
    },

    deleteMenu(menuId) {
      const idx = this.menus.findIndex(m => m.id === menuId)
      if (idx >= 0) {
        const name = this.menus[idx].name
        this.menus.splice(idx, 1)
        this.persistLocal()
        this.showToast(`ลบเมนู "${name}" แล้ว`, 'info')
      }
    },

    toggleMenuStatus(menuId) {
      const menu = this.menus.find(m => m.id === menuId)
      if (menu) {
        menu.isActive = !menu.isActive
        this.persistLocal()
      }
    },

    // ========================================================
    // ADDON CRUD & MANAGEMENT
    // ========================================================
    saveAddon(addonData) {
      if (addonData.id) {
        const idx = this.addons.findIndex(a => a.id === addonData.id)
        if (idx >= 0) {
          this.addons[idx] = { ...this.addons[idx], ...addonData }
        }
      } else {
        const newId = createEntityId('ADD',this.addons.map(m=>m.id))
        this.addons.push({ ...addonData, id: newId, isActive: true })
      }
      this.persistLocal()
      this.showToast(`บันทึก Add-on "${addonData.name}" สำเร็จ`, 'success')
    },

    deleteAddon(addonId) {
      const idx = this.addons.findIndex(a => a.id === addonId)
      if (idx >= 0) {
        const name = this.addons[idx].name
        this.addons.splice(idx, 1)
        this.persistLocal()
        this.showToast(`ลบ Add-on "${name}" แล้ว`, 'info')
      }
    },

    toggleAddonStatus(addonId) {
      const addon = this.addons.find(a => a.id === addonId)
      if (addon) {
        addon.isActive = !addon.isActive
        this.persistLocal()
      }
    },

    // ========================================================
    // MATERIAL & INVENTORY CRUD
    // ========================================================
    saveMaterial(matData) {
      const requested=Number(matData.stock??0)
      if(!Number.isFinite(requested)||requested<0)return false
      let mat=this.materials.find(m=>m.id===matData.id)
      const oldStock=mat?.stock||0
      const id=mat?.id||createEntityId('MAT',this.materials.map(m=>m.id))
      const clean={...mat,...clone(matData),id,stock:oldStock,lots:clone(mat?.lots||[]),isDeleted:mat?.isDeleted||false}
      clean.packSize=Number(matData.packSize??mat?.packSize??1)
      clean.unitCost=Number(matData.unitCost??mat?.unitCost??0)
      clean.packCost=Number(matData.packCost??mat?.packCost??clean.unitCost*clean.packSize)
      clean.minAlert=Number(matData.minAlert??mat?.minAlert??0)
      if(mat)Object.assign(mat,clean);else{this.materials.push(clean);mat=clean}
      if(requested>oldStock && mat.hasSubRecipe && mat.subRecipe?.length) {
        const yieldQty=Number(mat.yieldQty||mat.packSize)
        if(!Number.isFinite(yieldQty)||yieldQty<=0)return false
        const ingredients=mat.subRecipe.map(r=>({materialId:r.materialId,qty:Number(r.qty)*(requested-oldStock)/yieldQty}))
        const result=this.batchProduce(id,requested-oldStock,ingredients,'ผลิตจากหน้าจัดการวัตถุดิบ',{},false)
        if(result===false||result?.success===false||result?.ok===false)return false
      }else if(requested!==oldStock)this.stockAdjust(id,requested,'แก้ไขยอดจากหน้าจัดการวัตถุดิบ','',false)
      this.persistLocal()
      this.showToast('บันทึกวัตถุดิบสำเร็จ','success')
      return {success:true}
    },

    getMaterialUsage(matId) {
      const usedInMenus = []
      const usedInAddons = []
      const usedInMaterials = []

      // Check menu recipes
      if (Array.isArray(this.menus)) {
        this.menus.forEach(menu => {
          if (menu.recipe && Array.isArray(menu.recipe)) {
            if (menu.recipe.some(r => r.materialId === matId)) {
              usedInMenus.push(menu.name)
            }
          }
        })
      }

      // Check addons
      if (Array.isArray(this.addons)) {
        this.addons.forEach(addon => {
          if (addon.materialId === matId) {
            usedInAddons.push(addon.name)
          }
        })
      }

      // Check subRecipes of other materials
      if (Array.isArray(this.materials)) {
        this.materials.forEach(mat => {
          if (mat.id !== matId && mat.subRecipe && Array.isArray(mat.subRecipe)) {
            if (mat.subRecipe.some(s => s.materialId === matId)) {
              usedInMaterials.push(mat.name)
            }
          }
        })
      }

      return {
        isInUse: usedInMenus.length > 0 || usedInAddons.length > 0 || usedInMaterials.length > 0,
        usedInMenus,
        usedInAddons,
        usedInMaterials
      }
    },

    softDeleteMaterial(matId) {
      const mat = this.materials.find(m => m.id === matId)
      if (mat) {
        mat.isDeleted = true
        mat.isArchived = true
        this.persistLocal()
        this.showToast(`จัดเก็บวัตถุดิบ "${mat.name}" แล้ว (ประวัติย้อนหลังยังคงอยู่)`, 'info')
      }
    },

    restoreMaterial(matId) {
      const mat = this.materials.find(m => m.id === matId)
      if (mat) {
        mat.isDeleted = false
        mat.isArchived = false
        this.persistLocal()
        this.showToast(`ยกเลิกจัดเก็บวัตถุดิบ "${mat.name}" คืนสู่คลังหลักสำเร็จ`, 'success')
      }
    },

    deleteMaterialPermanently(matId) {
      const idx = this.materials.findIndex(m => m.id === matId)
      if (idx === -1) return false
      const mat = this.materials[idx]
      const matName = mat.name

      // Remove from materials array
      this.materials.splice(idx, 1)

      // Remove from draft snapshot if present
      if (this.stockDraftSnapshot && Array.isArray(this.stockDraftSnapshot)) {
        this.stockDraftSnapshot = this.stockDraftSnapshot.filter(m => m.id !== matId)
      }

      // Remove pending draft actions for this material
      if (this.stockDraftActions && Array.isArray(this.stockDraftActions)) {
        this.stockDraftActions = this.stockDraftActions.filter(a => a.materialId !== matId)
      }

      // Record activity log
      this.addActivityLog({
        module: 'stock',
        action: 'delete',
        title: 'ลบวัตถุดิบถาวร',
        description: `ลบวัตถุดิบ ${matName} ออกจากระบบถาวร`,
        targetId: matId,
        targetName: matName,
        user: 'ผู้จัดการคลัง'
      })

      this.persistLocal()
      this.showToast(`ลบวัตถุดิบ "${matName}" ออกจากระบบถาวรเรียบร้อยแล้ว`, 'success')
      return true
    },

    stockIn(matId, qty, unitCost, note = '', packCost = null, dates = {}, asDraft = false) {
      const mat = this.materials.find(m => m.id === matId)
      if (!mat) return
      const addQty = Number(qty) || 0
      if (addQty <= 0) return

      if (asDraft && !this.stockDraftSnapshot) {
        this.initStockDraftSnapshot()
      }

      const currentStock = Math.max(0, Number(mat.stock) || 0)
      const currentUnitCost = Number(mat.unitCost) || 0
      const newUnitCostInput = (unitCost !== undefined && unitCost !== null && Number(unitCost) > 0)
        ? Number(unitCost)
        : currentUnitCost

      // Moving Weighted Average Cost calculation:
      const currentValuation = currentStock * currentUnitCost
      const incomingValuation = addQty * newUnitCostInput
      const newTotalStock = currentStock + addQty
      const weightedUnitCost = newTotalStock > 0
        ? (currentValuation + incomingValuation) / newTotalStock
        : newUnitCostInput

      // Update pack cost to reflect latest pack purchase or weighted pack cost
      const packSize = Number(mat.packSize) > 0 ? Number(mat.packSize) : 1
      if (packCost !== undefined && packCost !== null && Number(packCost) > 0) {
        mat.packCost = Number(packCost)
      } else {
        mat.packCost = Math.round(newUnitCostInput * packSize * 100) / 100
      }

      const trackingMode = this.getMaterialTrackingMode(mat)
      const receiveDate = trackingMode === 'none' ? getTodayString() : (dates?.receiveDate || getTodayString())
      const expiryDate = trackingMode === 'expiry_and_receive' ? (dates?.expiryDate || null) : null

      mat.lastStockInDate = receiveDate
      mat.expiryDate = expiryDate

      if (!mat.lots) mat.lots = []

      let lotAction = 'new_lot'

      if (trackingMode === 'none') {
        // Non-perishable items: single master lot, no multiple lots clutter
        if (mat.lots.length === 0) {
          const masterLot = {
            id: `LOT-${mat.id}-MAIN`,
            receiveDate,
            expiryDate: null,
            qty: addQty,
            initialQty: addQty,
            unitCost: weightedUnitCost,
            packCost: mat.packCost,
            isInUse: true,
            note: note || '',
            createdAt: new Date().toISOString()
          }
          mat.lots.push(masterLot)
        } else {
          const masterLot = mat.lots[0]
          masterLot.qty = Math.round(((Number(masterLot.qty) || 0) + addQty) * 100) / 100
          masterLot.initialQty = Math.round(((Number(masterLot.initialQty) || 0) + addQty) * 100) / 100
          masterLot.unitCost = weightedUnitCost
          masterLot.packCost = mat.packCost
          masterLot.receiveDate = receiveDate
          masterLot.isInUse = true
          if (note) masterLot.note = masterLot.note ? `${masterLot.note}; ${note}` : note
          // If previous entries created multiple lots for non-perishable, consolidate them
          if (mat.lots.length > 1) {
            const extraQty = mat.lots.slice(1).reduce((sum, l) => sum + (Number(l.qty) || 0), 0)
            masterLot.qty = Math.round((masterLot.qty + extraQty) * 100) / 100
            mat.lots = [masterLot]
          }
        }
        lotAction = 'merged_non_perishable'
      } else {
        // Perishable or receive-tracked items
        let matchingLot = null
        if (trackingMode === 'expiry_and_receive') {
          matchingLot = mat.lots.find(l => (l.receiveDate === receiveDate || !l.receiveDate) && (l.expiryDate || null) === expiryDate && l.qty > 0)
            || mat.lots.find(l => (l.expiryDate || null) === expiryDate && l.qty > 0)
        } else if (trackingMode === 'receive_only') {
          matchingLot = mat.lots.find(l => l.receiveDate === receiveDate && l.qty > 0)
        }

        if (matchingLot) {
          // Merge into matching lot
          matchingLot.qty = Math.round(((Number(matchingLot.qty) || 0) + addQty) * 100) / 100
          matchingLot.initialQty = Math.round(((Number(matchingLot.initialQty) || 0) + addQty) * 100) / 100
          const lotOldQty = Math.max(0, Number(matchingLot.qty) - addQty)
          const lotOldVal = lotOldQty * (Number(matchingLot.unitCost) || newUnitCostInput)
          const lotNewVal = addQty * newUnitCostInput
          matchingLot.unitCost = matchingLot.qty > 0 ? Math.round(((lotOldVal + lotNewVal) / matchingLot.qty) * 10000) / 10000 : newUnitCostInput
          matchingLot.packCost = (packCost !== undefined && packCost !== null && Number(packCost) > 0)
            ? Number(packCost)
            : Math.round(newUnitCostInput * packSize * 100) / 100
          if (note) matchingLot.note = matchingLot.note ? `${matchingLot.note}; ${note}` : note
          lotAction = 'merged'
        } else {
          // Open as new lot
          const newLotId = `LOT-${mat.id}-${Date.now()}`
          const hasOtherInUse = mat.lots.some(l => l.isInUse && l.qty > 0)
          mat.lots.push({
            id: newLotId,
            receiveDate,
            expiryDate: expiryDate || null,
            qty: addQty,
            initialQty: addQty,
            unitCost: newUnitCostInput,
            packCost: (packCost !== undefined && packCost !== null && Number(packCost) > 0)
              ? Number(packCost)
              : Math.round(newUnitCostInput * packSize * 100) / 100,
            isInUse: !hasOtherInUse,
            note: note || '',
            createdAt: new Date().toISOString()
          })
          lotAction = 'new_lot'
        }

        // Keep active in-use lot aligned with FIFO unexpired
        const activeLot = mat.lots.find(l => l.isInUse && l.qty > 0 && !isExpired(l)) || mat.lots.find(l => l.qty > 0) || mat.lots[0]
        if (activeLot) {
          if (activeLot.receiveDate) mat.lastStockInDate = activeLot.receiveDate
          if (activeLot.expiryDate) mat.expiryDate = activeLot.expiryDate
        }
      }

      // Total stock and cost
      mat.stock = Math.round(mat.lots.reduce((sum, l) => sum + (Number(l.qty) || 0), 0) * 100) / 100
      mat.unitCost = Math.round(weightedUnitCost * 10000) / 10000

      const dateNote = expiryDate
        ? `[รับเข้า: ${formatThaiDate(receiveDate)}, หมดอายุ: ${formatThaiDate(expiryDate)}]`
        : `[รับเข้า: ${formatThaiDate(receiveDate)}]`

      let actionDescSuffix = ''
      if (lotAction === 'merged') {
        actionDescSuffix = expiryDate ? ` (รวมเข้าล็อตเดิม Exp: ${formatDisplayDate(expiryDate)})` : ' (รวมเข้าล็อตเดิม)'
      } else if (lotAction === 'new_lot') {
        actionDescSuffix = expiryDate ? ` (เปิดล็อตใหม่ Exp: ${formatDisplayDate(expiryDate)})` : ' (เปิดล็อตใหม่)'
      } else {
        actionDescSuffix = ' (บวกทบยอดรวม)'
      }

      const logPayload = {
        module: 'stock',
        action: 'stock_in',
        title: 'รับเข้าสต็อก',
        description: `รับเข้า ${mat.name} +${addQty.toLocaleString()} ${mat.unit}${actionDescSuffix}`,
        targetId: mat.id,
        targetName: mat.name,
        targetEmoji: mat.emoji,
        delta: addQty,
        unit: mat.unit,
        beforeStock: currentStock,
        afterStock: mat.stock,
        cost: newUnitCostInput,
        receiveDate,
        expiryDate: expiryDate || undefined,
        note: note ? `${note} ${dateNote}` : dateNote,
        user: 'เจ้าหน้าที่คลัง'
      }

      if (asDraft) {
        this.addStockDraftAction({
          type: 'stock_in',
          materialId: mat.id,
          materialName: mat.name,
          materialEmoji: mat.emoji,
          title: 'รับเข้าสต็อก',
          description: `รับเข้า ${mat.name} +${addQty.toLocaleString()} ${mat.unit}${actionDescSuffix}`,
          delta: addQty,
          unit: mat.unit,
          log: logPayload
        })
        this.reconcileMaterialDraft(mat.id)
        if (this.hasStockDrafts) {
          this.showToast(`เพิ่มรายการรับเข้า ${mat.name} +${addQty.toLocaleString()} ${mat.unit} (รอยืนยันที่แถบด้านล่าง)`, 'info')
        } else {
          this.showToast(`สต็อก ${mat.name} คืนค่าเท่าเดิมเรียบร้อย`, 'info')
        }
      } else {
        if (this.stockDraftSnapshot) {
          const snapMat = this.stockDraftSnapshot.find(s => s.id === mat.id)
          if (snapMat) {
            snapMat.stock = mat.stock
            if (mat.lots) snapMat.lots = JSON.parse(JSON.stringify(mat.lots))
            snapMat.unitCost = mat.unitCost
          }
        }
        this.persistLocal()
        this.addActivityLog(logPayload)
        this.showToast(`รับเข้าสต็อก: ${mat.name} +${addQty.toLocaleString()} ${mat.unit}${actionDescSuffix}`, 'success')
      }
    },

    stockAdjust(matId, newActualQty, reason = '', note = '', asDraft = true, targetLotId = null, silent = false) {
      const mat = this.materials.find(m => m.id === matId)
      if (!mat) return

      if (asDraft && !this.stockDraftSnapshot) {
        this.initStockDraftSnapshot()
      }

      const oldStock = Number(mat.stock) || 0
      if (!mat.lots) mat.lots = []

      let diff = 0
      let lotNote = ''

      if (targetLotId) {
        // Adjusting a specific lot
        const targetLot = mat.lots.find(l => l.id === targetLotId)
        if (targetLot) {
          const oldLotQty = Number(targetLot.qty) || 0
          targetLot.qty = Math.max(0, Number(newActualQty))
          diff = Math.round((targetLot.qty - oldLotQty) * 100) / 100
          lotNote = ` [ล็อต ${formatThaiDate(targetLot.receiveDate)}]`

          // If this lot was active and now depleted to 0, advance to next positive lot
          if (targetLot.isInUse && targetLot.qty <= 0) {
            targetLot.isInUse = false
            const nextLot = mat.lots.find(l => l.qty > 0)
            if (nextLot) {
              nextLot.isInUse = true
              if (nextLot.receiveDate) mat.lastStockInDate = nextLot.receiveDate
              if (nextLot.expiryDate) mat.expiryDate = nextLot.expiryDate
            }
          }
        }
      } else {
        // Adjusting overall material stock
        diff = Number(newActualQty) - oldStock

        if (diff < 0) {
          // Reduction: deduct from in-use lot, then other lots FIFO
          let remainingDeduct = Math.abs(diff)
          let inUseLot = mat.lots.find(l => l.isInUse && l.qty > 0) || mat.lots.find(l => l.qty > 0)
          if (inUseLot) {
            const take = Math.min(inUseLot.qty, remainingDeduct)
            inUseLot.qty = Math.round((inUseLot.qty - take) * 100) / 100
            remainingDeduct = Math.round((remainingDeduct - take) * 100) / 100
            if (inUseLot.qty <= 0) inUseLot.isInUse = false
          }
          if (remainingDeduct > 0) {
            const otherLots = mat.lots.filter(l => l.qty > 0)
            for (const l of otherLots) {
              const take = Math.min(l.qty, remainingDeduct)
              l.qty = Math.round((l.qty - take) * 100) / 100
              remainingDeduct = Math.round((remainingDeduct - take) * 100) / 100
              if (l.qty > 0) l.isInUse = true
              if (remainingDeduct <= 0) break
            }
          }
          // Ensure active lot is set if positive stock remains
          if (!mat.lots.some(l => l.isInUse && l.qty > 0)) {
            const nextAvail = mat.lots.find(l => l.qty > 0)
            if (nextAvail) nextAvail.isInUse = true
          }
        } else if (diff > 0) {
          // Increase: add to currently in-use lot or create new lot
          let inUseLot = mat.lots.find(l => l.isInUse) || mat.lots[0]
          if (inUseLot) {
            inUseLot.qty = Math.round((inUseLot.qty + diff) * 100) / 100
          } else {
            mat.lots.push({
              id: `LOT-${mat.id}-${Date.now()}`,
              receiveDate: mat.lastStockInDate || getTodayString(),
              expiryDate: mat.expiryDate || null,
              qty: diff,
              initialQty: diff,
              unitCost: mat.unitCost || 0,
              packCost: mat.packCost || 0,
              isInUse: true,
              note: 'ปรับยอดเพิ่มจากการตรวจนับ',
              createdAt: new Date().toISOString()
            })
          }
        }
      }

      // Recalculate material total stock from lots
      mat.stock = Math.round(mat.lots.reduce((sum, l) => sum + (Number(l.qty) || 0), 0) * 100) / 100

      // Sync primary dates
      const activeLot = mat.lots.find(l => l.isInUse && l.qty > 0) || mat.lots[0]
      if (activeLot) {
        if (activeLot.receiveDate) mat.lastStockInDate = activeLot.receiveDate
        if (activeLot.expiryDate) mat.expiryDate = activeLot.expiryDate
      }

      const diffStr = diff >= 0 ? `+${diff}` : `${diff}`
      const logPayload = {
        module: 'stock',
        action: 'adjust',
        title: 'ปรับยอดนับจริง (Stock Audit)',
        description: `ตรวจนับสต็อก ${mat.name}: เดิม ${oldStock.toLocaleString()} เป็น ${Number(mat.stock).toLocaleString()} ${mat.unit} (${diffStr} ${mat.unit})${lotNote}`,
        targetId: mat.id,
        targetName: mat.name,
        targetEmoji: mat.emoji,
        delta: diff,
        unit: mat.unit,
        beforeStock: oldStock,
        afterStock: Number(mat.stock),
        reason: reason || 'นับสต็อกจริงรายวัน',
        note: note ? `${note}${lotNote}` : lotNote,
        user: 'ผู้ตรวจนับสต็อก'
      }

      if (asDraft) {
        this.addStockDraftAction({
          type: 'adjust',
          materialId: mat.id,
          materialName: mat.name,
          materialEmoji: mat.emoji,
          title: 'ปรับยอดนับจริง',
          description: `ปรับสต็อก ${mat.name}: ${oldStock} -> ${mat.stock} ${mat.unit} (${diffStr})${lotNote}`,
          delta: diff,
          unit: mat.unit,
          log: logPayload
        })
        this.reconcileMaterialDraft(mat.id)
        if (!silent) {
          if (this.hasStockDrafts) {
            this.showToast(`เพิ่มรายการปรับยอด ${mat.name} (${diffStr}) (รอยืนยันที่แถบด้านล่าง)`, 'info')
          } else {
            this.showToast(`สต็อก ${mat.name} คืนค่าเท่าเดิมเรียบร้อย`, 'info')
          }
        }
      } else {
        this.persistLocal()
        this.addActivityLog(logPayload)
        if (!silent) {
          this.showToast(`ปรับยอด ${mat.name} เป็น ${mat.stock} ${mat.unit} (${diffStr})`, 'info')
        }
      }
    },

    adjustMaterialStock(payloadOrMatId, ...rest) {
      if (typeof payloadOrMatId === 'object' && payloadOrMatId !== null) {
        const { materialId, newStock, reason = 'ตรวจนับสต็อกปิดร้าน (Stocktake)', note = '', asDraft = true, targetLotId = null, silent = false } = payloadOrMatId
        return this.stockAdjust(materialId, newStock, reason, note, asDraft, targetLotId, silent)
      }
      return this.stockAdjust(payloadOrMatId, ...rest)
    },

    batchStocktake(items = [], asDraft = true) {
      if (!items || items.length === 0) return
      items.forEach(item => {
        this.stockAdjust(
          item.materialId,
          item.newStock,
          item.reason || 'ตรวจนับสต็อกปิดร้าน (Stocktake)',
          item.note || `ตรวจนับสต็อกปิดร้าน (ปรับแก้ ${item.diff > 0 ? '+' : ''}${item.diff.toLocaleString()})`,
          asDraft,
          null,
          true
        )
      })
      if (asDraft) {
        this.showToast(`เพิ่มผลตรวจนับ ${items.length} รายการ เข้าแบบร่างเรียบร้อย (รอยืนยันที่แถบด้านล่าง)`, 'success')
      } else {
        this.showToast(`บันทึกผลตรวจนับ ${items.length} รายการ เรียบร้อยแล้ว`, 'success')
      }
    },

    batchProduce(targetMatId,yieldQty,subIngredients=[],note='',dates={},asDraft=false) {
      const addedQty=Number(yieldQty),target=this.materials.find(m=>m.id===targetMatId)
      if(!target||target.isDeleted||!Number.isFinite(addedQty)||addedQty<=0)return false
      let requirements
      try{requirements=aggregateRequirements(subIngredients)}catch{return false}
      if(requirements.some(r=>r.materialId===targetMatId))return false
      const result=allocateInventory(this.materials,requirements)
      if(!result.ok){this.showToast('วัตถุดิบไม่พอ หมดอายุ หรือสูตรไม่ถูกต้อง','error');return false}
      if(asDraft&&!this.stockDraftSnapshot)this.initStockDraftSnapshot()
      const before=clone(this.materials)
      const rawCost=requirements.reduce((sum,r)=>sum+r.qty*(this.materials.find(m=>m.id===r.materialId)?.unitCost||0),0)
      this.materials=result.materials
      const output=this.materials.find(m=>m.id===targetMatId)
      output.unitCost=(output.stock*(output.unitCost||0)+rawCost)/(output.stock+addedQty)
      const receiveDate=dates.receiveDate||getTodayString(),expiryDate=dates.expiryDate|| (output.shelfLifeDays?addDays(receiveDate,output.shelfLifeDays):null)
      const lot={id:createEntityId('LOT',output.lots.map(l=>l.id)),qty:addedQty,initialQty:addedQty,receiveDate,expiryDate,unitCost:rawCost/addedQty,isInUse:!output.lots.some(l=>l.isInUse&&l.qty>0),note,createdAt:new Date().toISOString()}
      output.lots.push(lot);output.stock=Math.round((output.stock+addedQty)*100)/100
      const log={module:'stock',action:'produce',title:'ผลิตตามสูตร',targetId:targetMatId,targetName:output.name,delta:addedQty,beforeStock:target.stock,afterStock:output.stock,note,unit:output.unit}
      const subLogs=requirements.map(r=>({module:'stock',action:'produce_deduct',targetId:r.materialId,targetName:before.find(m=>m.id===r.materialId).name,delta:-r.qty,beforeStock:before.find(m=>m.id===r.materialId).stock,afterStock:this.materials.find(m=>m.id===r.materialId).stock,note}))
      if(asDraft)this.addStockDraftAction({type:'batch_produce',materialId:targetMatId,delta:addedQty,log,subLogs})
      else {this.addActivityLog(log);subLogs.forEach(l=>this.addActivityLog(l));this.persistLocal()}
      return {ok:true,success:true}
    },

    switchActiveLot(materialId, lotId, asDraft = false) {
      const mat = this.materials.find(m => m.id === materialId)
      if (!mat || !mat.lots) return

      if (asDraft && !this.stockDraftSnapshot) {
        this.initStockDraftSnapshot()
      }

      mat.lots.forEach(l => {
        l.isInUse = (l.id === lotId)
      })
      const targetLot = mat.lots.find(l => l.id === lotId)
      if (targetLot) {
        if (targetLot.receiveDate) mat.lastStockInDate = targetLot.receiveDate
        if (targetLot.expiryDate) mat.expiryDate = targetLot.expiryDate
      }

      if (asDraft) {
        this.addStockDraftAction({
          type: 'switch_lot',
          materialId: mat.id,
          materialName: mat.name,
          materialEmoji: mat.emoji,
          title: 'สลับล็อตใช้งาน',
          description: `สลับล็อต ${mat.name} เป็นล็อตวันที่ ${formatThaiDate(targetLot?.receiveDate)}`,
          delta: 0,
          unit: mat.unit,
          log: {
            module: 'stock',
            action: 'switch_lot',
            title: 'สลับล็อตใช้งาน',
            description: `สลับล็อต ${mat.name} เป็นล็อตวันที่ ${formatThaiDate(targetLot?.receiveDate)}`,
            targetId: mat.id,
            targetName: mat.name,
            targetEmoji: mat.emoji,
            delta: 0,
            unit: mat.unit,
            note: `ล็อต ${formatThaiDate(targetLot?.receiveDate)} (คงเหลือ ${targetLot?.qty || 0} ${mat.unit})`,
            user: 'ผู้จัดการคลัง'
          }
        })
        this.reconcileMaterialDraft(mat.id)
        if (this.hasStockDrafts) {
          this.showToast(`เพิ่มรายการสลับล็อต ${mat.name} (รอยืนยันที่แถบด้านล่าง)`, 'info')
        } else {
          this.showToast(`ล็อตใช้งาน ${mat.name} คืนค่าเดิมเรียบร้อย`, 'info')
        }
      } else {
        if (this.stockDraftSnapshot) {
          const snapMat = this.stockDraftSnapshot.find(s => s.id === mat.id)
          if (snapMat && snapMat.lots) {
            snapMat.lots.forEach(l => {
              l.isInUse = (l.id === lotId)
            })
          }
        }
        this.persistLocal()
        this.showToast(`สลับใช้งานเป็นล็อตวันที่ ${formatThaiDate(targetLot?.receiveDate)} เรียบร้อยแล้ว`, 'success')
      }
    },

    recordLotWaste({ materialId, lotId, wasteQty, reason = 'ของเสีย/หมดอายุ', note = '' }, asDraft = false) {
      const mat = this.materials.find(m => m.id === materialId)
      if (!mat || !mat.lots) return false
      const lot = mat.lots.find(l => l.id === lotId)
      if (!lot) return false

      const qtyToWaste = Math.min(Number(wasteQty) || 0, Number(lot.qty) || 0)
      if (qtyToWaste <= 0) {
        this.showToast('กรุณาระบุจำนวนของเสียที่ถูกต้อง', 'error')
        return false
      }

      if (asDraft && !this.stockDraftSnapshot) {
        this.initStockDraftSnapshot()
      }

      const beforeStock = mat.stock
      lot.qty = Math.max(0, Math.round((lot.qty - qtyToWaste) * 100) / 100)

      // Recalculate material total stock
      mat.stock = Math.round(mat.lots.reduce((sum, l) => sum + (Number(l.qty) || 0), 0) * 100) / 100

      // If this lot was in use and is now 0, advance to next available lot
      if (lot.isInUse && lot.qty <= 0) {
        lot.isInUse = false
        const nextLot = mat.lots.find(l => l.qty > 0 && !isExpired(l)) || mat.lots.find(l => l.qty > 0)
        if (nextLot) nextLot.isInUse = true
      }

      const unitCost = Number(lot.unitCost) || Number(mat.unitCost) || 0
      const totalLossValue = Math.round((qtyToWaste * unitCost) * 100) / 100

      const logPayload = {
        module: 'stock',
        action: 'waste',
        title: 'บันทึกตัดทิ้งของเสีย (Waste Spoilage)',
        description: `ตัดทิ้งของเสีย ${mat.name} ล็อต ${formatThaiDate(lot.receiveDate)} จำนวน -${qtyToWaste} ${mat.unit} (${reason}) มูลค่าเสียหาย ฿${totalLossValue.toLocaleString()}`,
        targetId: mat.id,
        targetName: mat.name,
        targetEmoji: mat.emoji,
        delta: -qtyToWaste,
        unit: mat.unit,
        beforeStock,
        afterStock: mat.stock,
        reason,
        note: note ? `ล็อต ${formatThaiDate(lot.receiveDate)}: ${note}` : `ล็อต ${formatThaiDate(lot.receiveDate)}`,
        cost: totalLossValue,
        user: 'เจ้าหน้าที่คลัง'
      }

      if (asDraft) {
        this.addStockDraftAction({
          type: 'waste',
          materialId: mat.id,
          materialName: mat.name,
          materialEmoji: mat.emoji,
          title: 'ตัดทิ้งของเสีย',
          description: `ตัดทิ้งของเสีย ${mat.name} -${qtyToWaste} ${mat.unit} (${reason})`,
          delta: -qtyToWaste,
          unit: mat.unit,
          log: logPayload
        })
        this.reconcileMaterialDraft(mat.id)
        if (this.hasStockDrafts) {
          this.showToast(`เพิ่มรายการตัดของเสีย ${mat.name} -${qtyToWaste} ${mat.unit} (รอยืนยันที่แถบด้านล่าง)`, 'info')
        } else {
          this.showToast(`สต็อก ${mat.name} คืนค่าเท่าเดิมเรียบร้อย`, 'info')
        }
      } else {
        if (this.stockDraftSnapshot) {
          const snapMat = this.stockDraftSnapshot.find(s => s.id === mat.id)
          if (snapMat) {
            snapMat.stock = mat.stock
            if (mat.lots) snapMat.lots = JSON.parse(JSON.stringify(mat.lots))
          }
        }
        this.persistLocal()
        this.addActivityLog(logPayload)
        this.showToast(`บันทึกของเสีย ${mat.name} (-${qtyToWaste} ${mat.unit}) เสียหาย ฿${totalLossValue.toLocaleString()}`, 'info')
      }
      return true
    },

    openWasteModal(materialId, lotId = null) {
      this.modals.waste = {
        isOpen: true,
        materialId,
        lotId
      }
    },

    closeWasteModal() {
      this.modals.waste = {
        isOpen: false,
        materialId: null,
        lotId: null
      }
    },

    openStocktakeModal() {
      this.modals.stocktake = { isOpen: true }
    },

    closeStocktakeModal() {
      this.modals.stocktake = { isOpen: false }
    },

    // Deduct stock from material lots (Priority: in-use lot, then FIFO unexpired)
    deductMaterialStock(mat,neededQty) {
      if(!mat)return {success:false}
      const result=allocateInventory([mat],[{materialId:mat.id,qty:Number(neededQty)}])
      if(!result.ok)return {success:false,issues:result.issues}
      const previous=mat.lots?.find(l=>l.isInUse)?.id
      Object.assign(mat,result.materials[0])
      const next=mat.lots?.find(l=>l.isInUse)?.id
      return {success:true,allocations:result.allocations,switchedLots:previous&&next&&previous!==next?[{materialId:mat.id,materialName:mat.name,materialEmoji:mat.emoji,fromLotId:previous,toLotId:next}]:[]}
    },

    addMaterialStock(mat, addedQty) {
      if (!mat) return
      const qty = Number(addedQty) || 0
      if (qty <= 0) return

      if (!mat.lots) mat.lots = []
      let inUseLot = mat.lots.find(l => l.isInUse) || mat.lots.find(l => l.qty > 0) || mat.lots[0]
      if (inUseLot) {
        inUseLot.qty = Math.round((Number(inUseLot.qty || 0) + qty) * 100) / 100
        inUseLot.isInUse = true
      } else {
        mat.lots.push({
          id: `LOT-${mat.id}-${Date.now()}`,
          receiveDate: mat.lastStockInDate || getTodayString(),
          expiryDate: mat.expiryDate || null,
          qty: qty,
          initialQty: qty,
          unitCost: mat.unitCost || 0,
          packCost: mat.packCost || 0,
          isInUse: true,
          note: 'ปรับเพิ่มสต็อก',
          createdAt: new Date().toISOString()
        })
      }

      mat.stock = Math.round(mat.lots.reduce((sum, l) => sum + (Number(l.qty) || 0), 0) * 100) / 100
      const activeLot = mat.lots.find(l => l.isInUse && l.qty > 0) || mat.lots[0]
      if (activeLot) {
        if (activeLot.receiveDate) mat.lastStockInDate = activeLot.receiveDate
        if (activeLot.expiryDate) mat.expiryDate = activeLot.expiryDate
      }

      if (this.stockDraftSnapshot) {
        const snapMat = this.stockDraftSnapshot.find(s => s.id === mat.id)
        if (snapMat) {
          snapMat.stock = mat.stock
          if (mat.lots) snapMat.lots = JSON.parse(JSON.stringify(mat.lots))
        }
      }
    },

    // ========================================================
    // POS ORDER & CART LOGIC (WITH STRICT STOCK VALIDATION)
    // ========================================================
    
    // Check material availability for a menu + add-ons
    checkStockAvailability(menu,selectedAddons=[],targetQty=1) {
      const materials=this.stockDraftSnapshot||this.materials
      let required=[]
      try {
        required=getEffectiveRequirements(menu,selectedAddons,targetQty,materials)
        for(const item of this.cart)required.push(...getEffectiveRequirements(item.menu,item.selectedAddons,item.qty,materials))
        required=aggregateRequirements(required)
      }catch(error){return {canAdd:false,outOfStockList:[{name:error.message,code:'INVALID_REQUIREMENTS'}],lowStockList:[]}}
      const check=allocateInventory(materials,required)
      const outOfStockList=check.ok?[]:check.issues.map(issue=>({...issue,name:issue.name||materials.find(m=>m.id===issue.materialId)?.name||issue.materialId}))
      const lowStockList=check.ok?check.materials.filter(m=>required.some(r=>r.materialId===m.id)&&m.stock<=m.minAlert).map(m=>({name:m.name,emoji:m.emoji,remaining:m.stock,minAlert:m.minAlert,unit:m.unit})):[]
      return {canAdd:check.ok,outOfStockList,lowStockList}
    },

    addToCart(menu, selectedAddons = [], qty = 1, forceConfirm = false) {
      const stockCheck = this.checkStockAvailability(menu, selectedAddons, qty)
      if(stockCheck.outOfStockList.some(i=>i.code!=='SHORTAGE')) { this.showToast('ไม่สามารถขาย: วัตถุดิบหมดอายุ ถูกจัดเก็บ หรือสูตรไม่ถูกต้อง','error'); return false }

      // Rule 1: Out of stock - Warn employee but allow confirmation to sell anyway (e.g. quick buy or borrow ingredients)
      if (!stockCheck.canAdd && !forceConfirm) {
        this.modals.lowStockWarning = {
          isOpen: true,
          isOutOfStock: true,
          title: 'แจ้งเตือน: วัตถุดิบหมดสต็อก',
          subtitle: 'วัตถุดิบในระบบไม่เพียงพอ แต่คุณสามารถยืนยันเพื่อขายต่อได้ (ระบบจะตัดสต็อกและบันทึกประวัติไว้)',
          warningItems: stockCheck.outOfStockList.map(item => ({
            ...item,
            shortage: Math.max(0, Math.round((item.needed - item.stock) * 100) / 100)
          })),
          onConfirm: () => {
            this.modals.lowStockWarning.isOpen = false
            this.executeAddToCart(menu, selectedAddons, qty, true)
          }
        }
        return false
      }

      // Rule 2: Low stock warning popup
      if (stockCheck.lowStockList.length > 0 && !forceConfirm) {
        this.modals.lowStockWarning = {
          isOpen: true,
          isOutOfStock: false,
          title: 'แจ้งเตือน: วัตถุดิบใกล้หมด',
          subtitle: 'การเพิ่มออเดอร์นี้จะทำให้วัตถุดิบต่ำกว่าเกณฑ์ปลอดภัย',
          warningItems: stockCheck.lowStockList,
          onConfirm: () => {
            this.modals.lowStockWarning.isOpen = false
            this.executeAddToCart(menu, selectedAddons, qty, false)
          }
        }
        return false
      }

      this.executeAddToCart(menu, selectedAddons, qty, false)
      return true
    },

    executeAddToCart(menu, selectedAddons = [], qty = 1, isBackorder = false) {
      const plat = this.currentPlatform
      const basePrice = (menu.prices && menu.prices[plat.id] !== undefined)
        ? Number(menu.prices[plat.id])
        : 0

      // Match item in cart with same menu and exact same add-ons
      const addonKey = selectedAddons.map(a => a.id).sort().join(',')
      const existingIdx = this.cart.findIndex(i => i.menu.id === menu.id && i.addonKey === addonKey)

      if (existingIdx >= 0) {
        this.cart[existingIdx].qty += qty
        if (isBackorder) this.cart[existingIdx].isBackorder = true
      } else {
        this.cart.push({
          menu: clone(menu),
          selectedAddons: clone(selectedAddons),
          addonKey,
          qty,
          basePrice,
          isBackorder
        })
      }
      this.modals.customOrder = { isOpen: false, menuId: null }
      if (isBackorder) {
        this.showToast(`เพิ่ม "${menu.name}" (ยืนยันขายต่อแม้ของหมด) แล้ว`, 'warning')
      } else {
        this.showToast(`เพิ่ม "${menu.name}" ลงในรายการแล้ว`, 'success')
      }
    },

    updateCartQty(index, newQty) {
      if (newQty <= 0) {
        this.removeFromCart(index)
        return
      }
      const item = this.cart[index]
      const delta = newQty - item.qty
      if (delta > 0) {
        const stockCheck = this.checkStockAvailability(item.menu, item.selectedAddons, delta)
        if (!stockCheck.canAdd) {
          const missing = stockCheck.outOfStockList.map(m => `${m.emoji} ${m.name}`).join(', ')
          this.showToast(`สต็อกไม่พอสำหรับเพิ่มจำนวน: ${missing}`, 'error')
          return
        }
      }
      item.qty = newQty
    },

    removeFromCart(index) {
      this.cart.splice(index, 1)
    },

    clearCart() {
      this.cart = []
      this.orderNote = ''
    },

    // Complete Checkout
    prepareCheckout({allowShortage=false}={}) {
      if(!this.cart.length)return {ok:false,code:'EMPTY_CART'}
      const candidate=this.databaseSnapshot()
      let requirements=[]
      try {
        for(const item of this.cart) {
          const current=this.menus.find(m=>m.id===item.menu.id)
          if(!current||current.isActive===false)return {ok:false,code:'MENU_UNAVAILABLE',issues:[]}
          for(const addon of item.selectedAddons||[])if(!this.addons.some(a=>a.id===addon.id&&a.isActive!==false))return {ok:false,code:'ADDON_UNAVAILABLE',issues:[]}
          requirements.push(...getEffectiveRequirements(item.menu,item.selectedAddons,item.qty,candidate.materials))
        }
      }catch(error){return {ok:false,code:'INVALID_CART',message:error.message,issues:[]}}
      const allocated=allocateInventory(candidate.materials,requirements,{allowShortage})
      return allocated.ok?{ok:true,candidate,allocated}:allocated
    },
    checkout({allowShortage=false}={}) {
      const prepared=this.prepareCheckout({allowShortage})
      if(!prepared.ok) {
        if(prepared.issues?.length&&prepared.issues.every(i=>i.code==='SHORTAGE')) {
          this.modals.lowStockWarning={isOpen:true,isOutOfStock:true,title:'ยืนยันยอดขาดก่อนขาย',subtitle:'ระบบจะบันทึกยอดวัตถุดิบขาดค้างไว้',warningItems:prepared.issues.map(i=>({...i,shortage:i.needed-i.stock})),onConfirm:()=>{this.modals.lowStockWarning.isOpen=false;this.checkout({allowShortage:true})}}
        }else this.showToast('ไม่สามารถบันทึกออเดอร์: วัตถุดิบหรือรายการไม่พร้อมใช้','error')
        return null
      }
      const {candidate,allocated}=prepared,summary=this.cartSummary,plat=this.currentPlatform
      const orderId=createEntityId('ORD',this.orders.map(o=>o.orderId))
      const items=this.cart.map(item=>{const price=Number(item.menu.prices?.[plat.id]||0)+(item.selectedAddons||[]).reduce((n,a)=>n+Number(a.prices?.[plat.id]||0),0);return {menuId:item.menu.id,menuName:item.menu.name,qty:item.qty,unitPrice:price,totalPrice:price*item.qty,recipe:clone(item.menu.recipe||[]),hasPackage:item.menu.hasPackage!==false,selectedAddons:clone(item.selectedAddons||[])}})
      const order={orderId,createdAt:new Date().toISOString(),platformId:plat.id,platformName:plat.name,subtotal:summary.subtotal,discount:0,gpAmount:summary.gpAmount,netRevenue:summary.netRevenue,foodCost:summary.totalFoodCost,grossProfit:summary.grossProfit,paymentMethod:this.paymentMethod,note:this.orderNote,items,inventoryAllocations:allocated.allocations,stockShortages:allocated.shortages}
      candidate.materials=allocated.materials;candidate.orders.unshift(order)
      candidate.stockShortages.push(...allocated.shortages.map(x=>({...x,orderId,createdAt:order.createdAt})))
      candidate.activityLogs.unshift(this.makeActivityLog({module:'pos',action:'order_complete',title:'ขายหน้าร้าน',targetId:orderId,delta:summary.subtotal,note:this.orderNote,description:'ออเดอร์ '+orderId}))
      candidate.activityLogs=candidate.activityLogs.slice(0,500)
      const base=this.stockDraftSnapshot?clone(this.stockDraftSnapshot):null,draft=clone(this.materials)
      const saved=this.commitDatabase(candidate)
      if(!saved.ok)return null
      if(base){this.stockDraftSnapshot=clone(this.materials);const rebased=rebaseInventoryDraft(base,draft,this.materials);if(rebased.ok)this.materials=rebased.materials;else{this.materials=draft;this.stockDraftConflict=rebased.issues;this.showToast('แบบร่างขัดแย้งกับรายการขาย กรุณาตรวจสอบใหม่','warning')}}
      this.clearCart();this.modals.receipt={isOpen:true,order}
      this.showToast('บันทึกออเดอร์สำเร็จ','success')
      if(this.gasApiUrl)this.syncWithGas()
      return order
    }

  }
}
const committedActions = {
  saveMenu:()=>false, deleteMenu:()=>false, toggleMenuStatus:()=>false,
  saveAddon:()=>false, deleteAddon:()=>false, toggleAddonStatus:()=>false,
  saveMaterial:()=>false, softDeleteMaterial:()=>false, restoreMaterial:()=>false,
  deleteMaterialPermanently:()=>false, saveCategory:()=>false, deleteCategory:()=>false,
  saveGasUrl:()=>false, clearActivityLogs:()=>false, addActivityLog:()=>false,
  stockIn:args=>args[6]===true, stockAdjust:args=>args[4]!==false,
  batchProduce:args=>args[5]===true, switchActiveLot:args=>args[2]===true,
  recordLotWaste:args=>args[1]===true, batchStocktake:args=>args[1]!==false
}
for (const [name,isDraft] of Object.entries(committedActions)) {
  const action=posDefinition.actions[name]
  posDefinition.actions[name]=function(...args) {
    if(this.transactionDepth)return action.apply(this,args)
    if(isDraft(args)) { const result=action.apply(this,args); return result===false?{ok:false,success:false}:{...result,ok:true,success:true} }
    const before=this.databaseSnapshot({committedMaterials:false})
    const baseline=this.stockDraftSnapshot?clone(this.stockDraftSnapshot):null
    const draftActions=clone(this.stockDraftActions)
    if(baseline){this.materials=clone(baseline);this.stockDraftSnapshot=null}
    this.transactionDepth=1;this.transactionToasts=[]
    let output,error
    try {output=action.apply(this,args)} catch(err) {error=err}
    const toasts=this.transactionToasts;this.transactionDepth=0;this.transactionToasts=[]
    if(error || output===false || output?.ok===false || output?.success===false) {
      for(const field of DATABASE_FIELDS)this[field]=clone(before[field])
      this.stockDraftSnapshot=baseline;this.stockDraftActions=draftActions
      const failure={ok:false,success:false,code:'INVALID_OPERATION',message:error?.message||'รายการไม่ถูกต้อง'}
      this.showToast(failure.message,'error');return failure
    }
    const result=this.commitDatabase(this.databaseSnapshot({committedMaterials:false}))
    if(!result.ok){for(const field of DATABASE_FIELDS)this[field]=clone(before[field]);this.stockDraftSnapshot=baseline;this.stockDraftActions=draftActions;return {...result,success:false}}
    if(baseline) {
      const rebased=rebaseInventoryDraft(baseline,before.materials,this.materials)
      this.stockDraftSnapshot=clone(this.materials);this.stockDraftActions=draftActions
      if(rebased.ok)this.materials=rebased.materials
      else {this.materials=clone(before.materials);this.stockDraftConflict=rebased.issues}
    }
    for(const toast of toasts)this.showToast(toast.message,toast.type)
    return {...result,success:true}
  }
}
export const usePosStore=defineStore('pos',posDefinition)
