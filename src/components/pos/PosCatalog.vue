<template>
 <section class="pos-catalog" aria-label="เลือกสินค้า">
  <div class="pos-catalog-controls">
   <label class="pos-channel"><span>ช่องทางขาย</span><AppSelect data-pos-platform aria-label="ช่องทางขาย" :model-value="platformId" @update:model-value="$emit('platform',$event)"><option v-for="p in platforms" :key="p.id" :value="p.id">{{ p.name }}</option></AppSelect></label>
   <label class="pos-search"><span>ค้นหาเมนู</span><div><Search :size="17" aria-hidden="true"/><input data-pos-search aria-label="ค้นหาเมนู" :value="search" placeholder="ชื่อเมนูหรือรายละเอียด" @input="$emit('update:search',$event.target.value)"></div></label>
  </div>
  <p class="pos-channel-context">{{ selectedPlatform?.gpPercent ? 'ค่าธรรมเนียมช่องทาง '+selectedPlatform.gpPercent+'%' : selectedPlatform ? 'ไม่มีค่าธรรมเนียมช่องทาง' : 'เลือกช่องทางขายก่อนเริ่มออเดอร์' }}</p>
  <nav class="pos-category-strip" aria-label="หมวดเมนู"><button v-for="cat in categories" :key="cat" type="button" :aria-pressed="category===cat" :class="{'is-active':category===cat}" @click="$emit('update:category',cat)">{{ cat }}</button></nav>
  <div class="pos-catalog-scroll">
   <div v-if="menus.length" class="pos-menu-grid"><PosMenuCard v-for="menu in menus" :key="menu.id" :menu="menu" :price="priceFor(menu)" :out-of-stock="unavailableFor(menu)" @select="$emit('select-menu',$event)"/></div>
   <div v-else class="interface-empty"><strong>ไม่พบเมนู</strong><p>ลองเปลี่ยนคำค้นหรือเลือกหมวดอื่น</p><Button variant="secondary" @click="$emit('update:search','');$emit('update:category','ทั้งหมด')">แสดงเมนูทั้งหมด</Button></div>
  </div>
 </section>
</template>
<script setup>
import {computed} from 'vue'
import {Search} from 'lucide-vue-next'
import AppSelect from '@/components/ui/AppSelect.vue'
import Button from '@/components/ui/Button.vue'
import PosMenuCard from './PosMenuCard.vue'
const props=defineProps({menus:{type:Array,required:true},platforms:{type:Array,required:true},platformId:String,search:String,category:String,categories:{type:Array,required:true},priceFor:{type:Function,required:true},unavailableFor:{type:Function,required:true}})
defineEmits(['update:search','update:category','platform','select-menu'])
const selectedPlatform=computed(()=>props.platforms.find(p=>p.id===props.platformId))
</script>
<style scoped>
.pos-catalog{display:flex;flex-direction:column;min-width:0;gap:12px;flex:1}.pos-catalog-controls{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px}.pos-catalog-controls label{min-width:0}.pos-catalog-controls label>span{display:block;font-size:.75rem;font-weight:500;margin-bottom:6px;color:var(--text-muted)}.pos-channel>.app-select{width:100%}
.pos-search>div{display:flex;align-items:center;gap:8px;min-height:44px;padding:8px 12px;background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:10px;color:var(--text-muted)}.pos-search input{width:100%;min-width:0;background:transparent;border:0;outline:none;font-size:.8125rem;color:var(--text-main)}.pos-search>div:focus-within{outline:2px solid var(--accent-brand);outline-offset:2px}
.pos-channel-context{font-size:.75rem;color:var(--text-muted);margin-top:-5px}.pos-category-strip{display:flex;gap:8px;overflow-x:auto;overscroll-behavior-x:contain;flex-shrink:0;padding:2px 0 4px}.pos-category-strip button{min-height:44px;padding:8px 14px;border-radius:10px;background:var(--bg-card);border:1px solid var(--border-subtle);white-space:nowrap;font-size:.8125rem;cursor:pointer}.pos-category-strip button.is-active{background:var(--accent-brand);border-color:var(--accent-brand);color:var(--bg-card)}
.pos-catalog-scroll{min-height:0;flex:1}.pos-menu-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px}
@media(max-width:767px){.pos-catalog-controls{grid-template-columns:minmax(0,1fr)}.pos-menu-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
</style>
