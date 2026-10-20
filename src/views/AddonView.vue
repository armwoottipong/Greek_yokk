<template>
 <CatalogWorkspace ref="workbench" entity="addon" :mobile-detail="mobileDetail" class="addon-workspace" :active="activeSection==='addons'" directory-id="addon-directory">
  <template #before><nav class="addon-sections" aria-label="ส่วนจัดการ Add-on"><button type="button" data-addon-section="addons" :aria-pressed="activeSection==='addons'" aria-controls="addon-directory" @click="activeSection='addons'">รายการ Add-on <span>{{ store.addons.length }}</span></button><button type="button" data-addon-section="groups" :aria-pressed="activeSection==='groups'" aria-controls="addon-groups" @click="activeSection='groups'">กลุ่มตัวเลือก <span>{{ store.addonGroups.length }}</span></button></nav></template>
  <template #after-header><AddonGroupManager id="addon-groups" v-show="activeSection==='groups'"/></template>
  <template #header><CatalogHeader v-show="activeSection==='addons'" entity="addon" :selected="selectedAddon" :platform-count="configuredPlatformCount" @back="requestAction({type:'back'})" @add="requestAction({type:'new'})" @edit="requestAction({type:'edit',id:$event})" @delete="deleteAddon"/></template>
  <template #browser><CatalogBrowser v-model="searchQuery" entity="addon" :items="filteredAddons" :selected-id="selectedId" @select="requestAction({type:'select',id:$event})" @add="requestAction({type:'new'})"/></template>
  <template v-if="selectedAddon"><AddonRecipeDetails :addon="selectedAddon" :items="detailedRecipeItems" :cost="selectedAddonCost" :platforms="store.platforms" :used-groups="selectedGroups" @edit="requestAction({type:'edit',id:selectedAddon.id,section:$event?.section})"/></template>
  <CatalogEmptyState v-else entity="addon" @add="requestAction({type:'new'})"/>
 </CatalogWorkspace>
</template>
<script setup>
import CatalogWorkspace from '@/components/catalog/CatalogWorkspace.vue'
import CatalogHeader from '@/components/catalog/CatalogHeader.vue'
import CatalogBrowser from '@/components/catalog/CatalogBrowser.vue'
import CatalogEmptyState from '@/components/catalog/CatalogEmptyState.vue'
import {computed,ref,watch,nextTick} from 'vue'
import {overlayStack} from '@/composables/overlayState'
import {parsePlatformPrice} from '@/domain/pricing'
import {usePosStore} from '@/stores/posStore'
import AddonRecipeDetails from '@/components/catalog/AddonRecipeDetails.vue'
import AddonGroupManager from '@/components/catalog/AddonGroupManager.vue'
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
 (workbench.value?.element?.querySelector('[data-selected-addon-name]') || workbench.value?.element?.querySelector('[data-catalog-add]'))?.focus()
 pendingHeadingFocus.value=false
},{flush:'post'})
const selectedAddon=computed(()=>store.addons.find(m=>m.id===selectedId.value)||null)
const configuredPlatformCount=computed(()=>store.platforms.filter(platform=>parsePlatformPrice(selectedAddon.value?.prices?.[platform.id])>0).length)
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
.addon-sections{display:flex;gap:8px;flex-wrap:wrap}.addon-sections button{display:flex;align-items:center;gap:8px;min-height:44px;padding:10px 16px;border-radius:10px;color:var(--text-muted);font-size:.875rem}.addon-sections button[aria-pressed=true]{background:var(--bg-card);color:var(--accent-brand);font-weight:600}.addon-sections span{font-variant-numeric:tabular-nums}
</style>
