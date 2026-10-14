<template>
 <DialogFrame id="menu-recipe" :open="open" :title="menu?.name||'รายละเอียดเมนู'" presentation="sheet" description="สูตรและราคาขายของเมนูนี้" @request-close="$emit('close')">
  <template v-if="menu">
   <p class="recipe-description">{{ menu.description }}</p>
   <section class="recipe-prices"><h4>ราคาขายแต่ละช่องทาง</h4><PlatformPriceSummary all :prices="menu.prices||{}" :platforms="platforms" :selected-id="selectedId"/></section>
   <dl class="recipe-summary"><div><dt>ต้นทุนสูตรรวม</dt><dd>฿{{ foodCost.toFixed(2) }}</dd></div><div><dt>ราคาขายหน้าร้าน</dt><dd>{{ storePrice===null?'ยังไม่กำหนดราคา':`฿${storePrice}` }}</dd></div><div><dt>อัตรากำไรขั้นต้น</dt><dd>{{ margin===null?'ยังคำนวณไม่ได้':`${margin.toFixed(1)}%` }}</dd></div></dl>
   <p class="recipe-help">คำนวณจากราคาหน้าร้านและต้นทุนวัตถุดิบ ยังไม่หักค่าธรรมเนียมช่องทาง</p>
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
const props=defineProps({open:Boolean,menu:Object,items:Array,foodCost:Number,storePrice:Number,margin:Number,platforms:Array,selectedId:String})
defineEmits(['close','edit'])
const groups=computed(()=>[{label:'วัตถุดิบ',items:(props.items||[]).filter(i=>i.mat?.inventoryType!=='packaging')},{label:'บรรจุภัณฑ์',items:(props.items||[]).filter(i=>i.mat?.inventoryType==='packaging')}].filter(g=>g.items.length))
</script>
<style scoped src="./catalogRecipe.css"></style>
