<template>
 <section class="option-groups" aria-label="กลุ่มตัวเลือก">
  <header class="group-heading"><div><h3>กลุ่มตัวเลือก</h3><p>สร้างชุดผลไม้หรือของเสริม แล้วนำไปใช้กับหลายเมนูได้</p></div><Button :disabled="!!actionPending||store.inventorySaving" @click="edit()"><Plus :size="16" aria-hidden="true"/>เพิ่มกลุ่มตัวเลือก</Button></header>
  <div v-if="!store.addonGroups.length" class="group-empty"><strong>จัดตัวเลือกเสริมเป็นชุดให้เลือก</strong><p>เช่น ผลไม้ฟรี 3 ชนิด หรือเพิ่มพิเศษ สร้างกลุ่มแล้วนำไปใช้กับหลายเมนูได้</p></div>
  <div v-else class="group-workspace">
   <nav class="group-directory" aria-label="รายชื่อกลุ่มตัวเลือก">
    <div class="group-directory-header"><span>กลุ่มตัวเลือก</span><span>จำนวน</span></div>
    <div class="group-directory-list">
    <button v-for="group in store.addonGroups" :key="group.id" type="button" class="group-directory-button"
     :aria-pressed="selectedGroup?.id === group.id" @click="selectedGroupId = group.id">
     <strong>{{ group.name }}</strong><span>{{ group.options.length }}</span>
    </button>
    </div>
   </nav>
   <div class="group-mobile-picker">
    <span class="group-mobile-label">กลุ่มตัวเลือก</span>
    <AppSelect :model-value="selectedGroup?.id" aria-label="เลือกกลุ่มตัวเลือก" @update:model-value="selectedGroupId = $event">
     <option v-for="group in store.addonGroups" :key="group.id" :value="group.id">{{ group.name }} · {{ group.options.length }} รายการ</option>
    </AppSelect>
   </div>
   <section v-if="selectedGroup" class="group-items" aria-label="รายการในกลุ่มที่เลือก">
    <header class="group-items-header">
     <div>
      <h4>{{ selectedGroup.name }}</h4>
      <p>เลือก {{ selectedGroup.minSelections }}–{{ selectedGroup.maxSelections }} {{ selectedGroup.allowRepeat ? 'ที่ · เลือกซ้ำได้' : 'ชนิด' }}</p>
     </div>
     <div class="group-items-actions">
      <Button variant="secondary" :disabled="!!actionPending || store.inventorySaving" :aria-label="`แก้ไขกลุ่ม ${selectedGroup.name}`" @click="edit(selectedGroup)">แก้ไขกลุ่ม</Button>
      <Button variant="quiet" :disabled="!!actionPending || store.inventorySaving" @click="remove(selectedGroup)">ลบกลุ่ม</Button>
     </div>
    </header>
    <div class="group-table-scroll" role="region" aria-label="เลื่อนดูรายการตัวเลือก" tabindex="0">
    <ul class="group-items-list" data-group-options>
     <li v-for="option in selectedGroup.options" :key="option.addonId" class="group-item">
      <span class="group-item-image"><EntityImage kind="addons" :entity-id="option.addonId" :image="addonMap.get(option.addonId)?.image" :emoji="addonMap.get(option.addonId)?.emoji"/></span>
      <div class="group-item-name">
       <button v-if="addonMap.has(option.addonId)" type="button" @click="detailId = option.addonId">{{ addonMap.get(option.addonId).name }}</button>
       <strong v-else>ไม่พบตัวเลือก</strong>
      </div>
      <small class="group-item-price">{{ priceSummary(selectedGroup, option) }}</small>
      <span class="group-item-status" :data-status="status(selectedGroup, option)">{{ optionAvailabilityLabel[status(selectedGroup, option)] }}</span>
      <AppCheckbox :model-value="!option.paused" variant="switch" :disabled="!!actionPending || store.inventorySaving"
       :label="`เปิดขาย ${addonMap.get(option.addonId)?.name || option.addonId} ในกลุ่มนี้`"
       @update:model-value="setOptionActive(selectedGroup, option.addonId, $event)"><span class="sr-only">เปิดขายในกลุ่มนี้</span></AppCheckbox>
     </li>
    </ul>
    </div>
    <p v-if="statusError" class="group-error" role="alert">{{ statusError }}</p>
   </section>
  </div>
  <DialogFrame :busy="!!actionPending" id="addon-group-editor" :open="open" :title="draft.id ? 'แก้ไขกลุ่มตัวเลือก' : 'เพิ่มกลุ่มตัวเลือก'" description="กำหนดรายการ จำนวนที่เลือก และราคาที่ใช้ในกลุ่มนี้" width="720px" initial-focus="#addon-group-name" @request-close="requestEditorClose">
   <div class="group-form">
    <FormField id="addon-group-name" label="ชื่อกลุ่มตัวเลือก" required :error="fieldErrors.name" v-slot="{controlId,describedBy,invalid}"><AppInput :id="controlId" v-model="draft.name" :aria-invalid="invalid" :aria-describedby="describedBy" aria-required="true" placeholder="เช่น ผลไม้ฟรี 3 ชนิด"/></FormField>
    <div class="group-fields"><FormField id="addon-group-min" label="เลือกอย่างน้อย" :error="fieldErrors.minSelections" hint="0 = ไม่บังคับเลือก" v-slot="{controlId,describedBy,invalid}"><AppInput :id="controlId" :aria-invalid="invalid" :aria-describedby="describedBy" v-model="draft.minSelections" type="number" min="0" step="1"/></FormField><FormField id="addon-group-max" label="เลือกได้สูงสุด" :error="fieldErrors.maxSelections" v-slot="{controlId,describedBy,invalid}"><AppInput :id="controlId" :aria-invalid="invalid" :aria-describedby="describedBy" v-model="draft.maxSelections" type="number" min="1" step="1"/></FormField></div>
    <AppCheckbox v-model="draft.allowRepeat" variant="switch" label="เลือกชนิดเดิมซ้ำได้">เลือกชนิดเดิมซ้ำได้ · นับจำนวนเป็นที่</AppCheckbox>
    <div class="group-stock-controls">
     <AppCheckbox v-model="draft.warnLowStock" variant="switch" label="เตือนเมื่อใกล้หมด">เตือนเมื่อใกล้หมด</AppCheckbox>
     <AppCheckbox v-model="draft.autoPauseOutOfStock" variant="switch" label="พักขายอัตโนมัติเมื่อของหมด">พักขายอัตโนมัติเมื่อของหมด</AppCheckbox>
     <p class="group-help">อิงจุดเตือนและจำนวนคงเหลือของวัตถุดิบในสูตร</p>
    </div>
    <section ref="optionsSection" tabindex="-1" class="group-options" aria-label="รายการในกลุ่ม" :aria-describedby="fieldErrors.options?'addon-group-options-error':undefined"><p v-if="fieldErrors.options" id="addon-group-options-error" role="alert" class="group-error">{{ fieldErrors.options }}</p>
     <div class="group-heading">
      <h4>รายการในกลุ่ม</h4>
      <Button variant="secondary" data-group-add-option :disabled="!!actionPending || store.inventorySaving" @click="addOption"><Plus :size="16" aria-hidden="true"/>เพิ่มตัวเลือก</Button>
     </div>
     <p v-if="!store.addons.length" class="group-help">เพิ่มตัวเลือกเพื่อกำหนดสูตรและราคาของรายการแรกในกลุ่มนี้</p>
     <AppSearch v-if="store.addons.length" v-model="search" label="ค้นหาตัวเลือก" placeholder="ค้นหาตัวเลือก"/>
     <p v-if="store.addons.length && !filteredAddons.length" class="group-help">ไม่พบรายการ ลองค้นหาด้วยชื่ออื่น</p>
     <div v-for="addon in filteredAddons" :key="addon.id" class="group-option" data-group-addon>
      <AppCheckbox :model-value="Boolean(optionFor(addon.id))" :label="addon.name" @update:model-value="toggleOption(addon.id, $event)">{{ addon.emoji }} {{ addon.name }} <small v-if="addon.isActive === false">(ปิดขาย)</small></AppCheckbox>
      <Button variant="quiet" size="compact" :aria-label="`ดูสูตรและราคาของ ${addon.name}`" @click="detailId = addon.id">สูตรและราคา</Button>
      <details v-if="optionFor(addon.id)" class="group-price-fields">
       <summary>ราคาและสถานะในกลุ่ม</summary>
       <AppCheckbox :model-value="!optionFor(addon.id).paused" variant="switch" :label="`เปิดขาย ${addon.name} ในกลุ่มนี้`" @update:model-value="optionFor(addon.id).paused = !$event">เปิดขายในกลุ่มนี้</AppCheckbox>
       <p class="group-help">เว้นราคาว่างได้ ระบบจะคิดเป็นฟรี</p>
       <div class="group-fields"><FormField v-for="platform in store.platforms" :key="platform.id" :id="`group-price-${addon.id}-${platform.id}`" :label="platform.name" v-slot="{controlId}"><AppInput :id="controlId" :model-value="optionFor(addon.id).prices?.[platform.id] ?? ''" placeholder="ฟรี" type="number" min="0" step="0.01" @update:model-value="setPrice(addon.id, platform.id, $event)"><template #prefix>฿</template></AppInput></FormField></div>
       <details class="group-price-analysis" data-group-price-analysis>
        <summary>วิเคราะห์ต้นทุนกำไรต่อที่</summary>
        <dl v-for="{ platform, cost, netRevenue, profit } in priceAnalysis(addon)" :key="platform.id">
         <div><dt>ช่องทาง</dt><dd>{{ platform.name }}</dd></div>
         <div><dt>รายรับหลังหัก GP</dt><dd>{{ analysisMoney(netRevenue) }}</dd></div>
         <div><dt>ต้นทุนตัวเลือก</dt><dd>{{ analysisMoney(cost) }}</dd></div>
         <div><dt>กำไรขั้นต้น</dt><dd data-group-option-profit>{{ analysisMoney(profit) }}</dd></div>
        </dl>
       </details>
      </details>
     </div>
    </section>
    <p v-if="error" role="alert" class="group-error">{{ error }}</p>
   </div>
   <template #footer><Button variant="quiet" :disabled="!!actionPending" @click="requestEditorClose">ยกเลิก</Button><Button :loading="actionPending==='save'" @click="save"><Check :size="18" aria-hidden="true"/>บันทึกกลุ่มตัวเลือก</Button></template>
  </DialogFrame>
  <DialogFrame id="group-option-details" :open="!!detailId" title="สูตรและราคาของตัวเลือก" width="960px" @request-close="detailId = null">
   <OptionCatalog v-if="detailId" :key="detailId" :option-id="detailId" @removed="optionRemoved"/>
  </DialogFrame>
 </section>
</template>
<script setup>
import { ref, computed, nextTick, watch, defineAsyncComponent } from 'vue'
import { Plus, Check } from 'lucide-vue-next'
import { useInventoryStore } from '@/composables/useInventoryStore'
import { useModalForm } from '@/composables/useModalForm'
import { clone } from '@/domain/database'
import { optionPrices, optionAvailability, optionAvailabilityLabel } from '@/domain/addonGroups'
import { selectedItemCosts } from '@/domain/menuCosts'
import Button from '@/components/ui/Button.vue'
import DialogFrame from '@/components/ui/DialogFrame.vue'
import FormField from '@/components/ui/FormField.vue'
import AppInput from '@/components/ui/AppInput.vue'
import EntityImage from '@/components/images/EntityImage.vue'
import AppCheckbox from '@/components/ui/AppCheckbox.vue'
import AppSearch from '@/components/ui/AppSearch.vue'
import AppSelect from '@/components/ui/AppSelect.vue'

import {useActionPending} from '@/composables/useActionPending'
const {pending:actionPending,run:runAction}=useActionPending()
const OptionCatalog = defineAsyncComponent(() => import('./OptionCatalog.vue'))
const store = useInventoryStore(), open = ref(false), error = ref(''), search = ref('')
const draft = ref({}),editCatalogRevision=ref(null)
const detailId = ref(null)
let optionEditRevision = null
let creationResolver=null
const fieldErrors = ref({})
const optionsSection = ref(null)
const selectedGroupId = ref(null)
const statusError = ref('')
const selectedGroup = computed(() => store.addonGroups.find(group => group.id === selectedGroupId.value) || store.addonGroups[0])
const addonMap = computed(() => new Map(store.addons.map(addon => [addon.id, addon])))
const status = (group, option) => optionAvailability(group, option, addonMap.value.get(option.addonId), store.materials)
function priceSummary(group, option) {
  const values = [...new Set(Object.values(optionPrices(group, option, addonMap.value.get(option.addonId) || {})))]
  return values.some(price => price > 0) ? values.sort((a, b) => a - b).map(price => price === 0 ? 'ฟรี' : analysisMoney(price)).join(' / ') : 'ฟรี'
}
const setOptionActive = (group, id, active) => runAction('availability', async () => {
  statusError.value = ''
  const options = group.options.map(option => option.addonId === id ? { ...option, paused: !active } : option)
  const result = await store.saveAddonGroup({ ...group, options, ...(store.cloud ? { expectedCatalogRevision: store.catalogRevision } : {}) })
  if (!result?.ok) statusError.value = result?.message || 'เปลี่ยนสถานะไม่สำเร็จ กรุณาลองใหม่'
})
const { saveSnapshot, requestClose } = useModalForm(() => draft.value)
const filteredAddons = computed(() => store.addons.filter(a => a.name.toLowerCase().includes(search.value.trim().toLowerCase())))
const optionFor = id => draft.value.options?.find(o => o.addonId === id)
function addOption() {
  store.modals.addonEdit = { isOpen: true, addonId: null, savedAddonId: null }
}
function optionRemoved(id) {
  if (open.value) toggleOption(id, false)
  detailId.value = null
  if (store.catalogRevision === editCatalogRevision.value + 1) {
    editCatalogRevision.value = store.catalogRevision
  }
}
watch(() => store.modals.addonEdit?.isOpen, isOpen => {
  if (!open.value) return
  if (isOpen) {
    optionEditRevision = store.catalogRevision
    return
  }
  const savedId = store.modals.addonEdit.savedAddonId
  if (!savedId) return
  if (optionEditRevision === editCatalogRevision.value && store.catalogRevision === optionEditRevision + 1) {
    editCatalogRevision.value = store.catalogRevision
  }
  if (!detailId.value && !optionFor(savedId)) {
    search.value = ''
    toggleOption(savedId, true)
  }
})
const baht = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' })
const analysisMoney = value => value === null ? 'คำนวณไม่ได้' : baht.format(value)
function priceAnalysis(addon) {
  const prices = Object.fromEntries(store.platforms.map(platform => [platform.id, optionFor(addon.id).prices?.[platform.id] || 0]))
  return store.platforms.map(platform => ({
    platform,
    ...selectedItemCosts({ prices }, [ { ...addon, prices: {} } ], 1, store.materials, platform)
  }))
}
async function edit(group) {
  editCatalogRevision.value=store.catalogRevision
  draft.value = group ? clone(group) : { name: '', minSelections: 0, maxSelections: 3, allowRepeat: false, pricingMode: 'included', options: [] }
  if (group) {
    for (const option of draft.value.options) {
      option.prices = optionPrices(group, option, addonMap.value.get(option.addonId) || {})
    }
  }
  error.value = ''; fieldErrors.value = {}; search.value = ''; open.value = true
  await nextTick(); saveSnapshot()
}
function close(savedId=null) { open.value = false;creationResolver?.(savedId);creationResolver=null }
async function openNew() { await edit();return new Promise(resolve=>{creationResolver=resolve}) }
defineExpose({openNew})
function requestEditorClose() { if(actionPending.value)return; if (open.value) return requestClose(close) }
function toggleOption(id, checked) {
  if (checked) draft.value.options.push({ addonId: id })
  else draft.value.options = draft.value.options.filter(o => o.addonId !== id)
}
function setPrice(addonId, platformId, value) {
  const option = optionFor(addonId)
  option.prices = { ...option.prices, [platformId]: value }
}
const save=()=>runAction('save',performSave)
async function performSave() {
  fieldErrors.value = {}; error.value = ''
  const data = clone(draft.value)
  data.minSelections = data.minSelections === '' ? NaN : Number(data.minSelections)
  data.maxSelections = data.maxSelections === '' ? NaN : Number(data.maxSelections)
  let hasPaidOption = false
  for (const option of data.options) {
    option.prices = Object.fromEntries(store.platforms.map(platform => [platform.id, Number(option.prices?.[platform.id] || 0)]))
    if (Object.values(option.prices).some(price => !Number.isFinite(price) || price < 0)) {
      fieldErrors.value.options = 'กรอกราคาตั้งแต่ 0 หรือเว้นว่างเพื่อให้ฟรี'
    }
    if (Object.values(option.prices).some(price => price > 0)) hasPaidOption = true
  }
  data.pricingMode = hasPaidOption ? 'extra' : 'included'
  if (!hasPaidOption) for (const option of data.options) delete option.prices
  if (!data.name?.trim()) fieldErrors.value.name = 'กรอกชื่อกลุ่มตัวเลือก'
  if (!Number.isSafeInteger(data.minSelections) || data.minSelections < 0) fieldErrors.value.minSelections = 'กรอกจำนวนเต็มตั้งแต่ 0'
  if (!Number.isSafeInteger(data.maxSelections) || data.maxSelections < 1 || data.maxSelections < data.minSelections) fieldErrors.value.maxSelections = 'กรอกจำนวนเต็มตั้งแต่ 1 และไม่น้อยกว่าจำนวนขั้นต่ำ'
  if (!data.options.length) fieldErrors.value.options = 'เลือกตัวเลือกเสริมอย่างน้อย 1 รายการ'
  else if (!data.allowRepeat && data.minSelections > data.options.length) fieldErrors.value.minSelections = 'ลดจำนวนขั้นต่ำ หรือเพิ่มชนิดตัวเลือกเสริมให้เพียงพอ'
  if (Object.keys(fieldErrors.value).length) {
    await nextTick()
    const key = ['name', 'minSelections', 'maxSelections'].find(key => fieldErrors.value[key])
    const id = { name: 'addon-group-name', minSelections: 'addon-group-min', maxSelections: 'addon-group-max' }[key]
    if (id) document.getElementById(id)?.focus()
    else optionsSection.value?.focus()
    return
  }
  const previousIds=new Set(store.addonGroups.map(group=>group.id))
  const result = await store.saveAddonGroup({...data,...(store.cloud?{expectedCatalogRevision:editCatalogRevision.value}:{})})
  if (result.ok) {
    const id = data.id || store.addonGroups.find(group => !previousIds.has(group.id))?.id || null
    selectedGroupId.value = id
    saveSnapshot()
    close(id)
  }
  else {
    error.value = result.message || 'บันทึกไม่สำเร็จ กรุณาลองใหม่'
    await nextTick()
    optionsSection.value?.focus()
  }
}
const remove=group=>runAction('delete-'+group.id,()=>performRemove(group))
async function performRemove(group) {
  if (await store.confirmDialog({ title: 'ลบกลุ่มตัวเลือก?', message: group.name, confirmText: 'ลบกลุ่ม', cancelText: 'ยกเลิก', type: 'danger' })) await store.deleteAddonGroup(group.id)
}
</script>
<style scoped>
.option-groups{--addon-text-secondary:#705C50;display:grid;gap:16px;min-width:0}.group-heading{display:flex;justify-content:space-between;align-items:center;gap:16px}.group-heading h3{font-size:1rem;font-weight:600}.group-heading p,.group-help{font-size:.8125rem;line-height:1.7;color:var(--addon-text-secondary)}.group-heading p{margin-top:4px}.group-form{display:grid;gap:20px}.group-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.group-options{display:grid;gap:12px}.group-options h4{font-size:.9375rem;font-weight:600}.group-option{display:grid;gap:12px;padding:16px;background:var(--bg-soft);border-radius:12px}.group-error{font-size:.875rem;color:var(--state-danger);line-height:1.7}.group-option :deep(.app-checkbox-content){flex-wrap:wrap;overflow-wrap:anywhere}.group-heading>.ui-button{flex-shrink:0}
@media(max-width:600px){.group-heading{align-items:flex-start;flex-wrap:wrap}.group-fields{gap:12px}}
@media(max-width:359px){.group-fields{grid-template-columns:minmax(0,1fr)}}

.group-empty{padding:32px 20px;background:var(--bg-card);border-radius:16px;text-align:center}.group-empty strong{font-size:.9375rem;font-weight:500}.group-empty p{max-width:48ch;margin:8px auto 0;color:var(--addon-text-secondary);font-size:.875rem;line-height:1.8}

.group-form :deep(.field-hint),.group-form :deep(.app-input-affix){color:var(--addon-text-secondary)}
.group-price-analysis{padding-top:12px;border-top:1px solid var(--border-subtle);font-size:.8125rem}
.group-price-analysis summary{cursor:pointer;font-weight:600}
.group-price-analysis dl{display:grid;gap:6px;margin:12px 0 0;padding-top:8px;border-top:1px solid var(--border-subtle)}
.group-price-analysis dl div{display:flex;justify-content:space-between;gap:12px}
.group-price-analysis dt{color:var(--text-muted)}
.group-price-analysis dd{margin:0;text-align:right;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}

@media(max-width:767px){.group-form :deep(.app-input input){font-size:1rem}}
.group-workspace{display:grid;grid-template-columns:minmax(12rem,1fr) minmax(0,3fr);grid-template-rows:minmax(0,1fr);min-height:0;border:1px solid var(--border-subtle);border-radius:16px;background:var(--bg-card);overflow:hidden}
.group-directory,.group-items{display:flex;flex-direction:column;min-width:0;min-height:0}
.group-directory{border-inline-end:1px solid var(--border-subtle)}
.group-directory-list,.group-table-scroll{min-height:0;overflow:auto;overscroll-behavior:contain}
.group-table-scroll{flex:1}
.group-table-scroll:focus-visible{outline:2px solid var(--accent-brand);outline-offset:-2px}
.group-directory-header{display:flex;justify-content:space-between;align-items:center;gap:12px;min-height:72px;padding:12px 16px;flex-shrink:0;border-bottom:1px solid var(--border-subtle);font-size:.8125rem;font-weight:600}
.group-directory-button{display:flex;justify-content:space-between;align-items:center;gap:12px;width:100%;min-height:52px;padding:12px 16px;text-align:start;border-bottom:1px solid var(--border-subtle);overflow-wrap:anywhere}
.group-directory-button[aria-pressed=true]{background:var(--bg-soft);color:var(--accent-brand)}
.group-directory-button span,.group-item small,.group-items-header p{color:var(--text-muted);font-size:.8125rem}
.group-items-header{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:72px;padding:12px 16px;flex-shrink:0}
.group-items-actions{display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end;flex-shrink:0}
.group-items-header h4{font-weight:600;overflow-wrap:anywhere}
.group-items-list{list-style:none;margin:0;padding:0}
.group-item{display:grid;grid-template-columns:48px minmax(0,1fr) minmax(4rem,1fr) minmax(6rem,1fr) 3.5rem;align-items:center;gap:12px;padding:12px 16px;border-top:1px solid var(--border-subtle)}
.group-item-price{overflow-wrap:anywhere;font-variant-numeric:tabular-nums}
.group-item>.app-checkbox{justify-self:center}
.group-item-image{display:grid;place-items:center;width:48px;height:48px;border-radius:10px;background:var(--bg-soft);overflow:hidden}
.group-item-image :deep(img){width:100%;height:100%;object-fit:cover}
.group-item-name{display:grid;gap:3px;overflow-wrap:anywhere}
.group-item-name button{text-align:start;font-weight:600;justify-self:start;overflow-wrap:anywhere}
.group-item-name button:hover{text-decoration:underline}
.group-item-status{font-size:.75rem;color:var(--text-muted)}
.group-item-status[data-status=low],.group-item-status[data-status=out]{color:var(--state-danger)}
.group-stock-controls,.group-price-fields[open]{display:grid;gap:12px}
.group-price-fields summary{cursor:pointer;font-weight:600}
.option-groups{container-type:inline-size;grid-template-rows:auto minmax(0,1fr)}
.group-mobile-picker{display:none}
@container(max-width:680px){
 .group-workspace{grid-template-columns:minmax(0,1fr);grid-template-rows:auto minmax(0,1fr)}
 .group-directory{display:none}
 .group-mobile-picker{display:grid;gap:4px;padding:10px 12px;border-bottom:1px solid var(--border-subtle)}
 .group-mobile-label{font-size:.75rem;font-weight:600;color:var(--text-muted)}
 .group-mobile-picker :deep(.app-select-trigger){min-height:44px;background:var(--bg-soft)}
 .group-items-header{min-height:52px;padding:8px 12px}
 .group-items-header h4{display:none}
 .group-items-actions{flex-shrink:1}
 .group-item{grid-template-columns:40px minmax(0,1fr) auto;gap:8px}
 .group-item-image{width:40px;height:40px;grid-row:span 3}
 .group-item-price,.group-item-status{grid-column:2}
 .group-item>.app-checkbox{grid-column:3;grid-row:1 / span 3}
}
@media(max-height:430px){
 .option-groups{gap:8px}
 .option-groups>.group-heading p{display:none}
 .group-directory-header,.group-items-header{min-height:52px;padding-block:4px}
}
</style>
