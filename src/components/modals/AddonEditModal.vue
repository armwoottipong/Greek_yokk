<template>
  <div
    v-if="store.modals.addonEdit.isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs"
    @click.self="close"
  >
    <div class="bg-white rounded-2xl border border-stone-200/80 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-stone-100 pb-3">
        <div>
          <h3 class="text-base font-semibold text-stone-900">
            {{ isEditing ? `แก้ไข Add-on: ${form.name}` : 'เพิ่ม Add-on / ท็อปปิ้ง' }}
          </h3>
          <p class="text-[11px] text-stone-400 mt-0.5">กำหนดราคาตามแพลตฟอร์มและการผูกตัดวัตถุดิบในคลัง</p>
        </div>
        <button @click="close" class="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg">
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Body -->
      <div class="space-y-4 text-xs">
        <!-- Row 1: Emoji & Name -->
        <div class="flex items-start gap-3">
          <div class="shrink-0">
            <label class="block text-xs font-medium text-stone-700 mb-1.5">ไอคอน</label>
            <button
              type="button"
              @click="openEmojiPicker"
              class="soft-input flex items-center justify-center w-11 h-10 rounded-xl hover:bg-[#EAE8E1]"
            >
              <span class="text-xl leading-none">{{ form.emoji }}</span>
            </button>
          </div>
          <div class="flex-1">
            <label class="block text-xs font-medium text-stone-700 mb-1.5">ชื่อ Add-on / ท็อปปิ้ง <span class="text-rose-500">*</span></label>
            <input
              v-model="form.name"
              type="text"
              placeholder="เช่น สตรอว์เบอร์รีสด (30g)"
              class="soft-input w-full px-3 py-2 rounded-xl text-xs font-medium text-stone-900 placeholder:text-stone-400"
            />
          </div>
        </div>

        <!-- Row 2: Category -->
        <div>
          <label class="block text-xs font-medium text-stone-700 mb-1.5">หมวดหมู่ Add-on</label>
          <select
            v-model="form.category"
            class="soft-input w-full px-3 py-2 rounded-xl text-xs font-medium text-stone-900"
          >
            <option value="ผลไม้สด">🍓 ผลไม้สด</option>
            <option value="ซอส & น้ำผึ้ง">🍯 ซอส & น้ำผึ้ง</option>
            <option value="ธัญพืช & กรอบ">🥜 ธัญพืช & กรอบ</option>
            <option value="ท็อปปิ้งพิเศษ">✨ ท็อปปิ้งพิเศษ</option>
          </select>
        </div>

        <!-- Row 3: Platform Prices (Compact capsules) -->
        <div class="space-y-1.5">
          <label class="block text-xs font-medium text-stone-700">ราคาบวกเพิ่มตามแต่ละ Platform (฿)</label>
          <div class="grid grid-cols-2 gap-2">
            <div
              v-for="p in store.platforms"
              :key="p.id"
              class="flex items-center justify-between gap-1.5 px-3 py-1.5 rounded-xl bg-[#F5F4F0] focus-within:bg-[#EAE8E1] focus-within:ring-1 focus-within:ring-stone-400/40"
            >
              <span class="text-[11px] font-medium text-stone-700 truncate">{{ p.name.replace(/\s*\([^)]*\)/g, '') }}</span>
              <div class="flex items-center gap-0.5 shrink-0">
                <span class="text-stone-400 text-xs font-number">฿</span>
                <input
                  v-model.number="form.prices[p.id]"
                  type="number"
                  placeholder="0"
                  class="w-14 bg-transparent border-0 text-right font-number font-semibold text-xs text-stone-900 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Row 4: Material Linkage (ตัดสต็อกคลัง) -->
        <div class="p-3.5 rounded-xl bg-[#FAF9F6] border border-stone-100 space-y-2">
          <label class="block text-xs font-medium text-stone-800 flex items-center gap-1.5">
            <span>🔗</span>
            <span>ผูกตัดสต็อกวัตถุดิบในคลัง</span>
          </label>
          <div class="grid grid-cols-2 gap-2.5">
            <div>
              <label class="block text-[11px] text-stone-500 mb-1">วัตถุดิบที่ตัด:</label>
              <select
                v-model="form.materialId"
                class="soft-input w-full px-2.5 py-1.5 rounded-xl text-xs font-medium text-stone-900"
              >
                <option value="">-- ไม่ตัดวัตถุดิบ --</option>
                <option
                  v-for="m in store.activeMaterials"
                  :key="m.id"
                  :value="m.id"
                >
                  {{ m.emoji }} {{ m.name }}
                </option>
              </select>
            </div>
            <div>
              <label class="block text-[11px] text-stone-500 mb-1">ปริมาณที่ตัดต่อที่:</label>
              <div class="flex items-center gap-1.5">
                <input
                  v-model.number="form.amountUsed"
                  type="number"
                  step="any"
                  placeholder="0"
                  class="soft-input w-full px-2.5 py-1.5 rounded-xl text-xs font-number font-semibold text-stone-900"
                />
                <span class="text-[11px] text-stone-400 shrink-0 w-6">
                  {{ selectedMaterialUnit }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-end gap-2.5 pt-2 border-t border-stone-100">
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
          <span>บันทึก Add-on</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { usePosStore } from '@/stores/posStore'
import { X, Check } from 'lucide-vue-next'

const store = usePosStore()

const form = ref({
  id: '',
  name: '',
  category: 'ผลไม้สด',
  emoji: '🍓',
  prices: {},
  materialId: '',
  amountUsed: 25
})

const isEditing = computed(() => Boolean(store.modals.addonEdit.addonId))

const selectedMaterialUnit = computed(() => {
  const m = store.matMap[form.value.materialId]
  return m ? m.unit : 'g'
})

watch(() => store.modals.addonEdit.isOpen, (open) => {
  if (open) {
    const id = store.modals.addonEdit.addonId
    const addon = id ? store.addons.find(a => a.id === id) : null

    form.value = {
      id: addon ? addon.id : '',
      name: addon ? addon.name : '',
      category: addon ? addon.category : 'ผลไม้สด',
      emoji: addon ? addon.emoji : '🍓',
      prices: addon ? { ...addon.prices } : {},
      materialId: addon ? addon.materialId : '',
      amountUsed: addon ? addon.amountUsed : 25
    }

    store.platforms.forEach(p => {
      if (form.value.prices[p.id] === undefined) {
        form.value.prices[p.id] = ''
      }
    })
  }
})

function openEmojiPicker() {
  store.modals.emojiPicker = {
    isOpen: true,
    targetCallback: (emoji) => {
      form.value.emoji = emoji
    }
  }
}

function close() {
  store.modals.addonEdit.isOpen = false
  store.modals.addonEdit.addonId = null
}

function submit() {
  if (!form.value.name.trim()) {
    store.showToast('กรุณากรอกชื่อ Add-on', 'error')
    return
  }

  store.saveAddon({
    id: form.value.id || undefined,
    name: form.value.name.trim(),
    category: form.value.category,
    emoji: form.value.emoji || '🍓',
    prices: form.value.prices,
    materialId: form.value.materialId || null,
    amountUsed: Number(form.value.amountUsed) || 0
  })

  close()
}
</script>
