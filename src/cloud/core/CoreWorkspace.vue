<template>
 <CloudProductShell :model="productModel" :title="pageTitle" :loading="loading||reloading" :busy="busy" :online="online" @history="navigate('orders')" @reload="reloadEverything" @sign-out="$emit('sign-out')">
  <p v-if="data?.display.trial" class="trial-banner"><strong>ข้อมูลทดสอบ — ยังไม่ใช่ยอดร้านปัจจุบัน</strong><br>จากไฟล์สำรอง {{ sourceDate }} · <a :href="localUrl">เปิดระบบเดิม</a></p>
  <p v-if="!state.serverReady||!online" class="connection-warning" role="status">ขาดการเชื่อมต่อ · เก็บตะกร้าไว้แล้ว กรุณาเชื่อมต่อก่อนบันทึก</p>
  <p v-if="message" class="notice" role="status" aria-live="polite">{{ message }}</p>
  <p v-if="error" class="error" role="alert">{{ error }}</p>
  <section v-if="pendingCommand&&operator" class="pending-panel" aria-label="รายการรอตรวจผล"><h3>ยังไม่ทราบผลการบันทึก</h3><p>{{ pendingLabel }} · เก็บคำสั่งเดิมไว้แล้ว ตรวจผลก่อนบันทึกรายการใหม่ เพื่อไม่บันทึกซ้ำ</p><p v-if="pendingCause">{{ explain({code:pendingCause}) }}</p><details><summary>รายละเอียดรายการรอตรวจผล</summary><p>รหัสรายการ: {{ pendingCommand.opId }}</p><p v-if="pendingCause">รหัสสาเหตุ: {{ pendingCause }}</p></details><Button data-retry-command :disabled="!ready||busy" :loading="activeAction==='retry'" @click="retry">ตรวจผลและลองต่อ</Button><Button v-if="pendingCommand.kind==='sale'" variant="secondary" :disabled="!ready||busy" :loading="activeAction==='abandon'" @click="abandon">หยุดบิลที่ยังไม่สำเร็จและเก็บตะกร้า</Button><Button v-else-if="pendingCommand.payload?.expectedRevision!==undefined" variant="secondary" :disabled="!ready||busy" :loading="activeAction==='stop'" @click="stopPending">หยุดรายการที่ยังไม่สำเร็จและเก็บแบบร่าง</Button></section>
  <p v-if="!data" class="loading-copy">{{ loading ? 'กำลังโหลดข้อมูลร้านจากเซิร์ฟเวอร์…' : 'ยังโหลดข้อมูลร้านไม่ได้ กดโหลดข้อมูลล่าสุดเพื่อลองใหม่' }}</p>
  <template v-else>
   <section v-if="operator" v-show="tab==='sale'" ref="saleRoot" class="pos-workspace" :class="{'is-split':split,'is-cart-page':!split&&cartOpen}" aria-label="ขายสินค้า">
    <PosCatalog v-show="split||!cartOpen" :menus="filteredMenus" :platforms="productPlatforms" :platform-id="platformId" :cart-quantities="cartQuantities" v-model:search="searchQuery" :disabled="locked" :price-for="m=>m.prices[platformId]||0" :unavailable-for="menuUnavailable" @platform="setPlatform" @select-menu="selectMenu"/>
    <CartPanel :model="productModel" :presentation="split?'panel':'page'" :open="cartOpen" :checkout-pending="activeAction==='sale'" :disabled="locked" @request-close="cartOpen=false" @checkout="checkout">
     <template #review>
      <div class="cart-cloud-review">
       <p>หนึ่งบิลได้สูงสุด {{ saleLimit }} รายการ · จำนวนเมนูเดียวกันรวมเป็นรายการเดียวได้</p>
       <section v-if="shortages.length" class="shortage"><h3>สต็อกไม่พอ</h3><p v-for="[id,q] in shortages" :key="id">{{ materialName(id) }} ขาด {{ amount(q) }} {{ material(id)?.unit }}</p><label><input v-model="approveShortage" type="checkbox" :disabled="locked"> ยืนยันขายตามจำนวนที่ขาดข้างต้น</label></section>
       <p v-if="previewError" class="error" role="alert">{{ previewError }}</p>
       <div v-if="pendingCommand"><strong>ยังไม่ทราบผลการบันทึก</strong><p>ตรวจผลด้วยคำสั่งเดิมก่อนเริ่มบิลใหม่</p><Button :disabled="!ready||busy" :loading="activeAction==='retry'" @click="retry">ตรวจผลและลองต่อ</Button><Button v-if="pendingCommand.kind==='sale'" variant="quiet" :disabled="!ready||busy" :loading="activeAction==='abandon'" @click="abandon">หยุดบิลและเก็บตะกร้า</Button></div>
       <p>ยืนยันจากเซิร์ฟเวอร์ก่อนถือว่าขายสำเร็จ · บรรจุภัณฑ์ตัดตามสูตรที่บันทึกไว้</p>
      </div>
     </template>
    </CartPanel>
    <CartReviewBar v-if="!split&&!cartOpen" :quantity="cartQuantity" :subtotal="(preview?.subtotalCents||0)/100" :open="cartOpen" @open="cartOpen=true"/>
   </section>
   <CloudDashboardWorkspace v-if="reportVisited" v-show="tab==='dashboard'" :active="tab==='dashboard'" :read-only="!operator" :ready="ready" :revision="state.shop.revision" :refresh-key="reportRefreshKey" :data="data" :service="service" :modals="productModel.modals" :inventory-model="inventoryWorkspace?.model" @navigate="productModel.switchTab"/>
   <CloudStockWorkspace v-if="operator" ref="inventoryWorkspace" v-show="['stock','menu','addon'].includes(tab)" :current-tab="tab" :data="data" :service="service" :execute="send" :ready="ready" :blocked="locked" :storage-key="`gy-inventory-drafts-v1:${storageKey}`" :read-history="readStockHistory"/>
   <SettingsView v-if="settingsVisited&&role==='admin'" v-show="tab==='settings'" :model="settingsModel"/>
   <section v-if="tab==='orders'" aria-label="ประวัติบิล"><div class="section-heading"><div><h3>บิลขายและคืนบิล</h3><p>100 บิลล่าสุดจาก Firebase · คืนสต็อกตามล็อตเดิมเมื่อคืนบิล</p></div></div><p v-if="!data.orders.length" class="empty-orders">ยังไม่มีบิลจาก Firebase</p><ol class="order-list"><li v-for="o in data.orders" :key="o.opId"><div><StatusBadge :label="o.status==='cancelled'?'คืนบิลแล้ว':'ขายสำเร็จ'" :tone="o.status==='cancelled'?'neutral':'success'"/><strong>{{ money(o.subtotalCents) }}</strong><p>{{ orderDate(o) }} · {{ name('platforms',o.platformId) }}</p><p>{{ o.lines.map(l=>`${name('menus',l.menuId)} × ${l.qty}`).join(', ') }}</p><small>{{ o.opId }}</small></div><Button v-if="o.status==='committed'" variant="secondary" :disabled="locked||!ready" @click="cancelId=o.opId">คืนบิล</Button></li></ol><details @toggle="loadHistory"><summary>ประวัติบิลจากระบบเดิม</summary><p class="muted">คืนบิลเก่าได้หลังแปลงหลักฐานล็อตด้วยเครื่องมือเจ้าของร้านแล้ว · ตรวจบิลจากเซิร์ฟเวอร์ก่อนยืนยันทุกครั้ง</p><p v-for="(o,i) in legacyOrders" :key="i">{{ o.createdAt }} · {{ o.platformName }} · {{ money(Math.round((o.subtotal||0)*100)) }} · {{ o.status||'ประวัติเดิม' }} <Button v-if="o.status!=='cancelled'" :data-legacy-return="o.orderId" size="compact" variant="secondary" :loading="legacyLookup===o.orderId" :disabled="locked||!ready||!!legacyLookup" @click="reviewLegacy(o)">ตรวจบิลเพื่อคืน</Button></p></details></section>
  </template>
 </CloudProductShell>
 <ReceiptModal :model="productModel" teleport/>
 <PackageReviewModal :model="productModel"/>
 <DialogFrame :open="!!menu" id="cloud-custom-order" title="รายละเอียดสินค้า" presentation="drawer" width="520px" :busy="busy" @request-close="selectedMenu=''">
  <form v-if="menu" id="cloud-line-form" class="line-form" @submit.prevent="addLine">
   <div class="product-detail"><div class="product-visual" aria-hidden="true">{{ data.display.menus?.[menu.id]?.emoji }}</div><div class="bowl-heading"><h3>{{ name('menus',menu.id) }}</h3><strong class="product-base-price">{{ money(menu.pricesCents[platformId]) }}</strong></div></div>
   <div class="bowl-groups"><section v-for="g in menuGroups" :key="g.id" class="bowl-options"><header><div><h4>{{ g.name }}</h4><p>เลือก {{ g.min===g.max?g.min:`${g.min}–${g.max}` }} อย่าง · {{ g.pricingMode==='included'?'รวมในราคา':'คิดเงินเพิ่ม' }}</p></div><span>{{ groupCount(g) }}/{{ g.max }}</span></header><div class="bowl-addon-grid"><div v-for="id in g.optionIds" :key="id" class="bowl-group-option"><button type="button" class="bowl-addon" :class="{'is-selected':choices[g.id][id]>0}" :aria-pressed="choices[g.id][id]>0" :disabled="locked||(!choices[g.id][id]&&groupCount(g)>=g.max)" @click="toggleChoice(g,id)"><span class="bowl-addon-emoji" aria-hidden="true">{{ data.display.addons?.[id]?.emoji }}</span><span class="bowl-addon-name"><strong>{{ name('addons',id) }}</strong></span><span class="bowl-addon-price">{{ optionPrice(g,id) }}</span><span class="bowl-addon-check"><Check v-if="choices[g.id][id]>0" :size="15"/><Plus v-else :size="15"/></span></button><div v-if="g.allowRepeat&&choices[g.id][id]>0" class="bowl-option-quantity"><AppQuantityInput v-model="choices[g.id][id]" :label="`${g.name} ${name('addons',id)} จำนวน`" :min="0" :max="g.max" :disabled="locked"/></div></div></div></section></div>
   <section class="product-note"><label class="field">หมายเหตุ<AppInput v-model="lineNote" maxlength="1000" placeholder="เช่น แยกท็อปปิ้ง" :disabled="locked"/></label></section>
   <p v-if="lineError" class="error" role="alert">{{ lineError }}</p>
  </form>
  <template v-if="menu" #footer><div class="custom-order-footer"><div class="bowl-total"><span>จำนวนชาม</span><strong>{{ quantity }} ชาม</strong></div><AppQuantityInput v-model="quantity" label="จำนวนชาม" :min="1" :max="1000000" :disabled="locked"/><div class="custom-order-footer-actions"><Button type="submit" form="cloud-line-form" data-add-line :disabled="locked||cart.length>=saleLimit">เพิ่มลงตะกร้า</Button></div><p class="muted">หนึ่งบิลได้สูงสุด {{ saleLimit }} รายการ</p></div></template>
 </DialogFrame>
 <DialogFrame :open="!!cancelId" id="cloud-cancel-order" title="ยืนยันคืนบิล" :busy="busy" @request-close="cancelId=''"><p>ยืนยันคืนเงินและคืนสต็อกบิลนี้ตามล็อตเดิม?</p><p v-if="error" class="error" role="alert">{{ error }}</p><template #footer><Button variant="secondary" :disabled="busy" @click="cancelId=''">เก็บบิลไว้</Button><Button :disabled="locked||!ready" :loading="activeAction==='cancel'" @click="cancelOrder(cancelId)">ยืนยันคืนบิล</Button></template></DialogFrame>
 <DialogFrame :open="clearConfirm" id="cloud-clear-cart" title="ล้างตะกร้านี้?" @request-close="answerClear(false)"><p>รายการสินค้า ท็อปปิ้ง และหมายเหตุที่ยังไม่ได้ชำระจะถูกล้าง</p><template #footer><Button variant="secondary" @click="answerClear(false)">เก็บออเดอร์ไว้</Button><Button variant="danger" @click="answerClear(true)">ล้างตะกร้า</Button></template></DialogFrame>
</template>

<script setup>
import {ref,shallowRef,computed,watch,onMounted,onUnmounted,toRaw,reactive} from 'vue'
import Button from '@/components/ui/Button.vue'
import CloudProductShell from './CloudProductShell.vue'
import PosCatalog from '@/components/pos/PosCatalog.vue'
import CartPanel from '@/components/pos/CartPanel.vue'
import CartReviewBar from '@/components/pos/CartReviewBar.vue'
import {useCartPageFocus} from '@/composables/useCartPageFocus'
import DialogFrame from '@/components/ui/DialogFrame.vue'
import AppQuantityInput from '@/components/ui/AppQuantityInput.vue'
import AppInput from '@/components/ui/AppInput.vue'
import CloudStockWorkspace from './CloudStockWorkspace.vue'
import CloudDashboardWorkspace from './CloudDashboardWorkspace.vue'
import SettingsView from '@/views/SettingsView.vue'
import PackageReviewModal from '@/components/modals/PackageReviewModal.vue'
import {projectCloudPackages,cloudPackageOperands} from './packagePresentation.js'
import {PACKAGE_ADJUSTMENT_REASONS} from '@/domain/packageReasons.js'
import {loadInventoryHistory} from './inventoryHistory.js'
import {getFirebaseClient} from '../firebaseClient.js'
import {createShopAccess} from '../shopAccess.js'
import {shopRole,roleTabs,canOperate} from '../roles.js'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import ReceiptModal from '@/components/modals/ReceiptModal.vue'
import {Check,Plus} from 'lucide-vue-next'
import {useElementWidth} from '@/composables/useElementWidth'
import {projectMenus,projectCart,optionCents,projectReceipt} from './productPresentation.js'
import {createCoreWorkspace} from './workspace.js'
import {commandErrorMessage} from './commandErrors.js'
import {maxSaleLines} from './model/limits.js'
const props=defineProps({connection:{type:Object,required:true},state:{type:Object,required:true}})
const role=computed(()=>shopRole(props.state.shop,props.state.user?.email)),operator=computed(()=>canOperate(role.value))
const invitations=ref([]),presentUsers=ref([]),presenceClock=ref(Date.now())
let shopAccess=null,presenceTimer=null
const activeUsers=computed(()=>{
 if(!props.state.serverReady||!online.value)return []
 const self=props.state.user,others=props.state.serverReady?presentUsers.value.filter(user=>user.uid!==self?.uid&&user.email&&user.lastSeen?.toMillis?.()>presenceClock.value-120000&&props.state.shop?.allowedEmails?.[user.email]):[]
 return [...(self?.email?[self]:[]),...others.sort((a,b)=>a.email.localeCompare(b.email))].map(user=>({...user,role:shopRole(props.state.shop,user.email)}))
})
function updatePresence(){presenceClock.value=Date.now();if(online.value&&props.state.serverReady&&document.visibilityState==='visible')void shopAccess?.heartbeat()}
defineEmits(['sign-out'])
const activeAction=ref(''),reloading=ref(false)
const pendingCause=ref('')
const pendingLabel=computed(()=>({sale:'บันทึกยอดขาย',cancel:'คืนบิล',inventory:'รับเข้าสต็อก',produce:'ผลิตตามสูตร',stock_count:'ตรวจนับสต็อก',menu:'บันทึกเมนู',addon:'บันทึก Add-on',group:'บันทึกกลุ่มตัวเลือก',material_archive:'จัดเก็บวัตถุดิบ',material_delete:'ลบวัตถุดิบ',material_metadata:'แก้ข้อมูลวัตถุดิบ'}[pendingCommand.value?.kind]||'บันทึกข้อมูลร้าน'))
const data=shallowRef(null),loading=ref(false),busy=ref(false),online=ref(navigator.onLine),error=ref(''),message=ref(''),tab=ref(operator.value?'sale':'dashboard'),pendingCommand=ref(null),storageReady=ref(true),initialized=ref(false)
const packageAdjustments=ref([]),packageReviewState=reactive({isOpen:false})
const cart=ref([]),platformId=ref(''),selectedMenu=ref(''),choices=ref({}),quantity=ref(1),lineNote=ref(''),approveShortage=ref(false),cancelId=ref(''),legacyOrders=ref([])
const legacyLookup=ref(''),legacySources=new Map()
const localUrl=`${import.meta.env.BASE_URL}local.html`
let service,storageKey,deviceId,disposed=false,refreshAgain=false,storedCommand=null,cartCommandId=null
try{
 deviceId=localStorage.getItem('gy-cloud-device-v1')||crypto.randomUUID();localStorage.setItem('gy-cloud-device-v1',deviceId)
 storageKey=JSON.stringify(['gy-core-cart-v1',props.connection.config.projectId,props.connection.shopId,props.state.shop.generation,props.state.user.uid])
 const saved=JSON.parse(sessionStorage.getItem(storageKey)||'null')
 if(saved){cart.value=saved.cart||[];packageAdjustments.value=saved.packageAdjustments||[];platformId.value=saved.platformId||'';storedCommand=saved.command||null;pendingCommand.value=storedCommand;pendingCause.value=saved.causeCode||'';cartCommandId=saved.cartCommandId||null}
}catch{storageReady.value=false;error.value='เก็บตะกร้าบนเครื่องไม่ได้ กรุณาอนุญาตพื้นที่จัดเก็บแล้วเปิดหน้านี้ใหม่'}
const context=()=>({projectId:props.connection.config.projectId,shopId:props.connection.shopId,generation:props.state.shop?.generation,uid:props.state.user?.uid,deviceId,online:online.value,ready:props.state.serverReady===true,protocolCertified:true,role:role.value})
const ready=computed(()=>initialized.value&&storageReady.value&&online.value&&props.state.serverReady===true&&!!data.value)
const locked=computed(()=>!operator.value||busy.value||!!pendingCommand.value||!storageReady.value)
const saleLimit=computed(()=>data.value?maxSaleLines(data.value.shop):0)
const menus=computed(()=>Object.values(data.value?.shop.catalog.menus||{}).filter(m=>m.active))
const platformIds=computed(()=>data.value?.shop.catalog.platformIds.filter(id=>data.value.shop.catalog.platforms[id].active)||[])
const menu=computed(()=>data.value?.shop.catalog.menus[selectedMenu.value])
const menuGroups=computed(()=>{const m=menu.value,c=data.value?.shop.catalog;if(!m)return [];if(m.groupIds?.length)return m.groupIds.map(id=>c.groups[id]);if(m.groupId)return [c.groups[m.groupId]];return m.optionIds?.length?[{...m,id:'legacy',name:'ท็อปปิ้ง',allowRepeat:false}]:[]})
const sourceDate=computed(()=>String(data.value?.display.sourceDate||'ไม่ระบุวันที่').slice(0,10))
const previewResult=computed(()=>{try{if(!cart.value.length||!data.value)return {};return {order:service.previewSale({platformId:platformId.value,lines:plain(cart.value),packages:cloudPackageOperands(data.value,cart.value,packageAdjustments.value)})}}catch(e){return {error:explain(e)}}})
const preview=computed(()=>previewResult.value.order),previewError=computed(()=>previewResult.value.error)
const shortages=computed(()=>Object.entries(preview.value?.approvedShortages||{}).filter(([,q])=>q>0))
const canCheckout=computed(()=>ready.value&&!locked.value&&!!preview.value&&(!shortages.value.length||approveShortage.value))
const money=c=>new Intl.NumberFormat('th-TH',{style:'currency',currency:'THB'}).format((c||0)/100)
const amount=q=>new Intl.NumberFormat('th-TH',{maximumFractionDigits:2}).format(q/100)
const plain=v=>JSON.parse(JSON.stringify(toRaw(v)))

const saleRoot=ref(null),saleWidth=useElementWidth(saleRoot),split=computed(()=>saleWidth.value>=696)
const cartOpen=ref(false),searchQuery=ref(''),lineError=ref(''),clearConfirm=ref(false),receiptState=reactive({isOpen:false,order:null})
useCartPageFocus(saleRoot,split,cartOpen)
let clearAnswer
const productMenus=computed(()=>projectMenus(data.value))
const productPlatforms=computed(()=>platformIds.value.map(id=>({id,name:name('platforms',id),isActive:true,gpPercent:(data.value.shop.catalog.platforms[id].gpBasisPoints||0)/100})))
const filteredMenus=computed(()=>productMenus.value.filter(m=>m.name.toLowerCase().includes(searchQuery.value.trim().toLowerCase())))
const cartQuantity=computed(()=>cart.value.reduce((n,l)=>n+l.qty,0)),cartQuantities=computed(()=>cart.value.reduce((r,l)=>({...r,[l.menuId]:(r[l.menuId]||0)+l.qty}),{}))
const pageTitle=computed(()=>({dashboard:'ภาพรวม & งบต้นทุน',sale:'แคชเชียร์ (POS)',stock:'คลังวัตถุดิบ & Package',menu:'จัดการเมนู',addon:'จัดการ Add-on',orders:'บิลขาย & คืนบิล',settings:'ตั้งค่าร้าน'})[tab.value]||'Yoggie')
const productModel=reactive({cloud:true,modals:{receipt:receiptState,packageReview:packageReviewState},get role(){return role.value},get availableTabs(){return roleTabs(role.value)},get menus(){return inventoryWorkspace.value?.model.menus||projectMenus(data.value)},get addons(){return inventoryWorkspace.value?.model.addons||[]},get lowStockMaterials(){return inventoryWorkspace.value?.model.lowStockMaterials||[]},get totalInventoryValuation(){return inventoryWorkspace.value?.model.totalInventoryValuation||0},get projectedInventoryValuation(){return inventoryWorkspace.value?.model.projectedInventoryValuation||0},get draftInventoryValuationDiff(){return inventoryWorkspace.value?.model.draftInventoryValuationDiff||0},get currentTab(){return tab.value==='sale'?'pos':tab.value},get connected(){return ready.value},get account(){return props.state.user?.email||''},switchTab:navigate,get cart(){return projectCart(cart.value,data.value)},get currentPlatformId(){return platformId.value},get currentPlatform(){return productPlatforms.value.find(p=>p.id===platformId.value)},get checkoutDisabled(){return !canCheckout.value},get cartSummary(){const p=preview.value||{},subtotal=(p.subtotalCents||0)/100;return {subtotal,gpPercent:(data.value?.shop.catalog.platforms[platformId.value]?.gpBasisPoints||0)/100,gpAmount:(p.gpCents||0)/100,netRevenue:(p.netCents??p.subtotalCents??0)/100,totalIngredientCost:(p.ingredientCostCents||0)/100,totalPackagingCost:(p.packagingCostCents||0)/100,totalFoodCost:((p.ingredientCostCents||0)+(p.packagingCostCents||0))/100,grossProfit:(p.grossProfitCents||0)/100}},get materials(){return data.value?.materials.map(m=>({...m,isDeleted:m.deleted}))||[]},get packageLocked(){return locked.value||!ready.value},get packageAdjustments(){return packageAdjustments.value},get cartPackagePlan(){return projectCloudPackages(data.value,cart.value,packageAdjustments.value)},savePackageAdjustment,resetPackageAdjustment(id){if(!locked.value)packageAdjustments.value=packageAdjustments.value.filter(a=>a.materialId!==id)},resetPackageAdjustments(){if(!locked.value)packageAdjustments.value=[]},updateCartQty,removeFromCart(index){if(!locked.value)cart.value.splice(index,1)},clearCart(){if(!locked.value){cart.value=[];packageAdjustments.value=[]}},confirmDialog(){return new Promise(resolve=>{clearAnswer=resolve;clearConfirm.value=true})}})
Object.defineProperty(productModel,'activeUsers',{get:()=>activeUsers.value})
const settingsModel=reactive({cloud:true,
 get allowedEmails(){return props.state.shop?.allowedEmails||{}},
 get invitations(){return invitations.value},
 get userRoles(){return props.state.shop?.userRoles||{}},
 saveAllowedEmails(emails,expected,roles,baselineRoles){if(role.value!=='admin'||!ready.value||locked.value||!shopAccess)throw new Error('NOT_READY');return shopAccess.save(emails,expected,roles,baselineRoles)},
 exportCloudBackup:()=>service.backup(),
 get platforms(){const c=data.value?.shop.catalog;return c?c.platformIds.map(id=>({id,name:name('platforms',id),gpPercent:c.platforms[id].gpBasisPoints/100})):[]},
 get revision(){return data.value?.shop.revision},get connected(){return ready.value},get settingsBlocked(){return role.value!=='admin'||!ready.value||locked.value},
 get projectId(){return props.connection.config.projectId},get shopId(){return props.connection.shopId},get account(){return props.state.user?.email||''},
 get materials(){return data.value?.materials||[]},get menus(){return productMenus.value},get addons(){return inventoryWorkspace.value?.model.addons||[]},get orders(){return data.value?.orders||[]},
 async savePlatformGpRates(draft,expectedRevision){
  if(role.value!=='admin'||!ready.value||locked.value)return {ok:false}
  const rates={}
  for(const [id,value] of Object.entries(draft)){
   const n=Number(value)*100,rounded=Math.round(n)
   if(!Number.isFinite(n)||Math.abs(n-rounded)>0.000001||rounded<0||rounded>=10000)return {ok:false,message:'GP ต้องอยู่ระหว่าง 0 ถึง 99.99% และมีทศนิยมไม่เกิน 2 ตำแหน่ง'}
   rates[id]=rounded
  }
  const result=await send({kind:'platform_gp',opId:crypto.randomUUID(),payload:{rates,expectedRevision}})
  return result.value?.rejected?{ok:false,message:'ข้อมูลร้านเปลี่ยนแล้ว กรุณาโหลดค่าปัจจุบันและตรวจ GP ใหม่'}:result
 }
})
function savePackageAdjustment(input){
 if(locked.value||!ready.value)return {ok:false,message:'กรุณารอการเชื่อมต่อหรือคำสั่งค้างก่อนปรับ Package'}
 const m=data.value.materials.find(m=>m.id===input.materialId),qty=Number(input.requestedQty),note=String(input.note||'').trim()
 if(!m||m.deleted||m.inventoryType!=='packaging'||!Number.isFinite(qty)||qty<0||Math.abs(qty*100-Math.round(qty*100))>0.000001||!PACKAGE_ADJUSTMENT_REASONS.includes(input.reason)||input.reason==='other'&&!note||note.length>1000)return {ok:false,message:'ตรวจจำนวน Package เหตุผล และหมายเหตุให้ถูกต้อง'}
 const baseline=projectCloudPackages(data.value,cart.value).items.find(r=>r.materialId===m.id)?.baselineQty||0
 const next=packageAdjustments.value.filter(a=>a.materialId!==m.id).concat({materialId:m.id,deltaQty:Math.round((qty-baseline)*100)/100,reason:input.reason,note})
 try{service.previewSale({platformId:platformId.value,lines:plain(cart.value),packages:cloudPackageOperands(data.value,cart.value,next)});packageAdjustments.value=next;return {ok:true}}catch(e){return {ok:false,message:explain(e)}}
}
function answerClear(value){clearConfirm.value=false;clearAnswer?.(value);clearAnswer=null}
function updateCartQty(index,qty){if(locked.value)return;try{const next=plain(cart.value);next[index].qty=qty;service.previewSale({platformId:platformId.value,lines:next});cart.value=next}catch(e){error.value=explain(e)}}
function setPlatform(id){if(!locked.value)platformId.value=id}
function groupCount(g){return Object.values(choices.value[g.id]||{}).reduce((n,q)=>n+Number(q),0)}
function toggleChoice(g,id){if(!locked.value)choices.value[g.id][id]=choices.value[g.id][id]?0:1}
function menuUnavailable(m){try{const c=data.value.shop.catalog.menus[m.id];if(c.groupId||c.groupIds?.length)return false;return Object.values(service.previewSale({platformId:platformId.value,lines:[{menuId:m.id,qty:1,optionIds:[]}]}).approvedShortages||{}).some(q=>q>0)}catch{return false}}
function navigate(id){const target=id==='sale'?'pos':id;if(!roleTabs(role.value).includes(target)&&!(target==='orders'&&operator.value))return;tab.value=target==='pos'?'sale':target}
const inventoryWorkspace=ref(null),reportVisited=ref(!operator.value),settingsVisited=ref(false),reportRefreshKey=ref(0)
async function readStockHistory(options={}){const {db}=getFirebaseClient({mode:props.connection.mode,config:props.connection.config});return loadInventoryHistory({db,shopId:props.connection.shopId,generation:props.state.shop.generation,materials:data.value.materials,display:data.value.display,clearedThroughRevision:Math.max(data.value.shop.inventoryHistoryCutoff||0,options.clearedThroughRevision||0)})}
watch(split,value=>{if(value)cartOpen.value=false})

function material(id){return data.value?.materials.find(m=>m.id===id)}
function materialName(id){return material(id)?.name||id}
function name(kind,id){return data.value?.display[kind]?.[id]?.name||id}
function orderDate(o){return o.createdAt?.toDate?o.createdAt.toDate().toLocaleString('th-TH'):''}
function optionPrice(g,id){const cents=optionCents(data.value,menu.value,g.id==='legacy'?null:g,id,platformId.value);return cents===0?'รวมในราคา':`+${money(cents)}`}
function selectMenu(id){if(locked.value)return;selectedMenu.value=id;quantity.value=1;lineNote.value='';lineError.value='';choices.value=Object.fromEntries(menuGroups.value.map(g=>[g.id,Object.fromEntries(g.optionIds.map(id=>[id,0]))]))}
function lineDescription(l){return l.selections?l.selections.map(s=>`${name('addons',s.id)} × ${s.selectionQty}`).join(', '):(l.optionIds||[]).map(id=>name('addons',id)).join(', ')}
function save(){try{sessionStorage.setItem(storageKey,JSON.stringify({cart:cart.value,packageAdjustments:packageAdjustments.value,platformId:platformId.value,command:pendingCommand.value,causeCode:pendingCause.value,cartCommandId}));storageReady.value=true;return true}catch{storageReady.value=false;error.value='เก็บตะกร้าไม่ได้ กรุณาเปิดพื้นที่จัดเก็บก่อนบันทึก';return false}}
function addLine(){
 if(locked.value||!menu.value||cart.value.length>=saleLimit.value)return
 try{
 const line={menuId:menu.value.id,qty:quantity.value,note:lineNote.value}
 if(menu.value.groupIds?.length)line.selections=menuGroups.value.flatMap(g=>g.optionIds.filter(id=>choices.value[g.id][id]>0).map(id=>({groupId:g.id,id,selectionQty:choices.value[g.id][id]})))
 else line.optionIds=menuGroups.value.flatMap(g=>g.optionIds.flatMap(id=>{const q=choices.value[g.id][id]||0;if(!Number.isSafeInteger(q)||q<0||q>(g.allowRepeat?g.max:1))throw new Error('Invalid selection');return Array(q).fill(id)}))
 service.previewSale({platformId:platformId.value,lines:[...plain(cart.value),line]});cart.value.push(line);error.value='';lineError.value='';message.value='';selectedMenu.value='';if(!split.value)cartOpen.value=true}catch(e){lineError.value=explain(e)}
}
function explain(e){const known=commandErrorMessage(e);if(known)return known;const code=e?.code||e?.message||'';if(code==='OFFLINE'||code==='NOT_READY')return 'ยังไม่เชื่อมต่อเซิร์ฟเวอร์ กรุณาเชื่อมต่อแล้วลองใหม่';if(code==='SALE_MATERIAL_LIMIT')return 'บิลนี้ใช้วัตถุดิบรวมเกิน 16 รายการ กรุณาแบ่งเป็นหลายบิล';if(code==='RECIPE_MATERIAL_LIMIT')return 'หนึ่งสูตรใช้วัตถุดิบได้ไม่เกิน 16 รายการ';if(code==='PREPARATION_LIMIT')return 'มีคำสั่งค้างหลายรายการ กรุณาตรวจและจัดการคำสั่งค้างก่อนลองใหม่';if(code==='SHORTAGE_REVIEW_REQUIRED')return 'สต็อกเปลี่ยนไป กรุณาตรวจจำนวนที่ขาดใหม่';if(code.includes('Production input unavailable'))return 'วัตถุดิบผลิตไม่พอหรือหมดอายุ กรุณารับเข้าวัตถุดิบก่อนผลิต';if(code.includes('Invalid line')||code.includes('selection'))return 'กรุณาเลือกท็อปปิ้งให้ครบตามจำนวนและตรวจจำนวนสินค้า';if(code.includes('allocation'))return 'วัตถุดิบหมดอายุหรือจัดสรรล็อตไม่ได้ กรุณาตรวจสต็อก';if(code==='LOCAL_JOURNAL_FAILED')return 'เก็บคำสั่งบนเครื่องไม่ได้ กรุณาอนุญาตพื้นที่จัดเก็บแล้วลองใหม่';return 'บันทึกไม่ได้ กรุณาตรวจจำนวน ราคา วันที่ และสต็อก แล้วโหลดข้อมูลล่าสุดอีกครั้ง'}
let refreshTask=null
function refresh(){
 if(!service||disposed)return Promise.resolve()
 if(refreshTask){refreshAgain=true;return refreshTask}
 loading.value=true
 refreshTask=(async()=>{
  do {
   refreshAgain=false
   try{const result=await service.load();if(disposed)return;data.value=result;if(!platformId.value)platformId.value=platformIds.value[0]||'';error.value=''}catch(e){if(!disposed)error.value=explain(e)}
  }while(refreshAgain&&!disposed)
 })().finally(()=>{loading.value=false;refreshTask=null})
 return refreshTask
}

async function updatePending(){const p=await service.pending();if(disposed)return;if(p.length)pendingCommand.value=p[0].envelope;else if(!storedCommand)pendingCommand.value=null;save()}
async function recoverPending(){
 if(busy.value||!service||!online.value||!props.state.serverReady)return
 try{
  await updatePending();if(disposed)return;initialized.value=true
  if(!pendingCommand.value&&inventoryWorkspace.value?.model.unresolvedDraftCommand){pendingCommand.value=plain(inventoryWorkspace.value.model.unresolvedDraftCommand);storedCommand=pendingCommand.value;save()}
  if(pendingCommand.value){
   const result=service.recover?await service.recover(plain(pendingCommand.value)):await service.reconcile()
   if(disposed)return
   if(result.ok&&result.value)finish(result.value)
   else if(result.causeCode){pendingCause.value=result.causeCode;save()}
  }
 }catch(e){if(!disposed)error.value=explain(e)}
}
async function send(command,action=command.kind){
 if(!operator.value||command.kind==='platform_gp'&&role.value!=='admin')return {ok:false,code:'ACCESS_DENIED',outcome:'blocked'}
 if(busy.value||!ready.value)return {ok:false,code:'NOT_READY',outcome:'blocked'}
 let refreshed=false
 const previous=storedCommand
 busy.value=true;activeAction.value=action;error.value='';pendingCommand.value=plain(command);storedCommand=pendingCommand.value
 if(!save()){pendingCommand.value=previous;storedCommand=previous;busy.value=false;activeAction.value='';return {ok:false,code:'LOCAL_JOURNAL_FAILED',outcome:previous?'uncertain':'blocked'}}
 try{
  let result=await service.execute(plain(command));if(disposed)return {ok:false}
  if(!result.ok&&result.outcome==='prepared'&&service.discardUnsent){const closed=await service.discardUnsent(plain(command));if(closed.ok)result=closed.value?.rejected&&closed.value.code==='NOT_SUBMITTED'?{...result,outcome:'not_submitted'}:closed}
  if(!result.ok&&command.payload.expectedRevision!==undefined&&result.outcome!=='not_submitted'&&service.rejectStaleInventory){const resolved=await service.rejectStaleInventory();if(resolved.ok&&resolved.value)result=resolved}
  if(result.ok){await reloadAfterWrite();refreshed=true;if(!disposed)finish(result.value)}
  else if(result.outcome==='not_submitted'||result.outcome==='blocked'&&!previous){
   pendingCommand.value=null;storedCommand=null;pendingCause.value='';message.value='ยังไม่ได้ส่งข้อมูล เก็บตะกร้าหรือแบบร่างไว้แล้ว';error.value=explain(result);save();await updatePending()
  }else{
   pendingCause.value=result.causeCode||result.code;message.value='ยังไม่ทราบผลการบันทึก กรุณาตรวจผลและลองคำสั่งเดิมต่อ';error.value=result.code==='PENDING_RESULT'?'':explain(result);save()
  }
  return result
 }catch(e){if(!disposed){pendingCause.value=e.code||e.message;message.value='ยังไม่ทราบผลการบันทึก';error.value=explain(e);save()}return {ok:false,code:'PENDING_RESULT',outcome:'uncertain'}}
 finally{try{if(!disposed&&!refreshed)await reloadEverything()}finally{busy.value=false;activeAction.value=''}}
}
function finish(value){
 pendingCause.value=''
 inventoryWorkspace.value?.acknowledge(value)
 if(value.kind==='cancel'){const orderId=value.result?.orderId;const old=data.value?.orders.find(o=>o.opId===orderId),sourceId=old?.sourceLegacyId||legacySources.get(orderId);if(sourceId){const row=legacyOrders.value.find(o=>o.orderId===sourceId);if(row)row.status='cancelled';legacySources.delete(orderId)}}
 if(value.rejected){pendingCommand.value=null;storedCommand=null;save();message.value='';error.value=value.code==='NOT_SUBMITTED'?'รายการนี้ยังไม่ได้ส่ง สามารถตรวจและบันทึกแบบร่างใหม่ได้':'หยุดรายการที่ยังไม่สำเร็จแล้ว กรุณาตรวจแบบร่างกับยอดล่าสุดก่อนบันทึก';return}
  if(value.kind==='sale'&&!value.abandoned&&value.opId===cartCommandId){cart.value=[];packageAdjustments.value=[];packageReviewState.isOpen=false;cartOpen.value=false;receiptState.order=projectReceipt({...value.result,opId:value.opId},data.value);receiptState.isOpen=true}
 cancelId.value='';pendingCommand.value=null;storedCommand=null;cartCommandId=null;approveShortage.value=false;save();message.value=value.abandoned?'หยุดบิลแล้ว ตะกร้ายังอยู่':'บันทึกสำเร็จ · ยืนยันจากเซิร์ฟเวอร์แล้ว'
}
function checkout(){if(!canCheckout.value)return;cartCommandId=crypto.randomUUID();void send({opId:cartCommandId,kind:'sale',payload:{platformId:platformId.value,lines:plain(cart.value),packages:cloudPackageOperands(data.value,cart.value,packageAdjustments.value),subtotalCents:preview.value.subtotalCents,approvedShortages:Object.fromEntries(shortages.value)}})}
async function retry(){if(!pendingCommand.value)return;await send(plain(pendingCommand.value),'retry')}
async function stopPending(){
 if(!operator.value||busy.value||!ready.value||!service.stop)return
 busy.value=true;activeAction.value='stop'
 try{const r=await service.stop(plain(pendingCommand.value));await reloadAfterWrite();if(!disposed){if(r.ok)finish(r.value);else{pendingCause.value=r.causeCode||r.code;error.value=explain(r);save()}}}catch(e){if(!disposed)error.value=explain(e)}finally{busy.value=false;activeAction.value=''}
}
async function abandon(){
 if(!operator.value||busy.value||!ready.value)return
 busy.value=true;activeAction.value='abandon'
 try{const r=await service.abandon(plain(pendingCommand.value));await reloadAfterWrite();if(!disposed){if(r.ok)finish(r.value);else error.value=explain(r)}}catch(e){if(!disposed)error.value=explain(e)}finally{busy.value=false;activeAction.value=''}
}

function cancelOrder(orderId){if(!locked.value&&ready.value)void send({opId:crypto.randomUUID(),kind:'cancel',payload:{orderId}})}
async function reviewLegacy(order){
 if(locked.value||!ready.value||legacyLookup.value)return
 legacyLookup.value=order.orderId
 try{const receipt=await service.legacyReceipt(order.orderId);if(disposed)return;if(receipt.status==='cancelled'){order.status='cancelled';message.value='บิลนี้คืนแล้ว';return}legacySources.set(receipt.opId,receipt.sourceLegacyId);data.value={...data.value,orders:[receipt,...data.value.orders.filter(o=>o.opId!==receipt.opId)]};cancelId.value=receipt.opId}
 catch(e){error.value=e.message==='LEGACY_MIGRATION_REQUIRED'?'บิลนี้ยังไม่ผ่านการแปลงหลักฐานล็อต กรุณาใช้เครื่องมือเจ้าของก่อนคืนบิล':explain(e)}finally{legacyLookup.value=''}
}
async function loadHistory(e){if(e.target.open&&!legacyOrders.value.length)try{legacyOrders.value=(await service.history()).filter(o=>!data.value.orders.some(n=>n.sourceLegacyId===o.orderId))}catch{error.value='โหลดประวัติเดิมไม่ได้ กรุณาเชื่อมต่อแล้วลองใหม่'}}
let ordersTask=null,reloadTask=null
function loadOrders(){
 if(ordersTask)return ordersTask
 ordersTask=(async()=>{try{const orders=await service.orders();if(!disposed&&data.value)data.value={...data.value,orders}}catch{if(!disposed)error.value='โหลดบิลไม่ได้ กรุณาเชื่อมต่อแล้วกดโหลดข้อมูลล่าสุด'}})().finally(()=>{ordersTask=null})
 return ordersTask
}
function reloadEverything(){
 if(reloadTask)return reloadTask
 reloading.value=true
 reloadTask=(async()=>{if(!storageReady.value)save();await refresh();await recoverPending();if(tab.value==='dashboard')reportRefreshKey.value++;if(tab.value==='orders'&&!disposed)await loadOrders()})().finally(()=>{reloading.value=false;reloadTask=null})
 return reloadTask
}

async function reloadAfterWrite(){
 // A read started before the receipt is not proof of the updated inventory.
 if(reloadTask)await reloadTask
 if(ordersTask)await ordersTask
 await reloadEverything()
}

const connectivity=()=>{online.value=navigator.onLine;updatePresence();if(online.value&&props.state.serverReady)void reloadEverything()}
watch([cart,platformId,packageAdjustments],()=>{approveShortage.value=false;if(storageKey)save()},{deep:true})
watch(()=>JSON.stringify(shortages.value),()=>{approveShortage.value=false})
watch(role,()=>{shopAccess?.watchInvitations();const current=tab.value==='sale'?'pos':tab.value;if(!roleTabs(role.value).includes(current)&&!(current==='orders'&&operator.value))tab.value='dashboard';if(!operator.value){selectedMenu.value='';cancelId.value='';cartOpen.value=false;packageReviewState.isOpen=false;reportVisited.value=true}})
watch(tab,value=>{if(value==='orders')void loadOrders();if(value==='dashboard')reportVisited.value=true;if(value==='settings')settingsVisited.value=true})
watch(()=>data.value?.shop.catalogRevision,(revision,previous)=>{
 if(previous===undefined||revision===previous)return
 approveShortage.value=false
 message.value='ข้อมูลเมนู ราคา หรือสูตรเปลี่ยนแล้ว กรุณาตรวจตะกร้าและตัวเลือกก่อนยืนยันอีกครั้ง'
 if(selectedMenu.value){
  if(!menu.value?.active){selectedMenu.value='';return}
  choices.value=Object.fromEntries(menuGroups.value.map(g=>[g.id,Object.fromEntries(g.optionIds.map(id=>[id,0]))]))
  lineError.value='ข้อมูลเมนูเปลี่ยนแล้ว กรุณาเลือกตัวเลือกใหม่ก่อนเพิ่มลงตะกร้า'
 }
},{flush:'sync'})
watch(()=>props.state.shop?.revision,()=>{if(props.state.serverReady)void refresh()})
watch(()=>props.state.serverReady,value=>{if(value){updatePresence();void reloadEverything()}})
onMounted(async()=>{
 window.addEventListener('online',connectivity);window.addEventListener('offline',connectivity)
 if(props.state.user?.email){
  const {db}=getFirebaseClient({mode:props.connection.mode,config:props.connection.config})
  shopAccess=createShopAccess({db,shopId:props.connection.shopId,getUser:()=>props.state.user,getShop:()=>props.state.shop,onInvitations:rows=>{invitations.value=rows},onPresence:users=>{presentUsers.value=users}})
  shopAccess.watch();shopAccess.watchInvitations();updatePresence();presenceTimer=setInterval(updatePresence,60000);document.addEventListener('visibilitychange',updatePresence)
 }
 try{service=createCoreWorkspace({connection:props.connection,getContext:context});await refresh();if(disposed)return;await recoverPending()}catch(e){error.value=explain(e)}
})
onUnmounted(()=>{disposed=true;answerClear(false);window.removeEventListener('online',connectivity);window.removeEventListener('offline',connectivity);document.removeEventListener('visibilitychange',updatePresence);clearInterval(presenceTimer);shopAccess?.close();void service?.close()})
</script>


<style scoped src="./productWorkspace.css"></style>
<style scoped src="@/components/pos/productSelection.css"></style>
<style scoped src="@/components/inventory/stockForms.css"></style>
