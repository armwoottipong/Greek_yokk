<template>
 <Teleport to="body" :disabled="!teleport">
  <ModalShell :id="id" :open="present" :initial-focus="initialFocus" :labelled-by="`${id}-title`" class="dialog-frame-shell" :style="viewportStyle" @request-close="requestClose">
   <Transition name="dialog-frame" @after-leave="finishLeave">
    <section v-if="open" class="dialog-frame-panel" :class="`dialog-frame-panel--${presentation}`" :aria-busy="busy||undefined">
     <header class="dialog-frame-header"><slot name="header"><div><h3 :id="`${id}-title`">{{ title }}</h3><p v-if="description">{{ description }}</p></div></slot><IconButton label="ปิดหน้าต่าง" :disabled="busy" @click="requestClose"><X aria-hidden="true" /></IconButton></header>
     <div class="dialog-frame-body"><slot /></div>
     <footer v-if="$slots.footer" class="dialog-frame-footer"><slot name="footer" /></footer>
    </section>
   </Transition>
  </ModalShell>
 </Teleport>
</template>
<script setup>
import {ref,watch,computed,onMounted,onUnmounted} from 'vue'
import {X} from 'lucide-vue-next'
import ModalShell from './ModalShell.vue'
import IconButton from './IconButton.vue'
const props=defineProps({open:Boolean,id:{type:String,required:true},title:{type:String,required:true},description:String,presentation:{type:String,default:'dialog'},busy:Boolean,teleport:{type:Boolean,default:true},initialFocus:String})
const emit=defineEmits(['request-close'])
const present=ref(props.open),viewport=ref({height:768,top:0})
watch(()=>props.open,open=>{if(open)present.value=true})
function requestClose(){if(!props.busy)emit('request-close')}
function finishLeave(){if(!props.open)present.value=false}
function resize(){viewport.value={height:window.visualViewport?.height||window.innerHeight,top:window.visualViewport?.offsetTop||0}}
onMounted(()=>{resize();window.addEventListener('resize',resize);window.visualViewport?.addEventListener('resize',resize);window.visualViewport?.addEventListener('scroll',resize)})
onUnmounted(()=>{window.removeEventListener('resize',resize);window.visualViewport?.removeEventListener('resize',resize);window.visualViewport?.removeEventListener('scroll',resize)})
const viewportStyle=computed(()=>({'--dialog-viewport-height':`${viewport.value.height}px`,'--dialog-offset-top':`${viewport.value.top}px`}))
</script>
<style scoped>
.dialog-frame-shell{position:fixed;inset:var(--dialog-offset-top) 0 auto;height:var(--dialog-viewport-height);display:flex;align-items:center;justify-content:center;padding:24px;background:#35252266}
.dialog-frame-panel{display:flex;flex-direction:column;width:min(100%,640px);max-height:calc(var(--dialog-viewport-height) - 48px);overflow:hidden;background:var(--bg-card);border-radius:var(--dialog-radius);box-shadow:var(--overlay-shadow)}
.dialog-frame-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:20px 24px;border-bottom:1px solid var(--border-subtle);flex-shrink:0}.dialog-frame-header h3{font-size:1.0625rem;font-weight:600;line-height:1.5}.dialog-frame-header p{font-size:.75rem;color:var(--text-muted);margin-top:5px;line-height:1.6}.dialog-frame-header>div{min-width:0}
.dialog-frame-body{min-height:0;overflow:auto;overscroll-behavior:contain;padding:24px;font-size:.875rem}.dialog-frame-footer{display:flex;align-items:center;justify-content:flex-end;gap:12px;padding:16px 24px max(16px,env(safe-area-inset-bottom));border-top:1px solid var(--border-subtle);flex-shrink:0;background:var(--bg-card)}
.dialog-frame-panel--panel{align-self:stretch;margin-left:auto;width:min(100%,480px);max-height:100%;border-radius:24px 0 0 24px}
@media(max-width:767px){.dialog-frame-shell{padding:8px}.dialog-frame-panel{max-height:calc(var(--dialog-viewport-height) - 16px);border-radius:20px}.dialog-frame-header{padding:16px}.dialog-frame-body{padding:16px}.dialog-frame-footer{padding:12px 16px max(12px,env(safe-area-inset-bottom));flex-wrap:wrap}.dialog-frame-panel--sheet{align-self:flex-end;border-radius:24px 24px 0 0;max-height:calc(var(--dialog-viewport-height) - 24px)}.dialog-frame-panel--panel{border-radius:20px}}
@media(prefers-reduced-motion:no-preference){.dialog-frame-enter-active{transition:opacity 200ms ease,transform 200ms cubic-bezier(.2,.8,.3,1)}.dialog-frame-leave-active{transition:opacity 160ms ease,transform 160ms ease}.dialog-frame-enter-from,.dialog-frame-leave-to{opacity:0;transform:translateY(12px)}}
</style>
