<template>
 <main class="core-workspace">
  <header class="core-header"><div><h1>Greek Yogg.</h1><p>{{ state.serverReady && online ? 'เชื่อมต่อ Firebase · ใช้ข้อมูลร่วมกันทุกเครื่อง' : 'ขาดการเชื่อมต่อ · เก็บตะกร้าไว้แล้ว กรุณาเชื่อมต่อก่อนบันทึก' }}</p></div><div class="header-actions"><Button variant="secondary" :disabled="busy||!online" @click="reloadEverything">โหลดข้อมูลล่าสุด</Button><Button variant="secondary" :disabled="busy" @click="$emit('sign-out')">ออกจากระบบ</Button></div></header>
  <p v-if="data?.display.trial" class="trial-banner"><strong>ข้อมูลทดสอบ — ยังไม่ใช่ยอดร้านปัจจุบัน</strong><br>จากไฟล์สำรอง {{ sourceDate }} · บิลและสต็อกที่บันทึกในหน้านี้เป็นการทดลอง <a :href="localUrl">เปิดระบบเดิมเพื่อทำงานจริง</a></p>
  <p v-if="message" class="notice" role="status" aria-live="polite">{{ message }}</p>
  <p v-if="error" class="error" role="alert">{{ error }}</p>
  <section v-if="pendingCommand" class="pending-panel" aria-label="รายการรอตรวจผล"><h2>ยังไม่ทราบผลการบันทึก</h2><p>เก็บคำสั่งเดิมไว้แล้ว กดตรวจผลและลองคำสั่งเดิมต่อได้ ระบบจะไม่สร้างบิลซ้ำ</p><Button data-retry-command :disabled="!ready" :loading="busy" @click="retry">ตรวจผลและลองต่อ</Button><Button v-if="pendingCommand.kind==='sale'" variant="secondary" :disabled="!ready||busy" @click="abandon">หยุดบิลที่ยังไม่สำเร็จและเก็บตะกร้า</Button></section>
  <p v-if="!data">{{ loading ? 'กำลังโหลดข้อมูลร้านจากเซิร์ฟเวอร์…' : 'ยังโหลดข้อมูลร้านไม่ได้ กดโหลดข้อมูลล่าสุดเพื่อลองใหม่' }}</p>
  <template v-else>
   <nav class="core-nav" aria-label="งานร้าน"><button v-for="item in tabs" :key="item.id" :aria-current="tab===item.id?'page':undefined" @click="tab=item.id">{{ item.name }}</button></nav>
   <section v-if="tab==='sale'" class="sale-layout" aria-label="ขายสินค้า">
    <div class="menu-panel"><h2>ขายสินค้า</h2><label class="field">ช่องทาง<select v-model="platformId" :disabled="locked"><option v-for="id in platformIds" :key="id" :value="id">{{ name('platforms',id) }}</option></select></label>
     <div class="menu-grid"><button v-for="m in menus" :key="m.id" :data-menu="m.id" :class="{selected:selectedMenu===m.id}" :disabled="locked" @click="selectMenu(m.id)"><span>{{ name('menus',m.id) }}</span><strong>{{ money(m.pricesCents[platformId]) }}</strong></button></div>
     <form v-if="menu" class="line-form" @submit.prevent="addLine"><h3>{{ name('menus',menu.id) }}</h3><label class="field">จำนวน<input v-model.number="quantity" type="number" min="1" max="1000000" step="1" required :disabled="locked"></label>
      <fieldset v-for="g in menuGroups" :key="g.id" :disabled="locked"><legend>{{ g.name }} · เลือก {{ g.min===g.max?g.min:`${g.min}–${g.max}` }} อย่าง{{ g.allowRepeat?' (เลือกซ้ำได้)':'' }}</legend><label v-for="id in g.optionIds" :key="id" class="option-row"><span>{{ name('addons',id) }} <small>{{ optionPrice(g,id) }}</small></span><input v-model.number="choices[g.id][id]" :aria-label="`${g.name} ${name('addons',id)} จำนวน`" type="number" min="0" :max="g.allowRepeat?g.max:1" step="1"></label></fieldset>
      <label class="field">หมายเหตุ<input v-model="lineNote" maxlength="1000" :disabled="locked"></label><Button type="submit" data-add-line :disabled="locked||cart.length>=saleLimit">เพิ่มลงตะกร้า</Button><p class="muted">หนึ่งบิลได้สูงสุด {{ saleLimit }} รายการ จำนวนเมนูเดียวกันรวมในรายการเดียวได้</p>
     </form>
    </div>
    <aside class="cart-panel"><h2>ตะกร้า <span>{{ cart.length }} รายการ</span></h2><p v-if="!cart.length" class="muted">เลือกเมนูเพื่อเริ่มบิล</p><ol><li v-for="(line,i) in cart" :key="i" data-cart-line><div><strong>{{ name('menus',line.menuId) }} × {{ line.qty }}</strong><p>{{ lineDescription(line) }}</p><p v-if="line.note">{{ line.note }}</p></div><button :disabled="locked" :aria-label="`นำ ${name('menus',line.menuId)} ออกจากตะกร้า`" @click="cart.splice(i,1)">นำออก</button></li></ol>
     <template v-if="preview"><div class="total-row"><span>ยอดรวม</span><strong>{{ money(preview.subtotalCents) }}</strong></div><div v-if="shortages.length" class="shortage"><h3>สต็อกไม่พอ</h3><p v-for="[id,q] in shortages" :key="id">{{ materialName(id) }} ขาด {{ amount(q) }} {{ material(id)?.unit }}</p><label><input v-model="approveShortage" type="checkbox" :disabled="locked"> ยืนยันขายตามจำนวนที่ขาดข้างต้น</label></div></template>
     <p v-if="previewError" class="error">{{ previewError }}</p><Button data-checkout :loading="busy" :disabled="!canCheckout" @click="checkout">ยืนยันขายและตัดสต็อก{{ data.display.trial?'ทดสอบ':'' }}</Button><p class="muted">ถือว่าสำเร็จเมื่อได้รับบิลจากเซิร์ฟเวอร์แล้วเท่านั้น</p>
    </aside>
   </section>
   <section v-else-if="tab==='stock'" aria-label="สต็อกและรับเข้า"><h2>สต็อกและรับเข้า</h2><div class="stock-layout"><div class="table-wrap"><table><thead><tr><th>วัตถุดิบ</th><th>คงเหลือ</th><th>หน่วย</th></tr></thead><tbody><tr v-for="m in data.materials.filter(m=>!m.deleted)" :key="m.id"><th>{{ m.name||m.id }}</th><td>{{ amount(m.stock) }}</td><td>{{ m.unit }}</td></tr></tbody></table></div><form class="inventory-form" @submit.prevent="submitInventory('inventory')"><h3>รับเข้าสต็อก</h3><label class="field">วัตถุดิบ<select v-model="receiveId" required :disabled="locked"><option value="" disabled>เลือกวัตถุดิบ</option><option v-for="m in data.materials.filter(m=>!m.deleted)" :key="m.id" :value="m.id">{{ m.name||m.id }}</option></select></label><label class="field">จำนวน ({{ material(receiveId)?.unit||'หน่วย' }})<input v-model="receiveQty" required type="number" min="0.01" step="0.01" :disabled="locked"></label><label class="field">ต้นทุนต่อหน่วย (บาท)<input v-model="receiveCost" required type="number" min="0" max="100000" step="any" :disabled="locked"></label><label class="field">วันที่รับเข้า<input v-model="receiveDate" required type="date" :disabled="locked"></label><label v-if="material(receiveId)?.inventoryType!=='packaging'" class="field">วันหมดอายุ (เว้นว่างได้)<input v-model="receiveExpiry" type="date" :disabled="locked"></label><label class="field">หมายเหตุ<input v-model="receiveNote" maxlength="1000" :disabled="locked"></label><Button type="submit" :disabled="locked||!ready||!receiveId" :loading="busy">บันทึกรับเข้า</Button></form></div></section>
   <section v-else-if="tab==='produce'" class="production-panel" aria-label="ผลิต"><h2>ผลิต</h2><p v-if="!productionMaterials.length">ยังไม่มีสูตรผลิตในข้อมูลร้านชุดนี้</p><form v-else class="inventory-form" @submit.prevent="submitInventory('produce')"><label class="field">สินค้าที่ผลิต<select v-model="produceId" required :disabled="locked"><option value="" disabled>เลือกสินค้า</option><option v-for="m in productionMaterials" :key="m.id" :value="m.id">{{ m.name||m.id }}</option></select></label><p v-if="productionRecipe" class="recipe-description">สูตรต่อ {{ amount(productionRecipe.yieldQ) }} {{ material(produceId)?.unit }}: {{ productionRecipe.inputIds.map((id,i)=>`${materialName(id)} ${amount(productionRecipe.quantities[i])} ${material(id)?.unit||''}`).join(' + ') }}</p><label class="field">จำนวนที่ผลิตได้ ({{ material(produceId)?.unit||'หน่วย' }})<input v-model="produceQty" required type="number" min="0.01" step="0.01" :disabled="locked"></label><label class="field">วันที่ผลิต<input v-model="produceDate" required type="date" :disabled="locked"></label><label class="field">วันหมดอายุ (เว้นว่างได้)<input v-model="produceExpiry" type="date" :disabled="locked"></label><label class="field">หมายเหตุ<input v-model="produceNote" maxlength="1000" :disabled="locked"></label><Button type="submit" :disabled="locked||!ready||!produceId" :loading="busy">ผลิตและตัดวัตถุดิบ</Button></form></section>
   <section v-else aria-label="ประวัติบิล"><h2>บิลจาก Firebase</h2><p class="muted">แสดง 100 บิลล่าสุด · การคืนบิลจะคืนสต็อกตามล็อตเดิม</p><p v-if="!data.orders.length">ยังไม่มีบิลในข้อมูลชุดนี้</p><ol class="order-list"><li v-for="o in data.orders" :key="o.opId"><div><strong>{{ money(o.subtotalCents) }} · {{ o.status==='cancelled'?'คืนบิลแล้ว':'ขายสำเร็จ' }}</strong><p>{{ orderDate(o) }} · {{ name('platforms',o.platformId) }}</p><p>{{ o.lines.map(l=>`${name('menus',l.menuId)} × ${l.qty}`).join(', ') }}</p><small>{{ o.opId }}</small></div><div v-if="o.status==='committed'"><Button v-if="cancelId!==o.opId" variant="secondary" :disabled="locked||!ready" @click="cancelId=o.opId">คืนบิล</Button><template v-else><p>ยืนยันคืนเงินและคืนสต็อกบิลนี้?</p><Button :disabled="locked||!ready" @click="cancelOrder(o.opId)">ยืนยันคืนบิล</Button><Button variant="secondary" :disabled="busy" @click="cancelId=''">เก็บบิลไว้</Button></template></div></li></ol><details @toggle="loadHistory"><summary>ประวัติบิลจากระบบเดิม (อ่านอย่างเดียว)</summary><p class="muted">ประวัติเดิมเก็บครบตามไฟล์สำรอง การคืนบิลเดิมยังต้องทำในระบบเดิม</p><p v-for="(o,i) in legacyOrders" :key="i">{{ o.createdAt }} · {{ o.platformName }} · {{ money(Math.round((o.subtotal||0)*100)) }} · {{ o.status||'ประวัติเดิม' }}</p></details></section>
  </template>
 </main>
</template>

<script setup>
import {ref,shallowRef,computed,watch,onMounted,onUnmounted,toRaw} from 'vue'
import Button from '@/components/ui/Button.vue'
import {createCoreWorkspace} from './workspace.js'
import {toScaledExact} from '../conversion.js'
import {maxSaleLines} from './model/limits.js'
const props=defineProps({connection:{type:Object,required:true},state:{type:Object,required:true}})
defineEmits(['sign-out'])
const data=shallowRef(null),loading=ref(false),busy=ref(false),online=ref(navigator.onLine),error=ref(''),message=ref(''),tab=ref('sale'),pendingCommand=ref(null),storageReady=ref(true),initialized=ref(false)
const cart=ref([]),platformId=ref(''),selectedMenu=ref(''),choices=ref({}),quantity=ref(1),lineNote=ref(''),approveShortage=ref(false),cancelId=ref(''),legacyOrders=ref([])
const receiveId=ref(''),receiveQty=ref(''),receiveCost=ref(''),receiveDate=ref(today()),receiveExpiry=ref(''),receiveNote=ref('')
const produceId=ref(''),produceQty=ref(''),produceDate=ref(today()),produceExpiry=ref(''),produceNote=ref('')
const localUrl=`${import.meta.env.BASE_URL}local.html`,tabs=[{id:'sale',name:'ขายสินค้า'},{id:'stock',name:'สต็อก / รับเข้า'},{id:'produce',name:'ผลิต'},{id:'orders',name:'บิล / คืนบิล'}]
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
const productionMaterials=computed(()=>data.value?.materials.filter(m=>!m.deleted&&m.productionRecipe)||[])
const productionRecipe=computed(()=>material(produceId.value)?.productionRecipe)
const sourceDate=computed(()=>String(data.value?.display.sourceDate||'ไม่ระบุวันที่').slice(0,10))
const previewResult=computed(()=>{try{if(!cart.value.length||!data.value)return {};return {order:service.previewSale({platformId:platformId.value,lines:plain(cart.value)})}}catch(e){return {error:explain(e)}}})
const preview=computed(()=>previewResult.value.order),previewError=computed(()=>previewResult.value.error)
const shortages=computed(()=>Object.entries(preview.value?.approvedShortages||{}).filter(([,q])=>q>0))
const canCheckout=computed(()=>ready.value&&!locked.value&&!!preview.value&&(!shortages.value.length||approveShortage.value))
const money=c=>new Intl.NumberFormat('th-TH',{style:'currency',currency:'THB'}).format((c||0)/100)
const amount=q=>new Intl.NumberFormat('th-TH',{maximumFractionDigits:2}).format(q/100)
const plain=v=>JSON.parse(JSON.stringify(toRaw(v)))
function today(){return new Date(Date.now()+7*3600000).toISOString().slice(0,10)}
function material(id){return data.value?.materials.find(m=>m.id===id)}
function materialName(id){return material(id)?.name||id}
function name(kind,id){return data.value?.display[kind]?.[id]?.name||id}
function orderDate(o){return o.createdAt?.toDate?o.createdAt.toDate().toLocaleString('th-TH'):''}
function optionPrice(g,id){if(g.pricingMode==='included')return 'รวมในราคา';const c=data.value.shop.catalog,p=g.id==='legacy'?(g.priceMode==='addon'?c.addonPrices[platformId.value]:g.optionPrices[platformId.value]):g.optionPrices[platformId.value];return `+${money(p?.[id]??c.addonPrices?.[platformId.value]?.[id]??0)}`}
function selectMenu(id){selectedMenu.value=id;quantity.value=1;lineNote.value='';choices.value=Object.fromEntries(menuGroups.value.map(g=>[g.id,Object.fromEntries(g.optionIds.map(id=>[id,0]))]))}
function lineDescription(l){return l.selections?l.selections.map(s=>`${name('addons',s.id)} × ${s.selectionQty}`).join(', '):(l.optionIds||[]).map(id=>name('addons',id)).join(', ')}
function save(){try{sessionStorage.setItem(storageKey,JSON.stringify({cart:cart.value,platformId:platformId.value,command:pendingCommand.value,cartCommandId}));return true}catch{storageReady.value=false;error.value='เก็บตะกร้าไม่ได้ กรุณาเปิดพื้นที่จัดเก็บก่อนบันทึก';return false}}
function addLine(){
 if(locked.value||!menu.value||cart.value.length>=saleLimit.value)return
 try{
 const line={menuId:menu.value.id,qty:quantity.value,note:lineNote.value}
 if(menu.value.groupIds?.length)line.selections=menuGroups.value.flatMap(g=>g.optionIds.filter(id=>choices.value[g.id][id]>0).map(id=>({groupId:g.id,id,selectionQty:choices.value[g.id][id]})))
 else line.optionIds=menuGroups.value.flatMap(g=>g.optionIds.flatMap(id=>{const q=choices.value[g.id][id]||0;if(!Number.isSafeInteger(q)||q<0||q>(g.allowRepeat?g.max:1))throw new Error('Invalid selection');return Array(q).fill(id)}))
 service.previewSale({platformId:platformId.value,lines:[...plain(cart.value),line]});cart.value.push(line);error.value='';message.value='เพิ่มลงตะกร้าแล้ว'}catch(e){error.value=explain(e)}
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
 if(busy.value||!ready.value)return
 busy.value=true;error.value='';pendingCommand.value=plain(command);storedCommand=pendingCommand.value
 if(!save()){busy.value=false;return}
 try{const result=await service.execute(plain(command));if(disposed)return;if(result.ok)finish(result.value);else {message.value='ยังไม่ทราบผลการบันทึก กรุณาตรวจผลและลองคำสั่งเดิมต่อ';error.value=result.code==='PENDING_RESULT'?'':explain({code:result.code})}}catch(e){if(!disposed){message.value='ยังไม่ทราบผลการบันทึก';error.value=explain(e)}}finally{busy.value=false;if(!disposed)await reloadEverything()}
}
function finish(value){
  if(value.kind==='sale'&&!value.abandoned&&value.opId===cartCommandId)cart.value=[]
 if(value.kind==='inventory'){receiveQty.value='';receiveNote.value=''}
 if(value.kind==='produce'){produceQty.value='';produceNote.value=''}
 cancelId.value='';pendingCommand.value=null;storedCommand=null;cartCommandId=null;approveShortage.value=false;save();message.value=value.abandoned?'หยุดบิลแล้ว ตะกร้ายังอยู่':'บันทึกสำเร็จ · ยืนยันจากเซิร์ฟเวอร์แล้ว'
}
function checkout(){if(!canCheckout.value)return;cartCommandId=crypto.randomUUID();void send({opId:cartCommandId,kind:'sale',payload:{platformId:platformId.value,lines:plain(cart.value),subtotalCents:preview.value.subtotalCents,approvedShortages:Object.fromEntries(shortages.value)}})}
async function retry(){if(!pendingCommand.value)return;await send(plain(pendingCommand.value))}
async function abandon(){if(busy.value||!ready.value)return;busy.value=true;try{const r=await service.abandon();if(!disposed){if(r.ok)finish(r.value);else error.value=explain(r)}}catch(e){error.value=explain(e)}finally{busy.value=false;await refresh()}}
function scaled(v){const r=toScaledExact(Number(v),100);if(!r.ok||r.value<1)throw new Error('Invalid quantity');return r.value}
function day(v){if(!v)return 999999;const n=Date.parse(`${v}T00:00:00Z`)/86400000;if(!Number.isInteger(n)||n<0||n>100000)throw new Error('Invalid date');return n}
function submitInventory(kind){
 if(locked.value||!ready.value)return
 try{
  const opId=crypto.randomUUID(),production=kind==='produce',id=production?produceId.value:receiveId.value
  const input={qtyQ:scaled(production?produceQty.value:receiveQty.value),receiveDay:day(production?produceDate.value:receiveDate.value),expiryDay:!production&&material(id)?.inventoryType==='packaging'?999999:day(production?produceExpiry.value:receiveExpiry.value),note:production?produceNote.value:receiveNote.value,lotCreatedAtISO:new Date().toISOString()}
  if(production)input.lotId=`LOT-${opId}`;else {if(receiveCost.value===''||!Number.isFinite(Number(receiveCost.value)))throw new Error('Invalid cost');input.unitCost=Number(receiveCost.value);input.newLotId=`LOT-${opId}`}
  const payload={materialId:id,input};service.previewInventory(kind,payload);void send({opId,kind,payload})
 }catch(e){error.value=explain(e)}
}
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
onUnmounted(()=>{disposed=true;window.removeEventListener('online',connectivity);window.removeEventListener('offline',connectivity);void service?.close()})
</script>

<style scoped>
.core-workspace{width:100%;min-width:0;height:100%;overflow:auto;padding:24px clamp(16px,3vw,40px) 48px;background:var(--bg-primary);color:var(--text-main)}
.core-header{display:flex;align-items:center;justify-content:space-between;gap:20px;padding-bottom:20px;border-bottom:1px solid var(--border-subtle)}h1{font-size:1.7rem;font-weight:600;color:var(--accent-brand)}h2{font-size:1.3rem;font-weight:600;margin:0 0 20px}h3{font-size:1.05rem;font-weight:600;margin:0 0 12px}p{line-height:1.7}.core-header p,.muted,small{color:var(--text-muted);font-size:.875rem}.header-actions{display:flex;gap:10px;flex-wrap:wrap}.trial-banner{padding:16px 0;border-bottom:1px solid var(--accent-border);color:var(--accent-brand)}a{text-decoration:underline;text-underline-offset:3px}.notice,.error{margin:16px 0;line-height:1.7}.notice{color:var(--accent-green)}.error{color:var(--accent-red)}.pending-panel{padding:20px;background:var(--bg-soft);margin:20px 0}.pending-panel button{margin:12px 12px 0 0}.core-nav{display:flex;gap:8px;overflow:auto;margin:24px 0;border-bottom:1px solid var(--border-subtle)}.core-nav button{padding:12px 16px;white-space:nowrap;border-bottom:3px solid transparent}.core-nav [aria-current]{color:var(--accent-brand);border-color:var(--accent-brand);font-weight:600}.sale-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(300px,380px);gap:40px}.menu-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin:24px 0}.menu-grid button{min-height:110px;border:1px solid var(--control-border);border-radius:12px;padding:18px;background:var(--bg-card);text-align:left;display:flex;flex-direction:column;justify-content:space-between;gap:12px}.menu-grid .selected{border:2px solid var(--accent-brand);padding:17px}.menu-grid strong{color:var(--accent-brand);font-variant-numeric:tabular-nums}.field{display:flex;flex-direction:column;gap:8px;margin-bottom:18px;font-size:.925rem}input,select{padding:10px 12px;border:1px solid var(--control-border);border-radius:8px;min-height:46px;background:var(--bg-card);max-width:100%;font:inherit;color:inherit}input[type=checkbox]{min-height:20px;width:20px;vertical-align:middle;margin-right:8px}input:disabled,select:disabled,button:disabled{opacity:.55;cursor:not-allowed}select:focus-visible{outline:2px solid var(--accent-brand);outline-offset:2px}.line-form{max-width:620px}fieldset{border-top:1px solid var(--border-subtle);padding:16px 0;margin:20px 0}legend{padding-right:12px;font-size:.9rem}.option-row{display:flex;gap:16px;justify-content:space-between;align-items:center;padding:7px 0}.option-row span{display:flex;flex-direction:column}.option-row input{width:80px}.cart-panel{padding-left:28px;border-left:1px solid var(--border-subtle)}.cart-panel h2 span{font-size:.9rem;font-weight:400}.cart-panel ol{list-style:none;padding:0}.cart-panel li,.order-list li{display:flex;gap:16px;justify-content:space-between;padding:18px 0;border-bottom:1px solid var(--border-subtle)}.cart-panel li p{font-size:.85rem;color:var(--text-muted);margin-top:6px}.cart-panel li button{align-self:flex-start;min-height:44px;text-decoration:underline;white-space:nowrap}.total-row{display:flex;justify-content:space-between;align-items:center;margin:24px 0}.total-row strong{font-size:1.6rem;color:var(--accent-brand);font-variant-numeric:tabular-nums}.cart-panel :deep(.ui-button){width:100%;margin-top:16px}.shortage{padding:16px 0;border-top:1px solid var(--accent-border);color:var(--accent-red)}.shortage label{display:block;margin-top:12px;font-size:.875rem}.stock-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(280px,380px);gap:40px}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;text-align:left}th,td{padding:14px 12px;border-bottom:1px solid var(--border-subtle);font-size:.9rem}tbody th{font-weight:400}td:nth-child(2){font-variant-numeric:tabular-nums;text-align:right}.inventory-form{max-width:480px}.recipe-description{margin:20px 0;color:var(--text-muted)}.order-list{list-style:none;padding:0}.order-list small{overflow-wrap:anywhere}.order-list button{margin:4px 8px 4px 0}details{margin-top:32px}summary{min-height:44px;cursor:pointer;color:var(--accent-brand)}
@media(max-width:850px){.sale-layout,.stock-layout{grid-template-columns:1fr;gap:28px}.cart-panel{padding:24px 0 0;border-left:0;border-top:1px solid var(--border-subtle)}.core-header{align-items:flex-start;flex-direction:column}.header-actions{width:100%}.order-list li{flex-direction:column}.core-nav button{padding:12px 10px}}
</style>
