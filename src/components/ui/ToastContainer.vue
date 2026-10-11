<template>
  <div class="ui-toasts">
    <transition-group name="toast">
      <div
        v-for="toast in store.toasts"
        :key="toast.id"
        :role="toast.type === 'error' ? 'alert' : 'status'"
        :aria-live="toast.type === 'error' ? 'assertive' : 'polite'"
        aria-atomic="true"
        :class="[
          'flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-xs font-medium transition-all',
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
      </div>
    </transition-group>
  </div>
</template>

<script setup>
import { usePosStore } from '@/stores/posStore'
import { CheckCircle2, AlertTriangle, Info } from 'lucide-vue-next'

const store = usePosStore()
</script>

<style scoped>
.ui-toasts{position:fixed;right:16px;bottom:max(16px,env(safe-area-inset-bottom));width:min(384px,calc(100vw - 32px));z-index:160;display:flex;flex-direction:column;gap:8px;pointer-events:none}.ui-toasts>div{overflow-wrap:anywhere;font-size:.8125rem;line-height:1.6}
@media(max-width:767px){.ui-toasts{top:max(12px,env(safe-area-inset-top));bottom:auto}}
@media(prefers-reduced-motion:no-preference){
.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
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
