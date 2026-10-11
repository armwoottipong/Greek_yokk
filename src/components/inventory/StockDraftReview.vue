<template>
 <div v-if="hasDrafts" class="draft-bar" role="status"><span><strong>{{ items.length }} รายการ</strong> ยังไม่บันทึก</span><Button data-review-stock-drafts variant="secondary" @click="$emit('open')">ตรวจทานแบบร่าง</Button></div>
 <DialogFrame id="stock-draft-review" title="ตรวจทานแบบร่างสต็อก" description="ยังไม่บันทึกจริงจนกว่าจะกดยืนยันบันทึก" :open="open" presentation="sheet" @request-close="$emit('close')">
  <article v-for="item in items" :key="item.id" class="draft-item"><strong>{{ item.name }}</strong><p>{{ item.description }}</p><div>{{ baseline(item.materialId) }} → {{ current(item.materialId) }} {{ item.unit }}</div><small v-if="item.delta===0">เปลี่ยนล็อตที่กำลังใช้</small></article>
  <p v-if="!items.length">ไม่มีแบบร่างค้างอยู่</p>
  <template #footer><Button variant="quiet" @click="$emit('discard')">ยกเลิกแบบร่างทั้งหมด</Button><Button :disabled="!items.length" @click="$emit('commit')">ยืนยันบันทึก</Button></template>
 </DialogFrame>
</template>
<script setup>
import Button from '../ui/Button.vue'
import DialogFrame from '../ui/DialogFrame.vue'
const props=defineProps({open:Boolean,hasDrafts:Boolean,items:{type:Array,default:()=>[]},snapshot:Array,materials:Array})
defineEmits(['open','close','discard','commit'])
const baseline=id=>Number(props.snapshot?.find(m=>m.id===id)?.stock||0).toLocaleString('th-TH')
const current=id=>Number(props.materials?.find(m=>m.id===id)?.stock||0).toLocaleString('th-TH')
</script>
<style scoped>
.draft-bar{position:sticky;bottom:max(12px,env(safe-area-inset-bottom));display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px;background:var(--accent-brand);color:var(--bg-card);border-radius:var(--surface-radius);box-shadow:var(--overlay-shadow);font-size:13px;z-index:40}.draft-bar span{min-width:0}.draft-item{padding:16px 0;border-bottom:1px solid var(--border-subtle)}.draft-item p,.draft-item small{font-size:12px;color:var(--text-muted);line-height:1.6;margin:6px 0}.draft-item div{font-size:18px;font-weight:600;color:var(--accent-brand);font-variant-numeric:tabular-nums}
</style>
