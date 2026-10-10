<template>
  <ModalShell labelled-by="MaterialEditModal-title" :open="store.modals.materialEdit.isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-stone-900/40 backdrop-blur-xs"
    @request-close="requestClose(close)"
  >
    <div class="bg-white rounded-2xl border border-stone-200/80 shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
      
      <!-- 1. Header with Dynamic Title & Sub-Recipe Switch (Requirement 4) -->
      <div class="px-4 sm:px-6 py-4 border-b border-stone-100 flex flex-wrap sm:flex-nowrap items-center justify-between gap-y-3 bg-white shrink-0">
        <div class="min-w-0 w-full sm:w-auto sm:flex-1 sm:pr-3">
          <div class="flex items-center gap-2">
            <h3 id="MaterialEditModal-title" class="text-sm font-semibold text-stone-900 truncate">
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
              ? 'ตั้งสูตรส่วนผสม คำนวณต้นทุนรวมและตัดสต็อกวัตถุดิบรองอัตโนมัติ' 
              : 'ระบุหน่วยนับ ข้อมูลแพ็คสั่งซื้อ และสต็อกปัจจุบัน' 
            }}
          </p>
        </div>

        <div class="flex items-center justify-between sm:justify-end gap-3 shrink-0 w-full sm:w-auto">
          <!-- Switch Button: ผลิตจากวัตถุดิบอื่น (Header toggle, only for main materials) -->
          <AppCheckbox v-model="form.hasSubRecipe" variant="switch" label="ผลิตจากวัตถุดิบอื่น"
            v-if="!form.isSubIngredient"
            class="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border cursor-pointer select-none transition-all"
            :class="form.hasSubRecipe ? 'bg-brand-50 border-brand-200 text-brand-600' : 'bg-stone-50 border-stone-200/80 text-stone-700 hover:border-stone-300'"
            title="เปิดหากเป็นวัตถุดิบที่ต้องปรุง/ผลิตจากวัตถุดิบอื่น"
          >
            <span class="text-[11px] font-semibold flex items-center gap-1.5">
              <span class="text-xs">🥣</span>
              <span>ผลิตจากวัตถุดิบอื่น</span>
            </span>
          </AppCheckbox>

          <!-- Close Modal Button -->
          <button 
            type="button"
            @click="requestClose(close)" 
            class="ml-auto text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
           aria-label="ปิดหน้าต่าง">
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
              @click="setRole(false)"
              :class="!form.isSubIngredient ? 'bg-brand-600 text-white shadow-2xs font-bold' : 'text-stone-600 hover:text-stone-900'"
              class="px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer"
            >
              <span>🥣 วัตถุดิบหลัก</span>
            </button>
            <button
              type="button"
              @click="setRole(true)"
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
            <AppSelect aria-label="หมวดหมู่"
              v-model="form.category"
              class="w-full"
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
            </AppSelect>
          </div>
        </div>

        <!-- Unit Selection (Strictly 3 choices: ml, g, ชิ้น) -->
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
                ? 'bg-brand-600 text-white font-semibold shadow-xs'
                : 'bg-[#FBF5EA] border border-stone-200/80 hover:bg-stone-100 text-stone-700'"
              class="py-2 px-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span class="text-sm">{{ u.icon }}</span>
              <span>{{ u.label }}</span>
            </button>
          </div>
        </div>

        <!-- Cost & Packaging: Standard Purchased Material -->
        <div v-if="!form.hasSubRecipe" class="rounded-2xl border border-stone-200/80 bg-[#FBF5EA] p-4 space-y-3">
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

          <!-- Single Unified Cost Result Card (2 Decimals Clean) -->
          <div class="p-3 rounded-xl bg-white border border-stone-200/60 flex items-center justify-between">
            <div class="space-y-0.5">
              <span class="text-[10px] font-semibold text-stone-500 uppercase tracking-wide flex items-center gap-1">
                <span>💡</span>
                <span>ต้นทุนเฉลี่ยต่อหน่วยใช้งาน</span>
              </span>
              <p class="text-[11px] text-stone-400 font-number">
                ฿{{ (Number(form.packCost) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ÷ {{ (Number(form.packSize) || 1).toLocaleString() }} {{ form.unit }}
              </p>
            </div>
            <div class="text-right">
              <div class="text-sm font-bold font-number text-emerald-800">
                ฿{{ calculatedUnitCost.toFixed(2) }}
                <span class="text-[11px] font-normal text-stone-500 font-sans">/ {{ form.unit }}</span>
              </div>
              <span class="text-[10px] text-emerald-600/80 font-medium">นำไปตัดสต็อก & คิดกำไรอัตโนมัติ</span>
            </div>
          </div>
        </div>

        <!-- Sub-Recipe Builder Section: Produced Material (Clean Airy UI & 2 Decimals) -->
        <div v-if="form.hasSubRecipe" class="rounded-2xl border border-amber-200/80 bg-[#FCFBF8] p-4 space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="font-semibold text-stone-800 text-xs flex items-center gap-1.5">
                <span>🥣</span>
                <span>สูตรการผลิต (Sub-Recipe)</span>
              </span>
              <!-- Max Batches Badge -->
              <span 
                v-if="form.subRecipe && form.subRecipe.length > 0"
                class="px-2 py-0.5 rounded-md font-number font-semibold text-[10px]"
                :class="maxPossibleProductionRounds > 0 ? 'bg-amber-100 text-amber-900' : 'bg-rose-100 text-rose-700'"
              >
                ผลิตได้สูงสุด: {{ maxPossibleProductionRounds }} รอบ
              </span>
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

          <!-- ปริมาณผลผลิตต่อ 1 รอบ -->
          <div class="flex items-center justify-between p-2.5 rounded-xl bg-white border border-stone-200/60">
            <div>
              <span class="text-xs font-semibold text-stone-800 block">ผลผลิตต่อ 1 รอบ</span>
              <span class="text-[10px] text-stone-400">ปริมาณเนื้อวัตถุดิบที่ได้ต่อ 1 หม้อ/รอบ</span>
            </div>
            <div class="flex items-center soft-input px-3 py-1 rounded-lg bg-stone-50">
              <input
                v-model.number="form.yieldQty"
                type="number"
                min="1"
                step="any"
                class="w-20 text-right font-number font-bold text-xs text-amber-950 bg-transparent focus:outline-none"
              />
              <span class="text-xs font-semibold text-stone-600 ml-1.5 shrink-0">{{ form.unit }}</span>
            </div>
          </div>

          <!-- รายการส่วนผสมในสูตร (Clean, Minimal & Airy rows) -->
          <div class="space-y-2">
            <div
              v-for="(row, idx) in form.subRecipe"
              :key="idx"
              class="bg-white p-2.5 rounded-xl border border-stone-200/60 hover:border-amber-300 transition-colors space-y-1.5"
            >
              <!-- Primary Line: Material, Qty, Cost, Delete -->
              <div class="flex items-center gap-2">
                <AppSelect aria-label="วัตถุดิบในสูตร"
                  v-model="row.materialId"
                  class="flex-1"
                >
                  <option
                    v-for="sub in availableSubMaterials"
                    :key="sub.id"
                    :value="sub.id"
                  >
                    {{ sub.emoji }} {{ sub.name }} ({{ sub.unit }})
                  </option>
                </AppSelect>

                <div class="flex items-center gap-1 bg-stone-50/70 px-2 py-1 rounded-lg border border-stone-200/70">
                  <span class="text-[10px] text-stone-400">ใช้</span>
                  <input
                    v-model.number="row.qty"
                    type="number"
                    min="0.01"
                    step="any"
                    placeholder="0"
                    class="w-16 text-right font-number font-semibold text-xs text-stone-900 bg-transparent focus:outline-none"
                  />
                  <span class="text-[10px] text-stone-500 w-6">
                    {{ getSubMat(row.materialId)?.unit || 'g' }}
                  </span>
                </div>

                <span class="text-xs font-number font-semibold text-stone-700 w-14 text-right">
                  ฿{{ ((row.qty || 0) * (getSubMat(row.materialId)?.unitCost || 0)).toFixed(2) }}
                </span>

                <button
                  type="button"
                  @click="removeSubRecipeRow(idx)"
                  class="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                  title="ลบส่วนผสมนี้"
                 aria-label="ปิดหน้าต่าง">
                  <X class="w-3.5 h-3.5" />
                </button>
              </div>

              <!-- Sleek Meta Status Line (Clean, No Visual Clutter) -->
              <div 
                v-if="compMap[row.materialId]" 
                class="flex items-center justify-between text-[11px] text-stone-500 pt-0.5"
              >
                <div class="flex items-center gap-1.5 font-number">
                  <span class="text-stone-400">คลังมี:</span>
                  <span class="font-medium text-stone-700">{{ compMap[row.materialId].currentStock.toLocaleString() }} {{ compMap[row.materialId].unit }}</span>
                  <template v-if="compMap[row.materialId].usedQty > 0">
                    <span class="text-stone-300">→</span>
                    <span class="text-stone-400">หลังทำ:</span>
                    <span 
                      class="font-semibold"
                      :class="compMap[row.materialId].status === 'out_of_stock' ? 'text-rose-600' : (compMap[row.materialId].status === 'low_stock' ? 'text-amber-600' : 'text-stone-800')"
                    >
                      {{ compMap[row.materialId].remaining.toLocaleString() }} {{ compMap[row.materialId].unit }}
                    </span>
                  </template>
                </div>

                <!-- Only show badge when low or out of stock -->
                <span
                  v-if="compMap[row.materialId].status !== 'sufficient'"
                  class="px-2 py-0.5 rounded-md text-[10px] font-semibold shrink-0"
                  :class="compMap[row.materialId].status === 'out_of_stock'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                    : 'bg-amber-50 text-amber-800 border border-amber-200/60'"
                >
                  {{ compMap[row.materialId].status === 'out_of_stock' ? '❌ ไม่พอผลิต' : '⚠️ ใกล้หมด' }}
                </span>
              </div>
            </div>

            <div v-if="!form.subRecipe || form.subRecipe.length === 0" class="text-center py-4 text-xs text-stone-400">
              ยังไม่มีส่วนผสมในสูตร กดปุ่ม "+ เพิ่มส่วนผสม" ด้านบน
            </div>
          </div>

          <!-- Single Unified Recipe Cost Result Card (2 Decimals Clean) -->
          <div class="p-3 rounded-xl bg-white border border-stone-200/60 flex items-center justify-between">
            <div class="space-y-0.5">
              <span class="text-[10px] font-semibold text-stone-500 uppercase tracking-wide flex items-center gap-1">
                <span>💡</span>
                <span>ต้นทุนวัตถุดิบรวมต่อรอบ</span>
              </span>
              <p class="text-[11px] text-stone-400 font-number">
                ฿{{ calculatedSubCost.toFixed(2) }} ÷ {{ (Number(form.yieldQty) || 1).toLocaleString() }} {{ form.unit }}
              </p>
            </div>
            <div class="text-right">
              <div class="text-sm font-bold font-number text-emerald-800">
                ฿{{ calculatedUnitCost.toFixed(2) }}
                <span class="text-[11px] font-normal text-stone-500 font-sans">/ {{ form.unit }}</span>
              </div>
              <span class="text-[10px] text-emerald-600/80 font-medium">คำนวณจากสูตรอัตโนมัติ</span>
            </div>
          </div>
        </div>

        <!-- Stock Stepper & Min Alert (Controls referencing primary pack units / rounds) -->
        <div class="grid grid-cols-2 gap-3">
          <!-- สต็อกปัจจุบัน -->
          <div class="p-3 rounded-xl bg-[#FBF5EA] border border-stone-200/70 space-y-1.5">
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
                :disabled="form.hasSubRecipe ? (form.stock <= initialStock) : (packStockCount <= 0)"
                class="w-8 h-8 rounded-lg bg-white border border-stone-200 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center font-bold text-stone-700 transition-colors cursor-pointer shrink-0"
                :title="form.hasSubRecipe ? (form.stock > initialStock ? 'ยกเลิกการผลิต 1 รอบ' : 'วัตถุดิบที่ผลิตไว้แล้ว ไม่สามารถลดยอดได้') : 'ลดสต็อก 1 แพ็ค'"
              >
                <Minus class="w-3.5 h-3.5" />
              </button>
              <div class="flex-1 flex items-center bg-white border border-stone-200 px-2.5 py-1.5 rounded-lg justify-center focus-within:border-brand-600">
                <input
                  :value="displayStockPacks"
                  @input="onStockPacksInput($event.target.value)"
                  type="number"
                  min="0"
                  step="any"
                  class="w-full text-center font-number font-bold text-xs text-stone-900 bg-transparent focus:outline-none"
                />
                <span class="text-[10px] font-medium text-stone-500 ml-1 shrink-0">
                  {{ form.hasSubRecipe ? 'รอบ' : (form.packUnit || 'แพ็ค') }}
                </span>
              </div>
              <button
                type="button"
                @click="stepStock(1)"
                :disabled="form.hasSubRecipe && !canAddRound"
                class="w-8 h-8 rounded-lg bg-white border border-stone-200 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center font-bold text-stone-700 transition-colors cursor-pointer shrink-0"
                :title="form.hasSubRecipe ? (canAddRound ? 'เพิ่ม 1 รอบผลิต (หักวัตถุดิบรอง)' : 'วัตถุดิบรองไม่พอผลิตเพิ่ม') : 'เพิ่มสต็อก 1 แพ็ค'"
              >
                <Plus class="w-3.5 h-3.5" />
              </button>
            </div>
            <p v-if="form.hasSubRecipe && !canAddRound" class="text-[9px] text-rose-600 font-medium">
              * วัตถุดิบรองในคลังหมด ไม่พอผลิตเพิ่ม
            </p>
          </div>

          <!-- แจ้งเตือนเมื่อต่ำกว่า -->
          <div class="p-3 rounded-xl bg-[#FBF5EA] border border-stone-200/70 space-y-1.5">
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
              <div class="flex-1 flex items-center bg-white border border-stone-200 px-2.5 py-1.5 rounded-lg justify-center focus-within:border-brand-600">
                <input
                  :value="displayMinAlertPacks"
                  @input="onMinAlertPacksInput($event.target.value)"
                  type="number"
                  min="0"
                  step="any"
                  class="w-full text-center font-number font-bold text-xs text-stone-900 bg-transparent focus:outline-none"
                />
                <span class="text-[10px] font-medium text-stone-500 ml-1 shrink-0">
                  {{ form.hasSubRecipe ? 'รอบ' : (form.packUnit || 'แพ็ค') }}
                </span>
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

        <!-- อายุการเก็บรักษา (วัน) Simple & Compact -->
        <div class="p-3 rounded-xl bg-[#FBF5EA] border border-stone-200/70 flex items-center justify-between">
          <div>
            <label class="text-[11px] font-semibold text-stone-700 block">
              อายุการเก็บรักษา (Shelf-life)
            </label>
            <span class="text-[10px] text-stone-400">
              ใช้คำนวณวันหมดอายุอัตโนมัติ (เว้นว่างได้สำหรับบรรจุภัณฑ์)
            </span>
          </div>
          <div class="flex items-center gap-1.5 w-28">
            <input
              v-model.number="form.shelfLifeDays"
              type="number"
              min="0"
              placeholder="ไม่ระบุ"
              class="soft-input w-full px-2.5 py-1.5 rounded-lg text-right text-xs font-number font-semibold text-stone-900 bg-white"
            />
            <span class="text-xs text-stone-500 shrink-0 font-medium">วัน</span>
          </div>
        </div>

      </div>

      <!-- 3. Clean Modal Footer -->
      <div class="px-6 py-3.5 border-t border-stone-100 bg-white flex items-center justify-between shrink-0">
        <div v-if="isEditing" class="flex items-center gap-2">
          <button
            type="button"
            @click="handleArchiveToggle"
            class="px-3 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
            :title="form.isDeleted ? 'ยกเลิกการจัดเก็บ คืนสู่วัตถุดิบใช้งานปกติ' : 'จัดเก็บวัตถุดิบเพื่อซ่อนจากหน้าหลัก'"
          >
            <Archive class="w-3.5 h-3.5 text-stone-500" />
            <span>{{ form.isDeleted ? 'ยกเลิกจัดเก็บ' : 'จัดเก็บ' }}</span>
          </button>
          <button
            type="button"
            @click="handlePermanentDelete"
            class="px-3 py-2 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
            title="ลบวัตถุดิบนี้ออกจากระบบอย่างถาวร"
          >
            <Trash2 class="w-3.5 h-3.5" />
            <span>ลบถาวร</span>
          </button>
        </div>
        <div v-else></div>

        <div class="flex items-center gap-2.5">
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
            class="px-5 py-2 text-xs font-semibold bg-brand-600 hover:bg-brand-800 text-white rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Check class="w-3.5 h-3.5" />
            <span>บันทึก</span>
          </button>
        </div>
      </div>
    </div>
  </ModalShell>
</template>

<script setup>
import AppSelect from '@/components/ui/AppSelect.vue'
import AppCheckbox from '@/components/ui/AppCheckbox.vue'
import ModalShell from '@/components/ui/ModalShell.vue'
import { ref, computed, watch, nextTick } from 'vue'
import { usePosStore } from '@/stores/posStore'
import { useModalForm } from '@/composables/useModalForm'
import { X, Check, Plus, Minus, Archive, Trash2 } from 'lucide-vue-next'

const store = usePosStore()

// Unit Options restricted strictly to 3 choices: มล. (ml), กรัม (g), ชิ้น (pcs)
const unitOptions = [
  { value: 'g', label: 'กรัม (g)', icon: '⚖️' },
  { value: 'ml', label: 'มล. (ml)', icon: '🥛' },
  { value: 'ชิ้น', label: 'ชิ้น (pcs)', icon: '📦' }
]

const initialStock = ref(0) // Tracks existing stock on open to deduct only incremental rounds
const hasConfirmedLowStock = ref(false) // Tracks if user already confirmed low-stock warning once (เตือน 1 รอบพอ)

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
  hasSubRecipe: false, // Default is OFF
  yieldQty: 540,
  subRecipe: [],
  shelfLifeDays: null
})

const { saveSnapshot, requestClose, confirmSave } = useModalForm(() => form.value)

const isEditing = computed(() => Boolean(store.modals.materialEdit.materialId))

const availableSubMaterials = computed(() => {
  return store.materials.filter(m => !m.isDeleted && m.id !== form.value.id)
})

function getSubMat(matId) {
  return store.matMap[matId]
}

// Single Unified Unit Cost Calculation (2 decimals)
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
    return yieldQ > 0 ? Number((calculatedSubCost.value / yieldQ).toFixed(2)) : 0
  }
  const size = Number(form.value.packSize) || 1
  const cost = Number(form.value.packCost) || 0
  return size > 0 ? Number((cost / size).toFixed(2)) : 0
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

// -------------------------------------------------------------
// Real-time Sub-Ingredient Stock Comparison & Production Limit Logic
// -------------------------------------------------------------
const roundYield = computed(() => {
  return Number(form.value.yieldQty) > 0 ? Number(form.value.yieldQty) : 1
})

const currentRounds = computed(() => {
  return (Number(form.value.stock) || 0) / roundYield.value
})

const initialRounds = computed(() => {
  return initialStock.value / roundYield.value
})

const incrementalRounds = computed(() => {
  return Math.max(0, currentRounds.value - initialRounds.value)
})

const recipeComparison = computed(() => {
  if (!form.value.hasSubRecipe) return []
  const inc = incrementalRounds.value

  return (form.value.subRecipe || []).map(row => {
    const sub = store.matMap[row.materialId]
    const currentStock = sub ? Number(sub.stock) || 0 : 0
    const minAlert = sub ? Number(sub.minAlert) || 0 : 0
    const qtyPerRound = Number(row.qty) || 0
    const usedQty = Math.round(inc * qtyPerRound * 100) / 100
    const remaining = Math.round((currentStock - usedQty) * 100) / 100
    const canAffordNextRound = qtyPerRound > 0 ? (remaining >= qtyPerRound) : true

    let status = 'sufficient'
    if (remaining < 0) {
      status = 'out_of_stock'
    } else if (remaining <= minAlert) {
      status = 'low_stock'
    }

    return {
      materialId: row.materialId,
      name: sub?.name || 'วัตถุดิบ',
      emoji: sub?.emoji || '🥛',
      unit: sub?.unit || 'g',
      currentStock,
      minAlert,
      qtyPerRound,
      usedQty,
      remaining,
      status,
      canAffordNextRound
    }
  })
})

const compMap = computed(() => {
  return Object.fromEntries(recipeComparison.value.map(c => [c.materialId, c]))
})

// Can add another round? Checked against all sub-ingredients
const canAddRound = computed(() => {
  if (!form.value.hasSubRecipe) return true
  if (!form.value.subRecipe || form.value.subRecipe.length === 0) return true
  return recipeComparison.value.every(i => i.canAffordNextRound)
})

// Max possible total rounds that can be produced based on available sub-ingredients
const maxPossibleProductionRounds = computed(() => {
  if (!form.value.hasSubRecipe || !form.value.subRecipe || form.value.subRecipe.length === 0) return 999
  let minAdditionalRounds = 999999

  for (const row of form.value.subRecipe) {
    const sub = store.matMap[row.materialId]
    const currentStock = sub ? Number(sub.stock) || 0 : 0
    const qtyPerRound = Number(row.qty) || 0
    if (qtyPerRound > 0) {
      const canProduce = Math.floor(currentStock / qtyPerRound)
      if (canProduce < minAdditionalRounds) minAdditionalRounds = canProduce
    }
  }

  const additional = minAdditionalRounds === 999999 ? 0 : minAdditionalRounds
  return Math.round((initialRounds.value + additional) * 10) / 10
})

// -------------------------------------------------------------
// Stepper Logic for Stock & Min Alert
// -------------------------------------------------------------
const packStockCount = computed(() => {
  const pSize = form.value.hasSubRecipe ? roundYield.value : (Number(form.value.packSize) || 1)
  if (pSize <= 0) return 0
  return Number((form.value.stock / pSize).toFixed(2))
})

const displayStockPacks = computed(() => {
  const pSize = form.value.hasSubRecipe ? roundYield.value : (Number(form.value.packSize) || 1)
  if (pSize <= 0) return 0
  const count = form.value.stock / pSize
  return Number.isInteger(count) ? count : Number(count.toFixed(2))
})

function onStockPacksInput(val) {
  const num = parseFloat(val)
  const pSize = form.value.hasSubRecipe ? roundYield.value : (Number(form.value.packSize) || 1)
  if (isNaN(num) || num < 0) {
    form.value.stock = 0
  } else {
    if (form.value.hasSubRecipe && num > maxPossibleProductionRounds.value) {
      store.showToast(`วัตถุดิบรองในคลังพอผลิตได้สูงสุดเพียง ${maxPossibleProductionRounds.value} รอบ`, 'error')
      form.value.stock = Math.round(maxPossibleProductionRounds.value * pSize * 100) / 100
    } else {
      form.value.stock = Math.round(num * pSize * 100) / 100
    }
  }
}

async function stepStock(delta) {
  const pSize = form.value.hasSubRecipe ? roundYield.value : (Number(form.value.packSize) || 1)

  if (delta > 0) {
    if (form.value.hasSubRecipe) {
      // Check 1: Is any sub-ingredient out of stock?
      if (!canAddRound.value) {
        store.showToast('วัตถุดิบรองในคลังหมด ไม่สามารถเพิ่มรอบผลิตได้', 'error')
        return
      }

      // Check 2: Will any sub-ingredient drop below minAlert?
      // User requested: "เตือนวัตถุดิบใกล้หมด 1 รอบพอ ตอนกด + ไม่ต้องแสดงทุกรอบ"
      const lowItems = recipeComparison.value.filter(item => {
        const nextRemaining = item.remaining - item.qtyPerRound
        return nextRemaining <= item.minAlert
      })

      if (lowItems.length > 0 && !hasConfirmedLowStock.value) {
        const warningLines = lowItems.map(i => `• ${i.name}: จะเหลือ ${(i.remaining - i.qtyPerRound).toLocaleString()} ${i.unit} (จุดเตือน ${i.minAlert.toLocaleString()} ${i.unit})`).join('\n')
        const ok = await store.confirmDialog({
          title: 'วัตถุดิบรองใกล้หมดสต็อก',
          message: `การผลิตเพิ่มจะทำให้วัตถุดิบรองในคลังลดลงต่ำกว่าจุดเตือนขั้นต่ำ:\n\n${warningLines}\n\nต้องการยืนยันเพิ่มรอบผลิตต่อหรือไม่?`,
          confirmText: 'ยืนยันผลิตต่อ',
          cancelText: 'ยกเลิก',
          type: 'warning'
        })
        if (!ok) return
        hasConfirmedLowStock.value = true // Warn once only per session!
      }
    }

    const current = form.value.stock / pSize
    const next = Math.round((current + delta) * 10) / 10
    form.value.stock = Math.round(next * pSize * 100) / 100
  } else {
    // Delta < 0
    if (form.value.hasSubRecipe && form.value.stock <= initialStock.value) {
      store.showToast('วัตถุดิบที่ผลิตเสร็จไว้แล้ว ไม่สามารถลดยอดได้', 'warning')
      return
    }
    const current = form.value.stock / pSize
    const minPacks = form.value.hasSubRecipe ? (initialStock.value / pSize) : 0
    const next = Math.max(minPacks, Math.round((current + delta) * 10) / 10)
    form.value.stock = Math.round(next * pSize * 100) / 100

    // Reset warning flag if stock level rises back above min alert
    const stillLow = recipeComparison.value.some(item => item.remaining <= item.minAlert)
    if (!stillLow) {
      hasConfirmedLowStock.value = false
    }
  }
}

const packMinAlertCount = computed(() => {
  const pSize = form.value.hasSubRecipe ? roundYield.value : (Number(form.value.packSize) || 1)
  if (pSize <= 0) return 0
  return Number((form.value.minAlert / pSize).toFixed(2))
})

const displayMinAlertPacks = computed(() => {
  const pSize = form.value.hasSubRecipe ? roundYield.value : (Number(form.value.packSize) || 1)
  if (pSize <= 0) return 0
  const count = form.value.minAlert / pSize
  return Number.isInteger(count) ? count : Number(count.toFixed(2))
})

function onMinAlertPacksInput(val) {
  const num = parseFloat(val)
  const pSize = form.value.hasSubRecipe ? roundYield.value : (Number(form.value.packSize) || 1)
  if (isNaN(num) || num < 0) {
    form.value.minAlert = 0
  } else {
    form.value.minAlert = Math.round(num * pSize * 100) / 100
  }
}

function stepMinAlert(delta) {
  const pSize = form.value.hasSubRecipe ? roundYield.value : (Number(form.value.packSize) || 1)
  const current = form.value.minAlert / pSize
  const next = Math.max(0, Math.round((current + delta) * 10) / 10)
  form.value.minAlert = Math.round(next * pSize * 100) / 100
}

function setRole(isSub) {
  form.value.isSubIngredient = isSub
  if (isSub) {
    form.value.hasSubRecipe = false
    form.value.subRecipe = []
    if (form.value.packUnit === 'รอบ') {
      form.value.packUnit = form.value.unit === 'ml' ? 'ขวด' : (form.value.unit === 'g' ? 'ถุง' : 'แพ็ค')
      form.value.packSize = 1000
    }
  }
}

// Sub-Recipe helpers
function addSubRecipeRow() {
  const defaultSub = availableSubMaterials.value[0]
  if (!defaultSub) {
    store.showToast('ยังไม่มีรายการวัตถุดิบรองในระบบ กรุณาสร้างวัตถุดิบรองก่อน (เช่น นมสด หรือหัวเชื้อ)', 'error')
    return
  }
  form.value.subRecipe.push({
    materialId: defaultSub.id,
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

// Watch subrecipe toggle changes to adapt packUnit & packaging
watch(() => form.value.hasSubRecipe, (newVal) => {
  if (newVal) {
    form.value.packUnit = 'รอบ'
    form.value.packSize = Number(form.value.yieldQty) || 540
    form.value.isSubIngredient = false
  } else {
    if (form.value.packUnit === 'รอบ') {
      form.value.packUnit = form.value.unit === 'ml' ? 'ขวด' : (form.value.unit === 'g' ? 'ถุง' : 'แพ็ค')
      form.value.packSize = 1000
    }
  }
})

// Keep packSize synced with yieldQty when in subRecipe mode
watch(() => form.value.yieldQty, (newYield) => {
  if (form.value.hasSubRecipe && Number(newYield) > 0) {
    form.value.packSize = Number(newYield)
  }
})

// Initialize form on open
watch(() => store.modals.materialEdit.isOpen, (open) => {
  if (open) {
    const id = store.modals.materialEdit.materialId
    const mat = id ? store.materials.find(m => m.id === id) : null

    hasConfirmedLowStock.value = false // Reset warning flag for new session

    if (mat) {
      initialStock.value = Number(mat.stock) || 0
      const isSub = Boolean(mat.isSubIngredient) || mat.id === 'MAT002' || (mat.category && (mat.category.includes('รอง') || mat.category.includes('sub')))
      const hasRecipe = !isSub && Boolean(mat.hasSubRecipe)

      const pUnit = mat.packUnit || (hasRecipe ? 'รอบ' : (mat.unit === 'ml' ? 'ขวด' : mat.unit === 'g' ? 'ถุง' : 'แพ็ค'))
      const pSize = Number(mat.packSize) || (hasRecipe ? (Number(mat.yieldQty) || 540) : 1)
      const uCost = Number(mat.unitCost) || 0
      const pCost = Number(mat.packCost) || (uCost * pSize)

      form.value = {
        id: mat.id,
        isDeleted: Boolean(mat.isDeleted),
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
        isSubIngredient: isSub,
        hasSubRecipe: hasRecipe,
        yieldQty: mat.yieldQty ? Number(mat.yieldQty) : 540,
        subRecipe: hasRecipe && mat.subRecipe && Array.isArray(mat.subRecipe) && mat.subRecipe.length > 0
          ? JSON.parse(JSON.stringify(mat.subRecipe))
          : [],
        shelfLifeDays: mat.shelfLifeDays !== undefined ? mat.shelfLifeDays : null
      }
    } else {
      // New Material: Clean neutral defaults, hasSubRecipe is OFF
      initialStock.value = 0
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
        yieldQty: 540,
        subRecipe: [],
        shelfLifeDays: null
      }
    }

    nextTick(() => {
      saveSnapshot()
    })
  }
})

function handleArchiveToggle() {
  if (!form.value.id) return
  if (form.value.isDeleted) {
    store.restoreMaterial(form.value.id)
    form.value.isDeleted = false
  } else {
    store.softDeleteMaterial(form.value.id)
    form.value.isDeleted = true
  }
}

function handlePermanentDelete() {
  if (!form.value.id) return
  const usage = store.getMaterialUsage(form.value.id)
  if (usage.isInUse) {
    const list = [...usage.usedInMenus, ...usage.usedInAddons, ...usage.usedInMaterials].join(', ')
    alert(`ไม่สามารถลบถาวรได้ เนื่องจากวัตถุดิบนี้ถูกใช้งานในสูตร: ${list}\nกรุณานำออกจากสูตรก่อน หรือเลือก 'จัดเก็บ' แทน`)
    return
  }

  if (confirm(`ยืนยันลบวัตถุดิบ "${form.value.name}" อย่างถาวรหรือไม่?\n⚠️ ข้อมูลทั้งหมดจะถูกลบออกจากระบบและไม่สามารถกู้คืนได้`)) {
    store.deleteMaterialPermanently(form.value.id)
    close()
  }
}

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
    pSize = Number(form.value.yieldQty) > 0 ? Number(form.value.yieldQty) : 540
    pCost = calculatedSubCost.value
    form.value.packUnit = 'รอบ'

  } else {
    pSize = Number(form.value.packSize) > 0 ? Number(form.value.packSize) : 1
    pCost = Number(form.value.packCost) >= 0 ? Number(form.value.packCost) : 0
  }

  const result = store.saveMaterial({
    id: form.value.id || undefined,
    name: form.value.name.trim(),
    category: form.value.category,
    unit: form.value.unit || 'g',
    packUnit: form.value.packUnit?.trim() || 'แพ็ค',
    packSize: pSize,
    packCost: pCost,
    stock: Number(form.value.stock) || 0,
    minAlert: Number(form.value.minAlert) || 0,
    unitCost: Math.round(uCost * 100) / 100, // 2 decimals clean
    emoji: form.value.emoji || '🥣',
    isSubIngredient: isSub,
    hasSubRecipe: hasRecipe,
    yieldQty: hasRecipe ? pSize : undefined,
    shelfLifeDays: form.value.shelfLifeDays ? Number(form.value.shelfLifeDays) : null,
    subRecipe: hasRecipe
      ? form.value.subRecipe
          .filter(r => r.materialId && r.qty > 0)
          .map(r => ({ materialId: r.materialId, qty: Number(r.qty) }))
      : []
  })

  if (result?.ok || result?.success) close()
}
</script>
