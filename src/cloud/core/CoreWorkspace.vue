<template>
 <CloudProductShell :model="productModel" :items="navigation" :title="pageTitle" :busy="busy" :online="online" @reload="reloadEverything" @sign-out="$emit('sign-out')">
  <p v-if="data?.display.trial" class="trial-banner"><strong>ข้อมูลทดสอบ — ยังไม่ใช่ยอดร้านปัจจุบัน</strong><br>จากไฟล์สำรอง {{ sourceDate }} · <a :href="localUrl">เปิดระบบเดิม</a></p>
  <p v-if="!state.serverReady||!online" class="connection-warning" role="status">ขาดการเชื่อมต่อ · เก็บตะกร้าไว้แล้ว กรุณาเชื่อมต่อก่อนบันทึก</p>
  <p v-if="message" class="notice" role="status" aria-live="polite">{{ message }}</p>
  <p v-if="error" class="error" role="alert">{{ error }}</p>
  <section v-if="pendingCommand" class="pending-panel" aria-label="รายการรอตรวจผล"><h3>ยังไม่ทราบผลการบันทึก</h3><p>เก็บคำสั่งเดิมไว้แล้ว ตรวจผลก่อนเริ่มรายการใหม่ เพื่อไม่สร้างบิลซ้ำ</p><Button data-retry-command :disabled="!ready" :loading="busy" @click="retry">ตรวจผลและลองต่อ</Button><Button v-if="pendingCommand.kind==='sale'" variant="secondary" :disabled="!ready||busy" @click="abandon">หยุดบิลที่ยังไม่สำเร็จและเก็บตะกร้า</Button></section>
  <p v-if="!data" class="loading-copy">{{ loading ? 'กำลังโหลดข้อมูลร้านจากเซิร์ฟเวอร์…' : 'ยังโหลดข้อมูลร้านไม่ได้ กดโหลดข้อมูลล่าสุดเพื่อลองใหม่' }}</p>
  <template v-else>
   <section v-show="tab==='sale'" ref="saleRoot" class="pos-workspace" :class="{'is-split':split}" aria-label="ขายสินค้า">
    <PosCatalog :menus="filteredMenus" :platforms="productPlatforms" :platform-id="platformId" :cart-quantities="cartQuantities" v-model:search="searchQuery" :disabled="locked" :price-for="m=>m.prices[platformId]||0" :unavailable-for="menuUnavailable" @platform="setPlatform" @select-menu="selectMenu"/>
    <CartPanel :model="productModel" :presentation="split?'panel':'sheet'" :open="cartOpen" :checkout-pending="busy" :disabled="locked" @request-close="cartOpen=false" @checkout="checkout">
     <template #review>
      <div class="cart-cloud-review">
       <p>หนึ่งบิลได้สูงสุด {{ saleLimit }} รายการ · จำนวนเมนูเดียวกันรวมเป็นรายการเดียวได้</p>
       <section v-if="shortages.length" class="shortage"><h3>สต็อกไม่พอ</h3><p v-for="[id,q] in shortages" :key="id">{{ materialName(id) }} ขาด {{ amount(q) }} {{ material(id)?.unit }}</p><label><input v-model="approveShortage" type="checkbox" :disabled="locked"> ยืนยันขายตามจำนวนที่ขาดข้างต้น</label></section>
       <p v-if="previewError" class="error" role="alert">{{ previewError }}</p>
       <div v-if="pendingCommand"><strong>ยังไม่ทราบผลการบันทึก</strong><p>ตรวจผลด้วยคำสั่งเดิมก่อนเริ่มบิลใหม่</p><Button :disabled="!ready||busy" @click="retry">ตรวจผลและลองต่อ</Button><Button v-if="pendingCommand.kind==='sale'" variant="quiet" :disabled="!ready||busy" @click="abandon">หยุดบิลและเก็บตะกร้า</Button></div>
       <p>ยืนยันจากเซิร์ฟเวอร์ก่อนถือว่าขายสำเร็จ · บรรจุภัณฑ์ตัดตามสูตรที่บันทึกไว้</p>
      </div>
     </template>
    </CartPanel>
    <CartReviewBar v-if="!split" :quantity="cartQuantity" :subtotal="(preview?.subtotalCents||0)/100" :open="cartOpen" @open="cartOpen=true"/>
   </section>
   <CloudStockWorkspace ref="inventoryWorkspace" v-show="tab==='stock'||tab==='produce'" :data="data" :service="service" :execute="send" :ready="ready" :blocked="locked" :storage-key="`gy-inventory-drafts-v1:${storageKey}`" :read-history="readStockHistory"/>
   <section v-if="tab==='orders'" aria-label="ประวัติบิล"><div class="section-heading"><div><h3>บิลขายและคืนบิล</h3><p>100 บิลล่าสุดจาก Firebase · คืนสต็อกตามล็อตเดิมเมื่อคืนบิล</p></div></div><p v-if="!data.orders.length" class="empty-orders">ยังไม่มีบิลจาก Firebase</p><ol class="order-list"><li v-for="o in data.orders" :key="o.opId"><div><StatusBadge :label="o.status==='cancelled'?'คืนบิลแล้ว':'ขายสำเร็จ'" :tone="o.status==='cancelled'?'neutral':'success'"/><strong>{{ money(o.subtotalCents) }}</strong><p>{{ orderDate(o) }} · {{ name('platforms',o.platformId) }}</p><p>{{ o.lines.map(l=>`${name('menus',l.menuId)} × ${l.qty}`).join(', ') }}</p><small>{{ o.opId }}</small></div><Button v-if="o.status==='committed'" variant="secondary" :disabled="locked||!ready" @click="cancelId=o.opId">คืนบิล</Button></li></ol><details @toggle="loadHistory"><summary>ประวัติบิลจากระบบเดิม (อ่านอย่างเดียว)</summary><p class="muted">ใช้ตรวจย้อนหลัง การคืนบิลรองรับเฉพาะบิลที่ขายผ่าน Firebase</p><p v-for="(o,i) in legacyOrders" :key="i">{{ o.createdAt }} · {{ o.platformName }} · {{ money(Math.round((o.subtotal||0)*100)) }} · {{ o.status||'ประวัติเดิม' }}</p></details></section>
  </template>
 </CloudProductShell>
 <ReceiptModal :model="productModel" teleport/>
 <DialogFrame :open="!!menu" id="cloud-custom-order" title="รายละเอียดสินค้า" presentation="drawer" width="520px" :busy="busy" @request-close="selectedMenu=''">
  <form v-if="menu" id="cloud-line-form" class="line-form" @submit.prevent="addLine">
   <div class="product-detail"><div class="product-visual" aria-hidden="true">{{ data.display.menus?.[menu.id]?.emoji }}</div><div class="bowl-heading"><h3>{{ name('menus',menu.id) }}</h3><strong class="product-base-price">{{ money(menu.pricesCents[platformId]) }}</strong></div></div>
   <div class="bowl-groups"><section v-for="g in menuGroups" :key="g.id" class="bowl-options"><header><div><h4>{{ g.name }}</h4><p>เลือก {{ g.min===g.max?g.min:`${g.min}–${g.max}` }} อย่าง · {{ g.pricingMode==='included'?'รวมในราคา':'คิดเงินเพิ่ม' }}</p></div><span>{{ groupCount(g) }}/{{ g.max }}</span></header><div class="bowl-addon-grid"><div v-for="id in g.optionIds" :key="id" class="bowl-group-option"><button type="button" class="bowl-addon" :class="{'is-selected':choices[g.id][id]>0}" :aria-pressed="choices[g.id][id]>0" :disabled="locked||(!choices[g.id][id]&&groupCount(g)>=g.max)" @click="toggleChoice(g,id)"><span class="bowl-addon-emoji" aria-hidden="true">{{ data.display.addons?.[id]?.emoji }}</span><span class="bowl-addon-name"><strong>{{ name('addons',id) }}</strong></span><span class="bowl-addon-price">{{ optionPrice(g,id) }}</span><span class="bowl-addon-check"><Check v-if="choices[g.id][id]>0" :size="15"/><Plus v-else :size="15"/></span></button><div v-if="g.allowRepeat&&choices[g.id][id]>0" class="bowl-option-quantity"><AppQuantityInput v-model="choices[g.id][id]" :label="`${g.name} ${name('addons',id)} จำนวน`" :min="0" :max="g.max" :disabled="locked"/></div></div></div></section></div>
   <section class="product-note"><label class="field">หมายเหตุ<AppInput v-model="lineNote" maxlength="1000" placeholder="เช่น แยกท็อปปิ้ง" :disabled="locked"/></label></section>
   <p v-if="lineError" class="error" role="alert">{{ lineError }}</p>
  </form>
  <template v-if="menu" #footer><div class="custom-order-footer"><div class="bowl-total"><span>จำนวนชาม</span><strong>{{ quantity }} ชาม</strong></div><AppQuantityInput v-model="quantity" label="จำนวนชาม" :min="1" :max="1000000" :disabled="locked"/><div class="custom-order-footer-actions"><Button type="submit" form="cloud-line-form" data-add-line :disabled="locked||cart.length>=saleLimit">เพิ่มลงตะกร้า</Button></div><p class="muted">หนึ่งบิลได้สูงสุด {{ saleLimit }} รายการ</p></div></template>
 </DialogFrame>
 <DialogFrame :open="!!cancelId" id="cloud-cancel-order" title="ยืนยันคืนบิล" :busy="busy" @request-close="cancelId=''"><p>ยืนยันคืนเงินและคืนสต็อกบิลนี้ตามล็อตเดิม?</p><p v-if="error" class="error" role="alert">{{ error }}</p><template #footer><Button variant="secondary" :disabled="busy" @click="cancelId=''">เก็บบิลไว้</Button><Button :disabled="locked||!ready" :loading="busy" @click="cancelOrder(cancelId)">ยืนยันคืนบิล</Button></template></DialogFrame>
 <DialogFrame :open="clearConfirm" id="cloud-clear-cart" title="ล้างตะกร้านี้?" @request-close="answerClear(false)"><p>รายการสินค้า ท็อปปิ้ง และหมายเหตุที่ยังไม่ได้ชำระจะถูกล้าง</p><template #footer><Button variant="secondary" @click="answerClear(false)">เก็บออเดอร์ไว้</Button><Button variant="danger" @click="answerClear(true)">ล้างตะกร้า</Button></template></DialogFrame>
</template>

<script setup>
import {ref,shallowRef,computed,watch,onMounted,onUnmounted,toRaw,reactive,nextTick} from 'vue'
import Button from '@/components/ui/Button.vue'
import CloudProductShell from './CloudProductShell.vue'
import PosCatalog from '@/components/pos/PosCatalog.vue'
import CartPanel from '@/components/pos/CartPanel.vue'
import CartReviewBar from '@/components/pos/CartReviewBar.vue'
import DialogFrame from '@/components/ui/DialogFrame.vue'
import AppQuantityInput from '@/components/ui/AppQuantityInput.vue'
import AppInput from '@/components/ui/AppInput.vue'
import CloudStockWorkspace from './CloudStockWorkspace.vue'
import {loadInventoryHistory} from './inventoryHistory.js'
import {getFirebaseClient} from '../firebaseClient.js'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import ReceiptModal from '@/components/modals/ReceiptModal.vue'
import {ShoppingBag,Package,Factory,History,LayoutDashboard,UtensilsCrossed,Sparkles,Settings,Check,Plus} from 'lucide-vue-next'
import {useElementWidth} from '@/composables/useElementWidth'
import {projectMenus,projectCart,optionCents,projectReceipt} from './productPresentation.js'
import {createCoreWorkspace} from './workspace.js'
import {maxSaleLines} from './model/limits.js'
const props=defineProps({connection:{type:Object,required:true},state:{type:Object,required:true}})
defineEmits(['sign-out'])
const data=shallowRef(null),loading=ref(false),busy=ref(false),online=ref(navigator.onLine),error=ref(''),message=ref(''),tab=ref('sale'),pendingCommand=ref(null),storageReady=ref(true),initialized=ref(false)
const cart=ref([]),platformId=ref(''),selectedMenu=ref(''),choices=ref({}),quantity=ref(1),lineNote=ref(''),approveShortage=ref(false),cancelId=ref(''),legacyOrders=ref([])
const localUrl=`${import.meta.env.BASE_URL}local.html`
let service,storageKey,deviceId,disposed=false,refreshAgain=false,storedCommand=null,cartCommandId=null
try{
 deviceId=localStorage.getItem('gy-cloud-device-v1')||crypto.randomUUID();localStorage.setItem('gy-cloud-device-v1',deviceId)
 storageKey=JSON.stringify(['gy-core-cart-v1',props.connection.config.projectId,props.connection.shopId,props.state.shop.generation,props.state.user.uid])
 const saved=JSON.parse(sessionStorage.getItem(storageKey)||'null')
 if(saved){cart.value=saved.cart||[];platformId.value=saved.platformId||'';storedCommand=saved.command||null;pendingCommand.value=storedCommand;cartCommandId=saved.cartCommandId||null}
}catch{storageReady.value=false;error.value='เก็บตะกร้าบนเครื่องไม่ได้ กรุณาอนุญาตพื้นที่จัดเก็บแล้วเปิดหน้านี้ใหม่'}
const context=()=>({projectId:props.connection.config.projectId,shopId:props.connection.shopId,generation:props.state.shop?.generation,uid:props.state.user?.uid,deviceId,online:online.value,ready:props.state.serverReady===true,protocolCertified:true})
const ready=computed(()=>initialized.value&&storageReady.value&&online.value&&props.state.serverReady===true&&!!data.value)
const locked=computed(()=>busy.value||!!pendingCommand.value||!storageReady.value)
const saleLimit=computed(()=>data.value?maxSaleLines(data.value.shop):0)
const menus=computed(()=>Object.values(data.value?.shop.catalog.menus||{}).filter(m=>m.active))
const platformIds=computed(()=>data.value?.shop.catalog.platformIds.filter(id=>data.value.shop.catalog.platforms[id].active)||[])
const menu=computed(()=>data.value?.shop.catalog.menus[selectedMenu.value])
const menuGroups=computed(()=>{const m=menu.value,c=data.value?.shop.catalog;if(!m)return [];if(m.groupIds?.length)return m.groupIds.map(id=>c.groups[id]);if(m.groupId)return [c.groups[m.groupId]];return m.optionIds?.length?[{...m,id:'legacy',name:'ท็อปปิ้ง',allowRepeat:false}]:[]})
const sourceDate=computed(()=>String(data.value?.display.sourceDate||'ไม่ระบุวันที่').slice(0,10))
const previewResult=computed(()=>{try{if(!cart.value.length||!data.value)return {};return {order:service.previewSale({platformId:platformId.value,lines:plain(cart.value)})}}catch(e){return {error:explain(e)}}})
const preview=computed(()=>previewResult.value.order),previewError=computed(()=>previewResult.value.error)
const shortages=computed(()=>Object.entries(preview.value?.approvedShortages||{}).filter(([,q])=>q>0))
const canCheckout=computed(()=>ready.value&&!locked.value&&!!preview.value&&(!shortages.value.length||approveShortage.value))
const money=c=>new Intl.NumberFormat('th-TH',{style:'currency',currency:'THB'}).format((c||0)/100)
const amount=q=>new Intl.NumberFormat('th-TH',{maximumFractionDigits:2}).format(q/100)
const plain=v=>JSON.parse(JSON.stringify(toRaw(v)))

const saleRoot=ref(null),saleWidth=useElementWidth(saleRoot),split=computed(()=>saleWidth.value>=696)
const cartOpen=ref(false),searchQuery=ref(''),lineError=ref(''),clearConfirm=ref(false),receiptState=reactive({isOpen:false,order:null})
let clearAnswer
const productMenus=computed(()=>projectMenus(data.value))
const productPlatforms=computed(()=>platformIds.value.map(id=>({id,name:name('platforms',id),isActive:true,gpPercent:(data.value.shop.catalog.platforms[id].gpBasisPoints||0)/100})))
const filteredMenus=computed(()=>productMenus.value.filter(m=>m.name.toLowerCase().includes(searchQuery.value.trim().toLowerCase())))
const cartQuantity=computed(()=>cart.value.reduce((n,l)=>n+l.qty,0)),cartQuantities=computed(()=>cart.value.reduce((r,l)=>({...r,[l.menuId]:(r[l.menuId]||0)+l.qty}),{}))
const navigation=[{id:'dashboard',label:'ภาพรวม & งบต้นทุน',icon:LayoutDashboard,disabled:true},{id:'sale',label:'แคชเชียร์ (POS)',icon:ShoppingBag},{id:'menu',label:'จัดการเมนู',icon:UtensilsCrossed,disabled:true},{id:'addon',label:'จัดการ Add-on',icon:Sparkles,disabled:true},{id:'stock',label:'คลังวัตถุดิบ & Package',icon:Package},{id:'produce',label:'ผลิตสินค้า',icon:Factory},{id:'orders',label:'บิลขาย & คืนบิล',icon:History},{id:'settings',label:'ตั้งค่าระบบ',icon:Settings,disabled:true}]
const pageTitle=computed(()=>navigation.find(n=>n.id===tab.value)?.label||'Greek Yogg.')
const productModel=reactive({cloud:true,modals:{receipt:receiptState},get currentTab(){return tab.value},get connected(){return ready.value},get account(){return props.state.user?.email||''},switchTab(id){if(navigation.some(n=>n.id===id&&!n.disabled))tab.value=id},get cart(){return projectCart(cart.value,data.value)},get currentPlatformId(){return platformId.value},get currentPlatform(){return productPlatforms.value.find(p=>p.id===platformId.value)},get checkoutDisabled(){return !canCheckout.value},get cartSummary(){const p=preview.value||{},subtotal=(p.subtotalCents||0)/100;return {subtotal,gpPercent:(data.value?.shop.catalog.platforms[platformId.value]?.gpBasisPoints||0)/100,gpAmount:(p.gpCents||0)/100,netRevenue:(p.netCents??p.subtotalCents??0)/100,totalIngredientCost:(p.ingredientCostCents||0)/100,totalPackagingCost:(p.packagingCostCents||0)/100,totalFoodCost:((p.ingredientCostCents||0)+(p.packagingCostCents||0))/100,grossProfit:(p.grossProfitCents||0)/100}},get cartPackagePlan(){return {items:[]}},updateCartQty,removeFromCart(index){if(!locked.value)cart.value.splice(index,1)},clearCart(){if(!locked.value)cart.value=[]},confirmDialog(){return new Promise(resolve=>{clearAnswer=resolve;clearConfirm.value=true})}})
function answerClear(value){clearConfirm.value=false;clearAnswer?.(value);clearAnswer=null}
function updateCartQty(index,qty){if(locked.value)return;try{const next=plain(cart.value);next[index].qty=qty;service.previewSale({platformId:platformId.value,lines:next});cart.value=next}catch(e){error.value=explain(e)}}
function setPlatform(id){if(!locked.value)platformId.value=id}
function groupCount(g){return Object.values(choices.value[g.id]||{}).reduce((n,q)=>n+Number(q),0)}
function toggleChoice(g,id){if(!locked.value)choices.value[g.id][id]=choices.value[g.id][id]?0:1}
function menuUnavailable(m){try{const c=data.value.shop.catalog.menus[m.id];if(c.groupId||c.groupIds?.length)return false;return Object.values(service.previewSale({platformId:platformId.value,lines:[{menuId:m.id,qty:1,optionIds:[]}]}).approvedShortages||{}).some(q=>q>0)}catch{return false}}
const inventoryWorkspace=ref(null)
async function readStockHistory(){const {db}=getFirebaseClient({mode:props.connection.mode,config:props.connection.config});return loadInventoryHistory({db,shopId:props.connection.shopId,generation:props.state.shop.generation,materials:data.value.materials,display:data.value.display})}
watch(tab,async value=>{if(value==='produce'){await nextTick();const model=inventoryWorkspace.value?.model,m=model?.activeMaterials.find(m=>m.hasSubRecipe);if(m)model.modals.stockIn={isOpen:true,materialId:m.id}}})
watch(split,value=>{if(value)cartOpen.value=false})

function material(id){return data.value?.materials.find(m=>m.id===id)}
function materialName(id){return material(id)?.name||id}
function name(kind,id){return data.value?.display[kind]?.[id]?.name||id}
function orderDate(o){return o.createdAt?.toDate?o.createdAt.toDate().toLocaleString('th-TH'):''}
function optionPrice(g,id){const cents=optionCents(data.value,menu.value,g.id==='legacy'?null:g,id,platformId.value);return cents===0?'รวมในราคา':`+${money(cents)}`}
function selectMenu(id){if(locked.value)return;selectedMenu.value=id;quantity.value=1;lineNote.value='';lineError.value='';choices.value=Object.fromEntries(menuGroups.value.map(g=>[g.id,Object.fromEntries(g.optionIds.map(id=>[id,0]))]))}
function lineDescription(l){return l.selections?l.selections.map(s=>`${name('addons',s.id)} × ${s.selectionQty}`).join(', '):(l.optionIds||[]).map(id=>name('addons',id)).join(', ')}
function save(){try{sessionStorage.setItem(storageKey,JSON.stringify({cart:cart.value,platformId:platformId.value,command:pendingCommand.value,cartCommandId}));return true}catch{storageReady.value=false;error.value='เก็บตะกร้าไม่ได้ กรุณาเปิดพื้นที่จัดเก็บก่อนบันทึก';return false}}
function addLine(){
 if(locked.value||!menu.value||cart.value.length>=saleLimit.value)return
 try{
 const line={menuId:menu.value.id,qty:quantity.value,note:lineNote.value}
 if(menu.value.groupIds?.length)line.selections=menuGroups.value.flatMap(g=>g.optionIds.filter(id=>choices.value[g.id][id]>0).map(id=>({groupId:g.id,id,selectionQty:choices.value[g.id][id]})))
 else line.optionIds=menuGroups.value.flatMap(g=>g.optionIds.flatMap(id=>{const q=choices.value[g.id][id]||0;if(!Number.isSafeInteger(q)||q<0||q>(g.allowRepeat?g.max:1))throw new Error('Invalid selection');return Array(q).fill(id)}))
 service.previewSale({platformId:platformId.value,lines:[...plain(cart.value),line]});cart.value.push(line);error.value='';lineError.value='';message.value='';selectedMenu.value='';if(!split.value)cartOpen.value=true}catch(e){lineError.value=explain(e)}
}
function explain(e){const code=e?.code||e?.message||'';if(code==='OFFLINE'||code==='NOT_READY')return 'ยังไม่เชื่อมต่อเซิร์ฟเวอร์ กรุณาเชื่อมต่อแล้วลองใหม่';if(code==='SHORTAGE_REVIEW_REQUIRED')return 'สต็อกเปลี่ยนไป กรุณาตรวจจำนวนที่ขาดใหม่';if(code.includes('Production input unavailable'))return 'วัตถุดิบผลิตไม่พอหรือหมดอายุ กรุณารับเข้าวัตถุดิบก่อนผลิต';if(code.includes('Invalid line')||code.includes('selection'))return 'กรุณาเลือกท็อปปิ้งให้ครบตามจำนวนและตรวจจำนวนสินค้า';if(code.includes('allocation'))return 'วัตถุดิบหมดอายุหรือจัดสรรล็อตไม่ได้ กรุณาตรวจสต็อก';if(code==='LOCAL_JOURNAL_FAILED')return 'เก็บคำสั่งบนเครื่องไม่ได้ กรุณาอนุญาตพื้นที่จัดเก็บแล้วลองใหม่';return 'บันทึกไม่ได้ กรุณาตรวจจำนวน ราคา วันที่ และสต็อก แล้วโหลดข้อมูลล่าสุดอีกครั้ง'}
async function refresh(){
 if(!service||disposed)return
 if(loading.value){refreshAgain=true;return}
 loading.value=true
 try{const result=await service.load();if(disposed)return;data.value=result;if(!platformId.value)platformId.value=platformIds.value[0]||'';error.value=''}catch(e){if(!disposed)error.value=explain(e)}finally{loading.value=false;if(refreshAgain&&!disposed){refreshAgain=false;void refresh()}}
}
async function updatePending(){const p=await service.pending();if(disposed)return;if(p.length)pendingCommand.value=p[0].envelope;else if(!storedCommand)pendingCommand.value=null;save()}
async function send(command){
 if(busy.value||!ready.value)return {ok:false,code:'NOT_READY'}
 busy.value=true;error.value='';pendingCommand.value=plain(command);storedCommand=pendingCommand.value
 if(!save()){busy.value=false;return {ok:false,code:'LOCAL_JOURNAL_FAILED'}}
 try{let result=await service.execute(plain(command));if(disposed)return {ok:false};if(!result.ok&&command.payload.expectedRevision!==undefined&&service.rejectStaleInventory){const resolved=await service.rejectStaleInventory();if(resolved.ok&&resolved.value)result=resolved}if(result.ok)finish(result.value);else {message.value='ยังไม่ทราบผลการบันทึก กรุณาตรวจผลและลองคำสั่งเดิมต่อ';error.value=result.code==='PENDING_RESULT'?'':explain({code:result.code})}return result}catch(e){if(!disposed){message.value='ยังไม่ทราบผลการบันทึก';error.value=explain(e)}return {ok:false,code:'PENDING_RESULT'}}finally{busy.value=false;if(!disposed)await reloadEverything()}
}
function finish(value){
 inventoryWorkspace.value?.acknowledge(value)
 if(value.rejected){pendingCommand.value=null;storedCommand=null;save();message.value='';error.value='ยอดคลังเปลี่ยน คำสั่งที่ยังไม่สำเร็จถูกหยุดแล้ว กรุณาตรวจแบบร่างที่เหลือใหม่';return}
  if(value.kind==='sale'&&!value.abandoned&&value.opId===cartCommandId){cart.value=[];cartOpen.value=false;receiptState.order=projectReceipt({...value.result,opId:value.opId},data.value);receiptState.isOpen=true}
 cancelId.value='';pendingCommand.value=null;storedCommand=null;cartCommandId=null;approveShortage.value=false;save();message.value=value.abandoned?'หยุดบิลแล้ว ตะกร้ายังอยู่':'บันทึกสำเร็จ · ยืนยันจากเซิร์ฟเวอร์แล้ว'
}
function checkout(){if(!canCheckout.value)return;cartCommandId=crypto.randomUUID();void send({opId:cartCommandId,kind:'sale',payload:{platformId:platformId.value,lines:plain(cart.value),subtotalCents:preview.value.subtotalCents,approvedShortages:Object.fromEntries(shortages.value)}})}
async function retry(){if(!pendingCommand.value)return;await send(plain(pendingCommand.value))}
async function abandon(){if(busy.value||!ready.value)return;busy.value=true;try{const r=await service.abandon();if(!disposed){if(r.ok)finish(r.value);else error.value=explain(r)}}catch(e){error.value=explain(e)}finally{busy.value=false;await refresh()}}
function cancelOrder(orderId){if(!locked.value&&ready.value)void send({opId:crypto.randomUUID(),kind:'cancel',payload:{orderId}})}
async function loadHistory(e){if(e.target.open&&!legacyOrders.value.length)try{legacyOrders.value=await service.history()}catch{error.value='โหลดประวัติเดิมไม่ได้ กรุณาเชื่อมต่อแล้วลองใหม่'}}
async function loadOrders(){try{const orders=await service.orders();if(!disposed&&data.value)data.value={...data.value,orders}}catch{if(!disposed)error.value='โหลดบิลไม่ได้ กรุณาเชื่อมต่อแล้วกดโหลดข้อมูลล่าสุด'}}
async function reloadEverything(){await refresh();if(tab.value==='orders'&&!disposed)await loadOrders()}
const connectivity=()=>{online.value=navigator.onLine;if(online.value&&props.state.serverReady)void refresh()}
watch([cart,platformId],()=>{approveShortage.value=false;if(storageKey)save()},{deep:true})
watch(()=>JSON.stringify(shortages.value),()=>{approveShortage.value=false})
watch(tab,value=>{if(value==='orders')void loadOrders()})
watch(()=>props.state.shop?.revision,()=>{if(props.state.serverReady)void refresh()})
watch(()=>props.state.serverReady,value=>{if(value)void refresh()})
onMounted(async()=>{
 window.addEventListener('online',connectivity);window.addEventListener('offline',connectivity)
 try{service=createCoreWorkspace({connection:props.connection,getContext:context});await refresh();if(disposed)return;await updatePending();initialized.value=true;if(pendingCommand.value&&ready.value){const r=await service.reconcile();if(!disposed&&r.ok&&r.value)finish(r.value)}}catch(e){error.value=explain(e)}
})
onUnmounted(()=>{disposed=true;answerClear(false);window.removeEventListener('online',connectivity);window.removeEventListener('offline',connectivity);void service?.close()})
</script>


<style scoped src="./productWorkspace.css"></style>
<style scoped src="@/components/pos/productSelection.css"></style>
<style scoped src="@/components/inventory/stockForms.css"></style>
