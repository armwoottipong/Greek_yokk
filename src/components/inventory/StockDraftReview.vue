<template>
 <div v-if="hasDrafts" class="draft-bar-space" aria-hidden="true"></div>
 <Transition name="draft-bar" appear>
  <section v-if="hasDrafts" class="draft-bar" aria-label="แบบร่างสต็อกที่รอบันทึก">
   <div class="draft-bar-content">
    <div class="draft-bar-heading"><span class="draft-bar-icon" aria-hidden="true"><ClipboardCheck :size="18"/></span><div class="draft-bar-title" role="status"><strong>แบบร่างสต็อก</strong><span>{{ items.length }} รายการรอบันทึก</span></div></div>
   </div>
   <div class="draft-bar-actions"><Button data-review-stock-drafts variant="secondary" size="compact" :disabled="busy" aria-haspopup="dialog" :aria-expanded="open" aria-controls="stock-draft-review" @click="$emit('open')">รายละเอียด<ChevronUp :size="16" aria-hidden="true"/></Button><Button data-discard-stock-drafts variant="danger" size="compact" :loading="discarding" :disabled="busy||!items.length" @click="$emit('discard')"><Trash2 :size="15" aria-hidden="true"/>ยกเลิกทั้งหมด</Button><Button data-save-stock-drafts size="compact" :loading="saving" :disabled="busy||!items.length" @click="$emit('commit')"><Check :size="16" aria-hidden="true"/>บันทึกทั้งหมด</Button></div>
  </section>
 </Transition>
 <DialogFrame id="stock-draft-review" title="ตรวจทานแบบร่างสต็อก" description="ดูรายละเอียดแล้วกดบันทึกทั้งหมดที่แถบแบบร่างสต็อก" presentation="sheet" :busy="busy" :open="open" width="720px" compact contained-body @request-close="$emit('close')">
  <div class="draft-review-layout">
   <div class="draft-review-heading"><h4>รายการที่แก้ไข</h4><span>{{ items.length }} รายการ</span></div>
   <ul v-if="items.length" class="draft-review-list" aria-label="รายการแบบร่างสต็อก">
    <li v-for="item in items" :key="item.id" class="draft-review-item">
     <div class="draft-review-identity"><span class="draft-review-emoji" aria-hidden="true">{{ item.emoji }}</span><div><strong>{{ item.name }}</strong><small>{{ item.title }}</small><p>{{ item.description }}</p></div></div>
     <div class="draft-review-change"><span class="draft-review-caption">ยอดเดิม → ยอดใหม่</span><div class="draft-review-quantity">{{ baseline(item.materialId) }} → {{ current(item.materialId) }} {{ item.unit }}</div><small :class="item.delta>0?'draft-increase':item.delta<0?'draft-decrease':''">{{ item.delta>0?'เพิ่ม ':item.delta<0?'ลด ':'' }}{{ item.delta!==0?Math.abs(item.delta).toLocaleString('th-TH')+' '+item.unit:'เปลี่ยนล็อตที่กำลังใช้' }}</small></div>
    </li>
   </ul>
   <div v-else class="draft-review-empty"><ClipboardCheck :size="28" aria-hidden="true"/><strong>ไม่มีแบบร่างค้างอยู่</strong><p>กลับไปจัดการรายการในคลังได้เลย</p></div>
  </div>
  <template #footer><div class="draft-review-footer"><div class="draft-review-actions"><Button variant="secondary" :disabled="busy" @click="$emit('close')">กลับไปแถบแบบร่าง</Button></div></div></template>
 </DialogFrame>
</template>
<script setup>
import Button from '../ui/Button.vue'
import DialogFrame from '../ui/DialogFrame.vue'
import {ClipboardCheck,Trash2,Check,ChevronUp} from 'lucide-vue-next'
const props=defineProps({busy:Boolean,saving:Boolean,discarding:Boolean,open:Boolean,hasDrafts:Boolean,items:{type:Array,default:()=>[]},snapshot:Array,materials:Array})
defineEmits(['open','close','discard','commit'])
const baseline=id=>Number(props.snapshot?.find(m=>m.id===id)?.stock||0).toLocaleString('th-TH')
const current=id=>Number(props.materials?.find(m=>m.id===id)?.stock||0).toLocaleString('th-TH')
</script>
<style scoped>
.draft-bar{position:fixed;left:calc(50% + 128px);transform:translateX(-50%);bottom:max(16px,env(safe-area-inset-bottom));display:flex;align-items:center;justify-content:space-between;gap:24px;width:min(820px,calc(100vw - 288px));margin:0;padding:12px 16px;background:var(--bg-card);color:var(--text-main);border-radius:16px;box-shadow:var(--shadow-popup);z-index:40}
.draft-bar-content{min-width:0}.draft-bar-heading{display:flex;align-items:center;gap:10px}.draft-bar-icon{display:grid;place-items:center;flex-shrink:0;width:32px;height:32px;color:var(--accent-brand)}.draft-bar-title{display:grid;gap:2px}.draft-bar-title strong{font-size:.8125rem;font-weight:600}.draft-bar-title>span{font-size:.6875rem;color:var(--text-muted)}
@media(min-width:768px) and (max-width:1199px){.draft-bar{left:calc(50% + 36px);width:min(820px,calc(100vw - 104px));gap:16px}}
@media(max-width:767px){.draft-bar{left:50%;width:calc(100vw - 24px);padding:12px;flex-direction:column;align-items:stretch;gap:12px}.draft-bar-title{display:flex;align-items:baseline;flex-wrap:wrap;gap:4px 12px}.draft-bar-icon{width:24px;height:24px}}
@media(prefers-reduced-motion:no-preference){.draft-bar-enter-active,.draft-bar-leave-active{transition:opacity 180ms ease,transform 220ms cubic-bezier(.2,.8,.3,1)}.draft-bar-enter-from,.draft-bar-leave-to{opacity:0;transform:translate(-50%,16px)}}
.draft-review-layout{display:flex;flex-direction:column;min-height:0;flex:1 1 auto}.draft-review-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:4px 0 12px;flex-shrink:0;border-bottom:1px solid var(--border-subtle)}.draft-review-heading h4{font-size:.8125rem;font-weight:500}.draft-review-heading>span{font-size:.75rem;color:var(--text-muted)}.draft-review-list{list-style:none;padding:0;margin:0;overflow:auto;min-height:0;flex:1 1 auto;overscroll-behavior:contain}.draft-review-item{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;padding:16px 0;border-bottom:1px solid var(--border-subtle)}.draft-review-item:last-child{border-bottom:0}.draft-review-identity{display:flex;align-items:flex-start;gap:10px;min-width:0}.draft-review-identity>div{min-width:0}.draft-review-emoji{display:grid;place-items:center;width:40px;height:40px;flex-shrink:0;border-radius:12px;background:var(--bg-soft);font-size:22px}.draft-review-identity strong{display:block;font-size:.875rem;font-weight:600;line-height:1.6;overflow-wrap:anywhere}.draft-review-identity small,.draft-review-identity p{font-size:.6875rem;line-height:1.7;color:var(--text-muted);margin-top:3px;overflow-wrap:anywhere}.draft-review-change{min-width:0;text-align:right;align-self:center}.draft-review-caption{display:block;font-size:.6875rem;color:var(--text-muted);margin-bottom:4px}.draft-review-quantity{font-size:1rem;font-weight:600;color:var(--accent-brand);font-variant-numeric:tabular-nums;overflow-wrap:anywhere}.draft-review-change>small{display:block;margin-top:4px;font-size:.75rem;color:var(--text-muted)}.draft-review-change>.draft-increase{color:var(--state-success)}.draft-review-change>.draft-decrease{color:var(--state-error)}.draft-review-empty{display:grid;justify-items:center;gap:10px;padding:40px 16px;color:var(--text-muted);text-align:center;font-size:.8125rem}.draft-review-empty strong{color:var(--text-main)}.draft-review-footer{display:flex;justify-content:space-between;align-items:center;gap:12px;width:100%;flex-wrap:wrap}.draft-review-actions{display:flex;gap:8px;margin-left:auto}.draft-review-footer .ui-button{white-space:nowrap}.draft-review-footer svg{flex-shrink:0}@media(max-width:560px){.draft-review-item{grid-template-columns:minmax(0,1fr);gap:10px}.draft-review-change{text-align:left;padding-left:50px}.draft-review-footer{gap:8px}.draft-review-actions{width:100%;margin-left:0}.draft-review-actions>.ui-button{flex:1}.draft-review-discard{width:100%;order:2}}
</style>
<style scoped>
.draft-bar-space{height:104px;flex-shrink:0}.draft-bar-actions{display:flex;align-items:center;gap:8px;flex-shrink:0}.draft-bar-actions .ui-button{white-space:nowrap;min-height:44px}.draft-bar-actions svg{flex-shrink:0}
@media(max-width:767px){.draft-bar-actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));width:100%;gap:8px}.draft-bar-actions .ui-button{min-width:0;padding-inline:6px;font-size:.75rem;justify-content:center}.draft-bar-actions svg{display:none}.draft-bar-space{height:144px}}
</style>
