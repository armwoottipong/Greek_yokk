<template>
 <Teleport to="body" :disabled="!teleport">
  <ModalShell :id="id" :open="present" :initial-focus="initialFocus" :labelled-by="`${id}-title`" class="dialog-frame-shell" :class="{'dialog-frame-shell--drawer':presentation==='drawer','dialog-frame-shell--sheet':presentation==='sheet'}" :style="viewportStyle" @request-close="requestClose">
   <Transition name="dialog-frame" appear @after-leave="finishLeave">
    <section v-if="open" class="dialog-frame-panel" :class="[`dialog-frame-panel--${presentation}`,{'dialog-frame-panel--compact':compact}]" :aria-busy="busy||undefined">
     <header class="dialog-frame-header"><slot name="header"><div><h3 :id="`${id}-title`">{{ title }}</h3><p v-if="description">{{ description }}</p></div></slot><IconButton label="ปิดหน้าต่าง" :disabled="busy" @click="requestClose"><X aria-hidden="true" /></IconButton></header>
     <div class="dialog-frame-body" :class="{'dialog-frame-body--contained':containedBody}"><slot /></div>
     <footer v-if="$slots.footer" class="dialog-frame-footer"><slot name="footer" /></footer>
    </section>
   </Transition>
  </ModalShell>
 </Teleport>
</template>
<script setup>
import {ref,watch,computed,onMounted,onUnmounted,onDeactivated,onActivated} from 'vue'
import {X} from 'lucide-vue-next'
import ModalShell from './ModalShell.vue'
import IconButton from './IconButton.vue'
const props=defineProps({open:Boolean,id:{type:String,required:true},title:{type:String,required:true},description:String,presentation:{type:String,default:'dialog'},busy:Boolean,teleport:{type:Boolean,default:true},initialFocus:String,width:{type:String,default:'640px'},compact:Boolean,containedBody:Boolean})
const emit=defineEmits(['request-close'])
const present=ref(props.open),viewport=ref({height:768,top:0})
watch(()=>props.open,open=>{if(open)present.value=true})
onDeactivated(()=>{present.value=false;emit('request-close')})
onActivated(()=>{present.value=props.open})
function requestClose(){if(!props.busy)emit('request-close')}
function finishLeave(){if(!props.open)present.value=false}
function resize(){viewport.value={height:window.visualViewport?.height||window.innerHeight,top:window.visualViewport?.offsetTop||0}}
onMounted(()=>{resize();window.addEventListener('resize',resize);window.visualViewport?.addEventListener('resize',resize);window.visualViewport?.addEventListener('scroll',resize)})
onUnmounted(()=>{window.removeEventListener('resize',resize);window.visualViewport?.removeEventListener('resize',resize);window.visualViewport?.removeEventListener('scroll',resize)})
const viewportStyle=computed(()=>({'--dialog-viewport-height':`${viewport.value.height}px`,'--dialog-offset-top':`${viewport.value.top}px`,'--dialog-width':props.width}))
</script>
<style scoped>
.dialog-frame-shell{position:fixed;inset:var(--dialog-offset-top) 0 auto;height:var(--dialog-viewport-height);display:flex;align-items:center;justify-content:center;padding:24px;background:#35252266}
.dialog-frame-panel{display:flex;flex-direction:column;width:min(100%,var(--dialog-width,640px));max-height:calc(var(--dialog-viewport-height) - 48px);overflow:hidden;background:var(--bg-card);border-radius:var(--dialog-radius);box-shadow:var(--overlay-shadow)}
.dialog-frame-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:24px 24px 12px;border:0;flex-shrink:0}.dialog-frame-header h3{font-size:1.125rem;font-weight:600;line-height:1.5;overflow-wrap:anywhere}.dialog-frame-header p{font-size:.8125rem;color:var(--text-muted);margin-top:6px;line-height:1.7}.dialog-frame-header>div{min-width:0}.dialog-frame-header :deep(.ui-icon-button){background:var(--bg-soft);border-radius:12px;color:var(--text-muted)}
.dialog-frame-body{min-height:0;overflow:auto;overscroll-behavior:contain;padding:24px;overflow-wrap:anywhere;font-size:.875rem}.dialog-frame-footer{display:flex;align-items:center;justify-content:flex-end;gap:12px;padding:16px 24px max(16px,env(safe-area-inset-bottom));border-top:1px solid transparent;flex-shrink:0;background:var(--bg-soft)}
.dialog-frame-panel--panel{align-self:stretch;margin-left:auto;width:min(100%,480px);max-height:100%;border-radius:24px 0 0 24px}
.dialog-frame-shell.dialog-frame-shell--drawer{padding:0;justify-content:center;align-items:flex-end}.dialog-frame-panel.dialog-frame-panel--drawer{width:min(100%,var(--dialog-width));height:auto;max-height:calc(var(--dialog-viewport-height) - 12px);border-radius:24px 24px 0 0;min-height:min(680px,calc(var(--dialog-viewport-height) - 12px))}.dialog-frame-panel--drawer .dialog-frame-header{padding-bottom:16px}.dialog-frame-panel--drawer .dialog-frame-body{padding-top:8px}
@media(max-width:767px){.dialog-frame-panel.dialog-frame-panel--drawer{width:100%}}
@media(max-width:767px){.dialog-frame-shell{padding:8px}.dialog-frame-panel{max-height:calc(var(--dialog-viewport-height) - 16px);border-radius:20px}.dialog-frame-header{padding:16px}.dialog-frame-body{padding:16px}.dialog-frame-footer{padding:12px 16px max(12px,env(safe-area-inset-bottom));flex-wrap:wrap}.dialog-frame-panel--sheet{align-self:flex-end;border-radius:24px 24px 0 0;max-height:calc(var(--dialog-viewport-height) - 24px)}.dialog-frame-panel--panel{border-radius:20px}}
@media(prefers-reduced-motion:no-preference){.dialog-frame-enter-active{transition:opacity 200ms ease,transform 200ms cubic-bezier(.2,.8,.3,1)}.dialog-frame-leave-active{transition:opacity 160ms ease,transform 160ms ease}.dialog-frame-enter-from,.dialog-frame-leave-to{opacity:0;transform:translateY(12px)}}
@media(prefers-reduced-motion:no-preference){.dialog-frame-panel--drawer.dialog-frame-enter-from,.dialog-frame-panel--drawer.dialog-frame-leave-to{transform:translateY(100%)}}
@media(prefers-reduced-motion:no-preference) and (max-width:767px){.dialog-frame-panel--sheet.dialog-frame-enter-from,.dialog-frame-panel--sheet.dialog-frame-leave-to{transform:translateY(100%)}}
</style>
<style scoped>
@media(max-width:1199px){.dialog-frame-shell--sheet{padding:0;align-items:flex-end}.dialog-frame-shell--sheet .dialog-frame-panel--sheet{width:min(100%,var(--dialog-width));max-height:calc(var(--dialog-viewport-height) - 16px);border-radius:24px 24px 0 0}.dialog-frame-panel--sheet .dialog-frame-body{padding-bottom:max(20px,env(safe-area-inset-bottom))}}
@media(prefers-reduced-motion:no-preference) and (max-width:1199px){.dialog-frame-panel--sheet.dialog-frame-enter-from,.dialog-frame-panel--sheet.dialog-frame-leave-to{transform:translateY(100%)}}
</style>

<style scoped>.dialog-frame-panel--compact>.dialog-frame-header,.dialog-frame-panel--compact>.dialog-frame-body,.dialog-frame-panel--compact>.dialog-frame-footer{padding:16px}.dialog-frame-panel--compact>.dialog-frame-header{padding-bottom:12px}.dialog-frame-panel--compact>.dialog-frame-body{padding-top:8px}</style>
<style scoped>.dialog-frame-panel--compact>.dialog-frame-footer{padding-bottom:max(16px,env(safe-area-inset-bottom))}</style>
<style scoped>.dialog-frame-body--contained{display:flex;flex-direction:column;flex:1 1 auto;overflow:hidden;min-height:0}</style>
