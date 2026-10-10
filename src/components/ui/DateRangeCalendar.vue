<template>
  <div class="select-none rounded-lg border border-stone-100 p-2">
    <!-- Calendar Header: Month & Year Navigator -->
    <div class="flex items-center justify-between mb-2 px-0.5">
      <button
        type="button"
        @click="prevMonth"
        class="w-8 h-8 rounded-md hover:bg-brand-50 text-stone-600 hover:text-brand-800 transition-colors flex items-center justify-center cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-700"
        aria-label="เดือนก่อนหน้า"
      >
        <ChevronLeft class="w-4 h-4" />
      </button>

      <div class="flex items-center gap-1.5 font-bold text-xs text-stone-900 tracking-tight">
        <span>{{ monthNames[currentMonth] }}</span>
        <span class="font-number">{{ currentYear + 543 }}</span>
      </div>

      <button
        type="button"
        @click="nextMonth"
        class="w-8 h-8 rounded-md hover:bg-brand-50 text-stone-600 hover:text-brand-800 transition-colors flex items-center justify-center cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-700"
        aria-label="เดือนถัดไป"
      >
        <ChevronRight class="w-4 h-4" />
      </button>
    </div>

    <!-- Day of Week Headers -->
    <div class="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-stone-400 mb-1">
      <span v-for="d in dayNames" :key="d" :class="d === 'อา.' ? 'text-rose-400' : ''">{{ d }}</span>
    </div>

    <!-- Calendar Days Grid -->
    <div class="grid grid-cols-7 gap-y-0.5 gap-x-0.5 text-center text-xs">
      <div
        v-for="(cell, idx) in calendarDays"
        :key="idx"
        class="relative p-0.5"
        :class="getRangeBackgroundClass(cell.dateString)"
      >
        <button
          type="button"
          @click="onDayClick(cell.dateString)"
          :aria-label="formatDateLabel(cell.dateString)"
          :aria-pressed="isSelected(cell.dateString)"
          :disabled="!cell.isCurrentMonth"
          class="w-full h-8 rounded-lg flex items-center justify-center font-number font-medium text-xs transition-colors cursor-pointer relative focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-700 focus-visible:outline-offset-1"
          :class="[
            getDayButtonClass(cell.dateString, cell.isCurrentMonth, cell.isToday)
          ]"
        >
          <span>{{ cell.day }}</span>
          <span
            v-if="cell.isToday && !isSelected(cell.dateString)"
            class="w-1 h-1 rounded-full bg-brand-600 absolute bottom-0.5"
          ></span>
        </button>
      </div>
    </div>

    <!-- Footer Range Preview -->
    <div v-if="showPreview" class="mt-2.5 pt-2 border-t border-stone-200/60 flex items-center justify-between gap-2 text-[11px] text-stone-600">
      <div class="flex items-center gap-1.5 min-w-0" aria-live="polite">
        <Calendar class="w-3.5 h-3.5 text-stone-400 shrink-0" />
        <span class="font-medium text-stone-700">
          {{ formatRangeDisplay() }}
        </span>
      </div>

      <button
        v-if="startDate || endDate"
        type="button"
        @click="clearRange"
        class="text-rose-600 hover:text-rose-800 hover:underline shrink-0 font-medium cursor-pointer text-[11px] ml-2"
      >
        ล้างวันที่
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { businessDateKey } from '@/domain/businessDate'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-vue-next'

const props = defineProps({
  showPreview: {type:Boolean,default:true},
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

const today = new Date(`${businessDateKey()}T12:00:00`)
const currentYear = ref(today.getFullYear())
const currentMonth = ref(today.getMonth())
watch(() => props.startDate, value => {
  if (!value) return
  const [year, month] = value.split('-').map(Number)
  currentYear.value = year
  currentMonth.value = month - 1
}, {immediate:true})

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
    // Start fresh selection: pick start date
    emit('update:startDate', dateString)
    emit('update:endDate', null)
    emit('change', { startDate: dateString, endDate: null })
  } else if (props.startDate && !props.endDate) {
    // Complete range: pick end date
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
    return 'bg-brand-50 text-brand-900'
  }
  if (dateStr === props.startDate && props.endDate) {
    return 'bg-brand-50 rounded-l-lg'
  }
  if (dateStr === props.endDate && props.startDate) {
    return 'bg-brand-50 rounded-r-lg'
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
    return 'bg-brand-800 text-white font-semibold'
  }

  if (isInRange(dateStr)) {
    return 'text-brand-900 font-medium hover:bg-brand-100'
  }

  if (isToday) {
    return 'text-brand-800 font-semibold hover:bg-brand-50'
  }

  return 'text-stone-700 hover:bg-stone-200/70'
}

function clearRange() {
  emit('update:startDate', null)
  emit('update:endDate', null)
  emit('change', { startDate: null, endDate: null })
}

function formatRangeDisplay() {
  if (!props.startDate && !props.endDate) {
    return 'คลิกเลือกวันที่เริ่มต้นบนปฏิทิน'
  }
  if (props.startDate && !props.endDate) {
    return `${formatDateLabel(props.startDate)} ➔ คลิกเลือกวันสิ้นสุด...`
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
