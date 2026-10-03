<template>
  <div
    v-if="modal.isOpen"
    class="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150"
    @click.self="handleBackdropClick"
    tabindex="-1"
    @keydown.esc="onCancel"
    @keydown.enter.prevent="onConfirm"
  >
    <div
      class="bg-white rounded-2xl border border-stone-200/80 shadow-2xl max-w-sm w-full p-6 space-y-4 animate-in zoom-in-95 duration-150 relative"
      role="dialog"
      aria-modal="true"
    >
      <!-- Icon & Title Header -->
      <div class="flex items-start gap-3.5">
        <div
          class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xl border"
          :class="themeClasses.iconBox"
        >
          <span>{{ themeClasses.emoji }}</span>
        </div>
        <div class="min-w-0 flex-1 pt-0.5">
          <h3 class="text-sm font-bold text-stone-900 leading-snug">
            {{ modal.title || 'ยืนยันการดำเนินการ' }}
          </h3>
          <p class="text-xs text-stone-500 mt-1 leading-relaxed whitespace-pre-line">
            {{ modal.message }}
          </p>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="pt-3 flex items-center justify-end gap-2 border-t border-stone-100">
        <button
          type="button"
          @click="onCancel"
          class="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer select-none"
        >
          {{ modal.cancelText || 'ยกเลิก' }}
        </button>
        <button
          type="button"
          @click="onConfirm"
          class="px-5 py-2 text-xs font-semibold rounded-xl text-white shadow-xs transition-all cursor-pointer select-none"
          :class="themeClasses.confirmBtn"
          ref="confirmButtonRef"
        >
          {{ modal.confirmText || 'ยืนยัน' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, nextTick } from 'vue'
import { usePosStore } from '@/stores/posStore'

const store = usePosStore()
const modal = computed(() => store.modals.confirm || {})
const confirmButtonRef = ref(null)

const themeClasses = computed(() => {
  const type = modal.value.type || 'warning'
  switch (type) {
    case 'danger':
      return {
        emoji: '🗑️',
        iconBox: 'bg-rose-50 text-rose-700 border-rose-200/60',
        confirmBtn: 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800'
      }
    case 'save':
      return {
        emoji: '💾',
        iconBox: 'bg-emerald-50 text-emerald-800 border-emerald-200/60',
        confirmBtn: 'bg-stone-900 hover:bg-stone-800 active:bg-stone-950'
      }
    case 'info':
      return {
        emoji: 'ℹ️',
        iconBox: 'bg-blue-50 text-blue-800 border-blue-200/60',
        confirmBtn: 'bg-stone-900 hover:bg-stone-800 active:bg-stone-950'
      }
    case 'warning':
    default:
      return {
        emoji: '⚠️',
        iconBox: 'bg-amber-50 text-amber-900 border-amber-200/60',
        confirmBtn: 'bg-amber-900 hover:bg-amber-950 active:bg-stone-900'
      }
  }
})

watch(() => modal.value.isOpen, (open) => {
  if (open) {
    nextTick(() => {
      confirmButtonRef.value?.focus?.()
    })
  }
})

function handleBackdropClick() {
  onCancel()
}

function onConfirm() {
  if (typeof modal.value.onConfirm === 'function') {
    modal.value.onConfirm()
  } else {
    store.modals.confirm.isOpen = false
  }
}

function onCancel() {
  if (typeof modal.value.onCancel === 'function') {
    modal.value.onCancel()
  } else {
    store.modals.confirm.isOpen = false
  }
}
</script>
