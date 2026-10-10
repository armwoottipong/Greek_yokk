<template>
  <AppCheckbox :model-value="modelValue" @update:modelValue="$emit('update:modelValue',$event)" :label="label" :disabled="disabled" variant="switch" class="p-3.5 rounded-xl bg-[#FBF5EA] border border-stone-100 hover:border-stone-200/80">
    <div class="pr-2">
      <div class="flex items-center gap-1.5 font-medium text-stone-800 text-xs">
        <span v-if="icon" aria-hidden="true">{{ icon }}</span>
        <span>{{ label }}</span>
      </div>
      <p v-if="description" class="text-[10px] text-stone-400 mt-0.5">{{ description }}</p>
    </div>
    
  </AppCheckbox>
</template>

<script setup>
import AppCheckbox from '@/components/ui/AppCheckbox.vue'
defineProps({
  disabled:Boolean,
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
