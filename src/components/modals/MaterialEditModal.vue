<template>
  <div
    v-if="store.modals.materialEdit.isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs"
    @click.self="close"
  >
    <div class="bg-white rounded-2xl border border-stone-200/80 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
      <div class="flex items-center justify-between border-b border-stone-100 pb-3">
        <div>
          <h3 class="text-base font-semibold text-stone-900">
            {{ isEditing ? `แก้ไขวัตถุดิบ: ${form.name}` : 'เพิ่มวัตถุดิบ / บรรจุภัณฑ์' }}
          </h3>
          <p class="text-[11px] text-stone-400 mt-0.5">ระบุต้นทุนต่อหน่วยและเกณฑ์เตือนสต็อกใกล้หมด</p>
        </div>
        <button @click="close" class="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg">
          <X class="w-4 h-4" />
        </button>
      </div>

      <div class="space-y-4 text-xs">
        <div class="flex items-start gap-3">
          <div class="shrink-0">
            <label class="block text-xs font-medium text-stone-700 mb-1.5">ไอคอน</label>
            <button
              type="button"
              @click="openEmojiPicker"
              class="soft-input flex items-center justify-center w-11 h-10 rounded-xl hover:bg-[#EAE8E1]"
            >
              <span class="text-xl leading-none">{{ form.emoji }}</span>
            </button>
          </div>
          <div class="flex-1">
            <label class="block text-xs font-medium text-stone-700 mb-1.5">ชื่อวัตถุดิบ <span class="text-rose-500">*</span></label>
            <input
              v-model="form.name"
              type="text"
              placeholder="เช่น สตรอว์เบอร์รีสด, ถ้วย Type A"
              class="soft-input w-full px-3 py-2 rounded-xl text-xs font-medium text-stone-900 placeholder:text-stone-400"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-stone-700 mb-1.5">หมวดหมู่</label>
            <select
              v-model="form.category"
              class="soft-input w-full px-3 py-2 rounded-xl text-xs font-medium text-stone-900"
            >
              <option value="Base Yogurt">🥣 เบสกรีกโยเกิร์ต (Base)</option>
              <option value="Fresh Fruits">🍓 ผลไม้สด (Fresh Fruits)</option>
              <option value="Sauces">🍯 ซอส & น้ำเชื่อม (Sauces)</option>
              <option value="Toppings">🥜 ท็อปปิ้ง & กรอบ (Toppings)</option>
              <option value="Packaging">📦 บรรจุภัณฑ์ (Packaging)</option>
              <option value="วัตถุดิบรอง">🥛 วัตถุดิบรอง (Dairy/Other)</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-stone-700 mb-1.5">หน่วยนับ</label>
            <input
              v-model="form.unit"
              type="text"
              placeholder="เช่น g, ml, pcs, ชิ้น"
              class="soft-input w-full px-3 py-2 rounded-xl text-xs text-stone-900 placeholder:text-stone-400"
            />
          </div>
        </div>

        <div class="grid grid-cols-3 gap-2.5">
          <div>
            <label class="block text-[11px] font-medium text-stone-700 mb-1">สต็อกปัจจุบัน:</label>
            <input
              v-model.number="form.stock"
              type="number"
              step="any"
              placeholder="0"
              class="soft-input w-full px-2.5 py-1.5 rounded-xl text-xs font-number font-semibold text-stone-900"
            />
          </div>
          <div>
            <label class="block text-[11px] font-medium text-stone-700 mb-1">จุดเตือนหมด:</label>
            <input
              v-model.number="form.minAlert"
              type="number"
              step="any"
              placeholder="0"
              class="soft-input w-full px-2.5 py-1.5 rounded-xl text-xs font-number font-semibold text-stone-900"
            />
          </div>
          <div>
            <label class="block text-[11px] font-medium text-stone-700 mb-1">ต้นทุน/หน่วย (฿):</label>
            <input
              v-model.number="form.unitCost"
              type="number"
              step="any"
              placeholder="0.00"
              class="soft-input w-full px-2.5 py-1.5 rounded-xl text-xs font-number font-semibold text-stone-900"
            />
          </div>
        </div>

        <div class="flex items-center justify-between p-3 rounded-xl bg-purple-50/60 border border-purple-100/80">
          <div>
            <span class="block text-xs font-semibold text-purple-900">กำหนดเป็นวัตถุดิบรอง (Sub-ingredient)</span>
            <span class="text-[11px] text-purple-700/80">วัตถุดิบตั้งต้นสำหรับหมัก/ผลิตเบส (เช่น นมสด, หัวเชื้อ) ไม่ได้ตักขายหน้าร้านโดยตรง</span>
          </div>
          <ToggleSwitch v-model="form.isSubIngredient" />
        </div>

        <div class="p-3 bg-[#FAF9F6] rounded-xl text-[11px] text-stone-500 space-y-1">
          <div class="flex items-center justify-between">
            <span>มูลค่าวัตถุดิบคงคลังของรายการนี้:</span>
            <span class="font-number font-semibold text-amber-900">
              ฿{{ ((form.stock || 0) * (form.unitCost || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
            </span>
          </div>
        </div>
      </div>

      <div class="flex items-center justify-end gap-2.5 pt-2 border-t border-stone-100">
        <button
          type="button"
          @click="close"
          class="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 rounded-xl hover:bg-stone-100 transition-colors"
        >
          ยกเลิก
        </button>
        <button
          type="button"
          @click="submit"
          class="px-5 py-2 text-xs font-semibold bg-stone-900 hover:bg-stone-800 text-white rounded-xl shadow-xs transition-all flex items-center gap-1.5"
        >
          <Check class="w-3.5 h-3.5" />
          <span>บันทึกวัตถุดิบ</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { usePosStore } from '@/stores/posStore'
import { X, Check } from 'lucide-vue-next'
import ToggleSwitch from '@/components/ui/ToggleSwitch.vue'

const store = usePosStore()

const form = ref({
  id: '',
  name: '',
  category: 'Base Yogurt',
  unit: 'g',
  stock: 0,
  minAlert: 500,
  unitCost: 0.18,
  emoji: '🥣',
  isSubIngredient: false
})

const isEditing = computed(() => Boolean(store.modals.materialEdit.materialId))

watch(() => store.modals.materialEdit.isOpen, (open) => {
  if (open) {
    const id = store.modals.materialEdit.materialId
    const mat = id ? store.materials.find(m => m.id === id) : null

    form.value = {
      id: mat ? mat.id : '',
      name: mat ? mat.name : '',
      category: mat ? mat.category : 'Base Yogurt',
      unit: mat ? mat.unit : 'g',
      stock: mat ? mat.stock : 0,
      minAlert: mat ? mat.minAlert : 500,
      unitCost: mat ? mat.unitCost : 0.18,
      emoji: mat ? mat.emoji : '🥣',
      isSubIngredient: mat ? Boolean(mat.isSubIngredient) : false
    }
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
  store.modals.materialEdit.isOpen = false
  store.modals.materialEdit.materialId = null
}

function submit() {
  if (!form.value.name.trim()) {
    store.showToast('กรุณากรอกชื่อวัตถุดิบ', 'error')
    return
  }

  store.saveMaterial({
    id: form.value.id || undefined,
    name: form.value.name.trim(),
    category: form.value.category,
    unit: form.value.unit.trim() || 'g',
    stock: Number(form.value.stock) || 0,
    minAlert: Number(form.value.minAlert) || 0,
    unitCost: Number(form.value.unitCost) || 0,
    emoji: form.value.emoji || '🥣'
  })

  close()
}
</script>
