<template>
 <DialogFrame id="menu-recipe" :open="open" :title="menu?.name||'รายละเอียดเมนู'" presentation="sheet" width="960px" description="ภาพรวมราคา ต้นทุน และกำไรทุกแพลตฟอร์ม พร้อมสูตรที่ใช้" @request-close="$emit('close')">
  <template v-if="menu">
   <p class="recipe-description">{{ menu.description }}</p>
   <section aria-label="รายรับ ต้นทุน และกำไร">
    <MenuPlatformOverview :menu="menu" :platforms="platforms" :cost="displayCost" :estimated="hasEstimates" :worst="worstView">
     <template v-if="hasEstimates" #controls><div class="recipe-view-toggle"><span aria-live="polite">{{ worstView ? 'ชุดแพงสุด' : 'ค่าเฉลี่ย' }}</span><IconButton :label="worstView ? 'สลับเป็นค่าเฉลี่ย' : 'สลับเป็นชุดแพงสุด'" :aria-pressed="worstView" @click="worstView = !worstView"><ArrowLeftRight :size="16" aria-hidden="true"/></IconButton></div></template>
    </MenuPlatformOverview>
    <template v-if="hasEstimates">
     <p class="recipe-help">{{ worstView ? 'คำนวณจากชุดต้นทุนสูงสุดตามกติกาการเลือกซ้ำ' : 'เฉลี่ยต้นทุนจากตัวเลือกที่เปิดขาย โดยสมมติว่าแต่ละตัวเลือกถูกเลือกเท่า ๆ กัน' }} · เลือกครบจำนวนสูงสุดของกลุ่มฟรี · ไม่รวม Add-on เพิ่มเงิน</p>
     <p v-for="group in costEstimate.groups" :key="group.id" class="recipe-help">{{ group.name }} · {{ group.count }} {{ group.allowRepeat ? 'ที่ · เลือกซ้ำได้' : 'ชนิด · ไม่ซ้ำ' }}</p>
     <p v-if="displayCost === null" class="recipe-help" role="status">ยังคำนวณไม่ได้ กรุณาตรวจต้นทุน สูตร และจำนวนตัวเลือกที่เปิดขายให้เพียงพอ</p>
    </template>
    <p v-else class="recipe-help">คำนวณทุกช่องทางจากราคาขาย หัก GP และต้นทุนสูตรเดียวกัน</p>
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
import MenuPlatformOverview from './MenuPlatformOverview.vue'
import {computed,ref,watch} from 'vue'
import IconButton from '../ui/IconButton.vue'
import {ArrowLeftRight} from 'lucide-vue-next'
const props=defineProps({open:Boolean,menu:Object,items:Array,foodCost:Number,costEstimate:Object,platforms:Array})
const worstView = ref(false)
watch(() => [props.open, props.menu?.id], () => { worstView.value = false })
const hasEstimates = computed(() => Boolean(props.costEstimate?.groups.length))
const displayCost = computed(() => hasEstimates.value ? (worstView.value ? props.costEstimate.worstCost : props.costEstimate.averageCost) : props.costEstimate ? props.costEstimate.baseCost : props.foodCost)
defineEmits(['close','edit'])
const groups=computed(()=>[{label:'วัตถุดิบ',items:(props.items||[]).filter(i=>i.mat?.inventoryType!=='packaging')},{label:'บรรจุภัณฑ์',items:(props.items||[]).filter(i=>i.mat?.inventoryType==='packaging')}].filter(g=>g.items.length))
</script>
<style scoped src="./catalogRecipe.css"></style>
<style scoped>.recipe-view-toggle{display:flex;justify-content:flex-end;flex-shrink:0;align-items:center;gap:4px;font-size:.75rem;color:var(--text-muted)}.recipe-view-toggle :deep(.ui-icon-button){width:44px;min-height:44px}</style>
