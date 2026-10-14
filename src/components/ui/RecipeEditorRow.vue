<template>
 <div class="recipe-editor-row">
  <FormField :label="label" v-slot="{controlId}"><AppSelect :id="controlId" :aria-label="label" :model-value="materialId" @update:model-value="$emit('update:materialId',$event)"><slot/></AppSelect></FormField>
  <FormField label="ปริมาณ" v-slot="{controlId}"><AppInput :id="controlId" :model-value="qty" type="number" :min="min" :step="step" :aria-label="quantityLabel" @update:model-value="$emit('update:qty',$event)"><template #suffix>{{ unit }}</template></AppInput></FormField>
  <IconButton :label="removeLabel" @click="$emit('remove')"><Trash2 :size="18" aria-hidden="true"/></IconButton>
 </div>
</template>
<script setup>
import AppSelect from './AppSelect.vue'
import AppInput from './AppInput.vue'
import IconButton from './IconButton.vue'
import FormField from './FormField.vue'
import {Trash2} from 'lucide-vue-next'
defineProps({materialId:String,qty:[String,Number],label:String,quantityLabel:String,removeLabel:String,unit:String,min:{type:Number,default:0},step:{type:[String,Number],default:'any'}})
defineEmits(['update:materialId','update:qty','remove'])
</script>
<style scoped>
.recipe-editor-row{display:grid;grid-template-columns:minmax(0,1fr) 136px 44px;gap:8px;align-items:end;min-width:0}.recipe-editor-row :deep(.app-select){width:100%}.recipe-editor-row :deep(.app-select-trigger){min-height:48px;border-radius:12px;font-size:.8125rem}.recipe-editor-row>.ui-button{min-height:48px;border-radius:12px}.recipe-editor-row :deep(input){text-align:right}@media(max-width:480px){.recipe-editor-row{grid-template-columns:minmax(0,1fr) 44px}.recipe-editor-row>.form-field:first-child{grid-column:1/-1}.recipe-editor-row{padding-bottom:12px;border-bottom:1px solid var(--border-subtle)}}
</style>
