<template>
 <div ref="workbench" class="menu-workbench addon-workspace" :class="{'is-mobile-detail':mobileDetail}" >
  <nav class="addon-sections" aria-label="ส่วนจัดการ Add-on"><button type="button" data-addon-section="addons" :aria-pressed="activeSection==='addons'" aria-controls="addon-directory" @click="activeSection='addons'">รายการ Add-on <span>{{ store.addons.length }}</span></button><button type="button" data-addon-section="groups" :aria-pressed="activeSection==='groups'" aria-controls="addon-groups" @click="activeSection='groups'">กลุ่มตัวเลือก <span>{{ store.addonGroups.length }}</span></button></nav>
  <header v-show="activeSection==='addons'" data-addon-header class="menu-header-panel">
   <Button class="menu-back" variant="quiet" @click="requestAction({type:'back'})"><ArrowLeft :size="16" aria-hidden="true"/>กลับรายการ Add-on</Button>
   <div v-if="selectedAddon" class="menu-header-identity"><span class="menu-header-emoji" aria-hidden="true">{{ selectedAddon.emoji }}</span><div>
    <h2 data-selected-addon-name tabindex="-1">{{ selectedAddon.name }}</h2>
    <p v-if="selectedAddon.description" class="menu-header-description">{{ selectedAddon.description }}</p>
    <div class="menu-header-meta"><StatusBadge :label="selectedAddon.isActive===false?'ปิดขาย':'เปิดขาย'" :tone="selectedAddon.isActive===false?'warning':'neutral'"/><span>{{ configuredPlatformCount }} ช่องทางที่ตั้งราคา</span><span>{{ (selectedAddon.recipe||[]).length }} รายการในสูตร</span></div>
   </div></div>
   <div v-else class="menu-header-identity"><div><h2>จัดการ Add-on</h2><p class="menu-header-description">เพิ่ม Add-on แรก พร้อมกำหนดราคาและสูตรที่ใช้</p></div></div>
   <div class="menu-header-actions">
    <Button data-catalog-add @click="requestAction({type:'new'})"><Plus :size="16" aria-hidden="true"/>เพิ่ม Add-on</Button>
    <Button v-if="selectedAddon" data-addon-edit variant="secondary" @click="requestAction({type:'edit',id:selectedAddon.id})"><Pencil :size="15" aria-hidden="true"/>แก้ไข Add-on</Button>
    <Button v-if="selectedAddon" data-addon-delete class="menu-delete" variant="danger" aria-label="ลบ Add-on" title="ลบ Add-on" @click="deleteAddon(selectedAddon)"><Trash2 :size="20" aria-hidden="true"/></Button>
   </div>
  </header>

  <AddonGroupManager id="addon-groups" v-show="activeSection==='groups'"/>
  <div id="addon-directory" v-show="activeSection==='addons'" class="workbench-columns">
   <aside class="menu-browser" aria-label="รายการ Add-on"><div class="menu-browser-tools"><AppSearch v-model="searchQuery" label="ค้นหา Add-on" placeholder="ค้นหาชื่อ Add-on"/><p>{{ filteredAddons.length }} รายการ</p></div>
    <div class="menu-browser-list"><button v-for="menu in filteredAddons" :key="menu.id" type="button" :data-addon-select="menu.id" :data-addon-details="menu.id" :aria-pressed="selectedId===menu.id" class="menu-browser-item" @click="requestAction({type:'select',id:menu.id})"><span class="menu-list-emoji" aria-hidden="true">{{ menu.emoji }}</span><span><strong>{{ menu.name }}</strong><small>{{ menu.isActive===false?'ปิดขาย':'เปิดขาย' }} · {{ (menu.recipe||[]).length }} รายการในสูตร</small></span><ChevronRight :size="14" aria-hidden="true"/></button></div>
    <div v-if="!filteredAddons.length" class="menu-browser-empty"><strong>{{ searchQuery?'ไม่พบ Add-on ที่ค้นหา':'ยังไม่มี Add-on' }}</strong><p>{{ searchQuery?'ลองชื่ออื่น หรือแสดง Add-on ทั้งหมด':'เพิ่ม Add-on แรก พร้อมกำหนดราคาและสูตร' }}</p><Button v-if="searchQuery" data-addon-clear-search variant="secondary" @click="searchQuery=''">แสดง Add-on ทั้งหมด</Button><Button v-else @click="requestAction({type:'new'})">เพิ่ม Add-on แรก</Button></div>
   </aside>
   <section class="menu-content" aria-label="พื้นที่ทำงาน Add-on">
    <template v-if="selectedAddon">
     <AddonRecipeDetails :addon="selectedAddon" :items="detailedRecipeItems" :cost="selectedAddonCost" :platforms="store.platforms" :used-groups="selectedGroups" @edit="requestAction({type:'edit',id:selectedAddon.id,section:$event?.section})"/>
    </template>
    <div v-else class="menu-content-empty"><BookOpen :size="32" aria-hidden="true"/><h3>เริ่มต้นด้วย Add-on แรก</h3><p>ข้อมูลวิเคราะห์ทุกช่องทางและสูตรจะแสดงตรงนี้</p><Button @click="requestAction({type:'new'})">เพิ่ม Add-on</Button></div>
   </section>
  </div>
 </div>
</template>
<script setup>
import '@/components/catalog/menuFocus.css'
import {computed,ref,watch,nextTick} from 'vue'
import {Plus,ChevronRight,ArrowLeft,Pencil,Trash2,BookOpen} from 'lucide-vue-next'
import {overlayStack} from '@/composables/overlayState'
import {usePosStore} from '@/stores/posStore'
import AddonRecipeDetails from '@/components/catalog/AddonRecipeDetails.vue'
import AddonGroupManager from '@/components/catalog/AddonGroupManager.vue'
import Button from '@/components/ui/Button.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import AppSearch from '@/components/ui/AppSearch.vue'
const store=usePosStore()
const searchQuery=ref(''),selectedId=ref(store.addons[0]?.id||null),mobileDetail=ref(false),activeSection=ref('addons')
const workbench=ref(null),pendingHeadingFocus=ref(false)
let pendingNewAddonIds=null
watch(()=>store.modals.addonEdit.isOpen,open=>{
 if(open || !pendingNewAddonIds)return
 const savedId=store.modals.addonEdit.savedAddonId
 if(savedId && !pendingNewAddonIds.has(savedId) && store.addons.some(menu=>menu.id===savedId)){
  selectedId.value=savedId
  if(!filteredAddons.value.some(menu=>menu.id===savedId))searchQuery.value=''
  mobileDetail.value=true
  pendingHeadingFocus.value=true
 }
 pendingNewAddonIds=null
},{flush:'post'})
watch(()=>[pendingHeadingFocus.value,overlayStack.length],async()=>{
 if(!pendingHeadingFocus.value || overlayStack.length)return
 await nextTick()
 if(overlayStack.length)return
 (workbench.value?.querySelector('[data-selected-addon-name]') || workbench.value?.querySelector('[data-catalog-add]'))?.focus()
 pendingHeadingFocus.value=false
},{flush:'post'})
const selectedAddon=computed(()=>store.addons.find(m=>m.id===selectedId.value)||null)
const configuredPlatformCount=computed(()=>store.platforms.filter(platform=>Number.isFinite(Number(selectedAddon.value?.prices?.[platform.id])) && selectedAddon.value?.prices?.[platform.id]!=='' && selectedAddon.value?.prices?.[platform.id]!==null && selectedAddon.value?.prices?.[platform.id]!==undefined && Number(selectedAddon.value?.prices?.[platform.id])>=0).length)
watch(()=>store.addons.map(m=>m.id),ids=>{if(!ids.includes(selectedId.value))selectedId.value=ids[0]||null})
const filteredAddons=computed(()=>store.addons.filter(m=>`${m.name} ${m.description||''}`.toLowerCase().includes(searchQuery.value.trim().toLowerCase())))
const selectedGroups=computed(()=>store.addonGroups.filter(group=>group.options?.some(option=>option.addonId===selectedId.value)))
const detailedRecipeItems=computed(()=>(selectedAddon.value?.recipe||[]).map(r=>{
 const mat=store.matMap[r.materialId],qty=Number(r.qty)||0,rawCost=mat?.unitCost,unitCost=Number(rawCost)
 const knownCost=rawCost!==null && rawCost!==undefined && rawCost!=='' && Number.isFinite(unitCost) && unitCost>=0 && Number.isFinite(qty) && qty>0
 const calculated=knownCost?qty*unitCost:null,cost=calculated!==null && Number.isFinite(calculated)?calculated:null
 return {...r,mat,qty,cost,servingsAvailable:qty>0?Math.floor((Number(mat?.stock)||0)/qty):null}
}))
const selectedAddonCost=computed(()=>detailedRecipeItems.value.some(item=>item.cost===null)?null:detailedRecipeItems.value.reduce((sum,item)=>sum+item.cost,0))
function editAddon(id){requestAction({type:'edit',id})}
function requestAction(action){
 if(action.type==='select'){selectedId.value=action.id;mobileDetail.value=true;if(window.innerWidth<768)nextTick(()=>document.querySelector('[data-selected-addon-name]')?.focus())}
 if(action.type==='edit'||action.type==='new'){pendingNewAddonIds=action.type==='new'?new Set(store.addons.map(menu=>menu.id)):null;store.modals.addonEdit={isOpen:true,addonId:action.type==='new'?null:action.id,savedAddonId:null,initialSection:action.section==='recipe'?'recipe':'identity'}}
 if(action.type==='back'){mobileDetail.value=false;nextTick(()=>[...document.querySelectorAll('[data-addon-select]')].find(element=>element.dataset.addonSelect===selectedId.value)?.focus())}
}
async function deleteAddon(menu){
 if(await store.confirmDialog({title:'ลบ Add-on?',message:menu.name+' · '+menu.id+' · การลบนี้ไม่สามารถย้อนกลับได้',confirmText:'ลบ Add-on',cancelText:'ยกเลิก',type:'danger'})){
  store.deleteAddon(menu.id)
  pendingHeadingFocus.value=true
 }
}
</script>
<style scoped>
.addon-sections{display:flex;gap:8px;flex-wrap:wrap}.addon-sections button{display:flex;align-items:center;gap:8px;min-height:44px;padding:10px 16px;border-radius:10px;color:var(--text-muted);font-size:.875rem}.addon-sections button[aria-pressed=true]{background:var(--bg-card);color:var(--accent-brand);font-weight:600}.addon-sections span{font-variant-numeric:tabular-nums}.menu-workbench{--workbench-muted:#705C50;display:grid;gap:24px;min-width:0}
.menu-header-panel{position:relative;z-index:2;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:20px;padding:24px;background:var(--bg-card);border-radius:16px;min-width:0}
.menu-header-identity{display:flex;align-items:flex-start;gap:16px;min-width:0}.menu-header-identity>div{min-width:0}.menu-header-emoji{font-size:36px;line-height:1.4;flex-shrink:0}.menu-header-panel h2{font-size:1.25rem;font-weight:600;line-height:1.5;overflow-wrap:anywhere}.menu-header-description{font-size:.8125rem;line-height:1.7;color:var(--workbench-muted);margin-top:4px;overflow-wrap:anywhere}.menu-header-meta{display:flex;align-items:center;gap:8px 16px;flex-wrap:wrap;margin-top:12px;font-size:.75rem;line-height:1.7;color:var(--workbench-muted);font-variant-numeric:tabular-nums}
.menu-header-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end}.menu-header-actions>.ui-button{flex-shrink:0}
.menu-header-actions>.menu-delete{width:44px;min-height:44px;padding:0}
.workbench-columns{display:grid;grid-template-columns:208px minmax(0,1fr);gap:24px;align-items:start;min-width:0}.menu-browser{position:sticky;top:0;min-width:0;background:var(--bg-card);border-radius:16px;overflow:hidden}.menu-browser-tools{padding:16px 12px 12px}.menu-browser-tools>p{font-size:.75rem;color:var(--workbench-muted);margin-top:12px;padding-inline:4px}.menu-browser-list{max-height:calc(100dvh - 300px);min-height:120px;overflow-y:auto;overscroll-behavior:contain;padding:0 8px 12px}.menu-browser-item{display:flex;align-items:center;gap:10px;min-height:76px;text-align:start;width:100%;padding:12px 8px;border-radius:12px;cursor:pointer;border:1px solid transparent}.menu-browser-item[aria-pressed=true]{background:var(--accent-soft);border-color:var(--accent-border);color:var(--accent-brand)}.menu-list-emoji{font-size:24px;flex-shrink:0}.menu-browser-item>span:nth-child(2){flex:1;min-width:0}.menu-browser-item strong{font-size:.8125rem;font-weight:500;line-height:1.7;overflow-wrap:anywhere;display:block}.menu-browser-item small{font-size:.75rem;display:block;color:var(--workbench-muted);margin-top:4px;line-height:1.7}.menu-browser-item>svg{flex-shrink:0}.menu-browser-empty{padding:20px 16px;font-size:.8125rem;line-height:1.7}.menu-browser-empty p{color:var(--workbench-muted);margin:8px 0 16px}
.menu-content{container:menu-content / inline-size;min-width:0;display:grid;gap:20px}.menu-content-empty{display:grid;justify-items:center;gap:16px;padding:64px 24px;text-align:center;background:var(--bg-card);border-radius:16px}.menu-content-empty>svg{color:var(--accent-brand)}.menu-content-empty p{font-size:.875rem;color:var(--workbench-muted)}.menu-back{display:none;grid-column:1/-1;justify-self:start}
.menu-workbench :deep(:focus),.menu-workbench :deep(:focus-visible){outline:none!important;box-shadow:none!important}.menu-workbench :deep(.app-input input:focus-visible){outline:none!important}
@media(hover:hover){.menu-browser-item:hover{background:var(--bg-soft)}.menu-browser-item[aria-pressed=true]:hover{background:var(--accent-soft)}}
@media(min-width:1800px){.workbench-columns{grid-template-columns:224px minmax(0,1fr)}}
@media(max-width:1199px){.workbench-columns{grid-template-columns:192px minmax(0,1fr);gap:16px}.menu-header-panel{grid-template-columns:minmax(0,1fr);gap:16px}.menu-header-actions{justify-content:flex-start}}
@media(max-width:767px){.workbench-columns{grid-template-columns:minmax(0,1fr)}.menu-workbench{gap:20px}.menu-header-panel{padding:16px}.menu-header-identity{gap:12px}.menu-header-panel h2{font-size:1.125rem}.menu-header-emoji{font-size:28px}.menu-header-meta{gap:8px 12px}.menu-header-actions{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) 44px;gap:8px}.menu-header-actions>.ui-button{padding-inline:10px;font-size:.75rem}.menu-delete{justify-self:end}.menu-browser{position:static}.menu-browser-list{max-height:none}.menu-content{display:none}.is-mobile-detail .menu-browser{display:none}.is-mobile-detail .menu-content{display:grid}.is-mobile-detail .menu-back{display:inline-flex}.menu-workbench :deep(.app-input input){font-size:1rem}}
</style>
