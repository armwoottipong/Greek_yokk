<template>
  <div
    v-if="store.modals.materialEdit.isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-stone-900/40 backdrop-blur-xs"
    @click.self="requestClose(close)"
  >
    <div class="bg-white rounded-2xl border border-stone-200/80 shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
      
      <!-- 1. Header with Dynamic Title & Sub-Recipe Switch (Requirement 4) -->
      <div class="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-white shrink-0">
        <div class="min-w-0 flex-1 pr-3">
          <div class="flex items-center gap-2">
            <h3 class="text-sm font-semibold text-stone-900 truncate">
              {{ isEditing 
                ? (form.hasSubRecipe ? `แก้ไขสูตรผลิต: ${form.name}` : `แก้ไขวัตถุดิบ: ${form.name}`)
                : (form.hasSubRecipe ? 'วัตถุดิบมีส่วนผสม (สูตรผลิต)' : 'เพิ่มวัตถุดิบ / สินค้า') 
              }}
            </h3>
            <span 
              v-if="form.hasSubRecipe"
              class="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-semibold text-[10px] shrink-0"
            >
              สูตรผลิต
            </span>
          </div>
          <p class="text-[11px] text-stone-400 mt-0.5 truncate">
            {{ form.hasSubRecipe 
              ? 'ตั้งสูตรส่วนผสม คำนวณต้นทุนรวมและเฉลี่ยต่อหน่วยให้อัตโนมัติ' 
              : 'ระบุหน่วยนับ ข้อมูลแพ็คสั่งซื้อ และสต็อกปัจจุบัน' 
            }}
          </p>
        </div>

        <div class="flex items-center gap-3 shrink-0">
          <!-- Switch Button: ผลิตจากวัตถุดิบอื่น (Header toggle, default = OFF) -->
          <label 
            class="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border cursor-pointer select-none transition-all"
            :class="form.hasSubRecipe ? 'bg-amber-50/70 border-amber-300 text-amber-950' : 'bg-stone-50 border-stone-200/80 text-stone-700 hover:border-stone-300'"
            title="เปิดหากเป็นวัตถุดิบที่ต้องปรุง/ผลิตจากวัตถุดิบอื่น"
          >
            <span class="text-[11px] font-semibold flex items-center gap-1.5">
              <span class="text-xs">🥣</span>
              <span>ผลิตจากวัตถุดิบอื่น</span>
            </span>
            <div class="relative inline-flex items-center">
              <input
                type="checkbox"
                v-model="form.hasSubRecipe"
                class="sr-only peer"
              />
              <div class="w-8 h-4.5 bg-stone-300 peer-checked:bg-amber-800 rounded-full transition-colors relative">
                <div class="absolute top-0.5 left-0.5 bg-white w-3.5 h-3.5 rounded-full shadow-xs transition-transform transform peer-checked:translate-x-3.5"></div>
              </div>
            </div>
          </label>

          <!-- Close Modal Button -->
          <button 
            type="button"
            @click="requestClose(close)" 
            class="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- 2. Modal Body -->
      <div class="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
        
        <!-- Ingredient Role: Top, compact, prominent (Requirement 3) -->
        <div 
          v-if="!form.hasSubRecipe" 
          class="flex items-center justify-between px-3.5 py-2 rounded-xl bg-stone-50 border border-stone-200/80"
        >
          <div class="flex items-center gap-2 min-w-0 pr-2">
            <span class="text-[11px] font-semibold text-stone-700 shrink-0">บทบาทวัตถุดิบ:</span>
            <span class="text-[10px] text-stone-400 truncate">
              {{ form.isSubIngredient ? 'ใช้นำไปประกอบสูตรผลิตอื่น (ไม่แสดงตักขาย)' : 'วัตถุดิบหลัก สำหรับใส่เมนู / ตักขายหน้าร้าน' }}
            </span>
          </div>
          <div class="flex items-center gap-1 p-0.5 bg-stone-200/60 rounded-lg text-[10px] font-semibold shrink-0">
            <button
              type="button"
              @click="form.isSubIngredient = false"
              :class="!form.isSubIngredient ? 'bg-amber-900 text-white shadow-2xs font-bold' : 'text-stone-600 hover:text-stone-900'"
              class="px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer"
            >
              <span>🥣 วัตถุดิบหลัก</span>
            </button>
            <button
              type="button"
              @click="form.isSubIngredient = true"
              :class="form.isSubIngredient ? 'bg-purple-800 text-white shadow-2xs font-bold' : 'text-stone-600 hover:text-stone-900'"
              class="px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer"
            >
              <span>🥛 วัตถุดิบรอง</span>
            </button>
          </div>
        </div>

        <!-- Emoji, Name & Category -->
        <div class="flex items-center gap-3">
          <button
            type="button"
            @click="openEmojiPicker"
            title="เปลี่ยนไอคอน"
            class="w-11 h-11 rounded-xl bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-2xl transition-colors shrink-0 cursor-pointer"
          >
            {{ form.emoji }}
          </button>
          <div class="flex-1 min-w-0">
            <label class="block text-[11px] font-medium text-stone-600 mb-1">
              ชื่อ{{ form.hasSubRecipe ? 'สูตร / วัตถุดิบผลิต' : 'วัตถุดิบ' }} <span class="text-rose-500">*</span>
            </label>
            <input
              v-model="form.name"
              type="text"
              :placeholder="form.hasSubRecipe ? 'เช่น กรีกโยเกิร์ต รสธรรมชาติ' : 'เช่น นมสดพาสเจอร์ไรส์, ถ้วยกระดาษ'"
              class="soft-input w-full px-3 py-2 rounded-xl text-xs font-medium text-stone-900 placeholder:text-stone-400"
            />
          </div>
          <div class="w-44 shrink-0">
            <label class="block text-[11px] font-medium text-stone-600 mb-1">หมวดหมู่</label>
            <select
              v-model="form.category"
              class="soft-input w-full px-2.5 py-2 rounded-xl text-xs font-medium text-stone-900 cursor-pointer"
            >
              <option
                v-for="cat in store.materialCategories"
                :key="cat.id"
                :value="cat.name"
              >
                {{ cat.icon }} {{ cat.label || cat.name }}
              </option>
              <option
                v-if="form.category && !store.materialCategories.some(c => c.name === form.category)"
                :value="form.category"
              >
                📦 {{ form.category }}
              </option>
            </select>
          </div>
        </div>

        <!-- Unit Selection (Strictly 3 choices: ml, g, ชิ้น) (Requirement 1) -->
        <div class="space-y-1.5">
          <label class="block text-[11px] font-medium text-stone-700">
            หน่วยใช้ (ชั่ง / ตักขาย / ใส่ในสูตร) <span class="text-rose-500">*</span>
          </label>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="u in unitOptions"
              :key="u.value"
              type="button"
              @click="setUnit(u.value)"
              :class="form.unit === u.value 
                ? 'bg-amber-900 text-white font-semibold shadow-xs' 
                : 'bg-[#FAF9F6] border border-stone-200/80 hover:bg-stone-100 text-stone-700'"
              class="py-2 px-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span class="text-sm">{{ u.icon }}</span>
              <span>{{ u.label }}</span>
            </button>
          </div>
        </div>

        <!-- Cost & Packaging: Standard Purchased Material (Single unified calculation) (Requirement 1) -->
        <div v-if="!form.hasSubRecipe" class="rounded-2xl border border-stone-200/80 bg-[#FAF9F6] p-4 space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5 font-semibold text-stone-800 text-xs">
              <span>📦</span>
              <span>การสั่งซื้อเข้าสต็อกและคิดต้นทุน (Pack Purchase & Cost)</span>
            </div>
            <button
              type="button"
              @click="setSingleUnitPack"
              class="text-[10px] text-stone-500 hover:text-stone-800 underline transition-colors cursor-pointer"
              title="ตั้งค่ากรณีซื้อสินค้าแยกชิ้นเดี่ยว (1 ต่อ 1)"
            >
              ซื้อแยกชิ้น (1:1)
            </button>
          </div>

          <div class="grid grid-cols-3 gap-2.5">
            <!-- 1. หน่วยซื้อเข้า -->
            <div>
              <label class="block text-[10px] text-stone-500 mb-1">หน่วยสั่งซื้อเข้า</label>
              <input
                v-model="form.packUnit"
                type="text"
                placeholder="เช่น ถุง, ขวด, ลัง, แพ็ค"
                class="soft-input w-full px-2.5 py-1.5 rounded-lg text-xs font-medium text-stone-900"
              />
            </div>

            <!-- 2. ขนาดบรรจุ -->
            <div>
              <label class="block text-[10px] text-stone-500 mb-1">
                1 {{ form.packUnit || 'แพ็ค' }} บรรจุ
              </label>
              <div class="flex items-center soft-input px-2.5 py-1.5 rounded-lg bg-white">
                <input
                  v-model.number="form.packSize"
                  type="number"
                  min="0.001"
                  step="any"
                  placeholder="1000"
                  class="w-full text-right font-number font-semibold text-xs bg-transparent focus:outline-none"
                />
                <span class="text-[10px] text-stone-400 ml-1 shrink-0">{{ form.unit }}</span>
              </div>
            </div>

            <!-- 3. ราคาซื้อ -->
            <div>
              <label class="block text-[10px] text-stone-500 mb-1">
                ราคาซื้อต่อ 1 {{ form.packUnit || 'แพ็ค' }}
              </label>
              <div class="flex items-center soft-input px-2.5 py-1.5 rounded-lg bg-white">
                <span class="text-[10px] text-stone-400 mr-0.5">฿</span>
                <input
                  v-model.number="form.packCost"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  class="w-full text-right font-number font-semibold text-xs bg-transparent focus:outline-none"
                />
              </div>
            </div>
          </div>

          <!-- Single Unified Cost Result Card (ไม่ต้องคำนวณซ้ำซ้อน) -->
          <div class="p-3 rounded-xl bg-white border border-stone-200/60 flex items-center justify-between">
            <div class="space-y-0.5">
              <span class="text-[10px] font-semibold text-stone-500 uppercase tracking-wide flex items-center gap-1">
                <span>💡</span>
                <span>ต้นทุนเฉลี่ยต่อหน่วยใช้งาน</span>
              </span>
              <p class="text-[11px] text-stone-400 font-number">
                ฿{{ (Number(form.packCost) || 0).toLocaleString() }} ÷ {{ (Number(form.packSize) || 1).toLocaleString() }} {{ form.unit }}
              </p>
            </div>
            <div class="text-right">
              <div class="text-sm font-bold font-number text-emerald-800">
                ฿{{ calculatedUnitCost.toFixed(4) }}
                <span class="text-[11px] font-normal text-stone-500 font-sans">/ {{ form.unit }}</span>
              </div>
              <span class="text-[10px] text-emerald-600/80 font-medium">นำไปตัดสต็อก & คิดกำไรอัตโนมัติ</span>
            </div>
          </div>
        </div>

        <!-- Sub-Recipe Builder Section: Produced Material (Single unified cost calculation) -->
        <div v-if="form.hasSubRecipe" class="rounded-2xl border border-amber-200/80 bg-amber-50/30 p-4 space-y-3.5">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5 font-semibold text-amber-950 text-xs">
              <span>🥣</span>
              <span>สูตรการผลิต (Sub-Recipe Ingredients)</span>
            </div>
            <button
              type="button"
              @click="addSubRecipeRow"
              class="text-[11px] font-semibold text-amber-900 hover:text-amber-950 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Plus class="w-3.5 h-3.5" />
              <span>เพิ่มส่วนผสม</span>
            </button>
          </div>

          <!-- ปริมาณผลผลิตต่อรอบ -->
          <div class="flex items-center justify-between p-3 rounded-xl bg-white border border-stone-200/60">
            <div>
              <span class="text-xs font-semibold text-stone-800 block">ปริมาณผลผลิตที่ได้ต่อ 1 รอบการทำ</span>
              <span class="text-[10px] text-stone-400">สูตรนี้ทำ 1 รอบ จะได้ปริมาณเนื้อวัตถุดิบพร้อมใช้เท่าใด</span>
            </div>
            <div class="flex items-center soft-input px-3 py-1.5 rounded-lg bg-stone-50">
              <input
                v-model.number="form.yieldQty"
                type="number"
                min="1"
                step="any"
                class="w-24 text-right font-number font-bold text-xs text-amber-950 bg-transparent focus:outline-none"
              />
              <span class="text-xs font-semibold text-stone-600 ml-1.5 shrink-0">{{ form.unit }}</span>
            </div>
          </div>

          <!-- รายการส่วนผสมในสูตร -->
          <div class="space-y-1.5">
            <div
              v-for="(row, idx) in form.subRecipe"
              :key="idx"
              class="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-stone-200/60 hover:border-amber-300 transition-colors"
            >
              <select
                v-model="row.materialId"
                class="flex-1 bg-transparent border-0 text-xs font-medium text-stone-900 focus:outline-none min-w-[120px] cursor-pointer"
              >
                <option
                  v-for="sub in availableSubMaterials"
                  :key="sub.id"
                  :value="sub.id"
                >
                  {{ sub.emoji }} {{ sub.name }} ({{ sub.unit }})
                </option>
              </select>

              <div class="flex items-center gap-1 bg-stone-50 px-2 py-1 rounded-lg border border-stone-200/60">
                <input
                  v-model.number="row.qty"
                  type="number"
                  min="0.01"
                  step="any"
                  placeholder="0"
                  class="w-18 text-right font-number font-semibold text-xs text-stone-900 bg-transparent focus:outline-none"
                />
                <span class="text-[10px] text-stone-500 w-6">
                  {{ getSubMat(row.materialId)?.unit || 'g' }}
                </span>
              </div>

              <span class="text-xs font-number font-medium text-stone-600 w-16 text-right">
                ฿{{ ((row.qty || 0) * (getSubMat(row.materialId)?.unitCost || 0)).toFixed(1) }}
              </span>

              <button
                type="button"
                @click="removeSubRecipeRow(idx)"
                class="p-1 text-stone-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                title="ลบส่วนผสมนี้"
              >
                <X class="w-3.5 h-3.5" />
              </button>
            </div>

            <div v-if="!form.subRecipe || form.subRecipe.length === 0" class="text-center py-4 text-xs text-stone-400">
              ยังไม่มีส่วนผสมในสูตร กดปุ่ม "+ เพิ่มส่วนผสม" ด้านบน
            </div>
          </div>

          <!-- Single Unified Recipe Cost Result Card (คำนวณอัตโนมัติ ไม่ต้องกดปุ่มซ้ำซ้อน) -->
          <div class="p-3 rounded-xl bg-white border border-stone-200/60 flex items-center justify-between">
            <div class="space-y-0.5">
              <span class="text-[10px] font-semibold text-stone-500 uppercase tracking-wide flex items-center gap-1">
                <span>💡</span>
                <span>ต้นทุนวัตถุดิบรวม</span>
              </span>
              <p class="text-[11px] text-stone-500 font-number">
                ฿{{ calculatedSubCost.toFixed(2) }} ÷ {{ (Number(form.yieldQty) || 1).toLocaleString() }} {{ form.unit }}
              </p>
            </div>
            <div class="text-right">
              <div class="text-sm font-bold font-number text-emerald-800">
                ฿{{ calculatedUnitCost.toFixed(4) }}
                <span class="text-[11px] font-normal text-stone-500 font-sans">/ {{ form.unit }}</span>
              </div>
              <span class="text-[10px] text-emerald-600/80 font-medium">คำนวณจากสูตรให้อัตโนมัติ</span>
            </div>
          </div>
        </div>

        <!-- Stock Stepper & Min Alert (Controls referencing primary pack units) (Requirement 2) -->
        <div class="grid grid-cols-2 gap-3">
          <!-- สต็อกปัจจุบัน -->
          <div class="p-3 rounded-xl bg-[#FAF9F6] border border-stone-200/70 space-y-1.5">
            <div class="flex items-center justify-between">
              <label class="text-[11px] font-semibold text-stone-700">
                สต็อกปัจจุบัน
              </label>
              <span class="text-[10px] font-semibold text-stone-500 font-number">
                = {{ (Number(form.stock) || 0).toLocaleString() }} {{ form.unit }}
              </span>
            </div>
            <div class="flex items-center gap-1.5">
              <button
                type="button"
                @click="stepStock(-1)"
                :disabled="packStockCount <= 0"
                class="w-8 h-8 rounded-lg bg-white border border-stone-200 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center font-bold text-stone-700 transition-colors cursor-pointer shrink-0"
                title="ลดสต็อก 1 แพ็ค"
              >
                <Minus class="w-3.5 h-3.5" />
              </button>
              <div class="flex-1 flex items-center bg-white border border-stone-200 px-2.5 py-1.5 rounded-lg justify-center focus-within:border-stone-400">
                <input
                  :value="displayStockPacks"
                  @input="onStockPacksInput($event.target.value)"
                  type="number"
                  min="0"
                  step="any"
                  class="w-full text-center font-number font-bold text-xs text-stone-900 bg-transparent focus:outline-none"
                />
                <span class="text-[10px] font-medium text-stone-500 ml-1 shrink-0">{{ form.packUnit || 'แพ็ค' }}</span>
              </div>
              <button
                type="button"
                @click="stepStock(1)"
                class="w-8 h-8 rounded-lg bg-white border border-stone-200 hover:bg-stone-100 flex items-center justify-center font-bold text-stone-700 transition-colors cursor-pointer shrink-0"
                title="เพิ่มสต็อก 1 แพ็ค"
              >
                <Plus class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <!-- แจ้งเตือนเมื่อต่ำกว่า -->
          <div class="p-3 rounded-xl bg-[#FAF9F6] border border-stone-200/70 space-y-1.5">
            <div class="flex items-center justify-between">
              <label class="text-[11px] font-semibold text-stone-700">
                เตือนเมื่อต่ำกว่า
              </label>
              <span class="text-[10px] font-semibold text-stone-500 font-number">
                = {{ (Number(form.minAlert) || 0).toLocaleString() }} {{ form.unit }}
              </span>
            </div>
            <div class="flex items-center gap-1.5">
              <button
                type="button"
                @click="stepMinAlert(-1)"
                :disabled="packMinAlertCount <= 0"
                class="w-8 h-8 rounded-lg bg-white border border-stone-200 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center font-bold text-stone-700 transition-colors cursor-pointer shrink-0"
                title="ลดการเตือน 1 แพ็ค"
              >
                <Minus class="w-3.5 h-3.5" />
              </button>
              <div class="flex-1 flex items-center bg-white border border-stone-200 px-2.5 py-1.5 rounded-lg justify-center focus-within:border-stone-400">
                <input
                  :value="displayMinAlertPacks"
                  @input="onMinAlertPacksInput($event.target.value)"
                  type="number"
                  min="0"
                  step="any"
                  class="w-full text-center font-number font-bold text-xs text-stone-900 bg-transparent focus:outline-none"
                />
                <span class="text-[10px] font-medium text-stone-500 ml-1 shrink-0">{{ form.packUnit || 'แพ็ค' }}</span>
              </div>
              <button
                type="button"
                @click="stepMinAlert(1)"
                class="w-8 h-8 rounded-lg bg-white border border-stone-200 hover:bg-stone-100 flex items-center justify-center font-bold text-stone-700 transition-colors cursor-pointer shrink-0"
                title="เพิ่มการเตือน 1 แพ็ค"
              >
                <Plus class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

      </div>

      <!-- 3. Clean Modal Footer -->
      <div class="px-6 py-3.5 border-t border-stone-100 bg-white flex items-center justify-end gap-2.5 shrink-0">
        <button
          type="button"
          @click="requestClose(close)"
          class="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
        >
          ยกเลิก
        </button>
        <button
          type="button"
          @click="submit"
          class="px-5 py-2 text-xs font-semibold bg-stone-900 hover:bg-stone-800 text-white rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <Check class="w-3.5 h-3.5" />
          <span>บันทึก</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { usePosStore } from '@/stores/posStore'
import { useModalForm } from '@/composables/useModalForm'
import { X, Check, Plus, Minus } from 'lucide-vue-next'

const store = usePosStore()

// Unit Options restricted strictly to 3 choices as requested: มล. (ml), กรัม (g), ชิ้น (pcs)
const unitOptions = [
  { value: 'g', label: 'กรัม (g)', icon: '⚖️' },
  { value: 'ml', label: 'มล. (ml)', icon: '🥛' },
  { value: 'ชิ้น', label: 'ชิ้น (pcs)', icon: '📦' }
]

const form = ref({
  id: '',
  name: '',
  category: 'Base Yogurt',
  unit: 'g',
  packUnit: 'ถุง',
  packSize: 1000,
  packCost: 0,
  unitCost: 0,
  stock: 0,
  minAlert: 200,
  emoji: '🥣',
  isSubIngredient: false,
  hasSubRecipe: false, // Default is OFF (ปิด) as requested!
  yieldQty: 1000,
  subRecipe: []
})

const { saveSnapshot, requestClose, confirmSave } = useModalForm(() => form.value)

const isEditing = computed(() => Boolean(store.modals.materialEdit.materialId))

const availableSubMaterials = computed(() => {
  return store.materials.filter(m => !m.isDeleted && m.id !== form.value.id)
})

function getSubMat(matId) {
  return store.matMap[matId]
}

// Single Unified Unit Cost Calculation (Requirement 1)
const calculatedSubCost = computed(() => {
  if (!form.value.subRecipe || form.value.subRecipe.length === 0) return 0
  return form.value.subRecipe.reduce((sum, row) => {
    const sub = store.matMap[row.materialId]
    const cost = sub ? sub.unitCost : 0
    return sum + ((Number(row.qty) || 0) * cost)
  }, 0)
})

const calculatedUnitCost = computed(() => {
  if (form.value.hasSubRecipe) {
    const yieldQ = Number(form.value.yieldQty) || 1
    return yieldQ > 0 ? Number((calculatedSubCost.value / yieldQ).toFixed(4)) : 0
  }
  const size = Number(form.value.packSize) || 1
  const cost = Number(form.value.packCost) || 0
  return size > 0 ? Number((cost / size).toFixed(4)) : 0
})

// Set Unit Handler
function setUnit(newUnit) {
  form.value.unit = newUnit
  if (!isEditing.value) {
    if (newUnit === 'g') {
      if (!form.value.packUnit || form.value.packUnit === 'ขวด' || form.value.packUnit === 'แพ็ค') form.value.packUnit = 'ถุง'
      if (!form.value.packSize || form.value.packSize === 1200 || form.value.packSize === 100) form.value.packSize = 1000
    } else if (newUnit === 'ml') {
      if (!form.value.packUnit || form.value.packUnit === 'ถุง' || form.value.packUnit === 'แพ็ค') form.value.packUnit = 'ขวด'
      if (!form.value.packSize || form.value.packSize === 1000 || form.value.packSize === 100) form.value.packSize = 1200
    } else if (newUnit === 'ชิ้น') {
      if (!form.value.packUnit || form.value.packUnit === 'ถุง' || form.value.packUnit === 'ขวด') form.value.packUnit = 'แพ็ค'
      if (!form.value.packSize || form.value.packSize === 1000 || form.value.packSize === 1200) form.value.packSize = 100
    }
  }
}

function setSingleUnitPack() {
  form.value.packUnit = form.value.unit === 'ชิ้น' ? 'ชิ้น' : 'ชิ้นเดี่ยว'
  form.value.packSize = 1
  form.value.packCost = calculatedUnitCost.value || 0
}

// Stepper Logic for Stock & Min Alert referencing Pack Units (Requirement 2)
const packStockCount = computed(() => {
  const pSize = Number(form.value.packSize) || 1
  if (pSize <= 0) return 0
  return Number((form.value.stock / pSize).toFixed(2))
})

const displayStockPacks = computed(() => {
  const pSize = Number(form.value.packSize) || 1
  if (pSize <= 0) return 0
  const count = form.value.stock / pSize
  return Number.isInteger(count) ? count : Number(count.toFixed(2))
})

function onStockPacksInput(val) {
  const num = parseFloat(val)
  const pSize = Number(form.value.packSize) || 1
  if (isNaN(num) || num < 0) {
    form.value.stock = 0
  } else {
    form.value.stock = Math.round(num * pSize * 100) / 100
  }
}

function stepStock(delta) {
  const pSize = Number(form.value.packSize) || 1
  const current = form.value.stock / pSize
  const next = Math.max(0, Math.round((current + delta) * 10) / 10)
  form.value.stock = Math.round(next * pSize * 100) / 100
}

const packMinAlertCount = computed(() => {
  const pSize = Number(form.value.packSize) || 1
  if (pSize <= 0) return 0
  return Number((form.value.minAlert / pSize).toFixed(2))
})

const displayMinAlertPacks = computed(() => {
  const pSize = Number(form.value.packSize) || 1
  if (pSize <= 0) return 0
  const count = form.value.minAlert / pSize
  return Number.isInteger(count) ? count : Number(count.toFixed(2))
})

function onMinAlertPacksInput(val) {
  const num = parseFloat(val)
  const pSize = Number(form.value.packSize) || 1
  if (isNaN(num) || num < 0) {
    form.value.minAlert = 0
  } else {
    form.value.minAlert = Math.round(num * pSize * 100) / 100
  }
}

function stepMinAlert(delta) {
  const pSize = Number(form.value.packSize) || 1
  const current = form.value.minAlert / pSize
  const next = Math.max(0, Math.round((current + delta) * 10) / 10)
  form.value.minAlert = Math.round(next * pSize * 100) / 100
}

// Sub-Recipe helpers
function addSubRecipeRow() {
  const defaultSubId = store.subMaterials[0]?.id || availableSubMaterials.value[0]?.id
  if (!defaultSubId) {
    store.showToast('ยังไม่มีรายการวัตถุดิบรองในระบบ กรุณาสร้างวัตถุดิบรองก่อน (เช่น นมสด หรือหัวเชื้อ)', 'error')
    return
  }
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

// Watch subrecipe toggle changes to adapt packUnit
watch(() => form.value.hasSubRecipe, (newVal) => {
  if (newVal) {
    if (!form.value.packUnit || form.value.packUnit === 'ถุง' || form.value.packUnit === 'ขวด' || form.value.packUnit === 'แพ็ค') {
      form.value.packUnit = 'รอบ'
    }
    form.value.isSubIngredient = false
  } else {
    if (form.value.packUnit === 'รอบ') {
      form.value.packUnit = form.value.unit === 'ml' ? 'ขวด' : (form.value.unit === 'g' ? 'ถุง' : 'แพ็ค')
    }
  }
})

// Initialize form on open
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
        unit: ['g', 'ml', 'ชิ้น'].includes(mat.unit) ? mat.unit : (mat.unit === 'pcs' ? 'ชิ้น' : 'g'),
        packUnit: pUnit,
        packSize: pSize,
        packCost: pCost,
        unitCost: uCost,
        stock: Number(mat.stock) || 0,
        minAlert: Number(mat.minAlert) || 0,
        emoji: mat.emoji || '🥣',
        isSubIngredient: Boolean(mat.isSubIngredient),
        hasSubRecipe: Boolean(mat.hasSubRecipe),
        yieldQty: mat.yieldQty ? Number(mat.yieldQty) : 1000,
        subRecipe: mat.subRecipe && Array.isArray(mat.subRecipe) && mat.subRecipe.length > 0
          ? JSON.parse(JSON.stringify(mat.subRecipe))
          : [
              { materialId: store.subMaterials[0]?.id || 'MAT002', qty: 5000 },
              ...(store.subMaterials[1] ? [{ materialId: store.subMaterials[1].id, qty: 300 }] : [])
            ]
      }
    } else {
      // New Material: Clean neutral defaults, hasSubRecipe is OFF
      const defaultCategory = store.materialCategories[0]?.name || 'Base Yogurt'
      form.value = {
        id: '',
        name: '',
        category: defaultCategory,
        unit: 'g',
        packUnit: 'ถุง',
        packSize: 1000,
        packCost: 0,
        unitCost: 0,
        stock: 0,
        minAlert: 200,
        emoji: '🥣',
        isSubIngredient: false,
        hasSubRecipe: false,
        yieldQty: 1000,
        subRecipe: store.subMaterials.length > 0
          ? [
              { materialId: store.subMaterials[0].id, qty: 1000 },
              ...(store.subMaterials[1] ? [{ materialId: store.subMaterials[1].id, qty: 100 }] : [])
            ]
          : []
      }
    }

    nextTick(() => {
      saveSnapshot()
    })
  }
})

function close() {
  store.modals.materialEdit.isOpen = false
  store.modals.materialEdit.materialId = null
}

async function submit() {
  if (!form.value.name.trim()) {
    store.showToast('กรุณากรอกชื่อวัตถุดิบ', 'error')
    return
  }

  const ok = await confirmSave(form.value.name.trim())
  if (!ok) return

  const hasRecipe = Boolean(form.value.hasSubRecipe)
  const catName = (form.value.category || '').toLowerCase()
  const isSub = !hasRecipe && (
    Boolean(form.value.isSubIngredient) ||
    catName.includes('รอง') ||
    catName.includes('sub')
  )

  let pSize = 1
  let pCost = 0
  let uCost = calculatedUnitCost.value

  if (hasRecipe) {
    pSize = Number(form.value.yieldQty) > 0 ? Number(form.value.yieldQty) : 1000
    pCost = calculatedSubCost.value
    if (!form.value.packUnit || form.value.packUnit === 'ถุง' || form.value.packUnit === 'ขวด' || form.value.packUnit === 'แพ็ค') {
      form.value.packUnit = 'รอบ'
    }
  } else {
    pSize = Number(form.value.packSize) > 0 ? Number(form.value.packSize) : 1
    pCost = Number(form.value.packCost) >= 0 ? Number(form.value.packCost) : 0
  }

  store.saveMaterial({
    id: form.value.id || undefined,
    name: form.value.name.trim(),
    category: form.value.category,
    unit: form.value.unit || 'g',
    packUnit: form.value.packUnit?.trim() || 'แพ็ค',
    packSize: pSize,
    packCost: pCost,
    stock: Number(form.value.stock) || 0,
    minAlert: Number(form.value.minAlert) || 0,
    unitCost: Math.round(uCost * 10000) / 10000,
    emoji: form.value.emoji || '🥣',
    isSubIngredient: isSub,
    hasSubRecipe: hasRecipe,
    yieldQty: hasRecipe ? pSize : undefined,
    subRecipe: hasRecipe
      ? form.value.subRecipe
          .filter(r => r.materialId && r.qty > 0)
          .map(r => ({ materialId: r.materialId, qty: Number(r.qty) }))
      : []
  })

  close()
}
</script>
