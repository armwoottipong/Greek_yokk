<template>
 <div>
  <StockView v-show="currentTab==='stock'" />
  <MenuView v-if="visited.menu" v-show="currentTab==='menu'" />
  <AddonView v-if="visited.addon" v-show="currentTab==='addon'" />
  <Teleport to="body">
    <MenuEditModal />
    <AddonEditModal />
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
import { onUnmounted, provide, watch, reactive } from 'vue'
import { createInventoryModel } from './inventoryModel.js'
import MenuView from '@/views/MenuView.vue'
import AddonView from '@/views/AddonView.vue'
import MenuEditModal from '@/components/modals/MenuEditModal.vue'
import AddonEditModal from '@/components/modals/AddonEditModal.vue'
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
  currentTab: {type:String,default:'stock'},
  data: { type: Object, required: true },
  service: { type: Object, required: true },
  execute: { type: Function, required: true },
  ready: { type: Boolean, default: false },
  blocked: { type: Boolean, default: false },
  storageKey: { type: String, required: true },
  readHistory: { type: Function, default: null },
})

const visited=reactive({menu:false,addon:false})
watch(()=>props.currentTab,tab=>{if(tab==='menu'||tab==='addon')visited[tab]=true},{immediate:true})
const model = createInventoryModel({
  getData: () => props.data,
  execute: command => props.execute(command),
  loadServer: () => props.service.load(),
  isReady: () => props.ready,
  isBlocked: () => props.blocked,
  storageKey: props.storageKey,
  readHistory: options => props.readHistory?.(options) ?? Promise.resolve({ logs: [], truncated: false }),
})

provide('cloud-inventory-model', model)
watch(() => props.data, value => model.update(value))
onUnmounted(() => model.close())

defineExpose({ acknowledge: model.acknowledge, model })
</script>
