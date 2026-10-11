<template>
 <div class="form-field">
  <label :for="controlId">{{ label }}<span v-if="required" class="field-required" aria-label="จำเป็น"> *</span></label>
  <slot :control-id="controlId" :described-by="describedBy" :invalid="!!error" :required="required" />
  <p v-if="hint" :id="`${controlId}-hint`" class="field-hint">{{ hint }}</p>
  <p v-if="error" :id="`${controlId}-error`" class="field-error" role="alert">{{ error }}</p>
 </div>
</template>
<script setup>
import {computed,useId} from 'vue'
const props=defineProps({id:String,label:{type:String,required:true},required:Boolean,hint:String,error:String})
const generated=useId()
const controlId=computed(()=>props.id||`field-${generated}`)
const describedBy=computed(()=>[props.hint&&`${controlId.value}-hint`,props.error&&`${controlId.value}-error`].filter(Boolean).join(' ')||undefined)
</script>
<style scoped>
.form-field{min-width:0}.form-field>label{display:block;font-size:.8125rem;font-weight:500;color:var(--text-main);margin-bottom:6px}.field-required,.field-error{color:var(--accent-red)}.field-hint,.field-error{font-size:.75rem;line-height:1.6;margin-top:6px}.field-hint{color:var(--text-muted)}
</style>
