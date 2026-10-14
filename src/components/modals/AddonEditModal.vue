<template>
 <DialogFrame :open="store.modals.addonEdit.isOpen" id="AddonEditModal" :title="isEditing?'แก้ไข Add-on':'เพิ่ม Add-on ใหม่'" description="ชื่อและราคา ตามด้วยสูตรที่ใช้ต่อ 1 ที่" width="720px" :teleport="false" initial-focus="#addon-name" @request-close="requestClose(close)">
  <div class="menu-editor">
   <section class="menu-editor-basics" aria-label="ข้อมูล Add-on">
    <div class="menu-editor-identity"><FormField label="ไอคอน"><Button variant="secondary" class="menu-editor-emoji" aria-label="เปลี่ยนไอคอน Add-on" @click="openEmojiPicker"><span aria-hidden="true">{{ form.emoji }}</span></Button></FormField><FormField id="addon-name" label="ชื่อ Add-on" required :error="nameError" v-slot="{controlId,describedBy,invalid}"><AppInput :id="controlId" v-model="form.name" :aria-describedby="describedBy" :aria-invalid="invalid" aria-required="true" placeholder="เช่น สตรอว์เบอร์รีสด (30g)"/></FormField></div>
   </section>
   <details v-smooth-disclosure class="menu-editor-section" data-addon-prices open><summary><span>ราคาบวกเพิ่มแต่ละช่องทาง</span><small>{{ store.platforms.length }} ช่องทาง</small></summary><div class="menu-editor-section-body">
    <div class="menu-editor-prices"><FormField v-for="p in store.platforms" :key="p.id" :label="p.name" :hint="p.gpPercent>0?'ค่าธรรมเนียมช่องทาง '+p.gpPercent+'%':undefined" v-slot="{controlId}"><AppInput :id="controlId" v-model="form.prices[p.id]" type="number" min="0" step="any" :aria-label="`ราคา ${p.name}`" placeholder="0"><template #prefix>฿</template></AppInput></FormField></div>
   </div></details>
   <details v-smooth-disclosure class="menu-editor-section" data-addon-recipe open><summary><span>สูตรวัตถุดิบและบรรจุภัณฑ์</span><small>{{ form.recipe.length }} รายการ</small></summary><div class="menu-editor-section-body">
    <p class="menu-editor-help">ปริมาณที่ตัดต่อ Add-on 1 ที่ เลือกวัตถุดิบหรือบรรจุภัณฑ์ได้ในช่องเดียวกัน</p>
    <p v-if="!form.recipe.length" class="menu-editor-empty">ไม่ตัดวัตถุดิบหรือบรรจุภัณฑ์ · เพิ่มรายการเพื่อกำหนดสูตร</p>
    <div class="menu-editor-recipe-list"><div v-for="(row,idx) in form.recipe" :key="idx" data-addon-recipe-row>
     <p v-if="!isAvailableMaterial(row.materialId)" role="status" class="stock-form-error">ไม่พบวัตถุดิบหรือรายการถูกจัดเก็บ ({{ row.materialId || 'ยังไม่เลือก' }}) กรุณาเลือกใหม่หรือลบรายการ</p>
     <RecipeEditorRow v-model:material-id="row.materialId" v-model:qty="row.qty" :label="`วัตถุดิบในสูตร ${idx+1}`" :quantity-label="`ปริมาณ ${store.matMap[row.materialId]?.name||'วัตถุดิบในสูตร'}`" :unit="store.matMap[row.materialId]?.unit||'ไม่ระบุหน่วย'" :invalid="Boolean(recipeErrors[idx])" :error-id="recipeErrors[idx]?`addon-recipe-error-${idx}`:undefined" :remove-label="`ลบ ${store.matMap[row.materialId]?.name||'วัตถุดิบ'} จากสูตร`" @remove="form.recipe.splice(idx,1);recipeErrors=[]">
      <option v-if="!isAvailableMaterial(row.materialId)" :value="row.materialId" disabled>ไม่พบวัตถุดิบหรือถูกจัดเก็บ · {{ row.materialId||'เลือกรายการ' }}</option>
      <optgroup v-for="group in materialGroups" :key="group.type" :label="group.label"><option v-for="m in group.materials" :key="m.id" :value="m.id" :disabled="form.recipe.some((other,otherIdx)=>otherIdx!==idx&&other.materialId===m.id)">{{ m.emoji }} {{ m.name }} ({{ m.unit }})</option></optgroup>
     </RecipeEditorRow>
     <p v-if="recipeErrors[idx]" :id="`addon-recipe-error-${idx}`" role="alert" class="stock-form-error">{{ recipeErrors[idx] }}</p>
    </div></div>
    <Button variant="secondary" size="compact" @click="addRecipeRow"><Plus :size="16" aria-hidden="true"/>เพิ่มรายการในสูตร</Button>
   </div></details>
  </div>
  <template #footer><div class="menu-editor-footer"><Button variant="quiet" @click="requestClose(close)">ยกเลิก</Button><Button @click="submit"><Check :size="18" aria-hidden="true"/>บันทึก Add-on</Button></div></template>
 </DialogFrame>
</template>
<script setup>
import {MATERIAL_KIND_OPTIONS, getMaterialKind} from '@/domain/materialClassification'
import FormField from '@/components/ui/FormField.vue'
import AppInput from '@/components/ui/AppInput.vue'
import RecipeEditorRow from '@/components/ui/RecipeEditorRow.vue'
import Button from '@/components/ui/Button.vue'
import {vSmoothDisclosure, revealDisclosure} from '@/directives/smoothDisclosure'
import DialogFrame from '@/components/ui/DialogFrame.vue'
import { ref, computed, watch, nextTick } from 'vue'
import { usePosStore } from '@/stores/posStore'
import { useModalForm } from '@/composables/useModalForm'
import { Check, Plus } from 'lucide-vue-next'

const store = usePosStore()
const nameError=ref('')
const recipeErrors = ref([])

const form = ref({
  id: '',
  name: '',
  category: 'ผลไม้สด',
  emoji: '🍓',
  prices: {},
  recipe: []
})

const { saveSnapshot, requestClose, confirmSave } = useModalForm(() => form.value)

const isEditing = computed(() => Boolean(store.modals.addonEdit.addonId))

const materialGroups = computed(() => MATERIAL_KIND_OPTIONS.map(group => ({
  type:group.id, label:group.label,
  materials:store.activeMaterials.filter(m => !m.isArchived && getMaterialKind(m) === group.id)
})))

function isAvailableMaterial(id) {
  const material = store.matMap[id]
  return Boolean(material && !material.isDeleted && !material.isArchived)
}

function addRecipeRow() {
  const material = materialGroups.value.flatMap(group => group.materials).find(m => !form.value.recipe.some(row => row.materialId === m.id))
  if (!material) {
    store.showToast('ไม่มีรายการวัตถุดิบหรือบรรจุภัณฑ์ที่เพิ่มได้ กรุณาเพิ่มรายการในหน้าสต็อกก่อน', 'info')
    return
  }
  form.value.recipe.push({ materialId: material.id, qty: 1 })
  recipeErrors.value = []
}

watch(() => store.modals.addonEdit.isOpen, (open) => {
  if (open) {
    nameError.value=''
    recipeErrors.value = []
    const id = store.modals.addonEdit.addonId
    const addon = id ? store.addons.find(a => a.id === id) : null

    form.value = {
      id: addon ? addon.id : '',
      name: addon ? addon.name : '',
      category: addon ? addon.category : 'ผลไม้สด',
      emoji: addon ? addon.emoji : '🍓',
      prices: addon ? { ...addon.prices } : {},
      recipe: (addon?.recipe || []).map(row => ({ materialId: row.materialId, qty: row.qty }))
    }

    store.platforms.forEach(p => {
      if (form.value.prices[p.id] === undefined) {
        form.value.prices[p.id] = ''
      }
    })

    nextTick(() => {
      saveSnapshot()
    })
  }
})

function openEmojiPicker() {
  store.modals.emojiPicker = {
    isOpen: true,
    targetCallback: (emoji) => {
      form.value.emoji = emoji
    }
  }
}

function close() {
  store.modals.addonEdit.isOpen = false
  store.modals.addonEdit.addonId = null
}

async function submit() {
  nameError.value=''
  if (!form.value.name.trim()) {
    nameError.value='กรุณากรอกชื่อ Add-on ก่อนบันทึก'
    await nextTick()
    document.getElementById('addon-name')?.focus()
    return
  }

  const selected = new Set()
  recipeErrors.value = form.value.recipe.map(row => {
    if (!isAvailableMaterial(row.materialId)) return 'ไม่พบวัตถุดิบหรือรายการถูกจัดเก็บ กรุณาเลือกใหม่หรือลบรายการ'
    const qty = Number(row.qty)
    if (!Number.isFinite(qty) || qty <= 0) return 'กรุณากรอกปริมาณเป็นตัวเลขที่มากกว่า 0'
    if (selected.has(row.materialId)) return 'วัตถุดิบซ้ำในสูตร กรุณารวมปริมาณไว้ในรายการเดียว'
    selected.add(row.materialId)
    return ''
  })
  const invalidIndex = recipeErrors.value.findIndex(Boolean)
  if (invalidIndex !== -1) {
    await nextTick()
    const invalidRow = document.querySelectorAll('#AddonEditModal [data-addon-recipe-row]')[invalidIndex]
    const recipeSection = invalidRow?.closest('details')
    if (recipeSection) revealDisclosure(recipeSection)
    invalidRow?.querySelector('[aria-invalid="true"]')?.focus()
    return
  }

  const ok = await confirmSave(form.value.name.trim())
  if (!ok) return

  const result = store.saveAddon({
    id: form.value.id || undefined,
    name: form.value.name.trim(),
    emoji: form.value.emoji || '🍓',
    prices: Object.fromEntries(Object.entries(form.value.prices).map(([id, value]) => [id, value === '' ? 0 : Number(value)])),
    recipe: form.value.recipe.map(row => ({ materialId: row.materialId, qty: Number(row.qty) }))
  })

  if (result?.ok || result?.success) close()
}
</script>



<style scoped src="@/components/ui/catalogEditor.css"></style>
