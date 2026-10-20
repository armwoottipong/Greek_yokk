<template>
 <DialogFrame id="menu-recipe" :open="open" :title="menu?.name||'รายละเอียดเมนู'" presentation="sheet" description="สูตรและราคาขายของเมนูนี้" @request-close="$emit('close')">
  <template v-if="menu">
   <p class="recipe-description">{{ menu.description }}</p>
   <section class="recipe-prices"><h4>แสดงราคาช่องทาง</h4><PlatformPriceSummary all selectable :prices="menu.prices||{}" :platforms="platforms" :selected-id="selectedId" @select="$emit('platform',$event)"/></section>
   <section aria-label="รายรับ ต้นทุน และกำไร">
    <div v-if="hasEstimates" class="recipe-view-toggle"><span aria-live="polite">{{ worstView ? 'ชุดแพงสุด' : 'ค่าเฉลี่ย' }}</span><IconButton :label="worstView ? 'สลับเป็นค่าเฉลี่ย' : 'สลับเป็นชุดแพงสุด'" :aria-pressed="worstView" @click="worstView = !worstView"><ArrowLeftRight :size="16" aria-hidden="true"/></IconButton></div>
    <dl class="recipe-summary recipe-summary--platform">
     <div data-menu-financial="price"><dt>ราคาขาย {{ pricing.platformName }}</dt><dd>{{ pricing.price===null?'ยังไม่กำหนดราคา':money(pricing.price) }}</dd></div>
     <div data-menu-financial="gp"><dt>หัก GP ({{ pricing.gpPercent ?? '—' }}%)</dt><dd>{{ money(pricing.gpAmount) }}</dd></div>
     <div data-menu-financial="net"><dt>รายรับหลังหัก GP</dt><dd>{{ money(pricing.netRevenue) }}</dd></div>
     <div data-menu-financial="cost"><dt>{{ hasEstimates ? 'ต้นทุนรวมประมาณการ' : 'ต้นทุนสูตรรวม' }}</dt><dd>{{ money(displayCost) }}</dd></div>
     <div data-menu-financial="profit" :data-menu-average-profit="hasEstimates && !worstView ? '' : undefined" :data-menu-worst-profit="hasEstimates && worstView ? '' : undefined"><dt>{{ hasEstimates ? 'กำไรประมาณการหลัง GP' : 'กำไรขั้นต้นหลังหัก GP' }}</dt><dd>{{ money(displayProfit) }}</dd></div>
     <div data-menu-financial="margin"><dt>อัตรากำไร / รายรับหลัง GP</dt><dd>{{ displayMargin===null?'ยังคำนวณไม่ได้':`${displayMargin.toFixed(1)}%` }}</dd></div>
    </dl>
    <template v-if="hasEstimates">
     <p class="recipe-help">{{ worstView ? 'คำนวณจากชุดต้นทุนสูงสุดตามกติกาการเลือกซ้ำ' : 'เฉลี่ยต้นทุนจากตัวเลือกที่เปิดขาย โดยสมมติว่าแต่ละตัวเลือกถูกเลือกเท่า ๆ กัน' }} · เลือกครบจำนวนสูงสุดของกลุ่มฟรี · ไม่รวม Add-on เพิ่มเงิน</p>
     <p v-for="group in costEstimate.groups" :key="group.id" class="recipe-help">{{ group.name }} · {{ group.count }} {{ group.allowRepeat ? 'ที่ · เลือกซ้ำได้' : 'ชนิด · ไม่ซ้ำ' }}</p>
     <p v-if="displayCost === null" class="recipe-help" role="status">ยังคำนวณไม่ได้ กรุณาตรวจต้นทุน สูตร และจำนวนตัวเลือกที่เปิดขายให้เพียงพอ</p>
    </template>
    <p v-else class="recipe-help">คำนวณกำไรจากรายรับหลังหัก GP ของ {{ pricing.platformName }} เทียบกับต้นทุนสูตรรวม</p>
   </section>
   <section v-for="group in groups" :key="group.label" class="recipe-group"><h4>{{ group.label }} <span>ต่อ 1 เสิร์ฟ · {{ group.items.length }} รายการ</span></h4><article v-for="(item,index) in group.items" :key="index" class="recipe-item"><div><strong>{{ item.mat?.name||'ไม่พบวัตถุดิบ' }}</strong><p>{{ item.qty }} {{ item.mat?.unit||'' }}</p><small v-if="!item.mat">รหัส {{ item.materialId }} · แก้ไขสูตรเพื่อเลือกวัตถุดิบใหม่</small><small v-else-if="item.servingsAvailable!==null">สต็อกพอ {{ item.servingsAvailable }} เสิร์ฟ</small><small v-else>ยังไม่ระบุจำนวนที่ใช้</small></div><b>฿{{ item.cost.toFixed(2) }}</b></article></section>
   <p v-if="!items.length" class="recipe-help mt-3">ยังไม่มีสูตรวัตถุดิบ</p>
  </template><p v-else>ไม่พบเมนู รายการนี้อาจถูกลบแล้ว</p>
  <template #footer><Button variant="secondary" @click="$emit('close')">ปิด</Button><Button v-if="menu" @click="$emit('edit')">แก้ไขเมนูและสูตร</Button></template>
 </DialogFrame>
</template>
<script setup>
import DialogFrame from '../ui/DialogFrame.vue'
import Button from '../ui/Button.vue'
import PlatformPriceSummary from './PlatformPriceSummary.vue'
import {computed,ref,watch} from 'vue'
import IconButton from '../ui/IconButton.vue'
import {ArrowLeftRight} from 'lucide-vue-next'
const props=defineProps({open:Boolean,menu:Object,items:Array,foodCost:Number,costEstimate:Object,pricing:{type:Object,required:true},platforms:Array,selectedId:String})
const worstView = ref(false)
watch(() => [props.open, props.menu?.id], () => { worstView.value = false })
const hasEstimates = computed(() => Boolean(props.costEstimate?.groups.length))
const displayCost = computed(() => hasEstimates.value ? (worstView.value ? props.costEstimate.worstCost : props.costEstimate.averageCost) : props.foodCost)
const displayProfit = computed(() => hasEstimates.value ? estimatedProfit(displayCost.value) : props.pricing.profit)
const displayMargin = computed(() => hasEstimates.value ? (props.pricing.netRevenue > 0 && displayProfit.value !== null ? displayProfit.value / props.pricing.netRevenue * 100 : null) : props.pricing.margin)
const estimatedProfit = cost => cost === null || props.pricing.netRevenue === null ? null : Math.round((props.pricing.netRevenue-cost)*100)/100
const money=value=>value===null?'ยังคำนวณไม่ได้':`${value<0?'-':''}฿${Math.abs(value).toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2})}`
defineEmits(['close','edit','platform'])
const groups=computed(()=>[{label:'วัตถุดิบ',items:(props.items||[]).filter(i=>i.mat?.inventoryType!=='packaging')},{label:'บรรจุภัณฑ์',items:(props.items||[]).filter(i=>i.mat?.inventoryType==='packaging')}].filter(g=>g.items.length))
</script>
<style scoped src="./catalogRecipe.css"></style>
<style scoped>.recipe-view-toggle{display:flex;justify-content:flex-end;align-items:center;gap:4px;margin-top:12px;font-size:.75rem;color:var(--text-muted)}.recipe-view-toggle+.recipe-summary{margin-top:0}.recipe-view-toggle :deep(.ui-icon-button){width:44px;min-height:44px}@media(max-width:480px){.recipe-summary--platform{grid-template-columns:repeat(2,minmax(0,1fr));row-gap:18px}}</style>
