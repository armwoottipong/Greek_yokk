<template>
 <CatalogWorkspace ref="workbench" entity="menu" :mobile-detail="mobileDetail">
  <template #header><CatalogHeader entity="menu" :selected="selectedMenu" :platform-count="pricedPlatformCount" @back="requestAction({type:'back'})" @add="requestAction({type:'new'})" @edit="requestAction({type:'edit',id:$event})" @delete="deleteMenu"/></template>
  <template #browser><CatalogBrowser v-model="searchQuery" entity="menu" :items="filteredMenus" :selected-id="selectedId" @select="requestAction({type:'select',id:$event})" @add="requestAction({type:'new'})"/></template>
  <template v-if="selectedMenu"><MenuRecipeDetails :menu="selectedMenu" :items="detailedRecipeItems" :food-cost="selectedMenuFoodCost" :cost-estimate="selectedMenuCostEstimate" :platforms="store.platforms" :addon-groups="selectedGroups" @edit="requestAction({type:'edit',id:selectedMenu.id,section:$event?.section})"/></template>
  <CatalogEmptyState v-else entity="menu" @add="requestAction({type:'new'})"/>
 </CatalogWorkspace>
</template>
<script setup>
import CatalogWorkspace from '@/components/catalog/CatalogWorkspace.vue'
import CatalogHeader from '@/components/catalog/CatalogHeader.vue'
import CatalogBrowser from '@/components/catalog/CatalogBrowser.vue'
import CatalogEmptyState from '@/components/catalog/CatalogEmptyState.vue'
import {computed,ref,watch,nextTick} from 'vue'
import {estimateMenuCosts} from '@/domain/menuCosts'
import {overlayStack} from '@/composables/overlayState'
import {menuGroups} from '@/domain/addonGroups'
import {usePosStore} from '@/stores/posStore'
import MenuRecipeDetails from '@/components/catalog/MenuRecipeDetails.vue'
const store=usePosStore()
const searchQuery=ref(''),selectedId=ref(store.menus[0]?.id||null),mobileDetail=ref(false)
const workbench=ref(null),pendingHeadingFocus=ref(false)
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
 (workbench.value?.element?.querySelector('[data-selected-menu-name]') || workbench.value?.element?.querySelector('[data-catalog-add]'))?.focus()
 pendingHeadingFocus.value=false
},{flush:'post'})
const selectedMenu=computed(()=>store.menus.find(m=>m.id===selectedId.value)||null)
const pricedPlatformCount=computed(()=>store.platforms.filter(platform=>Number.isFinite(Number(selectedMenu.value?.prices?.[platform.id])) && Number(selectedMenu.value?.prices?.[platform.id])>0).length)
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
async function deleteMenu(menu){
 if(await store.confirmDialog({title:'ลบเมนู?',message:menu.name+' · การลบนี้ไม่สามารถย้อนกลับได้',confirmText:'ลบเมนู',cancelText:'ยกเลิก',type:'danger'})){
  store.deleteMenu(menu.id)
  pendingHeadingFocus.value=true
 }
}
</script>
