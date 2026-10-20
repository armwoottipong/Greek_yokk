<template>
 <div id="menu-recipe" class="menu-detail-workspace">
  <section class="menu-analysis-panel" aria-label="ข้อมูลวิเคราะห์เมนู">
   <section aria-label="รายรับ ต้นทุน และกำไร">
    <MenuPlatformOverview :menu="menu" :platforms="platforms" :cost="displayCost" :estimated="hasEstimates" :worst="worstView">
     <template #controls>
      <div class="menu-analysis-actions">
       <div v-if="hasEstimates" class="recipe-view-toggle"><span aria-live="polite">{{ worstView ? 'ชุดแพงสุด' : 'ค่าเฉลี่ย' }}</span><IconButton :label="worstView ? 'สลับเป็นค่าเฉลี่ย' : 'สลับเป็นชุดแพงสุด'" :aria-pressed="worstView" @click="worstView = !worstView"><ArrowLeftRight :size="16" aria-hidden="true"/></IconButton></div>
       <span ref="infoRoot" class="menu-analysis-info" @mouseenter="infoOpen=true" @mouseleave="leaveInfo" @focusout="blurInfo" @keydown.esc.prevent.stop="infoOpen=false">
        <button type="button" data-menu-analysis-info class="menu-analysis-info-trigger" aria-label="วิธีคำนวณรายรับ ต้นทุน และกำไร" :aria-describedby="infoOpen ? infoId : undefined" @focus="infoOpen=true" @click="infoOpen=true"><Info :size="18" aria-hidden="true"/></button>
        <span v-if="infoOpen" :id="infoId" role="tooltip" class="menu-analysis-info-panel">
         <span v-if="!hasEstimates">คำนวณทุกช่องทางจากราคาขาย หัก GP และต้นทุนสูตรเดียวกัน</span>
         <span>สัดส่วนใต้ตัวเลขเทียบกับราคาขาย ส่วนอัตรากำไรเทียบกับรายรับหลัง GP</span>
         <span>ยังไม่หักค่าเช่า ค่าแรง และค่าใช้จ่ายอื่น</span>
        </span>
       </span>
      </div>
     </template>
    </MenuPlatformOverview>
    <template v-if="hasEstimates">
     <p class="recipe-help">{{ worstView ? 'คำนวณจากชุดต้นทุนสูงสุดตามกติกาการเลือกซ้ำ' : 'เฉลี่ยต้นทุนจากตัวเลือกที่เปิดขาย โดยสมมติว่าแต่ละตัวเลือกถูกเลือกเท่า ๆ กัน' }} · เลือกครบจำนวนสูงสุดของกลุ่มฟรี · ไม่รวม Add-on เพิ่มเงิน</p>
     <p v-for="group in costEstimate.groups" :key="group.id" class="recipe-help">{{ group.name }} · {{ group.count }} {{ group.allowRepeat ? 'ที่ · เลือกซ้ำได้' : 'ชนิด · ไม่ซ้ำ' }}</p>
     <p v-if="displayCost === null" class="recipe-help" role="status">ยังคำนวณไม่ได้ กรุณาตรวจต้นทุน สูตร และจำนวนตัวเลือกที่เปิดขายให้เพียงพอ</p>
    </template>
   </section>

  </section>
  <MenuRecipePanel :menu="menu" :items="items" :addon-groups="addonGroups" @edit="$emit('edit',{section:'recipe'})"/>
 </div>
</template>
<script setup>
import MenuPlatformOverview from './MenuPlatformOverview.vue'
import MenuRecipePanel from './MenuRecipePanel.vue'
import {computed,ref,watch,useId,onMounted,onUnmounted} from 'vue'
import IconButton from '../ui/IconButton.vue'
import {ArrowLeftRight,Info} from 'lucide-vue-next'
const props=defineProps({menu:{type:Object,required:true},items:{type:Array,default:()=>[]},foodCost:Number,costEstimate:Object,platforms:Array,addonGroups:{type:Array,default:()=>[]}})
const infoRoot=ref(null),infoOpen=ref(false),infoId=`menu-analysis-info-${useId()}`
function leaveInfo(){if(!infoRoot.value?.contains(document.activeElement))infoOpen.value=false}
function blurInfo(event){if(!infoRoot.value?.contains(event.relatedTarget))infoOpen.value=false}
function outsideInfo(event){if(!infoRoot.value?.contains(event.target))infoOpen.value=false}
onMounted(()=>document.addEventListener('pointerdown',outsideInfo))
onUnmounted(()=>document.removeEventListener('pointerdown',outsideInfo))
const worstView=ref(false)
watch(()=>props.menu.id,()=>{worstView.value=false;infoOpen.value=false})
const hasEstimates=computed(()=>Boolean(props.costEstimate?.groups.length))
const displayCost=computed(()=>hasEstimates.value ? (worstView.value?props.costEstimate.worstCost:props.costEstimate.averageCost) : props.costEstimate ? props.costEstimate.baseCost : props.foodCost)
defineEmits(['edit'])
</script>
<style scoped src="./catalogRecipe.css"></style>
<style scoped>
.menu-detail-workspace{display:grid;grid-template-columns:minmax(0,1fr);gap:24px;align-items:start;min-width:0}.menu-analysis-panel{background:var(--bg-card);padding:24px;border-radius:16px;min-width:0}.recipe-view-toggle{display:flex;align-items:center;gap:4px;font-size:.75rem;color:#705C50;flex-shrink:0}.menu-analysis-panel .recipe-help{margin-top:16px;margin-bottom:0;color:#705C50}.menu-detail-workspace :deep(:focus-visible){outline:none!important;box-shadow:none!important}
.menu-analysis-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;margin-inline-start:auto}
.menu-analysis-info{position:relative;display:inline-flex;flex-shrink:0;z-index:3}
.menu-analysis-info-trigger{display:grid;place-items:center;width:44px;height:44px;border-radius:12px;color:var(--text-muted);cursor:pointer}
.menu-analysis-info-trigger[aria-describedby]{background:var(--accent-soft);color:var(--accent-brand)}
.menu-analysis-info-panel{position:absolute;inset-inline-end:0;top:100%;display:grid;gap:10px;width:min(320px,calc(100vw - 64px));padding:16px;background:var(--bg-card);color:var(--text-main);border-radius:12px;box-shadow:var(--shadow-popup);font-size:.8125rem;line-height:1.7;overflow-wrap:anywhere}
@media(hover:hover){.menu-analysis-info-trigger:hover{background:var(--accent-soft);color:var(--accent-brand)}}
@container menu-content (min-width:840px){.menu-detail-workspace{grid-template-columns:minmax(0,1fr) 288px}}
@container menu-content (max-width:560px){.menu-analysis-panel{padding:16px}}
</style>
