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
            {{ isProducedFromRecipe ? 'ผลิตวัตถุดิบหลักโดยใช้ส่วนผสมวัตถุดิบรอง (หักสต็อกอัตโนมัติ)' : 'รับซื้อวัตถุดิบเข้าคลัง เลือกหน่วยขวด/ลัง/กรัมได้' }}
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
                {{ m.emoji }} {{ m.name }} (คงเหลือ: {{ m.stock.toLocaleString() }} {{ m.unit }} {{ m.packSize > 1 ? `≈ ${(m.stock / m.packSize).toFixed(1)} ${m.packUnit}` : '' }})
              </option>
            </optgroup>
            <optgroup label="🥛 วัตถุดิบรอง (ใช้หมัก/ผลิต)">
              <option
                v-for="m in store.subMaterials"
                :key="m.id"
                :value="m.id"
              >
                {{ m.emoji }} {{ m.name }} (คงเหลือ: {{ m.stock.toLocaleString() }} {{ m.unit }} {{ m.packSize > 1 ? `≈ ${(m.stock / m.packSize).toFixed(1)} ${m.packUnit}` : '' }})
              </option>
            </optgroup>
          </select>
        </div>

        <!-- ================================================================= -->
        <!-- MANDATORY RECIPE BADGE (บังคับใช้วัตถุดิบรองตามสูตร ห้ามข้าม)      -->
        <!-- ================================================================= -->
        <div
          v-if="isProducedFromRecipe"
          class="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/60 flex items-start gap-3"
        >
          <span class="text-lg">🥣</span>
          <div class="flex-1 text-[11px] leading-relaxed">
            <span class="font-bold text-amber-950 block text-xs">วัตถุดิบนี้ผลิตจากวัตถุดิบรอง (สูตรบังคับ)</span>
            <span class="text-amber-800">
              ระบบบังคับหักสต็อกวัตถุดิบรอง (เช่น นมสด, หัวเชื้อ) ตามอัตราส่วนของผลผลิตที่ต้องการเพิ่ม เพื่อให้ยอดสต็อกจริงถูกต้องเสมอ
            </span>
          </div>
        </div>

        <!-- ================================================================= -->
        <!-- MODE A: DIRECT PURCHASE (รับซื้อเข้าปกติ เช่น นม, ผลไม้, ถ้วย)      -->
        <!-- ================================================================= -->
        <div v-if="!isProducedFromRecipe" class="space-y-4">
          <!-- Unit Switch: [ ขวด (1200 ml) ] vs [ ml ] -->
          <div v-if="currentMat?.packUnit && currentMat?.packSize > 1" class="space-y-1.5">
            <label class="block text-xs font-medium text-stone-700">เลือกหน่วยที่ต้องการเพิ่มสต็อก</label>
            <div class="flex items-center gap-1.5 p-1 bg-[#F5F4F0] rounded-xl text-xs font-semibold">
              <button
                type="button"
                @click="setDirectUnitMode('pack')"
                :class="[
                  'flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5',
                  directUnitMode === 'pack'
                    ? 'bg-amber-900 text-white shadow-xs font-bold'
                    : 'text-stone-600 hover:text-stone-900'
                ]"
              >
                <span>📦 นับเป็น{{ currentMat.packUnit }} (1 {{ currentMat.packUnit }} = {{ currentMat.packSize }} {{ currentMat.unit }})</span>
              </button>
              <button
                type="button"
                @click="setDirectUnitMode('base')"
                :class="[
                  'flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5',
                  directUnitMode === 'base'
                    ? 'bg-white text-stone-900 shadow-xs font-bold'
                    : 'text-stone-500 hover:text-stone-900'
                ]"
              >
                <span>⚖️ นับเป็น{{ currentMat.unit }} (หน่วยย่อย)</span>
              </button>
            </div>
          </div>

          <!-- Quantity and Price inputs -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- Qty input based on mode -->
            <div>
              <label class="block text-xs font-medium text-stone-700 mb-1.5">
                จำนวนที่รับเข้า ({{ activeDirectUnitLabel }}) <span class="text-rose-500">*</span>
              </label>
              <div class="flex items-center gap-2">
                <input
                  v-if="directUnitMode === 'pack'"
                  v-model.number="directPackQty"
                  @input="onDirectPackQtyInput"
                  type="number"
                  min="0.1"
                  step="any"
                  placeholder="0"
                  class="soft-input w-full px-3.5 py-2.5 rounded-xl text-xs font-number font-semibold text-stone-900"
                />
                <input
                  v-else
                  v-model.number="directBaseQty"
                  @input="onDirectBaseQtyInput"
                  type="number"
                  min="0.1"
                  step="any"
                  placeholder="0"
                  class="soft-input w-full px-3.5 py-2.5 rounded-xl text-xs font-number font-semibold text-stone-900"
                />
                <span class="text-stone-500 text-xs shrink-0 font-medium w-12">{{ activeDirectUnitLabel }}</span>
              </div>
            </div>

            <!-- Price input based on mode -->
            <div>
              <label class="block text-xs font-medium text-stone-700 mb-1.5">
                {{ directUnitMode === 'pack' ? `ราคาซื้อต่อ 1 ${currentMat?.packUnit} (฿)` : `ต้นทุนต่อ 1 ${currentMat?.unit} (฿)` }}
              </label>
              <input
                v-if="directUnitMode === 'pack'"
                v-model.number="directPackCost"
                @input="onDirectPackCostInput"
                type="number"
                step="any"
                placeholder="0.00"
                class="soft-input w-full px-3.5 py-2.5 rounded-xl text-xs font-number font-semibold text-stone-900"
              />
              <input
                v-else
                v-model.number="directUnitCost"
                @input="onDirectUnitCostInput"
                type="number"
                step="any"
                placeholder="0.00"
                class="soft-input w-full px-3.5 py-2.5 rounded-xl text-xs font-number font-semibold text-stone-900"
              />
            </div>
          </div>

          <!-- Live Conversion Result Pill -->
          <div class="p-3.5 rounded-xl bg-[#FAF9F6] border border-stone-200/60 space-y-2 text-xs">
            <div class="flex items-center justify-between text-stone-700">
              <span class="font-medium">สรุปยอดที่จะเพิ่มเข้าคลัง:</span>
              <span class="font-number font-bold text-emerald-800 text-sm">
                +{{ directBaseQty.toLocaleString() }} {{ currentMat?.unit }}
                <span v-if="currentMat?.packSize > 1" class="text-xs font-normal text-stone-500">
                  ({{ directPackQty }} {{ currentMat?.packUnit }})
                </span>
              </span>
            </div>
            <div class="flex items-center justify-between text-stone-700 pt-1.5 border-t border-stone-200/50">
              <span>งบต้นทุนการรับเข้ารอบนี้:</span>
              <span class="font-number font-bold text-amber-950 text-sm">
                ฿{{ totalDirectCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                <span class="text-[11px] font-normal text-stone-400">
                  (ตก ฿{{ directUnitCost.toFixed(4) }} / {{ currentMat?.unit }})
                </span>
              </span>
            </div>
          </div>

          <div>
            <label class="block text-xs font-medium text-stone-700 mb-1.5">หมายเหตุ / แหล่งซื้อ</label>
            <input
              v-model="directNote"
              type="text"
              placeholder="เช่น ซื้อจากแม็คโคร, โลตัส, ล็อตวันหมดอายุ 25/10"
              class="soft-input w-full px-3.5 py-2.5 rounded-xl text-xs text-stone-900 placeholder:text-stone-400"
            />
          </div>
        </div>

        <!-- ================================================================= -->
        <!-- MODE B: PRODUCE FROM SUB-INGREDIENTS (หักสต็อกวัตถุดิบรอง บังคับ)  -->
        <!-- ================================================================= -->
        <div v-else class="space-y-4">
          <!-- Switch Output Unit: [ รอบ / ถัง (1200 g) ] vs [ g ] -->
          <div class="space-y-1.5">
            <label class="block text-xs font-medium text-stone-700">
              ระบุปริมาณที่ต้องการผลิต
            </label>
            <div class="flex items-center gap-1.5 p-1 bg-[#F5F4F0] rounded-xl text-xs font-semibold">
              <button
                type="button"
                @click="setProduceUnitMode('batch')"
                :class="[
                  'flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5',
                  produceUnitMode === 'batch'
                    ? 'bg-amber-900 text-white shadow-xs font-bold'
                    : 'text-stone-600 hover:text-stone-900'
                ]"
              >
                <span>🥣 นับเป็นรอบการผลิต (1 รอบ = {{ formulaYield }} {{ currentMat?.unit }})</span>
              </button>
              <button
                type="button"
                @click="setProduceUnitMode('base')"
                :class="[
                  'flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5',
                  produceUnitMode === 'base'
                    ? 'bg-white text-stone-900 shadow-xs font-bold'
                    : 'text-stone-500 hover:text-stone-900'
                ]"
              >
                <span>⚖️ ระบุน้ำหนักผลผลิต ({{ currentMat?.unit }})</span>
              </button>
            </div>
          </div>

          <!-- Yield Output Input -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium text-stone-700 mb-1.5">
                {{ produceUnitMode === 'batch' ? 'จำนวนรอบการผลิต (Batch)' : `ปริมาณผลผลิตที่ได้ (${currentMat?.unit})` }} <span class="text-rose-500">*</span>
              </label>
              <div class="flex items-center gap-2">
                <input
                  v-if="produceUnitMode === 'batch'"
                  v-model.number="produceBatchCount"
                  @input="onBatchCountInput"
                  type="number"
                  min="0.1"
                  step="any"
                  placeholder="1"
                  class="soft-input w-full px-3.5 py-2.5 rounded-xl text-xs font-number font-bold text-amber-950"
                />
                <input
                  v-else
                  v-model.number="produceYieldQty"
                  @input="onYieldQtyInput"
                  type="number"
                  min="1"
                  step="any"
                  placeholder="1200"
                  class="soft-input w-full px-3.5 py-2.5 rounded-xl text-xs font-number font-bold text-amber-950"
                />
                <span class="text-stone-500 text-xs shrink-0 font-medium w-16">
                  {{ produceUnitMode === 'batch' ? 'รอบ' : currentMat?.unit }}
                </span>
              </div>
            </div>

            <div class="flex flex-col justify-center px-4 py-2 rounded-xl bg-[#FAF9F6]">
              <span class="text-[11px] text-stone-500">ผลผลิตที่จะเพิ่มเข้าคลัง:</span>
              <span class="font-number font-bold text-emerald-800 text-sm">
                +{{ produceYieldQty.toLocaleString() }} {{ currentMat?.unit }}
                <span v-if="currentMat?.packSize > 1" class="text-xs font-normal text-stone-500">
                  (≈ {{ (produceYieldQty / currentMat.packSize).toFixed(1) }} {{ currentMat.packUnit }})
                </span>
              </span>
            </div>
          </div>

          <!-- Sub-ingredients to consume (Strict Recipe Table) -->
          <div class="space-y-2.5 pt-2 border-t border-stone-100">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium text-stone-800 flex items-center gap-1.5">
                <span>🥛</span>
                <span>วัตถุดิบรองที่จะถูกหักจากสต็อก (คำนวณตามสัดส่วนอัตโนมัติ)</span>
              </span>
              <span class="text-[10px] text-stone-400">สัดส่วน {{ (produceYieldQty / formulaYield).toFixed(2) }}x</span>
            </div>

            <!-- Recipe Ingredient Rows -->
            <div class="space-y-2">
              <div
                v-for="row in scaledSubIngredients"
                :key="row.materialId"
                class="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-[#FAF9F6] border border-stone-200/50"
              >
                <div class="flex items-center gap-2">
                  <span class="text-base">{{ store.matMap[row.materialId]?.emoji }}</span>
                  <div>
                    <span class="font-medium text-stone-900 block text-xs">
                      {{ store.matMap[row.materialId]?.name }}
                    </span>
                    <span class="text-[10px] text-stone-500">
                      คงเหลือในคลัง: {{ (store.matMap[row.materialId]?.stock || 0).toLocaleString() }} {{ store.matMap[row.materialId]?.unit }}
                      <span v-if="store.matMap[row.materialId]?.packSize > 1">
                        (≈ {{ ((store.matMap[row.materialId]?.stock || 0) / store.matMap[row.materialId].packSize).toFixed(1) }} {{ store.matMap[row.materialId].packUnit }})
                      </span>
                    </span>
                  </div>
                </div>

                <div class="flex items-center gap-3 text-right">
                  <div>
                    <span class="font-number font-bold text-rose-700 block text-xs">
                      -{{ row.qty.toLocaleString() }} {{ store.matMap[row.materialId]?.unit }}
                    </span>
                    <span v-if="store.matMap[row.materialId]?.packSize > 1" class="text-[10px] text-stone-400 font-number">
                      (≈ {{ (row.qty / store.matMap[row.materialId].packSize).toFixed(2) }} {{ store.matMap[row.materialId].packUnit }})
                    </span>
                  </div>

                  <span
                    class="text-[10px] font-semibold px-2 py-0.5 rounded-md shrink-0"
                    :class="row.isSufficient ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'"
                  >
                    {{ row.isSufficient ? '✓ พอ' : '⚠️ ไม่พอ' }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Cost & Balance Summary Card -->
          <div class="p-3.5 rounded-xl bg-[#FAF9F6] text-xs space-y-2">
            <div class="flex items-center justify-between font-mono">
              <span class="text-stone-500">
                รวมต้นทุนวัตถุดิบรอง: <strong class="text-stone-800">฿{{ totalProduceCost.toFixed(2) }}</strong>
              </span>
              <span class="text-stone-500">
                ต้นทุนเฉลี่ย: <strong class="text-emerald-800 font-number text-sm">฿{{ produceYieldQty > 0 ? (totalProduceCost / produceYieldQty).toFixed(4) : '0.00' }}/{{ currentMat?.unit }}</strong>
              </span>
            </div>

            <!-- Forecast after confirmation -->
            <div class="pt-2 border-t border-stone-200/60 flex flex-col gap-1 text-[11px]">
              <div class="flex items-center justify-between text-emerald-800 font-medium">
                <span>📈 {{ currentMat?.name }} เพิ่มเข้าคลัง:</span>
                <span class="font-number font-bold">+{{ produceYieldQty.toLocaleString() }} {{ currentMat?.unit }}</span>
              </div>
              <div
                v-for="sub in scaledSubIngredients"
                :key="sub.materialId"
                class="flex items-center justify-between text-rose-700"
              >
                <span>📉 หักออกจากสต็อก: {{ store.matMap[sub.materialId]?.name }}</span>
                <span class="font-number font-bold">
                  -{{ sub.qty.toLocaleString() }} {{ store.matMap[sub.materialId]?.unit }}
                  <span class="text-[10px] text-stone-400 font-normal">
                    (เหลือ {{ Math.max(0, (store.matMap[sub.materialId]?.stock || 0) - sub.qty).toLocaleString() }} {{ store.matMap[sub.materialId]?.unit }})
                  </span>
                </span>
              </div>
            </div>
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
          :disabled="isProducedFromRecipe && (!canProduce || produceYieldQty <= 0)"
          class="px-6 py-2.5 text-xs font-semibold bg-stone-900 hover:bg-stone-800 text-white rounded-xl shadow-xs disabled:opacity-50 transition-all flex items-center gap-2"
        >
          <Check class="w-4 h-4" />
          <span>{{ isProducedFromRecipe ? 'ยืนยันผลิต & หักสต็อกวัตถุดิบรอง' : 'บันทึกรับเข้าสต็อก' }}</span>
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

// Direct restock state
const directUnitMode = ref('pack') // 'pack' | 'base'
const directPackQty = ref(1)
const directBaseQty = ref(1200)
const directPackCost = ref(54)
const directUnitCost = ref(0.045)
const directNote = ref('')

// Produce from sub-recipe state
const produceUnitMode = ref('batch') // 'batch' | 'base'
const produceBatchCount = ref(1)
const produceYieldQty = ref(1200)
const produceNote = ref('')

const currentMat = computed(() => {
  return store.matMap[selectedMatId.value]
})

// Strictly determine if this material is produced from sub-ingredients
const isProducedFromRecipe = computed(() => {
  return Boolean(currentMat.value && currentMat.value.hasSubRecipe && currentMat.value.subRecipe && currentMat.value.subRecipe.length > 0)
})

// Standard formula yield
const formulaYield = computed(() => {
  return Number(currentMat.value?.yieldQty) || 1200
})

const activeDirectUnitLabel = computed(() => {
  if (directUnitMode.value === 'pack' && currentMat.value?.packUnit) {
    return currentMat.value.packUnit
  }
  return currentMat.value?.unit || 'หน่วย'
})

const totalDirectCost = computed(() => {
  if (directUnitMode.value === 'pack') {
    return (Number(directPackQty.value) || 0) * (Number(directPackCost.value) || 0)
  }
  return (Number(directBaseQty.value) || 0) * (Number(directUnitCost.value) || 0)
})

function setDirectUnitMode(mode) {
  directUnitMode.value = mode
}

function onDirectPackQtyInput() {
  const packSize = currentMat.value?.packSize > 0 ? currentMat.value.packSize : 1
  directBaseQty.value = Math.round((Number(directPackQty.value) || 0) * packSize * 100) / 100
}

function onDirectBaseQtyInput() {
  const packSize = currentMat.value?.packSize > 0 ? currentMat.value.packSize : 1
  directPackQty.value = Number(((Number(directBaseQty.value) || 0) / packSize).toFixed(2))
}

function onDirectPackCostInput() {
  const packSize = currentMat.value?.packSize > 0 ? currentMat.value.packSize : 1
  directUnitCost.value = Number(((Number(directPackCost.value) || 0) / packSize).toFixed(4))
}

function onDirectUnitCostInput() {
  const packSize = currentMat.value?.packSize > 0 ? currentMat.value.packSize : 1
  directPackCost.value = Number(((Number(directUnitCost.value) || 0) * packSize).toFixed(2))
}

function setProduceUnitMode(mode) {
  produceUnitMode.value = mode
  if (mode === 'batch') {
    produceBatchCount.value = Math.round((produceYieldQty.value / formulaYield.value) * 100) / 100
  }
}

function onBatchCountInput() {
  produceYieldQty.value = Math.round((Number(produceBatchCount.value) || 1) * formulaYield.value)
}

function onYieldQtyInput() {
  produceBatchCount.value = Number(((Number(produceYieldQty.value) || formulaYield.value) / formulaYield.value).toFixed(2))
}

// Calculate scaled sub-ingredients required based on current produceYieldQty
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
  const uCost = Number(mat.unitCost) || 0
  const pCost = Number(mat.packCost) || (uCost * pSize)

  // Direct purchase defaults
  if (mat.packUnit && mat.packSize > 1) {
    directUnitMode.value = 'pack'
    directPackQty.value = 1
    directBaseQty.value = pSize
  } else {
    directUnitMode.value = 'base'
    directBaseQty.value = mat.unit === 'g' || mat.unit === 'ml' ? 1000 : 10
    directPackQty.value = Number((directBaseQty.value / pSize).toFixed(2))
  }

  directPackCost.value = pCost
  directUnitCost.value = uCost
  directNote.value = ''

  // Produce defaults
  produceUnitMode.value = 'batch'
  produceBatchCount.value = 1
  produceYieldQty.value = mat.yieldQty || 1200
  produceNote.value = ''
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

  // Case 1: Produced from sub-ingredients (Mandatory deduction)
  if (isProducedFromRecipe.value) {
    if (!produceYieldQty.value || produceYieldQty.value <= 0) {
      store.showToast('กรุณาระบุปริมาณผลผลิตที่ได้มากกว่า 0', 'error')
      return
    }

    if (!canProduce.value) {
      store.showToast('วัตถุดิบรองไม่พอในสต็อก กรุณาเติมสต็อกวัตถุดิบรองก่อนผลิต', 'error')
      return
    }

    const success = store.batchProduce(
      mat.id,
      produceYieldQty.value,
      scaledSubIngredients.value,
      produceNote.value
    )
    if (success) {
      close()
    }
    return
  }

  // Case 2: Direct Restock
  if (!directBaseQty.value || directBaseQty.value <= 0) {
    store.showToast('กรุณาระบุจำนวนที่รับเข้ามากกว่า 0', 'error')
    return
  }

  store.stockIn(
    mat.id,
    directBaseQty.value,
    directUnitCost.value,
    directNote.value,
    directPackCost.value
  )
  close()
}
</script>
