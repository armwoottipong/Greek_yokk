<template>
 <DialogFrame id="ConfirmModal" :teleport="false" :open="modal.isOpen" :title="modal.title || 'ยืนยันการดำเนินการ'" width="440px" initial-focus="[data-confirm-cancel]" @request-close="onCancel">
  <p class="whitespace-pre-line leading-relaxed">{{ modal.message }}</p>
  <label v-if="modal.confirmationValue" for="confirm-required-text" class="field mt-4 block">
   <span>พิมพ์ “{{ modal.confirmationValue }}” เพื่อยืนยัน</span>
   <AppInput id="confirm-required-text" v-model="confirmationInput" autocomplete="off" autocapitalize="off" :spellcheck="false" @keydown.enter.prevent="onConfirm"/>
  </label>
  <template #footer>
   <Button data-confirm-cancel variant="secondary" @click="onCancel">{{ modal.cancelText || 'ยกเลิก' }}</Button>
   <Button data-confirm-submit :disabled="!canConfirm" :variant="modal.type === 'danger' ? 'danger' : 'primary'" @click="onConfirm">{{ modal.confirmText || 'ยืนยัน' }}</Button>
  </template>
 </DialogFrame>
</template>
<script setup>
import Button from '@/components/ui/Button.vue'
import DialogFrame from '@/components/ui/DialogFrame.vue'
import AppInput from '@/components/ui/AppInput.vue'
import {computed,ref,watch} from 'vue'
import { useInventoryStore } from '@/composables/useInventoryStore'
const store=useInventoryStore()
const modal=computed(()=>store.modals.confirm||{})
const confirmationInput=ref('')
const canConfirm=computed(()=>!modal.value.confirmationValue||confirmationInput.value.trim()===modal.value.confirmationValue)
watch(()=>[modal.value.isOpen,modal.value.title,modal.value.message,modal.value.confirmationValue],()=>{confirmationInput.value=''})
function onConfirm() {
  if(!modal.value.isOpen||!canConfirm.value)return
  const callback=modal.value.onConfirm
  store.modals.confirm.isOpen=false
  store.modals.confirm.onConfirm=null
  if(typeof callback==='function'){callback();return}
  if (typeof modal.value.onConfirm === 'function') {
    modal.value.onConfirm()
  } else {
    store.modals.confirm.isOpen = false
  }
}

function onCancel() {
  if(!modal.value.isOpen)return
  const callback=modal.value.onCancel
  store.modals.confirm.isOpen=false
  store.modals.confirm.onCancel=null
  if(typeof callback==='function'){callback();return}
  if (typeof modal.value.onCancel === 'function') {
    modal.value.onCancel()
  } else {
    store.modals.confirm.isOpen = false
  }
}
</script>
