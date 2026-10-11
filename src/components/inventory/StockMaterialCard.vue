<template>
 <article class="material-card">
  <button type="button" :data-material-details="material.id" class="material-card-main" :aria-label="`ดูรายละเอียด ${material.name}`" @click="$emit('details',material.id)">
   <span class="material-emoji" aria-hidden="true">{{ material.emoji }}</span>
   <span class="material-name"><strong>{{ material.name }}</strong><small>{{ material.category || 'อื่นๆ' }}</small></span>
   <span class="material-quantity">{{ Number(material.stock||0).toLocaleString('th-TH') }} <small>{{ material.unit }}</small></span>
   <StatusBadge :label="status" :tone="tone" />
  </button>
  <Button v-if="!material.isDeleted" variant="quiet" :aria-label="`${material.hasSubRecipe?'ผลิต':'รับเข้า'} ${material.name}`" @click="$emit('receive',material.id)">{{ material.hasSubRecipe?'ผลิต':'รับเข้า' }}</Button>
 </article>
</template>
<script setup>
import {computed} from 'vue'
import {isExpired} from '@/stores/posStore'
import Button from '../ui/Button.vue'
import StatusBadge from '../ui/StatusBadge.vue'
const props=defineProps({material:{type:Object,required:true}})
defineEmits(['details','receive'])
const status=computed(()=>props.material.isDeleted?'จัดเก็บแล้ว':isExpired(props.material)?'หมดอายุแล้ว':props.material.stock<=0?'หมดสต็อก':props.material.stock<=props.material.minAlert?'ใกล้หมด':'ปกติ')
const tone=computed(()=>props.material.isDeleted?'neutral':isExpired(props.material)||props.material.stock<=0?'error':props.material.stock<=props.material.minAlert?'warning':'success')
</script>
<style scoped>
.material-card{display:flex;align-items:center;gap:8px;padding:12px 16px;background:var(--bg-card);border-bottom:1px solid var(--border-subtle)}.material-card-main{display:grid;grid-template-columns:32px minmax(0,1fr) auto auto;align-items:center;gap:12px;text-align:left;flex:1;min-width:0;min-height:48px;border-radius:10px}.material-card-main:focus-visible{outline:2px solid var(--accent-brand);outline-offset:3px}.material-emoji{font-size:24px}.material-name{min-width:0}.material-name strong{display:block;font-size:13px;line-height:1.6;overflow-wrap:anywhere}.material-name small,.material-quantity small{font-size:12px;color:var(--text-muted)}.material-quantity{font-weight:600;font-size:15px;font-variant-numeric:tabular-nums}
@media(max-width:767px){.material-card{align-items:flex-end;padding:14px 12px}.material-card-main{grid-template-columns:28px minmax(0,1fr);gap:6px 10px}.material-name{grid-column:2}.material-quantity{grid-column:2}.material-card-main .ui-status{grid-column:2;justify-self:start}.material-card .ui-button{padding:8px;flex-shrink:0}}
</style>

