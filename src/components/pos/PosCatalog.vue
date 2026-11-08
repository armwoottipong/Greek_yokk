<template>
 <section class="pos-catalog" aria-label="เลือกสินค้า">
  <header class="pos-catalog-heading"><div><h3>เลือกเมนู</h3><p>เลือกชามโปรด แล้วเพิ่มลงออเดอร์</p></div><span>{{ menus.length }} เมนู</span></header>
  <div class="pos-catalog-controls">
   <section class="pos-channel" aria-label="เลือกช่องทางขาย">
    <header class="pos-channel-current">
     <span class="pos-channel-icon"><Store :size="19" aria-hidden="true"/></span>
     <div>
      <span>ช่องทางขาย</span>
      <strong data-current-channel>{{ selectedPlatform?.name || (activePlatforms.length ? 'เลือกช่องทาง' : 'ยังไม่มีช่องทางเปิดขาย') }}</strong>
     </div>
    </header>
    <div v-if="activePlatforms.length" role="tablist" aria-label="ช่องทางขาย" class="pos-platform-tabs" :data-count="activePlatforms.length" :style="{'--channel-count':Math.min(activePlatforms.length,4)}">
     <button v-for="p in activePlatforms" :id="`${tabsId}-${p.id}`" :key="p.id" :disabled="disabled" type="button" role="tab"
      :aria-selected="platformId===p.id" :tabindex="focusPlatformId===p.id ? 0 : -1" :aria-controls="`${tabsId}-panel`"
      @click="$emit('platform',p.id)" @keydown="switchTab($event,p.id)">
      <span class="pos-platform-copy">
       <span class="pos-platform-name">{{ p.name }}</span>
       <small>{{ p.gpPercent>0 ? 'GP '+p.gpPercent+'%' : 'ไม่มี GP' }}</small>
      </span>
      <span class="pos-platform-indicator" aria-hidden="true"><Check v-if="platformId===p.id" :size="12"/></span>
     </button>
    </div>
   </section>
   <label class="pos-search"><span>ค้นหาเมนู</span><div><Search :size="17" aria-hidden="true"/><input type="search" data-pos-search aria-label="ค้นหาเมนู" :value="search" placeholder="ชื่อเมนูหรือรายละเอียด" @input="$emit('update:search',$event.target.value)"></div></label>
  </div>
  <div :id="`${tabsId}-panel`" :role="selectedPlatform ? 'tabpanel' : 'region'" :aria-labelledby="selectedPlatform ? `${tabsId}-${platformId}` : undefined" :aria-label="selectedPlatform ? undefined : 'เมนู'" class="pos-catalog-scroll">
   <div v-if="menus.length" class="pos-menu-grid"><PosMenuCard v-for="menu in menus" :key="menu.id" :menu="menu" :disabled="disabled" :price="priceFor(menu)" :cart-quantity="cartQuantities[menu.id]||0" :out-of-stock="unavailableFor(menu)" @select="$emit('select-menu',$event)"/></div>
   <div v-else class="interface-empty"><Search :size="28" aria-hidden="true"/><strong>{{ search ? 'ไม่พบเมนู' : 'ยังไม่มีเมนูพร้อมขาย' }}</strong><p>{{ search ? 'ลองค้นหาด้วยชื่อเมนูหรือรายละเอียดอื่น' : 'เพิ่มเมนูและตั้งราคาในหน้าจัดการเมนูก่อนเริ่มขาย' }}</p><Button v-if="search" variant="secondary" @click="$emit('update:search','')">แสดงเมนูทั้งหมด</Button></div>
  </div>
 </section>
</template>
<script setup>
import {computed,useId} from 'vue'
import {Check,Search,Store} from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'
import PosMenuCard from './PosMenuCard.vue'
const props=defineProps({disabled:Boolean,menus:{type:Array,required:true},platforms:{type:Array,required:true},cartQuantities:{type:Object,default:()=>({})},platformId:String,search:String,priceFor:{type:Function,required:true},unavailableFor:{type:Function,required:true}})
const emit=defineEmits(['update:search','platform','select-menu'])
const tabsId=`pos-platform-${useId()}`
const activePlatforms=computed(()=>props.platforms.filter(p=>p.isActive!==false))
const selectedPlatform=computed(()=>activePlatforms.value.find(p=>p.id===props.platformId))
const focusPlatformId=computed(()=>selectedPlatform.value?.id??activePlatforms.value[0]?.id)
function switchTab(event,id){
 if(props.disabled)return
 if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return
 event.preventDefault()
 const platforms=activePlatforms.value,index=platforms.findIndex(p=>p.id===id)
 const next=event.key==='Home'?0:event.key==='End'?platforms.length-1:(index+(event.key==='ArrowRight'?1:-1)+platforms.length)%platforms.length
 emit('platform',platforms[next].id)
 event.currentTarget.parentElement.querySelectorAll('[role="tab"]')[next]?.focus()
}
</script>
<style scoped>
.pos-catalog{display:flex;flex-direction:column;min-width:0;gap:16px;flex:1;container-type:inline-size}.pos-catalog-heading{display:flex;justify-content:space-between;align-items:center;gap:12px}.pos-catalog-heading h3{font-size:1.125rem;font-weight:600}.pos-catalog-heading p{font-size:.75rem;color:var(--text-muted);margin-top:4px}.pos-catalog-heading>span{font-size:.75rem;white-space:nowrap;color:var(--text-muted)}
.pos-catalog-controls{display:grid;grid-template-columns:minmax(0,1fr);gap:14px}.pos-catalog-controls label{min-width:0}.pos-catalog-controls label>span{display:block;font-size:.75rem;font-weight:500;margin-bottom:8px;color:var(--text-main)}
.pos-channel{display:grid;grid-template-columns:minmax(150px,1fr) minmax(0,4fr);gap:4px;padding:4px;min-width:0;background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:14px}
.pos-channel-current{display:flex;align-items:center;gap:9px;min-width:0;padding:8px 10px;background:var(--accent-brand);color:var(--bg-card);border-radius:10px}
.pos-channel-current:only-child{grid-column:1/-1}
.pos-channel-current>div{display:grid;gap:1px;min-width:0;overflow-wrap:anywhere}
.pos-channel-current>div>span{font-size:.75rem;line-height:1.4}
.pos-channel-current strong{font-size:.9375rem;font-weight:650;line-height:1.35}
.pos-channel-icon{display:grid;place-items:center;flex:0 0 31px;height:31px;border:1px solid #ffffff66;border-radius:7px}
.pos-platform-tabs{display:grid;grid-template-columns:repeat(var(--channel-count),minmax(0,1fr));gap:1px;overflow:hidden;background:var(--border-subtle);border-radius:10px}
.pos-platform-tabs button{position:relative;display:grid;grid-template-columns:minmax(0,1fr) 16px;align-items:center;gap:6px;min-width:0;min-height:52px;padding:7px 10px;background:var(--bg-card);text-align:start;font-size:.8125rem;line-height:1.4;overflow-wrap:anywhere}
.pos-platform-copy{display:grid;gap:2px}
.pos-platform-name{font-weight:600}
.pos-platform-tabs small{font-size:.75rem;color:var(--text-muted);font-variant-numeric:tabular-nums}
.pos-platform-indicator{width:16px;height:16px;display:grid;place-items:center;border:1px solid var(--control-border);border-radius:50%}
.pos-platform-tabs button:enabled{cursor:pointer}
.pos-platform-tabs button:enabled:hover{background:var(--bg-soft)}
.pos-platform-tabs button[aria-selected=true]{background:var(--accent-soft);color:var(--accent-brand)}
.pos-platform-tabs button[aria-selected=true] .pos-platform-indicator{background:var(--accent-brand);color:var(--bg-card);border-color:var(--accent-brand)}
.pos-platform-tabs button:focus-visible{z-index:1;outline:2px solid var(--accent-brand);outline-offset:-3px}
.pos-platform-tabs button:disabled{opacity:.7}
.pos-search>div{display:flex;align-items:center;gap:10px;min-height:48px;padding:10px 14px;background:var(--bg-card);border-radius:12px;color:var(--text-muted)}.pos-search input{width:100%;min-width:0;background:transparent;border:0;outline:none;font-size:.8125rem;color:var(--text-main)}.pos-search input::placeholder{color:var(--text-muted);opacity:1}
.pos-catalog-scroll{min-height:0;flex:1}.pos-menu-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px;align-content:start}.interface-empty{display:flex;flex-direction:column;align-items:center;padding-block:64px;gap:12px}.interface-empty strong,.interface-empty p{margin:0}
@container(max-width:760px){
 .pos-channel{grid-template-columns:minmax(0,1fr)}
 .pos-channel-current>div{display:flex;align-items:baseline;gap:3px 10px;flex-wrap:wrap}
}
@container(max-width:580px){
 .pos-platform-tabs:not([data-count="1"]){grid-template-columns:repeat(2,minmax(0,1fr))}
 .pos-platform-tabs[data-count="3"] button:last-child{grid-column:1/-1}
 .pos-platform-tabs button{min-height:48px}
}
@container(max-width:440px){.pos-menu-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}}
@media(max-width:767px){.pos-catalog-heading p{display:none}.pos-catalog{gap:14px}}
</style>
