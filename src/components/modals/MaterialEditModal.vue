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
          <p class="text-[11px] text-stone-500 mt-0.5">
            ตั้งหน่วยซื้อ หน่วยใช้ ขนาดบรรจุ และกำหนดสูตรผลิตจากวัตถุดิบรอง
          </p>
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
            <label class="block text-xs font-medium text-stone-700 mb-1.5">
              ชื่อวัตถุดิบ <span class="text-rose-500">*</span>
            </label>
            <input
              v-model="form.name"
              type="text"
              placeholder="เช่น กรีกโยเกิร์ตแท้, นมสดพาสเจอร์ไรส์, สตรอว์เบอร์รี"
              class="soft-input w-full px-3.5 py-2.5 rounded-xl text-xs font-medium text-stone-900 placeholder:text-stone-400"
            />
          </div>
        </div>

        <!-- Section 2: Category -->
        <div>
          <label class="block text-xs font-medium text-stone-700 mb-1.5">หมวดหมู่วัตถุดิบ</label>
          <select
            v-model="form.category"
            class="soft-input w-full px-3.5 py-2.5 rounded-xl text-xs font-medium text-stone-900"
          >
            <option value="Base Yogurt">🥣 เบสกรีกโยเกิร์ต (Base)</option>
            <option value="วัตถุดิบรอง">🥛 วัตถุดิบรอง (Dairy / Starter นมสด, หัวเชื้อ)</option>
            <option value="Fresh Fruits">🍓 ผลไม้สด (Fresh Fruits)</option>
            <option value="Sauces">🍯 ซอส & น้ำเชื่อม (Sauces)</option>
            <option value="Toppings">🥜 ท็อปปิ้ง & กรอบ (Toppings)</option>
            <option value="Packaging">📦 บรรจุภัณฑ์ (Packaging)</option>
          </select>
        </div>

        <!-- Section 3: Granular Units & Packaging (หน่วยซื้อ vs หน่วยใช้ ละเอียด) -->
        <div class="p-4 rounded-2xl bg-[#FAF9F6] border border-stone-200/60 space-y-3.5">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-stone-800 flex items-center gap-1.5">
              <span>📏</span>
              <span>การตั้งหน่วยและการแปลงขนาดบรรจุ (Units & Pack Size)</span>
            </span>
            <span class="text-[10px] text-stone-400">คำนวณต้นทุนอัตโนมัติ</span>
          </div>

          <!-- Unit Definitions: Base Unit vs Pack Unit -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block text-[11px] font-medium text-stone-700">หน่วยใช้ (ชั่ง/ตักขาย/สูตร)</label>
                <div class="flex items-center gap-1 text-[10px]">
                  <button type="button" @click="form.unit = 'g'" class="px-1.5 py-0.5 rounded bg-white hover:bg-stone-200 text-stone-600 transition-colors">g</button>
                  <button type="button" @click="form.unit = 'ml'" class="px-1.5 py-0.5 rounded bg-white hover:bg-stone-200 text-stone-600 transition-colors">ml</button>
                  <button type="button" @click="form.unit = 'pcs'" class="px-1.5 py-0.5 rounded bg-white hover:bg-stone-200 text-stone-600 transition-colors">pcs</button>
                </div>
              </div>
              <input
                v-model="form.unit"
                type="text"
                placeholder="เช่น g, ml, pcs, ชิ้น"
                class="soft-input w-full px-3 py-2 rounded-xl text-xs text-stone-900 font-medium"
              />
            </div>

            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block text-[11px] font-medium text-stone-700">หน่วยซื้อ (รับเข้าคลัง)</label>
                <div class="flex items-center gap-1 text-[10px]">
                  <button type="button" @click="form.packUnit = 'ขวด'" class="px-1.5 py-0.5 rounded bg-white hover:bg-stone-200 text-stone-600 transition-colors">ขวด</button>
                  <button type="button" @click="form.packUnit = 'ลัง'" class="px-1.5 py-0.5 rounded bg-white hover:bg-stone-200 text-stone-600 transition-colors">ลัง</button>
                  <button type="button" @click="form.packUnit = 'ถุง'" class="px-1.5 py-0.5 rounded bg-white hover:bg-stone-200 text-stone-600 transition-colors">ถุง</button>
                  <button type="button" @click="form.packUnit = 'แพ็ค'" class="px-1.5 py-0.5 rounded bg-white hover:bg-stone-200 text-stone-600 transition-colors">แพ็ค</button>
                  <button type="button" @click="form.packUnit = 'ถัง'" class="px-1.5 py-0.5 rounded bg-white hover:bg-stone-200 text-stone-600 transition-colors">ถัง</button>
                </div>
              </div>
              <input
                v-model="form.packUnit"
                type="text"
                placeholder="เช่น ขวด, ลัง, ถุง, แพ็ค, ถัง"
                class="soft-input w-full px-3 py-2 rounded-xl text-xs text-stone-900 font-medium"
              />
            </div>
          </div>

          <!-- Pack Size & Pack Cost -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label class="block text-[11px] font-medium text-stone-700 mb-1">
                ขนาดบรรจุต่อ 1 {{ form.packUnit || 'หน่วยซื้อ' }}
              </label>
              <div class="flex items-center gap-1.5">
                <input
                  v-model.number="form.packSize"
                  @input="recalculateUnitCost"
                  type="number"
                  min="0.001"
                  step="any"
                  placeholder="เช่น 1200"
                  class="soft-input w-full px-3 py-2 rounded-xl text-xs font-number font-semibold text-stone-900"
                />
                <span class="text-[11px] text-stone-500 shrink-0 font-medium w-6">
                  {{ form.unit || 'g' }}
                </span>
              </div>
            </div>

            <div>
              <label class="block text-[11px] font-medium text-stone-700 mb-1">
                ราคาซื้อต่อ 1 {{ form.packUnit || 'หน่วยซื้อ' }} (฿)
              </label>
              <input
                v-model.number="form.packCost"
                @input="recalculateUnitCost"
                type="number"
                min="0"
                step="any"
                placeholder="เช่น 54"
                class="soft-input w-full px-3 py-2 rounded-xl text-xs font-number font-semibold text-stone-900"
              />
            </div>

            <div>
              <label class="block text-[11px] font-medium text-stone-700 mb-1">
                ต้นทุนต่อ {{ form.unit || 'หน่วยใช้' }} (฿)
              </label>
              <input
                v-model.number="form.unitCost"
                @input="recalculatePackCost"
                type="number"
                min="0"
                step="any"
                placeholder="0.0450"
                class="soft-input w-full px-3 py-2 rounded-xl text-xs font-number font-bold text-amber-950"
              />
            </div>
          </div>

          <!-- Live Conversion Formula Pill -->
          <div class="px-3.5 py-2.5 rounded-xl bg-white border border-stone-200/50 flex items-center justify-between flex-wrap gap-2 text-xs">
            <span class="text-stone-600 font-medium flex items-center gap-1">
              <span>💡</span>
              <span>1 {{ form.packUnit || 'หน่วย' }} = {{ (Number(form.packSize) || 1).toLocaleString() }} {{ form.unit || 'g' }} @ ฿{{ (Number(form.packCost) || 0).toFixed(2) }}</span>
            </span>
            <span class="font-number font-bold text-emerald-800 text-xs bg-emerald-50 px-2 py-0.5 rounded-md">
              เฉลี่ย ฿{{ (Number(form.unitCost) || 0).toFixed(4) }} / {{ form.unit || 'g' }}
            </span>
          </div>
        </div>

        <!-- Section 4: Current Stock & Min Alert -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="block text-xs font-medium text-stone-700">สต็อกคงเหลือปัจจุบัน</label>
              <span v-if="form.packSize > 1" class="text-[10px] text-stone-400 font-number">
                ≈ {{ ((form.stock || 0) / (form.packSize || 1)).toFixed(2) }} {{ form.packUnit }}
              </span>
            </div>
            <div class="flex items-center gap-2">
              <input
                v-model.number="form.stock"
                type="number"
                step="any"
                placeholder="0"
                class="soft-input w-full px-3 py-2 rounded-xl text-xs font-number font-semibold text-stone-900"
              />
              <span class="text-stone-400 text-xs shrink-0 font-medium w-8">{{ form.unit || 'g' }}</span>
            </div>
          </div>

          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="block text-xs font-medium text-stone-700">จุดเตือนสต็อกใกล้หมด</label>
              <span v-if="form.packSize > 1" class="text-[10px] text-stone-400 font-number">
                ≈ {{ ((form.minAlert || 0) / (form.packSize || 1)).toFixed(2) }} {{ form.packUnit }}
              </span>
            </div>
            <div class="flex items-center gap-2">
              <input
                v-model.number="form.minAlert"
                type="number"
                step="any"
                placeholder="0"
                class="soft-input w-full px-3 py-2 rounded-xl text-xs font-number font-semibold text-stone-900"
              />
              <span class="text-stone-400 text-xs shrink-0 font-medium w-8">{{ form.unit || 'g' }}</span>
            </div>
          </div>
        </div>

        <!-- Section 5: SINGLE SWITCH (สวิตช์เดียว - ค่าเริ่มต้น วัตถุดิบหลัก กำหนดว่าใช้วัตถุดิบรองหรือไม่) -->
        <div class="pt-1">
          <ToggleSwitch
            v-model="form.hasSubRecipe"
            label="ผลิตจากวัตถุดิบรอง (มีสูตรส่วนผสม)"
            description="เปิดหากวัตถุดิบนี้ต้องหมัก/ผลิตจากวัตถุดิบอื่น (เช่น กรีกโยเกิร์ตที่ทำจาก นมสด + หัวเชื้อ)"
            icon="🥣"
            color="amber"
          />
        </div>

        <!-- Section 6: Sub-Ingredients Recipe (When Single Switch is ON) -->
        <div
          v-if="form.hasSubRecipe"
          class="space-y-4 pt-3 border-t border-stone-100"
        >
          <!-- Yield output produced -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="block text-xs font-medium text-stone-700">
                ผลผลิตที่ได้ต่อรอบการผลิต (Batch Yield Output)
              </label>
              <span class="text-[11px] text-stone-400">
                1 รอบได้ผลผลิต {{ form.yieldQty }} {{ form.unit }} {{ form.packSize > 1 ? `(≈ ${(form.yieldQty / form.packSize).toFixed(1)} ${form.packUnit})` : '' }}
              </span>
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
                <span>สูตรวัตถุดิบรองที่ต้องใช้ (Sub-ingredients Formula)</span>
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

            <!-- Sub Recipe Rows with Unit Switch (ขวด / ml / g) -->
            <div class="space-y-2">
              <div
                v-for="(row, idx) in form.subRecipe"
                :key="idx"
                class="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-[#FAF9F6] hover:bg-[#F5F4F0] transition-colors"
              >
                <!-- Material Selector -->
                <select
                  v-model="row.materialId"
                  @change="onSubMaterialChanged(row)"
                  class="bg-transparent border-0 flex-1 text-xs font-medium text-stone-900 focus:outline-none min-w-[140px]"
                >
                  <optgroup label="🥛 วัตถุดิบรอง (Dairy / Starter)">
                    <option
                      v-for="sub in availableSubMaterials.filter(m => m.isSubIngredient)"
                      :key="sub.id"
                      :value="sub.id"
                    >
                      {{ sub.emoji }} {{ sub.name }} (฿{{ sub.unitCost }}/{{ sub.unit }})
                    </option>
                  </optgroup>
                  <optgroup label="📦 วัตถุดิบอื่นๆ">
                    <option
                      v-for="sub in availableSubMaterials.filter(m => !m.isSubIngredient)"
                      :key="sub.id"
                      :value="sub.id"
                    >
                      {{ sub.emoji }} {{ sub.name }} (฿{{ sub.unitCost }}/{{ sub.unit }})
                    </option>
                  </optgroup>
                </select>

                <!-- Unit Switch Capsule (ขวด vs ml / ลัง vs g) -->
                <div
                  v-if="getSubMat(row.materialId)?.packUnit && getSubMat(row.materialId)?.packSize > 1"
                  class="flex items-center p-0.5 bg-stone-200/70 rounded-lg text-[10px] font-semibold shrink-0"
                >
                  <button
                    type="button"
                    @click="setRowUnitMode(row, 'base')"
                    :class="[
                      'px-1.5 py-0.5 rounded transition-all',
                      row.inputMode !== 'pack'
                        ? 'bg-white text-stone-900 shadow-2xs font-bold'
                        : 'text-stone-500 hover:text-stone-800'
                    ]"
                  >
                    {{ getSubMat(row.materialId)?.unit }}
                  </button>
                  <button
                    type="button"
                    @click="setRowUnitMode(row, 'pack')"
                    :class="[
                      'px-1.5 py-0.5 rounded transition-all',
                      row.inputMode === 'pack'
                        ? 'bg-amber-900 text-white shadow-2xs font-bold'
                        : 'text-stone-500 hover:text-stone-800'
                    ]"
                  >
                    {{ getSubMat(row.materialId)?.packUnit }}
                  </button>
                </div>

                <!-- Input Quantity -->
                <div class="flex items-center gap-1 w-24 shrink-0">
                  <input
                    v-if="row.inputMode === 'pack'"
                    v-model.number="row.inputPackQty"
                    @input="syncRowQtyFromPack(row)"
                    type="number"
                    min="0.01"
                    step="any"
                    placeholder="0"
                    class="w-full bg-white px-2 py-1 rounded-lg text-right font-number font-semibold text-xs text-stone-900 focus:outline-none shadow-2xs"
                  />
                  <input
                    v-else
                    v-model.number="row.qty"
                    @input="syncRowPackFromQty(row)"
                    type="number"
                    min="0.1"
                    step="any"
                    placeholder="0"
                    class="w-full bg-white px-2 py-1 rounded-lg text-right font-number font-semibold text-xs text-stone-900 focus:outline-none shadow-2xs"
                  />
                  <span class="text-[11px] text-stone-400 shrink-0 w-6">
                    {{ row.inputMode === 'pack' ? getSubMat(row.materialId)?.packUnit : getSubMat(row.materialId)?.unit }}
                  </span>
                </div>

                <!-- Row Cost -->
                <span class="text-[11px] font-number text-stone-600 shrink-0 w-16 text-right">
                  ฿{{ ((row.qty || 0) * (getSubMat(row.materialId)?.unitCost || 0)).toFixed(1) }}
                </span>

                <!-- Delete Row -->
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

          <!-- Option to deduct sub-ingredients right now if initial stock is entered -->
          <div
            v-if="form.stock > 0"
            class="flex items-center justify-between px-4 py-3 rounded-xl bg-[#FAF9F6] text-xs"
          >
            <div>
              <span class="block font-medium text-stone-800">หักสต็อกวัตถุดิบรองตามสต็อกนี้ทันที</span>
              <span class="text-[11px] text-stone-500">
                ระบบจะตัดสต็อกวัตถุดิบรองตามสัดส่วนของ {{ form.stock }} {{ form.unit }} ที่ระบุ
              </span>
            </div>
            <ToggleSwitch v-model="form.deductSubStockNow" color="amber" />
          </div>
        </div>

        <!-- Live Total Valuation Line -->
        <div class="flex items-center justify-between px-4 py-3 rounded-xl bg-[#FAF9F6] text-xs">
          <span class="text-stone-500">มูลค่าวัตถุดิบคงคลังของรายการนี้:</span>
          <span class="font-number font-bold text-amber-950 text-sm">
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
  deductSubStockNow: false,
  subRecipe: []
})

const isEditing = computed(() => Boolean(store.modals.materialEdit.materialId))

// List of other materials available to be used as sub-ingredients
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

function recalculatePackCost() {
  const size = Number(form.value.packSize) || 1
  const unitC = Number(form.value.unitCost) || 0
  form.value.packCost = Number((unitC * size).toFixed(2))
}

function setRowUnitMode(row, mode) {
  row.inputMode = mode
  if (mode === 'pack') {
    syncRowPackFromQty(row)
  } else {
    syncRowQtyFromPack(row)
  }
}

function syncRowQtyFromPack(row) {
  const sub = getSubMat(row.materialId)
  const packSize = sub && sub.packSize > 0 ? sub.packSize : 1
  row.qty = Math.round((Number(row.inputPackQty) || 0) * packSize * 100) / 100
}

function syncRowPackFromQty(row) {
  const sub = getSubMat(row.materialId)
  const packSize = sub && sub.packSize > 0 ? sub.packSize : 1
  row.inputPackQty = Math.round(((Number(row.qty) || 0) / packSize) * 100) / 100
}

function onSubMaterialChanged(row) {
  const sub = getSubMat(row.materialId)
  if (sub && sub.packSize > 1) {
    row.inputMode = 'pack'
    row.inputPackQty = 1
    row.qty = sub.packSize
  } else {
    row.inputMode = 'base'
    row.qty = 100
    row.inputPackQty = 1
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
        deductSubStockNow: false,
        subRecipe: mat.subRecipe && Array.isArray(mat.subRecipe) && mat.subRecipe.length > 0
          ? mat.subRecipe.map(r => {
              const subMat = store.matMap[r.materialId]
              const pSize = subMat && subMat.packSize > 0 ? subMat.packSize : 1
              return {
                materialId: r.materialId,
                qty: Number(r.qty) || 0,
                inputMode: r.inputMode || 'base',
                inputPackQty: Number((Number(r.qty || 0) / pSize).toFixed(2))
              }
            })
          : [
              { materialId: store.subMaterials[0]?.id || 'MAT002', qty: 5000, inputMode: 'base', inputPackQty: 4.17 },
              { materialId: store.subMaterials[1]?.id || 'MAT003', qty: 300, inputMode: 'base', inputPackQty: 0.6 }
            ]
      }
    } else {
      // New Material: Default is Main Material (Single switch OFF)
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
        hasSubRecipe: false, // Default is OFF (Main material without sub-ingredients)
        yieldQty: 1200,
        deductSubStockNow: false,
        subRecipe: [
          { materialId: store.subMaterials[0]?.id || 'MAT002', qty: 5000, inputMode: 'base', inputPackQty: 4.17 },
          { materialId: store.subMaterials[1]?.id || 'MAT003', qty: 300, inputMode: 'base', inputPackQty: 0.6 }
        ]
      }
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
    recalculatePackCost()
    store.showToast(`นำต้นทุนที่คำนวณได้ (฿${form.value.unitCost}/${form.value.unit}) ไปใช้แล้ว`, 'success')
  }
}

function addSubRecipeRow() {
  const defaultSubId = store.subMaterials[0]?.id || availableSubMaterials.value[0]?.id || 'MAT002'
  const sub = getSubMat(defaultSubId)
  const pSize = sub && sub.packSize > 0 ? sub.packSize : 1
  form.value.subRecipe.push({
    materialId: defaultSubId,
    qty: 1000,
    inputMode: 'base',
    inputPackQty: Number((1000 / pSize).toFixed(2))
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
  // If category is "วัตถุดิบรอง" and hasSubRecipe is false, mark as sub-ingredient
  const isSub = !hasRecipe && form.value.category === 'วัตถุดิบรอง'
  const targetStock = Number(form.value.stock) || 0

  // Deduct sub-ingredients if option checked
  if (hasRecipe && form.value.deductSubStockNow && targetStock > 0) {
    const yieldQ = Number(form.value.yieldQty) || 1200
    const ratio = targetStock / yieldQ
    const deducted = []

    for (const r of form.value.subRecipe) {
      const subMat = store.materials.find(m => m.id === r.materialId)
      if (subMat) {
        const deductAmount = Math.round((Number(r.qty) || 0) * ratio * 100) / 100
        const currentSubStock = Number(subMat.stock) || 0
        const newStock = Math.max(0, Math.round((currentSubStock - deductAmount) * 100) / 100)
        subMat.stock = newStock
        deducted.push(`${subMat.name} -${deductAmount} ${subMat.unit}`)
      }
    }
    if (deducted.length > 0) {
      store.showToast(`ตัดสต็อกวัตถุดิบรองแล้ว: ${deducted.join(', ')}`, 'info')
    }
  }

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
    stock: targetStock,
    minAlert: Number(form.value.minAlert) || 0,
    unitCost: Math.round(uCost * 10000) / 10000,
    emoji: form.value.emoji || '🥣',
    isSubIngredient: isSub,
    hasSubRecipe: hasRecipe,
    yieldQty: hasRecipe ? (Number(form.value.yieldQty) || 1200) : undefined,
    subRecipe: hasRecipe
      ? form.value.subRecipe
          .filter(r => r.materialId && r.qty > 0)
          .map(r => ({ materialId: r.materialId, qty: Number(r.qty), inputMode: r.inputMode }))
      : []
  })

  close()
}
</script>
