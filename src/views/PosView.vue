<template>
  <div class="pos-workspace">
    <PosCatalog :menus="filteredMenus" :platforms="store.platforms" :platform-id="store.currentPlatformId" :cart-quantities="cartQuantities" v-model:search="searchQuery" :price-for="getMenuPrice" :unavailable-for="isMenuOutOfStock" @platform="store.setPlatform($event)" @select-menu="selectMenu" />

    <CartPanel :presentation="mobile?'drawer':'side-drawer'" :open="cartOpen" :checkout-pending="checkoutPending" @request-close="cartOpen=false" @checkout="handleCheckout" @switch-lot="handleSwitchLot"/>
    <CartLauncher ref="launcher" :quantity="cartQuantity" :open="cartOpen" :busy="checkoutPending" @open="cartOpen=true"/>
  </div>
</template>

<script setup>
import PosCatalog from '@/components/pos/PosCatalog.vue'
import {useMediaQuery} from '@/composables/useMediaQuery'
import { ref, computed,watch,onDeactivated } from 'vue'
import { usePosStore } from '@/stores/posStore'
import CartPanel from '@/components/pos/CartPanel.vue'
import CartLauncher from '@/components/pos/CartLauncher.vue'

const store = usePosStore()
const mobile=useMediaQuery('(max-width: 767px)'),launcher=ref(null)
const cartOpen=ref(false),checkoutPending=ref(false)
const cartQuantity=computed(()=>store.cart.reduce((n,item)=>n+item.qty,0))
const cartQuantities=computed(()=>store.cart.reduce((counts,item)=>{counts[item.menu.id]=(counts[item.menu.id]||0)+item.qty;return counts},{}))
onDeactivated(()=>{cartOpen.value=false})
function selectMenu(id){const menu=store.menus.find(m=>m.id===id);if(menu){launcher.value?.capture(id);handleMenuClick(menu)}}

const searchQuery = ref('')
const filteredMenus = computed(() => {
  return store.menus.filter(m => {
    if (m.isActive === false) return false
    const q = searchQuery.value.trim().toLowerCase()
    const matchQ = !q || m.name.toLowerCase().includes(q) || (m.description || '').toLowerCase().includes(q)
    return matchQ
  })
})

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
.pos-workspace{position:relative;overflow-x:clip;display:flex;flex-direction:column;gap:24px;min-width:0}
.pos-workspace{padding-bottom:84px}
</style>
