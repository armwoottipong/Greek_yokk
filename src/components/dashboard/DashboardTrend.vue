<template>
 <div ref="chartRoot" class="dashboard-trend" @keydown.esc.stop="clearSelection">
  <div class="dashboard-section-heading"><div><h3>แนวโน้มยอดขายและต้นทุน</h3><p>{{ bucketLabel }} · {{ rows.length }} ช่วงเวลา</p></div><div class="dashboard-segments" aria-label="รูปแบบกราฟ"><button v-for="option in modes" :key="option.id" type="button" :data-chart-mode="option.id" :aria-pressed="mode===option.id" @click="mode=option.id"><component :is="option.icon" :size="14" aria-hidden="true" />{{ option.label }}</button></div></div>
  <div class="dashboard-legend"><span v-for="s in series" :key="s.key"><i :style="{background:s.color}"></i>{{ s.label }}</span></div>
  <div v-if="mode==='table'" class="dashboard-table-wrap"><table><caption class="sr-only">ยอดขายรายช่วง</caption><thead><tr><th>ช่วงเวลา</th><th>บิล</th><th v-for="s in series" :key="s.key">{{ s.label }}</th></tr></thead><tbody><tr v-for="row in rows" :key="row.date"><th>{{ dateLabel(row.date) }}</th><td>{{ row.orderCount }}</td><td v-for="s in series" :key="s.key">฿{{ money(row[s.key]) }}</td></tr></tbody></table></div>
  <figure v-else :key="mode" class="dashboard-chart-reveal">
   <svg :viewBox="`0 0 ${chartWidth} 270`" :class="{'has-active-point':active!==null}" :style="{'--chart-baseline':`${y(0)}px`}" role="group" :aria-label="`กราฟ${mode==='line'?'เส้น':'แท่ง'}ยอดขาย ต้นทุน และกำไรขั้นต้น`">
    <rect v-if="active!==null" class="dashboard-hover-band" :x="x(active.index)-hitWidth/2" y="14" :width="hitWidth" height="217" rx="8" fill="var(--accent-soft)" aria-hidden="true" />
    <g v-for="(row,index) in rows" :key="`date-${row.date}`" :data-date-hover="index" tabindex="0" role="group" :aria-label="`${dateLabel(row.date)} ดูทั้งสามค่า`" @mouseenter="selectDate($event,index)" @mousemove="selectDate($event,index)" @mouseleave="clearSelection" @focus="selectDate($event,index)" @blur="clearSelection"><rect :x="dateLeft(index)" y="14" :width="dateRight(index)-dateLeft(index)" height="217" fill="transparent" /></g>
    <g v-for="tick in ticks" :key="tick" aria-hidden="true" pointer-events="none"><line x1="62" :x2="chartWidth-22" :y1="y(tick)" :y2="y(tick)" stroke="var(--border-subtle)" :stroke-dasharray="tick===0?undefined:'3 5'"/><text x="52" :y="y(tick)+4" text-anchor="end" class="chart-axis">{{ compact(tick) }}</text></g>
    <template v-for="s in series" :key="s.key">
     <template v-if="mode==='line' && rows.length>1">
      <path class="dashboard-chart-line" pathLength="1" :d="path(s.key)" fill="none" :stroke="s.color" stroke-width="2.5" stroke-linejoin="round" aria-hidden="true" />
      <path :d="path(s.key)" fill="none" stroke="transparent" stroke-width="12" pointer-events="stroke" @mousemove="selectLine($event,s)" @mouseleave="clearSelection" />
     </template>
     <g v-for="(row,index) in rows" :key="row.date" :data-mark="`${index}-${s.key}`" tabindex="0" role="group" :aria-label="`${dateLabel(row.date)} ${s.label} ฿${money(row[s.key])}`" :aria-describedby="isSelected(index,s.key)?tooltipId:undefined" @mouseenter="selectMark($event,index,s)" @mousemove="selectMark($event,index,s)" @mouseleave="clearSelection" @focus="selectMark($event,index,s)" @blur="clearSelection">
      <template v-if="mode==='line'">
       <circle v-if="isSelected(index,s.key)" class="dashboard-point-halo" :cx="x(index)" :cy="y(row[s.key])" r="11" :fill="s.color" aria-hidden="true" />
       <circle class="dashboard-chart-point" :class="{'is-active':isSelected(index,s.key)}" :cx="x(index)" :cy="y(row[s.key])" r="4" :fill="s.color" />
       <circle :cx="x(index)" :cy="y(row[s.key])" r="10" fill="transparent" />
      </template>
      <rect v-else class="dashboard-chart-bar" :class="{'is-active':isSelected(index,s.key)}" :x="barX(index,s)" :y="Math.min(y(0),y(row[s.key]))" :width="Math.max(0.5,barWidth-1)" :height="Math.abs(y(0)-y(row[s.key]))" rx="2" :fill="s.color" />
     </g>
    </template>
    <text v-for="index in labels" :key="index" :x="x(index)" y="255" text-anchor="middle" class="chart-axis" aria-hidden="true">{{ shortDate(rows[index].date) }}</text>
   </svg>
   <figcaption class="dashboard-chart-detail" aria-live="polite"><template v-if="tooltip"><strong>{{ tooltip.heading }}</strong><template v-if="tooltip.items"><span v-for="item in tooltip.items" :key="item.label">{{ item.label }} <b>{{ item.value }}</b></span></template><span v-else>{{ tooltip.label }} <b>{{ tooltip.value }}</b></span></template><span v-else>ชี้พื้นที่กราฟเพื่อดูทั้ง 3 ค่า หรือชี้แท่ง / เส้นเพื่อดูค่าเดียว</span></figcaption>
  </figure>
  <ChartTooltip :id="tooltipId" :value="tooltip" />
 </div>
</template>
<script setup>
import {computed,ref,watch,onMounted,onUnmounted,useId} from 'vue'
import {ChartNoAxesColumn,ChartNoAxesCombined,Table2} from 'lucide-vue-next'
import {money,dateLabel} from '@/domain/dashboard'
import ChartTooltip from '@/components/ui/ChartTooltip.vue'
import {useChartTooltip} from '@/composables/useChartTooltip'
const props=defineProps({rows:{type:Array,required:true},bucket:{type:String,default:'day'}})
const mode=ref('line'),active=ref(null),tooltipId=`trend-${useId()}`
const {tooltip,showTooltip,hideTooltip}=useChartTooltip()
const chartRoot=ref(null),chartWidth=ref(760)
let resizeObserver
onMounted(()=>{if(typeof ResizeObserver==='undefined') return;resizeObserver=new ResizeObserver(entries=>{chartWidth.value=Math.min(760,Math.max(280,entries[0].contentRect.width))});resizeObserver.observe(chartRoot.value)})
onUnmounted(()=>resizeObserver?.disconnect())
function clearSelection(){active.value=null;hideTooltip()}
watch([()=>props.rows,mode],clearSelection)
const modes=[{id:'line',label:'เส้น',icon:ChartNoAxesCombined},{id:'bar',label:'แท่ง',icon:ChartNoAxesColumn},{id:'table',label:'ตาราง',icon:Table2}]
const series=[{key:'totalSales',label:'ยอดขาย',color:'#780608'},{key:'totalFoodCost',label:'ต้นทุนขาย',color:'#B68B55'},{key:'grossProfit',label:'กำไรขั้นต้น',color:'#497464'}]
const isSelected=(index,key)=>active.value?.index===index && (active.value?.key===key || active.value?.key==='all')
function selectDate(event,index){const row=props.rows[index];if(!row)return;active.value={index,key:'all'};showTooltip(event,{heading:dateLabel(row.date),items:series.map(s=>({label:s.label,value:`฿${money(row[s.key])}`,color:s.color}))})}
function selectMark(event,index,s){const row=props.rows[index];if(!row)return;active.value={index,key:s.key};showTooltip(event,{heading:dateLabel(row.date),label:s.label,value:`฿${money(row[s.key])}`,color:s.color})}
function selectLine(event,s){const rect=event.currentTarget.closest('svg').getBoundingClientRect(),px=(event.clientX-rect.left)/rect.width*chartWidth.value;const index=Math.max(0,Math.min(props.rows.length-1,Math.round((px-78)/(chartWidth.value-116)*(props.rows.length-1))));selectMark(event,index,s)}
const bucketLabel=computed(()=>({day:'รายวัน',week:'ราย 7 วัน',month:'รายเดือน'}[props.bucket]))
const bounds=computed(()=>{const values=props.rows.flatMap(r=>series.map(s=>r[s.key]));return {min:Math.min(0,...values),max:Math.max(1,...values)}})
const y=value=>225-(value-bounds.value.min)/(bounds.value.max-bounds.value.min)*200
const x=index=>props.rows.length===1?(chartWidth.value+56)/2:78+index*(chartWidth.value-116)/Math.max(1,props.rows.length-1)
const hitWidth=computed(()=>Math.min(64,(chartWidth.value-116)/Math.max(1,props.rows.length)))
const dateWidth=computed(()=>props.rows.length>1?(chartWidth.value-116)/(props.rows.length-1):chartWidth.value-116)
const dateLeft=index=>Math.max(62,x(index)-dateWidth.value/2)
const dateRight=index=>Math.min(chartWidth.value-22,x(index)+dateWidth.value/2)
const barWidth=computed(()=>Math.min(18,hitWidth.value/3))
const barX=(index,s)=>x(index)+(series.indexOf(s)-1)*barWidth.value-barWidth.value/2
const ticks=computed(()=>Array.from({length:5},(_,i)=>bounds.value.min+(bounds.value.max-bounds.value.min)*i/4))
const labels=computed(()=>[...new Set([0,Math.floor((props.rows.length-1)/3),Math.floor((props.rows.length-1)*2/3),props.rows.length-1])].filter(i=>i>=0))
const path=key=>props.rows.map((row,i)=>`${i?'L':'M'}${x(i)},${y(row[key])}`).join(' ')
const compact=value=>new Intl.NumberFormat('th-TH',{notation:'compact',maximumFractionDigits:1}).format(value)
const shortDate=key=>new Intl.DateTimeFormat('th-TH',{day:props.bucket==='month'?undefined:'numeric',month:'short',year:props.bucket==='month'?'2-digit':undefined,timeZone:'Asia/Bangkok'}).format(new Date(`${key}T12:00:00+07:00`))
</script>
