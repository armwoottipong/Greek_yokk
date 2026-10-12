<template>
 <DialogFrame :open="store.modals.addonEdit.isOpen" id="AddonEditModal" title="ข้อมูล Add-on" :teleport="false" @request-close="requestClose(close)">
 <template #header><div class="flex items-center justify-between">
        <div>
          <h3 id="AddonEditModal-title" class="text-base font-semibold text-stone-900">
            {{ isEditing ? `แก้ไข Add-on: ${form.name}` : 'เพิ่ม Add-on / ท็อปปิ้ง' }}
          </h3>
          <p class="text-[11px] text-stone-400 mt-0.5">กำหนดราคาตามแพลตฟอร์มและการผูกตัดวัตถุดิบในคลัง</p>
        </div>
        
      </div></template>
 <div class="space-y-4 text-xs">
        <!-- Row 1: Emoji & Name -->
        <div class="flex items-start gap-3">
          <div class="shrink-0">
            <label class="block text-xs font-medium text-stone-700 mb-1.5">ไอคอน</label>
            <button
              type="button"
              @click="openEmojiPicker"
              class="soft-input flex items-center justify-center w-11 h-10 rounded-xl hover:bg-[#E8DCCB]"
            >
              <span class="text-xl leading-none">{{ form.emoji }}</span>
            </button>
          </div>
          <div class="flex-1">
            <FormField id="addon-name" label="ชื่อท็อปปิ้ง" required :error="nameError" v-slot="{controlId,describedBy,invalid}"><input :id="controlId" :aria-describedby="describedBy" :aria-invalid="invalid" aria-required="true"
              v-model="form.name"
              type="text"
              placeholder="เช่น สตรอว์เบอร์รีสด (30g)"
              class="soft-input w-full px-3 py-2 rounded-xl text-xs font-medium text-stone-900 placeholder:text-stone-400"
            /></FormField>
          </div>
        </div>

        <!-- Row 2: Category -->
        <div>
          <label class="block text-xs font-medium text-stone-700 mb-1.5">หมวดหมู่ Add-on</label>
          <AppSelect aria-label="หมวดหมู่"
            v-model="form.category"
            class="w-full"
          >
            <option
              v-for="cat in store.addonCategories"
              :key="cat.id"
              :value="cat.name"
            >
              {{ cat.icon || '✨' }} {{ cat.name }}
            </option>
            <option
              v-if="form.category && !store.addonCategories.some(c => c.name === form.category)"
              :value="form.category"
            >
              ✨ {{ form.category }}
            </option>
          </AppSelect>
        </div>

        <!-- Row 3: Platform Prices (Compact capsules) -->
        <div class="space-y-1.5">
          <label class="block text-xs font-medium text-stone-700">ราคาบวกเพิ่มตามแต่ละ Platform (฿)</label>
          <div class="price-editor-grid">
            <div
              v-for="p in store.platforms"
              :key="p.id"
              class="price-editor-field flex items-center justify-between gap-1.5 px-3 py-1.5 rounded-xl bg-[#F4EBDD] focus-within:bg-[#E8DCCB] focus-within:ring-1 focus-within:ring-brand-600/40"
            >
              <span class="text-xs font-medium text-stone-700">{{ p.name }}</span>
              <div class="flex items-center gap-0.5 shrink-0">
                <span class="text-stone-400 text-xs font-number">฿</span>
                <input :aria-label="`ราคา ${p.name}`"
                  v-model.number="form.prices[p.id]"
                  type="number"
                  placeholder="0"
                  class="w-14 bg-transparent border-0 text-right font-number font-semibold text-xs text-stone-900 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        <details class="editor-section" open>
          <summary>สูตรวัตถุดิบและบรรจุภัณฑ์</summary>
          <div class="editor-section-body space-y-3">
            <div class="flex items-center justify-between gap-2">
              <span class="font-medium text-stone-800">ปริมาณที่ตัดต่อ Add-on 1 ที่</span>
              <button type="button" @click="addRecipeRow" class="flex items-center gap-1 px-2.5 py-2 rounded-lg text-amber-900 hover:bg-amber-50">
                <Plus class="w-3.5 h-3.5" aria-hidden="true" />เพิ่มรายการในสูตร
              </button>
            </div>
            <p v-if="!form.recipe.length" class="text-stone-500">ไม่ตัดวัตถุดิบหรือบรรจุภัณฑ์ · เพิ่มรายการเพื่อกำหนดสูตร</p>
            <div v-for="(row, idx) in form.recipe" :key="idx" data-addon-recipe-row class="space-y-1.5">
              <p v-if="!isAvailableMaterial(row.materialId)" role="status" class="stock-form-error">ไม่พบวัตถุดิบหรือรายการถูกจัดเก็บ ({{ row.materialId || 'ยังไม่เลือก' }}) กรุณาเลือกใหม่หรือลบรายการ</p>
              <div class="flex flex-wrap items-center gap-2.5">
                <AppSelect :aria-label="`วัตถุดิบในสูตร ${idx + 1}`" v-model="row.materialId" :aria-invalid="Boolean(recipeErrors[idx])" :aria-describedby="recipeErrors[idx] ? `addon-recipe-error-${idx}` : undefined" class="flex-1 min-w-36">
                  <option v-if="!isAvailableMaterial(row.materialId)" :value="row.materialId" disabled>ไม่พบวัตถุดิบหรือถูกจัดเก็บ · {{ row.materialId || 'เลือกรายการ' }}</option>
                  <optgroup v-for="group in materialGroups" :key="group.type" :label="group.label">
                    <option v-for="m in group.materials" :key="m.id" :value="m.id" :disabled="form.recipe.some((other, otherIdx) => otherIdx !== idx && other.materialId === m.id)">
                      {{ m.emoji }} {{ m.name }} ({{ m.unit }})
                    </option>
                  </optgroup>
                </AppSelect>
                <div class="w-28 shrink-0 flex items-center gap-1.5">
                  <input :aria-label="`ปริมาณ ${store.matMap[row.materialId]?.name || 'วัตถุดิบในสูตร'}`" v-model.number="row.qty" :aria-invalid="Boolean(recipeErrors[idx])" :aria-describedby="recipeErrors[idx] ? `addon-recipe-error-${idx}` : undefined" type="number" min="0" step="any" placeholder="ปริมาณ" class="soft-input w-full px-2.5 py-2 rounded-xl text-xs font-number font-semibold" />
                  <span class="text-stone-500 shrink-0">{{ store.matMap[row.materialId]?.unit || 'ไม่ระบุหน่วย' }}</span>
                </div>
                <button type="button" :aria-label="`ลบ ${store.matMap[row.materialId]?.name || 'วัตถุดิบ'} จากสูตร`" title="ลบรายการ" @click="form.recipe.splice(idx, 1); recipeErrors = []" class="w-9 h-9 flex items-center justify-center text-stone-500 hover:text-rose-600 rounded-lg hover:bg-rose-50 shrink-0">
                  <Trash2 class="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
              <p v-if="recipeErrors[idx]" :id="`addon-recipe-error-${idx}`" role="alert" class="stock-form-error">{{ recipeErrors[idx] }}</p>
            </div>
          </div>
        </details>
      </div>
 <template #footer><div class="flex items-center justify-end gap-2.5">
        <button
          type="button"
          @click="requestClose(close)"
          class="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
        >
          ยกเลิก
        </button>
        <button
          type="button"
          @click="submit"
          class="px-5 py-2 text-xs font-semibold bg-brand-600 hover:bg-brand-800 text-white rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <Check class="w-3.5 h-3.5" />
          <span>บันทึก Add-on</span>
        </button>
      </div></template>
 </DialogFrame>
</template>

<script setup>
import FormField from '@/components/ui/FormField.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import DialogFrame from '@/components/ui/DialogFrame.vue'
import { ref, computed, watch, nextTick } from 'vue'
import { usePosStore } from '@/stores/posStore'
import { useModalForm } from '@/composables/useModalForm'
import { Check, Plus, Trash2 } from 'lucide-vue-next'

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

const materialGroups = computed(() => [
  { type: 'ingredient', label: 'วัตถุดิบ' },
  { type: 'packaging', label: 'บรรจุภัณฑ์' }
].map(group => ({ ...group, materials: store.activeMaterials.filter(m => !m.isArchived && m.inventoryType === group.type) })))

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
    if (recipeSection) recipeSection.open = true
    invalidRow?.querySelector('[aria-invalid="true"]')?.focus()
    return
  }

  const ok = await confirmSave(form.value.name.trim())
  if (!ok) return

  const result = store.saveAddon({
    id: form.value.id || undefined,
    name: form.value.name.trim(),
    category: form.value.category,
    emoji: form.value.emoji || '🍓',
    prices: Object.fromEntries(Object.entries(form.value.prices).map(([id, value]) => [id, value === '' ? 0 : Number(value)])),
    recipe: form.value.recipe.map(row => ({ materialId: row.materialId, qty: Number(row.qty) }))
  })

  if (result?.ok || result?.success) close()
}
</script>


