<template>
 <section class="pos-catalog" aria-label="เลือกสินค้า">
  <header class="pos-catalog-heading"><div><h3>เลือกเมนู</h3><p>เลือกชามโปรด แล้วเพิ่มลงออเดอร์</p></div><span>{{ menus.length }} เมนู</span></header>
  <div class="pos-catalog-controls">
   <div class="pos-channel">
    <span class="pos-control-label">ช่องทางขาย</span>
    <div class="pos-channel-control">
     <span class="pos-channel-icon" aria-hidden="true"><Store :size="17"/></span>
     <AppSelect v-if="!mobile" class="pos-channel-select" data-pos-channel aria-label="ช่องทางขาย"
      :model-value="selectedPlatform?.id || ''" :placeholder="channelPlaceholder" :disabled="!canChoose" fit-content
      @update:model-value="selectChannel">
      <option v-for="platform in activePlatforms" :key="platform.id" :value="platform.id">{{ platform.name }} · {{ gpLabel(platform) }}</option>
     </AppSelect>
     <button v-else type="button" class="pos-channel-trigger" data-pos-channel aria-haspopup="dialog"
      :aria-label="selectedPlatform ? `ช่องทางขาย ${selectedPlatform.name} ${gpLabel(selectedPlatform)}` : channelPlaceholder"
      :aria-expanded="drawerOpen" :aria-controls="drawerOpen ? drawerId : undefined" :disabled="!canChoose" @click="drawerOpen=true">
      <span class="pos-channel-name">{{ selectedPlatform?.name || channelPlaceholder }}</span>
      <small v-if="selectedPlatform" class="pos-channel-fee">{{ gpLabel(selectedPlatform) }}</small>
      <ChevronDown :size="16" aria-hidden="true" class="pos-channel-chevron"/>
     </button>
    </div>
   </div>
   <label class="pos-search"><span>ค้นหาเมนู</span><div><Search :size="17" aria-hidden="true"/><input type="search" data-pos-search aria-label="ค้นหาเมนู" :value="search" placeholder="ชื่อเมนูหรือรายละเอียด" @input="$emit('update:search',$event.target.value)"></div></label>
  </div>
  <div class="pos-catalog-scroll">
   <div v-if="menus.length" class="pos-menu-grid"><PosMenuCard v-for="menu in menus" :key="menu.id" :menu="menu" :disabled="disabled" :price="priceFor(menu)" :cart-quantity="cartQuantities[menu.id]||0" :out-of-stock="unavailableFor(menu)" @select="$emit('select-menu',$event)"/></div>
   <div v-else class="interface-empty"><Search :size="28" aria-hidden="true"/><strong>{{ search ? 'ไม่พบเมนู' : 'ยังไม่มีเมนูพร้อมขาย' }}</strong><p>{{ search ? 'ลองค้นหาด้วยชื่อเมนูหรือรายละเอียดอื่น' : 'เพิ่มเมนูและตั้งราคาในหน้าจัดการเมนูก่อนเริ่มขาย' }}</p><Button v-if="search" variant="secondary" @click="$emit('update:search','')">แสดงเมนูทั้งหมด</Button></div>
  </div>
  <DialogFrame v-if="mobile" :open="drawerOpen" :id="drawerId" title="เลือกช่องทางขาย" presentation="sheet" width="440px" compact
   initial-focus="[aria-current='true']" @request-close="drawerOpen=false">
   <ul class="pos-channel-options">
    <li v-for="platform in activePlatforms" :key="platform.id">
     <button type="button" data-channel-option :aria-current="platform.id===platformId ? 'true' : undefined" :disabled="!canChoose" @click="selectChannel(platform.id)">
      <span class="pos-channel-name">{{ platform.name }}</span>
      <small class="pos-channel-fee">{{ gpLabel(platform) }}</small>
      <span class="pos-channel-option-mark" aria-hidden="true"><Check v-if="platform.id===platformId" :size="16"/></span>
     </button>
    </li>
   </ul>
  </DialogFrame>
 </section>
</template>
<script setup>
import {computed,ref,useId,watch} from 'vue'
import {Check,ChevronDown,Search,Store} from 'lucide-vue-next'
import {useMediaQuery} from '@/composables/useMediaQuery'
import AppSelect from '@/components/ui/AppSelect.vue'
import Button from '@/components/ui/Button.vue'
import DialogFrame from '@/components/ui/DialogFrame.vue'
import PosMenuCard from './PosMenuCard.vue'
const props=defineProps({disabled:Boolean,menus:{type:Array,required:true},platforms:{type:Array,required:true},cartQuantities:{type:Object,default:()=>({})},platformId:String,search:String,priceFor:{type:Function,required:true},unavailableFor:{type:Function,required:true}})
const emit=defineEmits(['update:search','platform','select-menu'])
const drawerId=`pos-channel-${useId()}`
const mobile=useMediaQuery('(max-width: 767px)')
const drawerOpen=ref(false)
const activePlatforms=computed(()=>props.platforms.filter(p=>p.isActive!==false))
const selectedPlatform=computed(()=>activePlatforms.value.find(p=>p.id===props.platformId))
const canChoose=computed(()=>!props.disabled&&activePlatforms.value.length>0)
const channelPlaceholder=computed(()=>activePlatforms.value.length?'เลือกช่องทางขาย':'ยังไม่มีช่องทางเปิดขาย')
const gpLabel=platform=>platform.gpPercent>0?`GP ${platform.gpPercent}%`:'ไม่มี GP'
watch([mobile,canChoose],([isMobile,enabled])=>{if(!isMobile||!enabled)drawerOpen.value=false})
function selectChannel(id){
 if(!canChoose.value||!activePlatforms.value.some(platform=>platform.id===id))return
 if(id!==props.platformId)emit('platform',id)
 drawerOpen.value=false
}
</script>
<style scoped>
.pos-catalog{display:flex;flex-direction:column;min-width:0;gap:16px;flex:1;container-type:inline-size}.pos-catalog-heading{display:flex;justify-content:space-between;align-items:center;gap:12px}.pos-catalog-heading h3{font-size:1.125rem;font-weight:600}.pos-catalog-heading p{font-size:.75rem;color:var(--text-muted);margin-top:4px}.pos-catalog-heading>span{font-size:.75rem;white-space:nowrap;color:var(--text-muted)}
.pos-catalog-controls{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.3fr);gap:14px}
.pos-channel,.pos-search{min-width:0}
.pos-control-label,.pos-search>span{display:block;font-size:.75rem;font-weight:500;margin-bottom:8px;color:var(--text-main)}
.pos-channel-control{position:relative;min-width:0}
.pos-channel-icon{position:absolute;inset-inline-start:9px;top:50%;transform:translateY(-50%);display:grid;place-items:center;width:28px;height:28px;border-radius:7px;background:var(--accent-soft);color:var(--accent-brand);pointer-events:none;z-index:1}
.pos-channel-select{display:flex}
.pos-channel-select :deep(.app-select-trigger),.pos-channel-trigger{width:100%;min-height:48px;padding:8px 12px;padding-inline-start:45px;border-radius:10px;font-size:.875rem}
.pos-channel-select :deep(.app-select-value){font-weight:600;white-space:normal;overflow-wrap:anywhere}
.pos-channel-trigger{display:grid;grid-template-columns:minmax(0,1fr) auto 16px;align-items:center;gap:8px;text-align:start;border:1px solid var(--control-border);background:var(--bg-card)}
.pos-channel-name{font-weight:600;overflow-wrap:anywhere}
.pos-channel-fee{padding:2px 6px;border-radius:5px;background:var(--bg-soft);font-size:.75rem;color:var(--text-muted);font-variant-numeric:tabular-nums;white-space:nowrap}
.pos-channel-chevron{color:var(--text-muted);grid-column:3}
.pos-channel-options{display:grid;gap:2px}
.pos-channel-options button{display:grid;grid-template-columns:minmax(0,1fr) auto 18px;align-items:center;gap:10px;width:100%;min-height:52px;padding:8px 12px;text-align:start;border-radius:8px}
.pos-channel-options button[aria-current=true]{background:var(--accent-soft);color:var(--accent-brand)}
.pos-channel-option-mark{display:grid;place-items:center}
.pos-channel-trigger:enabled,.pos-channel-options button:enabled{cursor:pointer}
.pos-channel-trigger:disabled,.pos-channel-options button:disabled{opacity:.5;cursor:not-allowed}
.pos-channel-trigger:focus-visible,.pos-channel-options button:focus-visible{outline:2px solid var(--accent-brand);outline-offset:2px}
.pos-search>div{display:flex;align-items:center;gap:10px;min-height:48px;padding:10px 14px;background:var(--bg-card);border-radius:12px;color:var(--text-muted)}.pos-search input{width:100%;min-width:0;background:transparent;border:0;outline:none;font-size:.8125rem;color:var(--text-main)}.pos-search input::placeholder{color:var(--text-muted);opacity:1}
.pos-catalog-scroll{min-height:0;flex:1}.pos-menu-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px;align-content:start}.interface-empty{display:flex;flex-direction:column;align-items:center;padding-block:64px;gap:12px}.interface-empty strong,.interface-empty p{margin:0}
@container(max-width:620px){.pos-catalog-controls{grid-template-columns:minmax(0,1fr)}}
@container(max-width:440px){.pos-menu-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}}
@media(max-width:767px){.pos-catalog-heading p{display:none}.pos-catalog{gap:14px}.pos-catalog-controls{grid-template-columns:minmax(0,1fr)}}
</style>
