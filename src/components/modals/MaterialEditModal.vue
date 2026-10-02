<template>
  <div
    v-if="store.modals.materialEdit.isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-stone-900/40 backdrop-blur-xs"
    @click.self="close"
  >
    <div class="bg-white rounded-2xl border border-stone-200/80 shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
      <!-- Calm Header -->
      <div class="px-7 py-5 border-b border-stone-100 flex items-center justify-between bg-white shrink-0">
        <div>
          <h3 class="text-base font-semibold text-stone-900">
            {{ isEditing ? `แก้ไขวัตถุดิบ: ${form.name}` : 'เพิ่มวัตถุดิบ / สินค้า' }}
          </h3>
          <p class="text-[11px] text-stone-500 mt-0.5">ระบุข้อมูลต้นทุน หรือกำหนดสูตรการผลิตจากวัตถุดิบรอง</p>
        </div>
        <button @click="close" class="text-stone-400 hover:text-stone-700 p-2 rounded-xl hover:bg-stone-100 transition-colors">
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Pure Flat Body -->
      <div class="p-7 space-y-5 overflow-y-auto flex-1 text-xs">
        <!-- Section 1: Emoji & Name -->
        <div class="flex items-start gap-3.5">
          <div class="shrink-0">
            <label class="block text-xs font-medium text-stone-700 mb-1.5">ไอคอน</label>
            <button
              type="button"
              @click="openEmojiPicker"
              class="soft-input flex items-center justify-center w-12 h-11 rounded-xl transition-all hover:bg-[#EAE8E1]"
            >
              <span class="text-2xl leading-none">{{ form.emoji }}</span>
            </button>
          </div>
          <div class="flex-1">
            <label class="block text-xs font-medium text-stone-700 mb-1.5">ชื่อวัตถุดิบ <span class="text-rose-500">*</span></label>
            <input
              v-model="form.name"
              type="text"
              placeholder="เช่น กรีกโยเกิร์ตแท้, นมสดพาสเจอร์ไรส์, สตรอว์เบอร์รี"
              class="soft-input w-full px-3.5 py-2.5 rounded-xl text-xs font-medium text-stone-900 placeholder:text-stone-400"
            />
          </div>
        </div>

        <!-- Section 2: Category & Unit -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-medium text-stone-700 mb-1.5">หมวดหมู่</label>
            <select
              v-model="form.category"
              class="soft-input w-full px-3.5 py-2.5 rounded-xl text-xs font-medium text-stone-900"
            >
              <option value="Base Yogurt">🥣 เบสกรีกโยเกิร์ต (Base)</option>
              <option value="วัตถุดิบรอง">🥛 วัตถุดิบรอง (Dairy/Starter)</option>
              <option value="Fresh Fruits">🍓 ผลไม้สด (Fresh Fruits)</option>
              <option value="Sauces">🍯 ซอส & น้ำเชื่อม (Sauces)</option>
              <option value="Toppings">🥜 ท็อปปิ้ง & กรอบ (Toppings)</option>
              <option value="Packaging">📦 บรรจุภัณฑ์ (Packaging)</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-stone-700 mb-1.5">หน่วยนับ</label>
            <input
              v-model="form.unit"
              type="text"
              placeholder="เช่น g, ml, pcs, ชิ้น"
              class="soft-input w-full px-3.5 py-2.5 rounded-xl text-xs text-stone-900 placeholder:text-stone-400"
            />
          </div>
        </div>

        <!-- Section 3: Stock, Min Alert, Unit Cost -->
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="block text-xs font-medium text-stone-700 mb-1.5">สต็อกปัจจุบัน:</label>
            <input
              v-model.number="form.stock"
              type="number"
              step="any"
              placeholder="0"
              class="soft-input w-full px-3 py-2 rounded-xl text-xs font-number font-semibold text-stone-900"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-stone-700 mb-1.5">จุดเตือนหมด:</label>
            <input
              v-model.number="form.minAlert"
              type="number"
              step="any"
              placeholder="0"
              class="soft-input w-full px-3 py-2 rounded-xl text-xs font-number font-semibold text-stone-900"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-stone-700 mb-1.5">ต้นทุน/หน่วย (฿):</label>
            <input
              v-model.number="form.unitCost"
              type="number"
              step="any"
              placeholder="0.00"
              class="soft-input w-full px-3 py-2 rounded-xl text-xs font-number font-semibold text-stone-900"
            />
          </div>
        </div>

        <!-- Section 4: Dual Functional Toggle Tiles (Consistent with MenuEditModal) -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <ToggleSwitch
            v-model="form.isSubIngredient"
            label="เป็นวัตถุดิบรอง"
            description="วัตถุดิบใช้หมัก/ผลิตเบส ไม่ได้ตักขาย"
            icon="🥛"
            color="purple"
          />
          <ToggleSwitch
            v-if="!form.isSubIngredient"
            v-model="form.hasSubRecipe"
            label="ผลิตจากวัตถุดิบรอง"
            description="เปิดเพื่อผูกสูตรผลิตและคำนวณต้นทุน"
            icon="🥣"
            color="amber"
          />
        </div>

        <!-- Section 5: Production Recipe (Flat rows, zero nested boxes) -->
        <div
          v-if="!form.isSubIngredient && form.hasSubRecipe"
          class="space-y-4 pt-2 border-t border-stone-100"
        >
          <!-- Yield output produced -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="block text-xs font-medium text-stone-700">
                ผลผลิตที่ได้ต่อรอบ (Batch Yield Output)
              </label>
              <span class="text-[11px] text-stone-400">ปริมาณเนื้อที่ได้จากการหมัก 1 รอบ</span>
            </div>
            <div class="flex items-center gap-2">
              <input
                v-model.number="form.yieldQty"
                type="number"
                min="1"
                step="any"
                placeholder="เช่น 1200"
                class="soft-input flex-1 px-3.5 py-2.5 rounded-xl text-xs font-number font-bold text-amber-950"
              />
              <span class="text-xs text-stone-500 shrink-0 font-medium px-3 py-2 bg-[#F5F4F0] rounded-xl">
                {{ form.unit || 'g' }}
              </span>
            </div>
          </div>

          <!-- Sub-ingredients List -->
          <div class="space-y-2.5">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium text-stone-800 flex items-center gap-1.5">
                <span>🥛</span>
                <span>วัตถุดิบรองที่ต้องใช้ (Sub-ingredients)</span>
              </span>
              <button
                type="button"
                @click="addSubRecipeRow"
                class="text-[11px] font-semibold text-amber-900 hover:text-amber-950 flex items-center gap-1 transition-colors"
              >
                <Plus class="w-3.5 h-3.5" />
                <span>เพิ่มวัตถุดิบรอง</span>
              </button>
            </div>

            <div class="space-y-2">
              <div
                v-for="(row, idx) in form.subRecipe"
                :key="idx"
                class="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#FAF9F6] hover:bg-[#F5F4F0] transition-colors"
              >
                <select
                  v-model="row.materialId"
                  class="bg-transparent border-0 flex-1 text-xs font-medium text-stone-900 focus:outline-none"
                >
                  <option
                    v-for="sub in store.subMaterials"
                    :key="sub.id"
                    :value="sub.id"
                  >
                    {{ sub.emoji }} {{ sub.name }} (฿{{ sub.unitCost }}/{{ sub.unit }})
                  </option>
                </select>

                <div class="flex items-center gap-1 w-28 shrink-0">
                  <input
                    v-model.number="row.qty"
                    type="number"
                    min="0.1"
                    step="any"
                    placeholder="0"
                    class="w-full bg-white px-2 py-1 rounded-lg text-right font-number font-semibold text-xs text-stone-900 focus:outline-none shadow-2xs"
                  />
                  <span class="text-[11px] text-stone-400 shrink-0 w-6">
                    {{ store.matMap[row.materialId]?.unit }}
                  </span>
                </div>

                <span class="text-[11px] font-number text-stone-500 shrink-0 w-16 text-right">
                  ฿{{ ((row.qty || 0) * (store.matMap[row.materialId]?.unitCost || 0)).toFixed(1) }}
                </span>

                <button
                  type="button"
                  @click="removeSubRecipeRow(idx)"
                  class="p-1 text-stone-400 hover:text-rose-600 rounded-lg transition-colors"
                >
                  <X class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <!-- Recipe Live Cost Summary Line -->
          <div class="flex items-center justify-between px-4 py-3 rounded-xl bg-[#FAF9F6] text-xs font-mono">
            <span class="text-stone-500">
              รวมต้นทุนวัตถุดิบรอง: <strong class="text-stone-800">฿{{ calculatedSubCost.toFixed(2) }}</strong>
            </span>
            <div class="flex items-center gap-2">
              <span class="text-stone-500">
                เฉลี่ย: <strong class="text-emerald-800 font-number text-sm">฿{{ (form.yieldQty > 0 ? calculatedSubCost / form.yieldQty : 0).toFixed(4) }}/{{ form.unit || 'g' }}</strong>
              </span>
              <button
                type="button"
                @click="applyCalculatedCost"
                class="px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-[10px] font-sans font-semibold transition-colors"
              >
                ใช้ราคานี้
              </button>
            </div>
          </div>
        </div>

        <!-- Live Total Valuation Line -->
        <div class="flex items-center justify-between px-4 py-3 rounded-xl bg-[#FAF9F6] text-xs">
          <span class="text-stone-500">มูลค่าวัตถุดิบคงคลังของรายการนี้:</span>
          <span class="font-number font-bold text-amber-900 text-sm">
            ฿{{ ((form.stock || 0) * (form.unitCost || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
          </span>
        </div>
      </div>

      <!-- Spacious Calm Footer -->
      <div class="px-7 py-4 border-t border-stone-100 bg-white flex items-center justify-end gap-3 shrink-0">
        <button
          type="button"
          @click="close"
          class="px-5 py-2.5 text-xs font-medium text-stone-600 hover:text-stone-900 rounded-xl hover:bg-stone-100 transition-colors"
        >
          ยกเลิก
        </button>
        <button
          type="button"
          @click="submit"
          class="px-6 py-2.5 text-xs font-semibold bg-stone-900 hover:bg-stone-800 text-white rounded-xl shadow-xs transition-all flex items-center gap-2"
        >
          <Check class="w-4 h-4" />
          <span>บันทึกวัตถุดิบ</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { usePosStore } from '@/stores/posStore'
import { X, Check, Plus } from 'lucide-vue-next'
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
  isSubIngredient: false,
  hasSubRecipe: false,
  yieldQty: 1200,
  subRecipe: []
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
      isSubIngredient: mat ? Boolean(mat.isSubIngredient) : false,
      hasSubRecipe: mat ? Boolean(mat.hasSubRecipe) : false,
      yieldQty: mat && mat.yieldQty ? Number(mat.yieldQty) : 1200,
      subRecipe: mat && Array.isArray(mat.subRecipe) && mat.subRecipe.length > 0
        ? JSON.parse(JSON.stringify(mat.subRecipe))
        : [
            { materialId: store.subMaterials[0]?.id || 'MAT002', qty: 5000 },
            { materialId: store.subMaterials[1]?.id || 'MAT003', qty: 300 }
          ]
    }
  }
})

// Calculate total cost of sub-ingredients in recipe
const calculatedSubCost = computed(() => {
  if (!form.value.subRecipe || form.value.subRecipe.length === 0) return 0
  return form.value.subRecipe.reduce((sum, row) => {
    const sub = store.matMap[row.materialId]
    const cost = sub ? sub.unitCost : 0
    return sum + ((Number(row.qty) || 0) * cost)
  }, 0)
})

function applyCalculatedCost() {
  const yieldQ = Number(form.value.yieldQty) || 1
  if (yieldQ > 0) {
    form.value.unitCost = Number((calculatedSubCost.value / yieldQ).toFixed(4))
    store.showToast(`นำต้นทุนที่คำนวณได้ (฿${form.value.unitCost}/${form.value.unit}) ไปใช้แล้ว`, 'success')
  }
}

function addSubRecipeRow() {
  const defaultSubId = store.subMaterials[0]?.id || 'MAT002'
  form.value.subRecipe.push({
    materialId: defaultSubId,
    qty: 1000
  })
}

function removeSubRecipeRow(index) {
  form.value.subRecipe.splice(index, 1)
}

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

  // If sub-ingredient is true, remove recipe
  const isSub = Boolean(form.value.isSubIngredient)
  const hasRecipe = !isSub && Boolean(form.value.hasSubRecipe)

  store.saveMaterial({
    id: form.value.id || undefined,
    name: form.value.name.trim(),
    category: form.value.category,
    unit: form.value.unit.trim() || 'g',
    stock: Number(form.value.stock) || 0,
    minAlert: Number(form.value.minAlert) || 0,
    unitCost: Number(form.value.unitCost) || 0,
    emoji: form.value.emoji || '🥣',
    isSubIngredient: isSub,
    hasSubRecipe: hasRecipe,
    yieldQty: hasRecipe ? (Number(form.value.yieldQty) || 1000) : undefined,
    subRecipe: hasRecipe ? form.value.subRecipe.filter(r => r.materialId && r.qty > 0) : []
  })

  close()
}
</script>
