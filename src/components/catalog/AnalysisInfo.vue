<template>
 <span ref="infoRoot" class="menu-analysis-info" @mouseenter="infoOpen=true" @mouseleave="leaveInfo" @focusout="blurInfo" @keydown.esc.prevent.stop="infoOpen=false">
        <button type="button" :data-menu-analysis-info="entity==='menu'?'':undefined" :data-addon-analysis-info="entity==='addon'?'':undefined" class="menu-analysis-info-trigger" aria-label="วิธีคำนวณรายรับ ต้นทุน และกำไร" :aria-describedby="infoOpen ? infoId : undefined" @focus="infoOpen=true" @click="infoOpen=true"><Info :size="18" aria-hidden="true"/></button>
        <span v-if="infoOpen" :id="infoId" role="tooltip" class="menu-analysis-info-panel">
         <slot/>
        </span>
 </span>
</template>
<script setup>
import {ref,watch,useId,onMounted,onUnmounted} from 'vue'
import {Info} from 'lucide-vue-next'
const props=defineProps({resetKey:String,entity:{type:String,default:'menu'}})
const infoRoot=ref(null),infoOpen=ref(false),infoId=`menu-analysis-info-${useId()}`
function leaveInfo(){if(!infoRoot.value?.contains(document.activeElement))infoOpen.value=false}
function blurInfo(event){if(!infoRoot.value?.contains(event.relatedTarget))infoOpen.value=false}
function outsideInfo(event){if(!infoRoot.value?.contains(event.target))infoOpen.value=false}
onMounted(()=>document.addEventListener('pointerdown',outsideInfo))
onUnmounted(()=>document.removeEventListener('pointerdown',outsideInfo))
watch(()=>props.resetKey,()=>{infoOpen.value=false})
</script>
<style scoped>
.menu-analysis-info{position:relative;display:inline-flex;flex-shrink:0;z-index:3}
.menu-analysis-info-trigger{display:grid;place-items:center;width:44px;height:44px;border-radius:12px;color:var(--text-muted);cursor:pointer}
.menu-analysis-info-trigger[aria-describedby]{background:var(--accent-soft);color:var(--accent-brand)}
.menu-analysis-info-panel{position:absolute;inset-inline-end:0;top:100%;display:grid;gap:10px;width:min(320px,calc(100vw - 64px));padding:16px;background:var(--bg-card);color:var(--text-main);border-radius:12px;box-shadow:var(--shadow-popup);font-size:.8125rem;line-height:1.7;overflow-wrap:anywhere}
@media(hover:hover){.menu-analysis-info-trigger:hover{background:var(--accent-soft);color:var(--accent-brand)}}
</style>
