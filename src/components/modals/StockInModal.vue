<template>
 <DialogFrame :open="store.modals.stockIn.isOpen" id="StockInModal" :title="isProducedFromRecipe?'ผลิตตามสูตร':'รับเข้าสต็อก'" description="ระบุจำนวน ราคา และวันที่ของล็อตใหม่" :teleport="false" width="720px" @request-close="requestClose(close)">

 <div class="stock-form">
        <!-- 1. Select Material -->
        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="block text-[11px] font-medium text-stone-600">เลือกวัตถุดิบ</label>
            <Button variant="quiet"
              v-if="selectedMatId"
              type="button"
              @click="store.openActivityLog('stock', selectedMatId)"
              class="inline-flex items-center gap-1 text-[11px] font-medium text-sky-700 hover:text-sky-900 hover:underline cursor-pointer"
              title="ดูประวัติการรับเข้าและผลิตของวัตถุดิบนี้"
            >
              <History class="w-3.5 h-3.5" />
              <span>ดูประวัติการรับเข้า/ผลิต</span>
            </Button>
          </div>
          <div v-if="store.activeMaterials.length === 0" class="p-4 text-center text-stone-400 bg-[#FBF5EA] rounded-xl border border-stone-100">
            ยังไม่มีรายการวัตถุดิบในระบบ กรุณาเพิ่มวัตถุดิบในหน้าคลังก่อน
          </div>
          <AppSelect aria-label="เลือกวัตถุดิบ"
            v-else
            v-model="selectedMatId"
            class="w-full"
          >
            <optgroup v-for="kind in store.materialKindOptions" :key="kind.id" :label="kind.label">
              <option v-for="m in store.activeMaterials.filter(item => store.getMaterialKind(item) === kind.id)" :key="m.id" :value="m.id">{{ m.emoji }} {{ m.name }}</option>
            </optgroup>
          </AppSelect>
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
                <Button :variant="unitMode==='pack'?'primary':'secondary'" :aria-pressed="unitMode==='pack'"
                  type="button"
                  @click="unitMode = 'pack'"
                  :class="[
                    'px-2 py-0.5 rounded transition-all',
                    unitMode === 'pack' ? 'bg-white text-stone-900 shadow-2xs font-bold' : 'text-stone-500 hover:text-stone-900'
                  ]"
                >
                  {{ currentMat.packUnit }}
                </Button>
                <Button :variant="unitMode==='base'?'primary':'secondary'" :aria-pressed="unitMode==='base'"
                  type="button"
                  @click="unitMode = 'base'"
                  :class="[
                    'px-2 py-0.5 rounded transition-all',
                    unitMode === 'base' ? 'bg-white text-stone-900 shadow-2xs font-bold' : 'text-stone-500 hover:text-stone-900'
                  ]"
                >
                  {{ currentMat.unit }}
                </Button>
              </div>
            </div>

            <div class="flex items-center gap-1.5">
              <Button variant="quiet"
                type="button"
                @click="stepDirectQty(-1)"
                :disabled="unitMode === 'pack' ? inputPackQty <= 1 : inputBaseQty <= (currentMat?.packSize || 1)"
                class="w-9 h-9 rounded-xl bg-stone-100 hover:bg-stone-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-stone-700 transition-colors cursor-pointer shrink-0"
                title="ลด 1"
              >
                <Minus class="w-3.5 h-3.5" />
              </Button>

              <div class="relative flex-1">
                <AppInput aria-label="จำนวนแพ็คที่รับเข้า" :aria-invalid="Boolean(formError)||undefined" :aria-describedby="formError?'StockInModal-error':undefined"
                  v-if="unitMode === 'pack'"
                  v-model.number="inputPackQty"
                  @update:model-value="syncFromPackQty"
                  type="number"
                  min="0.1"
                  step="any"
                  placeholder="0"
                  class="soft-input w-full px-3 py-2 rounded-xl text-center text-xs font-number font-bold text-stone-900" />
                <AppInput aria-label="จำนวนหน่วยที่รับเข้า" :aria-invalid="Boolean(formError)||undefined" :aria-describedby="formError?'StockInModal-error':undefined"
                  v-else
                  v-model.number="inputBaseQty"
                  @update:model-value="syncFromBaseQty"
                  type="number"
                  min="0.1"
                  step="any"
                  placeholder="0"
                  class="soft-input w-full px-3 py-2 rounded-xl text-center text-xs font-number font-bold text-stone-900" />
              </div>

              <Button variant="quiet"
                type="button"
                @click="stepDirectQty(1)"
                class="w-9 h-9 rounded-xl bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-700 transition-colors cursor-pointer shrink-0"
                title="เพิ่ม 1"
              >
                <Plus class="w-3.5 h-3.5" />
              </Button>

              <span class="text-stone-500 font-medium shrink-0 w-12 text-center text-xs">
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
          <div class="grid grid-cols-2 gap-3 items-center p-3 rounded-xl bg-[#FBF5EA] border border-stone-200/50">
            <div>
              <label class="block text-[10px] text-stone-500 mb-0.5">ราคาซื้อ (฿ / {{ currentMat?.packUnit || currentMat?.unit }})</label>
              <AppInput aria-label="ราคาซื้อ"
                v-model.number="inputPackCost"
                type="number"
                step="any"
                class="w-full bg-white px-2.5 py-1 rounded-lg border border-stone-200 text-xs font-number font-semibold text-stone-900 focus:outline-none" />
            </div>
            <div class="text-right">
              <span class="block text-[10px] text-stone-400 mb-0.5">รวมงบซื้อรอบนี้</span>
              <span class="font-number font-bold text-amber-950 text-sm">
                ฿{{ calculatedDirectTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
              </span>
            </div>
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
                <Button :variant="produceUnitMode==='batch'?'primary':'secondary'" :aria-pressed="produceUnitMode==='batch'"
                  type="button"
                  @click="produceUnitMode = 'batch'"
                  :class="[
                    'px-2 py-0.5 rounded transition-all',
                    produceUnitMode === 'batch' ? 'bg-white text-stone-900 shadow-2xs font-bold' : 'text-stone-500 hover:text-stone-900'
                  ]"
                >
                  รอบ (Batch)
                </Button>
                <Button :variant="produceUnitMode==='base'?'primary':'secondary'" :aria-pressed="produceUnitMode==='base'"
                  type="button"
                  @click="produceUnitMode = 'base'"
                  :class="[
                    'px-2 py-0.5 rounded transition-all',
                    produceUnitMode === 'base' ? 'bg-white text-stone-900 shadow-2xs font-bold' : 'text-stone-500 hover:text-stone-900'
                  ]"
                >
                  {{ currentMat?.unit }}
                </Button>
              </div>
            </div>

            <div class="flex items-center gap-1.5">
              <Button variant="quiet"
                type="button"
                @click="stepProduceQty(-1)"
                :disabled="produceUnitMode === 'batch' ? produceBatchCount <= 1 : produceYieldQty <= formulaYield"
                class="w-9 h-9 rounded-xl bg-stone-100 hover:bg-stone-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-stone-700 transition-colors cursor-pointer shrink-0"
                title="ลด 1 รอบ"
              >
                <Minus class="w-3.5 h-3.5" />
              </Button>

              <div class="relative flex-1">
                <AppInput aria-label="จำนวนรอบผลิต" :aria-invalid="Boolean(formError)||undefined" :aria-describedby="formError?'StockInModal-error':undefined"
                  v-if="produceUnitMode === 'batch'"
                  v-model.number="produceBatchCount"
                  @update:model-value="syncProduceFromBatch"
                  type="number"
                  min="0.1"
                  step="any"
                  class="soft-input w-full px-3 py-2 rounded-xl text-center text-xs font-number font-bold text-amber-950" />
                <AppInput aria-label="จำนวนที่ต้องการผลิต"
                  v-else
                  v-model.number="produceYieldQty"
                  @update:model-value="syncProduceFromYield"
                  type="number"
                  min="1"
                  step="any"
                  class="soft-input w-full px-3 py-2 rounded-xl text-center text-xs font-number font-bold text-amber-950" />
              </div>

              <Button variant="quiet"
                type="button"
                @click="stepProduceQty(1)"
                class="w-9 h-9 rounded-xl bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-700 transition-colors cursor-pointer shrink-0"
                title="เพิ่ม 1 รอบ"
              >
                <Plus class="w-3.5 h-3.5" />
              </Button>

              <span class="text-stone-500 font-medium shrink-0 w-12 text-center text-xs">
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
          <div class="space-y-1.5 p-3 rounded-xl bg-[#FBF5EA] border border-stone-200/50">
            <div class="flex items-center justify-between text-[11px] font-medium text-stone-700 mb-1">
              <span>ส่วนผสมที่จะถูกหัก:</span>
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
                  v-if="store.checkLotDepletion(sub.materialId, sub.qty).willDeplete"
                  class="text-[9px] px-1.5 py-0.5 rounded font-sans font-bold bg-rose-100 text-rose-800"
                  title="สต็อกในล็อตปัจจุบันจะหมดลง"
                >
                  ล็อตหมด
                </span>
                <span
                  v-else-if="store.checkLotDepletion(sub.materialId, sub.qty).isLow"
                  class="text-[9px] px-1.5 py-0.5 rounded font-sans font-bold bg-amber-100 text-amber-800"
                  title="สต็อกในล็อตปัจจุบันใกล้หมด"
                >
                  ล็อตใกล้หมด
                </span>
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
        </div>

        <!-- วันที่รับเข้า/ผลิต & วันหมดอายุ ปรับตาม trackingMode ของหมวดหมู่ -->
        <div v-if="trackingMode === 'expiry_and_receive'" class="space-y-2">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-[11px] font-medium text-stone-600 mb-1">
                {{ isProducedFromRecipe ? 'วันที่ผลิต' : 'วันที่รับเข้า' }}
              </label>
              <AppInput :aria-label="isProducedFromRecipe ? 'วันผลิต' : 'วันที่รับเข้า'" required :aria-invalid="Boolean(formError)||undefined" :aria-describedby="formError?'StockInModal-error':undefined"
                v-model="receiveDate"
                type="date"
                class="soft-input w-full px-2.5 py-1.5 rounded-xl text-xs font-number font-medium text-stone-900 bg-white" />
            </div>
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="text-[11px] font-medium text-stone-600">วันหมดอายุ</label>
                <div class="flex items-center gap-1.5 text-[10px]">
                  <Button variant="quiet"
                    v-if="currentMat?.shelfLifeDays && expiryDate !== addDays(receiveDate, currentMat.shelfLifeDays)"
                    type="button"
                    @click="expiryDate = addDays(receiveDate, currentMat.shelfLifeDays)"
                    class="text-sky-600 hover:text-sky-800 transition-colors cursor-pointer"
                    title="คำนวณวันหมดอายุอัตโนมัติตามอายุเก็บรักษา"
                  >
                    +{{ currentMat.shelfLifeDays }}วัน
                  </Button>
                  <Button variant="quiet"
                    v-if="expiryDate"
                    type="button"
                    @click="expiryDate = ''"
                    class="text-stone-400 hover:text-rose-600 transition-colors cursor-pointer"
                    title="ล้างวันหมดอายุ (ไม่ระบุวันหมดอายุ)"
                  >
                    ล้าง
                  </Button>
                </div>
              </div>
              <AppInput aria-label="วันหมดอายุ"
                v-model="expiryDate"
                type="date"
                class="soft-input w-full px-2.5 py-1.5 rounded-xl text-xs font-number font-medium text-stone-900 bg-white" />
            </div>
          </div>
        </div>

        <!-- สินค้าไม่คุมวันหมดอายุ (บรรจุภัณฑ์ / แก้ว / ช้อน) -->
        <div v-else class="flex items-center gap-2.5 p-3 rounded-xl bg-stone-50 border border-stone-200/60 text-stone-600">
          <span class="text-base shrink-0">📦</span>
          <div class="text-[11px] leading-tight">
            <span class="font-bold text-stone-800">สินค้าไม่คุมวันหมดอายุ</span>
            <p class="text-[10px] text-stone-400 mt-0.5">ระบบจะบวกทบยอดเข้าสต็อกรวมทันที ไม่แยกเป็นหลายล็อตย่อยให้สับสน</p>
          </div>
        </div>

        <!-- Smart Lot Action Preview Banner -->
        <div
          v-if="currentMat && lotPreview && trackingMode !== 'none'"
          class="flex items-center gap-2 px-3 py-2 rounded-xl border text-[11px] leading-tight transition-all"
          :class="lotPreview.badgeClass"
        >
          <span class="text-sm shrink-0">{{ lotPreview.icon }}</span>
          <div class="flex-1 min-w-0">
            <span class="font-bold">{{ lotPreview.shortLabel }}:</span>
            <span class="ml-1 opacity-90">{{ lotPreview.label }}</span>
          </div>
        </div>

        <!-- Note (Unified) -->
        <div>
          <label class="block text-[11px] font-medium text-stone-600 mb-1">หมายเหตุ (ถ้ามี)</label>
          <AppInput aria-label="หมายเหตุ"
            v-model="note"
            type="text"
            :placeholder="isProducedFromRecipe ? 'เช่น หมักนมสด Meiji + หัวเชื้อ 16 ชม.' : 'เช่น ซื้อจากแม็คโคร, ล็อต 25/10'"
            class="soft-input w-full px-3 py-1.5 rounded-xl text-xs text-stone-900 placeholder:text-stone-400" />
        </div>
      </div>
 <p v-if="formError" id="StockInModal-error" role="alert" class="stock-form-error">{{ formError }}</p>
 <template #footer><div class="stock-form-footer">
        <Button variant="quiet"
          type="button"
          @click="requestClose(close)"
        >
          ยกเลิก
        </Button>
        <Button variant="primary"
          type="button"
          @click="submit"
          :disabled="isProducedFromRecipe && (!canProduce || produceYieldQty <= 0)"
        >
          <Check class="w-3.5 h-3.5" />
          <span>{{ isProducedFromRecipe ? 'บันทึกการผลิต' : 'บันทึกรับเข้าสต็อก' }}</span>
        </Button>
      </div></template>
 </DialogFrame>
</template>

<script setup>
import AppInput from '@/components/ui/AppInput.vue'
import Button from '@/components/ui/Button.vue'
import {validateLotDates} from '@/domain/lotDates'
import AppSelect from '@/components/ui/AppSelect.vue'
import DialogFrame from '@/components/ui/DialogFrame.vue'
import { ref, computed, watch, nextTick } from 'vue'
import { usePosStore, getTodayString, addDays, formatThaiDate } from '@/stores/posStore'
import { useModalForm } from '@/composables/useModalForm'
import { Check, Plus, Minus, History } from 'lucide-vue-next'

const store = usePosStore()

const formError=ref('')
const selectedMatId = ref('')
const unitMode = ref('pack') // 'pack' | 'base'
const inputPackQty = ref(1)
const inputBaseQty = ref(1200)
const inputPackCost = ref(54)
const receiveDate = ref(getTodayString())
const expiryDate = ref('')
const note = ref('')

// Produce mode
const produceUnitMode = ref('batch') // 'batch' | 'base'
const produceBatchCount = ref(1)
const produceYieldQty = ref(1200)

const { saveSnapshot, requestClose } = useModalForm(() => ({
  selectedMatId: selectedMatId.value,
  unitMode: unitMode.value,
  inputPackQty: inputPackQty.value,
  inputBaseQty: inputBaseQty.value,
  inputPackCost: inputPackCost.value,
  receiveDate: receiveDate.value,
  expiryDate: expiryDate.value,
  note: note.value,
  produceUnitMode: produceUnitMode.value,
  produceBatchCount: produceBatchCount.value,
  produceYieldQty: produceYieldQty.value
}))

const currentMat = computed(() => {
  return store.matMap[selectedMatId.value]
})

const trackingMode = computed(() => {
  if (!currentMat.value) return 'none'
  return store.getMaterialTrackingMode(currentMat.value)
})

const lotPreview = computed(() => {
  if (!currentMat.value) return null
  return store.getLotActionPreview(currentMat.value, receiveDate.value, expiryDate.value)
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

function stepDirectQty(delta) {
  if (unitMode.value === 'pack') {
    const cur = Number(inputPackQty.value) || 0
    const next = Math.max(1, Math.round((cur + delta) * 10) / 10)
    inputPackQty.value = next
    syncFromPackQty()
  } else {
    const step = currentMat.value?.packSize > 1 ? Number(currentMat.value.packSize) : (currentMat.value?.unit === 'g' || currentMat.value?.unit === 'ml' ? 100 : 1)
    const cur = Number(inputBaseQty.value) || 0
    const next = Math.max(1, Math.round((cur + (delta * step)) * 100) / 100)
    inputBaseQty.value = next
    syncFromBaseQty()
  }
}

function stepProduceQty(delta) {
  if (produceUnitMode.value === 'batch') {
    const cur = Number(produceBatchCount.value) || 0
    const next = Math.max(1, Math.round((cur + delta) * 10) / 10)
    produceBatchCount.value = next
    syncProduceFromBatch()
  } else {
    const step = formulaYield.value || 100
    const cur = Number(produceYieldQty.value) || 0
    const next = Math.max(step, Math.round((cur + (delta * step)) * 100) / 100)
    produceYieldQty.value = next
    syncProduceFromYield()
  }
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
  formError.value=''
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

  receiveDate.value = mat.inventoryType === 'packaging' ? '' : getTodayString()
  expiryDate.value = ''
}

watch(() => store.modals.stockIn.isOpen, (open) => {
  if (open) {
    const id = store.modals.stockIn.materialId || (store.activeMaterials[0]?.id || '')
    selectedMatId.value = id
    initForMaterial(store.matMap[id])
    nextTick(() => {
      saveSnapshot()
    })
  }
})

watch(selectedMatId, (newId) => {
  initForMaterial(store.matMap[newId])
})

function close() {
  store.modals.stockIn.isOpen = false
  store.modals.stockIn.materialId = null
}

async function submit() {
  formError.value=''
  const mat = currentMat.value
  if (!mat) {
    store.showToast('กรุณาเลือกวัตถุดิบ', 'error')
    return
  }

  const dateValidation = validateLotDates(mat, {
    receiveDate: receiveDate.value || null,
    expiryDate: expiryDate.value || null
  }, isProducedFromRecipe.value ? 'produce' : 'receive')
  if (!dateValidation.ok) { formError.value = dateValidation.message; return }
  const datePayload = dateValidation.dates

  if (isProducedFromRecipe.value) {
    if (!produceYieldQty.value || produceYieldQty.value <= 0) {
      formError.value='กรุณาระบุปริมาณที่ต้องการผลิตให้มากกว่า 0'
      store.showToast(formError.value, 'error')
      return
    }
    if (!canProduce.value) {
      formError.value='ส่วนผสมไม่พอหรือไม่พบในระบบ ตรวจสอบสูตรและรับเข้าวัตถุดิบก่อนผลิต'
      store.showToast(formError.value, 'error')
      return
    }

    // Check if any sub-ingredient's active lot will run out or is near empty
    for (const item of scaledSubIngredients.value) {
      const check = store.checkLotDepletion(item.materialId, item.qty)
      if ((check.willDeplete || check.isShort || check.isLow) && check.nextLot) {
        const subMat = store.matMap[item.materialId]
        const willSwitch = await store.promptLotDepletion({
          material: subMat,
          currentLot: check.currentLot,
          nextLot: check.nextLot,
          neededQty: item.qty,
          availableInCurrent: check.availableInCurrent,
          remainingAfter: check.remainingAfter,
          shortageQty: check.shortageQty,
          willDeplete: check.willDeplete,
          isLow: check.isLow,
          actionContext: 'produce'
        })
        if (!willSwitch) {
          if (check.isShort) {
            store.showToast(`ยกเลิกการผลิต ${mat.name} (สต็อกล็อตเดิมไม่พอและไม่ต้องการเปลี่ยนไปใช้ล็อตใหม่)`, 'info')
            return
          }
          // If not short (lot has enough but is near empty), user chose to keep current lot
        } else {
          store.switchActiveLotSilently(item.materialId, check.nextLot.id)
        }
      }
    }

    const ok = store.batchProduce(mat.id, produceYieldQty.value, scaledSubIngredients.value, note.value, datePayload, true)
    if (ok?.ok || ok?.success) close()
    return
  }

  if (!inputBaseQty.value || inputBaseQty.value <= 0) {
    formError.value='กรุณาระบุจำนวนที่รับเข้าให้มากกว่า 0'
    store.showToast(formError.value, 'error')
    return
  }

  const pSize = mat.packSize > 0 ? mat.packSize : 1
  const unitCost = (Number(inputPackCost.value) || 0) / pSize
  const result = store.stockIn(mat.id, inputBaseQty.value, unitCost, note.value, inputPackCost.value, datePayload, true)
  if (result?.ok || result?.success) close()
}
</script>

<style scoped src="@/components/inventory/stockForms.css"></style>
