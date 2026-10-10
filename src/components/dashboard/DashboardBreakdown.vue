<template>
 <div class="dashboard-breakdown" @keydown.esc.stop="clearSelection">
  <div class="dashboard-section-heading"><div><h3>{{ title }}</h3><p>{{ subtitle }}</p></div><div v-if="allowDonut" class="dashboard-segments" aria-label="รูปแบบสัดส่วน"><button type="button" :aria-pressed="mode==='bar'" @click="mode='bar'">แท่ง</button><button type="button" :aria-pressed="mode==='donut'" @click="mode='donut'">วงแหวน</button></div></div>
  <p v-if="!rows.length" class="dashboard-empty-small">ยังไม่มีข้อมูลในช่วงนี้</p>
  <div v-else class="dashboard-breakdown-body" :class="{'has-donut':mode==='donut'}">
   <figure v-if="mode==='donut'" class="dashboard-donut"><svg viewBox="0 0 180 180" role="group" :aria-label="`${title} รวม ${money(total)} ${unit}`">
    <circle cx="90" cy="90" r="65" fill="none" stroke="var(--bg-soft)" stroke-width="24" aria-hidden="true"/>
    <circle v-for="(row,index) in rows" :key="row.id" :data-donut-id="row.id" class="dashboard-donut-slice" :class="{'is-active':active===row.id}" tabindex="0" role="button" :aria-label="`${row.label} ${formattedValue(row)} ${share(row).toFixed(1)}%`" :aria-describedby="active===row.id?tooltipId:undefined" @mouseenter="selectRow($event,row,index)" @mousemove="selectRow($event,row,index)" @mouseleave="clearSelection" @focus="selectRow($event,row,index)" @blur="clearSelection" @click="selectRow($event,row,index)" @keydown.enter="selectRow($event,row,index)" @keydown.space.prevent="selectRow($event,row,index)" cx="90" cy="90" r="65" fill="none" :stroke="color(index)" stroke-width="24" pathLength="100" :stroke-dasharray="`${share(row)} ${100-share(row)}`" :stroke-dashoffset="-offset(index)" transform="rotate(-90 90 90)" />
    <text x="90" y="86" text-anchor="middle" class="donut-label" aria-hidden="true">รวม</text><text x="90" y="107" text-anchor="middle" class="donut-total" aria-hidden="true">{{ money(total) }}</text>
   </svg></figure>
   <ol class="dashboard-ranking"><li v-for="(row,index) in rows" :key="row.id" :data-ranking-id="row.id" :class="{'is-active':active===row.id}" tabindex="0" :aria-describedby="active===row.id?tooltipId:undefined" @mouseenter="selectRow($event,row,index)" @mousemove="selectRow($event,row,index)" @mouseleave="clearSelection" @focus="selectRow($event,row,index)" @blur="clearSelection" @click="selectRow($event,row,index)">
    <div class="dashboard-ranking-label"><span><i :style="{background:color(index)}"></i>{{ row.label }}</span><strong>{{ formattedValue(row) }}</strong></div><div v-if="mode==='bar'" class="dashboard-bar-track"><span :style="{width:`${Math.max(0,row.value)/maximum*100}%`,background:color(index)}"></span></div><small v-if="allowDonut">{{ share(row).toFixed(1) }}% ของทั้งหมด</small>
   </li></ol>
  </div>
  <p v-if="rows.length" class="dashboard-breakdown-detail" aria-live="polite"><span v-if="activeRow" :key="active"><strong>{{ activeRow.label }}</strong> {{ formattedValue(activeRow) }}<template v-if="allowDonut"> · {{ share(activeRow).toFixed(1) }}%</template></span><span v-else>ชี้หรือแตะแต่ละส่วนเพื่อดูรายละเอียด</span></p>
  <ChartTooltip :id="tooltipId" :value="tooltip" />
 </div>
</template>
<script setup>
import {ref,computed,watch,useId} from 'vue'
import {money} from '@/domain/dashboard'
import ChartTooltip from '@/components/ui/ChartTooltip.vue'
import {useChartTooltip} from '@/composables/useChartTooltip'
const props=defineProps({title:{type:String,required:true},subtitle:{type:String,default:''},rows:{type:Array,required:true},unit:{type:String,default:'บาท'},allowDonut:Boolean})
const mode=ref('bar'),active=ref(null),tooltipId=`breakdown-${useId()}`
const {tooltip,showTooltip,hideTooltip}=useChartTooltip()
const activeRow=computed(()=>props.rows.find(row=>row.id===active.value))
function clearSelection(){active.value=null;hideTooltip()}
watch([()=>props.rows,mode],clearSelection)
const formattedValue=row=>props.unit==='บาท'?`฿${money(row.value)}`:`${money(row.value)} ${props.unit}`
function selectRow(event,row,index){active.value=row.id;showTooltip(event,{heading:props.title,label:row.label,value:formattedValue(row),note:props.allowDonut?`${share(row).toFixed(1)}% ของทั้งหมด`:null,color:color(index)})}
const total=computed(()=>props.rows.reduce((sum,row)=>sum+Math.max(0,row.value),0))
const maximum=computed(()=>Math.max(1,...props.rows.map(r=>r.value)))
const share=row=>total.value?Math.max(0,row.value)/total.value*100:0
const offset=index=>props.rows.slice(0,index).reduce((sum,row)=>sum+share(row),0)
const color=index=>['#780608','#B68B55','#497464','#A45A51','#796E8D','#8A7461'][index%6]
</script>
