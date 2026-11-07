<template>
 <section data-menu-recipe-panel class="menu-recipe-panel" aria-label="สูตรและวัตถุดิบ">
  <header class="recipe-heading">
   <div><h3>สูตรและวัตถุดิบ</h3><p>ปริมาณที่ใช้ต่อ 1 เสิร์ฟ</p></div>
   <Button variant="quiet" size="compact" @click="$emit('edit')">แก้ไขสูตร</Button>
  </header>
  <section v-for="group in groups" :key="group.label" class="recipe-group" :aria-label="group.label">
   <h4>{{ group.label }} <span>{{ group.items.length }} รายการ</span></h4>
   <p v-if="group.packaging && menu.hasPackage===false" class="recipe-note">ปิดการตัดสต็อกบรรจุภัณฑ์สำหรับเมนูนี้</p>
   <ul v-if="group.items.length" class="recipe-list" role="list">
    <li v-for="(item,index) in group.items" :key="index" class="recipe-item">
     <div class="recipe-material">
      <span class="recipe-thumbnail" aria-hidden="true">
       <EntityImage kind="materials" :entity-id="item.mat?.id" :image="item.mat?.image" :emoji="item.mat?.emoji || (group.packaging ? '📦' : '🥣')" />
      </span>
      <div class="recipe-material-copy">
       <strong>{{ item.mat?.name || 'ไม่พบวัตถุดิบ' }}</strong>
       <p class="recipe-meta">
        <span class="recipe-quantity">{{ item.qty }} {{ item.mat?.unit || '' }}</span>
        <span v-if="!item.mat">รหัส {{ item.materialId }} · แก้ไขสูตรเพื่อเลือกวัตถุดิบใหม่</span>
        <span v-else-if="item.servingsAvailable!==null">สต็อกพอ {{ item.servingsAvailable }} เสิร์ฟ</span>
        <span v-else>ยังไม่ระบุจำนวนที่ใช้</span>
       </p>
       <p v-if="item.mat && item.cost===null" class="recipe-note">ตรวจต้นทุนวัตถุดิบและปริมาณในสูตร</p>
      </div>
     </div>
     <b>{{ item.cost===null ? 'ยังไม่ทราบต้นทุน' : costFormat.format(item.cost) }}</b>
    </li>
   </ul>
   <p v-else class="recipe-note">{{ group.empty }}</p>
  </section>
  <section class="recipe-group" aria-label="กลุ่มตัวเลือก">
   <h4>กลุ่มตัวเลือก <span>{{ addonGroups.length }} กลุ่ม</span></h4>
   <ul v-if="addonGroups.length" class="recipe-list" role="list">
    <li v-for="group in addonGroups" :key="group.id" class="recipe-item">
     <div>
      <strong>{{ group.name }}</strong>
      <p class="recipe-meta">
       <span>เลือก {{ group.minSelections }}–{{ group.maxSelections }} {{ group.allowRepeat ? 'ที่ · เลือกซ้ำได้' : 'ชนิด' }}</span>
      </p>
     </div>
     <span class="recipe-option-price">{{ group.pricingMode==='included' ? 'รวมในราคาเมนู' : 'คิดเงินเพิ่ม' }}</span>
    </li>
   </ul>
   <p v-else class="recipe-note">{{ menu.hasAddons===false ? 'ไม่เปิดให้เลือกตัวเลือกเสริม' : 'ยังไม่เลือกกลุ่มตัวเลือก' }}</p>
  </section>
 </section>
</template>
<script setup>
import {computed} from 'vue'
import Button from '../ui/Button.vue'
import EntityImage from '../images/EntityImage.vue'
const props=defineProps({menu:{type:Object,required:true},items:{type:Array,default:()=>[]},addonGroups:{type:Array,default:()=>[]}})
defineEmits(['edit'])
const costFormat=new Intl.NumberFormat('th-TH',{style:'currency',currency:'THB'})
const groups=computed(()=>[
 {label:'วัตถุดิบ',empty:'ยังไม่มีสูตรวัตถุดิบ',items:props.items.filter(i=>i.mat?.inventoryType!=='packaging')},
 {label:'บรรจุภัณฑ์',empty:'ยังไม่มีบรรจุภัณฑ์ในสูตร',packaging:true,items:props.items.filter(i=>i.mat?.inventoryType==='packaging')}
])
</script>
<style scoped>
.menu-recipe-panel { padding: 20px 24px 24px; min-width: 0; }
.recipe-heading, .recipe-group h4 { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.recipe-heading h3 { font-size: 1rem; font-weight: 600; }
.recipe-heading p, .recipe-note, .recipe-meta, .recipe-group h4 span {
  color: var(--text-muted);
  font-size: .75rem;
  line-height: 1.6;
}
.recipe-heading p { margin-top: 4px; }
.recipe-group { margin-top: 16px; border-top: 1px solid var(--control-border); }
.recipe-group h4 { padding-top: 12px; color: var(--accent-brand); font-size: .875rem; font-weight: 600; }
.recipe-group h4 span { font-weight: 400; white-space: nowrap; }
.recipe-list { margin: 4px 0 0; padding: 0; list-style: none; }
.recipe-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, max-content);
  align-items: baseline;
  gap: 12px;
  padding: 10px 0;
  font-size: .875rem;
  overflow-wrap: anywhere;
}
.recipe-item + .recipe-item { border-top: 1px solid var(--border-subtle); }
.recipe-material { display: flex; align-items: flex-start; gap: 10px; min-width: 0; }
.recipe-thumbnail { flex: none; width: 40px; height: 40px; border-radius: 8px; background: var(--bg-soft); font-size: 1.125rem; }
.recipe-material-copy { min-width: 0; }
.recipe-item strong { font-weight: 500; }
.recipe-meta { display: flex; flex-wrap: wrap; gap: 0 12px; margin-top: 2px; }
.recipe-quantity { color: var(--text-main); font-variant-numeric: tabular-nums; }
.recipe-item b, .recipe-option-price { text-align: end; font-variant-numeric: tabular-nums; }
.recipe-item b { font-weight: 600; }
.recipe-option-price { font-size: .75rem; color: var(--text-muted); }
.recipe-note { margin-top: 6px; }
@media (max-width: 767px) { .menu-recipe-panel { padding: 16px; } }
@media (max-width: 420px) {
  .recipe-item { grid-template-columns: minmax(0, 1fr) minmax(0, 34%); }
  .recipe-thumbnail { width: 32px; height: 32px; font-size: 1rem; }
}
</style>
