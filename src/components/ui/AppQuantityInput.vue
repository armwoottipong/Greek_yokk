<template>
 <div class="app-quantity-input">
  <IconButton :label="`ลด${label}`" :disabled="disabled || numericValue <= min" @click="adjust(-1)"><Minus :size="18" aria-hidden="true"/></IconButton>
  <input v-bind="$attrs" :value="modelValue" type="number" :min="min" step="any" :aria-label="label" :disabled="disabled" @input="update($event.target.value)">
  <span v-if="unit" class="app-quantity-unit">{{ unit }}</span>
  <IconButton :label="`เพิ่ม${label}`" :disabled="disabled" @click="adjust(1)"><Plus :size="18" aria-hidden="true"/></IconButton>
 </div>
</template>
<script setup>
import {computed} from 'vue'
import {Minus,Plus} from 'lucide-vue-next'
import IconButton from './IconButton.vue'
defineOptions({inheritAttrs:false})
const props=defineProps({modelValue:{type:[Number,String],default:0},label:{type:String,required:true},unit:{type:String,default:''},min:{type:Number,default:0},disabled:Boolean})
const emit=defineEmits(['update:modelValue'])
const numericValue=computed(()=>Number.isFinite(Number(props.modelValue))?Number(props.modelValue):props.min)
function update(value){emit('update:modelValue',value===''?'':Number(value))}
function adjust(direction){emit('update:modelValue',Math.max(props.min,Number((numericValue.value+direction).toFixed(10))))}
</script>
<style scoped>
.app-quantity-input{display:flex;align-items:center;gap:4px;min-width:0;min-height:48px;padding:2px;background:var(--bg-soft);border-radius:12px}
.app-quantity-input input{flex:1;width:100%;min-width:36px;padding:10px 0;background:transparent!important;border:0;outline:none;box-shadow:none;text-align:center;font-size:.875rem;font-variant-numeric:tabular-nums;appearance:textfield}
.app-quantity-input input::-webkit-inner-spin-button,.app-quantity-input input::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
.app-quantity-unit{font-size:.75rem;white-space:nowrap;color:var(--text-muted)}
.app-quantity-input :deep(.ui-icon-button){flex-shrink:0;min-height:44px;border-radius:10px}
</style>
