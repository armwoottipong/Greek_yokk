<template>
 <DialogFrame id="ConfirmModal" :teleport="false" :open="modal.isOpen" :title="modal.title || 'ยืนยันการดำเนินการ'" width="440px" initial-focus="[data-confirm-cancel]" @request-close="onCancel">
  <p class="whitespace-pre-line leading-relaxed">{{ modal.message }}</p>
  <template #footer>
   <Button data-confirm-cancel variant="secondary" @click="onCancel">{{ modal.cancelText || 'ยกเลิก' }}</Button>
   <Button :variant="modal.type === 'danger' ? 'danger' : 'primary'" @click="onConfirm">{{ modal.confirmText || 'ยืนยัน' }}</Button>
  </template>
 </DialogFrame>
</template>
<script setup>
import Button from '@/components/ui/Button.vue'
import DialogFrame from '@/components/ui/DialogFrame.vue'
import {computed} from 'vue'
import {usePosStore} from '@/stores/posStore'
const store=usePosStore()
const modal=computed(()=>store.modals.confirm||{})
function onConfirm() {
  if(!modal.value.isOpen)return
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
