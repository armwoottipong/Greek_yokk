<template>
 <span ref="infoRoot" class="menu-analysis-info" @mouseenter="infoOpen=true" @mouseleave="leaveInfo" @focusout="blurInfo" @keydown.esc.prevent.stop="infoOpen=false">
        <button ref="trigger" type="button" :data-menu-analysis-info="entity==='menu'?'':undefined" :data-addon-analysis-info="entity==='addon'?'':undefined" class="menu-analysis-info-trigger" aria-label="วิธีคำนวณรายรับ ต้นทุน และกำไร" :aria-describedby="infoOpen ? infoId : undefined" @focus="infoOpen=true" @click="infoOpen=true"><Info :size="18" aria-hidden="true"/></button>
        <span v-if="infoOpen" :id="infoId" ref="panel" role="tooltip" class="menu-analysis-info-panel" :style="position">
         <slot/>
        </span>
        <span v-if="infoOpen" class="menu-analysis-info-arrow" :class="{'is-above':above}" :style="arrowPosition" aria-hidden="true"/>
 </span>
</template>
<script setup>
import {ref,watch,useId,onMounted,onUnmounted,nextTick} from 'vue'
import {Info} from 'lucide-vue-next'
import {topOverlayLayer} from '@/composables/overlayState'
import {floatingInfoPlacement} from './floatingInfoPlacement'
const props=defineProps({resetKey:String,entity:{type:String,default:'menu'}})
const infoRoot=ref(null),infoOpen=ref(false),trigger=ref(null),panel=ref(null),position=ref({visibility:'hidden'}),arrowPosition=ref({visibility:'hidden'}),above=ref(false),infoId=`menu-analysis-info-${useId()}`
function place(){
 if(!infoOpen.value||!trigger.value||!panel.value)return
 const placement=floatingInfoPlacement(trigger.value,panel.value,320,topOverlayLayer()+10)
 position.value=placement.panel;arrowPosition.value=placement.arrow;above.value=placement.above
}
function leaveInfo(){if(!infoRoot.value?.contains(document.activeElement))infoOpen.value=false}
function blurInfo(event){if(!infoRoot.value?.contains(event.relatedTarget))infoOpen.value=false}
function outsideInfo(event){if(!infoRoot.value?.contains(event.target))infoOpen.value=false}
onMounted(()=>{document.addEventListener('pointerdown',outsideInfo);window.addEventListener('resize',place);window.addEventListener('scroll',place,true)})
onUnmounted(()=>{document.removeEventListener('pointerdown',outsideInfo);window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true)})
watch(infoOpen,async open=>{if(open){await nextTick();place()}else{position.value={visibility:'hidden'};arrowPosition.value={visibility:'hidden'}}})
watch(()=>props.resetKey,()=>{infoOpen.value=false})
</script>
<style scoped>
.menu-analysis-info{display:inline-flex;flex-shrink:0;z-index:3}
.menu-analysis-info-trigger{display:grid;place-items:center;width:44px;height:44px;border-radius:12px;color:var(--text-muted);cursor:pointer}
.menu-analysis-info-trigger[aria-describedby]{background:var(--accent-soft);color:var(--accent-brand)}
.menu-analysis-info-panel{position:fixed;display:grid;gap:10px;width:min(320px,calc(100vw - 24px));max-height:calc(100vh - 24px);overflow:auto;overscroll-behavior:contain;padding:16px;background:var(--bg-card);color:var(--text-main);border-radius:12px;box-shadow:var(--shadow-popup);font-size:.8125rem;line-height:1.7;overflow-wrap:anywhere;text-align:left}
.menu-analysis-info-arrow{position:fixed;width:12px;height:12px;transform:rotate(45deg);background:var(--bg-card);border-top:1px solid var(--border-subtle);border-left:1px solid var(--border-subtle);pointer-events:none}.menu-analysis-info-arrow.is-above{border:0;border-right:1px solid var(--border-subtle);border-bottom:1px solid var(--border-subtle)}
@media(hover:hover){.menu-analysis-info-trigger:hover{background:var(--accent-soft);color:var(--accent-brand)}}
</style>
