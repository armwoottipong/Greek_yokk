<template>
  <div class="ui-toasts">
    <div data-toast-announcer class="sr-only" role="status" aria-live="polite" aria-atomic="true">{{ announcement }}</div>
    <transition-group name="toast">
      <div
        v-for="toast in store.toasts"
        :key="toast.id"
        :role="toast.type === 'error' ? 'alert' : undefined"
        @mouseenter="pause(toast.id, 'hover')" @mouseleave="resume(toast.id, 'hover')" @focusin="pause(toast.id, 'focus')" @focusout="resume(toast.id, 'focus')"
        aria-atomic="true"
        :class="[
          'flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-xs font-medium',
          toast.type === 'error'
            ? 'bg-rose-900 text-rose-50 border border-rose-700 shadow-rose-950/20'
            : toast.type === 'info'
            ? 'bg-brand-600 text-stone-100 border border-stone-700 shadow-stone-950/20'
            : 'bg-emerald-900 text-emerald-50 border border-emerald-700 shadow-emerald-950/20'
        ]"
      >
        <CheckCircle2 v-if="toast.type === 'success'" aria-hidden="true" class="w-4 h-4 text-emerald-400 shrink-0" />
        <AlertTriangle v-else-if="toast.type === 'error'" aria-hidden="true" class="w-4 h-4 text-rose-400 shrink-0" />
        <Info v-else aria-hidden="true" class="w-4 h-4 text-white shrink-0" />
        <span class="flex-1 leading-relaxed">{{ toast.message }}</span>
        <button type="button" aria-label="ปิดข้อความแจ้งเตือน" class="toast-dismiss" @click="store.dismissToast(toast.id)"><X :size="18" aria-hidden="true" /></button>
      </div>
    </transition-group>
  </div>
</template>

<script setup>
import { usePosStore } from '@/stores/posStore'
import {ref,watch,nextTick,onUnmounted} from 'vue'
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-vue-next'

const store = usePosStore()
const announcement=ref('')
const timers=new Map()
let announcedIds=new Set()
watch(()=>store.toasts.map(t=>({id:t.id,type:t.type,message:t.message})),async toasts=>{
 const fresh=toasts.filter(t=>t.type!=='error'&&!announcedIds.has(t.id))
 announcedIds=new Set(toasts.map(t=>t.id))
 if(!fresh.length)return
 announcement.value='';await nextTick();announcement.value=fresh.map(t=>t.message).join('\n')
},{immediate:true})
function schedule(id,entry){entry.started=Date.now();entry.handle=setTimeout(()=>{store.dismissToast(id);timers.delete(id)},entry.remaining)}
function pause(id,kind){const entry=timers.get(id);if(!entry)return;entry[kind]=true;if(entry.paused)return;clearTimeout(entry.handle);entry.remaining=Math.max(0,entry.remaining-(Date.now()-entry.started));entry.paused=true}
function resume(id,kind){const entry=timers.get(id);if(!entry)return;entry[kind]=false;if(!entry.paused||entry.hover||entry.focus)return;entry.paused=false;schedule(id,entry)}
watch(()=>store.toasts.map(t=>t.id),()=>{
 for(const [id,entry] of timers)if(!store.toasts.some(t=>t.id===id)){clearTimeout(entry.handle);timers.delete(id)}
 for(const toast of store.toasts)if(toast.type!=='error'&&!timers.has(toast.id)){const entry={remaining:5000,paused:false,hover:false,focus:false};timers.set(toast.id,entry);schedule(toast.id,entry)}
},{immediate:true})
onUnmounted(()=>{for(const entry of timers.values())clearTimeout(entry.handle);timers.clear()})
</script>

<style scoped>
.ui-toasts{position:fixed;right:16px;bottom:max(16px,env(safe-area-inset-bottom));width:min(384px,calc(100vw - 32px));z-index:160;display:flex;flex-direction:column;gap:8px;pointer-events:none}.ui-toasts>div:not(.sr-only){pointer-events:auto;overflow-wrap:anywhere;font-size:.8125rem;line-height:1.6}
.toast-dismiss{display:flex;align-items:center;justify-content:center;flex-shrink:0;min-width:44px;min-height:44px;border-radius:8px;color:inherit}.toast-dismiss:focus-visible{outline:2px solid currentColor;outline-offset:2px}
@media(max-width:767px){.ui-toasts{top:max(12px,env(safe-area-inset-top));bottom:auto}}
@media(prefers-reduced-motion:no-preference){
.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.toast-enter-from {
  opacity: 0;
  transform: translateY(16px) scale(0.95);
}
.toast-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.95);
}
}
</style>
