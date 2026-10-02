<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs"
    @click.self="close"
  >
    <div class="bg-white rounded-2xl border border-stone-200/80 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
      <!-- Modal Header -->
      <div class="flex items-center justify-between border-b border-stone-100 pb-3">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-xl">🥣</span>
            <h3 class="text-base font-semibold text-stone-900">ผลิตกรีกโยเกิร์ต (Batch Conversion)</h3>
          </div>
          <p class="text-[11px] text-stone-400 mt-0.5">
            ตัดสต็อกวัตถุดิบรอง (นมสด + หัวเชื้อ) และคำนวณต้นทุนเข้าสู่สต็อกกรีกโยเกิร์ตแท้
          </p>
        </div>
        <button @click="close" class="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg">
          <X class="w-4 h-4" />
        </button>
      </div>

      <div class="space-y-4 text-xs">
        <!-- Target Finished Material -->
        <div>
          <label class="block text-xs font-semibold text-stone-700 mb-1">
            วัตถุดิบหลักที่ผลิตได้ (Target Finished Product)
          </label>
          <select
            v-model="targetMatId"
            class="soft-input w-full px-3 py-2 rounded-xl text-xs font-semibold text-stone-900"
          >
            <option
              v-for="m in store.mainMaterials.filter(m => m.category === 'Base Yogurt' || m.id === 'MAT001')"
              :key="m.id"
              :value="m.id"
            >
              {{ m.emoji }} {{ m.name }} (คงเหลือปัจจุบัน: {{ m.stock }} {{ m.unit }})
            </option>
          </select>
        </div>

        <!-- Yield Produced -->
        <div>
          <label class="block text-xs font-semibold text-stone-700 mb-1">
            ปริมาณกรีกโยเกิร์ตที่ผลิตได้จริง (Yield Output) <span class="text-rose-500">*</span>
          </label>
          <div class="flex items-center gap-2">
            <input
              v-model.number="yieldQty"
              type="number"
              min="1"
              step="any"
              placeholder="เช่น 1500"
              class="soft-input flex-1 px-3 py-2 rounded-xl text-xs font-number font-bold text-stone-900"
            />
            <span class="text-xs text-stone-500 shrink-0 font-medium">กรัม (g)</span>
          </div>
        </div>

        <!-- Sub-ingredients to consume -->
        <div class="space-y-2 pt-2 border-t border-stone-100">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-purple-900 flex items-center gap-1.5">
              <span>🥛</span>
              <span>วัตถุดิบรองที่นำมาหมัก/แปรรูป (Sub-ingredients)</span>
            </span>
            <button
              type="button"
              @click="addSubRow"
              class="text-[11px] font-semibold text-purple-800 hover:text-purple-950 flex items-center gap-1"
            >
              <Plus class="w-3.5 h-3.5" />
              <span>เพิ่มวัตถุดิบรอง</span>
            </button>
          </div>

          <div
            v-for="(sub, idx) in subRows"
            :key="idx"
            class="flex items-center gap-2 p-2.5 bg-purple-50/40 rounded-xl border border-purple-100/70"
          >
            <select
              v-model="sub.materialId"
              class="soft-input flex-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-stone-800"
            >
              <option
                v-for="m in store.subMaterials"
                :key="m.id"
                :value="m.id"
              >
                {{ m.emoji }} {{ m.name }} (คงเหลือ: {{ m.stock }} {{ m.unit }})
              </option>
            </select>

            <div class="relative w-32 shrink-0">
              <input
                v-model.number="sub.qty"
                type="number"
                min="0.1"
                step="any"
                placeholder="ปริมาณ"
                class="soft-input w-full pl-2.5 pr-8 py-1.5 rounded-lg text-xs font-number font-bold text-stone-900"
              />
              <span class="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-stone-400">
                {{ store.matMap[sub.materialId]?.unit }}
              </span>
            </div>

            <button
              v-if="subRows.length > 1"
              type="button"
              @click="removeSubRow(idx)"
              class="p-1 text-stone-400 hover:text-rose-600 rounded transition-colors"
            >
              <X class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <!-- Cost Calculation Summary Box -->
        <div class="p-3.5 bg-stone-50 rounded-xl border border-stone-100 space-y-2">
          <div class="flex items-center justify-between text-xs">
            <span class="text-stone-500">ต้นทุนวัตถุดิบรองที่ใช้รอบนี้:</span>
            <span class="font-number font-bold text-stone-900">
              ฿{{ totalSubCost.toFixed(2) }}
            </span>
          </div>
          <div class="flex items-center justify-between text-xs">
            <span class="text-stone-500">ต้นทุนเฉลี่ยของกรีกโยเกิร์ตรอบนี้:</span>
            <span class="font-number font-bold text-emerald-800">
              ฿{{ yieldQty > 0 ? (totalSubCost / yieldQty).toFixed(4) : '0.00' }} / กรัม
            </span>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100">
        <button
          type="button"
          @click="close"
          class="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 rounded-xl hover:bg-stone-100 transition-colors"
        >
          ยกเลิก
        </button>
        <button
          type="button"
          @click="handleProduce"
          :disabled="yieldQty <= 0 || subRows.length === 0"
          class="px-5 py-2 text-xs font-semibold bg-amber-900 hover:bg-amber-950 text-white rounded-xl shadow-xs disabled:opacity-50 transition-all flex items-center gap-1.5"
        >
          <Check class="w-3.5 h-3.5" />
          <span>ยืนยันผลิต & ตัดสต็อกวัตถุดิบรอง</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { usePosStore } from '@/stores/posStore'
import { X, Check, Plus } from 'lucide-vue-next'

const props = defineProps({
  modelValue: { type: Boolean, default: false }
})
const emit = defineEmits(['update:modelValue'])

const store = usePosStore()

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const targetMatId = ref('MAT001')
const yieldQty = ref(1200)
const subRows = ref([])

function loadRecipeForTarget(matId) {
  const target = store.matMap[matId]
  if (target && target.hasSubRecipe && Array.isArray(target.subRecipe) && target.subRecipe.length > 0) {
    yieldQty.value = Number(target.yieldQty) || 1200
    subRows.value = target.subRecipe.map(r => ({ materialId: r.materialId, qty: r.qty }))
  } else {
    yieldQty.value = 1200
    const milk = store.subMaterials.find(m => m.id === 'MAT002' || m.name.includes('นม'))
    const starter = store.subMaterials.find(m => m.id === 'MAT003' || m.name.includes('หัวเชื้อ'))
    subRows.value = [
      { materialId: milk ? milk.id : (store.subMaterials[0]?.id || 'MAT002'), qty: 5000 },
      { materialId: starter ? starter.id : (store.subMaterials[1]?.id || 'MAT003'), qty: 300 }
    ]
  }
}

watch(isOpen, (open) => {
  if (open) {
    const defaultTarget = store.mainMaterials.find(m => m.category === 'Base Yogurt' || m.id === 'MAT001')
    targetMatId.value = defaultTarget ? defaultTarget.id : (store.mainMaterials[0]?.id || 'MAT001')
    loadRecipeForTarget(targetMatId.value)
  }
})

watch(targetMatId, (newId) => {
  if (newId) {
    loadRecipeForTarget(newId)
  }
})

const totalSubCost = computed(() => {
  return subRows.value.reduce((sum, row) => {
    const mat = store.matMap[row.materialId]
    const unitCost = mat ? mat.unitCost : 0
    return sum + ((Number(row.qty) || 0) * unitCost)
  }, 0)
})

function addSubRow() {
  const defaultSub = store.subMaterials[0] ? store.subMaterials[0].id : 'MAT002'
  subRows.value.push({ materialId: defaultSub, qty: 1000 })
}

function removeSubRow(index) {
  subRows.value.splice(index, 1)
}

function close() {
  isOpen.value = false
}

function handleProduce() {
  const ok = store.batchProduce(targetMatId.value, yieldQty.value, subRows.value)
  if (ok) {
    close()
  }
}
</script>
