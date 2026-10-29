<template>
  <div ref="workspace" class="pos-workspace" :class="{'is-split':split,'is-cart-page':!split&&cartOpen}">
    <PosCatalog v-show="split||!cartOpen" :menus="filteredMenus" :platforms="store.platforms" :platform-id="store.currentPlatformId" :cart-quantities="cartQuantities" v-model:search="searchQuery" :price-for="getMenuPrice" :unavailable-for="isMenuOutOfStock" @platform="store.setPlatform($event)" @select-menu="selectMenu" />

    <CartPanel :presentation="split?'panel':'page'" :open="cartOpen" :checkout-pending="checkoutPending" @request-close="cartOpen=false" @checkout="handleCheckout" @switch-lot="handleSwitchLot"/>
    <CartReviewBar v-if="!split&&!cartOpen" :quantity="cartQuantity" :subtotal="Number(cartSummary.subtotal)" :open="cartOpen" @open="cartOpen=true"/>
  </div>
</template>

<script setup>
import PosCatalog from '@/components/pos/PosCatalog.vue'
import {useElementWidth} from '@/composables/useElementWidth'
import { ref, computed,watch } from 'vue'
import { usePosStore } from '@/stores/posStore'
import CartPanel from '@/components/pos/CartPanel.vue'
import CartReviewBar from '@/components/pos/CartReviewBar.vue'
import {useCartPageFocus} from '@/composables/useCartPageFocus'

const store = usePosStore()
const workspace=ref(null),width=useElementWidth(workspace)
const split=computed(()=>width.value>=696)
const cartOpen=ref(false),checkoutPending=ref(false)
useCartPageFocus(workspace,split,cartOpen)
const cartQuantity=computed(()=>store.cart.reduce((n,item)=>n+item.qty,0))
const cartQuantities=computed(()=>store.cart.reduce((counts,item)=>{counts[item.menu.id]=(counts[item.menu.id]||0)+item.qty;return counts},{}))
watch(split,value=>{if(value)cartOpen.value=false})
function selectMenu(id){const menu=store.menus.find(m=>m.id===id);if(menu)handleMenuClick(menu)}

const searchQuery = ref('')
const filteredMenus = computed(() => {
  return store.menus.filter(m => {
    if (m.isActive === false) return false
    const q = searchQuery.value.trim().toLowerCase()
    const matchQ = !q || m.name.toLowerCase().includes(q) || (m.description || '').toLowerCase().includes(q)
    return matchQ
  })
})

const cartSummary = computed(() => store.cartSummary)

function getMenuPrice(menu) {
  const platId = store.currentPlatformId
  return (menu.prices && menu.prices[platId] !== undefined) ? Number(menu.prices[platId]) : 0
}

function isMenuOutOfStock(menu) {
  const check = store.checkStockAvailability(menu, [], 1)
  return !check.canAdd
}

function handleMenuClick(menu) {
  store.modals.customOrder = { isOpen: true, menuId: menu.id }
}

async function handleSwitchLot(w) {
  const confirmed = await store.promptLotDepletion({
    material: w.material,
    currentLot: w.currentLot,
    nextLot: w.nextLot,
    neededQty: w.neededQty,
    availableInCurrent: w.availableInCurrent,
    remainingAfter: w.remainingAfter,
    shortageQty: w.shortageQty,
    willDeplete: w.willDeplete,
    isLow: w.isLow,
    actionContext: 'pos'
  })
  if (confirmed && w.nextLot) {
    store.switchActiveLotSilently(w.material.id, w.nextLot.id)
    store.showToast(`สลับล็อต ${w.material.name} เป็นล็อตใหม่เรียบร้อยแล้ว`, 'success')
  }
}

function handleCheckout() {
  if (checkoutPending.value || store.cart.length === 0) return null
  checkoutPending.value=true
  try{
    const result=store.checkout()
    if(result?.orderId){cartOpen.value=false;checkoutPending.value=false}
    return result
  }catch{
    store.showToast('ไม่สามารถบันทึกออเดอร์ได้ ตรวจรายการแล้วลองอีกครั้ง','error')
    return null
  }finally{
    if(!store.modals.lowStockWarning?.isOpen&&!store.modals.lotDepletion?.isOpen)checkoutPending.value=false
  }
}
watch(()=>[store.modals.lowStockWarning?.isOpen,store.modals.lotDepletion?.isOpen,store.modals.receipt?.isOpen],()=>{
  if(!checkoutPending.value)return
  if(store.modals.receipt?.isOpen&&store.modals.receipt.order&&store.cart.length===0){cartOpen.value=false;checkoutPending.value=false}
  else if(!store.modals.lowStockWarning?.isOpen&&!store.modals.lotDepletion?.isOpen)checkoutPending.value=false
},{flush:'post'})
</script>

<style scoped>
.pos-workspace{display:flex;flex-direction:column;gap:24px;min-width:0}
.pos-workspace.is-split{flex-direction:row;gap:16px;height:var(--pos-workspace-height,calc(100dvh - var(--sidebar-header-height,var(--panel-header-height)) - 48px));min-height:0;overflow:hidden}
.pos-workspace:not(.is-split){padding-bottom:84px}.pos-workspace.is-cart-page{padding-bottom:0}
.pos-workspace.is-split :deep(.pos-catalog-scroll){overflow-y:auto;padding-right:2px;overscroll-behavior:contain}
</style>
