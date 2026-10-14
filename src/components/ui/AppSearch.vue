<template><AppInput ref="field" class="app-search" type="search" :model-value="modelValue" :aria-label="label" v-bind="$attrs" @update:model-value="$emit('update:modelValue',$event)"><template #prefix><Search :size="18" aria-hidden="true"/></template><template v-if="modelValue" #suffix><IconButton :label="`ล้าง${label}`" @click="clear"><X :size="16" aria-hidden="true"/></IconButton></template></AppInput></template>
<script setup>
import AppInput from './AppInput.vue'
import IconButton from './IconButton.vue'
import {Search,X} from 'lucide-vue-next'
import {ref,nextTick} from 'vue'
defineOptions({inheritAttrs:false})
defineProps({modelValue:{type:String,default:''},label:{type:String,required:true}})
const emit=defineEmits(['update:modelValue'])
const field=ref(null)
function clear(){emit('update:modelValue','');nextTick(()=>field.value?.focus())}
</script>
<style scoped>
.app-search :deep(input::-webkit-search-cancel-button){display:none}.app-search :deep(.ui-icon-button){min-height:44px;width:44px;padding:10px;border-radius:10px}
</style>
