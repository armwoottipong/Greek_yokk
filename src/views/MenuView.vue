<template>
 <div class="menu-workbench" :class="{'is-mobile-detail':mobileDetail}" >
  <header class="workbench-heading"><div><h2>เมนูและสูตร</h2><p>เลือกเมนูเพื่อดูต้นทุน กำไร และสูตรที่ใช้ในทุกช่องทาง</p></div><Button data-catalog-add @click="requestAction({type:'new'})"><Plus :size="16" aria-hidden="true"/>เพิ่มเมนู</Button></header>
  <div v-if="pendingAction" ref="unsavedNotice" tabindex="-1" data-menu-unsaved role="status" class="menu-unsaved"><div><strong>มีข้อมูลที่ยังไม่ได้บันทึก</strong><p>บันทึกหรือทิ้งแบบร่าง ก่อนเปลี่ยนรายการ</p></div><div><Button data-menu-stay variant="quiet" @click="pendingAction=null">แก้ไขต่อ</Button><Button data-menu-discard variant="secondary" @click="discardAndContinue">ทิ้งแบบร่าง</Button><Button data-menu-save-continue @click="saveAndContinue">บันทึกแล้วไปต่อ</Button></div></div>
  <div class="workbench-columns">
   <aside class="menu-browser" aria-label="รายการเมนู"><div class="menu-browser-tools"><AppSearch v-model="searchQuery" label="ค้นหาเมนู" placeholder="ค้นหาชื่อเมนู"/><p>{{ filteredMenus.length }} เมนู</p></div>
    <div class="menu-browser-list"><button v-for="menu in filteredMenus" :key="menu.id" type="button" :data-menu-select="menu.id" :data-catalog-details="menu.id" :aria-pressed="selectedId===menu.id" class="menu-browser-item" @click="requestAction({type:'select',id:menu.id})"><span class="menu-list-emoji" aria-hidden="true">{{ menu.emoji }}</span><span><strong>{{ menu.name }}</strong><small>{{ menu.isActive===false?'ปิดขาย':'เปิดขาย' }} · {{ (menu.recipe||[]).length }} รายการในสูตร</small></span><ChevronRight :size="14" aria-hidden="true"/></button></div>
    <div v-if="!filteredMenus.length" class="menu-browser-empty"><strong>{{ searchQuery?'ไม่พบเมนูที่ค้นหา':'ยังไม่มีเมนู' }}</strong><p>{{ searchQuery?'ลองชื่ออื่น หรือแสดงเมนูทั้งหมด':'เพิ่มเมนูแรก พร้อมกำหนดราคาและสูตร' }}</p><Button v-if="searchQuery" data-menu-clear-search variant="secondary" @click="searchQuery=''">แสดงเมนูทั้งหมด</Button><Button v-else @click="requestAction({type:'new'})">เพิ่มเมนูแรก</Button></div>
   </aside>
   <section class="menu-content" aria-label="พื้นที่ทำงานเมนู">
    <Button class="menu-back" variant="quiet" @click="requestAction({type:'back'})"><ArrowLeft :size="16" aria-hidden="true"/>กลับรายการเมนู</Button>
    <MenuEditModal v-if="editing" :key="editorRevision" ref="editor" inline :menu-id="editId" @cancel="requestAction({type:'cancel'})" @saved="savedMenu"/>
    <template v-else-if="selectedMenu"><header class="selected-menu-heading"><div class="selected-menu-identity"><span aria-hidden="true">{{ selectedMenu.emoji }}</span><div><h3 data-selected-menu-name tabindex="-1">{{ selectedMenu.name }}</h3><p>{{ selectedMenu.description || 'ภาพรวมราคา ต้นทุน และกำไรต่อ 1 เสิร์ฟ' }}</p><StatusBadge :label="selectedMenu.isActive===false?'ปิดขาย':'เปิดขาย'" :tone="selectedMenu.isActive===false?'warning':'neutral'"/></div></div><div class="selected-menu-actions"><Button data-menu-edit variant="secondary" @click="requestAction({type:'edit',id:selectedMenu.id})"><Pencil :size="15" aria-hidden="true"/>แก้ไขเมนู</Button><IconButton :label="`ลบ ${selectedMenu.name}`" @click="deleteMenu(selectedMenu)"><Trash2 :size="17" aria-hidden="true"/></IconButton></div></header>
     <MenuRecipeDetails :menu="selectedMenu" :items="detailedRecipeItems" :food-cost="selectedMenuFoodCost" :cost-estimate="selectedMenuCostEstimate" :platforms="store.platforms" :addon-groups="selectedGroups" @edit="requestAction({type:'edit',id:selectedMenu.id})"/>
    </template>
    <div v-else class="menu-content-empty"><BookOpen :size="32" aria-hidden="true"/><h3>เริ่มต้นด้วยเมนูแรก</h3><p>ข้อมูลวิเคราะห์ทุกช่องทางและสูตรจะแสดงตรงนี้</p><Button @click="requestAction({type:'new'})">เพิ่มเมนู</Button></div>
   </section>
  </div>
 </div>
</template>
<script setup>
import {computed,ref,watch,onMounted,onUnmounted,nextTick} from 'vue'
import {Plus,ChevronRight,ArrowLeft,Pencil,Trash2,BookOpen} from 'lucide-vue-next'
import {estimateMenuCosts} from '@/domain/menuCosts'
import {menuGroups} from '@/domain/addonGroups'
import {usePosStore} from '@/stores/posStore'
import MenuRecipeDetails from '@/components/catalog/MenuRecipeDetails.vue'
import MenuEditModal from '@/components/modals/MenuEditModal.vue'
import Button from '@/components/ui/Button.vue'
import IconButton from '@/components/ui/IconButton.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import AppSearch from '@/components/ui/AppSearch.vue'
const store=usePosStore()
const searchQuery=ref(''),selectedId=ref(store.menus[0]?.id||null),mobileDetail=ref(false),editing=ref(false),editId=ref(null),editor=ref(null),pendingAction=ref(null),unsavedNotice=ref(null),editorRevision=ref(0)
const selectedMenu=computed(()=>store.menus.find(m=>m.id===selectedId.value)||null)
watch(()=>store.menus.map(m=>m.id),ids=>{if(!ids.includes(selectedId.value))selectedId.value=ids[0]||null})
const filteredMenus=computed(()=>store.menus.filter(m=>`${m.name} ${m.description||''}`.toLowerCase().includes(searchQuery.value.trim().toLowerCase())))
const selectedGroups=computed(()=>selectedMenu.value?menuGroups(selectedMenu.value,store.addonGroups):[])
const selectedMenuCostEstimate=computed(()=>selectedMenu.value?estimateMenuCosts(selectedMenu.value,store.addonGroups,store.addons,store.materials):null)
const detailedRecipeItems=computed(()=>(selectedMenu.value?.recipe||[]).map(r=>{
 const mat=store.matMap[r.materialId],qty=Number(r.qty)||0,cost=qty*(Number(mat?.unitCost)||0)
 return {...r,mat,qty,cost,servingsAvailable:qty>0?Math.floor((Number(mat?.stock)||0)/qty):null}
}))
const selectedMenuFoodCost=computed(()=>selectedMenuCostEstimate.value?.baseCost ?? 0)
function applyAction(action){
 pendingAction.value=null
 if(action.type==='select'){selectedId.value=action.id;editing.value=false;mobileDetail.value=true;if(window.innerWidth<768)nextTick(()=>document.querySelector('[data-selected-menu-name]')?.focus())}
 if(action.type==='edit'||action.type==='new'){editorRevision.value++;editId.value=action.type==='new'?null:action.id;editing.value=true;mobileDetail.value=true}
 if(action.type==='cancel'){editing.value=false;nextTick(()=>document.querySelector('[data-selected-menu-name]')?.focus())}
 if(action.type==='back'){editing.value=false;mobileDetail.value=false;nextTick(()=>[...document.querySelectorAll('[data-menu-select]')].find(element=>element.dataset.menuSelect===selectedId.value)?.focus())}
}
function requestAction(action){
 if(editing.value && action.type==='select' && action.id===editId.value){mobileDetail.value=true;return}
 if(editing.value && editor.value?.isDirty()){pendingAction.value=action;nextTick(()=>{unsavedNotice.value?.scrollIntoView?.({block:'nearest'});unsavedNotice.value?.focus()});return}
 applyAction(action)
}
function discardAndContinue(){applyAction(pendingAction.value)}
async function saveAndContinue(){const action=pendingAction.value;if(await editor.value?.submit())applyAction(action)}
function savedMenu(id){if(id)selectedId.value=id;editing.value=false;nextTick(()=>document.querySelector('[data-selected-menu-name]')?.focus())}
async function deleteMenu(menu){if(await store.confirmDialog({title:'ลบเมนู?',message:menu.name+' · การลบนี้ไม่สามารถย้อนกลับได้',confirmText:'ลบเมนู',cancelText:'ยกเลิก',type:'danger'}))store.deleteMenu(menu.id)}
function beforeUnload(event){if(editing.value && editor.value?.isDirty()){event.preventDefault();event.returnValue=''}}
onMounted(()=>window.addEventListener('beforeunload',beforeUnload))
onUnmounted(()=>window.removeEventListener('beforeunload',beforeUnload))
</script>
<style scoped>
.menu-workbench{--workbench-muted:#705C50;display:grid;gap:24px;min-width:0}.workbench-heading{display:flex;justify-content:space-between;gap:16px;align-items:center}.workbench-heading h2{font-size:1.25rem;font-weight:600;line-height:1.5}.workbench-heading p{font-size:.8125rem;line-height:1.7;color:var(--workbench-muted);margin-top:4px}.workbench-heading>.ui-button{flex-shrink:0}
.workbench-columns{display:grid;grid-template-columns:220px minmax(0,1fr);gap:24px;align-items:start;min-width:0}.menu-browser{position:sticky;top:0;min-width:0;background:var(--bg-card);border-radius:16px;overflow:hidden}.menu-browser-tools{padding:16px 12px 12px}.menu-browser-tools>p{font-size:.75rem;color:var(--workbench-muted);margin-top:12px;padding-inline:4px}.menu-browser-list{max-height:calc(100dvh - 300px);min-height:120px;overflow-y:auto;overscroll-behavior:contain;padding:0 8px 12px}.menu-browser-item{display:flex;align-items:center;gap:10px;min-height:76px;text-align:start;width:100%;padding:12px 8px;border-radius:12px;cursor:pointer;border:1px solid transparent}.menu-browser-item[aria-pressed=true]{background:var(--accent-soft);border-color:var(--accent-border);color:var(--accent-brand)}.menu-list-emoji{font-size:24px;flex-shrink:0}.menu-browser-item>span:nth-child(2){flex:1;min-width:0}.menu-browser-item strong{font-size:.8125rem;font-weight:500;line-height:1.7;overflow-wrap:anywhere;display:block}.menu-browser-item small{font-size:.6875rem;display:block;color:var(--workbench-muted);margin-top:4px;line-height:1.7}.menu-browser-item>svg{flex-shrink:0}.menu-browser-empty{padding:20px 16px;font-size:.8125rem;line-height:1.7}.menu-browser-empty p{color:var(--workbench-muted);margin:8px 0 16px}
.menu-content{container:menu-content / inline-size;min-width:0;display:grid;gap:20px}.selected-menu-heading{display:flex;justify-content:space-between;align-items:flex-start;gap:20px}.selected-menu-identity{display:flex;gap:14px;min-width:0}.selected-menu-identity>span{font-size:32px;flex-shrink:0}.selected-menu-identity>div{min-width:0}.selected-menu-heading h3{font-size:1.125rem;font-weight:600;line-height:1.5;overflow-wrap:anywhere}.selected-menu-heading p{font-size:.8125rem;color:var(--workbench-muted);line-height:1.7;margin:4px 0 8px;overflow-wrap:anywhere}.selected-menu-actions{display:flex;gap:4px;flex-shrink:0}.menu-content-empty{display:grid;justify-items:center;gap:16px;padding:64px 24px;text-align:center;background:var(--bg-card);border-radius:16px}.menu-content-empty>svg{color:var(--accent-brand)}.menu-content-empty p{font-size:.875rem;color:var(--workbench-muted)}.menu-back{display:none}
.menu-unsaved{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;background:var(--bg-card);padding:20px;border-radius:16px}.menu-unsaved strong{font-size:.9375rem;font-weight:600}.menu-unsaved p{font-size:.8125rem;color:var(--workbench-muted);margin-top:4px}.menu-unsaved>div:last-child{display:flex;gap:8px;flex-wrap:wrap}
.menu-workbench :deep(:focus),.menu-workbench :deep(:focus-visible){outline:none!important;box-shadow:none!important}.menu-workbench :deep(.app-input input:focus-visible){outline:none!important}.menu-workbench :deep(.overview-platforms){grid-template-columns:minmax(0,1fr)}
@media(hover:hover){.menu-browser-item:hover{background:var(--bg-soft)}.menu-browser-item[aria-pressed=true]:hover{background:var(--accent-soft)}}
@media(min-width:1500px){.menu-workbench :deep(.overview-platforms){grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:1199px){.workbench-columns{grid-template-columns:200px minmax(0,1fr);gap:20px}.selected-menu-heading{flex-wrap:wrap}.selected-menu-actions{margin-inline-start:auto}}
@media(max-width:767px){.workbench-columns{grid-template-columns:minmax(0,1fr)}.menu-workbench{gap:20px}.workbench-heading{align-items:flex-start}.workbench-heading h2{font-size:1.125rem}.workbench-heading p{font-size:.75rem}.menu-browser{position:static}.menu-browser-list{max-height:none}.menu-content{display:none}.is-mobile-detail .menu-browser{display:none}.is-mobile-detail .menu-content{display:grid}.is-mobile-detail .menu-back{display:inline-flex;justify-self:start}.selected-menu-heading{gap:12px}.selected-menu-identity>span{font-size:28px}.menu-workbench :deep(.app-input input){font-size:1rem}.menu-unsaved{padding:16px}.menu-unsaved>div:last-child{gap:4px}.menu-unsaved :deep(.ui-button){font-size:.75rem}}
</style>
