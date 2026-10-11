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

        <p v-if="form.materialId && !store.matMap[form.materialId]" role="status" class="stock-form-error">ไม่พบวัตถุดิบที่ผูกไว้ กรุณาเลือกใหม่ หรือเลือกไม่ตัดวัตถุดิบ</p>
        <!-- Row 4: Material Linkage (ตัดสต็อกคลัง) -->
        <div class="p-3.5 rounded-xl bg-[#FBF5EA] border border-stone-100 space-y-2">
          <label class="block text-xs font-medium text-stone-800 flex items-center gap-1.5">
            <span>🔗</span>
            <span>ผูกตัดสต็อกวัตถุดิบในคลัง</span>
          </label>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-[11px] text-stone-500 mb-1">วัตถุดิบที่ตัด:</label>
              <AppSelect aria-label="วัตถุดิบที่ตัด"
                v-model="form.materialId"
                class="w-full"
              >
                <option value="">-- ไม่ตัดวัตถุดิบ --</option>
                <option
                  v-for="m in store.activeMaterials"
                  :key="m.id"
                  :value="m.id"
                >
                  {{ m.emoji }} {{ m.name }}
                </option>
              </AppSelect>
            </div>
            <div>
              <label class="block text-[11px] text-stone-500 mb-1">ปริมาณที่ตัดต่อที่:</label>
              <div class="flex items-center gap-1.5">
                <input aria-label="ปริมาณวัตถุดิบต่อครั้ง"
                  v-model.number="form.amountUsed"
                  type="number"
                  step="any"
                  placeholder="0"
                  class="soft-input w-full px-2.5 py-1.5 rounded-xl text-xs font-number font-semibold text-stone-900"
                />
                <span class="text-xs text-stone-400 shrink-0">
                  {{ selectedMaterialUnit }}
                </span>
              </div>
            </div>
          </div>
        </div>
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
import { Check } from 'lucide-vue-next'

const store = usePosStore()
const nameError=ref('')

const form = ref({
  id: '',
  name: '',
  category: 'ผลไม้สด',
  emoji: '🍓',
  prices: {},
  materialId: '',
  amountUsed: 25
})

const { saveSnapshot, requestClose, confirmSave } = useModalForm(() => form.value)

const isEditing = computed(() => Boolean(store.modals.addonEdit.addonId))

const selectedMaterialUnit = computed(() => {
  const m = store.matMap[form.value.materialId]
  return m ? m.unit : 'ไม่ระบุหน่วย'
})

watch(() => store.modals.addonEdit.isOpen, (open) => {
  if (open) {
    nameError.value=''
    const id = store.modals.addonEdit.addonId
    const addon = id ? store.addons.find(a => a.id === id) : null

    form.value = {
      id: addon ? addon.id : '',
      name: addon ? addon.name : '',
      category: addon ? addon.category : 'ผลไม้สด',
      emoji: addon ? addon.emoji : '🍓',
      prices: addon ? { ...addon.prices } : {},
      materialId: addon ? addon.materialId : '',
      amountUsed: addon ? addon.amountUsed : 25
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

  const ok = await confirmSave(form.value.name.trim())
  if (!ok) return

  const result = store.saveAddon({
    id: form.value.id || undefined,
    name: form.value.name.trim(),
    category: form.value.category,
    emoji: form.value.emoji || '🍓',
    prices: Object.fromEntries(Object.entries(form.value.prices).map(([id, value]) => [id, value === '' ? 0 : Number(value)])),
    materialId: form.value.materialId || null,
    amountUsed: Number(form.value.amountUsed) || 0
  })

  if (result?.ok || result?.success) close()
}
</script>


