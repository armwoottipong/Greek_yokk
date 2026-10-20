<template>
 <div class="dashboard-breakdown" :class="{'has-single-selection':!!tooltip}" @keydown.esc.stop="clearSelection">
  <div class="dashboard-section-heading"><div><h3>{{ title }}</h3><p>{{ subtitle }}</p></div><div v-if="$slots.controls || allowDonut" class="dashboard-breakdown-controls"><slot name="controls" /><SegmentedControl v-if="allowDonut" v-model="mode" label="รูปแบบสัดส่วน" :options="[{value:'bar',label:'แท่ง'},{value:'donut',label:'วงแหวน'}]"/></div></div>
  <p v-if="!rows.length" class="dashboard-empty-small">ยังไม่มีข้อมูลในช่วงนี้</p>
  <div v-else class="dashboard-breakdown-body" :class="{'has-donut':mode==='donut'}">
   <figure v-if="mode==='donut'" class="dashboard-donut"><svg viewBox="0 0 180 180" role="group" :aria-label="`${title} รวม ${money(total)} ${unit}`">
    <circle cx="90" cy="90" r="65" fill="none" stroke="var(--bg-soft)" stroke-width="24" aria-hidden="true"/>
    <DonutSlice v-for="(row,index) in rows" :key="row.id" :data-donut-id="row.id" :class="{'is-active':active===row.id}" :aria-label="`${row.label} ${formattedValue(row)} ${share(row).toFixed(1)}%`" :aria-describedby="active===row.id?tooltipId:undefined" @highlight="highlight(row.id)" @clear="clearHover" @activate="selectRow($event,row,index)" :cx="90" :cy="90" :radius="65" :color="color(index)" :stroke-width="24" :share="share(row)" :offset="offset(index)" />
    <text x="90" y="86" text-anchor="middle" class="donut-label" aria-hidden="true">รวม</text><text x="90" y="107" text-anchor="middle" class="donut-total" aria-hidden="true">{{ money(total) }}</text>
   </svg></figure>
   <ol class="dashboard-ranking"><li v-for="(row,index) in rows" :key="row.id" :class="{'is-active':active===row.id}"><ChartMark as="button" type="button" class="dashboard-ranking-button" :aria-pressed="tooltip?.selection===row.id" :data-ranking-id="row.id" :class="{'is-active':active===row.id}" :aria-describedby="active===row.id?tooltipId:undefined" @highlight="highlight(row.id)" @clear="clearHover" @activate="selectRow($event,row,index)">
    <div class="dashboard-ranking-label"><span><i :style="{background:color(index)}"></i>{{ row.label }}</span><strong>{{ formattedValue(row) }}</strong></div><div v-if="mode==='bar'" class="dashboard-bar-track"><span :style="{width:`${Math.max(0,row.value)/maximum*100}%`,background:color(index)}"></span></div><small v-if="allowDonut">{{ share(row).toFixed(1) }}% ของทั้งหมด</small>
   </ChartMark></li></ol>
  </div>
  <p v-if="rows.length" class="dashboard-breakdown-detail" aria-live="polite"><span v-if="activeRow" :key="active"><strong>{{ activeRow.label }}</strong> {{ formattedValue(activeRow) }}<template v-if="allowDonut"> · {{ share(activeRow).toFixed(1) }}%</template></span><span v-else>คลิกแต่ละส่วนเพื่อดูรายละเอียด</span></p>
  <ChartTooltip :id="tooltipId" :value="tooltip" />
 </div>
</template>
<script setup>
import ChartMark from '@/components/charts/ChartMark.vue'
import '@/components/charts/charts.css'
import {chartPalette} from '@/components/charts/chartPalette'
import DonutSlice from '@/components/charts/DonutSlice.vue'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import {ref,computed,watch,useId} from 'vue'
import {money} from '@/domain/dashboard'
import ChartTooltip from '@/components/ui/ChartTooltip.vue'
import {useChartTooltip} from '@/composables/useChartTooltip'
const props=defineProps({title:{type:String,required:true},subtitle:{type:String,default:''},rows:{type:Array,required:true},unit:{type:String,default:'บาท'},allowDonut:Boolean})
const mode=ref('bar'),hovered=ref(null),tooltipId=`breakdown-${useId()}`
const {tooltip,showTooltip,hideTooltip}=useChartTooltip()
const active=computed(()=>tooltip.value?.selection ?? hovered.value)
watch(tooltip,value=>{if(!value)hovered.value=null},{flush:'sync'})
const activeRow=computed(()=>props.rows.find(row=>row.id===active.value))
function clearSelection(){hovered.value=null;hideTooltip()}
function highlight(id){hovered.value=id}
function clearHover(){hovered.value=null}
watch([()=>props.rows,mode],clearSelection)
const formattedValue=row=>props.unit==='บาท'?`฿${money(row.value)}`:`${money(row.value)} ${props.unit}`
function donutAnchor(event,row,index){
 const svg=event.currentTarget?.ownerSVGElement
 if(!svg)return undefined
 const rect=svg.getBoundingClientRect(),scale=Math.min(rect.width,rect.height)/180
 const cx=rect.left+rect.width/2,cy=rect.top+rect.height/2
 const start=offset(index)*Math.PI/50,end=start+share(row)*Math.PI/50
 let angle=(start+end)/2
 if(event.type==='click' && (event.clientX || event.clientY)){
  const pointerAngle=(Math.atan2(event.clientY-cy,event.clientX-cx)+Math.PI/2+Math.PI*2)%(Math.PI*2)
  const candidates=[pointerAngle-Math.PI*2,pointerAngle,pointerAngle+Math.PI*2]
  const nearest=candidates.sort((a,b)=>Math.abs(a-angle)-Math.abs(b-angle))[0]
  angle=Math.max(start,Math.min(end,nearest))
 }
 return {x:cx+65*scale*Math.sin(angle),y:cy-65*scale*Math.cos(angle)}
}
function selectRow(event,row,index){hovered.value=null;showTooltip(event,{selection:row.id,heading:props.title,label:row.label,value:formattedValue(row),note:props.allowDonut?`${share(row).toFixed(1)}% ของทั้งหมด`:null,color:color(index)},donutAnchor(event,row,index))}
const total=computed(()=>props.rows.reduce((sum,row)=>sum+Math.max(0,row.value),0))
const maximum=computed(()=>Math.max(1,...props.rows.map(r=>r.value)))
const share=row=>total.value?Math.max(0,row.value)/total.value*100:0
const offset=index=>props.rows.slice(0,index).reduce((sum,row)=>sum+share(row),0)
const color=index=>chartPalette[index%chartPalette.length]
</script>
