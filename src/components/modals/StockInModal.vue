<template>
 <DialogFrame :busy="!!actionPending" :open="store.modals.stockIn.isOpen" id="StockInModal" :title="isProducedFromRecipe?'ผลิตตามสูตร':'รับเข้าสต็อก'" :description="isProducedFromRecipe?'ระบุจำนวนผลิต ตรวจส่วนผสม และวันที่ของล็อต':'ระบุจำนวน ต้นทุน และวันที่ของล็อตที่รับเข้า'" :teleport="false" width="680px" compact @request-close="requestClose(close)">
  <div class="stock-receipt-form" :class="{'is-production':isProducedFromRecipe}">
   <section class="receipt-material">
    <div class="receipt-heading"><label>วัตถุดิบ</label><IconButton v-if="selectedMatId" label="ดูประวัติการรับเข้า/ผลิต" @click="store.openActivityLog('stock',selectedMatId)"><History :size="16"/></IconButton></div>
    <p v-if="!store.activeMaterials.length" class="receipt-hint">ยังไม่มีรายการวัตถุดิบในระบบ กรุณาเพิ่มวัตถุดิบในหน้าคลังก่อน</p>
    <AppSelect v-else v-model="selectedMatId" aria-label="เลือกวัตถุดิบ" class="receipt-material-select"><optgroup v-for="kind in store.materialKindOptions" :key="kind.id" :label="kind.label"><option v-for="m in store.activeMaterials.filter(item=>store.getMaterialKind(item)===kind.id)" :key="m.id" :value="m.id">{{ m.emoji }} {{ m.name }}</option></optgroup></AppSelect>
   </section>

   <section class="receipt-amount-grid" :class="{'is-production':isProducedFromRecipe}">
    <div class="receipt-quantity">
     <div class="receipt-heading"><label>{{ isProducedFromRecipe?'จำนวนที่ต้องการผลิต':'จำนวนที่รับเข้า' }}</label>
      <div v-if="isProducedFromRecipe" class="receipt-unit-toggle" aria-label="หน่วยผลิต"><Button size="compact" :variant="produceUnitMode==='batch'?'primary':'secondary'" :aria-pressed="produceUnitMode==='batch'" @click="produceUnitMode='batch'">รอบ (Batch)</Button><Button size="compact" :variant="produceUnitMode==='base'?'primary':'secondary'" :aria-pressed="produceUnitMode==='base'" @click="produceUnitMode='base'">{{ currentMat?.unit }}</Button></div>
      <div v-else-if="currentMat?.packUnit&&currentMat?.packSize>1" class="receipt-unit-toggle" aria-label="หน่วยรับเข้า"><Button size="compact" :variant="unitMode==='pack'?'primary':'secondary'" :aria-pressed="unitMode==='pack'" @click="unitMode='pack'">{{ currentMat.packUnit }}</Button><Button size="compact" :variant="unitMode==='base'?'primary':'secondary'" :aria-pressed="unitMode==='base'" @click="unitMode='base'">{{ currentMat.unit }}</Button></div>
     </div>
     <div class="receipt-stepper" v-if="isProducedFromRecipe">
      <IconButton label="ลด 1 รอบ" :disabled="produceUnitMode==='batch'?produceBatchCount<=1:produceYieldQty<=formulaYield" @click="stepProduceQty(-1)"><Minus :size="16"/></IconButton>
      <AppInput v-if="produceUnitMode==='batch'" v-model.number="produceBatchCount" aria-label="จำนวนรอบผลิต" type="number" min="0.1" step="any" :aria-invalid="Boolean(formError)||undefined" :aria-describedby="formError?'StockInModal-error':undefined" @update:model-value="syncProduceFromBatch"><template #suffix>รอบ</template></AppInput>
      <AppInput v-else v-model.number="produceYieldQty" aria-label="จำนวนที่ต้องการผลิต" type="number" min="1" step="any" :aria-invalid="Boolean(formError)||undefined" :aria-describedby="formError?'StockInModal-error':undefined" @update:model-value="syncProduceFromYield"><template #suffix>{{ currentMat?.unit }}</template></AppInput>
      <IconButton label="เพิ่ม 1 รอบ" @click="stepProduceQty(1)"><Plus :size="16"/></IconButton>
     </div>
     <div class="receipt-stepper" v-else>
      <IconButton label="ลด 1" :disabled="unitMode==='pack'?inputPackQty<=1:inputBaseQty<=(currentMat?.packSize||1)" @click="stepDirectQty(-1)"><Minus :size="16"/></IconButton>
      <AppInput v-if="unitMode==='pack'" v-model.number="inputPackQty" aria-label="จำนวนแพ็คที่รับเข้า" type="number" min="0.1" step="any" :aria-invalid="Boolean(formError)||undefined" :aria-describedby="formError?'StockInModal-error':undefined" @update:model-value="syncFromPackQty"><template #suffix>{{ currentMat?.packUnit }}</template></AppInput>
      <AppInput v-else v-model.number="inputBaseQty" aria-label="จำนวนหน่วยที่รับเข้า" type="number" min="0.1" step="any" :aria-invalid="Boolean(formError)||undefined" :aria-describedby="formError?'StockInModal-error':undefined" @update:model-value="syncFromBaseQty"><template #suffix>{{ currentMat?.unit }}</template></AppInput>
      <IconButton label="เพิ่ม 1" @click="stepDirectQty(1)"><Plus :size="16"/></IconButton>
     </div>
     <p class="receipt-hint" v-if="isProducedFromRecipe">ผลผลิตที่จะได้ <strong>+{{ produceYieldQty.toLocaleString() }} {{ currentMat?.unit }}</strong><template v-if="currentMat?.packSize>1"> ≈ {{ (produceYieldQty/currentMat.packSize).toFixed(1) }} {{ currentMat.packUnit }}</template></p>
     <p class="receipt-hint" v-else-if="currentMat?.packSize>1"><template v-if="unitMode==='pack'">= {{ inputBaseQty.toLocaleString() }} {{ currentMat.unit }} · 1 {{ currentMat.packUnit }} = {{ currentMat.packSize }} {{ currentMat.unit }}</template><template v-else>= {{ inputPackQty }} {{ currentMat.packUnit }}</template></p>
    </div>
    <div v-if="!isProducedFromRecipe" class="receipt-price"><div class="receipt-heading"><label>ราคาซื้อ / {{ currentMat?.packUnit||currentMat?.unit }}</label></div><AppInput v-model.number="inputPackCost" aria-label="ราคาซื้อ" type="number" step="any"><template #prefix>฿</template></AppInput></div>
    <div v-if="!isProducedFromRecipe" class="receipt-total"><span>รวมงบซื้อรอบนี้</span><strong>฿{{ calculatedDirectTotal.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}) }}</strong></div>
   </section>

   <section v-if="isProducedFromRecipe" class="receipt-recipe">
    <div class="receipt-recipe-heading"><h4>ส่วนผสมที่จะถูกหัก</h4><span>สัดส่วน {{ (produceYieldQty/formulaYield).toFixed(2) }}x</span></div>
    <div v-for="sub in scaledSubIngredients" :key="sub.materialId" class="receipt-recipe-row"><span class="receipt-ingredient">{{ store.matMap[sub.materialId]?.emoji }} {{ store.matMap[sub.materialId]?.name }}</span><div class="receipt-consumption"><strong>-{{ sub.qty.toLocaleString() }} {{ store.matMap[sub.materialId]?.unit }}</strong><StatusBadge v-if="store.checkLotDepletion(sub.materialId,sub.qty).willDeplete" label="ล็อตหมด" tone="error"/><StatusBadge v-else-if="store.checkLotDepletion(sub.materialId,sub.qty).isLow" label="ใกล้หมด" tone="warning"/><StatusBadge :label="sub.isSufficient?'พอ':'ไม่พอ'" :tone="sub.isSufficient?'success':'error'"/></div></div>
    <div class="receipt-total receipt-production-cost"><span>ต้นทุนรอบนี้</span><div><strong>฿{{ totalProduceCost.toFixed(2) }}</strong><small>฿{{ produceYieldQty>0?(totalProduceCost/produceYieldQty).toFixed(4):0 }} / {{ currentMat?.unit }}</small></div></div>
   </section>

   <section class="receipt-lot">
    <div v-if="trackingMode==='expiry_and_receive'" class="receipt-date-grid">
     <div class="receipt-date-field"><label>{{ isProducedFromRecipe?'วันที่ผลิต':'วันที่รับเข้า' }}</label><AppInput v-model="receiveDate" :aria-label="isProducedFromRecipe?'วันผลิต':'วันที่รับเข้า'" type="date" required :aria-invalid="Boolean(formError)||undefined" :aria-describedby="formError?'StockInModal-error':undefined"/></div>
     <div class="receipt-date-field"><label>วันหมดอายุ</label><AppInput v-model="expiryDate" aria-label="วันหมดอายุ" type="date"><template v-if="expiryDate" #suffix><IconButton label="ล้างวันหมดอายุ (ไม่ระบุวันหมดอายุ)" class="receipt-clear-date" @click="expiryDate=''"><X :size="14"/></IconButton></template></AppInput><Button v-if="currentMat?.shelfLifeDays&&expiryDate!==addDays(receiveDate,currentMat.shelfLifeDays)" variant="quiet" size="compact" class="receipt-auto-date" title="คำนวณวันหมดอายุอัตโนมัติตามอายุเก็บรักษา" @click="expiryDate=addDays(receiveDate,currentMat.shelfLifeDays)">คำนวณ +{{ currentMat.shelfLifeDays }} วัน</Button></div>
    </div>
    <p v-else class="receipt-lot-hint"><Package :size="16" aria-hidden="true"/><span>สินค้าไม่คุมวันหมดอายุ · บวกเข้าสต็อกรวม ไม่แยกล็อต</span></p>
    <div v-if="currentMat&&lotPreview&&trackingMode!=='none'" class="receipt-lot-hint"><Layers :size="16" aria-hidden="true"/><span><strong>{{ lotPreview.shortLabel }}</strong> · {{ lotPreview.label }}</span></div>
   </section>
   <div class="receipt-note"><label>หมายเหตุ <span>(ถ้ามี)</span></label><AppInput v-model="note" aria-label="หมายเหตุ" :placeholder="isProducedFromRecipe?'เช่น หมักนมสด Meiji + หัวเชื้อ 16 ชม.':'เช่น ซื้อจากแม็คโคร, ล็อต 25/10'"/></div>
   <p v-if="formError" id="StockInModal-error" role="alert" class="stock-form-error">{{ formError }}</p>
  </div>
  <template #footer><div class="receipt-footer"><Button variant="quiet" :disabled="!!actionPending" @click="requestClose(close)">ยกเลิก</Button><Button :disabled="isProducedFromRecipe&&(!canProduce||produceYieldQty<=0)" :loading="!!actionPending" @click="submit"><Check :size="16"/><span>{{ isProducedFromRecipe?'บันทึกการผลิต':'บันทึกรับเข้าสต็อก' }}</span></Button></div></template>
 </DialogFrame>
</template>
<script setup>
import AppInput from '@/components/ui/AppInput.vue'
import Button from '@/components/ui/Button.vue'
import IconButton from '@/components/ui/IconButton.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import {validateLotDates} from '@/domain/lotDates'
import AppSelect from '@/components/ui/AppSelect.vue'
import DialogFrame from '@/components/ui/DialogFrame.vue'
import { ref, computed, watch, nextTick } from 'vue'
import { getTodayString, addDays, formatThaiDate } from '@/stores/posStore'
import { useInventoryStore } from '@/composables/useInventoryStore'
import { useModalForm } from '@/composables/useModalForm'
import { Check, Plus, Minus, History, X, Package, Layers } from 'lucide-vue-next'

import {useActionPending} from '@/composables/useActionPending'
const {pending:actionPending,run:runAction}=useActionPending()
const store = useInventoryStore()

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

const submit=()=>runAction('stage',performStage)
async function performStage() {
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



<style scoped src="@/components/inventory/stockReceipt.css"></style>
