<template>
 <section class="pos-catalog" aria-label="เลือกสินค้า">
  <header class="pos-catalog-heading"><div><h3>เลือกเมนู</h3><p>เลือกชามโปรด แล้วเพิ่มลงออเดอร์</p></div><span>{{ menus.length }} เมนู</span></header>
  <div class="pos-catalog-controls">
   <label class="pos-channel"><span>ช่องทางขาย</span><AppSelect data-pos-platform aria-label="ช่องทางขาย" :model-value="platformId" @update:model-value="$emit('platform',$event)"><option v-for="p in platforms" :key="p.id" :value="p.id">{{ p.name }}</option></AppSelect></label>
   <label class="pos-search"><span>ค้นหาเมนู</span><div><Search :size="17" aria-hidden="true"/><input type="search" data-pos-search aria-label="ค้นหาเมนู" :value="search" placeholder="ชื่อเมนูหรือรายละเอียด" @input="$emit('update:search',$event.target.value)"></div></label>
  </div>
  <p class="pos-channel-context">{{ selectedPlatform?.gpPercent ? 'ค่าธรรมเนียมช่องทาง '+selectedPlatform.gpPercent+'%' : selectedPlatform ? 'ไม่มีค่าธรรมเนียมช่องทาง' : 'เลือกช่องทางขายก่อนเริ่มออเดอร์' }}</p>
  <div class="pos-catalog-scroll">
   <div v-if="menus.length" class="pos-menu-grid"><PosMenuCard v-for="menu in menus" :key="menu.id" :menu="menu" :price="priceFor(menu)" :cart-quantity="cartQuantities[menu.id]||0" :out-of-stock="unavailableFor(menu)" @select="$emit('select-menu',$event)"/></div>
   <div v-else class="interface-empty"><Search :size="28" aria-hidden="true"/><strong>{{ search ? 'ไม่พบเมนู' : 'ยังไม่มีเมนูพร้อมขาย' }}</strong><p>{{ search ? 'ลองค้นหาด้วยชื่อเมนูหรือรายละเอียดอื่น' : 'เพิ่มเมนูและตั้งราคาในหน้าจัดการเมนูก่อนเริ่มขาย' }}</p><Button v-if="search" variant="secondary" @click="$emit('update:search','')">แสดงเมนูทั้งหมด</Button></div>
  </div>
 </section>
</template>
<script setup>
import {computed} from 'vue'
import {Search} from 'lucide-vue-next'
import AppSelect from '@/components/ui/AppSelect.vue'
import Button from '@/components/ui/Button.vue'
import PosMenuCard from './PosMenuCard.vue'
const props=defineProps({menus:{type:Array,required:true},platforms:{type:Array,required:true},cartQuantities:{type:Object,default:()=>({})},platformId:String,search:String,priceFor:{type:Function,required:true},unavailableFor:{type:Function,required:true}})
defineEmits(['update:search','platform','select-menu'])
const selectedPlatform=computed(()=>props.platforms.find(p=>p.id===props.platformId))
</script>
<style scoped>
.pos-catalog{display:flex;flex-direction:column;min-width:0;gap:16px;flex:1;container-type:inline-size}.pos-catalog-heading{display:flex;justify-content:space-between;align-items:center;gap:12px}.pos-catalog-heading h3{font-size:1.125rem;font-weight:600}.pos-catalog-heading p{font-size:.75rem;color:var(--text-muted);margin-top:4px}.pos-catalog-heading>span{font-size:.75rem;white-space:nowrap;color:var(--text-muted)}
.pos-catalog-controls{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.2fr);gap:12px}.pos-catalog-controls label{min-width:0}.pos-catalog-controls label>span{display:block;font-size:.75rem;font-weight:500;margin-bottom:8px;color:var(--text-main)}.pos-channel>.app-select{width:100%}.pos-channel :deep(.app-select-trigger){background:var(--bg-card);border-color:transparent;font-size:.8125rem;border-radius:12px;min-height:48px;box-shadow:none}
.pos-search>div{display:flex;align-items:center;gap:10px;min-height:48px;padding:10px 14px;background:var(--bg-card);border-radius:12px;color:var(--text-muted)}.pos-search input{width:100%;min-width:0;background:transparent;border:0;outline:none;font-size:.8125rem;color:var(--text-main)}.pos-search input::placeholder{color:var(--text-muted);opacity:1}
.pos-channel-context{font-size:.75rem;color:var(--text-muted);margin-top:-8px}
.pos-catalog-scroll{min-height:0;flex:1}.pos-menu-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px;align-content:start}.interface-empty{display:flex;flex-direction:column;align-items:center;padding-block:64px;gap:12px}.interface-empty strong,.interface-empty p{margin:0}
@container(max-width:440px){.pos-catalog-controls{grid-template-columns:minmax(0,1fr)}.pos-menu-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}}
@media(max-width:767px){.pos-catalog-heading p{display:none}.pos-catalog{gap:14px}}
</style>
