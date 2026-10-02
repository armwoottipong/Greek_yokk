<template>
  <div
    v-if="store.modals.stockIn.isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-stone-900/40 backdrop-blur-xs"
    @click.self="close"
  >
    <div class="bg-white rounded-2xl border border-stone-200/80 shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
      <!-- Calm Clean Header -->
      <div class="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-white shrink-0">
        <div>
          <h3 class="text-sm font-semibold text-stone-900 flex items-center gap-1.5">
            <span>📥</span>
            <span>รับเข้าสต็อกวัตถุดิบ</span>
          </h3>
          <p class="text-[11px] text-stone-400 mt-0.5">
            {{ isProducedFromRecipe ? 'ผลิตตามสูตร (หักวัตถุดิบรองอัตโนมัติ)' : 'รับซื้อวัตถุดิบเข้าคลัง' }}
          </p>
        </div>
        <button @click="close" class="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100 transition-colors">
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Pure Minimal Body -->
      <div class="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
        <!-- 1. Select Material -->
        <div>
          <label class="block text-[11px] font-medium text-stone-600 mb-1">เลือกวัตถุดิบ</label>
          <select
            v-model="selectedMatId"
            class="soft-input w-full px-3 py-2 rounded-xl text-xs font-medium text-stone-900"
          >
            <optgroup label="🥣 วัตถุดิบหลัก">
              <option v-for="m in store.mainMaterials" :key="m.id" :value="m.id">
                {{ m.emoji }} {{ m.name }} (คงเหลือ: {{ m.stock.toLocaleString() }} {{ m.unit }})
              </option>
            </optgroup>
            <optgroup label="🥛 วัตถุดิบรอง">
              <option v-for="m in store.subMaterials" :key="m.id" :value="m.id">
                {{ m.emoji }} {{ m.name }} (คงเหลือ: {{ m.stock.toLocaleString() }} {{ m.unit }})
              </option>
            </optgroup>
          </select>
        </div>

        <!-- ============================================================= -->
        <!-- CASE A: DIRECT PURCHASE (วัตถุดิบทั่วไป เช่น นม, ผลไม้, ถ้วย)   -->
        <!-- ============================================================= -->
        <div v-if="!isProducedFromRecipe" class="space-y-3.5">
          <!-- Quantity input with mini unit toggle -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="text-[11px] font-medium text-stone-600">จำนวนที่รับเข้า</label>
              <!-- Mini unit capsule -->
              <div v-if="currentMat?.packUnit && currentMat?.packSize > 1" class="flex items-center p-0.5 bg-stone-100 rounded-lg text-[10px] font-semibold">
                <button
                  type="button"
                  @click="unitMode = 'pack'"
                  :class="[
                    'px-2 py-0.5 rounded transition-all',
                    unitMode === 'pack' ? 'bg-white text-stone-900 shadow-2xs font-bold' : 'text-stone-500 hover:text-stone-900'
                  ]"
                >
                  {{ currentMat.packUnit }}
                </button>
                <button
                  type="button"
                  @click="unitMode = 'base'"
                  :class="[
                    'px-2 py-0.5 rounded transition-all',
                    unitMode === 'base' ? 'bg-white text-stone-900 shadow-2xs font-bold' : 'text-stone-500 hover:text-stone-900'
                  ]"
                >
                  {{ currentMat.unit }}
                </button>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <input
                v-if="unitMode === 'pack'"
                v-model.number="inputPackQty"
                @input="syncFromPackQty"
                type="number"
                min="0.1"
                step="any"
                placeholder="0"
                class="soft-input w-full px-3 py-2 rounded-xl text-xs font-number font-bold text-stone-900"
              />
              <input
                v-else
                v-model.number="inputBaseQty"
                @input="syncFromBaseQty"
                type="number"
                min="0.1"
                step="any"
                placeholder="0"
                class="soft-input w-full px-3 py-2 rounded-xl text-xs font-number font-bold text-stone-900"
              />
              <span class="text-stone-500 font-medium shrink-0 w-12 text-center">
                {{ unitMode === 'pack' ? currentMat?.packUnit : currentMat?.unit }}
              </span>
            </div>

            <!-- Light conversion helper -->
            <p v-if="currentMat?.packSize > 1" class="text-[11px] text-stone-400 mt-1 font-number">
              <span v-if="unitMode === 'pack'">
                = {{ inputBaseQty.toLocaleString() }} {{ currentMat?.unit }} (1 {{ currentMat.packUnit }} = {{ currentMat.packSize }} {{ currentMat.unit }})
              </span>
              <span v-else>
                = {{ inputPackQty }} {{ currentMat?.packUnit }}
              </span>
            </p>
          </div>

          <!-- Price & Valuation summary -->
          <div class="grid grid-cols-2 gap-3 items-center p-3 rounded-xl bg-[#FAF9F6] border border-stone-200/50">
            <div>
              <label class="block text-[10px] text-stone-500 mb-0.5">ราคาซื้อ (฿ / {{ currentMat?.packUnit || currentMat?.unit }})</label>
              <input
                v-model.number="inputPackCost"
                type="number"
                step="any"
                class="w-full bg-white px-2.5 py-1 rounded-lg border border-stone-200 text-xs font-number font-semibold text-stone-900 focus:outline-none"
              />
            </div>
            <div class="text-right">
              <span class="block text-[10px] text-stone-400 mb-0.5">รวมงบซื้อรอบนี้</span>
              <span class="font-number font-bold text-amber-950 text-sm">
                ฿{{ calculatedDirectTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
              </span>
            </div>
          </div>

          <!-- Note -->
          <div>
            <label class="block text-[11px] font-medium text-stone-600 mb-1">หมายเหตุ (ถ้ามี)</label>
            <input
              v-model="note"
              type="text"
              placeholder="เช่น ซื้อจากแม็คโคร, ล็อต 25/10"
              class="soft-input w-full px-3 py-1.5 rounded-xl text-xs text-stone-900 placeholder:text-stone-400"
            />
          </div>
        </div>

        <!-- ============================================================= -->
        <!-- CASE B: PRODUCE FROM SUB-RECIPE (เช่น กรีกโยเกิร์ต)             -->
        <!-- ============================================================= -->
        <div v-else class="space-y-3.5">
          <!-- Quantity to Produce -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="text-[11px] font-medium text-stone-600">จำนวนที่ต้องการผลิต</label>
              <!-- Mini unit capsule -->
              <div class="flex items-center p-0.5 bg-stone-100 rounded-lg text-[10px] font-semibold">
                <button
                  type="button"
                  @click="produceUnitMode = 'batch'"
                  :class="[
                    'px-2 py-0.5 rounded transition-all',
                    produceUnitMode === 'batch' ? 'bg-white text-stone-900 shadow-2xs font-bold' : 'text-stone-500 hover:text-stone-900'
                  ]"
                >
                  รอบ (Batch)
                </button>
                <button
                  type="button"
                  @click="produceUnitMode = 'base'"
                  :class="[
                    'px-2 py-0.5 rounded transition-all',
                    produceUnitMode === 'base' ? 'bg-white text-stone-900 shadow-2xs font-bold' : 'text-stone-500 hover:text-stone-900'
                  ]"
                >
                  {{ currentMat?.unit }}
                </button>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <input
                v-if="produceUnitMode === 'batch'"
                v-model.number="produceBatchCount"
                @input="syncProduceFromBatch"
                type="number"
                min="0.1"
                step="any"
                class="soft-input w-full px-3 py-2 rounded-xl text-xs font-number font-bold text-amber-950"
              />
              <input
                v-else
                v-model.number="produceYieldQty"
                @input="syncProduceFromYield"
                type="number"
                min="1"
                step="any"
                class="soft-input w-full px-3 py-2 rounded-xl text-xs font-number font-bold text-amber-950"
              />
              <span class="text-stone-500 font-medium shrink-0 w-12 text-center">
                {{ produceUnitMode === 'batch' ? 'รอบ' : currentMat?.unit }}
              </span>
            </div>

            <p class="text-[11px] text-stone-400 mt-1 font-number">
              ผลผลิตที่จะได้: +{{ produceYieldQty.toLocaleString() }} {{ currentMat?.unit }}
              <span v-if="currentMat?.packSize > 1">
                (≈ {{ (produceYieldQty / currentMat.packSize).toFixed(1) }} {{ currentMat.packUnit }})
              </span>
            </p>
          </div>

          <!-- Deducted Sub-ingredients (Compact list) -->
          <div class="space-y-1.5 p-3 rounded-xl bg-[#FAF9F6] border border-stone-200/50">
            <div class="flex items-center justify-between text-[11px] font-medium text-stone-700 mb-1">
              <span>วัตถุดิบรองที่จะถูกหัก:</span>
              <span class="text-[10px] text-stone-400 font-number">สัดส่วน {{ (produceYieldQty / formulaYield).toFixed(2) }}x</span>
            </div>

            <div
              v-for="sub in scaledSubIngredients"
              :key="sub.materialId"
              class="flex items-center justify-between text-xs py-1 border-b border-stone-100 last:border-0"
            >
              <div class="flex items-center gap-1.5">
                <span>{{ store.matMap[sub.materialId]?.emoji }}</span>
                <span class="text-stone-800 font-medium">{{ store.matMap[sub.materialId]?.name }}</span>
              </div>
              <div class="flex items-center gap-2 font-number">
                <span class="text-rose-600 font-semibold">-{{ sub.qty.toLocaleString() }} {{ store.matMap[sub.materialId]?.unit }}</span>
                <span
                  class="text-[9px] px-1.5 py-0.5 rounded font-sans font-medium"
                  :class="sub.isSufficient ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700 font-bold'"
                >
                  {{ sub.isSufficient ? 'พอ' : 'ไม่พอ' }}
                </span>
              </div>
            </div>

            <!-- Cost Line -->
            <div class="flex items-center justify-between pt-1.5 text-[11px] text-stone-500 font-number">
              <span>ต้นทุนวัตถุดิบรอบนี้:</span>
              <span class="font-bold text-stone-800">฿{{ totalProduceCost.toFixed(2) }} (฿{{ produceYieldQty > 0 ? (totalProduceCost / produceYieldQty).toFixed(4) : 0 }}/{{ currentMat?.unit }})</span>
            </div>
          </div>

          <!-- Note -->
          <div>
            <label class="block text-[11px] font-medium text-stone-600 mb-1">หมายเหตุ (ถ้ามี)</label>
            <input
              v-model="note"
              type="text"
              placeholder="เช่น หมักนมสด Meiji + หัวเชื้อ 16 ชม."
              class="soft-input w-full px-3 py-1.5 rounded-xl text-xs text-stone-900 placeholder:text-stone-400"
            />
          </div>
        </div>
      </div>

      <!-- Clean Footer -->
      <div class="px-6 py-3.5 border-t border-stone-100 bg-white flex items-center justify-end gap-2.5 shrink-0">
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
          :disabled="isProducedFromRecipe && (!canProduce || produceYieldQty <= 0)"
          class="px-5 py-2 text-xs font-semibold bg-stone-900 hover:bg-stone-800 text-white rounded-xl shadow-xs disabled:opacity-40 transition-all flex items-center gap-1.5"
        >
          <Check class="w-3.5 h-3.5" />
          <span>{{ isProducedFromRecipe ? 'ผลิตและหักสต็อก' : 'บันทึกรับเข้า' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { usePosStore } from '@/stores/posStore'
import { X, Check } from 'lucide-vue-next'

const store = usePosStore()

const selectedMatId = ref('')
const unitMode = ref('pack') // 'pack' | 'base'
const inputPackQty = ref(1)
const inputBaseQty = ref(1200)
const inputPackCost = ref(54)
const note = ref('')

// Produce mode
const produceUnitMode = ref('batch') // 'batch' | 'base'
const produceBatchCount = ref(1)
const produceYieldQty = ref(1200)

const currentMat = computed(() => {
  return store.matMap[selectedMatId.value]
})

const isProducedFromRecipe = computed(() => {
  return Boolean(currentMat.value?.hasSubRecipe && currentMat.value?.subRecipe && currentMat.value.subRecipe.length > 0)
})

const formulaYield = computed(() => {
  return Number(currentMat.value?.yieldQty) || 1200
})

const calculatedDirectTotal = computed(() => {
  if (unitMode.value === 'pack') {
    return (Number(inputPackQty.value) || 0) * (Number(inputPackCost.value) || 0)
  }
  const packSize = currentMat.value?.packSize > 0 ? currentMat.value.packSize : 1
  const unitCost = (Number(inputPackCost.value) || 0) / packSize
  return (Number(inputBaseQty.value) || 0) * unitCost
})

function syncFromPackQty() {
  const pSize = currentMat.value?.packSize > 0 ? currentMat.value.packSize : 1
  inputBaseQty.value = Math.round((Number(inputPackQty.value) || 0) * pSize * 100) / 100
}

function syncFromBaseQty() {
  const pSize = currentMat.value?.packSize > 0 ? currentMat.value.packSize : 1
  inputPackQty.value = Number(((Number(inputBaseQty.value) || 0) / pSize).toFixed(2))
}

function syncProduceFromBatch() {
  produceYieldQty.value = Math.round((Number(produceBatchCount.value) || 1) * formulaYield.value)
}

function syncProduceFromYield() {
  produceBatchCount.value = Number(((Number(produceYieldQty.value) || formulaYield.value) / formulaYield.value).toFixed(2))
}

const scaledSubIngredients = computed(() => {
  if (!isProducedFromRecipe.value) return []
  const ratio = (Number(produceYieldQty.value) || formulaYield.value) / formulaYield.value
  return (currentMat.value.subRecipe || []).map(r => {
    const needed = Math.round((Number(r.qty) || 0) * ratio * 100) / 100
    const stock = Number(store.matMap[r.materialId]?.stock) || 0
    return {
      materialId: r.materialId,
      qty: needed,
      isSufficient: stock >= needed
    }
  })
})

const canProduce = computed(() => {
  if (scaledSubIngredients.value.length === 0) return false
  return scaledSubIngredients.value.every(r => r.isSufficient && r.qty > 0)
})

const totalProduceCost = computed(() => {
  return scaledSubIngredients.value.reduce((sum, r) => {
    const sub = store.matMap[r.materialId]
    const cost = sub ? Number(sub.unitCost) || 0 : 0
    return sum + (r.qty * cost)
  }, 0)
})

function initForMaterial(mat) {
  if (!mat) return
  const pSize = mat.packSize > 0 ? mat.packSize : 1
  const pCost = Number(mat.packCost) || ((Number(mat.unitCost) || 0) * pSize)

  if (mat.packUnit && mat.packSize > 1) {
    unitMode.value = 'pack'
    inputPackQty.value = 1
    inputBaseQty.value = pSize
  } else {
    unitMode.value = 'base'
    inputBaseQty.value = mat.unit === 'g' || mat.unit === 'ml' ? 1000 : 10
    inputPackQty.value = Number((inputBaseQty.value / pSize).toFixed(2))
  }

  inputPackCost.value = pCost
  note.value = ''
  produceUnitMode.value = 'batch'
  produceBatchCount.value = 1
  produceYieldQty.value = mat.yieldQty || 1200
}

watch(() => store.modals.stockIn.isOpen, (open) => {
  if (open) {
    const id = store.modals.stockIn.materialId || (store.activeMaterials[0]?.id || '')
    selectedMatId.value = id
    initForMaterial(store.matMap[id])
  }
})

watch(selectedMatId, (newId) => {
  initForMaterial(store.matMap[newId])
})

function close() {
  store.modals.stockIn.isOpen = false
  store.modals.stockIn.materialId = null
}

function submit() {
  const mat = currentMat.value
  if (!mat) return

  if (isProducedFromRecipe.value) {
    if (!produceYieldQty.value || produceYieldQty.value <= 0) {
      store.showToast('กรุณาระบุปริมาณที่ต้องการผลิต', 'error')
      return
    }
    if (!canProduce.value) {
      store.showToast('สต็อกวัตถุดิบรองไม่พอ', 'error')
      return
    }

    const ok = store.batchProduce(mat.id, produceYieldQty.value, scaledSubIngredients.value, note.value)
    if (ok) close()
    return
  }

  if (!inputBaseQty.value || inputBaseQty.value <= 0) {
    store.showToast('กรุณาระบุจำนวนที่รับเข้า', 'error')
    return
  }

  const pSize = mat.packSize > 0 ? mat.packSize : 1
  const unitCost = (Number(inputPackCost.value) || 0) / pSize
  store.stockIn(mat.id, inputBaseQty.value, unitCost, note.value, inputPackCost.value)
  close()
}
</script>
