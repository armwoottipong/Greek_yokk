<template>
  <div class="settings-page">
    <!-- Header -->
    <div class="settings-intro">
      <div>
      <h2>ตั้งค่าร้านให้ลงตัว</h2>
      <p class="text-xs text-stone-400 mt-0.5">
        ข้อมูลหลักเก็บในเครื่องนี้ จัดหมวดหมู่ สำรองข้อมูล และดูการเชื่อมต่อได้ในที่เดียว
      </p>
      </div>
      <span class="settings-local"><Database :size="15" /> ข้อมูลหลักเก็บในเครื่อง</span>
    </div>

    <div class="settings-layout">
    <nav aria-label="หมวดการตั้งค่า" class="settings-nav">
      <button v-for="section in settingsSections" :key="section.id" type="button"
        :aria-controls="`settings-${section.id}`" :aria-pressed="activeSettingsSection === section.id"
        @click="activeSettingsSection = section.id"
        class="settings-nav-item">
        <component :is="section.icon" :size="18" />
        <span><strong>{{ section.label }}</strong><small>{{ section.description }}</small></span>
      </button>
    </nav>
    <div class="settings-content">

    <!-- Section 1: Google Apps Script Web App Integration -->
    <div id="settings-sheets" data-settings="sheets" v-show="activeSettingsSection === 'sheets'" class="editorial-card p-4 sm:p-6 bg-white space-y-4">
      <div class="flex items-center gap-3 border-b border-stone-100 pb-3">
        <div class="p-2 rounded-xl bg-emerald-50 text-emerald-800">
          <Cloud class="w-5 h-5" />
        </div>
        <div>
          <h3 class="text-sm font-bold text-stone-900">เชื่อมต่อ Google Sheets</h3>
          <p class="text-xs text-stone-500">สำรองข้อมูลไป Google Sheets เพิ่มเติม ระบบขายใช้งานได้โดยไม่ต้องเชื่อมต่อ</p>
        </div>
      </div>

      <div class="space-y-3">
        <div>
          <label for="gas-url" class="block text-xs font-semibold text-stone-700 mb-1">
            Google Apps Script Web App URL
          </label>
          <div class="flex flex-col sm:flex-row gap-2">
            <input
              v-model="gasUrlInput"
              id="gas-url"
              type="url"
              placeholder="https://script.google.com/macros/s/AKfycb.../exec"
              class="soft-input flex-1 px-3 py-2 rounded-xl text-xs font-mono text-stone-900 placeholder:text-stone-400"
            />
            <button
              @click="saveGasUrl"
              class="px-4 py-2 bg-brand-600 hover:bg-brand-800 text-white rounded-xl text-xs font-semibold transition-colors shrink-0"
            >
              บันทึก URL
            </button>
          </div>
          <p class="text-[11px] text-stone-400 mt-1.5">
            URL ที่ได้จากการ Deploy เป็น Web App ใน Google Apps Script (Who has access: Anyone)
          </p>
        </div>

        <div class="flex flex-wrap gap-3 items-center justify-between pt-2">
          <div class="flex items-center gap-2 text-xs">
            <span
              class="w-2.5 h-2.5 rounded-full"
              :class="store.gasApiUrl ? 'bg-emerald-500' : 'bg-stone-300'"
            ></span>
            <span class="text-stone-600 font-medium">
              {{ store.gasApiUrl ? 'บันทึก URL แล้ว' : 'ยังไม่ได้ระบุ URL' }}
            </span>
            <span v-if="store.lastSyncTime" class="text-stone-400 text-[11px]">
              (ซิงค์ล่าสุด: {{ store.lastSyncTime }})
            </span>
          </div>

          <button
            @click="testSync"
            :disabled="store.isSyncing || !store.gasApiUrl"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-semibold disabled:opacity-50 transition-colors"
          >
            <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': store.isSyncing }" />
            <span>{{ store.isSyncing ? 'กำลังส่งข้อมูล...' : 'สำรองไป Google Sheets' }}</span>
          </button>
        </div>
        <p v-if="store.syncError" role="alert" class="text-sm text-rose-700">{{ store.syncError }}</p>
      </div>
    </div>

    <!-- Section 2: Platform & Channel GP Rates -->
    <div id="settings-platforms" data-settings="platforms" v-show="activeSettingsSection === 'platforms'" class="editorial-card p-4 sm:p-6 bg-white space-y-4">
      <div class="flex items-center gap-3 border-b border-stone-100 pb-3">
        <div class="p-2 rounded-xl bg-amber-50 text-amber-800">
          <Store class="w-5 h-5" />
        </div>
        <div>
          <h3 class="text-sm font-bold text-stone-900">ช่องทางขายและค่าธรรมเนียม</h3>
          <p class="text-xs text-stone-400">อัตรา GP ที่ใช้คำนวณกำไรในแต่ละบิล</p>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div
          v-for="plat in store.platforms"
          :key="plat.id"
          class="p-3.5 rounded-xl border border-stone-100 bg-[#FBF5EA] flex items-center justify-between"
        >
          <div class="flex items-center gap-2.5">
            <span class="text-2xl">{{ plat.icon }}</span>
            <div>
              <div class="font-bold text-stone-900 text-xs">{{ plat.name }}</div>
              <div class="text-[11px] text-stone-400">ค่าธรรมเนียมช่องทาง</div>
            </div>
          </div>
          <div class="text-right">
            <span class="text-xs font-bold font-number text-amber-900 bg-amber-100/60 px-2 py-0.5 rounded-md">
              GP {{ plat.gpPercent }}%
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Section 3: Category Management (จัดการหมวดหมู่ระบบ) -->
    <div id="settings-categories" data-settings="categories" v-show="activeSettingsSection === 'categories'" class="editorial-card p-4 sm:p-6 bg-white space-y-5">
      <div class="flex items-center justify-between border-b border-stone-100 pb-3">
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-xl bg-indigo-50 text-indigo-700">
            <Tags class="w-5 h-5" />
          </div>
          <div>
            <h3 class="text-sm font-bold text-stone-900">จัดระเบียบหมวดหมู่</h3>
            <p class="text-xs text-stone-400">เพิ่ม ลบ หรือแก้ไขชื่อหมวดหมู่สำหรับเมนู วัตถุดิบ และ Add-on ให้เป็นระเบียบ</p>
          </div>
        </div>
      </div>

      <!-- Category Type Switcher (Tabs) -->
      <div class="settings-category-tabs flex flex-wrap items-center gap-1.5 p-1 bg-stone-100/80 rounded-xl w-fit">
        <button
          @click="activeCategoryTab = 'menu'"
          :class="activeCategoryTab === 'menu' ? 'bg-white text-stone-900 shadow-xs font-semibold' : 'text-stone-500 hover:text-stone-800'"
          class="px-3 py-1.5 rounded-lg text-xs transition-all flex items-center gap-2 cursor-pointer"
        >
          <span>🥣 เมนู / สินค้า</span>
          <span class="px-1.5 py-0.2 rounded-full text-[10px] bg-stone-100 text-stone-600 font-number">
            {{ store.menuCategories.length }}
          </span>
        </button>
        <button
          @click="activeCategoryTab = 'material'"
          :class="activeCategoryTab === 'material' ? 'bg-white text-stone-900 shadow-xs font-semibold' : 'text-stone-500 hover:text-stone-800'"
          class="px-3 py-1.5 rounded-lg text-xs transition-all flex items-center gap-2 cursor-pointer"
        >
          <span>📦 วัตถุดิบ & บรรจุภัณฑ์</span>
          <span class="px-1.5 py-0.2 rounded-full text-[10px] bg-stone-100 text-stone-600 font-number">
            {{ store.materialCategories.length }}
          </span>
        </button>
        <button
          @click="activeCategoryTab = 'addon'"
          :class="activeCategoryTab === 'addon' ? 'bg-white text-stone-900 shadow-xs font-semibold' : 'text-stone-500 hover:text-stone-800'"
          class="px-3 py-1.5 rounded-lg text-xs transition-all flex items-center gap-2 cursor-pointer"
        >
          <span>✨ ท็อปปิ้งเสริม (Add-on)</span>
          <span class="px-1.5 py-0.2 rounded-full text-[10px] bg-stone-100 text-stone-600 font-number">
            {{ store.addonCategories.length }}
          </span>
        </button>
      </div>

      <!-- Add New Category Inline Input -->
      <div class="settings-category-form p-3.5 rounded-2xl bg-[#FBF5EA] border border-stone-200/60 flex flex-wrap items-center gap-2.5">
        <div class="settings-category-fields flex items-center gap-2 flex-1 min-w-0">
          <!-- Emoji button -->
          <button
            type="button"
            @click="openEmojiForNewCategory"
            class="w-9 h-9 rounded-xl bg-white border border-stone-200 hover:border-stone-400 flex items-center justify-center text-lg hover:bg-stone-50 transition-colors shrink-0 shadow-2xs cursor-pointer"
            title="คลิกเพื่อเลือกไอคอน"
          >
            {{ newCatForm.icon }}
          </button>
          <input
            v-model="newCatForm.name"
            aria-label="ชื่อหมวดหมู่ใหม่"
            type="text"
            :placeholder="getPlaceholder(activeCategoryTab)"
            @keyup.enter="addNewCategory"
            class="soft-input flex-1 px-3 py-2 rounded-xl text-xs font-medium text-stone-900 placeholder:text-stone-400"
          />
          <input
            v-if="activeCategoryTab === 'material'"
            v-model="newCatForm.label"
            aria-label="ชื่อภาษาไทยของหมวดหมู่ใหม่"
            type="text"
            placeholder="ชื่อภาษาไทย (ถ้ามี)"
            @keyup.enter="addNewCategory"
            class="soft-input w-36 px-3 py-2 rounded-xl text-xs font-medium text-stone-900 placeholder:text-stone-400"
          />
        </div>

        <!-- Material date tracking mode selector -->
        <div v-if="activeCategoryTab === 'material'" class="flex items-center gap-1 bg-stone-100 p-1 rounded-xl">
          <button
            type="button"
            @click="newCatForm.dateTrackingMode = 'receive_only'"
            :class="newCatForm.dateTrackingMode === 'receive_only' ? 'bg-white text-stone-900 shadow-2xs font-semibold' : 'text-stone-500 hover:text-stone-800'"
            class="px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1"
            title="บันทึกเฉพาะวันที่รับเข้า (เหมาะกับผลไม้สด เบสโยเกิร์ต)"
          >
            <span>🕒</span>
            <span>เฉพาะวันรับ</span>
          </button>
          <button
            type="button"
            @click="newCatForm.dateTrackingMode = 'expiry_and_receive'"
            :class="newCatForm.dateTrackingMode === 'expiry_and_receive' ? 'bg-white text-stone-900 shadow-2xs font-semibold' : 'text-stone-500 hover:text-stone-800'"
            class="px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1"
            title="บันทึกทั้งวันรับและวันหมดอายุ (เหมาะกับนมสด หัวเชื้อ)"
          >
            <span>📅</span>
            <span>รับ + หมดอายุ</span>
          </button>
          <button
            type="button"
            @click="newCatForm.dateTrackingMode = 'none'"
            :class="newCatForm.dateTrackingMode === 'none' ? 'bg-white text-stone-900 shadow-2xs font-semibold' : 'text-stone-500 hover:text-stone-800'"
            class="px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1"
            title="ไม่ติดตามวันที่ (เหมาะกับบรรจุภัณฑ์ ของแห้ง)"
          >
            <span>🚫</span>
            <span>ไม่ติดตาม</span>
          </button>
        </div>

        <button
          @click="addNewCategory"
          class="px-4 py-2 bg-brand-600 hover:bg-brand-800 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
        >
          <Plus class="w-3.5 h-3.5" />
          <span>เพิ่มหมวดหมู่</span>
        </button>
      </div>

      <!-- Category List Grid -->
      <div class="settings-category-list grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div
          v-for="cat in currentCategoryList"
          :key="cat.id"
          class="p-3 rounded-xl border border-stone-200/70 bg-white hover:border-stone-300 transition-all flex gap-2 shadow-2xs"
          :class="editingCatId === cat.id ? 'flex-col items-stretch ring-2 ring-stone-900/10' : 'items-center justify-between'"
        >
          <!-- Edit mode -->
          <div v-if="editingCatId === cat.id" class="w-full space-y-2">
            <div class="flex items-center gap-2">
              <button
                type="button"
                @click="openEmojiForEditingCategory"
                class="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-base shrink-0 transition-colors cursor-pointer"
                title="เปลี่ยนไอคอน"
              >
                {{ editCatForm.icon }}
              </button>
              <div class="flex-1 min-w-0 space-y-1">
                <input
                  v-model="editCatForm.name"
                  type="text"
                  placeholder="ชื่อหมวดหมู่"
                  class="soft-input w-full px-2.5 py-1 text-xs font-medium text-stone-900"
                  @keyup.enter="saveEditingCategory"
                  @keyup.esc="cancelEditingCategory"
                  autofocus
                />
                <input
                  v-if="activeCategoryTab === 'material'"
                  v-model="editCatForm.label"
                  type="text"
                  placeholder="ชื่อภาษาไทย"
                  class="soft-input w-full px-2.5 py-1 text-[11px] font-medium text-stone-600"
                  @keyup.enter="saveEditingCategory"
                  @keyup.esc="cancelEditingCategory"
                />
              </div>
              <div class="flex items-center gap-1 shrink-0">
                <button
                  @click="saveEditingCategory"
                  class="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                  title="บันทึก"
                >
                  <Check class="w-4 h-4" />
                </button>
                <button
                  @click="cancelEditingCategory"
                  class="p-1.5 text-stone-400 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                  title="ยกเลิก"
                >
                  <X class="w-4 h-4" />
                </button>
              </div>
            </div>

            <!-- Material Tracking Mode Selector in Edit mode -->
            <div v-if="activeCategoryTab === 'material'" class="flex items-center gap-1 bg-stone-100/90 p-1 rounded-lg">
              <button
                type="button"
                @click="editCatForm.dateTrackingMode = 'receive_only'"
                :class="editCatForm.dateTrackingMode === 'receive_only' ? 'bg-white text-stone-900 shadow-2xs font-semibold' : 'text-stone-500 hover:text-stone-800'"
                class="flex-1 py-1 rounded text-[10px] transition-all cursor-pointer text-center"
              >
                🕒 เฉพาะวันรับ
              </button>
              <button
                type="button"
                @click="editCatForm.dateTrackingMode = 'expiry_and_receive'"
                :class="editCatForm.dateTrackingMode === 'expiry_and_receive' ? 'bg-white text-stone-900 shadow-2xs font-semibold' : 'text-stone-500 hover:text-stone-800'"
                class="flex-1 py-1 rounded text-[10px] transition-all cursor-pointer text-center"
              >
                📅 รับ+หมดอายุ
              </button>
              <button
                type="button"
                @click="editCatForm.dateTrackingMode = 'none'"
                :class="editCatForm.dateTrackingMode === 'none' ? 'bg-white text-stone-900 shadow-2xs font-semibold' : 'text-stone-500 hover:text-stone-800'"
                class="flex-1 py-1 rounded text-[10px] transition-all cursor-pointer text-center"
              >
                🚫 ไม่ติดตาม
              </button>
            </div>
          </div>

          <!-- Normal display mode -->
          <template v-else>
            <div class="flex items-center gap-2.5 min-w-0 flex-1">
              <span class="w-8 h-8 rounded-lg bg-[#F4EBDD] flex items-center justify-center text-base shrink-0 select-none">
                {{ cat.icon || '🏷️' }}
              </span>
              <div class="min-w-0 flex-1">
                <div class="font-bold text-xs text-stone-800 truncate">
                  {{ cat.name }}
                </div>
                <div class="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span v-if="cat.label && cat.label !== cat.name" class="text-[10px] text-stone-400 truncate">
                    {{ cat.label }}
                  </span>
                  <span
                    v-if="activeCategoryTab === 'material'"
                    class="text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0"
                    :class="getTrackingModeClass(cat.dateTrackingMode)"
                  >
                    {{ getTrackingModeLabel(cat.dateTrackingMode) }}
                  </span>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-1.5 shrink-0">
              <!-- Item count badge -->
              <span
                class="text-[10px] px-2 py-0.5 rounded-full font-number font-semibold"
                :class="getItemCount(activeCategoryTab, cat.name) > 0 ? 'bg-amber-100 text-amber-900' : 'bg-stone-100 text-stone-500'"
              >
                {{ getItemCount(activeCategoryTab, cat.name) }} {{ getItemUnitLabel(activeCategoryTab) }}
              </span>

              <!-- Edit button -->
              <button
                @click="startEditingCategory(cat)"
                class="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                title="แก้ไขหมวดหมู่"
              >
                <Edit3 class="w-3.5 h-3.5" />
              </button>

              <!-- Delete button -->
              <button
                @click="handleDeleteCategory(activeCategoryTab, cat)"
                class="p-1.5 text-stone-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                title="ลบหมวดหมู่"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Section 4: Data Management & Backup -->
    <div id="settings-backup" data-settings="backup" v-show="activeSettingsSection === 'backup'" class="editorial-card p-4 sm:p-6 bg-white space-y-4">
      <div class="flex items-center gap-3 border-b border-stone-100 pb-3">
        <div class="p-2 rounded-xl bg-rose-50 text-rose-800">
          <Database class="w-5 h-5" />
        </div>
        <div>
          <h3 class="text-sm font-bold text-stone-900">สำรองและกู้คืนข้อมูล</h3>
          <p class="text-xs text-stone-500">ดาวน์โหลดข้อมูลเก็บไว้ก่อนกู้คืนหรือเริ่มร้านใหม่</p>
        </div>
      </div>

      <div class="settings-backup-actions">
        <!-- Export Backup -->
        <div class="settings-backup-card is-export">
          <div>
            <div class="font-bold text-xs text-stone-900 flex items-center gap-1.5">
              <Download class="w-4 h-4 text-stone-600" />
              <span>เก็บข้อมูลร้านไว้ให้อุ่นใจ</span>
            </div>
            <p class="text-[11px] text-stone-400 mt-1">
              ดาวน์โหลดไฟล์ .json รวมเมนู วัตถุดิบ และประวัติคำสั่งซื้อ
            </p>
          </div>
          <button
            @click="exportBackup"
            class="w-full py-2 bg-white hover:bg-stone-100 border border-stone-200 text-stone-800 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            ดาวน์โหลดไฟล์สำรอง
          </button>
        </div>

        <!-- Import Backup -->
        <div class="settings-backup-card">
          <div>
            <div class="font-bold text-xs text-stone-900 flex items-center gap-1.5">
              <Upload class="w-4 h-4 text-stone-600" />
              <span>กู้คืนจากไฟล์สำรอง</span>
            </div>
            <p class="text-[11px] text-stone-400 mt-1">
              กู้คืนข้อมูลจากไฟล์ JSON ที่เคยสำรองไว้
            </p>
          </div>
          <div>
            <input
              type="file"
              ref="fileInput"
              accept=".json"
              class="hidden"
              @change="handleImportFile"
            />
            <button
              @click="$refs.fileInput.click()"
              class="w-full py-2 bg-white hover:bg-stone-100 border border-stone-200 text-stone-800 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              เลือกไฟล์เพื่อกู้คืน
            </button>
          </div>
        </div>
      </div>
      <div class="settings-reset-heading"><h4>เริ่มต้นข้อมูลใหม่</h4><p>ทั้งสองตัวเลือกจะแทนที่ข้อมูลปัจจุบัน ควรเก็บไฟล์สำรองก่อน</p></div>
      <div class="settings-reset-actions">

        <!-- Clear All Data (Start Fresh) -->
        <div class="settings-reset-card is-danger">
          <div>
            <div class="font-bold text-xs text-rose-900 flex items-center gap-1.5">
              <Trash2 class="w-4 h-4 text-rose-600" />
              <span>ล้างข้อมูลทั้งหมด (เริ่มใหม่)</span>
            </div>
            <p class="text-[11px] text-stone-500 mt-1">
              ลบเมนู วัตถุดิบ ท็อปปิ้ง และประวัติขาย เพื่อเริ่มร้านใหม่
            </p>
          </div>
          <button
            @click="confirmClearAll"
            class="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            ล้างข้อมูลทั้งหมดออก
          </button>
        </div>

        <!-- Reset Demo Data -->
        <div class="settings-reset-card">
          <div>
            <div class="font-bold text-xs text-stone-800 flex items-center gap-1.5">
              <RotateCcw class="w-4 h-4 text-stone-600" />
              <span>โหลดตัวอย่าง (Demo Data)</span>
            </div>
            <p class="text-[11px] text-stone-400 mt-1">
              คืนค่าเมนู วัตถุดิบ และออเดอร์ตัวอย่างของร้านกรีกโยเกิร์ต
            </p>
          </div>
          <button
            @click="confirmResetDemo"
            class="w-full py-2 bg-white hover:bg-stone-100 border border-stone-200 text-stone-800 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            โหลดข้อมูลตัวอย่าง Demo
          </button>
        </div>
      </div>
    </div>

    <!-- Section 4: System Information -->
    <div class="settings-footer">
      <div class="flex items-center gap-2">
        <Database :size="14" />
        <span>Greek Yogg. · ข้อมูลในเครื่องนี้</span>
      </div>
      <div>
        {{ (store.materials.length + store.menus.length + store.addons.length + store.orders.length) }} รายการ
      </div>
    </div>
    </div>
    </div>
  </div>
</template>

<script setup>
import '@/assets/settings.css'
import { businessDateKey } from '@/domain/businessDate'
import { ref, computed, watch } from 'vue'
import { usePosStore } from '@/stores/posStore'
import {
  Cloud,
  Store,
  Database,
  RefreshCw,
  Download,
  Upload,
  RotateCcw,
  Tags,
  Plus,
  Edit3,
  Trash2,
  Check,
  X
} from 'lucide-vue-next'

const store = usePosStore()
const activeSettingsSection = ref('backup')
const settingsSections = [
  { id: 'backup', label: 'สำรองและกู้คืน', description: 'เก็บข้อมูลร้านให้อุ่นใจ', icon: Database },
  { id: 'categories', label: 'หมวดหมู่', description: 'เมนู วัตถุดิบ และท็อปปิ้ง', icon: Tags },
  { id: 'platforms', label: 'ช่องทางขาย', description: 'ดูอัตราค่าธรรมเนียม GP', icon: Store },
  { id: 'sheets', label: 'Google Sheets', description: 'เชื่อมต่อและสำรองออนไลน์', icon: Cloud }
]
const gasUrlInput = ref(store.gasApiUrl)
const fileInput = ref(null)

// ==========================================
// CATEGORY MANAGEMENT LOGIC
// ==========================================
const activeCategoryTab = ref('menu') // 'menu' | 'material' | 'addon'

const currentCategoryList = computed(() => {
  if (activeCategoryTab.value === 'menu') return store.menuCategories
  if (activeCategoryTab.value === 'material') return store.materialCategories
  if (activeCategoryTab.value === 'addon') return store.addonCategories
  return []
})

const newCatForm = ref({
  name: '',
  label: '',
  icon: '🥣',
  dateTrackingMode: 'receive_only'
})

watch(activeCategoryTab, (tab) => {
  newCatForm.value.name = ''
  newCatForm.value.label = ''
  newCatForm.value.icon = tab === 'menu' ? '🥣' : tab === 'material' ? '📦' : '✨'
  newCatForm.value.dateTrackingMode = 'receive_only'
  cancelEditingCategory()
})

const editingCatId = ref(null)
const editCatForm = ref({
  id: '',
  name: '',
  label: '',
  icon: '',
  dateTrackingMode: 'none'
})

function startEditingCategory(cat) {
  editingCatId.value = cat.id
  editCatForm.value = {
    id: cat.id,
    name: cat.name,
    label: cat.label || '',
    icon: cat.icon || '🏷️',
    dateTrackingMode: cat.dateTrackingMode || 'none'
  }
}

function cancelEditingCategory() {
  editingCatId.value = null
  editCatForm.value = { id: '', name: '', label: '', icon: '', dateTrackingMode: 'none' }
}

function saveEditingCategory() {
  if (!editCatForm.value.name.trim()) {
    store.showToast('กรุณากรอกชื่อหมวดหมู่', 'error')
    return
  }
  const payload = {
    id: editCatForm.value.id,
    name: editCatForm.value.name.trim(),
    label: editCatForm.value.label.trim() || undefined,
    icon: editCatForm.value.icon
  }
  if (activeCategoryTab.value === 'material') {
    payload.dateTrackingMode = editCatForm.value.dateTrackingMode || 'none'
  }
  const res = store.saveCategory(activeCategoryTab.value, payload)
  if (res.success) {
    cancelEditingCategory()
  }
}

function openEmojiForNewCategory() {
  store.openEmojiPicker((emoji) => {
    newCatForm.value.icon = emoji
  })
}

function openEmojiForEditingCategory() {
  store.openEmojiPicker((emoji) => {
    editCatForm.value.icon = emoji
  })
}

function addNewCategory() {
  if (!newCatForm.value.name.trim()) {
    store.showToast('กรุณากรอกชื่อหมวดหมู่', 'error')
    return
  }
  const payload = {
    name: newCatForm.value.name.trim(),
    label: newCatForm.value.label.trim() || undefined,
    icon: newCatForm.value.icon
  }
  if (activeCategoryTab.value === 'material') {
    payload.dateTrackingMode = newCatForm.value.dateTrackingMode || 'none'
  }
  const res = store.saveCategory(activeCategoryTab.value, payload)
  if (res.success) {
    newCatForm.value.name = ''
    newCatForm.value.label = ''
    newCatForm.value.dateTrackingMode = 'receive_only'
  }
}

function getTrackingModeLabel(mode) {
  if (mode === 'receive_only') return '🕒 เฉพาะวันรับ'
  if (mode === 'expiry_and_receive') return '📅 รับ+หมดอายุ'
  return '🚫 ไม่ติดตามวัน'
}

function getTrackingModeClass(mode) {
  if (mode === 'receive_only') return 'bg-amber-100 text-amber-800'
  if (mode === 'expiry_and_receive') return 'bg-rose-100 text-rose-700'
  return 'bg-stone-100 text-stone-600'
}

function handleDeleteCategory(tab, cat) {
  const count = getItemCount(tab, cat.name)
  if (count > 0) {
    const itemLabel = tab === 'menu' ? 'เมนู' : tab === 'material' ? 'วัตถุดิบ' : 'Add-on'
    alert(`ไม่สามารถลบหมวดหมู่ "${cat.name}" ได้เนื่องจากมี ${count} ${itemLabel} ใช้งานอยู่\nกรุณาเปลี่ยนหมวดหมู่ของรายการเหล่านั้นก่อนทำการลบ`)
    return
  }

  if (confirm(`คุณต้องการลบหมวดหมู่ "${cat.name}" หรือไม่?`)) {
    store.deleteCategory(tab, cat.id)
  }
}

function getItemCount(tab, catName) {
  const counts = store.categoryUsageCounts[tab] || {}
  return counts[catName] || 0
}

function getItemUnitLabel(tab) {
  if (tab === 'menu') return 'เมนู'
  if (tab === 'material') return 'รายการ'
  if (tab === 'addon') return 'Add-on'
  return 'รายการ'
}

function getPlaceholder(tab) {
  if (tab === 'menu') return 'เช่น สมูทตี้โบวล์, Parfait, เครื่องดื่ม...'
  if (tab === 'material') return 'เช่น ผลไม้แช่แข็ง, ไซรัป, กล่องเทคอะเวย์...'
  if (tab === 'addon') return 'เช่น ซุปเปอร์ฟู้ด, เจลลี่, ซอสพิเศษ...'
  return 'ชื่อหมวดหมู่ใหม่'
}

// ==========================================
// SYSTEM SETTINGS & BACKUP
// ==========================================
function saveGasUrl() {
  store.saveGasUrl(gasUrlInput.value)
}

function testSync() {
  store.syncWithGas()
}

function exportBackup() {
  const data = { ...store.exportDatabase(), exportDate: new Date().toISOString(), system: 'Greek Yogurt POS v3' }

  const jsonStr = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const dateStr = businessDateKey(new Date())
  a.href = url
  a.download = `greek-yogurt-pos-backup-${dateStr}.json`
  a.click()
  URL.revokeObjectURL(url)
  store.showToast('ดาวน์โหลดไฟล์ข้อมูลสำรองสำเร็จ', 'success')
}

function handleImportFile(event) {
  const file = event.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result)
      if (!confirm('ยืนยันการกู้คืนข้อมูล? ข้อมูลปัจจุบันจะถูกแทนที่ด้วยไฟล์สำรอง')) return
      const result = store.replaceDatabase(data,{source:'import'})
      if (!result.ok) { store.showToast('กู้คืนไม่สำเร็จ: ' + result.message,'error'); return }
      gasUrlInput.value = store.gasApiUrl
      store.showToast('กู้คืนข้อมูลจากไฟล์สำรองสำเร็จ','success')
    } catch (err) {
      console.error(err)
      store.showToast('ไม่สามารถอ่านไฟล์ JSON ได้: ' + err.message, 'error')
    }
  }
  reader.readAsText(file)
}

async function confirmClearAll() {
  const ok = await store.confirmDialog({
    title: 'ยืนยันล้างข้อมูลทั้งหมดออก?',
    message: 'เมนู, วัตถุดิบ, สต็อก, Add-on และประวัติคำสั่งซื้อทั้งหมดจะถูกล้าง\n\n(คุณสามารถกด "โหลด Demo" เพื่อนำชุดข้อมูลตัวอย่างกลับมาได้ทุกเมื่อ)',
    confirmText: 'ล้างข้อมูลทั้งหมด',
    cancelText: 'ยกเลิก',
    type: 'danger'
  })
  if (ok) {
    store.clearAllData()
  }
}

async function confirmResetDemo() {
  const ok = await store.confirmDialog({
    title: 'โหลดชุดข้อมูลตัวอย่าง Demo?',
    message: 'ข้อมูลออเดอร์, ยอดสต็อก และเมนูจะถูกแทนที่ด้วยชุดข้อมูลตัวอย่างสำหรับร้านกรีกโยเกิร์ต\n\nต้องการดำเนินการต่อหรือไม่?',
    confirmText: 'โหลดข้อมูล Demo',
    cancelText: 'ยกเลิก',
    type: 'warning'
  })
  if (ok) {
    store.resetDemoData()
  }
}
</script>
