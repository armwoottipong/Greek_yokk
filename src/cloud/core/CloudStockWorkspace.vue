<template>
 <div :class="{ 'flex-1 min-h-0': currentTab === 'addon' }">
  <section v-if="['menu','addon'].includes(currentTab) && model.hasCatalogDrafts && !model.inventorySaving && !model.unresolvedDraftCommand" class="catalog-pending" aria-label="การเปลี่ยนแปลงเมนูและตัวเลือกที่รอบันทึก">
   <strong>การเปลี่ยนแปลงยังบันทึกไม่ครบ</strong>
   <ul><li v-for="item in model.catalogDraftSummary" :key="item.id">{{ item.name }} · {{ item.title }}</li></ul>
   <div>
    <Button :disabled="blocked || !ready" @click="model.commitCatalogChanges()">ดำเนินการบันทึกต่อ</Button>
    <Button variant="quiet" :disabled="blocked" @click="model.discardCatalogChanges()">ยกเลิกส่วนที่ยังไม่บันทึก</Button>
   </div>
  </section>
  <StockView v-show="currentTab==='stock'" :active="currentTab==='stock'" />
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
    <ActivityLogModal @open-orders="$emit('open-orders')" />
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
import Button from '@/components/ui/Button.vue'
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
defineEmits(['open-orders'])

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

<style scoped>
.catalog-pending{display:grid;gap:12px;padding:16px;margin-block-end:16px;border-radius:12px;background:var(--accent-soft);font-size:.875rem;line-height:1.7}
.catalog-pending ul{display:grid;gap:4px}
.catalog-pending>div{display:flex;flex-wrap:wrap;gap:8px}
</style>
