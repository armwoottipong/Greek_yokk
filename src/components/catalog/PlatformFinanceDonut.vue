<template>
 <figure data-platform-donut class="finance-donut dashboard-donut dashboard-breakdown" :class="{'has-single-selection':!!tooltip}" @keydown.esc.stop="clearSelection">
  <svg viewBox="0 0 120 120" role="group" :aria-label="`สัดส่วนราคาขาย ${row.name}`">
   <circle cx="60" cy="60" r="44" fill="none" stroke="var(--bg-soft)" stroke-width="16"/>
   <circle v-for="segment in segments" :key="segment.key" class="dashboard-donut-slice" :class="{'is-active':active===segment.key}" tabindex="0" role="button" :aria-label="`${segment.label} ${money(segment.value)} ${segment.share.toFixed(1)}%`" :aria-describedby="active===segment.key?tooltipId:undefined" @mouseenter="highlight(segment.key)" @mouseleave="clearHover" @focus="highlight(segment.key)" @blur="clearHover" @click="selectSegment($event,segment)" @keydown.enter="selectSegment($event,segment)" @keydown.space.prevent="selectSegment($event,segment)" :data-donut-profit="segment.key==='profit'?'':undefined" cx="60" cy="60" r="44" fill="none" :stroke="`var(--chart-${segment.key})`" stroke-width="16" pathLength="100" :stroke-dasharray="`${segment.share} ${100-segment.share}`" :stroke-dashoffset="-segment.offset" transform="rotate(-90 60 60)"/>
   <text x="60" y="58" text-anchor="middle">{{ loss ? 'ค่าใช้จ่าย' : 'ราคาขาย' }}</text><text x="60" y="76" text-anchor="middle">ต่อ 1 เสิร์ฟ</text>
  </svg>
  <ChartTooltip :id="tooltipId" :value="tooltip"/>
  <figcaption>{{ total>0 ? loss ? 'สัดส่วนค่าใช้จ่าย: ต้นทุน + GP' : 'สัดส่วนเทียบกับราคาขาย' : 'ไม่มีจำนวนเงินให้แสดงสัดส่วน' }}<small v-if="loss">กำไรติดลบ แสดงยอดขาดทุนแยกด้านล่าง</small></figcaption>
 </figure>
</template>
<script setup>
import {computed} from 'vue'
import ChartTooltip from '@/components/ui/ChartTooltip.vue'
import {useChartMarks} from '@/composables/useChartMarks'
const props=defineProps({cost:{type:Number,required:true},row:{type:Object,required:true}})
const loss=computed(()=>props.row.profit<0)
const total=computed(()=>loss.value ? props.cost+props.row.gpAmount : props.row.price)
const segments=computed(()=>{
 let offset=0
 return [{key:'cost',label:'ต้นทุน',value:props.cost},{key:'gp',label:'GP',value:props.row.gpAmount},{key:'profit',label:'กำไรหลัง GP',value:Math.max(0,props.row.profit)}].filter(s=>s.value>0 && total.value>0).map(segment=>{
  const share=segment.value/total.value*100,result={...segment,share,offset};offset+=share;return result
 })
})
const {tooltipId,tooltip,active,highlight,clearHover,clearSelection,selectMark}=useChartMarks(()=>[props.row,props.cost])
const money=value=>`฿${value.toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2})}`
function selectSegment(event,segment){
 const svg=event.currentTarget.ownerSVGElement,rect=svg.getBoundingClientRect(),angle=(segment.offset+segment.share/2)*Math.PI/50,scale=Math.min(rect.width,rect.height)/120
 selectMark(event,segment.key,{heading:props.row.name,label:segment.label,value:money(segment.value),color:{cost:'#780608',gp:'#B68B55',profit:'#497464'}[segment.key],note:`${segment.share.toFixed(1)}% ${loss.value?'ของค่าใช้จ่าย':'ของราคาขาย'}`},{x:rect.left+rect.width/2+44*scale*Math.sin(angle),y:rect.top+rect.height/2-44*scale*Math.cos(angle)})
}
</script>
<style scoped>
.finance-donut{width:auto;margin:0;display:flex;align-items:center;gap:16px;margin-bottom:16px;min-width:0}.finance-donut svg{width:120px;height:120px;flex-shrink:0}.finance-donut text{font-family:inherit;fill:var(--overview-muted);font-size:11px}.finance-donut figcaption{font-size:.75rem;color:var(--overview-muted);line-height:1.7}.finance-donut small{display:block;margin-top:6px;font-size:inherit}
@media(max-width:479px){.finance-donut{gap:12px}.finance-donut svg{width:104px;height:104px}}
</style>
