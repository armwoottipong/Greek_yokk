<template>
 <CatalogWorkspace ref="workbench" entity="addon" :mobile-detail="!!optionId || mobileDetail" :class="{'option-detail-only': optionId}" class="addon-workspace" directory-id="addon-directory">
  <template #header><CatalogHeader :detail-only="!!optionId" :busy="!!actionPending||store.inventorySaving" :removing="!!actionPending" entity="addon" :selected="selectedAddon" :platform-count="configuredPlatformCount" @back="requestAction({type:'back'})" @add="requestAction({type:'new'})" @edit="requestAction({type:'edit',id:$event})" @delete="deleteAddon"/></template>
  <template v-if="!optionId" #browser><CatalogBrowser v-model="searchQuery" entity="addon" :items="filteredAddons" :selected-id="selectedId" @select="requestAction({type:'select',id:$event})" @add="requestAction({type:'new'})"/></template>
  <template v-if="selectedAddon"><AddonRecipeDetails :addon="selectedAddon" :items="detailedRecipeItems" :cost="selectedAddonCost" :platforms="store.platforms" :used-groups="selectedGroups" analysis-trigger-target="#addon-analysis-anchor" @edit="requestAction({type:'edit',id:selectedAddon.id,section:$event?.section})"/></template>
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
import {useInventoryStore} from '@/composables/useInventoryStore'
import AddonRecipeDetails from '@/components/catalog/AddonRecipeDetails.vue'
import {useActionPending} from '@/composables/useActionPending'
const {pending:actionPending,run:runAction}=useActionPending()
const store=useInventoryStore()
const props=defineProps({optionId:String})
const emit = defineEmits(['removed'])
const searchQuery=ref(''),selectedId=ref(props.optionId||store.addons[0]?.id||null),mobileDetail=ref(false)
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
const selectedAddon=computed(()=>store.addons.find(m=>m.id===(props.optionId || selectedId.value))||null)
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
const deleteAddon=menu=>runAction('delete',()=>performDelete(menu))
async function performDelete(menu){
 if(await store.confirmDialog({title:'ลบตัวเลือกเสริม?',message:store.cloud?menu.name+' · นำออกจากรายการใช้งาน โดยเก็บบิลและหลักฐานเดิมไว้':menu.name+' · '+menu.id+' · การลบนี้ไม่สามารถย้อนกลับได้',confirmText:'ลบตัวเลือกเสริม',cancelText:'ยกเลิก',type:'danger'})){
  const result=await store.deleteAddon(menu.id)
  if(result!==false&&result?.ok!==false&&result?.success!==false){
   if (props.optionId) emit('removed', menu.id)
   else pendingHeadingFocus.value=true
  }
 }
}
</script>

<style scoped>
.option-detail-only :deep(.workbench-columns){grid-template-columns:minmax(0,1fr)}
</style>
