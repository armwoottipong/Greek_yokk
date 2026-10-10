<template>
 <div ref="chartRoot" class="dashboard-trend">
  <div class="dashboard-section-heading"><div><h3>แนวโน้มยอดขายและต้นทุน</h3><p>{{ bucketLabel }} · {{ rows.length }} ช่วงเวลา</p></div><div class="dashboard-segments" aria-label="รูปแบบกราฟ"><button v-for="option in modes" :key="option.id" type="button" :data-chart-mode="option.id" :aria-pressed="mode===option.id" @click="mode=option.id"><component :is="option.icon" :size="14" aria-hidden="true" />{{ option.label }}</button></div></div>
  <div class="dashboard-legend"><span v-for="s in series" :key="s.key"><i :style="{background:s.color}"></i>{{ s.label }}</span></div>
  <div v-if="mode==='table'" class="dashboard-table-wrap"><table><caption class="sr-only">ยอดขายรายช่วง</caption><thead><tr><th>ช่วงเวลา</th><th>บิล</th><th v-for="s in series" :key="s.key">{{ s.label }}</th></tr></thead><tbody><tr v-for="row in rows" :key="row.date"><th>{{ dateLabel(row.date) }}</th><td>{{ row.orderCount }}</td><td v-for="s in series" :key="s.key">฿{{ money(row[s.key]) }}</td></tr></tbody></table></div>
  <figure v-else :key="mode" class="dashboard-chart-reveal">
   <svg :viewBox="`0 0 ${chartWidth} 270`" :style="{'--chart-baseline':`${y(0)}px`}" role="img" :aria-label="`กราฟ${mode==='line'?'เส้น':'แท่ง'}ยอดขาย ต้นทุน และกำไรขั้นต้น`">
    <g v-for="tick in ticks" :key="tick"><line x1="62" :x2="chartWidth-22" :y1="y(tick)" :y2="y(tick)" stroke="var(--border-subtle)" :stroke-dasharray="tick===0?undefined:'3 5'"/><text x="52" :y="y(tick)+4" text-anchor="end" class="chart-axis">{{ compact(tick) }}</text></g>
    <template v-for="s in series" :key="s.key">
     <path v-if="mode==='line' && rows.length>1" class="dashboard-chart-line" pathLength="1" :d="path(s.key)" fill="none" :stroke="s.color" stroke-width="2.5" stroke-linejoin="round" />
     <template v-for="(row,index) in rows" :key="row.date">
      <circle v-if="mode==='line'" :cx="x(index)" :cy="y(row[s.key])" r="4" :fill="s.color"><title>{{ dateLabel(row.date) }} · {{ s.label }} ฿{{ money(row[s.key]) }}</title></circle>
      <rect v-else class="dashboard-chart-bar" :x="x(index)+(series.indexOf(s)-1)*barWidth-barWidth/2" :y="Math.min(y(0),y(row[s.key]))" :width="Math.max(0.5,barWidth-1)" :height="Math.abs(y(0)-y(row[s.key]))" rx="2" :fill="s.color"><title>{{ dateLabel(row.date) }} · {{ s.label }} ฿{{ money(row[s.key]) }}</title></rect>
     </template>
    </template>
    <text v-for="index in labels" :key="index" :x="x(index)" y="255" text-anchor="middle" class="chart-axis">{{ shortDate(rows[index].date) }}</text>
    <g v-for="(row,index) in rows" :key="`hit-${row.date}`" tabindex="0" role="button" :aria-label="`${dateLabel(row.date)} ยอดขาย ${money(row.totalSales)} ต้นทุน ${money(row.totalFoodCost)} กำไร ${money(row.grossProfit)}`" @focus="active=index" @mouseenter="active=index" @mouseleave="active=null" @blur="active=null" @click="active=index" @keydown.enter="active=index" @keydown.space.prevent="active=index"><rect :x="x(index)-hitWidth/2" y="14" :width="hitWidth" height="217" fill="transparent" /></g>
   </svg>
   <figcaption class="dashboard-chart-detail" aria-live="polite"><template v-if="active!==null && rows[active]"><strong>{{ dateLabel(rows[active].date) }}</strong><span v-for="s in series" :key="s.key">{{ s.label }} <b>฿{{ money(rows[active][s.key]) }}</b></span></template><span v-else>แตะกราฟเพื่อดูยอดแต่ละช่วง หรือเลือกรูปแบบตาราง</span></figcaption>
  </figure>
 </div>
</template>
<script setup>
import {computed,ref,watch,onMounted,onUnmounted} from 'vue'
import {ChartNoAxesColumn,ChartNoAxesCombined,Table2} from 'lucide-vue-next'
import {money,dateLabel} from '@/domain/dashboard'
const props=defineProps({rows:{type:Array,required:true},bucket:{type:String,default:'day'}})
const mode=ref('line'),active=ref(null)
const chartRoot=ref(null),chartWidth=ref(760)
let resizeObserver
onMounted(()=>{
 if(typeof ResizeObserver==='undefined') return
 resizeObserver=new ResizeObserver(entries=>{chartWidth.value=Math.min(760,Math.max(280,entries[0].contentRect.width))})
 resizeObserver.observe(chartRoot.value)
})
onUnmounted(()=>resizeObserver?.disconnect())
watch(()=>props.rows,()=>{active.value=null})
const modes=[{id:'line',label:'เส้น',icon:ChartNoAxesCombined},{id:'bar',label:'แท่ง',icon:ChartNoAxesColumn},{id:'table',label:'ตาราง',icon:Table2}]
const series=[{key:'totalSales',label:'ยอดขาย',color:'#780608'},{key:'totalFoodCost',label:'ต้นทุนขาย',color:'#B68B55'},{key:'grossProfit',label:'กำไรขั้นต้น',color:'#497464'}]
const bucketLabel=computed(()=>({day:'รายวัน',week:'ราย 7 วัน',month:'รายเดือน'}[props.bucket]))
const bounds=computed(()=>{const values=props.rows.flatMap(r=>series.map(s=>r[s.key]));return {min:Math.min(0,...values),max:Math.max(1,...values)}})
const y=value=>225-(value-bounds.value.min)/(bounds.value.max-bounds.value.min)*200
const x=index=>props.rows.length===1?(chartWidth.value+56)/2:78+index*(chartWidth.value-116)/Math.max(1,props.rows.length-1)
const hitWidth=computed(()=>Math.min(64,(chartWidth.value-116)/Math.max(1,props.rows.length)))
const barWidth=computed(()=>Math.min(18,hitWidth.value/3))
const ticks=computed(()=>Array.from({length:5},(_,i)=>bounds.value.min+(bounds.value.max-bounds.value.min)*i/4))
const labels=computed(()=>[...new Set([0,Math.floor((props.rows.length-1)/3),Math.floor((props.rows.length-1)*2/3),props.rows.length-1])].filter(i=>i>=0))
const path=key=>props.rows.map((row,i)=>`${i?'L':'M'}${x(i)},${y(row[key])}`).join(' ')
const compact=value=>new Intl.NumberFormat('th-TH',{notation:'compact',maximumFractionDigits:1}).format(value)
const shortDate=key=>new Intl.DateTimeFormat('th-TH',{day:props.bucket==='month'?undefined:'numeric',month:'short',year:props.bucket==='month'?'2-digit':undefined,timeZone:'Asia/Bangkok'}).format(new Date(`${key}T12:00:00+07:00`))
</script>
