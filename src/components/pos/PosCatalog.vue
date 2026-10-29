<template>
 <section class="pos-catalog" aria-label="เลือกสินค้า">
  <header class="pos-catalog-heading"><div><h3>เลือกเมนู</h3><p>เลือกชามโปรด แล้วเพิ่มลงออเดอร์</p></div><span>{{ menus.length }} เมนู</span></header>
  <div class="pos-catalog-controls">
   <div class="pos-channel"><span>ช่องทางขาย</span><div role="tablist" aria-label="ช่องทางขาย" class="pos-platform-tabs"><button v-for="p in activePlatforms" :id="`${tabsId}-${p.id}`" :key="p.id" :disabled="disabled" type="button" role="tab" :aria-selected="platformId === p.id" :tabindex="platformId === p.id ? 0 : -1" :aria-controls="`${tabsId}-panel`" @click="$emit('platform',p.id)" @keydown="switchTab($event,p.id)">{{ p.name }}</button></div></div>
   <label class="pos-search"><span>ค้นหาเมนู</span><div><Search :size="17" aria-hidden="true"/><input type="search" data-pos-search aria-label="ค้นหาเมนู" :value="search" placeholder="ชื่อเมนูหรือรายละเอียด" @input="$emit('update:search',$event.target.value)"></div></label>
  </div>
  <p class="pos-channel-context">{{ selectedPlatform?.gpPercent ? 'ค่าธรรมเนียมช่องทาง '+selectedPlatform.gpPercent+'%' : selectedPlatform ? 'ไม่มีค่าธรรมเนียมช่องทาง' : 'เลือกช่องทางขายก่อนเริ่มออเดอร์' }}</p>
  <div :id="`${tabsId}-panel`" role="tabpanel" :aria-labelledby="`${tabsId}-${platformId}`" class="pos-catalog-scroll">
   <div v-if="menus.length" class="pos-menu-grid"><PosMenuCard v-for="menu in menus" :key="menu.id" :menu="menu" :disabled="disabled" :price="priceFor(menu)" :cart-quantity="cartQuantities[menu.id]||0" :out-of-stock="unavailableFor(menu)" @select="$emit('select-menu',$event)"/></div>
   <div v-else class="interface-empty"><Search :size="28" aria-hidden="true"/><strong>{{ search ? 'ไม่พบเมนู' : 'ยังไม่มีเมนูพร้อมขาย' }}</strong><p>{{ search ? 'ลองค้นหาด้วยชื่อเมนูหรือรายละเอียดอื่น' : 'เพิ่มเมนูและตั้งราคาในหน้าจัดการเมนูก่อนเริ่มขาย' }}</p><Button v-if="search" variant="secondary" @click="$emit('update:search','')">แสดงเมนูทั้งหมด</Button></div>
  </div>
 </section>
</template>
<script setup>
import {computed,useId} from 'vue'
import {Search} from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'
import PosMenuCard from './PosMenuCard.vue'
const props=defineProps({disabled:Boolean,menus:{type:Array,required:true},platforms:{type:Array,required:true},cartQuantities:{type:Object,default:()=>({})},platformId:String,search:String,priceFor:{type:Function,required:true},unavailableFor:{type:Function,required:true}})
const emit=defineEmits(['update:search','platform','select-menu'])
const tabsId=`pos-platform-${useId()}`
const activePlatforms=computed(()=>props.platforms.filter(p=>p.isActive!==false))
function switchTab(event,id){
 if(props.disabled)return
 if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return
 event.preventDefault()
 const platforms=activePlatforms.value,index=platforms.findIndex(p=>p.id===id)
 const next=event.key==='Home'?0:event.key==='End'?platforms.length-1:(index+(event.key==='ArrowRight'?1:-1)+platforms.length)%platforms.length
 emit('platform',platforms[next].id)
 event.currentTarget.parentElement.querySelectorAll('[role="tab"]')[next]?.focus()
}
const selectedPlatform=computed(()=>props.platforms.find(p=>p.id===props.platformId))
</script>
<style scoped>
.pos-catalog{display:flex;flex-direction:column;min-width:0;gap:16px;flex:1;container-type:inline-size}.pos-catalog-heading{display:flex;justify-content:space-between;align-items:center;gap:12px}.pos-catalog-heading h3{font-size:1.125rem;font-weight:600}.pos-catalog-heading p{font-size:.75rem;color:var(--text-muted);margin-top:4px}.pos-catalog-heading>span{font-size:.75rem;white-space:nowrap;color:var(--text-muted)}
.pos-catalog-controls{display:grid;grid-template-columns:minmax(0,1fr);gap:14px}.pos-catalog-controls label,.pos-channel{min-width:0}.pos-catalog-controls label>span,.pos-channel>span{display:block;font-size:.75rem;font-weight:500;margin-bottom:8px;color:var(--text-main)}
.pos-platform-tabs{display:flex;overflow-x:auto;overscroll-behavior-x:contain;scrollbar-width:thin;gap:6px;padding:4px;background:var(--bg-soft);border-radius:14px}.pos-platform-tabs button{flex:1 0 auto;min-width:88px;white-space:nowrap;min-height:44px;padding:10px 12px;border:0;border-radius:10px;color:var(--text-muted);font-size:.8125rem;line-height:1.5;cursor:pointer;overflow-wrap:anywhere}.pos-platform-tabs button:hover{background:var(--accent-soft);color:var(--accent-brand)}.pos-platform-tabs button[aria-selected=true]{background:var(--accent-brand);color:var(--bg-card);font-weight:500}.pos-platform-tabs button:focus-visible{outline:2px solid var(--accent-brand);outline-offset:2px}
.pos-search>div{display:flex;align-items:center;gap:10px;min-height:48px;padding:10px 14px;background:var(--bg-card);border-radius:12px;color:var(--text-muted)}.pos-search input{width:100%;min-width:0;background:transparent;border:0;outline:none;font-size:.8125rem;color:var(--text-main)}.pos-search input::placeholder{color:var(--text-muted);opacity:1}
.pos-channel-context{font-size:.75rem;color:var(--text-muted);margin-top:-8px}
.pos-catalog-scroll{min-height:0;flex:1}.pos-menu-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px;align-content:start}.interface-empty{display:flex;flex-direction:column;align-items:center;padding-block:64px;gap:12px}.interface-empty strong,.interface-empty p{margin:0}
@container(max-width:440px){.pos-catalog-controls{grid-template-columns:minmax(0,1fr)}.pos-menu-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}}
@media(max-width:767px){.pos-catalog-heading p{display:none}.pos-catalog{gap:14px}}
</style>
