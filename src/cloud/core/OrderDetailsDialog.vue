<template>
 <DialogFrame id="order-entry-details" title="ออเดอร์วันที่เลือก" :description="date" :open="open" :presentation="mobile?'drawer':'side-drawer'" width="520px" initial-focus="#order-entry-details-title" compact @request-close="$emit('request-close')">
  <template #header>
   <div class="order-details-heading"><h3 id="order-entry-details-title" ref="heading" tabindex="-1">ออเดอร์วันที่เลือก</h3><p>{{ date }}</p></div>
  </template>
  <div class="order-details">
   <p v-if="state==='loading'" role="status">กำลังโหลดออเดอร์…</p>
   <div v-else-if="state==='error'" class="order-details-error"><p role="alert">โหลดออเดอร์ของวันที่เลือกไม่ได้</p><Button variant="quiet" size="compact" @click="$emit('retry')">ลองใหม่</Button></div>
   <p v-else-if="state==='offline'" role="status">เชื่อมต่อเพื่อดูออเดอร์ของวันที่เลือก</p>
   <p v-else-if="!groups.length" class="order-details-empty">ยังไม่มีออเดอร์ในวันที่เลือก</p>
   <section v-for="group in groups" :key="group.kind" class="order-details-group" :aria-label="group.title">
    <header><component :is="group.icon" :size="18" aria-hidden="true" /><h4>{{ group.title }}</h4><span>{{ group.rows.length }} รายการ</span></header>
    <ul class="order-entry-list">
     <li v-for="row in group.rows" :key="row.id" class="order-details-row">
      <div class="order-details-row-main">
       <div><strong>{{ row.platform }}</strong><span v-if="row.time">{{ row.time }}<template v-if="row.fromPreorder"> · จาก Pre-order</template></span></div>
       <strong class="order-details-amount">{{ row.amount }}</strong>
      </div>
      <ul v-if="row.items.length" class="order-details-items" aria-label="รายการเมนู">
       <li v-for="(item,index) in row.items" :key="index" class="order-details-item">
        <component :is="item.hasDetails?'details':'div'">
         <component :is="item.hasDetails?'summary':'div'" class="order-details-product" :class="{'order-details-product--expandable':item.hasDetails}">
          <span class="order-details-photo"><EntityImage :entity-id="item.menuId" :image="item.image" :emoji="item.emoji" /></span>
          <span class="order-details-product-name"><strong>{{ item.menuName || item.menuId }}</strong><small>{{ item.qty }} ชาม</small></span>
          <strong class="order-details-price">{{ formatAmount(item.totalPrice) }}</strong>
          <ChevronDown v-if="item.hasDetails" :size="16" class="order-details-chevron" aria-hidden="true" />
         </component>
         <div v-if="item.hasDetails" class="order-details-item-content">
          <div v-if="item.selectedAddons?.length" class="order-details-choices">
           <p>ตัวเลือกต่อชาม</p>
           <ul>
            <li v-for="(option,choiceIndex) in item.selectedAddons" :key="choiceIndex">
             <span>{{ option.name || option.id }}<template v-if="option.selectionQty>1"> ×{{ option.selectionQty }}</template><small v-if="option.groupName">{{ option.groupName }}</small></span>
             <span v-if="option.price!=null">{{ option.price===0?'รวมในราคา':`+${formatAmount(option.price*(option.selectionQty||1))}` }}</span>
            </li>
           </ul>
          </div>
          <p v-if="item.note" class="order-details-note">หมายเหตุ {{ item.note }}</p>
          <OrderIngredients v-if="group.kind==='preorder'" :rows="item.ingredients" label="วัตถุดิบต่อชามตามสูตรปัจจุบัน" />
         </div>
        </component>
       </li>
      </ul>
      <p v-if="group.kind==='preorder'&&row.items.length" class="order-details-preorder-note">ราคาแต่ละเมนูอิงราคาปัจจุบัน ยอดด้านบนคือยอดจอง</p>
      <div class="order-details-actions" :class="{'order-details-actions--multiple':group.kind==='preorder'||row.canReturn}">
       <details class="order-details-costs">
        <summary><span>{{ group.kind==='preorder'?'ต้นทุนประมาณการ':'ต้นทุนและวัตถุดิบ' }}</span><ChevronDown :size="16" class="order-details-chevron" aria-hidden="true" /></summary>
        <dl v-if="row.costs" class="order-details-cost-breakdown">
         <div v-for="cost in row.costs" :key="cost.label"><dt>{{ cost.label }}</dt><dd>{{ formatAmount(cost.amount) }}</dd></div>
        </dl>
        <p v-else class="order-details-preorder-note">คำนวณต้นทุนจากข้อมูลร้านปัจจุบันไม่ได้</p>
        <OrderIngredients :rows="row.ingredients" label="วัตถุดิบรวมในบิล" />
       </details>
       <div class="order-details-buttons">
        <Button v-if="group.kind==='preorder'" variant="quiet" size="compact" :disabled="blocked" @click="openRow('open-preorder',row.source)">เปิด Pre-order <ChevronRight :size="14" aria-hidden="true" /></Button>
        <Button v-else variant="quiet" size="compact" @click="openRow('open-sale',row.source)">ดูใบเสร็จ <ChevronRight :size="14" aria-hidden="true" /></Button>
        <Button v-if="group.kind==='preorder'" data-order-cancel-preorder variant="secondary" size="compact" :disabled="blocked" @click="openRow('cancel-preorder',row.id)">ยกเลิก Pre-order</Button>
        <Button v-if="row.canReturn" data-order-return-preorder variant="secondary" size="compact" :disabled="blocked" @click="openRow('return-sale',row.source.orderId)">คืนบิล</Button>
       </div>
      </div>
     </li>
    </ul>
   </section>
  </div>
 </DialogFrame>
</template>

<script setup>
import {computed,ref} from 'vue'
import {CalendarClock,ChevronDown,ChevronRight,ReceiptText,RotateCcw} from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'
import DialogFrame from '@/components/ui/DialogFrame.vue'
import OrderIngredients from '@/components/pos/OrderIngredients.vue'
import EntityImage from '@/components/images/EntityImage.vue'
import {lineIngredients} from '@/components/pos/orderIngredients'
import {useMediaQuery} from '@/composables/useMediaQuery'
import {money} from '@/domain/dashboard'
import {projectCart} from './productPresentation'
import {cloudPackageOperands} from './packagePresentation'
import {scheduledOrderId} from './orderEntry.js'

const props=defineProps({open:Boolean,date:String,sales:Array,bookings:Array,data:Object,previewSale:Function,state:String,blocked:Boolean})
const emit=defineEmits(['request-close','retry','open-sale','return-sale','open-preorder','cancel-preorder'])
const heading=ref(null)
const mobile=useMediaQuery('(max-width: 767px)')
const timeFormat=new Intl.DateTimeFormat('th-TH',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Bangkok'})
const formatAmount=value=>value==null||!Number.isFinite(Number(value))?'—':`฿${money(value)}`

function openRow(event,row){
 // The row may disappear during the next server refresh. Keep a stable opener.
 heading.value?.focus({preventScroll:true})
 emit(event,row)
}

function costRows(ingredients,packaging,total){
 return [{label:'ต้นทุนวัตถุดิบ',amount:ingredients},{label:'ต้นทุนบรรจุภัณฑ์',amount:packaging},{label:'ต้นทุนขายรวม',amount:total}]
}

function bookingDetails(booking){
 let draft,cart
 try{
  draft=JSON.parse(booking.draftJson)
  cart=projectCart(draft.lines,props.data)
 }catch{return {items:[]}}
 const {platformId}=booking
 let estimate
 try{
  const packages=cloudPackageOperands(props.data,draft.lines,draft.packageAdjustments||[])
  estimate=props.previewSale?.({platformId,lines:draft.lines,packages})
 }catch{ /* Preserve the saved quote and choices when current pricing is unavailable. */ }
 const items=cart.map((item,index)=>{
  const cents=estimate?.lines?.[index]?.totalCents
  return {menuId:item.menu.id,menuName:item.menu.name,emoji:item.menu.emoji,image:item.menu.image,hasDetails:true,qty:item.qty,note:item.note,
   totalPrice:Number.isSafeInteger(cents)?cents/100:null,
   selectedAddons:item.selectedAddons.map(option=>({...option,price:estimate?option.prices?.[platformId]:null})),
   ingredients:lineIngredients(item,props.data.materials||[])}
 })
 const {ingredientCostCents,packagingCostCents}=estimate||{}
 const costs=Number.isSafeInteger(ingredientCostCents)&&Number.isSafeInteger(packagingCostCents)
  ?costRows(ingredientCostCents/100,packagingCostCents/100,(ingredientCostCents+packagingCostCents)/100):null
 return {items,costs}
}
const groups=computed(()=>{
 if(!props.open)return []
 const display=props.data.display
 const sold=[],cancelled=[]
 for(const sale of props.sales){
  const list=sale.status==='cancelled'?cancelled:sold
  const fromPreorder=sale.reportKey?.startsWith('firebase:')&&!!scheduledOrderId(sale.orderId)
  const items=(sale.items||[]).map(item=>{
   const menu=display?.menus?.[item.menuId]
   const totalPrice=item.totalPrice??(Number.isFinite(item.unitPrice)?item.unitPrice*item.qty:null)
   return {...item,totalPrice,image:menu?.image,emoji:menu?.emoji,hasDetails:!!(item.selectedAddons?.length||item.note)}
  })
  const costs=costRows(sale.ingredientCost,sale.packagingCost,sale.foodCost)
  list.push({id:sale.reportKey,source:sale,platform:sale.platformName||display?.platforms?.[sale.platformId]?.name||'ไม่ระบุช่องทาง',time:sale.saleDay?'บันทึกย้อนหลัง':timeFormat.format(new Date(sale.createdAt)),amount:formatAmount(sale.subtotal),items,ingredients:sale.ingredients,costs,
   fromPreorder,canReturn:sale.status==='committed'&&fromPreorder})
 }
 const preorders=props.bookings.map(booking=>({id:booking.id,source:booking,platform:display?.platforms?.[booking.platformId]?.name||booking.platformId,amount:formatAmount(booking.quoteCents/100),...bookingDetails(booking)}))
 return [{kind:'sale',title:'บิลขาย',icon:ReceiptText,rows:sold},{kind:'preorder',title:'Pre-order รอดำเนินการ',icon:CalendarClock,rows:preorders},{kind:'cancelled',title:'คืนบิลแล้ว',icon:RotateCcw,rows:cancelled}].filter(group=>group.rows.length)
})
</script>

<style scoped>
.order-details-heading h3{font-size:1.125rem;font-weight:600}
.order-details-heading p{margin-top:4px;font-size:.8125rem;color:var(--text-muted)}
.order-details{display:grid;gap:16px;color:var(--text-muted)}
.order-details-empty{padding:16px 0}
.order-details-error,.order-details-group header,.order-details-row-main{display:flex;align-items:baseline;gap:8px}
.order-details-group header{align-items:center;padding:8px 0;border-bottom:1px solid var(--border-subtle);color:var(--accent-brand)}
.order-details-group h4{font-weight:600;color:var(--text-main)}
.order-details-group header span{margin-inline-start:auto;font-size:.75rem;color:var(--text-muted);white-space:nowrap}
.order-details-row{display:grid;gap:6px;padding:12px 0;border-bottom:1px solid var(--border-subtle)}
.order-details-row-main,.order-details-error{justify-content:space-between}
.order-details-row-main>div{min-width:0}
.order-details-row-main>div strong,.order-details-row-main>div span{display:block;overflow-wrap:anywhere}
.order-details-row-main strong,.order-details-items strong{font-weight:600;color:var(--text-main)}
.order-details-row-main span,.order-details-items{font-size:.8125rem}
.order-details-amount,.order-details-price{white-space:nowrap;font-variant-numeric:tabular-nums}
.order-details-items{padding:0 8px;background:var(--bg-soft);border-radius:10px}
.order-details-item + .order-details-item{border-top:1px solid var(--border-subtle)}
.order-details-product{display:grid;grid-template-columns:40px minmax(0,1fr) auto 16px;align-items:center;gap:8px;min-height:56px;padding:6px 0}
.order-details-photo{width:40px;height:40px;border-radius:8px;background:var(--bg-card)}
.order-details-product-name{min-width:0;overflow-wrap:anywhere}
.order-details-product-name small,.order-details-choices small{display:block;color:var(--text-muted);font-size:.75rem}
.order-details-items .order-details-price{color:var(--accent-brand);font-size:.9375rem}
.order-details-product--expandable,.order-details-costs>summary{list-style:none;cursor:pointer}
.order-details summary::-webkit-details-marker{display:none}
.order-details summary:focus-visible{outline:2px solid var(--accent-brand);outline-offset:2px;border-radius:4px}
.order-details-chevron{color:var(--text-muted)}
.order-details details[open]>summary .order-details-chevron{transform:rotate(180deg)}
.order-details-item-content{display:grid;gap:8px;padding:4px 0 10px 48px;color:var(--text-main)}
.order-details-choices ul{display:grid;gap:6px;margin-top:4px}
.order-details-choices li,.order-details-cost-breakdown>div{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px}
.order-details-choices li>span:last-child:not(:first-child),.order-details-cost-breakdown dd{text-align:end;font-variant-numeric:tabular-nums}
.order-details-choices p,.order-details-note,.order-details-preorder-note{font-size:.75rem;color:var(--text-muted)}
.order-details-note{white-space:pre-wrap}
.order-details-actions{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:start;gap:0 8px}
.order-details-buttons{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:4px;grid-column:2;grid-row:1}
.order-details-buttons>.ui-button{min-height:44px;gap:4px;white-space:nowrap}
.order-details-actions--multiple .order-details-buttons{grid-column:1/-1;grid-row:2}
.order-details-costs{display:grid;grid-column:1/-1;grid-row:1;min-width:0;font-size:.8125rem}
.order-details-costs>summary{display:flex;align-items:center;gap:6px;width:fit-content;min-height:44px;color:var(--accent-brand);font-weight:600}
.order-details-cost-breakdown{display:grid;gap:4px;margin-bottom:8px;color:var(--text-main)}
.order-details-cost-breakdown>div:last-child{font-weight:600}
</style>
