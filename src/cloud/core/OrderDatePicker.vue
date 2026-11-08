<template>
 <Button variant="secondary" class="date-trigger" :aria-label="`วันที่ออเดอร์ ${dateLabel(day)}`" aria-haspopup="dialog" aria-controls="order-date-picker" :aria-expanded="open" :disabled="disabled" @click="show">
  <CalendarDays :size="18" aria-hidden="true" />
  <span>{{ dateLabel(day) }}</span>
  <ChevronDown :size="15" aria-hidden="true" />
 </Button>
 <DialogFrame id="order-date-picker" title="เลือกวันที่ออเดอร์" width="392px" compact :open="open" initial-focus="[data-calendar-day][tabindex='0']" @request-close="open=false">
  <div class="calendar-month">
   <IconButton label="เดือนก่อนหน้า" :disabled="month===min" @click="moveMonth(-1)"><ChevronLeft :size="20" aria-hidden="true" /></IconButton>
   <p aria-live="polite">{{ monthFormat.format(asDate(month)) }}</p>
   <IconButton label="เดือนถัดไป" :disabled="month>=monthOf(max)" @click="moveMonth(1)"><ChevronRight :size="20" aria-hidden="true" /></IconButton>
  </div>
  <div ref="calendar" class="calendar-days" role="group" aria-label="วันในเดือนที่เลือก" @keydown="moveDay">
   <span v-for="weekday in weekdays" :key="weekday" class="calendar-weekday" aria-hidden="true">{{ weekday }}</span>
   <span v-for="blank in leadingDays" :key="`blank-${blank}`" aria-hidden="true"></span>
   <button v-for="date in dates" :key="date" type="button" :data-calendar-day="date" :aria-label="dateLabel(date)" :aria-pressed="date===day" :aria-current="date===today?'date':undefined" :disabled="date>max" :tabindex="date===activeDay?0:-1" @click="select(date)">{{ Number(date.slice(-2)) }}</button>
  </div>
  <template #footer><Button variant="quiet" @click="select(today)">กลับมาวันนี้</Button></template>
 </DialogFrame>
</template>

<script setup>
import {computed,nextTick,ref,watch} from 'vue'
import {CalendarDays,ChevronDown,ChevronLeft,ChevronRight} from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'
import DialogFrame from '@/components/ui/DialogFrame.vue'
import IconButton from '@/components/ui/IconButton.vue'
import {businessDay,dayKey} from './orderEntry.js'

const props=defineProps({day:String,today:String,max:String,disabled:Boolean})
const emit=defineEmits(['update:day'])
const min='0001-01-01'
const weekdays=['จ.','อ.','พ.','พฤ.','ศ.','ส.','อา.']
const arrows={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7}
const asDate=value=>new Date(`${value}T00:00:00Z`)
const monthOf=value=>`${value.slice(0,7)}-01`
const dateFormat=new Intl.DateTimeFormat('th-TH',{dateStyle:'long',timeZone:'UTC'})
const monthFormat=new Intl.DateTimeFormat('th-TH',{month:'long',year:'numeric',timeZone:'UTC'})
const dateLabel=value=>dateFormat.format(asDate(value))
const open=ref(false),activeDay=ref(props.day),calendar=ref(null)
const month=computed(()=>monthOf(activeDay.value))
const leadingDays=computed(()=>(asDate(month.value).getUTCDay()+6)%7)
const dates=computed(()=>{
 const first=asDate(month.value)
 const start=businessDay(month.value)
 first.setUTCMonth(first.getUTCMonth()+1,0)
 return Array.from({length:first.getUTCDate()},(_,index)=>dayKey(start+index))
})

watch(()=>props.disabled,disabled=>{if(disabled)open.value=false})
function show(){
 activeDay.value=props.day
 open.value=true
}
function select(date){
 if(props.disabled||date>props.max)return
 open.value=false
 if(date!==props.day)emit('update:day',date)
}
function moveMonth(offset){
 const next=asDate(month.value)
 next.setUTCMonth(next.getUTCMonth()+offset)
 activeDay.value=next.toISOString().slice(0,10)
}
async function moveDay(event){
 const offset=arrows[event.key]
 if(offset===undefined||!event.target.dataset.calendarDay)return
 event.preventDefault()
 const next=dayKey(Math.max(businessDay(min),Math.min(businessDay(props.max),businessDay(event.target.dataset.calendarDay)+offset)))
 activeDay.value=next
 await nextTick()
 calendar.value?.querySelector(`[data-calendar-day="${next}"]`)?.focus()
}
</script>

<style scoped>
.date-trigger{gap:8px;font-variant-numeric:tabular-nums}
.calendar-month{display:grid;grid-template-columns:44px 1fr 44px;align-items:center;text-align:center;font-weight:600;font-size:1.125rem;margin-bottom:8px}
.calendar-days{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:2px;text-align:center}
.calendar-weekday{padding:6px 0;color:var(--text-muted);font-size:.75rem}
.calendar-days button{min-height:44px;border-radius:8px;font-variant-numeric:tabular-nums}
.calendar-days button:hover:not(:disabled){background:var(--bg-soft)}
.calendar-days button[aria-current=date]{box-shadow:inset 0 0 0 1px var(--accent-brand);font-weight:600}
.calendar-days button[aria-pressed=true],.calendar-days button[aria-pressed=true]:hover{background:var(--accent-brand);color:var(--bg-card);font-weight:600}
.calendar-days button:disabled{opacity:.38;cursor:not-allowed}
</style>
