<template>
 <span class="app-input" :class="[$attrs.class,{'app-input--disabled':disabled}]" :style="$attrs.style">
  <span v-if="$slots.prefix" class="app-input-affix"><slot name="prefix"/></span>
  <input ref="input" v-bind="controlAttrs()" :type="type" :value="modelValue" :disabled="disabled" @input="update($event.target.value)">
  <span v-if="$slots.suffix" class="app-input-affix"><slot name="suffix"/></span>
 </span>
</template>
<script setup>
import {useAttrs,ref} from 'vue'
defineOptions({inheritAttrs:false})
const props=defineProps({modelValue:{type:[String,Number],default:''},type:{type:String,default:'text'},disabled:Boolean})
const emit=defineEmits(['update:modelValue'])
const attrs=useAttrs()
const input=ref(null)
defineExpose({focus:()=>input.value?.focus()})
const controlAttrs=()=>Object.fromEntries(Object.entries(attrs).filter(([key])=>key!=='class'&&key!=='style'))
function update(value){const numeric=parseFloat(value);emit('update:modelValue',props.type==='number'&&!Number.isNaN(numeric)?numeric:value)}
</script>
<style scoped>
.app-input{display:flex;align-items:center;gap:8px;min-width:0;width:100%;min-height:48px;background:var(--bg-soft);border-radius:12px;padding:0 12px;color:var(--text-main)}.app-input input{width:100%;min-width:0;flex:1;min-height:48px;background:transparent!important;border:0;padding:12px 0;font:inherit;font-size:.875rem;line-height:1.5;caret-color:var(--accent-brand)}.app-input input[type=number]{font-variant-numeric:tabular-nums}.app-input input::placeholder{color:var(--text-muted);opacity:1}.app-input-affix{display:flex;align-items:center;flex-shrink:0;color:var(--text-muted);font-size:.8125rem}.app-input--disabled{opacity:.55}
</style>
