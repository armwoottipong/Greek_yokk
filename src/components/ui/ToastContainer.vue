<template>
  <div class="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
    <transition-group name="toast">
      <div
        v-for="toast in store.toasts"
        :key="toast.id"
        :class="[
          'pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-xs font-medium max-w-sm transition-all',
          toast.type === 'error'
            ? 'bg-rose-900 text-rose-50 border border-rose-700 shadow-rose-950/20'
            : toast.type === 'info'
            ? 'bg-stone-900 text-stone-100 border border-stone-700 shadow-stone-950/20'
            : 'bg-emerald-900 text-emerald-50 border border-emerald-700 shadow-emerald-950/20'
        ]"
      >
        <CheckCircle2 v-if="toast.type === 'success'" class="w-4 h-4 text-emerald-400 shrink-0" />
        <AlertTriangle v-else-if="toast.type === 'error'" class="w-4 h-4 text-rose-400 shrink-0" />
        <Info v-else class="w-4 h-4 text-stone-400 shrink-0" />
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
</style>
