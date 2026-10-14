<template>
 <Button class="table-sort-button" variant="quiet" size="compact" :aria-label="`เรียงตาม${label}`" :aria-pressed="Boolean(direction)" :title="direction==='asc'?'เรียงจากน้อยไปมาก · กดเพื่อกลับทิศทาง':direction==='desc'?'เรียงจากมากไปน้อย · กดเพื่อคืนลำดับเดิม':'กดเพื่อเรียงจากน้อยไปมาก'" @click="$emit('sort')">
  <span>{{ label }}</span><ArrowUp v-if="direction==='asc'" :size="12" aria-hidden="true"/><ArrowDown v-else-if="direction==='desc'" :size="12" aria-hidden="true"/><ArrowUpDown v-else :size="12" aria-hidden="true"/>
 </Button>
</template>
<script setup>
import {ArrowUp,ArrowDown,ArrowUpDown} from 'lucide-vue-next'
import Button from './Button.vue'
defineProps({label:{type:String,required:true},direction:String})
defineEmits(['sort'])
</script>
<style scoped>
.table-sort-button{display:inline-flex;align-items:center;gap:5px;font:inherit;white-space:nowrap}.table-sort-button svg{flex-shrink:0}.table-sort-button[aria-pressed=false] svg{opacity:.55}.table-sort-button[aria-pressed=true]{color:var(--accent-brand)}
</style>
