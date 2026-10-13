<template>
 <DialogFrame id="material-details" :open="open" :title="material?.name || 'รายละเอียดวัตถุดิบ'" :presentation="phone?'sheet':'panel'" @request-close="$emit('close')">
  <template v-if="material">
   <StatusBadge :data-inventory-type="material.inventoryType" :label="getMaterialKindLabel(material)" tone="neutral" />
   <StatusBadge v-if="material.isDeleted" label="จัดเก็บแล้ว" tone="neutral" />
   <dl class="material-facts"><div><dt>คงเหลือ</dt><dd>{{ Number(material.stock||0).toLocaleString('th-TH') }} {{ material.unit }}</dd></div><div><dt>ต้นทุนต่อ {{ material.packUnit||material.unit }}</dt><dd>฿{{ packCost.toLocaleString('th-TH',{maximumFractionDigits:2}) }}</dd></div></dl>
   <p v-if="draftDiff" class="draft-note">รอยืนยัน {{ draftDiff>0?'+':'' }}{{ draftDiff }} {{ material.unit }}</p>
   <MaterialUsage :usage="usage" show-references />
   <StockLotList :lots="lots" :tracking-mode="trackingMode" :unit="material.unit" :archived="material.isDeleted" @adjust="$emit('adjust',material.id,$event)" @waste="$emit('waste',material.id,$event)" @switch="$emit('switch',material.id,$event)" />
  </template>
  <p v-else>ไม่พบวัตถุดิบ รายการนี้อาจถูกลบไปแล้ว</p>
  <template #footer>
   <template v-if="material">
    <Button v-if="material.isDeleted" data-detail-restore @click="$emit('restore',material)">กู้คืนรายการ</Button>
    <Button data-detail-edit variant="quiet" @click="$emit('edit',material.id)">แก้ไขข้อมูล</Button>
    <Button v-if="material.isDeleted" data-detail-delete variant="danger" @click="$emit('delete',material)">ลบถาวร</Button>
    <template v-else><Button data-detail-receive @click="$emit('receive',material.id)">{{ material.hasSubRecipe?'ผลิตตามสูตร':'รับเข้าสต็อก' }}</Button></template>
   </template>
  </template>
 </DialogFrame>
</template>
<script setup>
import DialogFrame from '../ui/DialogFrame.vue'
import Button from '../ui/Button.vue'
import StatusBadge from '../ui/StatusBadge.vue'
import MaterialUsage from './MaterialUsage.vue'
import {getMaterialKindLabel} from '@/domain/materialClassification'
import StockLotList from './StockLotList.vue'
import {useMediaQuery} from '@/composables/useMediaQuery'
defineProps({open:Boolean,material:Object,usage:Object,lots:Array,trackingMode:String,packCost:{type:Number,default:0},draftDiff:Number})
defineEmits(['close','adjust','waste','switch','restore','edit','receive','delete'])
const phone=useMediaQuery('(max-width: 767px)')
</script>
<style scoped>
.material-facts{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:16px 0}.material-facts dt,.material-context{font-size:12px;color:var(--text-muted)}.material-facts dd{font-size:20px;font-weight:600;color:var(--accent-brand);margin-top:6px;overflow-wrap:anywhere;font-variant-numeric:tabular-nums}.draft-note{font-size:13px;color:var(--state-warning);margin:12px 0}
</style>
