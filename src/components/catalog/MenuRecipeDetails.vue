<template>
 <DialogFrame id="menu-recipe" :open="open" :title="menu?.name||'รายละเอียดเมนู'" presentation="sheet" description="สูตรและราคาขายของเมนูนี้" @request-close="$emit('close')">
  <template v-if="menu">
   <p class="recipe-description">{{ menu.description }}</p>
   <section class="recipe-prices"><h4>แสดงราคาช่องทาง</h4><PlatformPriceSummary all selectable :prices="menu.prices||{}" :platforms="platforms" :selected-id="selectedId" @select="$emit('platform',$event)"/></section>
   <dl class="recipe-summary recipe-summary--platform">
    <div data-menu-financial="price"><dt>ราคาขาย {{ pricing.platformName }}</dt><dd>{{ pricing.price===null?'ยังไม่กำหนดราคา':money(pricing.price) }}</dd></div>
    <div data-menu-financial="gp"><dt>หัก GP ({{ pricing.gpPercent ?? '—' }}%)</dt><dd>{{ money(pricing.gpAmount) }}</dd></div>
    <div data-menu-financial="net"><dt>รายรับหลังหัก GP</dt><dd>{{ money(pricing.netRevenue) }}</dd></div>
    <div data-menu-financial="cost"><dt>ต้นทุนสูตรรวม</dt><dd>{{ money(foodCost) }}</dd></div>
    <div data-menu-financial="profit"><dt>กำไรขั้นต้นหลังหัก GP</dt><dd>{{ money(pricing.profit) }}</dd></div>
    <div data-menu-financial="margin"><dt>อัตรากำไร / รายรับหลัง GP</dt><dd>{{ pricing.margin===null?'ยังคำนวณไม่ได้':`${pricing.margin.toFixed(1)}%` }}</dd></div>
   </dl>
   <p class="recipe-help">คำนวณกำไรจากรายรับหลังหัก GP ของ {{ pricing.platformName }} เทียบกับต้นทุนสูตรรวม</p>
   <section v-for="group in groups" :key="group.label" class="recipe-group"><h4>{{ group.label }} <span>ต่อ 1 เสิร์ฟ · {{ group.items.length }} รายการ</span></h4><article v-for="(item,index) in group.items" :key="index" class="recipe-item"><div><strong>{{ item.mat?.name||'ไม่พบวัตถุดิบ' }}</strong><p>{{ item.qty }} {{ item.mat?.unit||'' }}</p><small v-if="!item.mat">รหัส {{ item.materialId }} · แก้ไขสูตรเพื่อเลือกวัตถุดิบใหม่</small><small v-else-if="item.servingsAvailable!==null">สต็อกพอ {{ item.servingsAvailable }} เสิร์ฟ</small><small v-else>ยังไม่ระบุจำนวนที่ใช้</small></div><b>฿{{ item.cost.toFixed(2) }}</b></article></section>
   <p v-if="!items.length" class="recipe-help mt-3">ยังไม่มีสูตรวัตถุดิบ</p>
  </template><p v-else>ไม่พบเมนู รายการนี้อาจถูกลบแล้ว</p>
  <template #footer><Button variant="secondary" @click="$emit('close')">ปิด</Button><Button v-if="menu" @click="$emit('edit')">แก้ไขเมนูและสูตร</Button></template>
 </DialogFrame>
</template>
<script setup>
import DialogFrame from '../ui/DialogFrame.vue'
import Button from '../ui/Button.vue'
import PlatformPriceSummary from './PlatformPriceSummary.vue'
import {computed} from 'vue'
const props=defineProps({open:Boolean,menu:Object,items:Array,foodCost:Number,pricing:{type:Object,required:true},platforms:Array,selectedId:String})
const money=value=>value===null?'ยังคำนวณไม่ได้':`${value<0?'-':''}฿${Math.abs(value).toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2})}`
defineEmits(['close','edit','platform'])
const groups=computed(()=>[{label:'วัตถุดิบ',items:(props.items||[]).filter(i=>i.mat?.inventoryType!=='packaging')},{label:'บรรจุภัณฑ์',items:(props.items||[]).filter(i=>i.mat?.inventoryType==='packaging')}].filter(g=>g.items.length))
</script>
<style scoped src="./catalogRecipe.css"></style>
<style scoped>@media(max-width:480px){.recipe-summary--platform{grid-template-columns:repeat(2,minmax(0,1fr));row-gap:18px}}</style>
