<template>
  <ModalShell label="เลือกไอคอน" :open="store.modals.emojiPicker.isOpen"
    class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs"
    @request-close="close"
  >
    <div class="bg-white rounded-2xl shadow-2xl border border-stone-200 max-w-sm w-full p-4 overflow-hidden space-y-3 animate-in fade-in zoom-in-95 duration-150">
      <!-- Search & Header -->
      <div class="flex items-center justify-between gap-2 border-b border-stone-100 pb-2.5">
        <div class="flex-1 relative">
          <Search class="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="ค้นหาไอคอน เช่น สตรอว์เบอร์รี, ถ้วย..."
            class="soft-input w-full pl-8 pr-3 py-1.5 rounded-xl text-xs text-stone-900 placeholder:text-stone-400"
            autofocus
          />
        </div>
        <button @click="close" class="p-1 text-stone-400 hover:text-stone-700 rounded-lg" aria-label="ปิดหน้าต่าง">
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Category Filter Pills -->
      <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[11px] pb-1">
        <button
          v-for="cat in categories"
          :key="cat"
          @click="activeCategory = cat"
          :class="[
            'px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors',
            activeCategory === cat ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          ]"
        >
          {{ cat }}
        </button>
      </div>

      <!-- Emoji Grid -->
      <div class="grid grid-cols-7 gap-1.5 max-h-56 overflow-y-auto p-1 text-xl">
        <button
          v-for="(item, idx) in filteredEmojis"
          :key="idx"
          @click="selectEmoji(item.emoji)"
          class="flex items-center justify-center h-10 w-10 rounded-xl hover:bg-amber-100/50 hover:scale-115 active:scale-95 transition-all"
          :title="item.keywords"
        >
          {{ item.emoji }}
        </button>
      </div>
    </div>
  </ModalShell>
</template>

<script setup>
import ModalShell from '@/components/ui/ModalShell.vue'
import { ref, computed } from 'vue'
import { usePosStore } from '@/stores/posStore'
import { Search, X } from 'lucide-vue-next'

const store = usePosStore()
const searchQuery = ref('')
const activeCategory = ref('ทั้งหมด')

const categories = ['ทั้งหมด', 'ผลไม้', 'นม/โยเกิร์ต', 'ท็อปปิ้ง', 'ขนม', 'บรรจุภัณฑ์']

const filteredEmojis = computed(() => {
  return store.emojiCatalog.filter(item => {
    const matchCat = activeCategory.value === 'ทั้งหมด' || item.category === activeCategory.value
    const q = searchQuery.value.trim().toLowerCase()
    const matchSearch = !q || item.keywords.toLowerCase().includes(q) || item.emoji.includes(q)
    return matchCat && matchSearch
  })
})

function selectEmoji(emoji) {
  if (store.modals.emojiPicker.targetCallback) {
    store.modals.emojiPicker.targetCallback(emoji)
  }
  close()
}

function close() {
  store.modals.emojiPicker.isOpen = false
  store.modals.emojiPicker.targetCallback = null
  searchQuery.value = ''
  activeCategory.value = 'ทั้งหมด'
}
</script>
