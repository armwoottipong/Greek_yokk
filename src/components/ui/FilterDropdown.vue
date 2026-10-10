<template>
  <ModalShell :id="id" :labelled-by="`${id}-title`" :open="open" class="fixed inset-0 z-[60]" @request-close="$emit('close')">
    <section data-filter-dropdown :style="position" class="filter-panel">
      <header class="filter-header">
        <div class="filter-heading"><SlidersHorizontal aria-hidden="true" :size="16" /><h3 :id="`${id}-title`">{{ title }}</h3></div>
        <button type="button" class="filter-close" aria-label="ปิดตัวกรอง" @click="$emit('close')"><X :size="16" /></button>
      </header>
      <div class="filter-body">
        <div class="filter-config">
        <div class="filter-fields" :class="fields.length === 1 ? 'single-field' : ''">
          <label v-for="field in fields" :key="field.key" class="filter-field">
            <span>{{ field.label }}</span>
            <AppSelect v-model="draft[field.key]" :aria-label="field.label" class="w-full"><option v-for="option in field.options" :key="option.id" :value="option.id">{{ option.label }}</option></AppSelect>
          </label>
        </div>
        <div class="filter-date-heading"><CalendarDays :size="15" aria-hidden="true" /><span>ช่วงเวลาลัด</span></div>
        <div class="filter-presets" aria-label="เลือกช่วงเวลาลัด">
          <button v-for="preset in presets" :key="preset.days" type="button" :aria-pressed="presetMatches(preset.days)" @click="selectPreset(preset.days)">{{ preset.label }}</button>
        </div>
        </div>
        <div class="filter-dates">
        <div class="filter-date-heading">เลือกช่วงวันที่</div>
        <div class="filter-range" aria-live="polite">
          <div><span>วันเริ่มต้น</span><strong data-range-start>{{ dateLabel(draft.start) }}</strong></div>
          <ArrowRight :size="14" aria-hidden="true" />
          <div><span>วันสิ้นสุด</span><strong data-range-end>{{ dateLabel(draft.end) }}</strong></div>
        </div>
        <DateRangeCalendar v-model:start-date="draft.start" v-model:end-date="draft.end" :show-preview="false" />
        </div>
      </div>
      <footer class="filter-footer">
        <button type="button" class="filter-reset" @click="reset"><RotateCcw :size="13" aria-hidden="true" />ล้างตัวกรอง</button>
        <div class="filter-actions"><button type="button" class="filter-cancel" @click="$emit('close')">ยกเลิก</button><button type="button" data-apply-filters class="filter-apply" @click="apply">ใช้ตัวกรอง<Check :size="14" aria-hidden="true" /></button></div>
      </footer>
    </section>
  </ModalShell>
</template>

<script setup>
import AppSelect from '@/components/ui/AppSelect.vue'
import {ref,watch,onUnmounted} from 'vue'
import {SlidersHorizontal,X,CalendarDays,ArrowRight,RotateCcw,Check} from 'lucide-vue-next'
import {businessDateKey} from '@/domain/businessDate'
import ModalShell from './ModalShell.vue'
import DateRangeCalendar from './DateRangeCalendar.vue'

const props=defineProps({
  id:{type:String,required:true},title:{type:String,default:'ตัวกรอง'},open:Boolean,
  anchor:{type:Object,default:null},values:{type:Object,required:true},fields:{type:Array,default:()=>[]}
})
const emit=defineEmits(['close','apply'])
const draft=ref({})
const position=ref({})
const presets=[{days:1,label:'วันนี้'},{days:7,label:'7 วัน'},{days:30,label:'30 วัน'},{days:0,label:'ทั้งหมด'}]
function positionPanel(){
  if(!props.anchor) return
  const anchor=props.anchor.getBoundingClientRect(),margin=8
  const width=Math.min(window.innerWidth>=640?560:380,window.innerWidth-margin*2)
  const below=window.innerHeight-anchor.bottom-margin*2,above=anchor.top-margin*2
  const useAbove=below<240 && above>below
  const height=Math.min(640,Math.max(120,useAbove?above:below))
  position.value={left:`${Math.max(margin,Math.min(anchor.right-width,window.innerWidth-width-margin))}px`,top:`${useAbove?Math.max(margin,anchor.top-height-margin):anchor.bottom+margin}px`,width:`${width}px`,maxHeight:`${height}px`}
}
watch(()=>props.open,open=>{
  if(open){draft.value={...props.values};positionPanel();window.addEventListener('resize',positionPanel)}
  else window.removeEventListener('resize',positionPanel)
},{immediate:true})
onUnmounted(()=>window.removeEventListener('resize',positionPanel))
function reset(){
  draft.value={...props.values,start:null,end:null}
  props.fields.forEach(field=>{draft.value[field.key]=field.defaultValue ?? 'all'})
}
function presetRange(days){
  if(!days) return {start:null,end:null}
  const end=businessDateKey(),day=new Date(`${end}T00:00:00Z`)
  day.setUTCDate(day.getUTCDate()-days+1)
  return {start:day.toISOString().slice(0,10),end}
}
function selectPreset(days){Object.assign(draft.value,presetRange(days))}
function presetMatches(days){const range=presetRange(days);return draft.value.start===range.start && draft.value.end===range.end}
function dateLabel(value){
  if(!value) return 'เลือกวันที่'
  return new Intl.DateTimeFormat('th-TH',{day:'numeric',month:'short',year:'2-digit',timeZone:'Asia/Bangkok'}).format(new Date(`${value}T12:00:00+07:00`))
}
function apply(){emit('apply',{...draft.value,end:draft.value.end || draft.value.start});emit('close')}
</script>

<style scoped>
.filter-panel{position:fixed;display:flex;flex-direction:column;overflow:hidden;background:#fff;border:1px solid #d6ded9;border-radius:14px;box-shadow:0 12px 36px #1c302a20,0 2px 6px #1c302a0a;color:#292524;font-size:12px}
.filter-header{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid #edf0ee;flex-shrink:0}
.filter-heading{display:flex;align-items:center;gap:9px;color:#16634d}.filter-heading h3{font-size:13px;font-weight:600;color:#292524}
.filter-close{width:30px;height:30px;display:grid;place-items:center;border-radius:8px;color:#78716c}.filter-close:hover{background:#f5f5f4}
.filter-body{padding:14px;overflow-y:auto;min-height:0;scrollbar-width:thin;scrollbar-color:#d6ded9 transparent}
.filter-config,.filter-dates{min-width:0}
.filter-fields{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px;margin-bottom:16px}.single-field{grid-template-columns:1fr}
.filter-field>span{display:block;margin-bottom:6px;font-size:11px;font-weight:500;color:#57534e}
.filter-date-heading{display:flex;align-items:center;gap:7px;font-weight:600;margin-bottom:9px;color:#57534e}
.filter-presets{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px;margin-bottom:12px}.filter-presets button{height:30px;border:1px solid #e5e9e6;border-radius:6px;color:#57534e;font-size:11px}.filter-presets button:hover{border-color:#86b6a2;background:#f3faf6}.filter-presets button[aria-pressed=true]{color:#16634d;background:#ecf7f0;border-color:#abd5bc;font-weight:600}
.filter-range{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;margin-bottom:10px;border:1px solid #d6e8de;background:#f5faf7;border-radius:9px}.filter-range>div{flex:1;min-width:0}.filter-range>svg{color:#7b9b8b}.filter-range span{display:block;font-size:10px;color:#6b8175;margin-bottom:3px}.filter-range strong{display:block;font-weight:600;font-size:12px;color:#245840}
.filter-footer{display:flex;justify-content:space-between;align-items:center;gap:6px;padding:10px 12px;border-top:1px solid #edf0ee;flex-shrink:0;background:#fff}
.filter-reset{display:flex;gap:5px;align-items:center;color:#78716c;font-size:11px;height:36px}.filter-reset:hover{color:#292524}
.filter-actions{display:flex;gap:6px}.filter-cancel,.filter-apply{display:flex;align-items:center;justify-content:center;gap:6px;height:36px;padding:0 10px;border-radius:7px;font-size:12px;font-weight:500}.filter-cancel{border:1px solid #e0e5e2;color:#57534e}.filter-cancel:hover{background:#fafaf9}.filter-apply{background:#16634d;border:1px solid #16634d;color:white}.filter-apply:hover{background:#104f3d}
button:focus-visible,select:focus-visible{outline:2px solid #047857;outline-offset:2px}
@media(max-width:360px){.filter-body{padding:12px}.filter-footer{padding:9px}.filter-apply>svg{display:none}}
@media(min-width:640px){.filter-body{display:grid;grid-template-columns:150px minmax(0,1fr);gap:18px}.filter-config{padding-right:16px;border-right:1px solid #edf0ee}.filter-fields{grid-template-columns:1fr;gap:14px;margin-bottom:24px}.filter-presets{grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}}
</style>
