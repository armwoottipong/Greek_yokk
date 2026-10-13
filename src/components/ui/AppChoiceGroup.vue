<template>
  <div class="app-choice-group" :class="{'app-choice-group--switch':variant==='switch'}" role="radiogroup">
    <label v-for="option in options" :key="option.value" class="app-choice" :class="{'is-selected':modelValue===option.value,'is-disabled':disabled || option.disabled}">
      <span class="app-choice-control">
        <input v-model="selection" type="radio" :name="groupName" :value="option.value" :disabled="disabled || option.disabled" />
        <Check :size="12" :stroke-width="3" aria-hidden="true" />
      </span>
      <span>{{ option.label }}</span>
    </label>
  </div>
</template>
<script setup>
import {computed,useId} from 'vue'
import {Check} from 'lucide-vue-next'
const props=defineProps({modelValue:{type:[String,Number],required:true},options:{type:Array,required:true},disabled:Boolean,variant:{type:String,default:'checkmark',validator:value=>['checkmark','switch'].includes(value)}})
const emit=defineEmits(['update:modelValue'])
const groupName=`app-choice-${useId()}`
const selection=computed({get:()=>props.modelValue,set:value=>emit('update:modelValue',value)})
</script>
<style scoped>
.app-choice-group{display:inline-flex;flex-wrap:wrap;gap:6px;min-width:0}
.app-choice{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:8px 12px;box-sizing:border-box;border:1px solid var(--control-border);border-radius:10px;background:var(--bg-card);color:var(--text-muted);font-size:12px;line-height:1.5;cursor:pointer;user-select:none;transition:background-color .15s,border-color .15s,color .15s}
.app-choice.is-selected{background:var(--accent-soft);border-color:var(--accent-brand);color:var(--accent-brand);font-weight:500}
.app-choice:not(.is-disabled):hover{border-color:var(--accent-brand);color:var(--accent-brand)}
.app-choice-control{position:relative;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0}
.app-choice input{appearance:none;width:18px;height:18px;margin:0;border:1.5px solid var(--control-border);border-radius:6px;background:var(--bg-card);cursor:inherit}
.app-choice input:checked{background:var(--accent-brand);border-color:var(--accent-brand)}
.app-choice input:focus-visible{outline:2px solid var(--accent-brand);outline-offset:3px}
.app-choice-control svg{position:absolute;pointer-events:none;color:var(--bg-card);opacity:0}
.app-choice input:checked+svg{opacity:1}
.app-choice.is-disabled{opacity:.5;cursor:not-allowed}
.app-choice-group--switch{gap:3px;padding:3px;border-radius:10px;background:var(--bg-soft)}
.app-choice-group--switch .app-choice{position:relative;justify-content:center;min-height:38px;padding:7px 12px;border:0;border-radius:7px;background:transparent}
.app-choice-group--switch .app-choice.is-selected{background:var(--bg-card);color:var(--accent-brand);box-shadow:0 1px 4px #3525220d;font-weight:600}
.app-choice-group--switch .app-choice-control{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}
.app-choice-group--switch .app-choice:has(input:focus-visible){outline:2px solid var(--accent-brand);outline-offset:3px}
@media(prefers-reduced-motion:reduce){.app-choice{transition:none}}
@media(forced-colors:active){.app-choice input{appearance:auto}.app-choice-control svg{display:none}}
</style>
