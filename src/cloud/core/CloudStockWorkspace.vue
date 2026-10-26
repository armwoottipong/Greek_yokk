<template>
 <div>
  <StockView />
  <Teleport to="body">
    <StockInModal />
    <StockAdjustModal />
    <StocktakeModal />
    <WasteModal />
    <MaterialEditModal />
    <ActivityLogModal />
    <ConfirmModal />
    <LotDepletionModal />
    <EmojiPickerPopover />
    <ToastContainer />
  </Teleport>
 </div>
</template>

<script setup>
import { onUnmounted, provide, watch } from 'vue'
import { createInventoryModel } from './inventoryModel.js'
import StockView from '@/views/StockView.vue'
import StockInModal from '@/components/modals/StockInModal.vue'
import StockAdjustModal from '@/components/modals/StockAdjustModal.vue'
import StocktakeModal from '@/components/modals/StocktakeModal.vue'
import WasteModal from '@/components/modals/WasteModal.vue'
import MaterialEditModal from '@/components/modals/MaterialEditModal.vue'
import ActivityLogModal from '@/components/modals/ActivityLogModal.vue'
import ConfirmModal from '@/components/modals/ConfirmModal.vue'
import LotDepletionModal from '@/components/modals/LotDepletionModal.vue'
import EmojiPickerPopover from '@/components/modals/EmojiPickerPopover.vue'
import ToastContainer from '@/components/ui/ToastContainer.vue'

const props = defineProps({
  data: { type: Object, required: true },
  service: { type: Object, required: true },
  execute: { type: Function, required: true },
  ready: { type: Boolean, default: false },
  blocked: { type: Boolean, default: false },
  storageKey: { type: String, required: true },
  readHistory: { type: Function, default: null },
})

const model = createInventoryModel({
  getData: () => props.data,
  execute: command => props.execute(command),
  loadServer: () => props.service.load(),
  isReady: () => props.ready,
  isBlocked: () => props.blocked,
  storageKey: props.storageKey,
  readHistory: () => props.readHistory?.() ?? Promise.resolve({ logs: [], truncated: false }),
})

provide('cloud-inventory-model', model)
watch(() => props.data, value => model.update(value))
onUnmounted(() => model.close())

defineExpose({ acknowledge: model.acknowledge, model })
</script>
