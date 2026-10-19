<template>
 <section class="option-groups" aria-label="กลุ่มตัวเลือก">
  <header class="group-heading"><div><h3>กลุ่มตัวเลือก</h3><p>สร้างชุดผลไม้หรือของเสริม แล้วนำไปใช้กับหลายเมนูได้</p></div><Button variant="secondary" @click="edit()"><Plus :size="16" aria-hidden="true"/>เพิ่มกลุ่มตัวเลือก</Button></header>
  <p v-if="!store.addonGroups.length" class="group-help">ยังไม่มีกลุ่ม เช่น “ผลไม้ฟรี 3 ชนิด” หรือ “เพิ่มพิเศษ”</p>
  <article v-for="group in store.addonGroups" :key="group.id" class="group-row">
   <div><strong>{{ group.name }}</strong><p>{{ group.pricingMode === 'included' ? 'รวมในราคาเมนู' : 'คิดเงินเพิ่ม' }} · เลือก {{ group.minSelections }}–{{ group.maxSelections }} {{ group.allowRepeat ? 'ที่ · เลือกซ้ำได้' : 'ชนิด' }}</p><small>{{ group.options.map(o => store.addons.find(a => a.id === o.addonId)?.name || 'ไม่พบรายการ').join(' · ') }}</small><small>ใช้ใน {{ store.menus.filter(m => m.addonGroupIds?.includes(group.id)).length }} เมนู</small></div>
   <div class="group-actions"><Button variant="quiet" :aria-label="`แก้ไขกลุ่ม ${group.name}`" @click="edit(group)">แก้ไข</Button><Button variant="quiet" :aria-label="`ลบกลุ่ม ${group.name}`" @click="remove(group)">ลบ</Button></div>
  </article>
  <DialogFrame id="addon-group-editor" :open="open" :title="draft.id ? 'แก้ไขกลุ่มตัวเลือก' : 'เพิ่มกลุ่มตัวเลือก'" description="กำหนดรายการ จำนวนที่เลือก และราคาที่ใช้ในกลุ่มนี้" width="720px" initial-focus="#addon-group-name" @request-close="requestEditorClose">
   <div class="group-form">
    <FormField id="addon-group-name" label="ชื่อกลุ่มตัวเลือก" required v-slot="{controlId}"><AppInput :id="controlId" v-model="draft.name" placeholder="เช่น ผลไม้ฟรี 3 ชนิด"/></FormField>
    <div class="group-fields"><FormField id="addon-group-min" label="เลือกอย่างน้อย" hint="0 = ไม่บังคับเลือก" v-slot="{controlId}"><AppInput :id="controlId" v-model="draft.minSelections" type="number" min="0" step="1"/></FormField><FormField id="addon-group-max" label="เลือกได้สูงสุด" v-slot="{controlId}"><AppInput :id="controlId" v-model="draft.maxSelections" type="number" min="1" step="1"/></FormField></div>
    <AppCheckbox v-model="draft.allowRepeat" variant="switch" label="เลือกชนิดเดิมซ้ำได้">เลือกชนิดเดิมซ้ำได้ · นับจำนวนเป็นที่</AppCheckbox>
    <FormField id="addon-group-pricing" label="การคิดราคา" v-slot="{controlId}"><AppSelect :id="controlId" v-model="draft.pricingMode"><option value="included">รวมในราคาเมนู · ไม่บวกเพิ่ม</option><option value="extra">คิดเงินเพิ่มตามตัวเลือก</option></AppSelect></FormField>
    <section class="group-options" aria-label="รายการในกลุ่ม"><h4>เลือก Add-on ที่ใช้ในกลุ่มนี้</h4><p class="group-help">สูตรและปริมาณต่อที่ใช้จากรายการ Add-on ด้านล่าง</p><AppSearch v-model="search" label="ค้นหา Add-on ในกลุ่ม" placeholder="ค้นหา Add-on"/>
     <p v-if="!store.addons.length" class="group-help">เพิ่มรายการ Add-on ก่อน แล้วกลับมาเลือกเข้ากลุ่ม</p>
     <p v-else-if="!filteredAddons.length" class="group-help">ไม่พบรายการ ลองค้นหาด้วยชื่ออื่น</p>
     <div v-for="addon in filteredAddons" :key="addon.id" class="group-option" data-group-addon>
      <AppCheckbox :model-value="Boolean(optionFor(addon.id))" :label="addon.name" @update:model-value="toggleOption(addon.id, $event)">{{ addon.emoji }} {{ addon.name }} <small v-if="addon.isActive === false">(ปิดขาย)</small></AppCheckbox>
      <template v-if="optionFor(addon.id) && draft.pricingMode === 'extra'">
       <AppCheckbox :model-value="optionFor(addon.id).prices !== undefined" :label="`กำหนดราคาเฉพาะกลุ่ม ${addon.name}`" @update:model-value="setCustomPrices(addon, $event)">กำหนดราคาเฉพาะกลุ่ม</AppCheckbox>
       <div v-if="optionFor(addon.id).prices !== undefined" class="group-fields"><FormField v-for="platform in store.platforms" :key="platform.id" :id="`group-price-${addon.id}-${platform.id}`" :label="platform.name" v-slot="{controlId}"><AppInput :id="controlId" v-model="optionFor(addon.id).prices[platform.id]" type="number" min="0" step="any"><template #prefix>฿</template></AppInput></FormField></div>
       <p v-else class="group-help">ใช้ราคาจากรายการ Add-on ตามช่องทางขาย</p>
      </template>
     </div>
    </section>
    <p v-if="error" role="alert" class="group-error">{{ error }}</p>
   </div>
   <template #footer><Button variant="quiet" @click="requestEditorClose">ยกเลิก</Button><Button @click="save"><Check :size="18" aria-hidden="true"/>บันทึกกลุ่มตัวเลือก</Button></template>
  </DialogFrame>
 </section>
</template>
<script setup>
import { ref, computed, nextTick } from 'vue'
import { Plus, Check } from 'lucide-vue-next'
import { usePosStore } from '@/stores/posStore'
import { useModalForm } from '@/composables/useModalForm'
import { clone } from '@/domain/database'
import Button from '@/components/ui/Button.vue'
import DialogFrame from '@/components/ui/DialogFrame.vue'
import FormField from '@/components/ui/FormField.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppCheckbox from '@/components/ui/AppCheckbox.vue'
import AppSearch from '@/components/ui/AppSearch.vue'

const store = usePosStore(), open = ref(false), error = ref(''), search = ref('')
const draft = ref({})
const { saveSnapshot, requestClose } = useModalForm(() => draft.value)
const filteredAddons = computed(() => store.addons.filter(a => a.name.toLowerCase().includes(search.value.trim().toLowerCase())))
const optionFor = id => draft.value.options?.find(o => o.addonId === id)
async function edit(group) {
  draft.value = group ? clone(group) : { name: '', minSelections: 0, maxSelections: 3, allowRepeat: false, pricingMode: 'included', options: [] }
  error.value = ''; search.value = ''; open.value = true
  await nextTick(); saveSnapshot()
}
function close() { open.value = false }
function requestEditorClose() { if (open.value) return requestClose(close) }
function toggleOption(id, checked) {
  if (checked) draft.value.options.push({ addonId: id })
  else draft.value.options = draft.value.options.filter(o => o.addonId !== id)
}
function setCustomPrices(addon, checked) {
  const option = optionFor(addon.id)
  if (checked) option.prices = Object.fromEntries(store.platforms.map(p => [p.id, addon.prices?.[p.id] ?? 0]))
  else delete option.prices
}
function save() {
  const data = clone(draft.value)
  data.minSelections = data.minSelections === '' ? NaN : Number(data.minSelections)
  data.maxSelections = data.maxSelections === '' ? NaN : Number(data.maxSelections)
  data.options.forEach(option => {
    if (option.prices) option.prices = Object.fromEntries(Object.entries(option.prices).map(([id, value]) => [id, value === '' ? NaN : Number(value)]))
  })
  const result = store.saveAddonGroup(data)
  if (result.ok) { saveSnapshot(); close() }
  else error.value = result.message || 'บันทึกไม่สำเร็จ กรุณาลองใหม่'
}
async function remove(group) {
  if (await store.confirmDialog({ title: 'ลบกลุ่มตัวเลือก?', message: group.name, confirmText: 'ลบกลุ่ม', cancelText: 'ยกเลิก', type: 'danger' })) store.deleteAddonGroup(group.id)
}
</script>
<style scoped>
.option-groups{display:grid;gap:16px;margin-bottom:24px}.group-heading{display:flex;justify-content:space-between;align-items:center;gap:16px}.group-heading h3{font-size:1rem;font-weight:600}.group-heading p,.group-row p,.group-row small,.group-help{font-size:.8125rem;line-height:1.7;color:var(--text-muted)}.group-heading p{margin-top:4px}.group-row{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px;background:var(--bg-soft);border-radius:12px}.group-row>div:first-child{min-width:0}.group-row strong,.group-row small{display:block;overflow-wrap:anywhere}.group-row strong{font-size:.9375rem}.group-actions{display:flex;flex-shrink:0;gap:4px}.group-form{display:grid;gap:20px}.group-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.group-options{display:grid;gap:12px}.group-options h4{font-size:.9375rem;font-weight:600}.group-option{display:grid;gap:12px;padding:16px;background:var(--bg-soft);border-radius:12px}.group-error{font-size:.875rem;color:var(--state-danger);line-height:1.7}.group-option :deep(.app-checkbox-content){flex-wrap:wrap;overflow-wrap:anywhere}.group-heading>.ui-button{flex-shrink:0}
@media(max-width:600px){.group-heading,.group-row{align-items:flex-start;flex-direction:column}.group-actions{align-self:flex-end}.group-fields{gap:12px}}
@media(max-width:359px){.group-fields{grid-template-columns:minmax(0,1fr)}}
</style>
