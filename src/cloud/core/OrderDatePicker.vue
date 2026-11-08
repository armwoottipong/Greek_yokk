<template>
 <section class="order-calendar" aria-label="ปฏิทินออเดอร์">
  <header class="calendar-heading">
   <h3><CalendarDays :size="18" aria-hidden="true" />ปฏิทินออเดอร์</h3>
   <Button data-calendar-today variant="quiet" size="compact" :disabled="disabled" @click="goToday">วันนี้</Button>
  </header>
  <div class="calendar-month">
   <IconButton label="เดือนก่อนหน้า" :disabled="month===min" @click="browse(-1)"><ChevronLeft :size="20" aria-hidden="true" /></IconButton>
   <p aria-live="polite">{{ monthFormat.format(asDate(month)) }}</p>
   <IconButton label="เดือนถัดไป" :disabled="month>=monthOf(max)" @click="browse(1)"><ChevronRight :size="20" aria-hidden="true" /></IconButton>
  </div>
  <div ref="calendar" class="calendar-days" role="group" aria-label="วันในเดือนที่แสดง" @keydown="moveDay">
   <span v-for="weekday in weekdays" :key="weekday" class="calendar-weekday" aria-hidden="true">{{ weekday }}</span>
   <span v-for="blank in leadingDays" :key="`blank-${blank}`" aria-hidden="true"></span>
   <button v-for="date in dates" :key="date" type="button" :data-calendar-day="date" :aria-label="dateLabel(date)" :aria-pressed="date===day" :aria-current="date===today?'date':undefined" :disabled="!selectable(date)" :tabindex="date===tabStop?0:-1" @click="select(date)">
    {{ Number(date.slice(-2)) }}<span v-if="orderDays.has(date)" class="calendar-order-dot" aria-hidden="true"></span>
   </button>
  </div>
  <div class="calendar-note" aria-live="polite">
   <template v-if="state==='error'"><span>โหลดประวัติเดือนนี้ไม่ได้</span><Button variant="quiet" size="compact" @click="$emit('retry')">ลองใหม่</Button></template>
   <span v-else-if="state==='loading'">กำลังตรวจประวัติเดือนนี้…</span>
   <span v-else-if="state==='offline'">เชื่อมต่อเพื่อดูประวัติย้อนหลัง</span>
   <span v-else><i class="calendar-legend-dot" aria-hidden="true"></i> มีออเดอร์ · วันย้อนหลังที่ไม่มีออเดอร์เลือกไม่ได้</span>
  </div>
 </section>
</template>

<script setup>
import {computed,nextTick,ref,watch} from 'vue'
import {CalendarDays,ChevronLeft,ChevronRight} from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'
import IconButton from '@/components/ui/IconButton.vue'
import {businessDay,dayKey,monthOf,offsetMonth} from './orderEntry.js'

const props=defineProps({day:String,today:String,month:String,max:String,disabled:Boolean,state:String,orderDays:Set})
const emit=defineEmits(['update:day','update:month','retry'])
const min='0001-01-01'
const weekdays=['จ.','อ.','พ.','พฤ.','ศ.','ส.','อา.']
const arrows={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7}
const asDate=value=>new Date(`${value}T00:00:00Z`)
const dateFormat=new Intl.DateTimeFormat('th-TH',{dateStyle:'long',timeZone:'UTC'})
const monthFormat=new Intl.DateTimeFormat('th-TH',{month:'long',year:'numeric',timeZone:'UTC'})
const calendar=ref(null),focusDay=ref(props.day)
const leadingDays=computed(()=>(asDate(props.month).getUTCDay()+6)%7)
const dates=computed(()=>{
 const start=businessDay(props.month)
 const end=businessDay(offsetMonth(props.month,1))
 return Array.from({length:end-start},(_,index)=>dayKey(start+index))
})
const selectable=date=>!props.disabled&&date<=props.max&&(date>=props.today||props.orderDays.has(date))
const tabStop=computed(()=>dates.value.includes(focusDay.value)&&selectable(focusDay.value)?focusDay.value:dates.value.find(selectable))
const dateLabel=date=>dateFormat.format(asDate(date))+(props.orderDays.has(date)?' มีออเดอร์':'')
watch(()=>props.day,day=>{focusDay.value=day})
function select(date){
 if(!selectable(date))return
 focusDay.value=date
 if(date!==props.day)emit('update:day',date)
}
function goToday(){
 emit('update:month',monthOf(props.today))
 select(props.today)
}
function browse(offset){emit('update:month',offsetMonth(props.month,offset))}
async function moveDay(event){
 const offset=arrows[event.key],current=event.target.dataset.calendarDay
 if(offset===undefined||!current)return
 event.preventDefault()
 const index=dates.value.indexOf(current)+offset
 const next=offset<0?dates.value.slice(0,index+1).reverse().find(selectable):dates.value.slice(index).find(selectable)
 if(index<0||!next)return
 focusDay.value=next
 await nextTick()
 calendar.value?.querySelector(`[data-calendar-day="${next}"]`)?.focus()
}
</script>

<style scoped>
.order-calendar{display:grid;gap:8px;min-width:0}
.calendar-heading,.calendar-note{display:flex;align-items:center;justify-content:space-between;gap:8px}
.calendar-heading h3{display:flex;align-items:center;gap:8px;font-size:1.125rem;font-weight:600}
.calendar-heading h3 svg{color:var(--accent-brand)}
.calendar-month{display:grid;grid-template-columns:44px 1fr 44px;align-items:center;text-align:center;font-weight:600}
.calendar-days{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px;text-align:center}
.calendar-weekday{padding:4px 0;color:var(--text-muted);font-size:.75rem}
.calendar-days button{position:relative;min-height:44px;border-radius:8px;font-variant-numeric:tabular-nums}
.calendar-days button:hover:not(:disabled){background:var(--bg-soft)}
.calendar-days button[aria-current=date]{box-shadow:inset 0 0 0 1px var(--accent-brand);font-weight:600}
.calendar-days button[aria-pressed=true],.calendar-days button[aria-pressed=true]:hover{background:var(--accent-brand);color:var(--bg-card);font-weight:600}
.calendar-days button:disabled{opacity:.38;cursor:not-allowed}
.calendar-order-dot,.calendar-legend-dot{display:inline-block;width:5px;height:5px;border-radius:50%;background:currentColor}
.calendar-order-dot{position:absolute;bottom:5px;left:calc(50% - 2.5px)}
.calendar-note{min-height:32px;color:var(--text-muted);font-size:.75rem}
.calendar-legend-dot{margin-inline-end:4px;color:var(--accent-brand);vertical-align:middle}
</style>
