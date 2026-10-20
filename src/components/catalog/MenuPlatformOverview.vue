<template>
 <section class="platform-overview" @keydown.esc.stop="clearSelection" aria-label="ภาพรวมทุกแพลตฟอร์ม">
  <header class="overview-heading"><div><h4>ภาพรวมทุกแพลตฟอร์ม</h4><p>รายรับ ต้นทุน และกำไรต่อ 1 เสิร์ฟ</p></div><slot name="controls"/></header>
  <div class="overview-context"><span>{{ estimated ? 'ต้นทุนรวมประมาณการ' : 'ต้นทุนสูตรรวม' }} <strong>{{ money(validCost) }}</strong></span></div>
  <div v-if="rows.length" class="overview-chart-controls"><div class="dashboard-segments" role="group" aria-label="รูปแบบกราฟ"><button v-for="option in modes" :key="option.value" type="button" :aria-pressed="mode===option.value" @click="mode=option.value"><component :is="option.icon" :size="14" aria-hidden="true"/>{{ option.label }}</button></div><p class="overview-guide">{{ mode==='bar' ? 'แท่งใช้สเกลบาทเดียวกัน เพื่อเทียบราคาขายและส่วนที่เหลือ' : mode==='donut' ? 'วงกลมแสดงสัดส่วนภายในแต่ละช่องทาง' : 'เส้นเทียบต้นทุน GP และกำไรข้ามช่องทาง' }}</p></div>
  <ul v-if="rows.length" class="overview-legend" aria-label="ส่วนประกอบของราคาขาย"><li><i class="segment-cost" aria-hidden="true"/>ต้นทุน</li><li><i class="segment-gp" aria-hidden="true"/>GP</li><li><i class="segment-profit" aria-hidden="true"/>กำไร</li></ul>
  <PlatformFinanceLines v-if="mode==='line' && rows.length" :rows="rows"/>
  <div v-if="!rows.length" class="overview-empty">{{ platforms.length ? 'ยังไม่ได้ตั้งราคาขาย แก้ไขเมนูเพื่อเพิ่มราคาของช่องทางที่ต้องการ' : 'ยังไม่มีช่องทางขาย เพิ่มช่องทางในหน้าตั้งค่าเพื่อเปรียบเทียบราคา' }}</div>
  <div class="overview-platforms"><article v-for="row in rows" :key="row.id" :data-menu-platform="row.id" class="platform-report" :aria-labelledby="`${headingId}-${row.id}`">
   <header class="platform-report-heading"><h5 :id="`${headingId}-${row.id}`">{{ row.name }}</h5><div data-menu-financial="price"><span>ราคาขาย</span><strong>{{ money(row.price) }}</strong></div></header>
   <div v-if="row.complete && mode==='bar'" data-platform-chart class="platform-chart dashboard-bar-track" :class="{'has-active-point':active}" role="group" :aria-label="`สัดส่วนราคาขาย ${row.name}`">
    <span v-for="segment in segmentsFor(row)" :key="segment.key" data-chart-segment :data-profit-segment="segment.key==='profit'?'':undefined" class="finance-bar-segment" :class="[`segment-${segment.key}`,{'is-active':active===`${row.id}-${segment.key}`}]" :style="{width:barWidth(segment.value)}" tabindex="0" role="button" :aria-label="`${row.name} ${segment.label} ${money(segment.value)}`" :aria-describedby="active===`${row.id}-${segment.key}` ? tooltipId : undefined" @mouseenter="highlight(`${row.id}-${segment.key}`)" @mouseleave="clearHover" @focus="highlight(`${row.id}-${segment.key}`)" @blur="clearHover" @click="selectSegment($event,row,segment)" @keydown.enter="selectSegment($event,row,segment)" @keydown.space.prevent="selectSegment($event,row,segment)"/>
    <span v-if="row.profit<0" class="sale-price-marker" :style="{insetInlineStart:barWidth(row.price)}"/>
   </div>
   <PlatformFinanceDonut v-if="row.complete && mode==='donut'" :cost="validCost" :row="row"/>
   <p v-if="row.profit<0" class="platform-loss">ขาดทุน {{ money(-row.profit) }} ต่อเสิร์ฟ · ต้นทุนและ GP สูงกว่าราคาขาย</p>
   <p v-if="!row.complete" class="platform-unavailable">{{ row.gpPercent===null ? 'ตรวจ GP ในหน้าตั้งค่า ให้เป็นตัวเลขตั้งแต่ 0 ถึง 100%' : 'ตรวจต้นทุนวัตถุดิบ สูตร และตัวเลือกฟรีให้ครบก่อนคำนวณ' }}</p>
   <dl class="platform-metrics">
    <div data-menu-financial="cost"><dt>ต้นทุน</dt><dd>{{ money(validCost) }}</dd><small>{{ share(validCost,row.price) }}</small></div>
    <div data-menu-financial="gp"><dt>หัก GP ({{ row.gpPercent ?? '—' }}%)</dt><dd>{{ money(row.gpAmount) }}</dd><small>{{ share(row.gpAmount,row.price) }}</small></div>
    <div data-menu-financial="profit" :data-menu-average-profit="estimated && !worst ? '' : undefined" :data-menu-worst-profit="estimated && worst ? '' : undefined" :class="{'is-loss':row.profit<0,'has-profit':row.profit!==null && row.profit>=0}"><dt>{{ row.profit<0 ? 'ขาดทุน' : 'กำไรหลัง GP' }}</dt><dd>{{ money(row.profit) }}</dd><small>{{ share(row.profit,row.price) }}</small></div>
   </dl>
   <div class="platform-net"><span data-menu-financial="net">รายรับหลัง GP <b>{{ money(row.netRevenue) }}</b></span><span data-menu-financial="margin">อัตรากำไร / รายรับหลัง GP <b>{{ row.margin===null ? 'ยังคำนวณไม่ได้' : `${row.margin.toFixed(1)}%` }}</b></span></div>
  </article></div>
  <ChartTooltip :id="tooltipId" :value="tooltip"/>
 </section>
</template>
<script setup>
import {computed,ref,useId} from 'vue'
import {ChartNoAxesColumn,ChartNoAxesCombined,ChartPie} from 'lucide-vue-next'
import '@/assets/dashboard.css'
import ChartTooltip from '@/components/ui/ChartTooltip.vue'
import {useChartMarks} from '@/composables/useChartMarks'
import PlatformFinanceDonut from './PlatformFinanceDonut.vue'
import PlatformFinanceLines from './PlatformFinanceLines.vue'
const props=defineProps({menu:{type:Object,required:true},platforms:{type:Array,default:()=>[]},cost:{type:Number,default:null},estimated:Boolean,worst:Boolean})
const headingId=useId()
const mode=ref('bar')
const modes=[{value:'bar',label:'แท่ง',icon:ChartNoAxesColumn},{value:'donut',label:'วงกลม',icon:ChartPie},{value:'line',label:'เส้น',icon:ChartNoAxesCombined}]
const round=value=>Math.round(value*100)/100
const validCost=computed(()=>props.cost!==null && Number.isFinite(props.cost) && props.cost>=0 ? round(props.cost) : null)
const rows=computed(()=>props.platforms.map(platform=>{
 const raw=props.menu.prices?.[platform.id]
 const price=raw!==undefined && raw!==null && raw!=='' && Number.isFinite(Number(raw)) && Number(raw)>0 ? Number(raw) : null
 const rate=Number(platform.gpPercent ?? 0)
 const gpPercent=Number.isFinite(rate) && rate>=0 && rate<=100 ? rate : null
 const gpAmount=price!==null && gpPercent!==null ? round(price*gpPercent/100) : null
 const netRevenue=gpAmount!==null ? round(price-gpAmount) : null
 const profit=netRevenue!==null && validCost.value!==null ? round(netRevenue-validCost.value) : null
 const margin=netRevenue>0 && profit!==null ? profit/netRevenue*100 : null
 return {...platform,cost:price!==null?validCost.value:null,price,gpPercent,gpAmount,netRevenue,profit,margin,complete:profit!==null}
}).filter(row=>row.price!==null))
const {tooltipId,tooltip,active,highlight,clearHover,clearSelection,selectMark}=useChartMarks(()=>[rows.value,mode.value])
const segmentsFor=row=>[{key:'cost',label:'ต้นทุน',value:validCost.value},{key:'gp',label:'GP',value:row.gpAmount},{key:'profit',label:'กำไรหลัง GP',value:row.profit}].filter(segment=>segment.value>0)
function selectSegment(event,row,segment){selectMark(event,`${row.id}-${segment.key}`,{heading:row.name,label:segment.label,value:money(segment.value),color:{cost:'#780608',gp:'#B68B55',profit:'#497464'}[segment.key],note:share(segment.value,row.price)})}
const maximum=computed(()=>Math.max(1,...rows.value.filter(row=>row.complete).map(row=>Math.max(row.price,validCost.value+row.gpAmount))))
const barWidth=value=>`${Math.max(0,value)/maximum.value*100}%`
const money=value=>value===null?'ยังคำนวณไม่ได้':`${value<0?'-':''}฿${Math.abs(value).toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2})}`
const share=(value,price)=>value!==null && price>0 ? `${(value/price*100).toFixed(1)}% ของราคาขาย` : '—'
</script>
<style scoped>
.platform-overview{container:menu-analysis / inline-size;--chart-cost:var(--accent-brand);--chart-gp:#B68B55;--chart-profit:#497464;--overview-muted:#705C50;display:grid;gap:16px;min-width:0}
.overview-heading,.platform-report-heading{display:flex;justify-content:space-between;align-items:center;gap:16px}.overview-heading h4{font-size:1rem;font-weight:600;line-height:1.5}.overview-heading p,.overview-guide{font-size:.75rem;color:var(--overview-muted);line-height:1.7}.overview-heading{flex-wrap:wrap;align-items:flex-start}.overview-heading p{margin-top:4px}.overview-context{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px 16px;font-size:.8125rem;color:var(--overview-muted)}.overview-context strong{font-size:1rem;color:var(--text-main);font-variant-numeric:tabular-nums;margin-inline-start:8px}
.overview-chart-controls{display:flex;align-items:center;justify-content:space-between;gap:12px 20px;flex-wrap:wrap}.dashboard-segments{flex-shrink:0;font-size:.75rem}.dashboard-segments button{cursor:pointer}
@media(max-width:1199px),(pointer:coarse){.dashboard-segments button{min-height:44px}}
.overview-legend{display:flex;flex-wrap:wrap;gap:12px 20px;font-size:.75rem;color:var(--overview-muted)}.overview-legend li{display:flex;align-items:center;gap:6px}.overview-legend i{width:10px;height:10px;border-radius:3px;display:inline-block;flex-shrink:0}
.segment-cost{background:var(--chart-cost)}.segment-gp{background:var(--chart-gp)}.segment-profit{background:var(--chart-profit)}
.overview-platforms{display:grid;grid-template-columns:minmax(0,1fr);gap:0 24px}.platform-report{padding:20px 0;border-top:1px solid var(--border-subtle);min-width:0}.platform-report-heading{align-items:flex-start;margin-bottom:14px}.platform-report-heading h5{font-size:.875rem;font-weight:600;line-height:1.6;overflow-wrap:anywhere;min-width:0}.platform-report-heading>div{display:grid;gap:2px;text-align:end;flex-shrink:0}.platform-report-heading span{font-size:.75rem;color:var(--overview-muted)}.platform-report-heading strong{font-size:1.125rem;font-weight:600;font-variant-numeric:tabular-nums}
.platform-chart{position:relative;display:flex;height:7px;border-radius:8px;background:var(--bg-soft);margin:0 0 16px;overflow:hidden}.platform-chart>span:not(.sale-price-marker){display:block;height:100%;flex-shrink:0;cursor:pointer}.finance-bar-segment.is-active{filter:brightness(1.16)}.platform-chart.has-active-point .finance-bar-segment:not(.is-active){opacity:.3}.sale-price-marker{position:absolute;height:100%;width:2px;background:var(--bg-card)}
.platform-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.platform-metrics dt{font-size:.75rem;color:var(--overview-muted);line-height:1.6}.platform-metrics dd{font-size:1rem;font-weight:600;font-variant-numeric:tabular-nums;margin-top:4px;overflow-wrap:anywhere}.platform-metrics small{display:block;font-size:.75rem;color:var(--overview-muted);line-height:1.7;margin-top:4px}.platform-metrics>.has-profit dd{color:var(--chart-profit)}.platform-metrics>.is-loss dd{color:var(--accent-red)}
.platform-net{display:flex;flex-wrap:wrap;justify-content:space-between;gap:6px 16px;font-size:.75rem;color:var(--overview-muted);line-height:1.7;margin-top:16px}.platform-net b{font-weight:500;font-variant-numeric:tabular-nums}.platform-loss,.platform-unavailable,.overview-empty{font-size:.8125rem;line-height:1.7;margin-bottom:16px}.platform-loss{color:var(--accent-red)}.platform-unavailable,.overview-empty{color:var(--overview-muted)}
.platform-metrics>[data-menu-financial=profit]:is(.has-profit,.is-loss) dd{font-size:1.25rem}
@container menu-analysis (min-width:728px){.overview-platforms{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:479px){.platform-report{padding:16px 0}.platform-report-heading{gap:10px}.platform-report-heading h5{font-size:.8125rem;flex:1}.platform-report-heading>div{flex-shrink:1;max-width:48%}.platform-metrics{gap:8px}.platform-metrics dd{font-size:1rem}.platform-metrics>[data-menu-financial=profit]:is(.has-profit,.is-loss) dd{font-size:1.125rem}.platform-metrics small{font-size:.75rem}.platform-net{display:grid;gap:4px}.overview-context{align-items:flex-start}.overview-heading h4{font-size:.9375rem}}
</style>
