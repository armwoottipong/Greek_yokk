<template>
 <div ref="workbench" class="menu-workbench" :class="{'is-mobile-detail':mobileDetail}" >
  <header data-menu-header class="menu-header-panel">
   <Button class="menu-back" variant="quiet" @click="requestAction({type:'back'})"><ArrowLeft :size="16" aria-hidden="true"/>กลับรายการเมนู</Button>
   <div v-if="selectedMenu" class="menu-header-identity"><span class="menu-header-emoji" aria-hidden="true">{{ selectedMenu.emoji }}</span><div>
    <h2 data-selected-menu-name tabindex="-1">{{ selectedMenu.name }}</h2>
    <p v-if="selectedMenu.description" class="menu-header-description">{{ selectedMenu.description }}</p>
    <div class="menu-header-meta"><StatusBadge :label="selectedMenu.isActive===false?'ปิดขาย':'เปิดขาย'" :tone="selectedMenu.isActive===false?'warning':'neutral'"/><span>{{ pricedPlatformCount }} ช่องทางที่ตั้งราคา</span><span>{{ (selectedMenu.recipe||[]).length }} รายการในสูตร</span></div>
   </div></div>
   <div v-else class="menu-header-identity"><div><h2>เมนูและสูตร</h2><p class="menu-header-description">เพิ่มเมนูแรก พร้อมกำหนดราคาและสูตรที่ใช้</p></div></div>
   <div class="menu-header-actions">
    <Button data-catalog-add @click="requestAction({type:'new'})"><Plus :size="16" aria-hidden="true"/>เพิ่มเมนู</Button>
    <Button v-if="selectedMenu" data-menu-edit variant="secondary" @click="requestAction({type:'edit',id:selectedMenu.id})"><Pencil :size="15" aria-hidden="true"/>แก้ไขเมนู</Button>
    <details v-if="selectedMenu" ref="moreActions" data-menu-more-actions class="menu-more" @keydown.esc.prevent.stop="closeMore(true)" @focusout="leaveMore">
     <summary data-menu-more aria-label="คำสั่งเมนูเพิ่มเติม" title="คำสั่งเมนูเพิ่มเติม"><MoreHorizontal :size="20" aria-hidden="true"/></summary>
     <div class="menu-more-panel" role="group" aria-label="คำสั่งเมนูเพิ่มเติม"><Button data-menu-delete variant="danger" @click="deleteMenu(selectedMenu)"><Trash2 :size="16" aria-hidden="true"/>ลบเมนู</Button></div>
    </details>
   </div>
  </header>
  <div class="workbench-columns">
   <aside class="menu-browser" aria-label="รายการเมนู"><div class="menu-browser-tools"><AppSearch v-model="searchQuery" label="ค้นหาเมนู" placeholder="ค้นหาชื่อเมนู"/><p>{{ filteredMenus.length }} เมนู</p></div>
    <div class="menu-browser-list"><button v-for="menu in filteredMenus" :key="menu.id" type="button" :data-menu-select="menu.id" :data-catalog-details="menu.id" :aria-pressed="selectedId===menu.id" class="menu-browser-item" @click="requestAction({type:'select',id:menu.id})"><span class="menu-list-emoji" aria-hidden="true">{{ menu.emoji }}</span><span><strong>{{ menu.name }}</strong><small>{{ menu.isActive===false?'ปิดขาย':'เปิดขาย' }} · {{ (menu.recipe||[]).length }} รายการในสูตร</small></span><ChevronRight :size="14" aria-hidden="true"/></button></div>
    <div v-if="!filteredMenus.length" class="menu-browser-empty"><strong>{{ searchQuery?'ไม่พบเมนูที่ค้นหา':'ยังไม่มีเมนู' }}</strong><p>{{ searchQuery?'ลองชื่ออื่น หรือแสดงเมนูทั้งหมด':'เพิ่มเมนูแรก พร้อมกำหนดราคาและสูตร' }}</p><Button v-if="searchQuery" data-menu-clear-search variant="secondary" @click="searchQuery=''">แสดงเมนูทั้งหมด</Button><Button v-else @click="requestAction({type:'new'})">เพิ่มเมนูแรก</Button></div>
   </aside>
   <section class="menu-content" aria-label="พื้นที่ทำงานเมนู">
    <template v-if="selectedMenu">
     <MenuRecipeDetails :menu="selectedMenu" :items="detailedRecipeItems" :food-cost="selectedMenuFoodCost" :cost-estimate="selectedMenuCostEstimate" :platforms="store.platforms" :addon-groups="selectedGroups" @edit="requestAction({type:'edit',id:selectedMenu.id,section:$event?.section})"/>
    </template>
    <div v-else class="menu-content-empty"><BookOpen :size="32" aria-hidden="true"/><h3>เริ่มต้นด้วยเมนูแรก</h3><p>ข้อมูลวิเคราะห์ทุกช่องทางและสูตรจะแสดงตรงนี้</p><Button @click="requestAction({type:'new'})">เพิ่มเมนู</Button></div>
   </section>
  </div>
 </div>
</template>
<script setup>
import '@/components/catalog/menuFocus.css'
import {computed,ref,watch,nextTick,onMounted,onUnmounted,onDeactivated} from 'vue'
import {Plus,ChevronRight,ArrowLeft,Pencil,Trash2,BookOpen,MoreHorizontal} from 'lucide-vue-next'
import {estimateMenuCosts} from '@/domain/menuCosts'
import {overlayStack} from '@/composables/overlayState'
import {menuGroups} from '@/domain/addonGroups'
import {usePosStore} from '@/stores/posStore'
import MenuRecipeDetails from '@/components/catalog/MenuRecipeDetails.vue'
import Button from '@/components/ui/Button.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import AppSearch from '@/components/ui/AppSearch.vue'
const store=usePosStore()
const searchQuery=ref(''),selectedId=ref(store.menus[0]?.id||null),mobileDetail=ref(false)
const workbench=ref(null),pendingHeadingFocus=ref(false),moreActions=ref(null)
let pendingNewMenuIds=null
watch(()=>store.modals.menuEdit.isOpen,open=>{
 if(open || !pendingNewMenuIds)return
 const savedId=store.modals.menuEdit.savedMenuId
 if(savedId && !pendingNewMenuIds.has(savedId) && store.menus.some(menu=>menu.id===savedId)){
  selectedId.value=savedId
  if(!filteredMenus.value.some(menu=>menu.id===savedId))searchQuery.value=''
  mobileDetail.value=true
  pendingHeadingFocus.value=true
 }
 pendingNewMenuIds=null
},{flush:'post'})
watch(()=>[pendingHeadingFocus.value,overlayStack.length],async()=>{
 if(!pendingHeadingFocus.value || overlayStack.length)return
 await nextTick()
 if(overlayStack.length)return
 (workbench.value?.querySelector('[data-selected-menu-name]') || workbench.value?.querySelector('[data-catalog-add]'))?.focus()
 pendingHeadingFocus.value=false
},{flush:'post'})
const selectedMenu=computed(()=>store.menus.find(m=>m.id===selectedId.value)||null)
const pricedPlatformCount=computed(()=>store.platforms.filter(platform=>Number.isFinite(Number(selectedMenu.value?.prices?.[platform.id])) && Number(selectedMenu.value?.prices?.[platform.id])>0).length)
watch(()=>selectedMenu.value?.id,()=>closeMore())
onMounted(()=>document.addEventListener('pointerdown',outsideMore))
onUnmounted(()=>document.removeEventListener('pointerdown',outsideMore))
onDeactivated(()=>closeMore())

watch(()=>store.menus.map(m=>m.id),ids=>{if(!ids.includes(selectedId.value))selectedId.value=ids[0]||null})
const filteredMenus=computed(()=>store.menus.filter(m=>`${m.name} ${m.description||''}`.toLowerCase().includes(searchQuery.value.trim().toLowerCase())))
const selectedGroups=computed(()=>selectedMenu.value?menuGroups(selectedMenu.value,store.addonGroups):[])
const detailedRecipeItems=computed(()=>(selectedMenu.value?.recipe||[]).map(r=>{
 const mat=store.matMap[r.materialId],qty=Number(r.qty)||0,rawCost=mat?.unitCost,unitCost=Number(rawCost)
 const knownCost=rawCost!==null && rawCost!==undefined && rawCost!=='' && Number.isFinite(unitCost) && unitCost>=0 && Number.isFinite(qty) && qty>0
 const calculated=knownCost?qty*unitCost:null,cost=calculated!==null && Number.isFinite(calculated)?calculated:null
 return {...r,mat,qty,cost,servingsAvailable:qty>0?Math.floor((Number(mat?.stock)||0)/qty):null}
}))
const selectedMenuCostEstimate=computed(()=>{
 const menu=selectedMenu.value
 if(!menu)return null
 const estimate=estimateMenuCosts(menu,store.addonGroups,store.addons,store.materials)
 const unknownIncludedRow=detailedRecipeItems.value.some(item=>item.cost===null && (menu.hasPackage!==false || item.mat?.inventoryType!=='packaging'))
 return unknownIncludedRow?{...estimate,baseCost:null,averageCost:null,worstCost:null}:estimate
})
const selectedMenuFoodCost=computed(()=>selectedMenuCostEstimate.value?.baseCost ?? 0)
function requestAction(action){
 if(action.type==='select'){selectedId.value=action.id;mobileDetail.value=true;if(window.innerWidth<768)nextTick(()=>document.querySelector('[data-selected-menu-name]')?.focus())}
 if(action.type==='edit'||action.type==='new'){pendingNewMenuIds=action.type==='new'?new Set(store.menus.map(menu=>menu.id)):null;store.modals.menuEdit={isOpen:true,menuId:action.type==='new'?null:action.id,savedMenuId:null,initialSection:action.section==='recipe'?'recipe':'identity'}}
 if(action.type==='back'){mobileDetail.value=false;nextTick(()=>[...document.querySelectorAll('[data-menu-select]')].find(element=>element.dataset.menuSelect===selectedId.value)?.focus())}
}
function closeMore(restoreFocus=false){
 const details=moreActions.value
 if(!details)return
 details.open=false
 if(restoreFocus)details.querySelector('summary')?.focus()
}
function outsideMore(event){if(!moreActions.value?.contains(event.target))closeMore()}
function leaveMore(event){if(event.relatedTarget && !moreActions.value?.contains(event.relatedTarget))closeMore()}
async function deleteMenu(menu){
 closeMore(true)
 if(await store.confirmDialog({title:'ลบเมนู?',message:menu.name+' · การลบนี้ไม่สามารถย้อนกลับได้',confirmText:'ลบเมนู',cancelText:'ยกเลิก',type:'danger'})){
  store.deleteMenu(menu.id)
  pendingHeadingFocus.value=true
 }
}
</script>
<style scoped>
.menu-workbench{--workbench-muted:#705C50;display:grid;gap:24px;min-width:0}
.menu-header-panel{position:relative;z-index:2;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:20px;padding:24px;background:var(--bg-card);border-radius:16px;min-width:0}
.menu-header-identity{display:flex;align-items:flex-start;gap:16px;min-width:0}.menu-header-identity>div{min-width:0}.menu-header-emoji{font-size:36px;line-height:1.4;flex-shrink:0}.menu-header-panel h2{font-size:1.25rem;font-weight:600;line-height:1.5;overflow-wrap:anywhere}.menu-header-description{font-size:.8125rem;line-height:1.7;color:var(--workbench-muted);margin-top:4px;overflow-wrap:anywhere}.menu-header-meta{display:flex;align-items:center;gap:8px 16px;flex-wrap:wrap;margin-top:12px;font-size:.75rem;line-height:1.7;color:var(--workbench-muted);font-variant-numeric:tabular-nums}
.menu-header-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end}.menu-header-actions>.ui-button{flex-shrink:0}
.menu-more{position:relative}.menu-more>summary{display:grid;place-items:center;list-style:none;width:44px;height:44px;border-radius:10px;background:var(--bg-soft);color:var(--accent-brand);cursor:pointer}.menu-more>summary::-webkit-details-marker{display:none}.menu-more[open]>summary{background:var(--accent-soft)}.menu-more-panel{position:absolute;inset-inline-end:0;top:calc(100% + 8px);z-index:10;width:216px;max-width:calc(100vw - 48px);padding:6px;background:var(--bg-card);border-radius:16px;box-shadow:var(--shadow-popup)}.menu-more-panel>.ui-button{width:100%;justify-content:flex-start}
.workbench-columns{display:grid;grid-template-columns:208px minmax(0,1fr);gap:24px;align-items:start;min-width:0}.menu-browser{position:sticky;top:0;min-width:0;background:var(--bg-card);border-radius:16px;overflow:hidden}.menu-browser-tools{padding:16px 12px 12px}.menu-browser-tools>p{font-size:.75rem;color:var(--workbench-muted);margin-top:12px;padding-inline:4px}.menu-browser-list{max-height:calc(100dvh - 300px);min-height:120px;overflow-y:auto;overscroll-behavior:contain;padding:0 8px 12px}.menu-browser-item{display:flex;align-items:center;gap:10px;min-height:76px;text-align:start;width:100%;padding:12px 8px;border-radius:12px;cursor:pointer;border:1px solid transparent}.menu-browser-item[aria-pressed=true]{background:var(--accent-soft);border-color:var(--accent-border);color:var(--accent-brand)}.menu-list-emoji{font-size:24px;flex-shrink:0}.menu-browser-item>span:nth-child(2){flex:1;min-width:0}.menu-browser-item strong{font-size:.8125rem;font-weight:500;line-height:1.7;overflow-wrap:anywhere;display:block}.menu-browser-item small{font-size:.75rem;display:block;color:var(--workbench-muted);margin-top:4px;line-height:1.7}.menu-browser-item>svg{flex-shrink:0}.menu-browser-empty{padding:20px 16px;font-size:.8125rem;line-height:1.7}.menu-browser-empty p{color:var(--workbench-muted);margin:8px 0 16px}
.menu-content{container:menu-content / inline-size;min-width:0;display:grid;gap:20px}.menu-content-empty{display:grid;justify-items:center;gap:16px;padding:64px 24px;text-align:center;background:var(--bg-card);border-radius:16px}.menu-content-empty>svg{color:var(--accent-brand)}.menu-content-empty p{font-size:.875rem;color:var(--workbench-muted)}.menu-back{display:none;grid-column:1/-1;justify-self:start}
.menu-workbench :deep(:focus),.menu-workbench :deep(:focus-visible){outline:none!important;box-shadow:none!important}.menu-workbench :deep(.app-input input:focus-visible){outline:none!important}
@media(hover:hover){.menu-browser-item:hover{background:var(--bg-soft)}.menu-browser-item[aria-pressed=true]:hover{background:var(--accent-soft)}.menu-more>summary:hover{background:var(--accent-soft)}}
@media(min-width:1800px){.workbench-columns{grid-template-columns:224px minmax(0,1fr)}}
@media(max-width:1199px){.workbench-columns{grid-template-columns:192px minmax(0,1fr);gap:16px}.menu-header-panel{grid-template-columns:minmax(0,1fr);gap:16px}.menu-header-actions{justify-content:flex-start}}
@media(max-width:767px){.workbench-columns{grid-template-columns:minmax(0,1fr)}.menu-workbench{gap:20px}.menu-header-panel{padding:16px}.menu-header-identity{gap:12px}.menu-header-panel h2{font-size:1.125rem}.menu-header-emoji{font-size:28px}.menu-header-meta{gap:8px 12px}.menu-header-actions{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) 44px;gap:8px}.menu-header-actions>.ui-button{padding-inline:10px;font-size:.75rem}.menu-more{justify-self:end}.menu-browser{position:static}.menu-browser-list{max-height:none}.menu-content{display:none}.is-mobile-detail .menu-browser{display:none}.is-mobile-detail .menu-content{display:grid}.is-mobile-detail .menu-back{display:inline-flex}.menu-workbench :deep(.app-input input){font-size:1rem}}
</style>
