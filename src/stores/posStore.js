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

export const usePosStore = defineStore('pos', {
  state: () => {
    // Wipe data clean on first load of this update for testing from scratch
    const CLEARED_KEY = 'GY_CLEARED_ALL_V1'
    if (!localStorage.getItem(CLEARED_KEY)) {
      localStorage.setItem('GY_MATERIALS', JSON.stringify([]))
      localStorage.setItem('GY_MENUS', JSON.stringify([]))
      localStorage.setItem('GY_ADDONS', JSON.stringify([]))
      localStorage.setItem('GY_ORDERS', JSON.stringify([]))
      localStorage.setItem(CLEARED_KEY, 'true')
    }

    const rawMaterials = localStorage.getItem('GY_MATERIALS')
    const rawMenus = localStorage.getItem('GY_MENUS')
    const rawAddons = localStorage.getItem('GY_ADDONS')
    const rawPlatforms = localStorage.getItem('GY_PLATFORMS')
    const rawOrders = localStorage.getItem('GY_ORDERS')
    const rawLogs = localStorage.getItem('GY_ACTIVITY_LOGS')
    const storedGasUrl = localStorage.getItem('GY_GAS_API_URL') || ''

    const storedMaterials = rawMaterials !== null ? (JSON.parse(rawMaterials) || []) : []
    const storedMenus = rawMenus !== null ? (JSON.parse(rawMenus) || []) : []
    const storedAddons = rawAddons !== null ? (JSON.parse(rawAddons) || []) : []
    const storedPlatforms = rawPlatforms !== null ? (JSON.parse(rawPlatforms) || DEFAULT_PLATFORMS) : DEFAULT_PLATFORMS
    const storedOrders = rawOrders !== null ? (JSON.parse(rawOrders) || []) : []
    
    let storedActivityLogs = []
    try {
      if (rawLogs) {
        storedActivityLogs = JSON.parse(rawLogs) || []
      }
    } catch (e) {
      storedActivityLogs = []
    }
    if (!storedActivityLogs || storedActivityLogs.length === 0) {
      storedActivityLogs = generateDefaultActivityLogs()
    }

    let storedCategories = null
    try {
      storedCategories = JSON.parse(localStorage.getItem('GY_CATEGORIES'))
    } catch (e) {
      storedCategories = null
    }

    const initialCategories = storedCategories || JSON.parse(JSON.stringify(DEFAULT_CATEGORIES))
    if (!initialCategories.menu) initialCategories.menu = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES.menu))
    if (!initialCategories.material) initialCategories.material = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES.material))
    if (!initialCategories.addon) initialCategories.addon = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES.addon))

    // Ensure all material categories have dateTrackingMode
    initialCategories.material.forEach(c => {
      if (!c.dateTrackingMode) {
        const def = DEFAULT_CATEGORIES.material.find(d => d.name === c.name || d.id === c.id)
        c.dateTrackingMode = def?.dateTrackingMode || 'none'
      }
    })

    // Ensure any categories in stored menus, materials, addons are recognized
    storedMenus.forEach(m => {
      if (m.category && !initialCategories.menu.some(c => c.name === m.category)) {
        initialCategories.menu.push({ id: `cat-menu-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`, name: m.category, icon: '🥣' })
      }
    })
    storedMaterials.forEach(m => {
      if (m.category && !initialCategories.material.some(c => c.name === m.category)) {
        initialCategories.material.push({ id: `cat-mat-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`, name: m.category, label: m.category, icon: '📦', dateTrackingMode: 'none' })
      }
    })
    storedAddons.forEach(a => {
      if (a.category && !initialCategories.addon.some(c => c.name === a.category)) {
        initialCategories.addon.push({ id: `cat-addon-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`, name: a.category, icon: '✨' })
      }
    })

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
      currentTab: initialTab, // 'dashboard' | 'pos' | 'menu' | 'addon' | 'stock' | 'settings'
      dashboardPeriod: 'today', // 'today' | 'week' | 'month' | 'all'

      // Master Collections with strict number parsing and default recipe migration
      materials: storedMaterials.map(m => {
        const defaultRef = DEFAULT_MATERIALS.find(def => def.id === m.id)
        const packUnit = m.packUnit || defaultRef?.packUnit || (m.unit === 'ml' ? 'ขวด' : m.unit === 'g' ? 'ถุง' : 'แพ็ค')
        const packSize = Number(m.packSize) || defaultRef?.packSize || 1
        const unitCost = Number(m.unitCost) !== undefined && Number(m.unitCost) > 0 ? Number(m.unitCost) : (defaultRef?.unitCost || 0)
        const packCost = Number(m.packCost) || defaultRef?.packCost || (unitCost * packSize)
        const shelfLifeDays = m.shelfLifeDays !== undefined ? m.shelfLifeDays : (defaultRef?.shelfLifeDays !== undefined ? defaultRef.shelfLifeDays : null)
        let lastStockInDate = m.lastStockInDate || null
        let expiryDate = m.expiryDate || null
        if (!lastStockInDate && shelfLifeDays) {
          lastStockInDate = getTodayString()
        }
        if (!expiryDate && shelfLifeDays && lastStockInDate) {
          expiryDate = addDays(lastStockInDate, shelfLifeDays)
        }

        const rawStock = Number(m.stock) || 0

        // Sub-lot migration and parsing
        let lots = Array.isArray(m.lots) ? m.lots.map(l => ({
          id: l.id || `LOT-${m.id}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          receiveDate: l.receiveDate || lastStockInDate || getTodayString(),
          expiryDate: l.expiryDate || null,
          qty: Number(l.qty) >= 0 ? Number(l.qty) : 0,
          initialQty: Number(l.initialQty) || Number(l.qty) || 0,
          unitCost: Number(l.unitCost) !== undefined ? Number(l.unitCost) : unitCost,
          packCost: Number(l.packCost) !== undefined ? Number(l.packCost) : packCost,
          isInUse: Boolean(l.isInUse),
          note: l.note || '',
          createdAt: l.createdAt || new Date().toISOString()
        })) : []

        // If no lots recorded but positive stock exists, create initial lot
        if (lots.length === 0 && rawStock > 0) {
          lots = [{
            id: `LOT-${m.id}-INIT`,
            receiveDate: lastStockInDate || getTodayString(),
            expiryDate: expiryDate || null,
            qty: rawStock,
            initialQty: rawStock,
            unitCost,
            packCost,
            isInUse: true,
            note: 'ยอดยกมาเริ่มต้น',
            createdAt: new Date().toISOString()
          }]
        }

        // Ensure at least one positive lot is marked as in-use
        if (lots.some(l => l.qty > 0) && !lots.some(l => l.isInUse && l.qty > 0)) {
          const firstPositive = lots.find(l => l.qty > 0)
          if (firstPositive) firstPositive.isInUse = true
        }

        const totalStock = lots.length > 0
          ? Math.round(lots.reduce((sum, l) => sum + (Number(l.qty) || 0), 0) * 100) / 100
          : rawStock

        // Set primary dates from active in-use lot or latest lot
        const inUseLot = lots.find(l => l.isInUse && l.qty > 0) || lots[0]
        if (inUseLot) {
          if (inUseLot.receiveDate) lastStockInDate = inUseLot.receiveDate
          if (inUseLot.expiryDate) expiryDate = inUseLot.expiryDate
        }

        const item = {
          ...m,
          packUnit,
          packSize,
          packCost,
          unitCost,
          shelfLifeDays,
          lastStockInDate,
          expiryDate,
          stock: totalStock,
          lots,
          minAlert: Number(m.minAlert) || 0,
          isDeleted: Boolean(m.isDeleted),
          isSubIngredient: Boolean(m.isSubIngredient)
        }
        if (item.id === 'MAT001' && (!item.subRecipe || item.subRecipe.length === 0)) {
          item.hasSubRecipe = true
          item.yieldQty = 1200
          item.subRecipe = [
            { materialId: 'MAT002', qty: 5000 },
            { materialId: 'MAT003', qty: 300 }
          ]
        }

        // Sanitize: Raw sub-materials (like Milk MAT002) must NEVER have a sub-recipe!
        if (item.id === 'MAT002' || item.isSubIngredient || (item.category && item.category.includes('รอง'))) {
          item.hasSubRecipe = false
          item.subRecipe = []
          item.isSubIngredient = true
          if (item.packUnit === 'รอบ') {
            item.packUnit = item.unit === 'ml' ? 'ขวด' : (item.unit === 'g' ? 'ถุง' : 'แพ็ค')
            item.packSize = defaultRef?.packSize || 1200
            item.packCost = defaultRef?.packCost || 54
          }
        }
        return item
      }),
      menus: storedMenus,
      addons: storedAddons,
      platforms: storedPlatforms,
      orders: storedOrders,
      activityLogs: storedActivityLogs,

      // POS Active State
      currentPlatformId: 'PLAT01',
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
      emojiCatalog: EMOJI_CATALOG
    }
  },

  getters: {
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
    
    // 1. Total valuation of all raw materials & packaging currently in stock (มูลค่าคลังรวม)
    totalInventoryValuation: (state) => {
      return state.materials
        .filter(m => !m.isDeleted)
        .reduce((sum, m) => sum + (Math.max(0, m.stock) * (m.unitCost || 0)), 0)
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
    reorderBudgetNeeded: (state) => {
      return state.materials
        .filter(m => !m.isDeleted && m.stock <= m.minAlert)
        .reduce((sum, m) => {
          const targetStock = m.minAlert * 2
          const deficit = Math.max(0, targetStock - m.stock)
          return sum + (deficit * (m.unitCost || 0))
        }, 0)
    },

    // Sales & Profit Analytics
    filteredOrders: (state) => {
      const now = new Date()
      const todayStr = now.toISOString().split('T')[0]
      return state.orders.filter(ord => {
        if (!ord.createdAt) return false
        const ordDateStr = ord.createdAt.split('T')[0]
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

        // Calculate theoretical food cost of this item
        let singleItemCost = 0
        if (item.menu.recipe && Array.isArray(item.menu.recipe)) {
          item.menu.recipe.forEach(r => {
            const mat = this.matMap[r.materialId]
            if (mat && !mat.isDeleted) {
              singleItemCost += (r.qty * (mat.unitCost || 0))
            }
          })
        }
        if (item.selectedAddons && item.selectedAddons.length > 0) {
          item.selectedAddons.forEach(addon => {
            const mat = this.matMap[addon.materialId]
            if (mat && !mat.isDeleted) {
              singleItemCost += ((addon.amountUsed || 0) * (mat.unitCost || 0))
            }
          })
        }
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

    setPlatform(platId) {
      this.currentPlatformId = platId
    },

    // Toast Notifications
    showToast(message, type = 'success') {
      const id = Date.now() + Math.random()
      this.toasts.push({ id, message, type })
      setTimeout(() => {
        this.toasts = this.toasts.filter(t => t.id !== id)
      }, 3500)
    },

    // ========================================================
    // STORAGE & SYNC
    // ========================================================
    persistLocal() {
      localStorage.setItem('GY_MATERIALS', JSON.stringify(this.materials))
      localStorage.setItem('GY_MENUS', JSON.stringify(this.menus))
      localStorage.setItem('GY_ADDONS', JSON.stringify(this.addons))
      localStorage.setItem('GY_PLATFORMS', JSON.stringify(this.platforms))
      localStorage.setItem('GY_ORDERS', JSON.stringify(this.orders))
      localStorage.setItem('GY_ACTIVITY_LOGS', JSON.stringify(this.activityLogs || []))
      localStorage.setItem('GY_CATEGORIES', JSON.stringify(this.categories))
      localStorage.setItem('GY_GAS_API_URL', this.gasApiUrl)
    },

    clearAllData() {
      this.materials = []
      this.menus = []
      this.addons = []
      this.orders = []
      this.activityLogs = []
      this.cart = []
      this.orderNote = ''
      this.persistLocal()
      this.showToast('ล้างข้อมูลทั้งหมดออกเรียบร้อยแล้ว เริ่มต้นระบบใหม่แบบว่างเปล่า', 'info')
    },

    resetDemoData() {
      this.materials = DEFAULT_MATERIALS.map(m => ({ ...m }))
      this.menus = DEFAULT_MENUS.map(m => ({ ...m }))
      this.addons = DEFAULT_ADDONS.map(a => ({ ...a }))
      this.platforms = DEFAULT_PLATFORMS.map(p => ({ ...p }))
      this.orders = DEFAULT_ORDERS.map(o => ({ ...o }))
      this.activityLogs = generateDefaultActivityLogs()
      this.categories = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES))
      this.cart = []
      this.persistLocal()
      this.showToast('โหลดข้อมูลตัวอย่าง (Demo Data) สำเร็จแล้ว', 'info')
    },

    // ========================================================
    // ACTIVITY LOGS & AUDIT TRAIL
    // ========================================================
    addActivityLog(logData) {
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
      this.activityLogs.unshift(newLog)
      if (this.activityLogs.length > 500) {
        this.activityLogs = this.activityLogs.slice(0, 500)
      }
      this.persistLocal()
      return newLog
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
      localStorage.setItem('GY_GAS_API_URL', this.gasApiUrl)
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
        const newId = 'MENU' + String(this.menus.length + 1).padStart(2, '0')
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
        const newId = 'ADD' + String(this.addons.length + 1).padStart(2, '0')
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
      const packSize = Number(matData.packSize) > 0 ? Number(matData.packSize) : 1
      const packCost = Number(matData.packCost) >= 0 ? Number(matData.packCost) : 0
      let unitCost = Number(matData.unitCost) || 0
      if (packCost > 0 && packSize > 0 && (!unitCost || unitCost === 0)) {
        unitCost = packCost / packSize
      }

      const cleanData = {
        ...matData,
        packUnit: matData.packUnit ? String(matData.packUnit).trim() : 'ชิ้น',
        packSize,
        packCost,
        unitCost: Math.round(unitCost * 10000) / 10000,
        shelfLifeDays: matData.shelfLifeDays !== undefined ? matData.shelfLifeDays : null,
        lastStockInDate: matData.lastStockInDate || undefined,
        expiryDate: matData.expiryDate || undefined,
        stock: Number(matData.stock) || 0,
        minAlert: Number(matData.minAlert) || 0,
        yieldQty: Number(matData.yieldQty) || 1200
      }

      if (cleanData.isSubIngredient || cleanData.id === 'MAT002') {
        cleanData.hasSubRecipe = false
        cleanData.subRecipe = []
        cleanData.isSubIngredient = true
      }

      if (matData.id) {
        const idx = this.materials.findIndex(m => m.id === matData.id)
        if (idx >= 0) {
          this.materials[idx] = { ...this.materials[idx], ...cleanData }
        }
      } else {
        const newId = 'MAT' + String(this.materials.length + 1).padStart(3, '0')
        this.materials.push({
          ...cleanData,
          id: newId,
          isDeleted: false
        })
      }
      this.persistLocal()
      this.showToast(`บันทึกวัตถุดิบ "${matData.name}" สำเร็จ`, 'success')
    },

    softDeleteMaterial(matId) {
      const mat = this.materials.find(m => m.id === matId)
      if (mat) {
        mat.isDeleted = true
        this.persistLocal()
        this.showToast(`ซ่อนวัตถุดิบ "${mat.name}" แล้ว (ประวัติย้อนหลังยังคงอยู่)`, 'info')
      }
    },

    restoreMaterial(matId) {
      const mat = this.materials.find(m => m.id === matId)
      if (mat) {
        mat.isDeleted = false
        this.persistLocal()
        this.showToast(`กู้คืนวัตถุดิบ "${mat.name}" สำเร็จ`, 'success')
      }
    },

    stockIn(matId, qty, unitCost, note = '', packCost = null, dates = {}) {
      const mat = this.materials.find(m => m.id === matId)
      if (!mat) return
      const addQty = Number(qty) || 0
      if (addQty <= 0) return

      const currentStock = Math.max(0, Number(mat.stock) || 0)
      const currentUnitCost = Number(mat.unitCost) || 0
      const newUnitCostInput = (unitCost !== undefined && unitCost !== null && Number(unitCost) > 0)
        ? Number(unitCost)
        : currentUnitCost

      // Moving Weighted Average Cost calculation:
      // totalValuation = (currentStock * currentUnitCost) + (incomingQty * incomingUnitCost)
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

      // Update Receive & Expiry Dates
      const receiveDate = dates?.receiveDate || getTodayString()
      const expiryDate = dates?.expiryDate || null
      mat.lastStockInDate = receiveDate
      mat.expiryDate = expiryDate

      // Add as new lot
      if (!mat.lots) mat.lots = []
      const newLotId = `LOT-${mat.id}-${Date.now()}`
      const hasOtherInUse = mat.lots.some(l => l.isInUse && l.qty > 0)
      const newLot = {
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
      }
      mat.lots.push(newLot)

      // Total stock and cost
      mat.stock = Math.round(mat.lots.reduce((sum, l) => sum + (Number(l.qty) || 0), 0) * 100) / 100
      mat.unitCost = Math.round(weightedUnitCost * 10000) / 10000

      this.persistLocal()

      const dateNote = expiryDate
        ? `[รับเข้า: ${formatThaiDate(receiveDate)}, หมดอายุ: ${formatThaiDate(expiryDate)}]`
        : `[รับเข้า: ${formatThaiDate(receiveDate)}]`

      this.addActivityLog({
        module: 'stock',
        action: 'stock_in',
        title: 'รับเข้าสต็อก',
        description: `รับเข้า ${mat.name} +${addQty.toLocaleString()} ${mat.unit} (ต้นทุนเฉลี่ย ฿${mat.unitCost}/${mat.unit})`,
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
      })
      this.showToast(`รับเข้าสต็อก: ${mat.name} +${addQty.toLocaleString()} ${mat.unit} (ต้นทุนเฉลี่ย ฿${mat.unitCost}/${mat.unit})`, 'success')
    },

    stockAdjust(matId, newActualQty, reason = '', note = '') {
      const mat = this.materials.find(m => m.id === matId)
      if (!mat) return
      const oldStock = Number(mat.stock) || 0
      const diff = Number(newActualQty) - oldStock
      mat.stock = Number(newActualQty)

      // Sync with lots
      if (!mat.lots) mat.lots = []
      let inUseLot = mat.lots.find(l => l.isInUse) || mat.lots.find(l => l.qty > 0)
      if (inUseLot) {
        inUseLot.qty = Math.max(0, Math.round((inUseLot.qty + diff) * 100) / 100)
      } else if (mat.stock > 0) {
        mat.lots.push({
          id: `LOT-${mat.id}-${Date.now()}`,
          receiveDate: mat.lastStockInDate || getTodayString(),
          expiryDate: mat.expiryDate || null,
          qty: mat.stock,
          initialQty: mat.stock,
          unitCost: mat.unitCost || 0,
          packCost: mat.packCost || 0,
          isInUse: true,
          note: 'ปรับยอดตรวจนับ',
          createdAt: new Date().toISOString()
        })
      }

      this.persistLocal()
      this.addActivityLog({
        module: 'stock',
        action: 'adjust',
        title: 'ปรับยอดนับจริง (Stock Audit)',
        description: `ตรวจนับสต็อก ${mat.name}: เดิม ${oldStock.toLocaleString()} เป็น ${Number(newActualQty).toLocaleString()} ${mat.unit} (${diff >= 0 ? '+' : ''}${diff} ${mat.unit})`,
        targetId: mat.id,
        targetName: mat.name,
        targetEmoji: mat.emoji,
        delta: diff,
        unit: mat.unit,
        beforeStock: oldStock,
        afterStock: Number(newActualQty),
        reason: reason || 'นับสต็อกจริงรายวัน',
        note: note || '',
        user: 'ผู้ตรวจนับสต็อก'
      })
      const diffStr = diff >= 0 ? `+${diff}` : `${diff}`
      this.showToast(`ปรับยอด ${mat.name} เป็น ${newActualQty} ${mat.unit} (${diffStr})`, 'info')
    },

    batchProduce(targetMatId, yieldQty, subIngredients = [], note = '', dates = {}) {
      const target = this.materials.find(m => m.id === targetMatId)
      if (!target) return false

      const targetCurrentStock = Number(target.stock) || 0
      const targetCurrentCost = Number(target.unitCost) || 0
      const addedQty = Number(yieldQty) || 0

      // Check if sub-ingredients have enough stock
      let totalCost = 0
      for (const item of subIngredients) {
        const subMat = this.materials.find(m => m.id === item.materialId)
        if (!subMat) continue
        const neededQty = Number(item.qty) || 0
        const availableStock = Number(subMat.stock) || 0

        if (neededQty > availableStock) {
          this.showToast(`สต็อกไม่พอ: ${subMat.name} (มี ${availableStock} ${subMat.unit}, ต้องการ ${neededQty} ${subMat.unit})`, 'error')
          return false
        }
        totalCost += (neededQty * (Number(subMat.unitCost) || 0))
      }

      // Deduct sub-ingredients from lots
      const deductedSummary = []
      for (const item of subIngredients) {
        const subMat = this.materials.find(m => m.id === item.materialId)
        if (subMat) {
          const neededQty = Number(item.qty) || 0
          this.deductMaterialStock(subMat, neededQty)
          deductedSummary.push(`${subMat.name} -${neededQty} ${subMat.unit} (เหลือ ${subMat.stock.toLocaleString()} ${subMat.unit})`)
        }
      }

      // Calculate new weighted unit cost for finished target
      const currentValuation = targetCurrentStock * targetCurrentCost
      const newValuation = currentValuation + totalCost
      const newTotalStock = targetCurrentStock + addedQty
      const newUnitCost = newTotalStock > 0 ? (newValuation / newTotalStock) : targetCurrentCost

      target.unitCost = Math.round(newUnitCost * 10000) / 10000

      // Update Production Date & Expiry Date
      const produceDate = dates?.receiveDate || getTodayString()
      const expiryDate = dates?.expiryDate !== undefined ? (dates.expiryDate || null) : (target.shelfLifeDays ? addDays(produceDate, target.shelfLifeDays) : null)
      target.lastStockInDate = produceDate
      target.expiryDate = expiryDate

      // Add as new lot
      if (!target.lots) target.lots = []
      const newLotId = `LOT-${target.id}-${Date.now()}`
      const hasOtherInUse = target.lots.some(l => l.isInUse && l.qty > 0)
      target.lots.push({
        id: newLotId,
        receiveDate: produceDate,
        expiryDate: expiryDate || null,
        qty: addedQty,
        initialQty: addedQty,
        unitCost: target.unitCost,
        packCost: target.packCost || Math.round(target.unitCost * (target.packSize || 1) * 100) / 100,
        isInUse: !hasOtherInUse,
        note: note ? `ผลิตรอบใหม่: ${note}` : `ผลิตตามสูตร [${deductedSummary.join(', ')}]`,
        createdAt: new Date().toISOString()
      })
      target.stock = Math.round(target.lots.reduce((sum, l) => sum + (Number(l.qty) || 0), 0) * 100) / 100

      this.persistLocal()

      const dateNote = expiryDate
        ? `[ผลิต: ${formatThaiDate(produceDate)}, หมดอายุ: ${formatThaiDate(expiryDate)}]`
        : `[ผลิต: ${formatThaiDate(produceDate)}]`

      const summaryText = deductedSummary.join(', ')
      this.addActivityLog({
        module: 'stock',
        action: 'produce',
        title: 'ผลิตตามสูตร (Batch Produce)',
        description: `ผลิต ${target.name} +${addedQty.toLocaleString()} ${target.unit}`,
        targetId: target.id,
        targetName: target.name,
        targetEmoji: target.emoji,
        delta: addedQty,
        unit: target.unit,
        beforeStock: targetCurrentStock,
        afterStock: target.stock,
        receiveDate: produceDate,
        expiryDate: expiryDate || undefined,
        note: note ? `${note} ${dateNote} [หัก: ${summaryText}]` : `${dateNote} [หักสต็อก: ${summaryText}]`,
        user: 'ผู้ผลิต'
      })

      // Log deduction for each sub-ingredient
      for (const item of subIngredients) {
        const subMat = this.materials.find(m => m.id === item.materialId)
        if (subMat) {
          const neededQty = Number(item.qty) || 0
          this.addActivityLog({
            module: 'stock',
            action: 'produce_deduct',
            title: 'เบิกใช้ผลิตตามสูตร',
            description: `เบิกใช้ ${subMat.name} -${neededQty.toLocaleString()} ${subMat.unit} (ใช้ผลิต ${target.name})`,
            targetId: subMat.id,
            targetName: subMat.name,
            targetEmoji: subMat.emoji,
            delta: -neededQty,
            unit: subMat.unit,
            beforeStock: (Number(subMat.stock) || 0) + neededQty,
            afterStock: Number(subMat.stock) || 0,
            note: `หักสต็อกเพื่อผลิต ${target.name} +${addedQty} ${target.unit}`,
            user: 'ครัว/ผู้ผลิต'
          })
        }
      }

      this.showToast(`เพิ่มสต็อก ${target.name} +${addedQty} ${target.unit} สำเร็จ! [หักสต็อก: ${summaryText}]`, 'success')
      return true
    },

    // ========================================================
    // LOT MANAGEMENT & WASTE (SPOILAGE) WRITE-OFF
    // ========================================================
    switchActiveLot(materialId, lotId) {
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
      this.persistLocal()
      this.showToast(`สลับใช้งานเป็นล็อตวันที่ ${formatThaiDate(targetLot?.receiveDate)} เรียบร้อยแล้ว`, 'success')
    },

    recordLotWaste({ materialId, lotId, wasteQty, reason = 'ของเสีย/หมดอายุ', note = '' }) {
      const mat = this.materials.find(m => m.id === materialId)
      if (!mat || !mat.lots) return false
      const lot = mat.lots.find(l => l.id === lotId)
      if (!lot) return false

      const qtyToWaste = Math.min(Number(wasteQty) || 0, Number(lot.qty) || 0)
      if (qtyToWaste <= 0) {
        this.showToast('กรุณาระบุจำนวนของเสียที่ถูกต้อง', 'error')
        return false
      }

      const beforeStock = mat.stock
      lot.qty = Math.max(0, Math.round((lot.qty - qtyToWaste) * 100) / 100)

      // Recalculate material total stock
      mat.stock = Math.round(mat.lots.reduce((sum, l) => sum + (Number(l.qty) || 0), 0) * 100) / 100

      // If this lot was in use and is now 0, advance to next available lot
      if (lot.isInUse && lot.qty <= 0) {
        lot.isInUse = false
        const nextLot = mat.lots.find(l => l.qty > 0)
        if (nextLot) nextLot.isInUse = true
      }

      const unitCost = Number(lot.unitCost) || Number(mat.unitCost) || 0
      const totalLossValue = Math.round((qtyToWaste * unitCost) * 100) / 100

      this.persistLocal()

      // Log waste transaction
      this.addActivityLog({
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
      })

      this.showToast(`บันทึกของเสีย ${mat.name} (-${qtyToWaste} ${mat.unit}) เสียหาย ฿${totalLossValue.toLocaleString()}`, 'info')
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

    // Deduct stock from material lots (Priority: in-use lot, then FIFO)
    deductMaterialStock(mat, neededQty) {
      if (!mat) return
      const qty = Number(neededQty) || 0
      if (qty <= 0) return

      if (!mat.lots || mat.lots.length === 0) {
        mat.stock = Math.max(0, Math.round((mat.stock - qty) * 100) / 100)
        return
      }

      let remaining = qty

      // 1. Deduct from currently in-use lot first
      let inUseLot = mat.lots.find(l => l.isInUse && l.qty > 0)
      if (inUseLot) {
        const take = Math.min(inUseLot.qty, remaining)
        inUseLot.qty = Math.round((inUseLot.qty - take) * 100) / 100
        remaining = Math.round((remaining - take) * 100) / 100
        if (inUseLot.qty <= 0) {
          inUseLot.isInUse = false
        }
      }

      // 2. If remaining > 0, deduct from other available lots by FIFO
      if (remaining > 0) {
        const otherLots = mat.lots
          .filter(l => l.qty > 0)
          .sort((a, b) => {
            if (a.expiryDate && b.expiryDate) return a.expiryDate.localeCompare(b.expiryDate)
            return (a.receiveDate || '').localeCompare(b.receiveDate || '')
          })

        for (const lot of otherLots) {
          const take = Math.min(lot.qty, remaining)
          lot.qty = Math.round((lot.qty - take) * 100) / 100
          remaining = Math.round((remaining - take) * 100) / 100
          lot.isInUse = true
          if (lot.qty <= 0) lot.isInUse = false
          if (remaining <= 0) break
        }
      }

      // 3. Ensure at least one positive lot is in-use if stock remains
      if (!mat.lots.some(l => l.isInUse && l.qty > 0)) {
        const nextAvail = mat.lots.find(l => l.qty > 0)
        if (nextAvail) nextAvail.isInUse = true
      }

      mat.stock = Math.round(mat.lots.reduce((sum, l) => sum + (Number(l.qty) || 0), 0) * 100) / 100

      // Update primary dates
      const activeLot = mat.lots.find(l => l.isInUse && l.qty > 0) || mat.lots[0]
      if (activeLot) {
        if (activeLot.receiveDate) mat.lastStockInDate = activeLot.receiveDate
        if (activeLot.expiryDate) mat.expiryDate = activeLot.expiryDate
      }
    },

    // ========================================================
    // POS ORDER & CART LOGIC (WITH STRICT STOCK VALIDATION)
    // ========================================================
    
    // Check material availability for a menu + add-ons
    checkStockAvailability(menu, selectedAddons = [], targetQty = 1) {
      const required = {}

      // Menu Recipe deduction
      if (menu.recipe && Array.isArray(menu.recipe)) {
        menu.recipe.forEach(r => {
          required[r.materialId] = (required[r.materialId] || 0) + (r.qty * targetQty)
        })
      }

      // Add-on deduction
      if (selectedAddons && selectedAddons.length > 0) {
        selectedAddons.forEach(a => {
          if (a.materialId && a.amountUsed) {
            required[a.materialId] = (required[a.materialId] || 0) + (a.amountUsed * targetQty)
          }
        })
      }

      // Check current cart's already reserved materials
      this.cart.forEach(item => {
        if (item.menu.recipe) {
          item.menu.recipe.forEach(r => {
            required[r.materialId] = (required[r.materialId] || 0) + (r.qty * item.qty)
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

      const outOfStockList = []
      const lowStockList = []

      for (const [matId, needed] of Object.entries(required)) {
        const mat = this.matMap[matId]
        if (!mat || mat.isDeleted) continue

        if (needed > mat.stock) {
          outOfStockList.push({
            name: mat.name,
            emoji: mat.emoji,
            stock: mat.stock,
            needed: needed,
            unit: mat.unit
          })
        } else if ((mat.stock - needed) <= mat.minAlert) {
          lowStockList.push({
            name: mat.name,
            emoji: mat.emoji,
            remaining: Math.max(0, mat.stock - needed),
            minAlert: mat.minAlert,
            unit: mat.unit
          })
        }
      }

      return {
        canAdd: outOfStockList.length === 0,
        outOfStockList,
        lowStockList
      }
    },

    addToCart(menu, selectedAddons = [], qty = 1, forceConfirm = false) {
      const stockCheck = this.checkStockAvailability(menu, selectedAddons, qty)

      // Rule 1: Out of stock - STRICTLY FORBIDDEN
      if (!stockCheck.canAdd) {
        const missing = stockCheck.outOfStockList.map(m => `${m.emoji} ${m.name} (คงเหลือ ${m.stock} ${m.unit})`).join(', ')
        this.showToast(`ไม่สามารถเพิ่มได้: วัตถุดิบหมดสต็อก (${missing})`, 'error')
        return false
      }

      // Rule 2: Low stock warning popup
      if (stockCheck.lowStockList.length > 0 && !forceConfirm) {
        this.modals.lowStockWarning = {
          isOpen: true,
          warningItems: stockCheck.lowStockList,
          onConfirm: () => {
            this.modals.lowStockWarning.isOpen = false
            this.executeAddToCart(menu, selectedAddons, qty)
          }
        }
        return false
      }

      this.executeAddToCart(menu, selectedAddons, qty)
      return true
    },

    executeAddToCart(menu, selectedAddons = [], qty = 1) {
      const plat = this.currentPlatform
      const basePrice = (menu.prices && menu.prices[plat.id] !== undefined)
        ? Number(menu.prices[plat.id])
        : 0

      // Match item in cart with same menu and exact same add-ons
      const addonKey = selectedAddons.map(a => a.id).sort().join(',')
      const existingIdx = this.cart.findIndex(i => i.menu.id === menu.id && i.addonKey === addonKey)

      if (existingIdx >= 0) {
        this.cart[existingIdx].qty += qty
      } else {
        this.cart.push({
          menu,
          selectedAddons: [...selectedAddons],
          addonKey,
          qty,
          basePrice
        })
      }
      this.modals.customOrder = { isOpen: false, menuId: null }
      this.showToast(`เพิ่ม "${menu.name}" ลงในรายการแล้ว`, 'success')
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
    checkout() {
      if (this.cart.length === 0) {
        this.showToast('ไม่มีรายการในออเดอร์', 'error')
        return null
      }

      const summary = this.cartSummary
      const plat = this.currentPlatform
      const now = new Date()
      const datePart = now.getFullYear().toString().slice(-2) + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0')
      const orderId = `ORD-${datePart}-${String(this.orders.length + 101).slice(-3)}`

      // Deduct materials from stock
      this.cart.forEach(item => {
        // Deduct Menu recipe
        if (item.menu.hasPackage !== false && item.menu.recipe) {
          item.menu.recipe.forEach(r => {
            const mat = this.materials.find(m => m.id === r.materialId)
            if (mat) {
              this.deductMaterialStock(mat, r.qty * item.qty)
            }
          })
        } else if (item.menu.recipe) {
          // If packaging is disabled, only deduct non-packaging materials
          item.menu.recipe.forEach(r => {
            const mat = this.materials.find(m => m.id === r.materialId)
            if (mat && mat.category !== 'Packaging') {
              this.deductMaterialStock(mat, r.qty * item.qty)
            }
          })
        }

        // Deduct Add-on materials
        if (item.selectedAddons) {
          item.selectedAddons.forEach(a => {
            if (a.materialId && a.amountUsed) {
              const mat = this.materials.find(m => m.id === a.materialId)
              if (mat) {
                this.deductMaterialStock(mat, a.amountUsed * item.qty)
              }
            }
          })
        }
      })

      // Construct Order Object
      const orderItems = this.cart.map(item => {
        const itemUnitPrice = (item.menu.prices && item.menu.prices[plat.id] !== undefined) ? Number(item.menu.prices[plat.id]) : 0
        const addonTotal = (item.selectedAddons || []).reduce((sum, a) => sum + (Number(a.prices?.[plat.id]) || 0), 0)
        const finalUnitPrice = itemUnitPrice + addonTotal
        return {
          menuId: item.menu.id,
          menuName: item.menu.name,
          qty: item.qty,
          unitPrice: finalUnitPrice,
          totalPrice: finalUnitPrice * item.qty,
          selectedAddons: item.selectedAddons.map(a => ({
            id: a.id,
            name: a.name,
            price: Number(a.prices?.[plat.id]) || 0,
            materialId: a.materialId,
            amountUsed: a.amountUsed
          }))
        }
      })

      const newOrder = {
        orderId,
        createdAt: now.toISOString(),
        platformId: plat.id,
        platformName: plat.name,
        subtotal: summary.subtotal,
        discount: 0,
        gpAmount: summary.gpAmount,
        netRevenue: summary.netRevenue,
        foodCost: summary.totalFoodCost,
        grossProfit: summary.grossProfit,
        paymentMethod: this.paymentMethod,
        note: this.orderNote,
        items: orderItems
      }

      this.orders.unshift(newOrder)
      this.clearCart()
      this.persistLocal()

      // Record Sale Log
      this.addActivityLog({
        module: 'pos',
        action: 'order_complete',
        title: `ขายหน้าร้าน (${orderId})`,
        description: `ออเดอร์ ${orderId} ยอดชำระ ฿${summary.subtotal.toLocaleString()} (${orderItems.length} รายการ - ${plat.name})`,
        targetId: orderId,
        targetName: orderItems.map(i => `${i.menuName} x${i.qty}`).join(', '),
        targetEmoji: '🧾',
        delta: summary.subtotal,
        unit: '฿',
        note: this.orderNote || `${plat.name} (${this.paymentMethod})`,
        user: 'แคชเชียร์'
      })

      // Open receipt modal
      this.modals.receipt = { isOpen: true, order: newOrder }
      this.showToast(`สร้างออเดอร์ ${orderId} สำเร็จ (ตัดสต็อกแล้ว)`, 'success')

      // Sync in background if GAS is set
      if (this.gasApiUrl) {
        this.syncWithGas()
      }

      return newOrder
    }
  }
})
