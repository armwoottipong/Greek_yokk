<template>
  <div class="space-y-3 select-none">
    <!-- Quick Range Preset Buttons -->
    <div class="flex items-center gap-1.5 flex-wrap text-[11px]">
      <button
        type="button"
        @click="selectPreset('all')"
        class="px-2.5 py-1 rounded-lg border transition-all cursor-pointer font-medium"
        :class="!startDate && !endDate ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-600 hover:bg-stone-100 border-stone-200'"
      >
        ทุกช่วงเวลา
      </button>
      <button
        type="button"
        @click="selectPreset('today')"
        class="px-2.5 py-1 rounded-lg border transition-all cursor-pointer font-medium"
        :class="isPresetActive('today') ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-600 hover:bg-stone-100 border-stone-200'"
      >
        วันนี้
      </button>
      <button
        type="button"
        @click="selectPreset('yesterday')"
        class="px-2.5 py-1 rounded-lg border transition-all cursor-pointer font-medium"
        :class="isPresetActive('yesterday') ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-600 hover:bg-stone-100 border-stone-200'"
      >
        เมื่อวาน
      </button>
      <button
        type="button"
        @click="selectPreset('7days')"
        class="px-2.5 py-1 rounded-lg border transition-all cursor-pointer font-medium"
        :class="isPresetActive('7days') ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-600 hover:bg-stone-100 border-stone-200'"
      >
        7 วันล่าสุด
      </button>
      <button
        type="button"
        @click="selectPreset('30days')"
        class="px-2.5 py-1 rounded-lg border transition-all cursor-pointer font-medium"
        :class="isPresetActive('30days') ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-600 hover:bg-stone-100 border-stone-200'"
      >
        30 วันล่าสุด
      </button>
      <button
        type="button"
        @click="selectPreset('thisMonth')"
        class="px-2.5 py-1 rounded-lg border transition-all cursor-pointer font-medium"
        :class="isPresetActive('thisMonth') ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-600 hover:bg-stone-100 border-stone-200'"
      >
        เดือนนี้
      </button>
    </div>

    <!-- Calendar Card Container -->
    <div class="p-3 bg-stone-50/80 rounded-2xl border border-stone-200/80">
      <!-- Calendar Header: Month & Year Navigator -->
      <div class="flex items-center justify-between mb-2.5 px-1">
        <button
          type="button"
          @click="prevMonth"
          class="p-1 rounded-lg hover:bg-stone-200 text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
          title="เดือนก่อนหน้า"
        >
          <ChevronLeft class="w-4 h-4" />
        </button>

        <div class="flex items-center gap-1.5 font-bold text-xs text-stone-800">
          <span>{{ monthNames[currentMonth] }}</span>
          <span class="font-number">{{ currentYear + 543 }} ({{ currentYear }})</span>
        </div>

        <button
          type="button"
          @click="nextMonth"
          class="p-1 rounded-lg hover:bg-stone-200 text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
          title="เดือนถัดไป"
        >
          <ChevronRight class="w-4 h-4" />
        </button>
      </div>

      <!-- Day of Week Headers -->
      <div class="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-stone-400 mb-1">
        <span v-for="d in dayNames" :key="d" :class="d === 'อา.' ? 'text-rose-400' : ''">{{ d }}</span>
      </div>

      <!-- Calendar Days Grid -->
      <div class="grid grid-cols-7 gap-y-1 gap-x-0.5 text-center text-xs">
        <div
          v-for="(cell, idx) in calendarDays"
          :key="idx"
          class="relative p-0.5"
          :class="getRangeBackgroundClass(cell.dateString)"
        >
          <button
            type="button"
            @click="onDayClick(cell.dateString)"
            :disabled="!cell.isCurrentMonth"
            class="w-full h-7.5 rounded-lg flex items-center justify-center font-number font-medium text-xs transition-all cursor-pointer relative"
            :class="[
              getDayButtonClass(cell.dateString, cell.isCurrentMonth, cell.isToday)
            ]"
          >
            <span>{{ cell.day }}</span>
            <span
              v-if="cell.isToday && !isSelected(cell.dateString)"
              class="w-1 h-1 rounded-full bg-amber-600 absolute bottom-1"
            ></span>
          </button>
        </div>
      </div>

      <!-- Footer Range Preview -->
      <div class="mt-2.5 pt-2 border-t border-stone-200/60 flex items-center justify-between text-[11px] text-stone-600">
        <div class="flex items-center gap-1.5 truncate">
          <Calendar class="w-3.5 h-3.5 text-stone-400 shrink-0" />
          <span class="font-medium truncate">
            {{ formatRangeDisplay() }}
          </span>
        </div>

        <button
          v-if="startDate || endDate"
          type="button"
          @click="clearRange"
          class="text-rose-600 hover:text-rose-800 hover:underline shrink-0 font-medium cursor-pointer"
        >
          ล้างวันที่
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-vue-next'

const props = defineProps({
  startDate: {
    type: String,
    default: null
  },
  endDate: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['update:startDate', 'update:endDate', 'change'])

const dayNames = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']
const monthNames = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
]

const today = new Date()
const currentYear = ref(today.getFullYear())
const currentMonth = ref(today.getMonth())

function prevMonth() {
  if (currentMonth.value === 0) {
    currentMonth.value = 11
    currentYear.value--
  } else {
    currentMonth.value--
  }
}

function nextMonth() {
  if (currentMonth.value === 11) {
    currentMonth.value = 0
    currentYear.value++
  } else {
    currentMonth.value++
  }
}

const calendarDays = computed(() => {
  const year = currentYear.value
  const month = currentMonth.value

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const prevLastDay = new Date(year, month, 0)

  const days = []
  const startDayOfWeek = firstDay.getDay() // 0 = Sunday

  // Previous month trailing days
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const day = prevLastDay.getDate() - i
    const d = new Date(year, month - 1, day)
    days.push({
      day,
      dateString: toDateString(d),
      isCurrentMonth: false,
      isToday: false
    })
  }

  // Current month days
  const todayStr = toDateString(today)
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const d = new Date(year, month, day)
    const dateString = toDateString(d)
    days.push({
      day,
      dateString,
      isCurrentMonth: true,
      isToday: dateString === todayStr
    })
  }

  // Next month leading days to complete row
  const remaining = 7 - (days.length % 7)
  if (remaining < 7) {
    for (let day = 1; day <= remaining; day++) {
      const d = new Date(year, month + 1, day)
      days.push({
        day,
        dateString: toDateString(d),
        isCurrentMonth: false,
        isToday: false
      })
    }
  }

  return days
})

function toDateString(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function onDayClick(dateString) {
  if (!props.startDate || (props.startDate && props.endDate)) {
    // Start fresh selection
    emit('update:startDate', dateString)
    emit('update:endDate', null)
    emit('change', { startDate: dateString, endDate: null })
  } else if (props.startDate && !props.endDate) {
    // Complete range
    if (dateString < props.startDate) {
      emit('update:startDate', dateString)
      emit('update:endDate', props.startDate)
      emit('change', { startDate: dateString, endDate: props.startDate })
    } else {
      emit('update:endDate', dateString)
      emit('change', { startDate: props.startDate, endDate: dateString })
    }
  }
}

function isSelected(dateStr) {
  return dateStr === props.startDate || dateStr === props.endDate
}

function isInRange(dateStr) {
  if (!props.startDate || !props.endDate) return false
  return dateStr > props.startDate && dateStr < props.endDate
}

function getRangeBackgroundClass(dateStr) {
  if (!props.startDate || !props.endDate) return ''
  if (isInRange(dateStr)) {
    return 'bg-amber-100/70 text-amber-950'
  }
  if (dateStr === props.startDate && props.endDate) {
    return 'bg-amber-100/70 rounded-l-xl'
  }
  if (dateStr === props.endDate && props.startDate) {
    return 'bg-amber-100/70 rounded-r-xl'
  }
  return ''
}

function getDayButtonClass(dateStr, isCurrentMonth, isToday) {
  if (!isCurrentMonth) {
    return 'opacity-20 cursor-not-allowed text-stone-400'
  }

  const isStart = dateStr === props.startDate
  const isEnd = dateStr === props.endDate

  if (isStart || isEnd) {
    return 'bg-stone-900 text-white font-bold shadow-xs'
  }

  if (isInRange(dateStr)) {
    return 'text-amber-950 font-bold hover:bg-amber-200/60'
  }

  if (isToday) {
    return 'bg-amber-50 text-amber-900 font-bold hover:bg-amber-100'
  }

  return 'text-stone-700 hover:bg-stone-200/70'
}

function clearRange() {
  emit('update:startDate', null)
  emit('update:endDate', null)
  emit('change', { startDate: null, endDate: null })
}

function selectPreset(type) {
  const now = new Date()
  if (type === 'all') {
    clearRange()
    return
  }

  if (type === 'today') {
    const dStr = toDateString(now)
    emit('update:startDate', dStr)
    emit('update:endDate', dStr)
    emit('change', { startDate: dStr, endDate: dStr })
    currentYear.value = now.getFullYear()
    currentMonth.value = now.getMonth()
    return
  }

  if (type === 'yesterday') {
    const yest = new Date(now)
    yest.setDate(now.getDate() - 1)
    const dStr = toDateString(yest)
    emit('update:startDate', dStr)
    emit('update:endDate', dStr)
    emit('change', { startDate: dStr, endDate: dStr })
    currentYear.value = yest.getFullYear()
    currentMonth.value = yest.getMonth()
    return
  }

  if (type === '7days') {
    const start = new Date(now)
    start.setDate(now.getDate() - 6)
    const sStr = toDateString(start)
    const eStr = toDateString(now)
    emit('update:startDate', sStr)
    emit('update:endDate', eStr)
    emit('change', { startDate: sStr, endDate: eStr })
    currentYear.value = now.getFullYear()
    currentMonth.value = now.getMonth()
    return
  }

  if (type === '30days') {
    const start = new Date(now)
    start.setDate(now.getDate() - 29)
    const sStr = toDateString(start)
    const eStr = toDateString(now)
    emit('update:startDate', sStr)
    emit('update:endDate', eStr)
    emit('change', { startDate: sStr, endDate: eStr })
    currentYear.value = now.getFullYear()
    currentMonth.value = now.getMonth()
    return
  }

  if (type === 'thisMonth') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    const sStr = toDateString(start)
    const eStr = toDateString(end)
    emit('update:startDate', sStr)
    emit('update:endDate', eStr)
    emit('change', { startDate: sStr, endDate: eStr })
    currentYear.value = now.getFullYear()
    currentMonth.value = now.getMonth()
    return
  }
}

function isPresetActive(type) {
  const now = new Date()
  const todayStr = toDateString(now)

  if (type === 'today') {
    return props.startDate === todayStr && props.endDate === todayStr
  }
  if (type === 'yesterday') {
    const yest = new Date(now)
    yest.setDate(now.getDate() - 1)
    const yStr = toDateString(yest)
    return props.startDate === yStr && props.endDate === yStr
  }
  if (type === '7days') {
    const start = new Date(now)
    start.setDate(now.getDate() - 6)
    return props.startDate === toDateString(start) && props.endDate === todayStr
  }
  if (type === '30days') {
    const start = new Date(now)
    start.setDate(now.getDate() - 29)
    return props.startDate === toDateString(start) && props.endDate === todayStr
  }
  if (type === 'thisMonth') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return props.startDate === toDateString(start) && props.endDate === toDateString(end)
  }
  return false
}

function formatRangeDisplay() {
  if (!props.startDate && !props.endDate) {
    return 'แสดงทุกช่วงเวลา'
  }
  if (props.startDate && !props.endDate) {
    return `ตั้งแต่วันที่ ${formatDateLabel(props.startDate)} (เลือกวันสิ้นสุด...)`
  }
  if (props.startDate === props.endDate) {
    return `${formatDateLabel(props.startDate)}`
  }
  return `${formatDateLabel(props.startDate)} – ${formatDateLabel(props.endDate)}`
}

function formatDateLabel(dateStr) {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  if (parts.length !== 3) return dateStr
  const y = parseInt(parts[0], 10) + 543
  const m = monthNames[parseInt(parts[1], 10) - 1] || parts[1]
  const d = parseInt(parts[2], 10)
  return `${d} ${m} ${y}`
}
</script>
