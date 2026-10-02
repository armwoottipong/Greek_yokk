<template>
  <div
    v-if="store.modals.materialEdit.isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-stone-900/40 backdrop-blur-xs"
    @click.self="close"
  >
    <div class="bg-white rounded-2xl border border-stone-200/80 shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
      <!-- Calm Clean Header -->
      <div class="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-white shrink-0">
        <div>
          <h3 class="text-sm font-semibold text-stone-900">
            {{ isEditing ? `แก้ไข: ${form.name}` : 'เพิ่มวัตถุดิบ / สินค้า' }}
          </h3>
          <p class="text-[11px] text-stone-400 mt-0.5">ระบุข้อมูลต้นทุน หรือตั้งสูตรการผลิต</p>
        </div>
        <button @click="close" class="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100 transition-colors">
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Pure Minimal Body -->
      <div class="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
        <!-- 1. Emoji, Name & Category -->
        <div class="flex items-center gap-3">
          <button
            type="button"
            @click="openEmojiPicker"
            title="เปลี่ยนไอคอน"
            class="w-11 h-11 rounded-xl bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-2xl transition-colors shrink-0"
          >
            {{ form.emoji }}
          </button>
          <div class="flex-1 min-w-0">
            <label class="block text-[11px] font-medium text-stone-600 mb-1">
              ชื่อวัตถุดิบ <span class="text-rose-500">*</span>
            </label>
            <input
              v-model="form.name"
              type="text"
              placeholder="เช่น นมสดพาสเจอร์ไรส์, กรีกโยเกิร์ต"
              class="soft-input w-full px-3 py-2 rounded-xl text-xs font-medium text-stone-900 placeholder:text-stone-400"
            />
          </div>
          <div class="w-36 shrink-0">
            <label class="block text-[11px] font-medium text-stone-600 mb-1">หมวดหมู่</label>
            <select
              v-model="form.category"
              class="soft-input w-full px-2.5 py-2 rounded-xl text-xs font-medium text-stone-900"
            >
              <option value="Base Yogurt">🥣 เบสกรีกโยเกิร์ต</option>
              <option value="วัตถุดิบรอง">🥛 วัตถุดิบรอง</option>
              <option value="Fresh Fruits">🍓 ผลไม้สด</option>
              <option value="Sauces">🍯 ซอส & น้ำผึ้ง</option>
              <option value="Toppings">🥜 ท็อปปิ้ง</option>
              <option value="Packaging">📦 บรรจุภัณฑ์</option>
            </select>
          </div>
        </div>

        <!-- 2. Packaging & Units (Simplified inline sentence flow) -->
        <div class="p-3.5 rounded-xl bg-[#FAF9F6] border border-stone-200/50 space-y-2.5">
          <div class="flex items-center justify-between text-stone-700 font-medium">
            <span>หน่วยซื้อและขนาดบรรจุ</span>
            <span class="text-[10px] text-stone-400 font-normal">คำนวณต้นทุนต่อหน่วยให้อัตโนมัติ</span>
          </div>

          <div class="grid grid-cols-4 gap-2 items-end">
            <!-- Pack Unit -->
            <div>
              <label class="block text-[10px] text-stone-500 mb-1">หน่วยซื้อเข้า</label>
              <input
                v-model="form.packUnit"
                type="text"
                placeholder="ขวด/ลัง"
                class="w-full bg-white px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs font-medium text-stone-900 focus:outline-none"
              />
            </div>

            <!-- Pack Size & Unit -->
            <div>
              <label class="block text-[10px] text-stone-500 mb-1">ขนาดบรรจุ</label>
              <div class="flex items-center bg-white px-2 py-1.5 rounded-lg border border-stone-200">
                <input
                  v-model.number="form.packSize"
                  @input="recalculateUnitCost"
                  type="number"
                  step="any"
                  placeholder="1200"
                  class="w-full font-number font-semibold text-xs text-right focus:outline-none"
                />
                <input
                  v-model="form.unit"
                  type="text"
                  placeholder="ml"
                  title="หน่วยย่อย (ml, g, pcs)"
                  class="w-7 text-[11px] text-stone-500 font-medium text-center focus:outline-none"
                />
              </div>
            </div>

            <!-- Pack Price -->
            <div>
              <label class="block text-[10px] text-stone-500 mb-1">ราคาต่อ 1 {{ form.packUnit || 'แพ็ค' }}</label>
              <div class="flex items-center bg-white px-2 py-1.5 rounded-lg border border-stone-200">
                <span class="text-[11px] text-stone-400 mr-0.5">฿</span>
                <input
                  v-model.number="form.packCost"
                  @input="recalculateUnitCost"
                  type="number"
                  step="any"
                  placeholder="54"
                  class="w-full font-number font-semibold text-xs text-right focus:outline-none"
                />
              </div>
            </div>

            <!-- Derived Unit Cost -->
            <div>
              <label class="block text-[10px] text-stone-500 mb-1">เฉลี่ย / {{ form.unit || 'หน่วย' }}</label>
              <div class="bg-stone-100/80 px-2 py-1.5 rounded-lg text-xs font-number font-bold text-emerald-800 text-right">
                ฿{{ (Number(form.unitCost) || 0).toFixed(4) }}
              </div>
            </div>
          </div>
        </div>

        <!-- 3. Current Stock & Alert Threshold -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-[11px] font-medium text-stone-600 mb-1">
              สต็อกปัจจุบัน ({{ form.unit || 'หน่วย' }})
            </label>
            <div class="flex items-center gap-2">
              <input
                v-model.number="form.stock"
                type="number"
                step="any"
                class="soft-input w-full px-3 py-1.5 rounded-xl text-xs font-number font-semibold text-stone-900"
              />
              <span v-if="form.packSize > 1" class="text-[10px] text-stone-400 shrink-0 font-number">
                ≈ {{ ((form.stock || 0) / form.packSize).toFixed(1) }} {{ form.packUnit }}
              </span>
            </div>
          </div>

          <div>
            <label class="block text-[11px] font-medium text-stone-600 mb-1">
              เตือนเมื่อต่ำกว่า ({{ form.unit || 'หน่วย' }})
            </label>
            <div class="flex items-center gap-2">
              <input
                v-model.number="form.minAlert"
                type="number"
                step="any"
                class="soft-input w-full px-3 py-1.5 rounded-xl text-xs font-number font-semibold text-stone-900"
              />
              <span v-if="form.packSize > 1" class="text-[10px] text-stone-400 shrink-0 font-number">
                ≈ {{ ((form.minAlert || 0) / form.packSize).toFixed(1) }} {{ form.packUnit }}
              </span>
            </div>
          </div>
        </div>

        <!-- 4. The Single Switch (สวิตช์เดียว) -->
        <div class="pt-1">
          <ToggleSwitch
            v-model="form.hasSubRecipe"
            label="ผลิตจากวัตถุดิบอื่น (มีสูตรส่วนผสม)"
            description="เปิดหากต้องหมักหรือทำจากวัตถุดิบอื่น (เช่น กรีกโยเกิร์ตแท้)"
            icon="🥣"
            color="amber"
          />
        </div>

        <!-- 5. Sub-Recipe Section (Clean, flat rows) -->
        <div v-if="form.hasSubRecipe" class="space-y-3 pt-2 border-t border-stone-100">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-[11px] font-medium text-stone-700">ผลผลิตต่อ 1 รอบ:</span>
              <input
                v-model.number="form.yieldQty"
                type="number"
                min="1"
                class="w-20 bg-stone-100 px-2 py-1 rounded-lg text-xs font-number font-bold text-amber-950 text-right focus:outline-none"
              />
              <span class="text-stone-500 font-medium">{{ form.unit || 'g' }}</span>
            </div>
            <button
              type="button"
              @click="addSubRecipeRow"
              class="text-[11px] font-semibold text-amber-900 hover:text-amber-950 flex items-center gap-1 transition-colors"
            >
              <Plus class="w-3.5 h-3.5" />
              <span>เพิ่มส่วนผสม</span>
            </button>
          </div>

          <!-- Ingredients List -->
          <div class="space-y-1.5">
            <div
              v-for="(row, idx) in form.subRecipe"
              :key="idx"
              class="flex items-center gap-2 bg-[#FAF9F6] px-3 py-1.5 rounded-xl hover:bg-[#F5F4F0] transition-colors"
            >
              <select
                v-model="row.materialId"
                class="flex-1 bg-transparent border-0 text-xs font-medium text-stone-900 focus:outline-none min-w-[120px]"
              >
                <option
                  v-for="sub in availableSubMaterials"
                  :key="sub.id"
                  :value="sub.id"
                >
                  {{ sub.emoji }} {{ sub.name }}
                </option>
              </select>

              <div class="flex items-center gap-1">
                <input
                  v-model.number="row.qty"
                  type="number"
                  min="0.1"
                  step="any"
                  placeholder="0"
                  class="w-20 bg-white px-2 py-1 rounded-lg text-right font-number font-semibold text-xs text-stone-900 shadow-2xs focus:outline-none"
                />
                <span class="text-[10px] text-stone-400 w-7">
                  {{ getSubMat(row.materialId)?.unit }}
                </span>
              </div>

              <span class="text-[11px] font-number text-stone-500 w-14 text-right">
                ฿{{ ((row.qty || 0) * (getSubMat(row.materialId)?.unitCost || 0)).toFixed(1) }}
              </span>

              <button
                type="button"
                @click="removeSubRecipeRow(idx)"
                class="p-1 text-stone-400 hover:text-rose-600 rounded transition-colors"
              >
                <X class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <!-- Cost Calculation Summary -->
          <div class="flex items-center justify-between px-3 py-2 bg-stone-100/70 rounded-xl text-[11px]">
            <span class="text-stone-500">
              รวมต้นทุน: <strong class="text-stone-800">฿{{ calculatedSubCost.toFixed(2) }}</strong>
            </span>
            <div class="flex items-center gap-2">
              <span class="text-stone-500">
                เฉลี่ย: <strong class="text-emerald-800 font-number text-xs">฿{{ (form.yieldQty > 0 ? calculatedSubCost / form.yieldQty : 0).toFixed(4) }}/{{ form.unit }}</strong>
              </span>
              <button
                type="button"
                @click="applyCalculatedCost"
                class="px-2 py-0.5 rounded bg-stone-900 hover:bg-stone-800 text-white text-[10px] font-medium transition-colors"
              >
                ใช้ราคานี้
              </button>
            </div>
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
          class="px-5 py-2 text-xs font-semibold bg-stone-900 hover:bg-stone-800 text-white rounded-xl shadow-xs transition-all flex items-center gap-1.5"
        >
          <Check class="w-3.5 h-3.5" />
          <span>บันทึก</span>
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
  packUnit: 'ขวด',
  packSize: 1200,
  packCost: 54,
  unitCost: 0.045,
  stock: 0,
  minAlert: 500,
  emoji: '🥣',
  isSubIngredient: false,
  hasSubRecipe: false,
  yieldQty: 1200,
  subRecipe: []
})

const isEditing = computed(() => Boolean(store.modals.materialEdit.materialId))

const availableSubMaterials = computed(() => {
  return store.materials.filter(m => !m.isDeleted && m.id !== form.value.id)
})

function getSubMat(matId) {
  return store.matMap[matId]
}

function recalculateUnitCost() {
  const size = Number(form.value.packSize) || 1
  const cost = Number(form.value.packCost) || 0
  if (size > 0) {
    form.value.unitCost = Number((cost / size).toFixed(4))
  }
}

watch(() => store.modals.materialEdit.isOpen, (open) => {
  if (open) {
    const id = store.modals.materialEdit.materialId
    const mat = id ? store.materials.find(m => m.id === id) : null

    if (mat) {
      const pUnit = mat.packUnit || (mat.unit === 'ml' ? 'ขวด' : mat.unit === 'g' ? 'ถุง' : 'แพ็ค')
      const pSize = Number(mat.packSize) || 1
      const uCost = Number(mat.unitCost) || 0
      const pCost = Number(mat.packCost) || (uCost * pSize)

      form.value = {
        id: mat.id,
        name: mat.name,
        category: mat.category || 'Base Yogurt',
        unit: mat.unit || 'g',
        packUnit: pUnit,
        packSize: pSize,
        packCost: pCost,
        unitCost: uCost,
        stock: Number(mat.stock) || 0,
        minAlert: Number(mat.minAlert) || 500,
        emoji: mat.emoji || '🥣',
        isSubIngredient: Boolean(mat.isSubIngredient),
        hasSubRecipe: Boolean(mat.hasSubRecipe),
        yieldQty: mat.yieldQty ? Number(mat.yieldQty) : 1200,
        subRecipe: mat.subRecipe && Array.isArray(mat.subRecipe) && mat.subRecipe.length > 0
          ? JSON.parse(JSON.stringify(mat.subRecipe))
          : [
              { materialId: store.subMaterials[0]?.id || 'MAT002', qty: 5000 },
              { materialId: store.subMaterials[1]?.id || 'MAT003', qty: 300 }
            ]
      }
    } else {
      // New Material: Default is Main Material
      form.value = {
        id: '',
        name: '',
        category: 'Base Yogurt',
        unit: 'g',
        packUnit: 'ขวด',
        packSize: 1200,
        packCost: 54,
        unitCost: 0.045,
        stock: 0,
        minAlert: 500,
        emoji: '🥣',
        isSubIngredient: false,
        hasSubRecipe: false,
        yieldQty: 1200,
        subRecipe: [
          { materialId: store.subMaterials[0]?.id || 'MAT002', qty: 5000 },
          { materialId: store.subMaterials[1]?.id || 'MAT003', qty: 300 }
        ]
      }
    }
  }
})

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
    const size = Number(form.value.packSize) || 1
    form.value.packCost = Number((form.value.unitCost * size).toFixed(2))
    store.showToast(`นำต้นทุน ฿${form.value.unitCost}/${form.value.unit} ไปใช้แล้ว`, 'success')
  }
}

function addSubRecipeRow() {
  const defaultSubId = store.subMaterials[0]?.id || availableSubMaterials.value[0]?.id || 'MAT002'
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

  const hasRecipe = Boolean(form.value.hasSubRecipe)
  const isSub = !hasRecipe && form.value.category === 'วัตถุดิบรอง'
  const pSize = Number(form.value.packSize) > 0 ? Number(form.value.packSize) : 1
  const pCost = Number(form.value.packCost) >= 0 ? Number(form.value.packCost) : 0
  const uCost = Number(form.value.unitCost) >= 0 ? Number(form.value.unitCost) : (pCost / pSize)

  store.saveMaterial({
    id: form.value.id || undefined,
    name: form.value.name.trim(),
    category: form.value.category,
    unit: form.value.unit.trim() || 'g',
    packUnit: form.value.packUnit.trim() || 'ชิ้น',
    packSize: pSize,
    packCost: pCost,
    stock: Number(form.value.stock) || 0,
    minAlert: Number(form.value.minAlert) || 0,
    unitCost: Math.round(uCost * 10000) / 10000,
    emoji: form.value.emoji || '🥣',
    isSubIngredient: isSub,
    hasSubRecipe: hasRecipe,
    yieldQty: hasRecipe ? (Number(form.value.yieldQty) || 1200) : undefined,
    subRecipe: hasRecipe
      ? form.value.subRecipe
          .filter(r => r.materialId && r.qty > 0)
          .map(r => ({ materialId: r.materialId, qty: Number(r.qty) }))
      : []
  })

  close()
}
</script>
