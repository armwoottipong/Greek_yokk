<template>
 <aside data-menu-recipe-panel class="menu-recipe-panel" aria-label="สูตรและวัตถุดิบ">
  <header><div><h3>สูตรและวัตถุดิบ</h3><p>ปริมาณที่ใช้ต่อ 1 เสิร์ฟ</p></div><Button variant="quiet" size="compact" @click="$emit('edit')">แก้ไขสูตร</Button></header>
   <p v-if="menu.hasPackage===false" class="recipe-help">เมนูนี้ไม่ตัดสต็อกบรรจุภัณฑ์ · ต้นทุนวิเคราะห์ไม่รวมบรรจุภัณฑ์</p><section v-for="group in groups" :key="group.label" class="recipe-group"><h4>{{ group.label }} <span>ต่อ 1 เสิร์ฟ · {{ group.items.length }} รายการ</span></h4><article v-for="(item,index) in group.items" :key="index" class="recipe-item"><div><strong>{{ item.mat?.name||'ไม่พบวัตถุดิบ' }}</strong><p>{{ item.qty }} {{ item.mat?.unit||'' }}</p><small v-if="!item.mat">รหัส {{ item.materialId }} · แก้ไขสูตรเพื่อเลือกวัตถุดิบใหม่</small><small v-else-if="item.servingsAvailable!==null">สต็อกพอ {{ item.servingsAvailable }} เสิร์ฟ</small><small v-else>ยังไม่ระบุจำนวนที่ใช้</small><small v-if="item.mat && item.cost===null">ตรวจต้นทุนวัตถุดิบและปริมาณในสูตร</small></div><b>{{ item.cost===null ? 'ยังไม่ทราบต้นทุน' : `฿${item.cost.toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2})}` }}</b></article></section>
   <p v-if="!items.length" class="recipe-help mt-3">ยังไม่มีสูตรวัตถุดิบ</p>

  <section class="recipe-group"><h4>กลุ่มตัวเลือก <span>{{ addonGroups.length }} กลุ่ม</span></h4><article v-for="group in addonGroups" :key="group.id" class="recipe-item"><div><strong>{{ group.name }}</strong><p>{{ group.pricingMode==='included'?'รวมในราคาเมนู':'คิดเงินเพิ่ม' }} · เลือก {{ group.minSelections }}–{{ group.maxSelections }} {{ group.allowRepeat?'ที่ · เลือกซ้ำได้':'ชนิด' }}</p></div></article><p v-if="!addonGroups.length" class="recipe-help">{{ menu.hasAddons===false?'ไม่เปิดให้เลือก Add-on':Array.isArray(menu.addonGroupIds)?'ยังไม่เลือกกลุ่มตัวเลือก':'ใช้ Add-on ทั้งหมดตามเดิม' }}</p></section>
 </aside>
</template>
<script setup>
import {computed} from 'vue'
import Button from '../ui/Button.vue'
const props=defineProps({menu:{type:Object,required:true},items:{type:Array,default:()=>[]},addonGroups:{type:Array,default:()=>[]}})
defineEmits(['edit'])
const groups=computed(()=>[{label:'วัตถุดิบ',items:props.items.filter(i=>i.mat?.inventoryType!=='packaging')},{label:'บรรจุภัณฑ์',items:props.items.filter(i=>i.mat?.inventoryType==='packaging')}].filter(g=>g.items.length))
</script>
<style scoped src="./catalogRecipe.css"></style>
<style scoped>
.menu-recipe-panel{padding:20px;background:var(--bg-card);border-radius:16px;min-width:0;--text-muted:#705C50}.menu-recipe-panel>header{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}.menu-recipe-panel h3{font-size:1rem;font-weight:600;line-height:1.6}.menu-recipe-panel>header p{font-size:.75rem;color:var(--text-muted);margin-top:4px;line-height:1.7}.menu-recipe-panel .recipe-group h4{flex-wrap:wrap}.menu-recipe-panel .recipe-item{gap:8px}.menu-recipe-panel .recipe-item b{font-size:.875rem;max-width:50%;white-space:normal;text-align:end;overflow-wrap:anywhere}.menu-recipe-panel .recipe-item small{display:block;font-size:.75rem;line-height:1.7}.menu-recipe-panel .recipe-group h4>span{font-size:.75rem}.menu-recipe-panel :deep(:focus-visible){outline:none!important;box-shadow:none!important}
</style>
