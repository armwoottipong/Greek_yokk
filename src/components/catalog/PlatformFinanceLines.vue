<template>
 <figure ref="host" data-platform-lines class="finance-lines">
  <figcaption>เปรียบเทียบค่าต่อ 1 เสิร์ฟตามลำดับช่องทาง · เว้นช่องเมื่อยังไม่มีข้อมูล</figcaption>
  <svg :viewBox="`0 0 ${width} 250`" aria-hidden="true" focusable="false">
   <text x="4" y="15" class="axis-label">บาท</text>
   <g v-for="tick in scale.ticks" :key="tick"><line x1="50" :x2="width-16" :y1="y(tick)" :y2="y(tick)" class="gridline"/><text x="42" :y="y(tick)+4" text-anchor="end" class="axis-label">{{ tick.toLocaleString('th-TH',{maximumFractionDigits:1}) }}</text></g>
   <line data-zero-baseline x1="50" :x2="width-16" :y1="y(0)" :y2="y(0)" class="zero-baseline"/>
   <g v-for="series in seriesRows" :key="series.key">
    <path :d="pathFor(series.key)" fill="none" :stroke="`var(--chart-${series.color})`" stroke-width="2" :stroke-dasharray="series.dash"/>
    <circle v-for="point in pointsFor(series.key)" :key="point.id" :data-line-series="series.key" :data-line-platform="point.id" :cx="point.x" :cy="point.y" r="4" :fill="`var(--chart-${series.color})`" stroke="var(--bg-card)" stroke-width="1.5"/>
   </g>
   <text v-for="(row,index) in rows" :key="row.id" :x="x(index)" y="241" text-anchor="middle" class="axis-label">{{ index+1 }}</text>
  </svg>
  <ol class="line-platform-key" aria-label="ลำดับช่องทางบนกราฟ"><li v-for="(row,index) in rows" :key="row.id"><span>{{ index+1 }}</span>{{ row.name }}</li></ol>
 </figure>
</template>
<script setup>
import {computed,ref,onMounted,onUnmounted} from 'vue'
const props=defineProps({rows:{type:Array,default:()=>[]}})
const host=ref(null),width=ref(640)
let observer
onMounted(()=>{
 if(typeof ResizeObserver==='undefined')return
 observer=new ResizeObserver(entries=>{width.value=Math.max(240,entries[0].contentRect.width)})
 observer.observe(host.value)
})
onUnmounted(()=>observer?.disconnect())
const seriesRows=[{key:'cost',color:'cost',dash:undefined},{key:'gpAmount',color:'gp',dash:'6 4'},{key:'profit',color:'profit',dash:'2 4'}]
const known=value=>typeof value==='number' && Number.isFinite(value)
const scale=computed(()=>{
 const values=props.rows.flatMap(row=>seriesRows.map(s=>row[s.key])).filter(known)
 const low=Math.min(0,...values),high=Math.max(0,...values),raw=(high-low||1)/4,magnitude=10**Math.floor(Math.log10(raw))
 const step=([1,2,5,10].find(n=>n>=raw/magnitude)||10)*magnitude
 const min=Math.floor(low/step)*step,max=Math.max(min+step,Math.ceil(high/step)*step)
 return {min,max,ticks:Array.from({length:Math.round((max-min)/step)+1},(_,i)=>min+i*step)}
})
const x=index=>props.rows.length>1 ? 50+index/(props.rows.length-1)*(width.value-66) : (width.value+34)/2
const y=value=>218-(value-scale.value.min)/(scale.value.max-scale.value.min)*190
const pointsFor=key=>props.rows.flatMap((row,index)=>known(row[key])?[{id:row.id,x:x(index),y:y(row[key])}]:[])
function pathFor(key){
 let connected=false
 return props.rows.map((row,index)=>{
  if(!known(row[key])){connected=false;return ''}
  const command=connected?'L':'M';connected=true;return `${command}${x(index)},${y(row[key])}`
 }).join(' ')
}
</script>
<style scoped>
.finance-lines{min-width:0}.finance-lines figcaption{font-size:.75rem;color:var(--overview-muted);line-height:1.7;margin-bottom:12px}.finance-lines svg{display:block;width:100%;height:auto;overflow:visible}.axis-label{fill:var(--overview-muted);font-family:inherit;font-size:11px;font-variant-numeric:tabular-nums}.gridline{stroke:var(--border-subtle);stroke-width:1}.zero-baseline{stroke:var(--overview-muted);stroke-width:1}.line-platform-key{display:flex;flex-wrap:wrap;gap:8px 20px;font-size:.75rem;color:var(--overview-muted);margin-top:8px}.line-platform-key li{display:flex;align-items:flex-start;gap:6px;overflow-wrap:anywhere}.line-platform-key span{font-weight:600;color:var(--text-main);font-variant-numeric:tabular-nums}
</style>
