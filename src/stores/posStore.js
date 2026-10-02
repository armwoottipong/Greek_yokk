import { defineStore } from 'pinia'
import {
  DEFAULT_MATERIALS,
  DEFAULT_MENUS,
  DEFAULT_ADDONS,
  DEFAULT_PLATFORMS,
  DEFAULT_ORDERS,
  DEFAULT_PRESET_EMOJIS,
  EMOJI_CATALOG
} from '@/data/initialData'

export const usePosStore = defineStore('pos', {
  state: () => {
    // Load from LocalStorage or defaults
    const storedMaterials = JSON.parse(localStorage.getItem('GY_MATERIALS')) || DEFAULT_MATERIALS
    const storedMenus = JSON.parse(localStorage.getItem('GY_MENUS')) || DEFAULT_MENUS
    const storedAddons = JSON.parse(localStorage.getItem('GY_ADDONS')) || DEFAULT_ADDONS
    const storedPlatforms = JSON.parse(localStorage.getItem('GY_PLATFORMS')) || DEFAULT_PLATFORMS
    const storedOrders = JSON.parse(localStorage.getItem('GY_ORDERS')) || DEFAULT_ORDERS
    const storedGasUrl = localStorage.getItem('GY_GAS_API_URL') || ''

    return {
      currentTab: 'dashboard', // 'dashboard' | 'pos' | 'menu' | 'addon' | 'stock' | 'settings'
      dashboardPeriod: 'today', // 'today' | 'week' | 'month' | 'all'

      // Master Collections with strict number parsing and default recipe migration
      materials: storedMaterials.map(m => {
        const item = {
          ...m,
          stock: Number(m.stock) || 0,
          minAlert: Number(m.minAlert) || 0,
          unitCost: Number(m.unitCost) || 0,
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
        return item
      }),
      menus: storedMenus,
      addons: storedAddons,
      platforms: storedPlatforms,
      orders: storedOrders,

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
        customOrder: { isOpen: false, menuId: null },
        receipt: { isOpen: false, order: null },
        lowStockWarning: { isOpen: false, warningItems: [], onConfirm: null },
        emojiPicker: { isOpen: false, targetCallback: null }
      },

      // Google Sheets live sync
      gasApiUrl: storedGasUrl,
      isSyncing: false,
      lastSyncTime: null,

      // Toast notifications
      toasts: [],

      // Emoji Catalog
      presetEmojis: DEFAULT_PRESET_EMOJIS,
      emojiCatalog: EMOJI_CATALOG
    }
  },

  getters: {
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
    // Tab switching
    switchTab(tab) {
      this.currentTab = tab
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
      localStorage.setItem('GY_GAS_API_URL', this.gasApiUrl)
    },

    resetDemoData() {
      this.materials = DEFAULT_MATERIALS.map(m => ({ ...m }))
      this.menus = DEFAULT_MENUS.map(m => ({ ...m }))
      this.addons = DEFAULT_ADDONS.map(a => ({ ...a }))
      this.platforms = DEFAULT_PLATFORMS.map(p => ({ ...p }))
      this.orders = DEFAULT_ORDERS.map(o => ({ ...o }))
      this.cart = []
      this.persistLocal()
      this.showToast('รีเฟรชข้อมูลตัวอย่าง (Demo Data) สำเร็จแล้ว', 'info')
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
      if (matData.id) {
        const idx = this.materials.findIndex(m => m.id === matData.id)
        if (idx >= 0) {
          this.materials[idx] = { ...this.materials[idx], ...matData }
        }
      } else {
        const newId = 'MAT' + String(this.materials.length + 1).padStart(3, '0')
        this.materials.push({
          ...matData,
          id: newId,
          stock: Number(matData.stock) || 0,
          minAlert: Number(matData.minAlert) || 0,
          unitCost: Number(matData.unitCost) || 0,
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

    stockIn(matId, qty, unitCost, note = '') {
      const mat = this.materials.find(m => m.id === matId)
      if (!mat) return
      const addQty = Number(qty) || 0
      mat.stock += addQty
      if (unitCost !== undefined && unitCost !== null && Number(unitCost) > 0) {
        mat.unitCost = Number(unitCost)
      }
      this.persistLocal()
      this.showToast(`รับเข้าสต็อก: ${mat.name} +${addQty} ${mat.unit} เรียบร้อย`, 'success')
    },

    stockAdjust(matId, newActualQty, reason = '', note = '') {
      const mat = this.materials.find(m => m.id === matId)
      if (!mat) return
      const diff = Number(newActualQty) - mat.stock
      mat.stock = Number(newActualQty)
      this.persistLocal()
      const diffStr = diff >= 0 ? `+${diff}` : `${diff}`
      this.showToast(`ปรับยอด ${mat.name} เป็น ${newActualQty} ${mat.unit} (${diffStr})`, 'info')
    },

    batchProduce(targetMatId, yieldQty, subIngredients = [], note = '') {
      const target = this.materials.find(m => m.id === targetMatId)
      if (!target) return false

      const targetCurrentStock = Number(target.stock) || 0
      const targetCurrentCost = Number(target.unitCost) || 0
      const addedQty = Number(yieldQty) || 0

      // Check if sub-ingredients have enough stock (with strict Number conversion)
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

      // Deduct sub-ingredients (with strict Number calculation)
      const deductedSummary = []
      for (const item of subIngredients) {
        const subMat = this.materials.find(m => m.id === item.materialId)
        if (subMat) {
          const neededQty = Number(item.qty) || 0
          const oldStock = Number(subMat.stock) || 0
          const newStock = Math.max(0, Math.round((oldStock - neededQty) * 100) / 100)
          subMat.stock = newStock
          deductedSummary.push(`${subMat.name} -${neededQty} ${subMat.unit} (เหลือ ${newStock.toLocaleString()} ${subMat.unit})`)
        }
      }

      // Calculate new weighted unit cost for finished target
      const currentValuation = targetCurrentStock * targetCurrentCost
      const newValuation = currentValuation + totalCost
      const newTotalStock = targetCurrentStock + addedQty
      const newUnitCost = newTotalStock > 0 ? (newValuation / newTotalStock) : targetCurrentCost

      target.stock = Math.round(newTotalStock * 100) / 100
      target.unitCost = Math.round(newUnitCost * 10000) / 10000

      this.persistLocal()

      const summaryText = deductedSummary.join(', ')
      this.showToast(`เพิ่มสต็อก ${target.name} +${addedQty} ${target.unit} สำเร็จ! [หักสต็อก: ${summaryText}]`, 'success')
      return true
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
              mat.stock = Math.max(0, Math.round((mat.stock - (r.qty * item.qty)) * 100) / 100)
            }
          })
        } else if (item.menu.recipe) {
          // If packaging is disabled, only deduct non-packaging materials
          item.menu.recipe.forEach(r => {
            const mat = this.materials.find(m => m.id === r.materialId)
            if (mat && mat.category !== 'Packaging') {
              mat.stock = Math.max(0, Math.round((mat.stock - (r.qty * item.qty)) * 100) / 100)
            }
          })
        }

        // Deduct Add-on materials
        if (item.selectedAddons) {
          item.selectedAddons.forEach(a => {
            if (a.materialId && a.amountUsed) {
              const mat = this.materials.find(m => m.id === a.materialId)
              if (mat) {
                mat.stock = Math.max(0, Math.round((mat.stock - (a.amountUsed * item.qty)) * 100) / 100)
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
