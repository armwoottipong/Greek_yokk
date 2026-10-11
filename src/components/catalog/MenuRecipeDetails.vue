<template>
 <DialogFrame id="menu-recipe" :open="open" :title="menu?.name||'รายละเอียดเมนู'" :presentation="phone?'sheet':'panel'" @request-close="$emit('close')">
  <template v-if="menu">
   <p class="recipe-description">{{ menu.description }}</p>
   <PlatformPriceSummary all :prices="menu.prices||{}" :platforms="platforms" :selected-id="selectedId" />
   <dl class="recipe-summary"><div><dt>ต้นทุนวัตถุดิบ</dt><dd>฿{{ foodCost.toFixed(2) }}</dd></div><div><dt>ราคาขายหน้าร้าน</dt><dd>฿{{ storePrice }}</dd></div><div><dt>อัตรากำไรขั้นต้น</dt><dd>{{ margin.toFixed(1) }}%</dd></div></dl>
   <p class="recipe-help">คำนวณจากราคาหน้าร้านและต้นทุนวัตถุดิบ ยังไม่หักค่าธรรมเนียมช่องทาง</p>
   <h4 class="mt-6 font-semibold">สูตรต่อ 1 เสิร์ฟ</h4>
   <article v-for="(item,index) in items" :key="index" class="recipe-item"><strong>{{ item.mat?.name||'ไม่พบวัตถุดิบ' }}</strong><p>{{ item.qty }} {{ item.mat?.unit||'' }} · ฿{{ item.cost.toFixed(2) }}</p><small v-if="!item.mat">รหัส {{ item.materialId }} · แก้ไขสูตรเพื่อเลือกวัตถุดิบใหม่</small><small v-else-if="item.servingsAvailable!==null">สต็อกพอ {{ item.servingsAvailable }} เสิร์ฟ</small><small v-else>ยังไม่ระบุจำนวนที่ใช้</small></article>
   <p v-if="!items.length" class="recipe-help mt-3">ยังไม่มีสูตรวัตถุดิบ</p>
  </template><p v-else>ไม่พบเมนู รายการนี้อาจถูกลบแล้ว</p>
  <template #footer><Button variant="secondary" @click="$emit('close')">ปิด</Button><Button v-if="menu" @click="$emit('edit')">แก้ไขเมนูและสูตร</Button></template>
 </DialogFrame>
</template>
<script setup>
import DialogFrame from '../ui/DialogFrame.vue'
import Button from '../ui/Button.vue'
import PlatformPriceSummary from './PlatformPriceSummary.vue'
import {useMediaQuery} from '@/composables/useMediaQuery'
defineProps({open:Boolean,menu:Object,items:Array,foodCost:Number,storePrice:Number,margin:Number,platforms:Array,selectedId:String})
defineEmits(['close','edit'])
const phone=useMediaQuery('(max-width: 767px)')
</script>
<style scoped>
.recipe-description,.recipe-help{font-size:12px;color:var(--text-muted);line-height:1.7;margin:10px 0}.recipe-summary{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:24px 0 12px}.recipe-summary dt{font-size:12px;color:var(--text-muted)}.recipe-summary dd{font-size:20px;color:var(--accent-brand);font-weight:600;margin-top:5px}.recipe-item{padding:16px 0;border-bottom:1px solid var(--border-subtle)}.recipe-item p{font-variant-numeric:tabular-nums;margin:6px 0}.recipe-item small{font-size:12px;color:var(--text-muted)}
</style>
