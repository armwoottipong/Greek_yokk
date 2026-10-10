<template>
 <div class="dashboard-breakdown">
  <div class="dashboard-section-heading"><div><h3>{{ title }}</h3><p>{{ subtitle }}</p></div><div v-if="allowDonut" class="dashboard-segments" aria-label="รูปแบบสัดส่วน"><button type="button" :aria-pressed="mode==='bar'" @click="mode='bar'">แท่ง</button><button type="button" :aria-pressed="mode==='donut'" @click="mode='donut'">วงแหวน</button></div></div>
  <p v-if="!rows.length" class="dashboard-empty-small">ยังไม่มีข้อมูลในช่วงนี้</p>
  <div v-else class="dashboard-breakdown-body" :class="{'has-donut':mode==='donut'}">
   <figure v-if="mode==='donut'" class="dashboard-donut"><svg viewBox="0 0 180 180" role="img" :aria-label="`${title} รวม ${money(total)} ${unit}`"><circle cx="90" cy="90" r="65" fill="none" stroke="var(--bg-soft)" stroke-width="24"/><circle v-for="(row,index) in rows" :key="row.id" :data-donut-id="row.id" class="dashboard-donut-slice" :class="{'is-active':active===row.id}" @mouseenter="active=row.id" @mouseleave="active=null" @click="active=row.id" cx="90" cy="90" r="65" fill="none" :stroke="color(index)" stroke-width="24" pathLength="100" :stroke-dasharray="`${share(row)} ${100-share(row)}`" :stroke-dashoffset="-offset(index)" transform="rotate(-90 90 90)"><title>{{ row.label }} {{ share(row).toFixed(1) }}%</title></circle><text x="90" y="86" text-anchor="middle" class="donut-label">รวม</text><text x="90" y="107" text-anchor="middle" class="donut-total">{{ money(total) }}</text></svg></figure>
   <ol class="dashboard-ranking"><li v-for="(row,index) in rows" :key="row.id" :data-ranking-id="row.id" :class="{'is-active':active===row.id}" tabindex="0" @mouseenter="active=row.id" @mouseleave="active=null" @focus="active=row.id" @blur="active=null" @click="active=row.id"><div class="dashboard-ranking-label"><span><i :style="{background:color(index)}"></i>{{ row.label }}</span><strong>{{ unit==='บาท'?'฿':'' }}{{ money(row.value) }}{{ unit==='บาท'?'':` ${unit}` }}</strong></div><div v-if="mode==='bar'" class="dashboard-bar-track"><span :style="{width:`${Math.max(0,row.value)/maximum*100}%`,background:color(index)}"></span></div><small v-if="allowDonut">{{ share(row).toFixed(1) }}% ของทั้งหมด</small></li></ol>
  </div>
  <p v-if="rows.length" class="dashboard-breakdown-detail" aria-live="polite"><span v-if="activeRow" :key="active"><strong>{{ activeRow.label }}</strong> {{ unit==='บาท'?'฿':'' }}{{ money(activeRow.value) }}{{ unit==='บาท'?'':` ${unit}` }}<template v-if="allowDonut"> · {{ share(activeRow).toFixed(1) }}%</template></span><span v-else>ชี้หรือแตะกราฟเพื่อดูรายละเอียด</span></p>
 </div>
</template>
<script setup>
import {ref,computed,watch} from 'vue'
import {money} from '@/domain/dashboard'
const props=defineProps({title:{type:String,required:true},subtitle:{type:String,default:''},rows:{type:Array,required:true},unit:{type:String,default:'บาท'},allowDonut:Boolean})
const mode=ref('bar'),active=ref(null)
const activeRow=computed(()=>props.rows.find(row=>row.id===active.value))
watch(()=>props.rows,()=>{active.value=null})
const total=computed(()=>props.rows.reduce((sum,row)=>sum+Math.max(0,row.value),0))
const maximum=computed(()=>Math.max(1,...props.rows.map(r=>r.value)))
const share=row=>total.value?Math.max(0,row.value)/total.value*100:0
const offset=index=>props.rows.slice(0,index).reduce((sum,row)=>sum+share(row),0)
const color=index=>['#780608','#B68B55','#497464','#A45A51','#796E8D','#8A7461'][index%6]
</script>
