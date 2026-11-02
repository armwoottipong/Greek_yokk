<template>
 <div class="catalog-analysis-action" :class="{'catalog-analysis-action--ported':triggerTarget}">
  <Teleport :to="actualTarget||'body'" :disabled="!actualTarget"><IconButton ref="trigger" :data-catalog-analysis="entity" label="วิเคราะห์ต้นทุนกำไร" @click="open=true"><ChartNoAxesCombined :size="18" aria-hidden="true"/></IconButton></Teleport>
  <DialogFrame :open="open" :id="`catalog-${entity}-analysis`" title="วิเคราะห์ต้นทุนกำไร" :presentation="mobile?'drawer':'dialog'" width="960px" @request-close="close">
   <slot/>
  </DialogFrame>
 </div>
</template>
<script setup>
import {ref,onMounted,onUnmounted,watch,nextTick} from 'vue'
import {ChartNoAxesCombined} from 'lucide-vue-next'
import DialogFrame from '../ui/DialogFrame.vue'
import IconButton from '../ui/IconButton.vue'
const props=defineProps({entity:{type:String,required:true},resetKey:String,triggerTarget:String})
const open=ref(false),mobile=ref(false),trigger=ref(null),actualTarget=ref(null)
let targetTimer=null
function resize(){mobile.value=window.innerWidth<768}
onMounted(()=>{resize();window.addEventListener('resize',resize);targetTimer=setTimeout(()=>{actualTarget.value=props.triggerTarget?document.querySelector(props.triggerTarget):null},0)})
onUnmounted(()=>{clearTimeout(targetTimer);window.removeEventListener('resize',resize)})
watch(()=>props.resetKey,()=>{open.value=false})
async function close(){open.value=false;await nextTick();trigger.value?.$el?.focus()}
</script>
<style scoped>
.catalog-analysis-action{display:flex;justify-content:flex-end;min-width:0}
.catalog-analysis-action--ported{display:contents}
.catalog-analysis-action :deep(.ui-icon-button){border:1px solid var(--border-subtle);background:var(--bg-card);border-radius:12px;min-width:44px;min-height:44px}
</style>
