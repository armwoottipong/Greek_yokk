<template>
 <div class="stock-dates">
  <template v-if="mode!=='none'">
   <span v-if="receiveDate" :title="getReceiveAgeStatus(receiveDate).shortText"><small>{{ lot?'รับ':'รับล่าสุด' }}</small><time :datetime="receiveDate">{{ formatDisplayDate(receiveDate) }}</time></span>
   <span v-if="expiryDate&&mode==='expiry_and_receive'" :class="{'stock-date-expired':isExpired({expiryDate})}"><small>หมดอายุ</small><time :datetime="expiryDate">{{ formatDisplayDate(expiryDate) }}</time></span>
   <small v-if="!receiveDate&&!(expiryDate&&mode==='expiry_and_receive')">ยังไม่มีวันที่</small>
  </template>
  <small v-else>ไม่ระบุวันที่</small>
 </div>
</template>
<script setup>
import {formatDisplayDate,getReceiveAgeStatus,isExpired} from '@/stores/posStore'
defineProps({receiveDate:String,expiryDate:String,mode:String,lot:Boolean})
</script>
<style scoped>
.stock-dates{display:grid;gap:4px;font-size:.6875rem;line-height:1.6;color:var(--text-muted)}.stock-dates>span{display:flex;align-items:baseline;gap:8px;white-space:nowrap}.stock-dates small{font:inherit}.stock-dates time{font-variant-numeric:tabular-nums;color:var(--text-main)}.stock-dates .stock-date-expired,.stock-dates .stock-date-expired time{color:var(--state-error)}
</style>
