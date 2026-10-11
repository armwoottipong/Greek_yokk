<template>
 <button type="button" :data-pos-menu="menu.id" class="pos-menu-card" :class="{'is-out-of-stock':outOfStock}" :aria-label="'เลือก '+menu.name+' ราคา ฿'+money(price)" @click="$emit('select',menu.id)">
  <span class="pos-menu-art" aria-hidden="true">{{ menu.emoji }}</span>
  <h4>{{ menu.name }}</h4>
  <p v-if="menu.description">{{ menu.description }}</p>
  <span v-if="outOfStock" class="pos-menu-state">ของหมด · ยืนยันขายต่อได้</span>
  <span v-else-if="menu.hasAddons" class="pos-menu-state">เลือกท็อปปิ้งได้</span>
  <span class="pos-menu-price"><strong class="font-number">฿{{ money(price) }}</strong><span>{{ menu.hasAddons?'ปรับชาม':'เพิ่ม' }}</span></span>
 </button>
</template>
<script setup>
import {money} from '@/domain/dashboard'
defineProps({menu:{type:Object,required:true},price:{type:Number,default:0},outOfStock:Boolean})
defineEmits(['select'])
</script>
<style scoped>
.pos-menu-card{display:flex;flex-direction:column;align-items:flex-start;gap:8px;min-width:0;min-height:190px;padding:16px;border:1px solid transparent;border-radius:var(--surface-radius);background:var(--bg-card);text-align:left;cursor:pointer;color:var(--text-main)}
.pos-menu-art{font-size:28px;display:grid;place-items:center;width:48px;height:48px;background:var(--bg-soft);border-radius:12px;flex-shrink:0}
.pos-menu-card h4{font-size:.875rem;font-weight:600;line-height:1.5;overflow-wrap:anywhere}.pos-menu-card p{font-size:.75rem;line-height:1.6;color:var(--text-muted);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.pos-menu-state{font-size:.6875rem;color:var(--text-muted);line-height:1.5}.is-out-of-stock .pos-menu-state{color:var(--state-warning)}.is-out-of-stock{background:#FFFBEB;border-color:#FDE68A}
.pos-menu-price{display:flex;justify-content:space-between;align-items:center;gap:8px;width:100%;margin-top:auto;padding-top:12px}.pos-menu-price strong{font-size:1rem}.pos-menu-price>span{font-size:.75rem;color:var(--accent-brand)}
.pos-menu-card:focus-visible{outline:2px solid var(--accent-brand);outline-offset:3px}
@media(hover:hover){.pos-menu-card:hover{border-color:var(--accent-border);background:var(--accent-soft)}}
@media(max-width:767px){.pos-menu-card{padding:12px;gap:6px}.pos-menu-art{width:40px;height:40px;font-size:24px}.pos-menu-card p{display:none}}
</style>
