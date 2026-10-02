<template>
  <div
    v-if="store.modals.stockIn.isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-stone-900/40 backdrop-blur-xs"
    @click.self="close"
  >
    <div class="bg-white rounded-2xl border border-stone-200/80 shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
      <!-- Calm Header -->
      <div class="px-7 py-5 border-b border-stone-100 flex items-center justify-between bg-white shrink-0">
        <div>
          <h3 class="text-base font-semibold text-stone-900 flex items-center gap-2">
            <span>📥</span>
            <span>รับเข้าสต็อกวัตถุดิบ (Stock In)</span>
          </h3>
          <p class="text-[11px] text-stone-500 mt-0.5">
            เลือกรับซื้อเข้าทั่วไป หรือผลิตวัตถุดิบหลักโดยใช้ส่วนผสมวัตถุดิบรอง
          </p>
        </div>
        <button @click="close" class="text-stone-400 hover:text-stone-700 p-2 rounded-xl hover:bg-stone-100 transition-colors">
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Pure Flat Body -->
      <div class="p-7 space-y-5 overflow-y-auto flex-1 text-xs">
        <!-- Target Material Selection -->
        <div>
          <label class="block text-xs font-medium text-stone-700 mb-1.5">
            เลือกวัตถุดิบที่ต้องการเพิ่มสต็อก <span class="text-rose-500">*</span>
          </label>
          <select
            v-model="selectedMatId"
            class="soft-input w-full px-3.5 py-2.5 rounded-xl text-xs font-medium text-stone-900"
          >
            <optgroup label="🥣 วัตถุดิบหลัก (หน้าร้าน)">
              <option
                v-for="m in store.mainMaterials"
                :key="m.id"
                :value="m.id"
              >
                {{ m.emoji }} {{ m.name }} (คงเหลือ: {{ m.stock }} {{ m.unit }})
              </option>
            </optgroup>
            <optgroup label="🥛 วัตถุดิบรอง (ใช้หมัก/ผลิต)">
              <option
                v-for="m in store.subMaterials"
                :key="m.id"
                :value="m.id"
              >
                {{ m.emoji }} {{ m.name }} (คงเหลือ: {{ m.stock }} {{ m.unit }})
              </option>
            </optgroup>
          </select>
        </div>

        <!-- Mode Toggle for Main Material (Clean Flat Capsule) -->
        <div
          v-if="isMainMaterial"
          class="flex items-center gap-1.5 p-1 bg-[#F5F4F0] rounded-xl text-xs font-semibold"
        >
          <button
            type="button"
            @click="mode = 'direct'"
            :class="[
              'flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5',
              mode === 'direct'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-500 hover:text-stone-900'
            ]"
          >
            <span>📦 ซื้อเข้าโดยตรง</span>
          </button>
          <button
            type="button"
            @click="mode = 'produce'"
            :class="[
              'flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5',
              mode === 'produce'
                ? 'bg-amber-900 text-white shadow-xs'
                : 'text-stone-500 hover:text-stone-900'
            ]"
          >
            <span>🥣 ใช้ส่วนผสมวัตถุดิบรอง</span>
          </button>
        </div>

        <!-- ================================================================= -->
        <!-- MODE A: DIRECT PURCHASE (รับซื้อเข้าปกติ)                         -->
        <!-- ================================================================= -->
        <div v-if="mode === 'direct' || !isMainMaterial" class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium text-stone-700 mb-1.5">
                จำนวนที่รับเข้า <span class="text-rose-500">*</span>
              </label>
              <div class="flex items-center gap-2">
                <input
                  v-model.number="directQty"
                  type="number"
                  min="0.1"
                  step="any"
                  placeholder="0"
                  class="soft-input w-full px-3.5 py-2.5 rounded-xl text-xs font-number font-semibold text-stone-900"
                />
                <span class="text-stone-400 text-xs shrink-0 font-medium w-8">{{ currentMat?.unit }}</span>
              </div>
            </div>
            <div>
              <label class="block text-xs font-medium text-stone-700 mb-1.5">
                ต้นทุนซื้อต่อหน่วย (฿)
              </label>
              <input
                v-model.number="directUnitCost"
                type="number"
                step="any"
                placeholder="0.00"
                class="soft-input w-full px-3.5 py-2.5 rounded-xl text-xs font-number font-semibold text-stone-900"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-medium text-stone-700 mb-1.5">หมายเหตุ / แหล่งซื้อ</label>
            <input
              v-model="directNote"
              type="text"
              placeholder="เช่น ซื้อจากแม็คโคร, ล็อตวันหมดอายุ 25/10"
              class="soft-input w-full px-3.5 py-2.5 rounded-xl text-xs text-stone-900 placeholder:text-stone-400"
            />
          </div>

          <!-- Total purchase valuation line -->
          <div class="flex items-center justify-between px-4 py-3 rounded-xl bg-[#FAF9F6] text-xs">
            <span class="text-stone-500">งบต้นทุนการรับเข้ารอบนี้:</span>
            <span class="font-number font-bold text-amber-900 text-sm">
              ฿{{ ((directQty || 0) * (directUnitCost || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
            </span>
          </div>
        </div>

        <!-- ================================================================= -->
        <!-- MODE B: PRODUCE FROM SUB-INGREDIENTS (หักสต็อกวัตถุดิบรอง)        -->
        <!-- ================================================================= -->
        <div v-else class="space-y-4">
          <!-- Yield output produced -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="block text-xs font-medium text-stone-700">
                ปริมาณที่วัตถุดิบหลักจะได้เพิ่ม <span class="text-rose-500">*</span>
              </label>
              <span class="text-[11px] text-stone-400">สต็อกจะเพิ่มตามจำนวนนี้</span>
            </div>
            <div class="flex items-center gap-2">
              <input
                v-model.number="produceYieldQty"
                type="number"
                min="0.1"
                step="any"
                placeholder="เช่น 1200"
                class="soft-input flex-1 px-3.5 py-2.5 rounded-xl text-xs font-number font-bold text-amber-950"
              />
              <span class="text-xs text-stone-500 shrink-0 font-medium px-3 py-2 bg-[#F5F4F0] rounded-xl">
                {{ currentMat?.unit }}
              </span>
            </div>
          </div>

          <!-- Sub-ingredients to consume -->
          <div class="space-y-2.5 pt-2 border-t border-stone-100">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium text-stone-800 flex items-center gap-1.5">
                <span>🥛</span>
                <span>วัตถุดิบรองที่นำมาเป็นส่วนผสม (หักจากสต็อก)</span>
              </span>
              <button
                type="button"
                @click="addSubRow"
                class="text-[11px] font-semibold text-amber-900 hover:text-amber-950 flex items-center gap-1 transition-colors"
              >
                <Plus class="w-3.5 h-3.5" />
                <span>เพิ่มส่วนผสม</span>
              </button>
            </div>

            <!-- Flat Sub-ingredient Rows (Zero heavy borders) -->
            <div class="space-y-2">
              <div
                v-for="(row, idx) in produceSubRows"
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
                    {{ sub.emoji }} {{ sub.name }} (มีในคลัง: {{ sub.stock }} {{ sub.unit }})
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

                <span
                  class="text-[10px] shrink-0 font-medium"
                  :class="isStockSufficient(row) ? 'text-emerald-700' : 'text-rose-600 font-bold'"
                >
                  {{ isStockSufficient(row) ? '✓ พอ' : '⚠️ ไม่พอ' }}
                </span>

                <button
                  v-if="produceSubRows.length > 1"
                  type="button"
                  @click="removeSubRow(idx)"
                  class="p-1 text-stone-400 hover:text-rose-600 rounded-lg transition-colors"
                >
                  <X class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <!-- Calm Cost Summary Pill (No multiple colored boxes) -->
          <div class="flex items-center justify-between px-4 py-3 rounded-xl bg-[#FAF9F6] text-xs font-mono">
            <span class="text-stone-500">
              รวมต้นทุนวัตถุดิบรอง: <strong class="text-stone-800">฿{{ totalProduceCost.toFixed(2) }}</strong>
            </span>
            <span class="text-stone-500">
              ต้นทุนเฉลี่ย: <strong class="text-emerald-800 font-number text-sm">฿{{ produceYieldQty > 0 ? (totalProduceCost / produceYieldQty).toFixed(4) : '0.00' }}/{{ currentMat?.unit }}</strong>
            </span>
          </div>

          <div>
            <label class="block text-xs font-medium text-stone-700 mb-1.5">บันทึกรอบการผลิต</label>
            <input
              v-model="produceNote"
              type="text"
              placeholder="เช่น หมักนมสด Meiji + หัวเชื้อ กรองเวย์ 16 ชม."
              class="soft-input w-full px-3.5 py-2.5 rounded-xl text-xs text-stone-900 placeholder:text-stone-400"
            />
          </div>
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
          :disabled="mode === 'produce' && isMainMaterial && (!canProduce || produceYieldQty <= 0)"
          class="px-6 py-2.5 text-xs font-semibold bg-stone-900 hover:bg-stone-800 text-white rounded-xl shadow-xs disabled:opacity-50 transition-all flex items-center gap-2"
        >
          <Check class="w-4 h-4" />
          <span>{{ mode === 'produce' && isMainMaterial ? 'ยืนยันผลิต & หักสต็อกวัตถุดิบรอง' : 'บันทึกรับเข้า' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { usePosStore } from '@/stores/posStore'
import { X, Check, Plus } from 'lucide-vue-next'

const store = usePosStore()

const selectedMatId = ref('')
const mode = ref('direct') // 'direct' | 'produce'

// Direct Restock fields
const directQty = ref(100)
const directUnitCost = ref(0)
const directNote = ref('')

// Produce from sub-ingredients fields
const produceYieldQty = ref(1200)
const produceSubRows = ref([])
const produceNote = ref('')

const currentMat = computed(() => {
  return store.matMap[selectedMatId.value]
})

const isMainMaterial = computed(() => {
  return currentMat.value && !currentMat.value.isSubIngredient
})

function loadFormulaForMaterial(mat) {
  if (mat && mat.hasSubRecipe && Array.isArray(mat.subRecipe) && mat.subRecipe.length > 0) {
    produceYieldQty.value = Number(mat.yieldQty) || 1200
    produceSubRows.value = mat.subRecipe.map(r => ({ materialId: r.materialId, qty: r.qty }))
    mode.value = 'produce'
  } else if (mat && !mat.isSubIngredient && mat.category === 'Base Yogurt') {
    produceYieldQty.value = 1200
    const milk = store.subMaterials.find(m => m.id === 'MAT002' || m.name.includes('นม'))
    const starter = store.subMaterials.find(m => m.id === 'MAT003' || m.name.includes('หัวเชื้อ'))
    produceSubRows.value = [
      { materialId: milk ? milk.id : (store.subMaterials[0]?.id || 'MAT002'), qty: 5000 },
      { materialId: starter ? starter.id : (store.subMaterials[1]?.id || 'MAT003'), qty: 300 }
    ]
    mode.value = 'produce'
  } else {
    produceYieldQty.value = 1000
    const firstSub = store.subMaterials[0]?.id || 'MAT002'
    produceSubRows.value = [{ materialId: firstSub, qty: 1000 }]
    mode.value = 'direct'
  }
}

watch(() => store.modals.stockIn.isOpen, (open) => {
  if (open) {
    const id = store.modals.stockIn.materialId || (store.activeMaterials[0]?.id || '')
    selectedMatId.value = id
    const mat = store.matMap[id]

    directUnitCost.value = mat ? mat.unitCost : 0
    directQty.value = mat && mat.unit === 'g' ? 1000 : 10
    directNote.value = ''
    produceNote.value = ''

    loadFormulaForMaterial(mat)
  }
})

watch(selectedMatId, (newId) => {
  const mat = store.matMap[newId]
  if (mat) {
    directUnitCost.value = mat.unitCost
    loadFormulaForMaterial(mat)
  }
})

// Sub-ingredient calculations
const totalProduceCost = computed(() => {
  return produceSubRows.value.reduce((sum, row) => {
    const sub = store.matMap[row.materialId]
    const cost = sub ? sub.unitCost : 0
    return sum + ((Number(row.qty) || 0) * cost)
  }, 0)
})

function isStockSufficient(row) {
  const sub = store.matMap[row.materialId]
  return sub && sub.stock >= (Number(row.qty) || 0)
}

const canProduce = computed(() => {
  if (produceSubRows.value.length === 0) return false
  return produceSubRows.value.every(row => isStockSufficient(row) && Number(row.qty) > 0)
})

function addSubRow() {
  const defaultSub = store.subMaterials[0]?.id || 'MAT002'
  produceSubRows.value.push({ materialId: defaultSub, qty: 1000 })
}

function removeSubRow(index) {
  produceSubRows.value.splice(index, 1)
}

function close() {
  store.modals.stockIn.isOpen = false
  store.modals.stockIn.materialId = null
}

function submit() {
  const mat = currentMat.value
  if (!mat) return

  // Mode: Produce from sub-ingredients
  if (isMainMaterial.value && mode.value === 'produce') {
    if (!produceYieldQty.value || produceYieldQty.value <= 0) {
      store.showToast('กรุณาระบุปริมาณที่วัตถุดิบหลักจะได้มากกว่า 0', 'error')
      return
    }

    if (!canProduce.value) {
      store.showToast('สต็อกวัตถุดิบรองไม่เพียงพอสำหรับการตัดสต็อก', 'error')
      return
    }

    const success = store.batchProduce(
      mat.id,
      produceYieldQty.value,
      produceSubRows.value,
      produceNote.value
    )
    if (success) {
      close()
    }
    return
  }

  // Mode: Direct Restock
  if (!directQty.value || directQty.value <= 0) {
    store.showToast('กรุณาระบุจำนวนที่รับเข้ามากกว่า 0', 'error')
    return
  }

  store.stockIn(mat.id, directQty.value, directUnitCost.value, directNote.value)
  close()
}
</script>
