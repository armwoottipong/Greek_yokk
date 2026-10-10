<template>
  <label class="app-checkbox" :class="[$attrs.class,{'app-checkbox--switch':variant === 'switch','app-checkbox--disabled':disabled}]" :style="$attrs.style">
    <span class="app-checkbox-control">
      <input v-bind="controlAttrs()" v-model="selection" type="checkbox" class="app-checkbox-input" :disabled="disabled" :role="variant === 'switch' ? 'switch' : undefined" :aria-label="attrs['aria-label'] || label || undefined" @change="$emit('change',$event)" />
      <Check v-if="variant === 'checkbox'" :size="12" :stroke-width="3" class="app-checkbox-mark" aria-hidden="true" />
      <span v-else class="app-checkbox-thumb" aria-hidden="true" />
    </span>
    <span v-if="$slots.default || label" class="app-checkbox-content"><slot>{{ label }}</slot></span>
  </label>
</template>
<script setup>
import {computed,useAttrs} from 'vue'
import {Check} from 'lucide-vue-next'
defineOptions({inheritAttrs:false})
const props=defineProps({modelValue:{type:[Boolean,Array],default:false},label:{type:String,default:''},disabled:Boolean,variant:{type:String,default:'checkbox',validator:value=>['checkbox','switch'].includes(value)}})
const emit=defineEmits(['update:modelValue','change'])
const attrs=useAttrs()
const selection=computed({get:()=>props.modelValue,set:value=>emit('update:modelValue',value)})
const controlAttrs=()=>Object.fromEntries(Object.entries(attrs).filter(([key])=>key!=='class' && key!=='style'))
</script>
<style scoped>
.app-checkbox{display:inline-flex;align-items:center;gap:8px;min-height:32px;cursor:pointer;user-select:none;font-size:12px;color:var(--text-main)}
.app-checkbox-control{display:inline-flex;position:relative;align-items:center;justify-content:center;flex-shrink:0}
.app-checkbox-input{appearance:none;display:block;margin:0;width:18px;height:18px;border:1.5px solid #d2c2b0;border-radius:6px;background:var(--bg-card);cursor:inherit;transition:background-color .15s,border-color .15s,box-shadow .15s}
.app-checkbox-input:checked{background:var(--accent-brand);border-color:var(--accent-brand)}
.app-checkbox:not(.app-checkbox--disabled):hover .app-checkbox-input{border-color:var(--accent-brand)}
.app-checkbox:not(.app-checkbox--disabled):hover .app-checkbox-input:checked{background:var(--accent-hover);border-color:var(--accent-hover)}
.app-checkbox-input:focus-visible{outline:2px solid var(--accent-brand);outline-offset:3px;box-shadow:0 0 0 3px var(--focus-ring)}
.app-checkbox-mark{position:absolute;pointer-events:none;color:var(--bg-card);opacity:0;transform:scale(.7);transition:opacity .12s,transform .12s}
.app-checkbox-input:checked+.app-checkbox-mark{opacity:1;transform:scale(1)}
.app-checkbox-content{display:inline-flex;align-items:center;gap:6px;min-width:0}
.app-checkbox--disabled{opacity:.5;cursor:not-allowed}
.app-checkbox--switch{flex-direction:row-reverse;justify-content:space-between;gap:12px}
.app-checkbox--switch .app-checkbox-content{flex:1}
.app-checkbox--switch .app-checkbox-input{width:40px;height:24px;border-radius:999px;background:var(--border-subtle);border-color:var(--border-subtle)}
.app-checkbox--switch .app-checkbox-input:checked{background:var(--accent-brand);border-color:var(--accent-brand)}
.app-checkbox-thumb{position:absolute;left:4px;top:4px;width:16px;height:16px;border-radius:50%;background:var(--bg-card);box-shadow:0 1px 3px #35252220;pointer-events:none;transition:transform .15s}
.app-checkbox-input:checked+.app-checkbox-thumb{transform:translateX(16px)}
@media(pointer:coarse){.app-checkbox{min-height:44px}}
@media(prefers-reduced-motion:reduce){.app-checkbox-input,.app-checkbox-mark,.app-checkbox-thumb{transition:none}}
@media(forced-colors:active){.app-checkbox .app-checkbox-input{appearance:auto;width:18px;height:18px}.app-checkbox-mark,.app-checkbox-thumb{display:none}}
</style>
