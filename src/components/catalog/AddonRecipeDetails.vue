<template>
 <div id="addon-details" class="addon-detail-workspace">
  <section class="addon-analysis" aria-label="ข้อมูลวิเคราะห์ Add-on">
   <MenuPlatformOverview :menu="addon" :platforms="platforms" :cost="cost" include-zero-prices unit-label="ที่" price-label="ราคาบวกเพิ่ม" entity-label="Add-on"/>
   <p class="recipe-help addon-analysis-note">เปรียบเทียบเมื่อคิดราคามาตรฐาน Add-on แยกตามช่องทาง · ไม่รวมราคาเมนูหลัก ราคาเฉพาะกลุ่ม หรือรายการที่รวมฟรีในเมนู</p>
  </section>
  <aside data-addon-recipe-panel class="addon-recipe-panel" aria-label="สูตรและวัตถุดิบ Add-on">
   <header><div><h3>สูตรและวัตถุดิบ</h3><p>ปริมาณที่ใช้ต่อ 1 ที่</p></div><Button variant="quiet" size="compact" @click="$emit('edit',{section:'recipe'})">แก้ไขสูตร</Button></header>
   <p v-if="!items.length" class="recipe-help">ไม่ตัดวัตถุดิบหรือบรรจุภัณฑ์</p>
   <section v-for="group in groups" :key="group.type" :data-addon-ingredients="group.type==='ingredient'?'':undefined" :data-addon-packaging="group.type==='packaging'?'':undefined" class="recipe-group">
    <h4>{{ group.label }} <span>{{ group.items.length }} รายการ</span></h4>
    <p class="recipe-help">{{ group.cost===null?'ยังไม่ทราบต้นทุน':`ต้นทุนประมาณ ${money(group.cost)}` }}</p>
    <article v-for="(item,index) in group.items" :key="index" class="recipe-item"><div><strong>{{ item.mat?.name||'ไม่พบวัตถุดิบ' }}</strong><p>{{ item.qty }} {{ item.mat?.unit||'' }}</p><small v-if="!item.mat">รหัส {{ item.materialId }} · แก้ไขสูตรเพื่อเลือกรายการใหม่</small><small v-else-if="item.mat.isDeleted||item.mat.isArchived">ถูกจัดเก็บ กรุณาแก้ไขสูตร</small><small v-else-if="item.servingsAvailable!==null">สต็อกพอ {{ item.servingsAvailable }} ที่</small><small v-else>ยังไม่ระบุปริมาณที่ใช้</small></div><b>{{ item.cost===null?'ยังไม่ทราบต้นทุน':money(item.cost) }}</b></article>
   </section>
   <section class="recipe-group"><h4>กลุ่มที่ใช้ Add-on นี้ <span>{{ usedGroups.length }} กลุ่ม</span></h4><p v-if="!usedGroups.length" class="recipe-help">ยังไม่ถูกใช้ในกลุ่มตัวเลือก</p><article v-for="group in usedGroups" :key="group.id" class="recipe-item"><div><strong>{{ group.name }}</strong><p>{{ group.pricingMode==='included'?'รวมในราคาเมนู':'คิดเงินเพิ่ม' }}</p></div></article></section>
  </aside>
 </div>
</template>
<script setup>
import {computed} from 'vue'
import MenuPlatformOverview from './MenuPlatformOverview.vue'
import Button from '../ui/Button.vue'
const props=defineProps({addon:{type:Object,required:true},items:{type:Array,default:()=>[]},cost:{type:Number,default:null},platforms:{type:Array,default:()=>[]},usedGroups:{type:Array,default:()=>[]}})
defineEmits(['edit'])
const groups=computed(()=>[{type:'ingredient',label:'วัตถุดิบ'},{type:'packaging',label:'บรรจุภัณฑ์'}].map(group=>{
 const items=props.items.filter(item=>(item.mat?.inventoryType==='packaging'?'packaging':'ingredient')===group.type)
 return {...group,items,cost:items.some(item=>item.cost===null)?null:items.reduce((sum,item)=>sum+item.cost,0)}
}).filter(group=>group.items.length))
const money=value=>`฿${value.toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2})}`
</script>
<style scoped src="./catalogRecipe.css"></style>
<style scoped>
.addon-detail-workspace{display:grid;gap:24px;align-items:start;min-width:0}.addon-analysis{padding:24px;background:var(--bg-card);border-radius:16px;min-width:0}.addon-analysis-note{margin:16px 0 0;color:var(--text-muted)}.addon-recipe-panel{padding:20px;background:var(--bg-card);border-radius:16px;min-width:0}.addon-recipe-panel>header{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:16px}.addon-recipe-panel h3{font-size:1rem;font-weight:600;line-height:1.6}.addon-recipe-panel>header p{font-size:.75rem;line-height:1.7;color:var(--text-muted);margin-top:4px}.addon-recipe-panel .recipe-group h4{flex-wrap:wrap}.addon-recipe-panel .recipe-item small{display:block;font-size:.75rem;line-height:1.7}.addon-recipe-panel .recipe-item b{max-width:50%;white-space:normal;overflow-wrap:anywhere;text-align:end}.addon-recipe-panel .recipe-group h4>span{font-size:.75rem}
@container menu-content (min-width:840px){.addon-detail-workspace{grid-template-columns:minmax(0,1fr) 288px}}
@container menu-content (max-width:560px){.addon-analysis{padding:16px}}
</style>
