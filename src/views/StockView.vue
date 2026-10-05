<template>
  <div class="space-y-6">
    <!-- Top Header: Title & Quick Actions -->
    <div class="flex items-center justify-between flex-wrap gap-4">
      <div>
        <h2 class="text-xl font-bold text-stone-900 tracking-tight">คลังวัตถุดิบและบรรจุภัณฑ์ (Inventory & Stock)</h2>
        <p class="text-xs text-stone-400 mt-0.5">
          จัดการสต็อกวัตถุดิบหลัก (หน้าร้าน) & วัตถุดิบรอง (ผลิตเบสโยเกิร์ต), รับเข้า และตรวจนับยอดจริง
        </p>
      </div>

      <div class="flex items-center gap-2">
        <button
          @click="store.openActivityLog('stock')"
          class="inline-flex items-center gap-2 px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          title="ดูประวัติการเคลื่อนไหวสต็อกและการตรวจนับทั้งหมด"
        >
          <History class="w-4 h-4 text-sky-700" />
          <span>ประวัติสต็อก</span>
        </button>

        <button
          @click="openStockIn()"
          class="inline-flex items-center gap-2 px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
        >
          <ArrowDownToLine class="w-4 h-4 text-emerald-600" />
          <span>รับเข้าสต็อก</span>
        </button>

        <button
          @click="openStockAdjust()"
          class="inline-flex items-center gap-2 px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
        >
          <SlidersHorizontal class="w-4 h-4 text-amber-600" />
          <span>ปรับยอดนับจริง</span>
        </button>

        <button
          @click="openCreateMaterial"
          class="inline-flex items-center gap-2 px-4 py-2 bg-amber-900 hover:bg-amber-950 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <Plus class="w-4 h-4" />
          <span>เพิ่มวัตถุดิบใหม่</span>
        </button>
      </div>
    </div>

    <!-- Summary KPI Cards: Clean, Compact 4-Card Strip -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <!-- Total Valuation Card -->
      <div class="editorial-card p-4 bg-white">
        <div class="flex items-center justify-between text-[11px] text-stone-400 mb-1">
          <span>มูลค่าคลังรวม</span>
          <span>💰</span>
        </div>
        <div class="text-xl font-bold font-number text-amber-950">
          ฿{{ store.totalInventoryValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
        </div>
        <div class="text-[10px] text-stone-400 mt-1">
          หลัก: {{ store.mainMaterials.length }} • รอง: {{ store.subMaterials.length }} ชนิด
        </div>
      </div>

      <!-- Reorder Budget Needed Card -->
      <div class="editorial-card p-4 bg-white">
        <div class="flex items-center justify-between text-[11px] text-stone-400 mb-1">
          <span>งบเติมสต็อกแนะนำ</span>
          <span>📦</span>
        </div>
        <div class="text-xl font-bold font-number text-rose-800">
          ฿{{ store.reorderBudgetNeeded.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
        </div>
        <div class="text-[10px] text-stone-400 mt-1">
          เติมให้ถึงระดับ 2x Min
        </div>
      </div>

      <!-- Low Stock Items Card -->
      <div class="editorial-card p-4 bg-white">
        <div class="flex items-center justify-between text-[11px] text-stone-400 mb-1">
          <span>สต็อกใกล้หมด</span>
          <span>⚠️</span>
        </div>
        <div class="text-xl font-bold font-number text-amber-800">
          {{ store.lowStockMaterials.length }} <span class="text-xs font-normal text-stone-400">รายการ</span>
        </div>
        <div class="text-[10px] text-stone-400 mt-1">
          ควรสั่งซื้อเพิ่ม
        </div>
      </div>

      <!-- Out of Stock Items Card -->
      <div class="editorial-card p-4 bg-white">
        <div class="flex items-center justify-between text-[11px] text-stone-400 mb-1">
          <span>หมดสต็อก</span>
          <span>🚫</span>
        </div>
        <div class="text-xl font-bold font-number text-stone-800">
          {{ store.outOfStockMaterials.length }} <span class="text-xs font-normal text-stone-400">รายการ</span>
        </div>
        <div class="text-[10px] text-stone-400 mt-1">
          ระงับขายเมนูที่เกี่ยวข้อง
        </div>
      </div>
    </div>

    <!-- Filters & Search Toolbar (Single Compact Row) -->
    <div class="editorial-card p-3 bg-white flex flex-col md:flex-row md:items-center justify-between gap-3">
      <!-- Role Tabs (ทั้งหมด / หลัก / รอง) -->
      <div class="flex items-center gap-1 p-0.5 bg-stone-100 rounded-xl text-xs font-semibold shrink-0">
        <button
          @click="selectedRole = 'all'"
          :class="[
            'px-3 py-1.5 rounded-lg transition-all cursor-pointer',
            selectedRole === 'all' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-500 hover:text-stone-900'
          ]"
        >
          ทั้งหมด ({{ store.activeMaterials.length }})
        </button>
        <button
          @click="selectedRole = 'main'"
          :class="[
            'px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer',
            selectedRole === 'main' ? 'bg-emerald-800 text-white shadow-2xs' : 'text-stone-500 hover:text-emerald-800'
          ]"
        >
          <span>🥣 หลัก ({{ store.mainMaterials.length }})</span>
        </button>
        <button
          @click="selectedRole = 'sub'"
          :class="[
            'px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer',
            selectedRole === 'sub' ? 'bg-purple-800 text-white shadow-2xs' : 'text-stone-500 hover:text-purple-800'
          ]"
        >
          <span>🥛 รอง ({{ store.subMaterials.length }})</span>
        </button>
      </div>

      <!-- Category Filter Dropdown + Search + Hidden Checkbox -->
      <div class="flex items-center gap-2 flex-1 max-w-xl justify-end">
        <select
          v-model="selectedCategory"
          class="soft-input px-3 py-1.5 rounded-xl text-xs font-medium text-stone-800 shrink-0 cursor-pointer"
        >
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">
            {{ cat.label }}
          </option>
        </select>

        <div class="relative flex-1 min-w-[140px]">
          <Search class="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="ค้นหาวัตถุดิบ..."
            class="soft-input w-full pl-8 pr-3 py-1.5 rounded-xl text-xs text-stone-900 placeholder:text-stone-400 font-medium"
          />
        </div>

        <label class="text-[11px] text-stone-400 hover:text-stone-700 cursor-pointer select-none flex items-center gap-1.5 shrink-0 pl-1">
          <input
            type="checkbox"
            v-model="showDeleted"
            class="rounded border-stone-300 text-stone-900 focus:ring-0 w-3.5 h-3.5"
          />
          <span>ที่ซ่อน ({{ deletedCount }})</span>
        </label>
      </div>
    </div>

    <!-- Material Inventory Table -->
    <div class="editorial-card bg-white pb-12">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[1040px] table-fixed text-left text-xs">
          <colgroup>
            <col class="w-[32%]" />
            <col class="w-[14%]" />
            <col class="w-[17%]" />
            <col class="w-[13%]" />
            <col class="w-[13%]" />
            <col class="w-[6%]" />
            <col class="w-[5%]" />
          </colgroup>
          <thead>
            <tr class="border-b border-stone-200/80 bg-stone-50/50 text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
              <th class="py-3 px-4 text-left">วัตถุดิบ / สินค้า</th>
              <th class="py-3 px-4 text-left">หมวดหมู่</th>
              <th class="py-3 px-4 text-center">คงเหลือในคลัง</th>
              <th class="py-3 px-4 text-left">ต้นทุน/หน่วย</th>
              <th class="py-3 px-4 text-left">มูลค่าสต็อกคงเหลือ</th>
              <th class="py-3 px-4 text-center">สถานะ</th>
              <th class="py-3 px-4 text-center">การจัดการ</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-stone-100">
            <template
              v-for="(mat, idx) in filteredMaterials"
              :key="mat.id"
            >
              <tr
                :class="[
                  'hover:bg-[#FAF9F6] transition-colors',
                  mat.isDeleted ? 'opacity-50 bg-stone-50/40' : ''
                ]"
              >
                <!-- Material Info -->
                <td class="py-3 px-4">
                <div class="flex items-center gap-2.5 min-w-0">
                  <span class="text-xl shrink-0">{{ mat.emoji }}</span>
                  <div class="min-w-0 flex-1 truncate">
                    <div class="font-bold text-stone-900 flex items-center gap-1.5 truncate">
                      <span class="truncate">{{ mat.name }}</span>

                      <!-- Special Role Badges (Only shown for sub-ingredients or self-produced bases) -->
                      <span
                        v-if="mat.isSubIngredient"
                        class="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-800 shrink-0"
                        title="วัตถุดิบรอง สำหรับหมัก/ผลิตกรีกโยเกิร์ต"
                      >
                        <span>🥛</span>
                        <span>วัตถุดิบรอง</span>
                      </span>
                      <span
                        v-else-if="mat.hasSubRecipe"
                        class="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 shrink-0"
                        title="วัตถุดิบหลัก ผลิตจากวัตถุดิบรอง"
                      >
                        <span>🥣</span>
                        <span>ผลิตเอง</span>
                      </span>

                      <span v-if="mat.isDeleted" class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-200 text-stone-700 shrink-0">ซ่อนอยู่</span>
                      <button
                        v-if="hasMultipleLots(mat)"
                        type="button"
                        @click="toggleExpand(mat.id)"
                        class="px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all inline-flex items-center gap-0.5 shrink-0 cursor-pointer"
                        :class="isExpanded(mat.id) ? 'bg-amber-900 text-white shadow-2xs' : 'bg-stone-100 hover:bg-stone-200 text-stone-700'"
                        title="คลิกเพื่อคลี่/พับดูประวัติแต่ละล็อต"
                      >
                        <span>{{ getActiveLotsCount(mat) }} ล็อต</span>
                        <ChevronUp v-if="isExpanded(mat.id)" class="w-3 h-3" />
                        <ChevronDown v-else class="w-3 h-3" />
                      </button>
                    </div>
                    <div class="text-[11px] text-stone-500 flex items-center gap-1.5 mt-0.5 font-number whitespace-nowrap overflow-hidden">
                      <!-- วันที่รับ -->
                      <span v-if="mat.lastStockInDate && store.getMaterialTrackingMode(mat) !== 'none'" class="inline-flex items-center gap-1 shrink-0">
                        <span class="text-stone-400 font-sans">รับล่าสุด :</span>
                        <span class="text-stone-700 font-medium">{{ formatDisplayDate(mat.lastStockInDate) }}</span>
                        <span v-if="store.getMaterialTrackingMode(mat) === 'receive_only' && getReceiveAgeStatus(mat.lastStockInDate).daysAgo !== null" class="text-[10px] text-stone-400 font-sans">
                          ({{ getReceiveAgeStatus(mat.lastStockInDate).shortText }})
                        </span>
                      </span>

                      <!-- ตัวคั่นจุดกลม หากมีทั้งสองค่า -->
                      <span v-if="mat.lastStockInDate && mat.expiryDate && store.getMaterialTrackingMode(mat) === 'expiry_and_receive'" class="text-stone-300 mx-0.5 shrink-0">•</span>

                      <!-- วันที่หมดอายุ -->
                      <span
                        v-if="mat.expiryDate && store.getMaterialTrackingMode(mat) === 'expiry_and_receive'"
                        class="inline-flex items-center gap-1 shrink-0"
                        :class="isExpired(mat) ? 'text-rose-600 font-bold' : 'text-stone-700 font-medium'"
                      >
                        <span class="font-sans" :class="isExpired(mat) ? 'text-rose-600 font-semibold' : 'text-stone-400'">หมดอายุ :</span>
                        <span>{{ formatDisplayDate(mat.expiryDate) }}</span>
                        <span
                          v-if="isExpired(mat)"
                          class="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-rose-100 text-rose-700 font-sans ml-1"
                        >
                          หมดอายุ
                        </span>
                      </span>

                      <!-- กรณีไม่มีการบันทึกวันที่หรือหมวดหมู่ none -->
                      <span v-if="store.getMaterialTrackingMode(mat) === 'none'" class="text-stone-400 font-sans text-[10px] shrink-0">ไม่ระบุวันที่</span>
                      <span v-else-if="!mat.lastStockInDate && !mat.expiryDate" class="text-stone-300 shrink-0">-</span>
                    </div>
                  </div>
                </div>
              </td>

              <!-- Category (Borderless Pill Badge) -->
              <td class="py-3 px-4">
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 text-stone-600 truncate max-w-full">
                  {{ mat.category || 'อื่นๆ' }}
                </span>
              </td>

              <!-- Stock Level: Balanced Layout with Centered Quantity & Pure Icon Buttons -->
              <td class="py-3 px-4 text-center">
                <div class="flex items-center justify-center gap-2">
                  <!-- Left Slot: Minus button for produced items, or invisible spacer for purchased items -->
                  <button
                    v-if="mat.hasSubRecipe && !mat.isDeleted"
                    type="button"
                    @click="quickAdjustStock(mat, -1)"
                    :disabled="!canReduceQuick(mat)"
                    class="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200 disabled:opacity-25 disabled:cursor-not-allowed flex items-center justify-center text-stone-700 transition-colors cursor-pointer shrink-0"
                    :title="canReduceQuick(mat) ? 'ยกเลิกการผลิต 1 รอบ (คืนวัตถุดิบรอง)' : 'วัตถุดิบที่ผลิตเสร็จไว้แล้ว ไม่สามารถลดยอดได้'"
                  >
                    <Minus class="w-3.5 h-3.5" />
                  </button>
                  <div v-else class="w-7 h-7 shrink-0"></div>

                  <!-- Middle Slot: Quantity (Fixed width, centered, tabular-nums) -->
                  <div class="w-24 text-center shrink-0 tabular-nums">
                    <div class="font-bold font-number text-sm flex items-center justify-center gap-1 tabular-nums">
                      <span
                        :class="[
                          mat.stock <= 0
                            ? 'text-rose-600'
                            : mat.stock <= mat.minAlert
                              ? 'text-amber-600'
                              : 'text-stone-900'
                        ]"
                        class="tabular-nums"
                      >
                        {{ mat.stock.toLocaleString() }}
                      </span>
                      <span class="text-xs font-normal text-stone-400 shrink-0">{{ mat.unit }}</span>
                    </div>

                    <!-- Draft indicator pill -->
                    <div v-if="getDraftDiff(mat) !== 0" class="my-0.5 flex justify-center">
                      <span
                        class="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold"
                        :class="getDraftDiff(mat) > 0 ? 'bg-amber-100 text-amber-900 border border-amber-300/80' : 'bg-rose-100 text-rose-800 border border-rose-300/80'"
                        title="มีการเปลี่ยนแปลงในแบบร่าง รอยืนยันขั้นตอนสุดท้าย"
                      >
                        ร่าง: {{ getDraftDiff(mat) > 0 ? `+${getDraftDiff(mat).toLocaleString()}` : getDraftDiff(mat).toLocaleString() }}
                      </span>
                    </div>

                    <div v-if="mat.hasSubRecipe" class="text-[10px] text-amber-800/80 font-medium truncate">
                      รอบละ {{ Number(mat.yieldQty || 540).toLocaleString() }} {{ mat.unit }}
                    </div>
                    <div v-else-if="mat.packUnit && mat.packSize > 1" class="text-[10px] text-stone-400 font-number tabular-nums truncate">
                      ≈ {{ (mat.stock / mat.packSize).toFixed(1) }} {{ mat.packUnit }}
                    </div>
                    <div v-else class="text-[10px] text-stone-300 font-number">
                      -
                    </div>
                  </div>

                  <!-- Right Slot: Plus button for produced items, or Stock-In button for purchased items -->
                  <button
                    v-if="mat.hasSubRecipe && !mat.isDeleted"
                    type="button"
                    @click="quickAdjustStock(mat, 1)"
                    :disabled="!canProduceQuick(mat)"
                    class="w-7 h-7 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer shrink-0"
                    :title="canProduceQuick(mat) ? `ผลิตเพิ่ม 1 รอบ (+${mat.yieldQty || 540} ${mat.unit}) พร้อมหักสต็อกวัตถุดิบรอง` : 'วัตถุดิบรองไม่พอผลิตเพิ่ม'"
                  >
                    <Plus class="w-3.5 h-3.5" />
                  </button>
                  <button
                    v-else-if="!mat.isDeleted"
                    type="button"
                    @click="openStockIn(mat.id)"
                    class="w-7 h-7 rounded-lg bg-stone-100 hover:bg-emerald-50 text-stone-600 hover:text-emerald-700 border border-stone-200/60 hover:border-emerald-200 flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-2xs"
                    title="รับเข้าสต็อก (บันทึกจำนวนซื้อเข้าและราคาต้นทุน)"
                  >
                    <ArrowDownToLine class="w-3.5 h-3.5 text-emerald-600" />
                  </button>
                  <div v-else class="w-7 h-7 shrink-0"></div>
                </div>
              </td>

              <!-- Unit Cost (Primary: Pack purchase cost e.g. ฿105/ขวด, Secondary: base unit cost) -->
              <td class="py-3 px-4 font-number text-stone-700 tabular-nums">
                <div class="font-bold text-stone-900 text-xs tabular-nums truncate">
                  ฿{{ getDisplayPackCost(mat).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }) }}
                  <span class="font-medium text-stone-500 text-[11px]">/{{ mat.packUnit || mat.unit }}</span>
                </div>
                <div v-if="(mat.packSize && mat.packSize > 1) || mat.hasSubRecipe" class="text-[10px] text-stone-400 mt-0.5 tabular-nums truncate">
                  (≈ ฿{{ Number(mat.unitCost || 0).toFixed(2) }}/{{ mat.unit }})
                </div>
              </td>

              <!-- Total Item Stock Valuation -->
              <td class="py-3 px-4 tabular-nums">
                <div class="font-bold font-number text-amber-950 tabular-nums truncate">
                  ฿{{ (Math.max(0, mat.stock) * (mat.unitCost || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                </div>
              </td>

              <!-- Status Badge (Clean single badge, no countdown clutter) -->
              <td class="py-3 px-4 text-center">
                <span
                  v-if="mat.isDeleted"
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-200 text-stone-700 shrink-0"
                >
                  ซ่อนอยู่
                </span>
                <span
                  v-else-if="isExpired(mat)"
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-700 shrink-0"
                >
                  หมดอายุแล้ว
                </span>
                <span
                  v-else-if="mat.stock <= 0"
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-700 shrink-0"
                >
                  หมดสต็อก
                </span>
                <span
                  v-else-if="mat.stock <= mat.minAlert"
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 shrink-0"
                >
                  ใกล้หมด
                </span>
                <span
                  v-else
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 shrink-0"
                >
                  ปกติ
                </span>
              </td>

              <!-- Actions (More Dropdown) -->
              <td class="py-3 px-4 text-center relative">
                <button
                  type="button"
                  @click.stop="toggleActionMenu(mat.id)"
                  class="p-1.5 text-stone-400 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center shrink-0"
                  :class="activeActionMenuId === mat.id ? 'bg-stone-100 text-stone-900' : ''"
                  title="การจัดการเพิ่มเติม"
                >
                  <MoreHorizontal class="w-4 h-4" />
                </button>

                <!-- Dropdown Popup Menu -->
                <div
                  v-if="activeActionMenuId === mat.id"
                  @click.stop
                  :class="idx >= filteredMaterials.length - 2 ? 'bottom-11' : 'top-11'"
                  class="absolute right-2 z-30 w-48 bg-white rounded-xl shadow-xl border border-stone-200/80 py-1.5 text-xs text-left animate-in fade-in zoom-in-95 duration-100"
                >
                  <button
                    @click="onActionHistory(mat.id)"
                    class="w-full px-3 py-2 text-stone-700 hover:bg-stone-50 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <History class="w-3.5 h-3.5 text-sky-600" />
                    <span>ประวัติการเคลื่อนไหว</span>
                  </button>

                  <div class="my-1 border-t border-stone-100"></div>

                  <button
                    v-if="!mat.isDeleted"
                    @click="onActionStockIn(mat.id)"
                    class="w-full px-3 py-2 text-stone-700 hover:bg-stone-50 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <ArrowDownToLine class="w-3.5 h-3.5 text-emerald-600" />
                    <span>รับเข้าสต็อก</span>
                  </button>

                  <button
                    v-if="!mat.isDeleted"
                    @click="onActionStockAdjust(mat.id)"
                    class="w-full px-3 py-2 text-stone-700 hover:bg-stone-50 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <SlidersHorizontal class="w-3.5 h-3.5 text-amber-600" />
                    <span>ปรับยอดนับจริง</span>
                  </button>

                  <button
                    @click="onActionEdit(mat.id)"
                    class="w-full px-3 py-2 text-stone-700 hover:bg-stone-50 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Edit3 class="w-3.5 h-3.5 text-stone-600" />
                    <span>แก้ไขข้อมูล / สูตร</span>
                  </button>

                  <button
                    v-if="!mat.isDeleted"
                    @click="onActionWaste(mat.id)"
                    class="w-full px-3 py-2 text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Trash2 class="w-3.5 h-3.5 text-rose-500" />
                    <span>บันทึกของเสีย (Waste)</span>
                  </button>

                  <div class="my-1 border-t border-stone-100"></div>

                  <button
                    v-if="!mat.isDeleted"
                    @click="onActionSoftDelete(mat)"
                    class="w-full px-3 py-2 text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <EyeOff class="w-3.5 h-3.5" />
                    <span>ซ่อนรายการนี้</span>
                  </button>
                  <button
                    v-else
                    @click="onActionRestore(mat)"
                    class="w-full px-3 py-2 text-emerald-700 hover:bg-emerald-50 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <RotateCcw class="w-3.5 h-3.5" />
                    <span>กู้คืนรายการนี้</span>
                  </button>
                </div>
              </td>
            </tr>

            <!-- Expanded Sub-lots Rows (Rendered as rows with matching table columns) -->
            <template v-if="isExpanded(mat.id) && hasMultipleLots(mat)">
              <tr
                v-for="(lot, lIdx) in getDisplayLots(mat)"
                :key="lot.id"
                class="bg-[#FAF9F6] hover:bg-[#F5F3EF] transition-colors border-t border-stone-200/60 text-xs"
                :class="lot.isInUse ? 'bg-emerald-50/25' : ''"
              >
                <!-- 1. Sub-lot Name, Notes & Dates -->
                <td class="py-2.5 px-4 pl-7 sm:pl-9">
                  <div class="flex items-center gap-2 min-w-0">
                    <span class="text-stone-300 font-mono text-xs leading-none shrink-0 select-none">↳</span>
                    <div class="min-w-0 flex-1 truncate">
                      <div class="font-bold text-stone-800 flex items-center gap-1.5 truncate text-[11px]">
                        <span>ล็อตที่ {{ lIdx + 1 }}</span>
                        <span v-if="lot.note" class="text-[10px] text-stone-400 font-normal truncate" :title="lot.note">({{ lot.note }})</span>
                      </div>
                      <div class="text-[10px] text-stone-500 flex items-center gap-1.5 mt-0.5 font-number whitespace-nowrap overflow-hidden">
                        <!-- วันที่รับ -->
                        <span v-if="lot.receiveDate" class="inline-flex items-center gap-1 shrink-0">
                          <span class="text-stone-400 font-sans">รับ :</span>
                          <span class="text-stone-700 font-medium">{{ formatDisplayDate(lot.receiveDate) }}</span>
                          <span v-if="getLotAge(lot)" class="text-stone-400 font-sans text-[9px]">({{ getLotAge(lot).shortText }})</span>
                        </span>

                        <span v-if="lot.receiveDate && lot.expiryDate && store.getMaterialTrackingMode(mat) === 'expiry_and_receive'" class="text-stone-300 mx-0.5 shrink-0">•</span>

                        <!-- วันที่หมดอายุ -->
                        <span
                          v-if="lot.expiryDate && store.getMaterialTrackingMode(mat) === 'expiry_and_receive'"
                          class="inline-flex items-center gap-1 shrink-0"
                          :class="isLotExpired(lot) ? 'text-rose-600 font-bold' : ''"
                        >
                          <span class="font-sans" :class="isLotExpired(lot) ? 'text-rose-600 font-semibold' : 'text-stone-400'">หมดอายุ :</span>
                          <span>{{ formatDisplayDate(lot.expiryDate) }}</span>
                          <span v-if="isLotExpired(lot)" class="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-rose-100 text-rose-700 font-sans ml-1">หมดอายุ</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </td>

                <!-- 2. Category (Left clean to avoid clutter) -->
                <td class="py-2.5 px-4"></td>

                <!-- 4. Lot Quantity (Centered matching main row) -->
                <td class="py-2.5 px-4 text-center">
                  <div class="flex items-center justify-center gap-2">
                    <div class="w-7 h-7 shrink-0"></div>
                    <div class="w-24 text-center shrink-0 tabular-nums">
                      <div class="font-bold font-number text-xs flex items-center justify-center gap-1 text-stone-800">
                        <span>{{ lot.qty.toLocaleString() }}</span>
                        <span class="text-[10px] font-normal text-stone-400">{{ mat.unit }}</span>
                      </div>
                      <div v-if="mat.packUnit && mat.packSize > 1" class="text-[9px] text-stone-400 font-number tabular-nums">
                        ≈ {{ (lot.qty / mat.packSize).toFixed(1) }} {{ mat.packUnit }}
                      </div>
                    </div>
                    <div class="w-7 h-7 shrink-0"></div>
                  </div>
                </td>

                <!-- 5. Lot Unit Cost -->
                <td class="py-2.5 px-4 font-number text-stone-700 text-xs tabular-nums">
                  <div class="font-bold text-stone-800 text-xs tabular-nums">
                    ฿{{ (lot.packCost || Math.round((lot.unitCost || mat.unitCost || 0) * (mat.packSize || 1) * 100) / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }) }}
                    <span class="font-normal text-stone-400 text-[10px]">/{{ mat.packUnit || mat.unit }}</span>
                  </div>
                  <div v-if="mat.packSize > 1" class="text-[9px] text-stone-400 tabular-nums">
                    (≈ ฿{{ Number(lot.unitCost || mat.unitCost || 0).toFixed(2) }}/{{ mat.unit }})
                  </div>
                </td>

                <!-- 6. Total Valuation of this lot -->
                <td class="py-2.5 px-4 tabular-nums font-number text-xs font-bold text-amber-950">
                  ฿{{ Math.round(lot.qty * (lot.unitCost || mat.unitCost || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                </td>

                <!-- 7. Status & Switch Lot Action -->
                <td class="py-2.5 px-4 text-center">
                  <span
                    v-if="lot.isInUse"
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 shrink-0"
                  >
                    กำลังใช้งาน
                  </span>
                  <button
                    v-else
                    type="button"
                    @click="store.switchActiveLot(mat.id, lot.id)"
                    class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-100 hover:bg-emerald-100 text-stone-600 hover:text-emerald-800 text-[10px] font-semibold transition-colors cursor-pointer"
                    title="สลับให้ระบบ POS และการขายดึงจากล็อตนี้ก่อน"
                  >
                    <Zap class="w-3 h-3 text-amber-500" />
                    <span>สลับมาใช้</span>
                  </button>
                </td>

                <!-- 8. Actions (Compact Icon Button) -->
                <td class="py-2.5 px-4 text-center">
                  <button
                    type="button"
                    @click="store.openWasteModal(mat.id, lot.id)"
                    class="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center shrink-0"
                    title="บันทึกตัดของเสียจากล็อตนี้"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            </template>
          </template>

            <!-- Empty Row -->
            <tr v-if="filteredMaterials.length === 0">
              <td colspan="7" class="py-12 text-center text-stone-400">
                <div class="text-3xl mb-2">🔍</div>
                <p class="text-xs font-medium">ไม่พบรายการวัตถุดิบตามเงื่อนไขที่เลือก</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Floating Bottom Save Bar (Pops up from bottom when changes/drafts are made) -->
    <transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="transform translate-y-24 opacity-0"
      enter-to-class="transform translate-y-0 opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="transform translate-y-0 opacity-100"
      leave-to-class="transform translate-y-24 opacity-0"
    >
      <div
        v-if="store.hasStockDrafts"
        class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center max-w-2xl w-[94vw]"
      >
        <!-- Expanded Draft Details Drawer (pops up above the bar) -->
        <transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="transform translate-y-4 opacity-0 scale-95"
          enter-to-class="transform translate-y-0 opacity-100 scale-100"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="transform translate-y-0 opacity-100 scale-100"
          leave-to-class="transform translate-y-4 opacity-0 scale-95"
        >
          <div
            v-if="showDraftDetails"
            class="w-full mb-2 bg-stone-900/95 backdrop-blur-md text-white rounded-2xl border border-stone-700/80 shadow-2xl p-4 max-h-60 overflow-y-auto"
          >
            <div class="flex items-center justify-between pb-2 border-b border-stone-800 text-xs">
              <span class="font-bold flex items-center gap-1.5 text-amber-400">
                <span>📋</span> รายการแบบร่างที่รอยืนยัน ({{ store.stockDraftSummary.count }} รายการ)
              </span>
              <span class="text-[11px] text-stone-400">ยังไม่บันทึกจริงจนกว่าจะกดปุ่มบันทึก</span>
            </div>
            <div class="divide-y divide-stone-800/60 mt-2">
              <div
                v-for="item in store.stockDraftSummary.items"
                :key="item.id"
                class="py-2 flex items-center justify-between text-xs"
              >
                <div class="flex items-center gap-2 min-w-0 pr-2">
                  <span class="text-base shrink-0">{{ item.emoji || '📦' }}</span>
                  <div class="min-w-0">
                    <div class="font-semibold text-stone-200 truncate">{{ item.name }}</div>
                    <div class="text-[10px] text-stone-400 truncate">{{ item.description }}</div>
                  </div>
                </div>
                <div class="shrink-0 font-number font-bold text-xs text-right">
                  <span
                    :class="[
                      item.delta > 0 ? 'text-emerald-400' : item.delta < 0 ? 'text-rose-400' : 'text-stone-300'
                    ]"
                  >
                    {{ item.delta > 0 ? `+${item.delta.toLocaleString()}` : item.delta ? item.delta.toLocaleString() : 'สลับล็อต' }}
                  </span>
                  <span v-if="item.unit" class="text-[10px] text-stone-400 ml-1">{{ item.unit }}</span>
                </div>
              </div>
            </div>
          </div>
        </transition>

        <!-- Main Bar -->
        <div class="w-full bg-stone-900 text-white rounded-2xl shadow-2xl px-4 sm:px-5 py-3 flex items-center gap-3 border border-stone-800 justify-between">
          <div class="flex items-center gap-2.5 min-w-0 pr-2">
            <div class="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-lg shrink-0">
              📝
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <h4 class="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                  <span>แบบร่างรอการบันทึก</span>
                  <span class="px-1.5 py-0.2 rounded-md bg-amber-500/30 text-amber-300 font-number text-[11px] font-bold">
                    {{ store.stockDraftSummary.count }} รายการ
                  </span>
                </h4>
                <button
                  type="button"
                  @click="showDraftDetails = !showDraftDetails"
                  class="text-[10px] text-amber-400 hover:text-amber-300 underline cursor-pointer flex items-center gap-0.5 shrink-0"
                >
                  <span>{{ showDraftDetails ? 'ซ่อน' : 'ดูรายละเอียด' }}</span>
                  <ChevronUp v-if="showDraftDetails" class="w-3 h-3" />
                  <ChevronDown v-else class="w-3 h-3" />
                </button>
              </div>
              <p class="text-[11px] text-stone-400 truncate mt-0.5 font-number">
                {{ store.stockDraftSummary.text }}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <button
              type="button"
              @click="revertPendingChanges"
              class="px-3 py-2 rounded-xl text-xs font-medium text-stone-300 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer flex items-center gap-1.5"
              title="ยกเลิกแบบร่างทั้งหมด คืนค่าสต็อกเดิม"
            >
              <Undo2 class="w-3.5 h-3.5" />
              <span>ยกเลิก</span>
            </button>

            <button
              type="button"
              @click="savePendingChanges"
              class="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              title="บันทึกขั้นตอนสุดท้ายอย่างเป็นทางการ"
            >
              <Check class="w-4 h-4 stroke-[2.5]" />
              <span>บันทึกขั้นตอนสุดท้าย</span>
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  usePosStore,
  getExpiryStatus,
  formatThaiDate,
  formatDisplayDate,
  isExpired,
  getTodayString,
  addDays,
  getReceiveAgeStatus
} from '@/stores/posStore'
import {
  Plus,
  Minus,
  ArrowDownToLine,
  SlidersHorizontal,
  Search,
  Edit3,
  EyeOff,
  RotateCcw,
  MoreHorizontal,
  Check,
  Undo2,
  History,
  ChevronDown,
  ChevronUp,
  Trash2,
  Zap
} from 'lucide-vue-next'

const store = usePosStore()

const searchQuery = ref('')
const selectedRole = ref('all') // 'all' | 'main' | 'sub'
const selectedCategory = ref('all')
const showDeleted = ref(false)

// Expandable sub-lots state
const expandedMaterialIds = ref(new Set())

function toggleExpand(matId) {
  if (expandedMaterialIds.value.has(matId)) {
    expandedMaterialIds.value.delete(matId)
  } else {
    expandedMaterialIds.value.add(matId)
  }
}

function isExpanded(matId) {
  return expandedMaterialIds.value.has(matId)
}

function getActiveLotsCount(mat) {
  if (!mat || !mat.lots) return 0
  return mat.lots.filter(l => Number(l.qty) > 0).length
}

function hasMultipleLots(mat) {
  if (!mat || !mat.lots) return false
  if (store.getMaterialTrackingMode(mat) === 'none') return false
  return getActiveLotsCount(mat) > 1
}

function getDisplayLots(mat) {
  return store.getMaterialLots(mat)
}

function getLotAge(lot) {
  return lot?.receiveDate ? getReceiveAgeStatus(lot.receiveDate) : null
}

function isLotExpired(lot) {
  return lot?.expiryDate ? isExpired({ expiryDate: lot.expiryDate }) : false
}

function onActionWaste(matId) {
  closeActionMenu()
  store.openWasteModal(matId)
}

// Action menu dropdown state
const activeActionMenuId = ref(null)

// Draft helpers & diff calculation
function getDraftDiff(mat) {
  if (!store.stockDraftSnapshot) return 0
  const snap = store.stockDraftSnapshot.find(s => s.id === mat.id)
  if (!snap) return 0
  return Math.round(((Number(mat.stock) || 0) - (Number(snap.stock) || 0)) * 100) / 100
}

function getBaselineStock(matId) {
  if (!store.stockDraftSnapshot) return null
  const snap = store.stockDraftSnapshot.find(s => s.id === matId)
  return snap ? (Number(snap.stock) || 0) : null
}

onMounted(() => {
  if (!store.stockDraftSnapshot) {
    store.initStockDraftSnapshot()
  }
  window.addEventListener('click', closeActionMenu)
})

onUnmounted(() => {
  window.removeEventListener('click', closeActionMenu)
})

function toggleActionMenu(matId) {
  if (activeActionMenuId.value === matId) {
    activeActionMenuId.value = null
  } else {
    activeActionMenuId.value = matId
  }
}

function closeActionMenu() {
  activeActionMenuId.value = null
}

function onActionHistory(matId) {
  closeActionMenu()
  store.openActivityLog('stock', matId)
}

function onActionStockIn(matId) {
  closeActionMenu()
  openStockIn(matId)
}

function onActionStockAdjust(matId) {
  closeActionMenu()
  openStockAdjust(matId)
}

function onActionEdit(matId) {
  closeActionMenu()
  openEditMaterial(matId)
}

function onActionSoftDelete(mat) {
  closeActionMenu()
  softDelete(mat)
}

function onActionRestore(mat) {
  closeActionMenu()
  restore(mat)
}

// -------------------------------------------------------------
// Quick Stepper & Real-time Sub-Ingredient Stock Deduction
// -------------------------------------------------------------
function canProduceQuick(mat) {
  if (!mat || mat.isDeleted) return false
  if (!mat.hasSubRecipe || !mat.subRecipe || mat.subRecipe.length === 0) return true
  for (const row of mat.subRecipe) {
    const subMat = store.materials.find(m => m.id === row.materialId)
    const currentStock = subMat ? Number(subMat.stock) || 0 : 0
    const needed = Number(row.qty) || 0
    if (currentStock < needed) return false
  }
  return true
}

function canReduceQuick(mat) {
  if (!mat || mat.isDeleted) return false
  if (mat.hasSubRecipe) {
    const base = getBaselineStock(mat.id)
    const baseline = base !== null ? base : (Number(mat.stock) || 0)
    const yieldAmount = Number(mat.yieldQty) || 540
    // วัตถุดิบที่ผลิตมาแล้ว ไม่สามารถลดได้ (ลดได้เฉพาะรอบที่เพิ่งกดผลิตเพิ่มในรอบนี้)
    return (Number(mat.stock) || 0) >= baseline + yieldAmount
  }
  return false
}

function quickAdjustStock(mat, delta) {
  if (!mat || !mat.hasSubRecipe) return
  if (!store.stockDraftSnapshot) {
    store.initStockDraftSnapshot()
  }
  const yieldAmount = Number(mat.yieldQty) || 540
  if (delta > 0) {
    // Check sub-ingredients
    if (!canProduceQuick(mat)) {
      store.showToast(`วัตถุดิบรองไม่พอสำหรับผลิต ${mat.name} อีก 1 รอบ`, 'error')
      return
    }
    // Increment target stock
    mat.stock = Math.round((Number(mat.stock || 0) + yieldAmount) * 100) / 100
    // Deduct sub-ingredients in realtime
    if (mat.subRecipe && mat.subRecipe.length > 0) {
      for (const row of mat.subRecipe) {
        const subMat = store.materials.find(m => m.id === row.materialId)
        if (subMat) {
          const needed = Number(row.qty) || 0
          subMat.stock = Math.max(0, Math.round((Number(subMat.stock || 0) - needed) * 100) / 100)
        }
      }
    }
  } else {
    // Decrease 1 round: Cannot reduce already produced stock
    const base = getBaselineStock(mat.id)
    const baseline = base !== null ? base : (Number(mat.stock) || 0)
    if (!canReduceQuick(mat)) {
      store.showToast(`ไม่สามารถลด ${mat.name} ได้ เนื่องจากเป็นวัตถุดิบที่ผลิตเสร็จไว้แล้ว`, 'warning')
      return
    }
    // Decrement produced stock by 1 batch yield (locked at baseline)
    mat.stock = Math.max(baseline, Math.round((Number(mat.stock || 0) - yieldAmount) * 100) / 100)
    // Restore sub-ingredients back to stock in realtime
    if (mat.subRecipe && mat.subRecipe.length > 0) {
      for (const row of mat.subRecipe) {
        const subMat = store.materials.find(m => m.id === row.materialId)
        if (subMat) {
          const returnedQty = Number(row.qty) || 0
          subMat.stock = Math.round((Number(subMat.stock || 0) + returnedQty) * 100) / 100
        }
      }
    }
  }
}

// -------------------------------------------------------------
// Floating Bottom Save Bar Logic (Real Final Save at Main Stock Popup)
// -------------------------------------------------------------
const showDraftDetails = ref(false)

function savePendingChanges() {
  store.commitStockDrafts()
  showDraftDetails.value = false
}

function revertPendingChanges() {
  store.discardStockDrafts()
  showDraftDetails.value = false
}

// -------------------------------------------------------------
// Filters & Other Helpers
// -------------------------------------------------------------
const categories = computed(() => {
  const list = [{ id: 'all', label: 'ทุกหมวดหมู่' }]
  store.materialCategories.forEach(c => {
    list.push({
      id: c.name,
      label: `${c.icon || '📦'} ${c.label || c.name}`
    })
  })
  store.materials.forEach(m => {
    if (m.category && !list.some(item => item.id === m.category)) {
      list.push({
        id: m.category,
        label: `📦 ${m.category}`
      })
    }
  })
  return list
})

const deletedCount = computed(() => {
  return store.materials.filter(m => m.isDeleted).length
})

const filteredMaterials = computed(() => {
  return store.materials.filter(m => {
    // Deleted filter
    if (!showDeleted.value && m.isDeleted) return false

    // Ingredient Role filter (หลัก / รอง)
    if (selectedRole.value === 'main' && m.isSubIngredient) return false
    if (selectedRole.value === 'sub' && !m.isSubIngredient) return false

    // Category filter
    if (selectedCategory.value !== 'all' && m.category !== selectedCategory.value) {
      return false
    }

    // Search query
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase().trim()
      const matchName = m.name?.toLowerCase().includes(q)
      const matchId = m.id?.toLowerCase().includes(q)
      const matchUnit = m.unit?.toLowerCase().includes(q)
      const matchCat = m.category?.toLowerCase().includes(q)
      if (!matchName && !matchId && !matchUnit && !matchCat) return false
    }

    return true
  })
})

function openCreateMaterial() {
  store.modals.materialEdit = { isOpen: true, materialId: null }
}

function openEditMaterial(id) {
  store.modals.materialEdit = { isOpen: true, materialId: id }
}

function openStockIn(id = null) {
  store.modals.stockIn = {
    isOpen: true,
    materialId: id || (store.activeMaterials[0]?.id || null)
  }
}

function openStockAdjust(id = null) {
  store.modals.stockAdjust = {
    isOpen: true,
    materialId: id || (store.activeMaterials[0]?.id || null)
  }
}

function softDelete(mat) {
  if (confirm(`ต้องการซ่อนวัตถุดิบ "${mat.name}" หรือไม่?\n(ข้อมูลจะไม่สูญหายและสามารถกู้คืนได้เสมอ)`)) {
    store.softDeleteMaterial(mat.id)
  }
}

function restore(mat) {
  store.restoreMaterial(mat.id)
}

function getDisplayPackCost(mat) {
  const pCost = Number(mat.packCost)
  if (pCost && pCost > 0) return pCost
  const uCost = Number(mat.unitCost) || 0
  const pSize = Number(mat.packSize) || 1
  return Math.round(uCost * pSize * 100) / 100
}
</script>
