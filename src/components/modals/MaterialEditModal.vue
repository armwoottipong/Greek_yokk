<template>
  <div
    v-if="store.modals.materialEdit.isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs"
    @click.self="close"
  >
    <div class="bg-white rounded-2xl border border-stone-200/80 shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
      <!-- Modal Header -->
      <div class="flex items-center justify-between border-b border-stone-100 pb-3">
        <div>
          <h3 class="text-base font-semibold text-stone-900">
            {{ isEditing ? `แก้ไขวัตถุดิบ: ${form.name}` : 'เพิ่มวัตถุดิบ / สินค้า' }}
          </h3>
          <p class="text-[11px] text-stone-400 mt-0.5">ระบุข้อมูลต้นทุน หรือกำหนดสูตรการผลิตจากวัตถุดิบรอง</p>
        </div>
        <button @click="close" class="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg">
          <X class="w-4 h-4" />
        </button>
      </div>

      <div class="space-y-4 text-xs">
        <!-- Emoji & Name -->
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
              placeholder="เช่น กรีกโยเกิร์ตแท้, นมสดพาสเจอร์ไรส์, สตรอว์เบอร์รี"
              class="soft-input w-full px-3 py-2 rounded-xl text-xs font-medium text-stone-900 placeholder:text-stone-400"
            />
          </div>
        </div>

        <!-- Category & Unit -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-stone-700 mb-1.5">หมวดหมู่</label>
            <select
              v-model="form.category"
              class="soft-input w-full px-3 py-2 rounded-xl text-xs font-medium text-stone-900"
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
              class="soft-input w-full px-3 py-2 rounded-xl text-xs text-stone-900 placeholder:text-stone-400"
            />
          </div>
        </div>

        <!-- Role Toggle: วัตถุดิบรอง หรือ วัตถุดิบหลัก -->
        <div class="flex items-center justify-between p-3 rounded-xl bg-purple-50/60 border border-purple-100/80">
          <div>
            <span class="block text-xs font-semibold text-purple-900">กำหนดเป็นวัตถุดิบรอง (Sub-ingredient)</span>
            <span class="text-[11px] text-purple-700/80">วัตถุดิบตั้งต้นสำหรับหมัก/ผลิตเบส (เช่น นมสด, หัวเชื้อ) ไม่ได้ตักขายหน้าร้าน</span>
          </div>
          <ToggleSwitch v-model="form.isSubIngredient" />
        </div>

        <!-- RECIPE SECTION: เฉพาะวัตถุดิบหลัก (Main Material) ที่แปรรูป/ผลิตจากวัตถุดิบรอง -->
        <div
          v-if="!form.isSubIngredient"
          class="p-3.5 rounded-2xl bg-amber-50/40 border border-amber-200/70 space-y-3"
        >
          <div class="flex items-center justify-between">
            <div>
              <span class="block text-xs font-bold text-amber-950 flex items-center gap-1.5">
                <span>🥣</span>
                <span>ผลิตจากวัตถุดิบรอง (Production Recipe)</span>
              </span>
              <span class="text-[11px] text-stone-500">
                เปิดเพื่อผูกสูตร เช่น ทำกรีกโยเกิร์ตด้วยนมสดและหัวเชื้อ พร้อมคำนวณต้นทุน
              </span>
            </div>
            <ToggleSwitch v-model="form.hasSubRecipe" />
          </div>

          <!-- Recipe Details Form -->
          <div v-if="form.hasSubRecipe" class="space-y-3 pt-2 border-t border-amber-200/60">
            <!-- Expected Yield Output -->
            <div class="p-2.5 rounded-xl bg-white border border-amber-100 flex items-center justify-between gap-3">
              <div>
                <label class="block text-xs font-semibold text-stone-800">ได้ผลผลิตต่อรอบ (Batch Yield Output)</label>
                <p class="text-[10px] text-stone-400">ปริมาณเนื้อวัตถุดิบหลักที่ผลิตได้จากการหมัก 1 รอบ</p>
              </div>
              <div class="flex items-center gap-1.5 w-36 shrink-0">
                <input
                  v-model.number="form.yieldQty"
                  type="number"
                  min="1"
                  step="any"
                  placeholder="เช่น 1200"
                  class="soft-input w-full px-2.5 py-1.5 rounded-lg text-xs font-number font-bold text-amber-950"
                />
                <span class="text-xs text-stone-500 shrink-0 font-medium">{{ form.unit || 'g' }}</span>
              </div>
            </div>

            <!-- Sub-ingredients List -->
            <div class="space-y-2">
              <div class="flex items-center justify-between text-xs">
                <span class="font-semibold text-stone-800">วัตถุดิบรองที่ต้องใช้ (Sub-ingredients):</span>
                <button
                  type="button"
                  @click="addSubRecipeRow"
                  class="text-[11px] font-semibold text-amber-900 hover:text-amber-950 flex items-center gap-1"
                >
                  <Plus class="w-3.5 h-3.5" />
                  <span>เพิ่มวัตถุดิบรอง</span>
                </button>
              </div>

              <div
                v-for="(row, idx) in form.subRecipe"
                :key="idx"
                class="flex items-center gap-2 p-2 bg-white rounded-xl border border-stone-200/80 text-xs"
              >
                <!-- Select Sub Material -->
                <select
                  v-model="row.materialId"
                  class="soft-input flex-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-stone-800"
                >
                  <option
                    v-for="sub in store.subMaterials"
                    :key="sub.id"
                    :value="sub.id"
                  >
                    {{ sub.emoji }} {{ sub.name }} (฿{{ sub.unitCost }}/{{ sub.unit }})
                  </option>
                </select>

                <!-- Input Quantity -->
                <div class="relative w-28 shrink-0">
                  <input
                    v-model.number="row.qty"
                    type="number"
                    min="0.1"
                    step="any"
                    placeholder="ปริมาณ"
                    class="soft-input w-full pl-2.5 pr-8 py-1.5 rounded-lg text-xs font-number font-bold text-stone-900"
                  />
                  <span class="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-stone-400">
                    {{ store.matMap[row.materialId]?.unit }}
                  </span>
                </div>

                <!-- Cost Subtotal for this row -->
                <span class="text-[11px] font-number text-stone-500 shrink-0 w-16 text-right">
                  ฿{{ ((row.qty || 0) * (store.matMap[row.materialId]?.unitCost || 0)).toFixed(1) }}
                </span>

                <!-- Remove Row -->
                <button
                  type="button"
                  @click="removeSubRecipeRow(idx)"
                  class="p-1 text-stone-400 hover:text-rose-600 rounded transition-colors"
                >
                  <X class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <!-- Recipe Live Cost Summary -->
            <div class="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-1.5 font-mono">
              <div class="flex items-center justify-between text-emerald-900">
                <span>ต้นทุนวัตถุดิบรองที่ใช้รวม:</span>
                <span class="font-bold">฿{{ calculatedSubCost.toFixed(2) }}</span>
              </div>
              <div class="flex items-center justify-between text-emerald-950 font-bold border-t border-emerald-200/80 pt-1.5">
                <span>ต้นทุนเฉลี่ยต่อหน่วย:</span>
                <div class="flex items-center gap-2">
                  <span class="text-sm font-number text-emerald-800">
                    ฿{{ (form.yieldQty > 0 ? calculatedSubCost / form.yieldQty : 0).toFixed(4) }} / {{ form.unit || 'g' }}
                  </span>
                  <button
                    type="button"
                    @click="applyCalculatedCost"
                    class="px-2.5 py-0.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-sans font-semibold transition-colors shadow-2xs"
                  >
                    ใช้ราคานี้
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Stock, Min Alert, Unit Cost -->
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

        <!-- Valuation Card -->
        <div class="p-3 bg-[#FAF9F6] rounded-xl text-[11px] text-stone-500 space-y-1">
          <div class="flex items-center justify-between">
            <span>มูลค่าวัตถุดิบคงคลังของรายการนี้:</span>
            <span class="font-number font-semibold text-amber-900">
              ฿{{ ((form.stock || 0) * (form.unitCost || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
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
