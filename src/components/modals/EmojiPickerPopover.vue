<template>
  <ModalShell label="เลือกไอคอน" :open="store.modals.emojiPicker.isOpen"
    class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs"
    @request-close="close"
  >
    <div class="bg-white rounded-2xl shadow-2xl border border-stone-200 max-w-sm w-full p-4 overflow-hidden space-y-3 animate-in fade-in zoom-in-95 duration-150">
      <!-- Search & Header -->
      <div class="flex items-center justify-between gap-2 border-b border-stone-100 pb-2.5">
        <AppSearch v-model="searchQuery" label="ค้นหาไอคอน" placeholder="เช่น สตรอว์เบอร์รี หรือถ้วย" autofocus class="flex-1 min-w-0"/>
        <IconButton label="ปิดหน้าต่าง" @click="close"><X :size="18" aria-hidden="true"/></IconButton>
      </div>

      <!-- Category Filter Pills -->
      <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[11px] pb-1">
        <Button
          v-for="cat in categories"
          :key="cat"
          :variant="activeCategory === cat ? 'primary' : 'secondary'"
          :aria-pressed="activeCategory === cat"
          @click="activeCategory = cat"
          class="shrink-0 whitespace-nowrap"
        >
          {{ cat }}
        </Button>
      </div>

      <!-- Emoji Grid -->
      <div class="emoji-grid grid grid-cols-5 sm:grid-cols-7 gap-1.5 max-h-56 overflow-y-auto p-1 text-xl">
        <button
          v-for="(item, idx) in filteredEmojis"
          :key="idx"
          @click="selectEmoji(item.emoji)"
          :aria-label="`เลือก ${item.keywords.split(/\s+/)[0]}`"
          class="flex items-center justify-center min-h-11 w-full rounded-xl hover:bg-brand-50 transition-colors"
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
import { X } from 'lucide-vue-next'
import AppSearch from '@/components/ui/AppSearch.vue'
import IconButton from '@/components/ui/IconButton.vue'
import Button from '@/components/ui/Button.vue'

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
