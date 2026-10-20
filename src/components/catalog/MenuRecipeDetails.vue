<template>
 <div id="menu-recipe" class="menu-detail-workspace">
  <section class="menu-analysis-panel" aria-label="ข้อมูลวิเคราะห์เมนู">
   <section aria-label="รายรับ ต้นทุน และกำไร">
    <MenuPlatformOverview :menu="menu" :platforms="platforms" :cost="displayCost" :estimated="hasEstimates" :worst="worstView">
     <template v-if="hasEstimates" #controls><div class="recipe-view-toggle"><span aria-live="polite">{{ worstView ? 'ชุดแพงสุด' : 'ค่าเฉลี่ย' }}</span><IconButton :label="worstView ? 'สลับเป็นค่าเฉลี่ย' : 'สลับเป็นชุดแพงสุด'" :aria-pressed="worstView" @click="worstView = !worstView"><ArrowLeftRight :size="16" aria-hidden="true"/></IconButton></div></template>
    </MenuPlatformOverview>
    <template v-if="hasEstimates">
     <p class="recipe-help">{{ worstView ? 'คำนวณจากชุดต้นทุนสูงสุดตามกติกาการเลือกซ้ำ' : 'เฉลี่ยต้นทุนจากตัวเลือกที่เปิดขาย โดยสมมติว่าแต่ละตัวเลือกถูกเลือกเท่า ๆ กัน' }} · เลือกครบจำนวนสูงสุดของกลุ่มฟรี · ไม่รวม Add-on เพิ่มเงิน</p>
     <p v-for="group in costEstimate.groups" :key="group.id" class="recipe-help">{{ group.name }} · {{ group.count }} {{ group.allowRepeat ? 'ที่ · เลือกซ้ำได้' : 'ชนิด · ไม่ซ้ำ' }}</p>
     <p v-if="displayCost === null" class="recipe-help" role="status">ยังคำนวณไม่ได้ กรุณาตรวจต้นทุน สูตร และจำนวนตัวเลือกที่เปิดขายให้เพียงพอ</p>
    </template>
    <p v-else class="recipe-help">คำนวณทุกช่องทางจากราคาขาย หัก GP และต้นทุนสูตรเดียวกัน</p>
   </section>

  </section>
  <MenuRecipePanel :menu="menu" :items="items" :addon-groups="addonGroups" @edit="$emit('edit',{section:'recipe'})"/>
 </div>
</template>
<script setup>
import MenuPlatformOverview from './MenuPlatformOverview.vue'
import MenuRecipePanel from './MenuRecipePanel.vue'
import {computed,ref,watch} from 'vue'
import IconButton from '../ui/IconButton.vue'
import {ArrowLeftRight} from 'lucide-vue-next'
const props=defineProps({menu:{type:Object,required:true},items:{type:Array,default:()=>[]},foodCost:Number,costEstimate:Object,platforms:Array,addonGroups:{type:Array,default:()=>[]}})
const worstView=ref(false)
watch(()=>props.menu.id,()=>{worstView.value=false})
const hasEstimates=computed(()=>Boolean(props.costEstimate?.groups.length))
const displayCost=computed(()=>hasEstimates.value ? (worstView.value?props.costEstimate.worstCost:props.costEstimate.averageCost) : props.costEstimate ? props.costEstimate.baseCost : props.foodCost)
defineEmits(['edit'])
</script>
<style scoped src="./catalogRecipe.css"></style>
<style scoped>
.menu-detail-workspace{display:grid;grid-template-columns:minmax(0,1fr);gap:20px;align-items:start;min-width:0}.menu-analysis-panel{background:var(--bg-card);padding:24px;border-radius:16px;min-width:0}.recipe-view-toggle{display:flex;align-items:center;gap:4px;font-size:.75rem;color:#705C50;flex-shrink:0}.menu-analysis-panel .recipe-help{margin-top:16px;margin-bottom:0;color:#705C50}.menu-detail-workspace :deep(:focus-visible){outline:none!important;box-shadow:none!important}
@container menu-content (min-width:800px){.menu-detail-workspace{grid-template-columns:minmax(0,1fr) 290px}.menu-detail-workspace :deep(.overview-platforms){grid-template-columns:minmax(0,1fr)}}
@container menu-content (max-width:560px){.menu-analysis-panel{padding:16px}.menu-analysis-panel :deep(.overview-platforms){grid-template-columns:minmax(0,1fr)}}
</style>
