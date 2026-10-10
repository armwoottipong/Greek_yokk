<template>
  <label class="flex items-center justify-between p-3.5 rounded-xl bg-[#FBF5EA] border border-stone-100 hover:border-stone-200/80 cursor-pointer select-none transition-all">
    <div class="pr-2">
      <div class="flex items-center gap-1.5 font-medium text-stone-800 text-xs">
        <span v-if="icon">{{ icon }}</span>
        <span>{{ label }}</span>
      </div>
      <p v-if="description" class="text-[10px] text-stone-400 mt-0.5">{{ description }}</p>
    </div>
    
    <div class="relative inline-flex items-center shrink-0">
      <input
        type="checkbox"
        :checked="modelValue"
        @change="$emit('update:modelValue', $event.target.checked)"
        class="sr-only peer"
      >
      <div
        :class="[
          'w-10 h-6 bg-stone-200 rounded-full transition-colors relative',
          color === 'purple'
            ? 'peer-checked:bg-purple-700'
            : color === 'emerald'
            ? 'peer-checked:bg-emerald-600'
            : 'peer-checked:bg-brand-600'
        ]"
      >
        <div class="absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow-sm transition-transform transform peer-checked:translate-x-4"></div>
      </div>
    </div>
  </label>
</template>

<script setup>
defineProps({
  modelValue: {
    type: Boolean,
    default: true
  },
  label: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  icon: {
    type: String,
    default: ''
  },
  color: {
    type: String,
    default: 'amber' // 'amber' | 'purple' | 'emerald'
  }
})

defineEmits(['update:modelValue'])
</script>
