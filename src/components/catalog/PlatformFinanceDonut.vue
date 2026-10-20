<template>
 <figure data-platform-donut class="finance-donut">
  <svg viewBox="0 0 120 120" aria-hidden="true" focusable="false">
   <circle cx="60" cy="60" r="44" fill="none" stroke="var(--bg-soft)" stroke-width="16"/>
   <circle v-for="segment in segments" :key="segment.key" :data-donut-profit="segment.key==='profit'?'':undefined" cx="60" cy="60" r="44" fill="none" :stroke="`var(--chart-${segment.key})`" stroke-width="16" pathLength="100" :stroke-dasharray="`${segment.share} ${100-segment.share}`" :stroke-dashoffset="-segment.offset" transform="rotate(-90 60 60)"/>
   <text x="60" y="58" text-anchor="middle">{{ loss ? 'ค่าใช้จ่าย' : 'ราคาขาย' }}</text><text x="60" y="76" text-anchor="middle">ต่อ 1 {{ unitLabel }}</text>
  </svg>
  <figcaption>{{ total>0 ? loss ? 'สัดส่วนค่าใช้จ่าย: ต้นทุน + GP' : 'สัดส่วนเทียบกับราคาขาย' : 'ไม่มีจำนวนเงินให้แสดงสัดส่วน' }}<small v-if="loss">กำไรติดลบ แสดงยอดขาดทุนแยกด้านล่าง</small></figcaption>
 </figure>
</template>
<script setup>
import {computed} from 'vue'
const props=defineProps({cost:{type:Number,required:true},row:{type:Object,required:true},unitLabel:{type:String,default:'เสิร์ฟ'}})
const loss=computed(()=>props.row.profit<0)
const total=computed(()=>loss.value ? props.cost+props.row.gpAmount : props.row.price)
const segments=computed(()=>{
 let offset=0
 return [{key:'cost',value:props.cost},{key:'gp',value:props.row.gpAmount},{key:'profit',value:Math.max(0,props.row.profit)}].filter(s=>s.value>0 && total.value>0).map(segment=>{
  const share=segment.value/total.value*100,result={...segment,share,offset};offset+=share;return result
 })
})
</script>
<style scoped>
.finance-donut{display:flex;align-items:center;gap:16px;margin-bottom:16px;min-width:0}.finance-donut svg{width:120px;height:120px;flex-shrink:0}.finance-donut text{font-family:inherit;fill:var(--overview-muted);font-size:11px}.finance-donut figcaption{font-size:.75rem;color:var(--overview-muted);line-height:1.7}.finance-donut small{display:block;margin-top:6px;font-size:inherit}
@media(max-width:479px){.finance-donut{gap:12px}.finance-donut svg{width:104px;height:104px}}
</style>
