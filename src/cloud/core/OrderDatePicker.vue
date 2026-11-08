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
   <button v-for="date in dates" :key="date" type="button" :data-calendar-day="date" :class="{'calendar-day--marked':draftDays.has(date)||orderDays.has(date)}" :aria-label="dateLabel(date)" :aria-pressed="date===day" :aria-current="date===today?'date':undefined" :disabled="!selectable(date)" :tabindex="date===tabStop?0:-1" @click="select(date)">
    <span class="calendar-date-number">{{ Number(date.slice(-2)) }}</span>
    <span class="calendar-stickers" aria-hidden="true">
     <Transition name="calendar-sticker"><span v-if="draftDays.has(date)" class="calendar-cart" data-calendar-cart></span></Transition>
     <Transition name="calendar-sticker"><img v-if="orderDays.has(date)" :src="date===day?lightOrderSticker:darkOrderSticker" alt="" width="19" height="19" class="calendar-order" data-calendar-order /></Transition>
    </span>
   </button>
  </div>
  <div class="calendar-note" aria-live="polite">
   <template v-if="state==='error'"><span>โหลดประวัติเดือนนี้ไม่ได้</span><Button variant="quiet" size="compact" @click="$emit('retry')">ลองใหม่</Button></template>
   <span v-else-if="state==='loading'">กำลังตรวจประวัติเดือนนี้…</span>
   <span v-else-if="state==='offline'">เชื่อมต่อเพื่อดูประวัติย้อนหลัง</span>
   <div v-else class="calendar-legend">
    <span><span class="calendar-cart" aria-hidden="true"></span>มีตะกร้าร่าง</span>
    <span><img :src="darkOrderSticker" alt="" width="18" height="18" />มีออเดอร์</span>
   </div>
  </div>
 </section>
</template>

<script setup>
import {computed,nextTick,ref,watch} from 'vue'
import {CalendarDays,ChevronLeft,ChevronRight} from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'
import IconButton from '@/components/ui/IconButton.vue'
import {businessDay,dayKey,monthOf,offsetMonth} from './orderEntry.js'

const props=defineProps({day:String,today:String,month:String,max:String,disabled:Boolean,state:String,orderDays:Set,draftDays:{type:Set,default:()=>new Set()}})
const emit=defineEmits(['update:day','update:month','retry'])
const min='0001-01-01'
const lightOrderSticker=`${import.meta.env.BASE_URL}brand/order-sticker.svg?v=cream`
const darkOrderSticker=`${import.meta.env.BASE_URL}brand/order-sticker-dark.svg`
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
const dateLabel=date=>[dateFormat.format(asDate(date)),props.draftDays.has(date)&&'มีตะกร้าร่าง',props.orderDays.has(date)&&'มีออเดอร์'].filter(Boolean).join(' · ')
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
.calendar-month{display:grid;grid-template-columns:44px 1fr 44px;align-items:center;text-align:center;font-weight:600;background:var(--bg-soft);border-radius:12px}
.calendar-days{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px;text-align:center}
.calendar-weekday{padding:4px 0;color:var(--text-muted);font-size:.75rem}
.calendar-days button{position:relative;min-height:48px;border-radius:10px;background:var(--accent-soft);font-variant-numeric:tabular-nums}
.calendar-days button:hover:not(:disabled){background:var(--bg-soft)}
.calendar-days button[aria-current=date]{box-shadow:inset 0 0 0 1px var(--accent-brand);font-weight:600}
.calendar-days button[aria-pressed=true],.calendar-days button[aria-pressed=true]:hover{background:var(--accent-brand);color:var(--bg-card);font-weight:600}
.calendar-days button:disabled{background:transparent;cursor:not-allowed}
.calendar-days button:disabled .calendar-date-number{opacity:.55}
.calendar-days button[aria-pressed=true]:disabled{background:var(--accent-brand)}
.calendar-days button[aria-pressed=true]:disabled .calendar-date-number{opacity:1}
.calendar-day--marked .calendar-date-number{display:inline-block;transform:translateY(-6px)}
.calendar-stickers{position:absolute;inset-inline-end:3px;inset-block-end:2px;display:flex;align-items:center;gap:1px;max-width:calc(100% - 5px);pointer-events:none}
.calendar-cart{display:inline-block;width:17px;height:17px;background-color:var(--accent-brand);mask:url('@/assets/calendar-draft-cart.svg') center/contain no-repeat}
.calendar-stickers .calendar-cart,.calendar-order{min-width:0;transform-origin:bottom right}
.calendar-order{width:19px;height:19px;object-fit:contain;transform:rotate(7deg)}
.calendar-days button[aria-pressed=true] .calendar-cart{background-color:var(--bg-card)}
.calendar-note{min-height:32px;color:var(--text-muted);font-size:.75rem}
.calendar-legend,.calendar-legend span{display:flex;align-items:center;gap:4px;flex-wrap:wrap}
.calendar-legend{gap:6px 16px}
@media(prefers-reduced-motion:no-preference){
 .calendar-days button{transition:background-color 150ms ease,color 150ms ease,transform 150ms ease}
 .calendar-days button:active:not(:disabled){transform:scale(.97)}
 .calendar-sticker-enter-active{animation:sticker-place 220ms cubic-bezier(.16,1,.3,1)}
 @keyframes sticker-place{from{opacity:0;scale:.65;translate:0 -3px}}
}
@media(max-width:480px){
 .calendar-stickers{inset-inline-end:2px}
 .calendar-stickers .calendar-cart{width:14px;height:14px}
 .calendar-order{width:16px;height:16px}
}
</style>
