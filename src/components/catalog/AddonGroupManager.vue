<template>
 <section class="option-groups" aria-label="กลุ่มตัวเลือก">
  <header class="group-heading">
   <div><h3>กลุ่มตัวเลือก</h3><p>สร้างชุดผลไม้หรือของเสริม แล้วนำไปใช้กับหลายเมนูได้</p></div>
   <div class="group-items-actions">
    <Button v-if="legacyMenuCount" variant="secondary" :disabled="!!actionPending || store.inventorySaving" :loading="actionPending === 'migration'" @click="migrateLegacyOptions">ย้ายตัวเลือกเดิม {{ legacyMenuCount }} เมนู</Button>
    <Button :disabled="!!actionPending||store.inventorySaving" @click="edit()"><Plus :size="16" aria-hidden="true"/>เพิ่มกลุ่มตัวเลือก</Button>
   </div>
  </header>
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
      <button v-if="addonMap.has(option.addonId)" type="button" class="group-item-trigger" aria-haspopup="dialog"
       @click="detailSelection = { groupId: selectedGroup.id, addonId: option.addonId }">
       <span class="group-item-image"><EntityImage v-bind="optionImage(addonMap.get(option.addonId))"/></span>
       <span class="group-item-name">{{ addonMap.get(option.addonId).name }}</span>
      </button>
      <strong v-else class="group-item-trigger">ไม่พบตัวเลือก</strong>
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
  <DialogFrame id="group-option-detail" :open="!!optionDetail" :title="optionDetail?.addon.name || 'รายละเอียดตัวเลือก'"
   :description="optionDetail?.group.name" presentation="side-drawer" width="480px" @request-close="detailSelection = null">
   <div v-if="optionDetail" class="group-form option-detail">
    <section class="group-options" aria-labelledby="group-option-recipe-title">
     <h4 id="group-option-recipe-title" class="group-drawer-band">รายละเอียดต่อที่</h4>
     <p v-if="!optionDetail.addon.recipe?.length" class="group-help">ตัวเลือกนี้ไม่มีรายการตัดสต๊อก</p>
     <ul v-else class="option-detail-list">
      <li v-for="row in optionDetail.addon.recipe" :key="row.materialId">
       <span>{{ store.matMap[row.materialId]?.name || row.materialId }}</span>
       <strong>{{ row.qty }} {{ store.matMap[row.materialId]?.unit }}</strong>
      </li>
     </ul>
    </section>
    <div class="group-heading group-drawer-band">
     <h4>วิเคราะห์ต้นทุนและกำไร</h4>
     <CatalogAnalysisDialog entity="group-option" :reset-key="optionDetail.addon.id">
      <MenuPlatformOverview :menu="detailPricing" :platforms="store.platforms" :cost="detailCost"
       unit-label="ที่" price-label="ราคาบวกเพิ่ม" entity-label="ตัวเลือกเสริม" show-free-prices/>
     </CatalogAnalysisDialog>
    </div>
   </div>
  </DialogFrame>
  <DialogFrame :busy="!!actionPending" id="addon-group-editor" :open="open" :title="draft.id ? 'แก้ไขกลุ่มตัวเลือก' : 'เพิ่มกลุ่มตัวเลือก'" description="ตั้งชื่อ เพิ่มตัวเลือกจากคลัง แล้วกำหนดกติกา" presentation="side-drawer" width="480px" initial-focus="#addon-group-name" @request-close="requestEditorClose">
   <div class="group-form group-drawer-form">
    <FormField id="addon-group-name" label="ชื่อกลุ่มตัวเลือก" required :error="fieldErrors.name" v-slot="{controlId,describedBy,invalid}"><AppInput :id="controlId" v-model="draft.name" :aria-invalid="invalid" :aria-describedby="describedBy" aria-required="true" placeholder="เช่น ผลไม้ฟรี 3 ชนิด"/></FormField>
    <section ref="optionsSection" tabindex="-1" class="group-options group-drawer-section" aria-label="รายการในกลุ่ม" :aria-describedby="fieldErrors.options?'addon-group-options-error':undefined"><p v-if="fieldErrors.options" id="addon-group-options-error" role="alert" class="group-error">{{ fieldErrors.options }}</p>
     <div class="group-heading group-drawer-band">
      <h4>รายการตัวเลือก</h4>
      <Button variant="secondary" data-group-add-option :disabled="!!actionPending || store.inventorySaving" @click="openStockPicker"><Plus :size="16" aria-hidden="true"/>เพิ่มตัวเลือก</Button>
     </div>
     <div v-for="addon in editorAddons" :key="addon.id" class="group-option group-option--selected" data-group-addon>
      <div class="group-option-heading">
       <span class="group-option-image">
        <EntityImage v-bind="optionImage(addon)"/>
       </span>
       <div class="group-option-identity">
        <strong :title="addon.name">{{ addon.name || 'ตัวเลือกใหม่' }}</strong>
        <p class="group-help">{{ recipeSummary(addon) }}</p>
       </div>
       <IconButton :label="`จัดการ ${addon.name}`" aria-haspopup="dialog" @click="showOptionEditor(addon, 'more')">
        <EllipsisVertical :size="18" aria-hidden="true"/>
       </IconButton>
      </div>
     </div>
    </section>
    <details ref="groupRules" class="group-rules" open>
     <summary class="group-drawer-band"><strong>กติกาการเลือก</strong><small>{{ ruleSummary }}</small></summary>
     <div class="group-rule-body">
      <FormField id="group-selection-rule" label="ลูกค้าเลือกอย่างไร" v-slot="{controlId}">
       <AppSelect :id="controlId" aria-label="ลูกค้าเลือกอย่างไร" :model-value="selectionRule" @update:model-value="applySelectionRule">
        <option value="optional">ไม่บังคับเลือก</option>
        <option value="one">ต้องเลือก 1 อย่าง</option>
        <option value="custom">กำหนดขั้นต่ำและสูงสุด</option>
       </AppSelect>
      </FormField>
      <div v-if="selectionRule !== 'one'" class="group-fields"><FormField v-if="selectionRule === 'custom'" id="addon-group-min" label="เลือกอย่างน้อย" :error="fieldErrors.minSelections" hint="0 = ไม่บังคับเลือก" v-slot="{controlId,describedBy,invalid}"><AppInput :id="controlId" :aria-invalid="invalid" :aria-describedby="describedBy" v-model="draft.minSelections" type="number" min="0" step="1"/></FormField><FormField id="addon-group-max" label="เลือกได้สูงสุด" :error="fieldErrors.maxSelections" v-slot="{controlId,describedBy,invalid}"><AppInput :id="controlId" :aria-invalid="invalid" :aria-describedby="describedBy" v-model="draft.maxSelections" type="number" min="1" step="1"/></FormField></div>
      <details class="group-stock-controls">
       <summary>การแจ้งเตือนและพักขาย</summary>
       <div class="group-stock-body">
        <AppCheckbox v-model="draft.warnLowStock" variant="switch" label="เตือนเมื่อใกล้หมด">เตือนเมื่อใกล้หมด</AppCheckbox>
        <AppCheckbox v-model="draft.autoPauseOutOfStock" variant="switch" label="พักขายอัตโนมัติเมื่อของหมด">พักขายอัตโนมัติเมื่อของหมด</AppCheckbox>
        <p class="group-help">อิงจุดเตือนและจำนวนคงเหลือของวัตถุดิบในสูตร</p>
       </div>
      </details>
     </div>
    </details>
    <section class="group-options group-drawer-section" aria-label="เมนูที่ใช้กลุ่มนี้">
     <h4 class="group-drawer-band">เมนูที่ใช้ตัวเลือกเสริมนี้</h4>
     <p v-if="!linkedMenus.length" class="group-help">ยังไม่มีเมนูใช้กลุ่มนี้</p>
     <ul v-else class="group-linked-menus">
      <li v-for="menu in linkedMenus" :key="menu.id">{{ menu.name }}
       <Button v-if="!creationResolver" variant="quiet" size="compact" :aria-label="`ยกเลิกการเชื่อม ${menu.name}`" @click="draft.menuIds = draft.menuIds.filter(id => id !== menu.id)">ยกเลิกการเชื่อม</Button>
      </li>
     </ul>
     <AppSelect v-if="linkableMenus.length && !creationResolver" aria-label="เชื่อมกับเมนู" :key="`menu-link-${draft.menuIds?.length}`" model-value="" @update:model-value="draft.menuIds.push($event)">
      <option value="" disabled>เลือกเมนูที่จะเชื่อม</option>
      <option v-for="menu in linkableMenus" :key="menu.id" :value="menu.id" :disabled="!!menuLinkIssue(menu)">{{ menu.name }}{{ menuLinkIssue(menu) ? ` · ${menuLinkIssue(menu)}` : '' }}</option>
     </AppSelect>
    </section>
    <p v-if="error" role="alert" class="group-error">{{ error }}</p>
   </div>
   <template #footer><Button variant="quiet" :disabled="!!actionPending" @click="requestEditorClose">ยกเลิก</Button><Button :loading="actionPending==='save'" @click="save"><Check :size="18" aria-hidden="true"/>บันทึกกลุ่มตัวเลือก</Button></template>
  </DialogFrame>
  <DialogFrame id="group-option-settings" :open="!!optionEditor" :title="optionEditorTitle"
   :description="editingOption?.name" width="480px" @request-close="optionEditor = null">
   <div v-if="editingOption && optionEditor" class="group-options">
    <div v-if="optionEditor.mode === 'more'" class="group-option-menu">
     <Button v-if="ingredientRows(editingOption).length" variant="quiet" @click="openOptionAction('quantity')"><Scale :size="17" aria-hidden="true"/>แก้จำนวนต่อที่</Button>
     <Button variant="quiet" @click="openOptionAction('packaging')"><Package :size="17" aria-hidden="true"/>บรรจุภัณฑ์</Button>
     <Button variant="quiet" @click="openOptionAction('price')"><Tag :size="17" aria-hidden="true"/>ราคา</Button>
     <Button variant="quiet" @click="removeEditingOption"><Trash2 :size="17" aria-hidden="true"/>นำออกจากกลุ่ม</Button>
    </div>
    <template v-else-if="optionEditor.mode === 'price'">
     <AppCheckbox v-if="!editingOption.isDraft" :model-value="!optionFor(editingOption.id).paused" variant="switch"
      label="เปิดขายในกลุ่มนี้" @update:model-value="optionFor(editingOption.id).paused = !$event">เปิดขายในกลุ่มนี้</AppCheckbox>
     <p class="group-help">เว้นราคาเพิ่มว่างเพื่อให้ฟรี</p>
     <div class="group-fields">
      <FormField v-for="platform in store.platforms" :key="platform.id" :id="`group-price-${editingOption.id}-${platform.id}`" :label="platform.name" v-slot="{controlId}">
       <AppInput :id="controlId" :model-value="optionFor(editingOption.id).prices?.[platform.id] ?? ''" placeholder="ฟรี" type="number" min="0" step="0.01" @update:model-value="setPrice(editingOption.id, platform.id, $event)"><template #prefix>฿</template></AppInput>
      </FormField>
     </div>
     <details v-if="Object.values(optionFor(editingOption.id).prices || {}).some(price => Number(price) > 0)" class="group-price-analysis" data-group-price-analysis>
      <summary>วิเคราะห์ต้นทุนกำไรต่อที่</summary>
      <dl v-for="{ platform, cost, netRevenue, profit } in priceAnalysis(editingOption)" :key="platform.id">
       <div><dt>ช่องทาง</dt><dd>{{ platform.name }}</dd></div>
       <div><dt>รายรับหลังหัก GP</dt><dd>{{ analysisMoney(netRevenue) }}</dd></div>
       <div><dt>ต้นทุนตัวเลือก</dt><dd>{{ analysisMoney(cost) }}</dd></div>
       <div><dt>กำไรขั้นต้น</dt><dd data-group-option-profit>{{ analysisMoney(profit) }}</dd></div>
      </dl>
     </details>
    </template>
    <template v-else>
     <AppSelect v-if="optionEditor.mode === 'packaging'" :key="editingOption.recipe.length" model-value="" aria-label="บรรจุภัณฑ์เพิ่มเติม" @update:model-value="addPackaging(editingOption, $event)">
      <option value="" disabled>เลือกบรรจุภัณฑ์จากคลัง</option>
      <option v-for="material in packagingOptions(editingOption)" :key="material.id" :value="material.id">{{ material.name }} ({{ material.unit }})</option>
     </AppSelect>
     <div v-for="row in editableRows" :key="row.materialId" class="group-option-quantity">
      <FormField :label="store.matMap[row.materialId]?.name || row.materialId" v-slot="{controlId}">
       <AppInput :id="controlId" :model-value="row.qty" aria-label="จำนวนต่อที่" type="number" min="0.01" step="0.01" @update:model-value="updateQuantity(editingOption, row.materialId, $event)">
        <template #suffix>{{ store.matMap[row.materialId]?.unit }}</template>
       </AppInput>
      </FormField>
      <IconButton v-if="optionEditor.mode === 'packaging'" :label="`นำ ${store.matMap[row.materialId]?.name || row.materialId} ออก`" @click="removePackaging(editingOption, row.materialId)"><Trash2 :size="17" aria-hidden="true"/></IconButton>
     </div>
    </template>
   </div>
   <template v-if="optionEditor?.mode !== 'more'" #footer><Button @click="optionEditor = null">เสร็จสิ้น</Button></template>
  </DialogFrame>
  <DialogFrame id="group-stock-picker" :open="stockPickerOpen" title="เลือกตัวเลือกจากคลัง"
   description="เลือกได้หลายรายการ แต่ละรายการจะเป็นตัวเลือกในกลุ่ม" width="640px"
   initial-focus="#group-stock-search" @request-close="stockPickerOpen = false">
   <div class="group-options">
    <AppSearch id="group-stock-search" v-model="stockSearch" label="ค้นหาของจากคลัง" placeholder="ค้นหาด้วยชื่อรายการ"/>
    <p v-if="!stockPickerGroups.length" class="group-help">ไม่พบรายการในคลัง</p>
    <section v-for="kind in stockPickerGroups" :key="kind.id" class="group-options">
     <h4 class="group-drawer-band">{{ kind.label }}</h4>
     <ul class="stock-picker-list">
      <li v-for="material in kind.items" :key="material.id">
       <AppCheckbox :model-value="selectedStockIds.includes(material.id)" :label="material.name" :disabled="usedStockIds.has(material.id)"
        @update:model-value="toggleStock(material.id, $event)">
        <span class="stock-picker-item">
         <strong class="stock-picker-name">
          <span class="group-item-image"><EntityImage kind="materials" :entity-id="material.id" :image="material.image" :emoji="material.emoji"/></span>
          <span>{{ material.name }} <small v-if="usedStockIds.has(material.id)">อยู่ในกลุ่มแล้ว</small></span>
         </strong>
         <small>
          คงเหลือ {{ stockNumber.format(material.stock) }} {{ material.unit }}
          <span v-if="hasStockPack(material)">≈ {{ stockNumber.format(material.stock / material.packSize) }} {{ material.packUnit }}</span>
         </small>
         <small>
          ต้นทุนต่อ{{ material.unit || 'หน่วย' }} {{ stockCost(material.unitCost) }}
          <span v-if="hasStockPack(material) && material.unitCost != null">≈ {{ stockCost(material.unitCost * material.packSize) }} / {{ material.packUnit }}</span>
         </small>
        </span>
       </AppCheckbox>
      </li>
     </ul>
    </section>
   </div>
   <template #footer>
    <Button variant="quiet" @click="stockPickerOpen = false; manualOpen = true">สร้างตัวเลือกเอง</Button>
    <Button :disabled="!selectedStockIds.length" @click="addPickedOptions">เพิ่ม {{ selectedStockIds.length }} รายการ</Button>
   </template>
  </DialogFrame>
  <DialogFrame id="group-manual-option" :open="manualOpen" title="สร้างตัวเลือกเอง" width="480px" @request-close="manualOpen = false">
   <FormField id="group-manual-name" label="ชื่อตัวเลือก" required v-slot="{controlId}">
    <AppInput :id="controlId" v-model="manualName" aria-label="ชื่อตัวเลือก"/>
   </FormField>
   <template #footer><Button :disabled="!manualName.trim()" @click="addManualOption">เพิ่มตัวเลือก</Button></template>
  </DialogFrame>
 </section>
</template>
<script setup>
import { ref, computed, nextTick } from 'vue'
import { Plus, Check, EllipsisVertical, Package, Scale, Tag, Trash2 } from 'lucide-vue-next'
import { useInventoryStore } from '@/composables/useInventoryStore'
import { useModalForm } from '@/composables/useModalForm'
import { clone } from '@/domain/database'
import { optionPrices, optionAvailability, optionAvailabilityLabel, optionStockMaterialId, cloudGroupBindingIssue } from '@/domain/addonGroups'
import { MATERIAL_KIND_OPTIONS, getMaterialKind } from '@/domain/materialClassification'
import { recipeCost, selectedItemCosts } from '@/domain/menuCosts'
import CatalogAnalysisDialog from './CatalogAnalysisDialog.vue'
import MenuPlatformOverview from './MenuPlatformOverview.vue'
import Button from '@/components/ui/Button.vue'
import IconButton from '@/components/ui/IconButton.vue'
import DialogFrame from '@/components/ui/DialogFrame.vue'
import FormField from '@/components/ui/FormField.vue'
import AppInput from '@/components/ui/AppInput.vue'
import EntityImage from '@/components/images/EntityImage.vue'
import AppCheckbox from '@/components/ui/AppCheckbox.vue'
import AppSearch from '@/components/ui/AppSearch.vue'
import AppSelect from '@/components/ui/AppSelect.vue'

import {useActionPending} from '@/composables/useActionPending'
const {pending:actionPending,run:runAction}=useActionPending()
const legacyPlan = computed(() => store.legacyOptionMigrationPlan?.())
const legacyMenuCount = computed(() => legacyPlan.value?.profiles.reduce((total, profile) => total + profile.menus.length, 0) || 0)
const migrateLegacyOptions = () => runAction('migration', async () => {
  const plan = legacyPlan.value
  if (!plan || !legacyMenuCount.value) return
  const accepted = await store.confirmDialog({
    title: 'ย้ายตัวเลือกเดิมเข้ากลุ่ม?',
    message: `ย้าย ${legacyMenuCount.value} เมนูไปใช้กลุ่มตัวเลือก โดยเก็บราคา กติกา และสูตรเดิม ควรดาวน์โหลดไฟล์สำรองล่าสุดก่อนย้าย`,
    confirmText: 'ย้ายตัวเลือก', cancelText: 'ยกเลิก'
  })
  if (accepted) await store.migrateLegacyOptions(plan.revision)
})
const store = useInventoryStore(), open = ref(false), error = ref('')
const draft = ref({}),editCatalogRevision=ref(null)
const creationResolver=ref(null)
const fieldErrors = ref({})
const optionsSection = ref(null)
const groupRules = ref(null)
const linkedMenus = computed(() => store.menus.filter(menu => draft.value.menuIds?.includes(menu.id)))
const linkableMenus = computed(() => store.menus.filter(menu => !draft.value.menuIds?.includes(menu.id) &&
  (menu.addonGroupIds?.includes(draft.value.id) || (menu.addonGroupIds?.length || 0) < 2)))
function menuLinkIssue(menu) {
  if (!store.cloud) return ''
  const otherGroups = (menu.addonGroupIds || []).filter(id => id !== draft.value.id)
    .map(id => store.addonGroups.find(group => group.id === id))
  return cloudGroupBindingIssue([...otherGroups, draft.value])
}
const selectionRule = ref('optional')
function applySelectionRule(rule) {
  selectionRule.value = rule
  if (rule === 'one') Object.assign(draft.value, { minSelections: 1, maxSelections: 1, allowRepeat: false })
  if (rule === 'optional') Object.assign(draft.value, { minSelections: 0, maxSelections: 3 })
}
const ruleSummary = computed(() => {
  const { minSelections, maxSelections, allowRepeat } = draft.value
  const unit = allowRepeat ? 'ที่' : 'ชนิด'
  return minSelections > 0
    ? `เลือก ${minSelections}–${maxSelections} ${unit}`
    : `เลือกได้สูงสุด ${maxSelections} ${unit} · ไม่บังคับ`
})
const selectedGroupId = ref(null)
const statusError = ref('')
const selectedGroup = computed(() => store.addonGroups.find(group => group.id === selectedGroupId.value) || store.addonGroups[0])
const addonMap = computed(() => new Map(store.addons.map(addon => [addon.id, addon])))
const detailSelection = ref(null)
const optionDetail = computed(() => {
  const group = store.addonGroups.find(item => item.id === detailSelection.value?.groupId)
  const option = group?.options.find(item => item.addonId === detailSelection.value?.addonId)
  const addon = addonMap.value.get(option?.addonId)
  return addon ? { group, option, addon } : null
})
const detailPricing = computed(() => {
  const { group, option, addon } = optionDetail.value
  const prices = optionPrices(group, option, addon)
  return { prices: Object.fromEntries(store.platforms.map(platform => [platform.id, prices[platform.id] ?? 0])) }
})
const detailCost = computed(() => recipeCost({ recipe: [] }, [optionDetail.value.addon], 1, store.materials))
const status = (group, option) => optionAvailability(group, option, addonMap.value.get(option.addonId), store.materials)
function priceSummary(group, option) {
  return formatPriceSummary(optionPrices(group, option, addonMap.value.get(option.addonId) || {}))
}
function formatPriceSummary(prices = {}) {
  const values = [...new Set(Object.values(prices).map(price => Number(price) || 0))]
  return values.some(price => price > 0) ? values.sort((a, b) => a - b).map(price => price === 0 ? 'ฟรี' : analysisMoney(price)).join(' / ') : 'ฟรี'
}
const setOptionActive = (group, id, active) => runAction('availability', async () => {
  statusError.value = ''
  const options = group.options.map(option => option.addonId === id ? { ...option, paused: !active } : option)
  const result = await store.saveAddonGroup({ ...group, options, ...(store.cloud ? { expectedCatalogRevision: store.catalogRevision } : {}) })
  if (!result?.ok) statusError.value = result?.message || 'เปลี่ยนสถานะไม่สำเร็จ กรุณาลองใหม่'
})
const { saveSnapshot, requestClose } = useModalForm(() => draft.value)
const optionFor = id => draft.value.options?.find(option => option.addonId === id)
const editorAddons = computed(() => (draft.value.options || []).flatMap(option => {
  const addon = draft.value.newOptions?.find(item => item.id === option.addonId) || addonMap.value.get(option.addonId)
  return addon ? [{ ...addon, recipe: draft.value.recipeChanges[addon.id] || addon.recipe || [] }] : []
}))
const optionEditor = ref(null)
const editingOption = computed(() => editorAddons.value.find(addon => addon.id === optionEditor.value?.id))
const optionEditorTitle = computed(() => ({ quantity: 'จำนวนต่อที่', packaging: 'บรรจุภัณฑ์', price: 'ราคาเพิ่ม' })[optionEditor.value?.mode] || 'ตั้งค่าตัวเลือก')
const isPackaging = row => store.matMap[row.materialId]?.inventoryType === 'packaging'
const ingredientRows = addon => addon.recipe.filter(row => !isPackaging(row))
const editableRows = computed(() => editingOption.value?.recipe.filter(row => isPackaging(row) === (optionEditor.value?.mode === 'packaging')) || [])
function showOptionEditor(addon, mode) {
  optionEditor.value = { id: addon.id, mode }
}
async function openOptionAction(mode) {
  showOptionEditor(editingOption.value, mode)
  await nextTick()
  document.querySelector('#group-option-settings .dialog-frame-body :is(input:not([hidden]), button:not(:disabled))')?.focus()
}
function removeEditingOption() {
  toggleOption(editingOption.value.id, false)
  optionEditor.value = null
}
function updateQuantity(addon, id, qty) {
  draft.value.recipeChanges[addon.id] = addon.recipe.map(row => row.materialId === id ? { ...row, qty } : row)
}
const packagingOptions = addon => stockMaterials.value.filter(material =>
  material.inventoryType === 'packaging' && !addon.recipe.some(row => row.materialId === material.id))
function addPackaging(addon, id) {
  if (packagingOptions(addon).some(material => material.id === id)) {
    draft.value.recipeChanges[addon.id] = [...addon.recipe, { materialId: id, qty: 1 }]
  }
}
function removePackaging(addon, id) {
  draft.value.recipeChanges[addon.id] = addon.recipe.filter(row => row.materialId !== id)
}
const stockPickerOpen = ref(false)
const stockSearch = ref('')
const selectedStockIds = ref([])
const stockMaterials = computed(() => store.activeMaterials.filter(material => !material.isArchived))
const usedStockIds = computed(() => new Set(editorAddons.value
  .map(addon => optionStockMaterialId(addon, store.matMap)).filter(Boolean)))
const stockPickerGroups = computed(() => {
  const query = stockSearch.value.trim().toLowerCase()
  return MATERIAL_KIND_OPTIONS.map(kind => ({
    ...kind,
    items: stockMaterials.value.filter(material => getMaterialKind(material) === kind.id && material.name.toLowerCase().includes(query))
  })).filter(kind => kind.items.length)
})
const stockNumber = new Intl.NumberFormat('th-TH', { maximumFractionDigits: 4 })
const stockMoney = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 4 })
const hasStockPack = material => !material.hasSubRecipe && material.packUnit && material.packUnit !== material.unit && Number(material.packSize) > 0
const stockCost = value => value == null || !Number.isFinite(Number(value)) ? 'ยังไม่ทราบ' : stockMoney.format(value)
function openStockPicker() {
  stockSearch.value = ''
  selectedStockIds.value = []
  stockPickerOpen.value = true
}
function toggleStock(id, checked) {
  if (usedStockIds.value.has(id)) return
  selectedStockIds.value = checked ? [...new Set([...selectedStockIds.value, id])] : selectedStockIds.value.filter(value => value !== id)
}
function addPickedOptions() {
  for (const material of stockMaterials.value.filter(item => selectedStockIds.value.includes(item.id) && !usedStockIds.value.has(item.id))) {
    addOption(material)
  }
  stockPickerOpen.value = false
}
const manualOpen = ref(false)
const manualName = ref('')
function addManualOption() {
  if (!manualName.value.trim()) return
  addOption({ name: manualName.value.trim() }, [])
  manualName.value = ''
  manualOpen.value = false
}
function optionImage(addon) {
  const material = store.matMap[optionStockMaterialId(addon, store.matMap)]
  return material
    ? { kind: 'materials', entityId: material.id, image: material.image, emoji: material.emoji }
    : { kind: 'addons', entityId: addon.isDraft ? undefined : addon.id, image: addon.image, emoji: addon.emoji }
}
function recipeSummary(addon) {
  const rows = addon.recipe || []
  if (!rows.length) return 'ไม่มีรายการตัดสต๊อก'
  const quantities = rows.map(row => {
    const material = store.matMap[row.materialId]
    return [material?.name === addon.name ? '' : material?.name || row.materialId, String(row.qty), material?.unit].filter(Boolean).join(' ')
  })
  return `${quantities.join(' + ')} / ที่`
}
function addOption(material, recipe = [{ materialId: material.id, qty: 1 }]) {
  const id = `ADDON-${crypto.randomUUID()}`
  draft.value.newOptions.push({ id, name: material.name, recipe, isDraft: true })
  toggleOption(id, true)
}
const baht = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' })
const analysisMoney = value => value === null ? 'คำนวณไม่ได้' : baht.format(value)
function priceAnalysis(addon) {
  return analyzeOption(addon, optionFor(addon.id).prices)
}
function analyzeOption(addon, channelPrices) {
  const prices = Object.fromEntries(store.platforms.map(platform => [platform.id, channelPrices?.[platform.id] || 0]))
  return store.platforms.map(platform => ({
    platform,
    ...selectedItemCosts({ prices }, [ { ...addon, recipe: addon.recipe, prices: {} } ], 1, store.materials, platform)
  }))
}
async function edit(group) {
  editCatalogRevision.value=store.catalogRevision
  draft.value = group ? clone(group) : { name: '', minSelections: 0, maxSelections: 3, allowRepeat: false, pricingMode: 'included', options: [] }
  draft.value.newOptions = []
  draft.value.recipeChanges = {}
  draft.value.menuIds = group ? store.menus.filter(menu => menu.addonGroupIds?.includes(group.id)).map(menu => menu.id) : []
  selectionRule.value = !draft.value.minSelections ? 'optional'
    : draft.value.minSelections === 1 && draft.value.maxSelections === 1 && !draft.value.allowRepeat ? 'one' : 'custom'
  if (group) {
    for (const option of draft.value.options) {
      option.prices = optionPrices(group, option, addonMap.value.get(option.addonId) || {})
    }
  }
  error.value = ''; fieldErrors.value = {}; open.value = true
  await nextTick(); saveSnapshot()
}
function close(savedId=null) { open.value = false;creationResolver.value?.(savedId);creationResolver.value=null }
async function openNew() { await edit();return new Promise(resolve=>{creationResolver.value=resolve}) }
defineExpose({openNew})
function requestEditorClose() { if(actionPending.value)return; if (open.value) return requestClose(close) }
function toggleOption(id, checked) {
  if (checked) draft.value.options.push({ addonId: id })
  else {
    draft.value.options = draft.value.options.filter(o => o.addonId !== id)
    draft.value.newOptions = draft.value.newOptions.filter(option => option.id !== id)
    delete draft.value.recipeChanges[id]
  }
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
  const newAddons = []
  const updatedAddons = []
  for (const addon of editorAddons.value) {
    if (!addon.isDraft && !Object.hasOwn(data.recipeChanges, addon.id)) continue
    const recipe = addon.recipe.map(row => ({ materialId: row.materialId, qty: Number(row.qty) }))
    if (addon.isDraft) newAddons.push({ id: addon.id, name: addon.name, recipe, prices: {}, isActive: true })
    else updatedAddons.push({ ...addon, recipe })
  }
  delete data.newOptions
  delete data.recipeChanges
  for (const addon of [...newAddons, ...updatedAddons]) {
    if (!addon.name) fieldErrors.value.options = 'กรอกชื่อให้ครบทุกตัวเลือก'
    else if (addon.recipe.some(row => !Number.isFinite(row.qty) || row.qty <= 0 || !store.activeMaterials.some(material => material.id === row.materialId && !material.isArchived))) {
      fieldErrors.value.options = 'ตรวจรายการจากคลังและกรอกจำนวนต่อที่มากกว่า 0'
    }
  }
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
  const conflictingMenu = linkedMenus.value.find(menu => menuLinkIssue(menu))
  if (conflictingMenu && !fieldErrors.value.maxSelections) {
    fieldErrors.value.maxSelections = `${conflictingMenu.name} · ${menuLinkIssue(conflictingMenu)}`
  }
  if (Object.keys(fieldErrors.value).length) {
    await nextTick()
    const key = ['name', 'minSelections', 'maxSelections'].find(key => fieldErrors.value[key])
    const id = { name: 'addon-group-name', minSelections: 'addon-group-min', maxSelections: 'addon-group-max' }[key]
    if (id) {
      if (key !== 'name' && groupRules.value) groupRules.value.open = true
      document.getElementById(id)?.focus()
    }
    else optionsSection.value?.focus()
    return
  }
  const previousIds=new Set(store.addonGroups.map(group=>group.id))
  const result = await store.saveAddonGroup({...data,newAddons,updatedAddons,...(store.cloud?{expectedCatalogRevision:editCatalogRevision.value}:{})})
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
.group-table-scroll:focus-visible{outline:none;background:var(--accent-soft)}
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
.group-item-trigger{grid-column:span 2;display:flex;align-items:center;gap:12px;min-width:0;text-align:start;font-weight:600;border-radius:10px}
.group-item-trigger .group-item-image{flex:none}
.group-item-name{min-width:0;overflow-wrap:anywhere}
button.group-item-trigger:hover .group-item-name{text-decoration:underline;text-underline-offset:3px}
button.group-item-trigger:focus-visible{outline:none;background:var(--accent-soft)}
button.group-item-trigger:focus-visible .group-item-name{text-decoration:underline;text-underline-offset:3px}
.option-detail-list{display:grid;gap:0;margin:0}
.option-detail-list li{display:flex;justify-content:space-between;gap:16px;padding-block:9px}
.option-detail-list li+li{border-top:1px solid var(--border-subtle)}
.option-detail-list strong{margin:0;text-align:end;font-variant-numeric:tabular-nums}

.group-item-status{font-size:.75rem;color:var(--text-muted)}
.group-item-status[data-status=low],.group-item-status[data-status=out]{color:var(--state-danger)}
.option-groups{container-type:inline-size;grid-template-rows:auto minmax(0,1fr)}
.group-mobile-picker{display:none}
@container(min-width:681px){
 .group-workspace{--group-row-height:72px}
 .group-directory-header,.group-items-header,.group-directory-button,.group-item{
  height:var(--group-row-height);
  min-height:0;
  padding-block:0;
 }
 .group-directory-header{border-bottom:0}
 .group-directory-button{border-top:1px solid var(--border-subtle);border-bottom:0}
 .group-directory-button strong,.group-items-header h4,.group-item-name{
  min-width:0;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
 }
}
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
 .group-item-image{width:40px;height:40px}
 .group-item-price,.group-item-status{grid-column:2}
 .group-item>.app-checkbox{grid-column:3;grid-row:1 / span 3}
}
@media(max-height:430px){
 .option-groups{gap:8px}
 .option-groups>.group-heading p{display:none}
 .group-workspace{--group-row-height:52px}
}
.group-option{padding:10px 12px;border:1px solid var(--border-subtle);background:var(--bg-card)}
.group-option--selected{gap:8px;background:var(--bg-soft)}
.stock-picker-list{margin:0;padding:0}
.stock-picker-list li+li{border-top:1px solid var(--border-subtle)}
.stock-picker-list :deep(.app-checkbox){display:flex;width:100%;padding:10px 4px}
.stock-picker-list :deep(.app-checkbox-content){flex:1}
.stock-picker-item{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr) minmax(0,1fr);gap:4px 12px;align-items:center;width:100%}
.stock-picker-name{display:flex;align-items:center;gap:8px;min-width:0;overflow-wrap:anywhere}
.stock-picker-name .group-item-image{width:40px;height:40px;flex:none}
.stock-picker-item small{color:var(--addon-text-secondary, var(--text-muted));font-variant-numeric:tabular-nums}
.stock-picker-item small span{display:block}
@media(max-width:520px){
 .stock-picker-item{grid-template-columns:repeat(2,minmax(0,1fr))}
 .stock-picker-item strong{grid-column:1 / -1}
}
.group-option-heading{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:8px}
.group-option-identity{min-width:0}
.group-option-identity > :is(strong,.group-help){display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.group-option-identity strong{font-weight:600}
.group-option-heading :deep(.ui-icon-button){min-width:44px;min-height:44px}
.group-option-heading :deep(.ui-icon-button:focus-visible){outline:none;background:var(--accent-soft);color:var(--accent-brand)}
@media(forced-colors:active){
 .group-table-scroll:focus-visible,button.group-item-trigger:focus-visible,.group-option-heading :deep(.ui-icon-button:focus-visible){outline:2px solid Highlight;outline-offset:-2px}
}
.group-option-menu{display:grid;gap:4px}
.group-option-menu :deep(.ui-button){justify-content:flex-start}
.group-option-quantity{display:flex;gap:8px;align-items:end}
.group-option-quantity > :first-child{flex:1;min-width:0}
.group-option-image{display:block;width:32px;height:32px;flex-shrink:0;border-radius:8px}
.group-rules{padding:12px;border:1px solid var(--border-subtle);border-radius:12px}
.group-rules summary{cursor:pointer}
.group-linked-menus{margin:0;padding-inline-start:20px;font-size:.875rem}
.group-rules summary small{margin-inline-start:8px;font-size:.75rem;color:var(--text-muted);font-weight:400}
.group-drawer-form{gap:24px}
.group-drawer-band{background:var(--bg-soft);padding:10px 12px;border-radius:8px}
.group-drawer-section .group-drawer-band{font-size:.875rem}
.group-drawer-form .group-rules{border:0;padding:0}
.group-rule-body{display:grid;gap:16px;padding-block-start:16px}
.group-rule-body :deep(.app-select),.group-rule-body :deep(.app-select-trigger){width:100%}
.group-stock-controls{padding:12px;border:1px solid var(--border-subtle);border-radius:12px}
.group-stock-controls summary{cursor:pointer;font-size:.8125rem;font-weight:600}
.group-stock-body{display:grid;gap:8px;padding-block-start:12px}
.group-stock-body :deep(.app-checkbox){display:flex;min-height:44px;width:100%}
.group-stock-body :deep(.app-checkbox-content){overflow-wrap:anywhere}
</style>
