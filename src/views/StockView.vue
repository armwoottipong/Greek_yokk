<template>
  <div class="space-y-6">
    <StockSummary :valuation="store.totalInventoryValuation" :draft-diff="store.draftInventoryValuationDiff" :projected="store.projectedInventoryValuation" :budget="store.reorderBudgetNeeded" :low-count="store.lowStockMaterials.length" :out-count="store.outOfStockMaterials.length" />
    <StockToolbar v-model:search="searchQuery" :role="selectedRole" :kind="selectedKind" :show-deleted="showDeleted" :kinds="kinds" :deleted-count="deletedCount" @apply-filters="applyStockFilters" @receive="openStockIn()" @stocktake="openStocktake" @adjust="openStockAdjust()" @create="openCreateMaterial" @history="store.openActivityLog('stock')" />
    <div class="adaptive-material-list editorial-card">
      <StockMaterialCard v-for="mat in filteredMaterials" :key="mat.id" :material="mat" :usage="store.materialUsageById.get(mat.id)" @details="detailMaterialId=$event" @receive="openStockIn" />
      <p v-if="!filteredMaterials.length" class="p-6 text-sm">ไม่พบรายการวัตถุดิบตามเงื่อนไขที่เลือก ลองเปลี่ยนตัวกรองหรือคำค้นหา</p>
    </div>
    <MaterialDetails :open="Boolean(detailMaterialId)" :material="detailMaterial" :usage="store.materialUsageById.get(detailMaterialId)" :lots="detailMaterial?getDisplayLots(detailMaterial):[]" :tracking-mode="detailMaterial?store.getMaterialTrackingMode(detailMaterial):'none'" :pack-cost="detailMaterial?getDisplayPackCost(detailMaterial):0" :draft-diff="detailMaterial?getDraftDiff(detailMaterial):0" @close="detailMaterialId=null" @adjust="onActionStockAdjustLot" @waste="onActionWasteLot" @switch="onActionSwitchLot" @restore="onActionRestore" @delete="onActionPermanentDelete" @edit="openEditMaterial" @receive="openStockIn" />
    <!-- Material Inventory Table -->
    <div class="desktop-material-table editorial-card bg-white pb-12">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[1120px] table-fixed text-left text-xs">
          <colgroup>
            <col class="w-[28%]" />
            <col class="w-[11%]" />
            <col class="w-[18%]" />
            <col class="w-[12%]" />
            <col class="w-[13%]" />
            <col class="w-[9%]" />
            <col class="w-[9%]" />
          </colgroup>
          <thead>
            <tr class="border-b border-stone-200/80 bg-stone-50/70 text-[11px] font-semibold text-stone-600 tracking-wider">
              <th class="py-3.5 px-4 text-left whitespace-nowrap">วัตถุดิบ / สินค้า</th>
              <th class="py-3.5 px-4 text-left whitespace-nowrap">ประเภท</th>
              <th class="py-3.5 px-4 text-center whitespace-nowrap">คงเหลือในคลัง</th>
              <th class="py-3.5 px-4 text-right whitespace-nowrap">ต้นทุน/หน่วย</th>
              <th class="py-3.5 px-4 text-right whitespace-nowrap">มูลค่าสต็อกคงเหลือ</th>
              <th class="py-3.5 px-4 text-center whitespace-nowrap">สถานะ</th>
              <th class="py-3.5 px-4 text-center whitespace-nowrap">การจัดการ</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-stone-100">
            <template
              v-for="(mat, idx) in filteredMaterials"
              :key="mat.id"
            >
              <tr
                :class="[
                  'hover:bg-[#FBF5EA] transition-colors',
                  mat.isDeleted ? 'bg-stone-50/70 text-stone-600' : ''
                ]"
              >
                <!-- Material Info -->
                <td class="py-3.5 px-4">
                <div class="flex items-center gap-3 min-w-0">
                  <span class="text-xl shrink-0">{{ mat.emoji }}</span>
                  <div class="min-w-0 flex-1 truncate">
                    <div class="font-bold text-stone-900 flex items-center gap-1.5 truncate">
                      <button type="button" :data-material-details="mat.id" :aria-label="`ดูรายละเอียด ${mat.name}`" class="text-left underline-offset-4 hover:underline focus-visible:underline" @click="detailMaterialId=mat.id">{{ mat.name }}</button>

                      <MaterialUsage :usage="store.materialUsageById.get(mat.id)" />
                      <span
                        v-if="mat.isDeleted"
                        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-semibold bg-stone-200/90 text-stone-700 shrink-0"
                      >
                        <Archive class="w-3 h-3" />
                        <span>จัดเก็บแล้ว</span>
                      </span>
                      <button
                        v-if="hasMultipleLots(mat)"
                        type="button"
                        @click="toggleExpand(mat.id)"
                        class="px-2 py-0.5 rounded-full text-[12px] font-semibold transition-all inline-flex items-center gap-0.5 shrink-0 cursor-pointer"
                        :class="isExpanded(mat.id) ? 'bg-brand-600 text-white shadow-2xs' : 'bg-stone-100 hover:bg-stone-200 text-stone-700'"
                        title="คลิกเพื่อคลี่/พับดูประวัติแต่ละล็อต"
                      >
                        <span>{{ getActiveLotsCount(mat) }} ล็อต</span>
                        <ChevronDown class="w-3 h-3 transition-transform duration-300 ease-in-out" :class="isExpanded(mat.id) ? 'rotate-180' : ''" />
                      </button>
                    </div>
                    <div class="text-[11px] text-stone-500 flex items-center gap-1.5 mt-1 font-number whitespace-nowrap overflow-hidden">
                      <!-- วันที่รับ -->
                      <span v-if="mat.lastStockInDate && store.getMaterialTrackingMode(mat) !== 'none'" class="inline-flex items-center gap-1 shrink-0">
                        <span class="text-stone-500 font-sans">รับล่าสุด :</span>
                        <span class="text-stone-700 font-medium">{{ formatDisplayDate(mat.lastStockInDate) }}</span>
                        <span v-if="store.getMaterialTrackingMode(mat) === 'receive_only' && getReceiveAgeStatus(mat.lastStockInDate).daysAgo !== null" class="text-[12px] text-stone-500 font-sans">
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
                        <span class="font-sans" :class="isExpired(mat) ? 'text-rose-600 font-semibold' : 'text-stone-500'">หมดอายุ :</span>
                        <span>{{ formatDisplayDate(mat.expiryDate) }}</span>
                        <span
                          v-if="isExpired(mat)"
                          class="inline-flex items-center px-1.5 py-0.5 rounded-full text-[12px] font-semibold bg-rose-100 text-rose-700 font-sans ml-1"
                        >
                          หมดอายุ
                        </span>
                      </span>

                      <!-- กรณีไม่มีการบันทึกวันที่หรือหมวดหมู่ none -->
                      <span v-if="store.getMaterialTrackingMode(mat) === 'none'" class="text-stone-500 font-sans text-[12px] shrink-0">ไม่ระบุวันที่</span>
                      <span v-else-if="!mat.lastStockInDate && !mat.expiryDate" class="text-stone-300 shrink-0">-</span>
                    </div>
                  </div>
                </div>
              </td>

              <!-- Category (Borderless Pill Badge) -->
              <td class="py-3.5 px-4">
                <span :data-inventory-type="mat.inventoryType" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-semibold bg-stone-100 text-stone-600 truncate max-w-full">
                  {{ getMaterialKindLabel(mat) }}
                </span>
                
              </td>

              <!-- Stock Level: Clear Quantity & Dedicated Stock In / Produce Action Button -->
              <td class="py-3.5 px-4 text-center">
                <div class="flex items-center justify-center gap-2.5">
                  <!-- Stock Quantity & Status -->
                  <div class="text-right shrink-0 tabular-nums min-w-[85px]">
                    <div class="font-bold font-number text-sm flex items-center justify-end gap-1 tabular-nums">
                      <!-- Icon ^ for increase (green), down sign for decrease (orange) in front of actual number -->
                      <ChevronUp
                        v-if="getDraftDiff(mat) > 0"
                        class="w-3.5 h-3.5 text-emerald-600 stroke-[3] shrink-0"
                      />
                      <ChevronDown
                        v-else-if="getDraftDiff(mat) < 0"
                        class="w-3.5 h-3.5 text-orange-500 stroke-[3] shrink-0"
                      />

                      <span
                        :class="[
                          mat.stock <= 0
                            ? 'text-rose-600 font-extrabold'
                            : mat.stock <= mat.minAlert
                              ? 'text-amber-600 font-bold'
                              : 'text-stone-900 font-bold'
                        ]"
                        class="tabular-nums"
                      >
                        {{ mat.stock.toLocaleString() }}
                      </span>
                      <span class="text-xs font-normal text-stone-500 shrink-0">{{ mat.unit }}</span>
                    </div>

                    <!-- Draft quantity text (Clean text, no badge: Green for increase, Orange for decrease) -->
                    <div
                      v-if="getDraftDiff(mat) !== 0"
                      class="text-[11px] font-bold font-number tabular-nums my-0.5 leading-tight flex items-center justify-end gap-0.5"
                      :class="getDraftDiff(mat) > 0 ? 'text-emerald-600' : 'text-orange-500'"
                      title="จำนวนที่รอยืนยันขั้นตอนสุดท้าย"
                    >
                      <span>{{ getDraftDiff(mat) > 0 ? `+${getDraftDiff(mat).toLocaleString()}` : getDraftDiff(mat).toLocaleString() }}</span>
                    </div>

                    <div v-if="mat.packUnit && mat.packSize > 1" class="text-[12px] text-stone-500 font-number tabular-nums truncate">
                      ≈ {{ (mat.stock / mat.packSize).toFixed(1) }} {{ mat.packUnit }}
                    </div>
                    <div v-else class="text-[12px] text-stone-300 font-number">
                      -
                    </div>
                  </div>

                  <!-- Purpose-built Action Button: Icon-only for Produce and Stock In -->
                  <div class="shrink-0">
                    <button
                      v-if="mat.hasSubRecipe && !mat.isDeleted"
                      type="button"
                      @click="openStockIn(mat.id)"
                      class="w-7 h-7 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 flex items-center justify-center transition-all shadow-2xs cursor-pointer active:scale-95"
                      title="ผลิตตามสูตร (หักสต็อกวัตถุดิบรองอัตโนมัติ)"
                    >
                      <span class="text-xs">🥣</span>
                    </button>
                    <button
                      v-else-if="!mat.isDeleted"
                      type="button"
                      @click="openStockIn(mat.id)"
                      class="w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 flex items-center justify-center transition-all shadow-2xs cursor-pointer active:scale-95"
                      title="รับเข้าสต็อก (ระบุจำนวน ราคา วันที่รับ และวันหมดอายุ)"
                    >
                      <ArrowDownToLine class="w-3.5 h-3.5 text-emerald-600" />
                    </button>
                    <div v-else class="w-7 h-7"></div>
                  </div>
                </div>
              </td>

              <!-- Unit Cost (Primary: Pack purchase cost e.g. ฿105/ขวด, Secondary: base unit cost) -->
              <td class="py-3.5 px-4 font-number text-right tabular-nums">
                <div class="font-bold text-stone-900 text-xs tabular-nums truncate">
                  ฿{{ getDisplayPackCost(mat).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }) }}
                  <span class="font-medium text-stone-500 text-[11px]">/{{ mat.packUnit || mat.unit }}</span>
                </div>
                <div v-if="(mat.packSize && mat.packSize > 1) || mat.hasSubRecipe" class="text-[12px] text-stone-500 mt-0.5 tabular-nums truncate">
                  (≈ ฿{{ Number(mat.unitCost || 0).toFixed(2) }}/{{ mat.unit }})
                </div>
              </td>

              <!-- Total Item Stock Valuation -->
              <td class="py-3.5 px-4 tabular-nums text-right">
                <div class="font-bold font-number text-amber-950 text-xs tabular-nums truncate">
                  ฿{{ (Math.max(0, mat.stock) * (mat.unitCost || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                </div>
              </td>

              <!-- Status Badge (Clean single badge, no countdown clutter) -->
              <td class="py-3.5 px-4 text-center">
                <span
                  v-if="mat.isDeleted"
                  class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[12px] font-semibold bg-stone-100 text-stone-600 border border-stone-200 shrink-0"
                >
                  <Archive class="w-3 h-3 text-stone-500" />
                  <span>จัดเก็บแล้ว</span>
                </span>
                <span
                  v-else-if="isExpired(mat)"
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-semibold bg-rose-100 text-rose-700 shrink-0"
                >
                  หมดอายุแล้ว
                </span>
                <span
                  v-else-if="mat.stock <= 0"
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-semibold bg-rose-100 text-rose-700 shrink-0"
                >
                  หมดสต็อก
                </span>
                <span
                  v-else-if="mat.stock <= mat.minAlert"
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-semibold bg-amber-100 text-amber-800 shrink-0"
                >
                  ใกล้หมด
                </span>
                <span
                  v-else
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-semibold bg-emerald-100 text-emerald-800 shrink-0"
                >
                  ปกติ
                </span>
              </td>

              <!-- Actions (More Dropdown Trigger) -->
              <td class="py-3.5 px-4 text-center">
                <button
                  type="button"
                  @click.stop="toggleActionMenu(mat.id, $event)"
                  class="p-1.5 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center shrink-0"
                  :class="activeActionMenuId === mat.id ? 'bg-stone-200 text-stone-900 shadow-2xs' : ''"
                  title="การจัดการเพิ่มเติม"
                >
                  <MoreHorizontal class="w-4 h-4" />
                </button>
              </td>
            </tr>

            <!-- Expanded Sub-lots Rows (Smooth Grid-Row Expansion & Exact Column Alignment) -->
            <tr v-if="hasMultipleLots(mat)" class="border-0">
              <td colspan="7" class="p-0 border-0">
                <div
                  class="accordion-grid overflow-hidden"
                  :class="{ 'is-expanded': isExpanded(mat.id) }"
                >
                  <div class="accordion-content">
                    <table class="w-full min-w-[1120px] table-fixed text-left text-xs">
                      <colgroup>
                        <col class="w-[28%]" />
                        <col class="w-[11%]" />
                        <col class="w-[18%]" />
                        <col class="w-[12%]" />
                        <col class="w-[13%]" />
                        <col class="w-[9%]" />
                        <col class="w-[9%]" />
                      </colgroup>
                      <tbody class="divide-y divide-stone-100 bg-[#FBF5EA] border-t border-stone-200/60 border-b border-stone-200/60">
                        <tr
                          v-for="(lot, lIdx) in getDisplayLots(mat)"
                          :key="lot.id"
                          class="hover:bg-[#F5F3EF] transition-colors text-xs"
                          :class="lot.isInUse ? 'bg-emerald-50/25' : ''"
                        >
                          <!-- 1. Sub-lot Name, Notes & Dates -->
                          <td class="py-3 px-4 pl-7 sm:pl-9">
                            <div class="flex items-center gap-2 min-w-0">
                              <span class="text-stone-300 font-mono text-xs leading-none shrink-0 select-none">↳</span>
                              <div class="min-w-0 flex-1 truncate">
                                <div class="font-bold text-stone-800 flex items-center gap-1.5 truncate text-[11px]">
                                  <span>ล็อตที่ {{ lIdx + 1 }}</span>
                                  <span v-if="lot.note" class="text-[12px] text-stone-500 font-normal truncate" :title="lot.note">({{ lot.note }})</span>
                                </div>
                                <div class="text-[12px] text-stone-500 flex items-center gap-1.5 mt-1 font-number whitespace-nowrap overflow-hidden">
                                  <!-- วันที่รับ -->
                                  <span v-if="lot.receiveDate" class="inline-flex items-center gap-1 shrink-0">
                                    <span class="text-stone-500 font-sans">รับ :</span>
                                    <span class="text-stone-700 font-medium">{{ formatDisplayDate(lot.receiveDate) }}</span>
                                    <span v-if="getLotAge(lot)" class="text-stone-500 font-sans text-[12px]">({{ getLotAge(lot).shortText }})</span>
                                  </span>

                                  <span v-if="lot.receiveDate && lot.expiryDate && store.getMaterialTrackingMode(mat) === 'expiry_and_receive'" class="text-stone-300 mx-0.5 shrink-0">•</span>

                                  <!-- วันที่หมดอายุ -->
                                  <span
                                    v-if="lot.expiryDate && store.getMaterialTrackingMode(mat) === 'expiry_and_receive'"
                                    class="inline-flex items-center gap-1 shrink-0"
                                    :class="isLotExpired(lot) ? 'text-rose-600 font-bold' : ''"
                                  >
                                    <span class="font-sans" :class="isLotExpired(lot) ? 'text-rose-600 font-semibold' : 'text-stone-500'">หมดอายุ :</span>
                                    <span>{{ formatDisplayDate(lot.expiryDate) }}</span>
                                    <span v-if="isLotExpired(lot)" class="inline-flex items-center px-1.5 py-0.5 rounded-full text-[12px] font-semibold bg-rose-100 text-rose-700 font-sans ml-1">หมดอายุ</span>
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          <!-- 2. Category (Left clean to avoid clutter) -->
                          <td class="py-3 px-4"></td>

                          <!-- 4. Lot Quantity (Centered matching main row) -->
                          <td class="py-3 px-4 text-center">
                            <div class="flex items-center justify-center gap-2.5">
                              <div class="text-right shrink-0 tabular-nums min-w-[85px]">
                                <div class="font-bold font-number text-xs flex items-center justify-end gap-1 text-stone-800">
                                  <span>{{ lot.qty.toLocaleString() }}</span>
                                  <span class="text-[12px] font-normal text-stone-500">{{ mat.unit }}</span>
                                </div>
                                <div v-if="mat.packUnit && mat.packSize > 1" class="text-[12px] text-stone-500 font-number tabular-nums">
                                  ≈ {{ (lot.qty / mat.packSize).toFixed(1) }} {{ mat.packUnit }}
                                </div>
                              </div>
                              <div class="w-7 h-7 shrink-0"></div>
                            </div>
                          </td>

                          <!-- 5. Lot Unit Cost -->
                          <td class="py-3 px-4 font-number text-stone-700 text-xs tabular-nums text-right">
                            <div class="font-bold text-stone-800 text-xs tabular-nums">
                              ฿{{ (lot.packCost || Math.round((lot.unitCost || mat.unitCost || 0) * (mat.packSize || 1) * 100) / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }) }}
                              <span class="font-normal text-stone-500 text-[12px]">/{{ mat.packUnit || mat.unit }}</span>
                            </div>
                            <div v-if="mat.packSize > 1" class="text-[12px] text-stone-500 tabular-nums mt-0.5">
                              (≈ ฿{{ Number(lot.unitCost || mat.unitCost || 0).toFixed(2) }}/{{ mat.unit }})
                            </div>
                          </td>

                          <!-- 6. Total Valuation of this lot -->
                          <td class="py-3 px-4 tabular-nums font-number text-xs font-bold text-amber-950 text-right">
                            ฿{{ Math.round(lot.qty * (lot.unitCost || mat.unitCost || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                          </td>

                          <!-- 7. Status & Switch Lot Action -->
                          <td class="py-3 px-4 text-center">
                            <span
                              v-if="isLotExpired(lot)"
                              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-semibold bg-rose-100 text-rose-800 shrink-0"
                            >
                              <span>🔴</span>
                              <span>หมดอายุ</span>
                            </span>
                            <span
                              v-else-if="lot.isInUse"
                              class="inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-semibold bg-emerald-100 text-emerald-800 shrink-0"
                            >
                              กำลังใช้งาน
                            </span>
                            <span
                              v-else-if="lot.qty <= 0"
                              class="inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-semibold bg-stone-100 text-stone-500 shrink-0"
                            >
                              หมดสต็อก
                            </span>
                            <button
                              v-else
                              type="button"
                              @click="onActionSwitchLot(mat.id, lot.id)"
                              class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-100 hover:bg-emerald-100 text-stone-600 hover:text-emerald-800 text-[12px] font-semibold transition-colors cursor-pointer"
                              title="สลับให้ระบบ POS และการขายดึงจากล็อตนี้ก่อน"
                            >
                              <Zap class="w-3 h-3 text-amber-500" />
                              <span>สลับมาใช้</span>
                            </button>
                          </td>

                          <!-- Actions (More Dropdown for Lot) -->
                          <td class="py-3 px-4 text-center relative">
                            <button
                              type="button"
                              @click.stop="toggleActionMenu(lot.id)"
                              class="p-1.5 text-stone-500 hover:text-stone-800 hover:bg-stone-200/60 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center shrink-0"
                              :class="activeActionMenuId === lot.id ? 'bg-stone-200/70 text-stone-900' : ''"
                              title="การจัดการล็อตนี้"
                            >
                              <MoreHorizontal class="w-4 h-4" />
                            </button>

                            <!-- Dropdown Popup Menu for Lot -->
                            <div
                              v-if="activeActionMenuId === lot.id"
                              @click.stop
                              :class="idx >= filteredMaterials.length - 2 ? 'bottom-11' : 'top-11'"
                              class="absolute right-2 z-30 w-48 bg-white rounded-xl shadow-xl border border-stone-200/80 py-1.5 text-xs text-left animate-in fade-in zoom-in-95 duration-100"
                            >
                              <button
                                v-if="!lot.isInUse && lot.qty > 0 && !isLotExpired(lot)"
                                @click="onActionSwitchLot(mat.id, lot.id)"
                                class="w-full px-3 py-2 text-stone-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center gap-2 transition-colors cursor-pointer"
                              >
                                <Zap class="w-3.5 h-3.5 text-amber-500" />
                                <span>สลับเป็นล็อตใช้งาน</span>
                              </button>

                              <button
                                @click="onActionStockAdjustLot(mat.id, lot.id)"
                                class="w-full px-3 py-2 text-stone-700 hover:bg-stone-50 flex items-center gap-2 transition-colors cursor-pointer"
                              >
                                <SlidersHorizontal class="w-3.5 h-3.5 text-amber-600" />
                                <span>ปรับยอดเฉพาะล็อตนี้</span>
                              </button>

                              <button
                                @click="onActionWasteLot(mat.id, lot.id)"
                                class="w-full px-3 py-2 text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors cursor-pointer"
                              >
                                <Trash2 class="w-3.5 h-3.5 text-rose-500" />
                                <span>{{ isLotExpired(lot) ? 'ตัดทิ้งของเสียที่หมดอายุ' : 'บันทึกของเสียล็อตนี้' }}</span>
                              </button>

                              <div class="my-1 border-t border-stone-100"></div>

                              <button
                                @click="onActionHistory(mat.id)"
                                class="w-full px-3 py-2 text-stone-700 hover:bg-stone-50 flex items-center gap-2 transition-colors cursor-pointer"
                              >
                                <History class="w-3.5 h-3.5 text-sky-600" />
                                <span>ประวัติการเคลื่อนไหว</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </td>
            </tr>
          </template>

            <!-- Empty Row -->
            <tr v-if="filteredMaterials.length === 0">
              <td colspan="7" class="py-12 text-center text-stone-500">
                <div class="text-3xl mb-2">🔍</div>
                <p class="text-xs font-medium">ไม่พบรายการวัตถุดิบตามเงื่อนไขที่เลือก</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <StockDraftReview :open="showDraftDetails" :has-drafts="store.hasStockDrafts" :items="store.stockDraftSummary.items" :snapshot="store.stockDraftSnapshot" :materials="store.materials" @open="showDraftDetails=true" @close="showDraftDetails=false" @commit="savePendingChanges" @discard="revertPendingChanges" />
    <!-- Teleported Floating Action Menu (Never clipped by table rows or overflow-x container) -->
    <Teleport to="body">
      <ModalShell label="งานวัตถุดิบ" :open="Boolean(activeActionMenuId && activeMenuMat)"
        class="fixed inset-0"
        @request-close="closeActionMenu"
      >
        <div
          class="fixed w-52 bg-white rounded-2xl shadow-2xl border border-stone-200/95 py-1.5 text-xs text-left text-stone-800 animate-in fade-in zoom-in-95 duration-100 divide-y divide-stone-100"
          :style="actionMenuPosition"
          @click.stop
        >
          <!-- Context Item Header -->
          <div class="px-3.5 py-2.5 bg-stone-50/80 rounded-t-2xl flex items-center justify-between">
            <div class="flex items-center gap-2 min-w-0 pr-2">
              <span class="text-base shrink-0">{{ activeMenuMat.emoji || '📦' }}</span>
              <span class="font-bold text-stone-900 truncate">{{ activeMenuMat.name }}</span>
            </div>
            <span
              v-if="activeMenuMat.isDeleted"
              class="text-[12px] px-1.5 py-0.5 rounded-full bg-stone-200 text-stone-700 font-semibold shrink-0"
            >
              จัดเก็บ
            </span>
          </div>

          <!-- General Actions -->
          <div class="py-1">
            <button
              type="button"
              @click="onActionHistory(activeMenuMat.id)"
              class="w-full px-3.5 py-2 text-stone-700 hover:bg-stone-50 flex items-center gap-2.5 transition-colors cursor-pointer"
            >
              <History class="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <span>ประวัติการเคลื่อนไหว</span>
            </button>

            <button
              type="button"
              @click="onActionEdit(activeMenuMat.id)"
              class="w-full px-3.5 py-2 text-stone-700 hover:bg-stone-50 flex items-center gap-2.5 transition-colors cursor-pointer"
            >
              <Edit3 class="w-3.5 h-3.5 text-stone-600 shrink-0" />
              <span>แก้ไขข้อมูล / สูตร</span>
            </button>
          </div>

          <!-- Operational Actions (Only active materials) -->
          <div v-if="!activeMenuMat.isDeleted" class="py-1">
            <button
              type="button"
              @click="onActionStockIn(activeMenuMat.id)"
              class="w-full px-3.5 py-2 text-stone-700 hover:bg-stone-50 flex items-center gap-2.5 transition-colors cursor-pointer"
            >
              <ArrowDownToLine class="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>รับเข้าสต็อก</span>
            </button>

            <button
              type="button"
              @click="onActionStockAdjust(activeMenuMat.id)"
              class="w-full px-3.5 py-2 text-stone-700 hover:bg-stone-50 flex items-center gap-2.5 transition-colors cursor-pointer"
            >
              <SlidersHorizontal class="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>ปรับยอดนับจริง</span>
            </button>

            <button
              type="button"
              @click="onActionWaste(activeMenuMat.id)"
              class="w-full px-3.5 py-2 text-stone-700 hover:bg-stone-50 flex items-center gap-2.5 transition-colors cursor-pointer"
            >
              <Trash2 class="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span>บันทึกของเสีย (Waste)</span>
            </button>
          </div>

          <!-- Lifecycle Actions: Archive, Restore, Delete Permanently -->
          <div class="py-1">
            <button
              v-if="!activeMenuMat.isDeleted"
              type="button"
              @click="onActionArchive(activeMenuMat)"
              class="w-full px-3.5 py-2 text-stone-700 hover:bg-amber-50 hover:text-amber-800 flex items-center gap-2.5 transition-colors cursor-pointer"
            >
              <Archive class="w-3.5 h-3.5 text-stone-500 shrink-0" />
              <span>จัดเก็บรายการนี้ (Archive)</span>
            </button>

            <button
              v-else
              type="button"
              @click="onActionRestore(activeMenuMat)"
              class="w-full px-3.5 py-2 text-emerald-700 hover:bg-emerald-50 flex items-center gap-2.5 transition-colors cursor-pointer font-medium"
            >
              <RotateCcw class="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>ยกเลิกจัดเก็บ (Restore)</span>
            </button>

            <button
              type="button"
              @click="onActionPermanentDelete(activeMenuMat)"
              class="w-full px-3.5 py-2 text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors cursor-pointer font-medium"
            >
              <Trash2 class="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>ลบถาวร (Delete)</span>
            </button>
          </div>
        </div>
      </ModalShell>
    </Teleport>

    <DialogFrame id="stock-delete-material" title="ยืนยันลบวัตถุดิบถาวร" :open="showDeleteModal" width="440px" initial-focus="[data-delete-cancel]" @request-close="closeDeleteModal">
      <template v-if="materialToDelete">
        <p class="font-semibold">{{ materialToDelete.name }} · {{ materialToDelete.id }}</p>
        <template v-if="deleteUsageWarning?.isInUse"><p class="mt-3">รายการนี้ยังอยู่ในสูตร จัดเก็บแทนเพื่อรักษาข้อมูลสูตร</p><ul class="mt-3 space-y-2"><li v-for="name in [...deleteUsageWarning.usedInMenus,...deleteUsageWarning.usedInAddons,...deleteUsageWarning.usedInMaterials]" :key="name">{{ name }}</li></ul></template>
        <p v-else class="mt-3 text-sm">ข้อมูลวัตถุดิบและล็อตจะถูกลบอย่างถาวร และกู้คืนไม่ได้</p>
      </template>
      <template #footer><Button variant="secondary" data-delete-cancel @click="closeDeleteModal">ยกเลิก</Button><Button v-if="deleteUsageWarning?.isInUse" @click="confirmArchiveInstead">จัดเก็บแทน</Button><Button v-else variant="danger" data-delete-material @click="confirmDeletePermanently">ลบถาวร</Button></template>
    </DialogFrame>
  </div>
</template>

<script setup>
import DialogFrame from '@/components/ui/DialogFrame.vue'
import Button from '@/components/ui/Button.vue'
import StockDraftReview from '@/components/inventory/StockDraftReview.vue'
import StockMaterialCard from '@/components/inventory/StockMaterialCard.vue'
import MaterialDetails from '@/components/inventory/MaterialDetails.vue'
import StockToolbar from '@/components/inventory/StockToolbar.vue'
import StockSummary from '@/components/inventory/StockSummary.vue'
import MaterialUsage from '@/components/inventory/MaterialUsage.vue'
import { getMaterialKindLabel, matchesMaterialFilter } from '@/domain/materialClassification'
import ModalShell from '@/components/ui/ModalShell.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppCheckbox from '@/components/ui/AppCheckbox.vue'
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
  Zap,
  Archive,
  AlertTriangle,
  ClipboardCheck
} from 'lucide-vue-next'

const store = usePosStore()
function applyStockFilters(values){selectedRole.value=values.role;selectedKind.value=values.kind;showDeleted.value=values.showDeleted}

const detailMaterialId=ref(null)
const detailMaterial=computed(()=>store.materials.find(m=>m.id===detailMaterialId.value)||null)
const searchQuery = ref('')
const selectedRole = ref('all') // 'all' | 'main' | 'sub'
const selectedKind = ref('all')
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

// Action menu dropdown state & positioning
const activeActionMenuId = ref(null)
const actionMenuPosition = ref({ top: '0px', right: '0px' })

const activeMenuMat = computed(() => {
  if (!activeActionMenuId.value) return null
  return store.materials.find(m => m.id === activeActionMenuId.value) || null
})

// Permanent Delete & Usage Warning state
const showDeleteModal = ref(false)
const materialToDelete = ref(null)
const deleteUsageWarning = ref(null)

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
  window.addEventListener('resize', closeActionMenu)
  window.addEventListener('scroll', closeActionMenu, true)
})

onUnmounted(() => {
  window.removeEventListener('click', closeActionMenu)
  window.removeEventListener('resize', closeActionMenu)
  window.removeEventListener('scroll', closeActionMenu, true)
})

function toggleActionMenu(matId, event) {
  if (activeActionMenuId.value === matId) {
    closeActionMenu()
    return
  }

  const trigger = event?.currentTarget
  if (trigger) {
    const rect = trigger.getBoundingClientRect()
    const menuWidth = 208 // w-52
    const menuHeight = 280

    let top = rect.bottom + 6
    let transformOrigin = 'top right'

    // If near bottom of viewport, flip upwards
    if (rect.bottom + menuHeight > window.innerHeight - 10) {
      top = Math.max(10, rect.top - menuHeight - 6)
      transformOrigin = 'bottom right'
    }

    let right = window.innerWidth - rect.right
    if (right < 10) right = 10

    actionMenuPosition.value = {
      top: `${top}px`,
      right: `${right}px`,
      transformOrigin
    }
  }

  activeActionMenuId.value = matId
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

function onActionArchive(mat) {
  closeActionMenu()
  store.softDeleteMaterial(mat.id)
}

function onActionRestore(mat) {
  closeActionMenu()
  store.restoreMaterial(mat.id)
}

function onActionPermanentDelete(mat) {
  closeActionMenu()
  materialToDelete.value = mat
  deleteUsageWarning.value = store.getMaterialUsage(mat.id)
  showDeleteModal.value = true
}

function closeDeleteModal() {
  showDeleteModal.value = false
  materialToDelete.value = null
  deleteUsageWarning.value = null
}

function confirmArchiveInstead() {
  if (materialToDelete.value) {
    store.softDeleteMaterial(materialToDelete.value.id)
  }
  closeDeleteModal()
}

function confirmDeletePermanently() {
  if(!showDeleteModal.value || deleteUsageWarning.value?.isInUse)return
  if (materialToDelete.value) {
    store.deleteMaterialPermanently(materialToDelete.value.id)
  }
  closeDeleteModal()
}

function onActionStockAdjustLot(matId, lotId) {
  closeActionMenu()
  openStockAdjust(matId, lotId)
}

function onActionWasteLot(matId, lotId) {
  closeActionMenu()
  store.openWasteModal(matId, lotId)
}

function onActionSwitchLot(matId, lotId) {
  closeActionMenu()
  store.switchActiveLot(matId, lotId, true)
}

// -------------------------------------------------------------
// Floating Bottom Save Bar Logic (Real Final Save at Main Stock Popup)
// -------------------------------------------------------------
const showDraftDetails = ref(false)

function savePendingChanges() {
  const result=store.commitStockDrafts()
  if(result?.ok || result?.success)showDraftDetails.value = false
  else store.showToast(result?.message||'บันทึกไม่สำเร็จ แบบร่างยังอยู่ กรุณาลองอีกครั้ง','error')
}

async function revertPendingChanges() {
  const discard=await store.confirmDialog({title:'ยกเลิกแบบร่างทั้งหมด?',message:'ยอดในแบบร่างจะกลับไปเป็นยอดที่บันทึกไว้ก่อนหน้า',type:'danger',confirmText:'ยกเลิกแบบร่าง',cancelText:'เก็บแบบร่างไว้'})
  if(!discard)return
  store.discardStockDrafts()
  showDraftDetails.value = false
}

// -------------------------------------------------------------
// Filters & Other Helpers
// -------------------------------------------------------------
const kinds = computed(() => [{id:'all',label:'ทุกประเภท'}, ...store.materialKindOptions])

const deletedCount = computed(() => {
  return store.materials.filter(m => m.isDeleted).length
})

const filteredMaterials = computed(() => {
  return store.materials.filter(m => {
    // Deleted filter
    if (!showDeleted.value && m.isDeleted) return false

    if (!matchesMaterialFilter(m, store.materialUsageById.get(m.id), {kind:selectedKind.value,role:selectedRole.value})) return false

    // Search query
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase().trim()
      const matchName = m.name?.toLowerCase().includes(q)
      const matchId = m.id?.toLowerCase().includes(q)
      const matchUnit = m.unit?.toLowerCase().includes(q)
      const matchCat = getMaterialKindLabel(m).toLowerCase().includes(q)
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

function openStockAdjust(id = null, lotId = null) {
  store.modals.stockAdjust = {
    isOpen: true,
    materialId: id || (store.activeMaterials[0]?.id || null),
    lotId: lotId || null
  }
}

function openStocktake() {
  store.openStocktakeModal()
}

function archiveMaterial(mat) {
  store.softDeleteMaterial(mat.id)
}

function getDisplayPackCost(mat) {
  const pCost = Number(mat.packCost)
  if (pCost && pCost > 0) return pCost
  const uCost = Number(mat.unitCost) || 0
  const pSize = Number(mat.packSize) || 1
  return Math.round(uCost * pSize * 100) / 100
}
</script>

<style scoped>
.adaptive-material-list{display:none}
@media(max-width:1199px){.adaptive-material-list{display:block;overflow:hidden}.desktop-material-table{display:none}}

.accordion-grid {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 320ms cubic-bezier(0.4, 0, 0.2, 1), opacity 260ms ease-in-out;
  opacity: 0;
}
.accordion-grid.is-expanded {
  grid-template-rows: 1fr;
  opacity: 1;
}
.accordion-content {
  overflow: hidden;
}
</style>
