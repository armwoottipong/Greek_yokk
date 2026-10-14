<template>
 <article class="menu-management-row">
  <button type="button" :data-catalog-details="menu.id" class="menu-row-name" :aria-label="`ดูรายละเอียด ${menu.name}`" @click="$emit('details',menu)"><span aria-hidden="true" class="menu-row-emoji">{{ menu.emoji }}</span><span><strong>{{ menu.name }}</strong><small v-if="menu.description">{{ menu.description }}</small><span class="menu-row-meta"><StatusBadge :label="menu.isActive===false?'ปิดขาย':'เปิดขาย'" :tone="menu.isActive===false?'warning':'neutral'"/><span v-if="menu.hasAddons">เลือกท็อปปิ้งได้</span></span></span></button>
  <div class="menu-row-recipe"><Button variant="quiet" size="compact" :aria-label="`ดูสูตร ${menu.name}`" @click="$emit('details',menu)"><BookOpen :size="16" aria-hidden="true"/>ดูสูตร</Button><small>{{ ingredientCount }} วัตถุดิบ · {{ menu.hasPackage!==false?packageCount:0 }} บรรจุภัณฑ์</small></div>
  <div class="menu-row-price"><PlatformPriceSummary :prices="menu.prices||{}" :platforms="selectedPlatforms" :selected-id="selectedId"/></div>
  <div class="menu-row-actions"><Button variant="secondary" :aria-label="`แก้ไข ${menu.name}`" @click="$emit('edit',menu.id)">แก้ไข</Button><IconButton :label="`ลบเมนู ${menu.name}`" @click="$emit('delete',menu)"><Trash2 :size="18" aria-hidden="true"/></IconButton></div>
 </article>
</template>
<script setup>
import {computed} from 'vue'
import {Trash2,BookOpen} from 'lucide-vue-next'
import Button from '../ui/Button.vue'
import IconButton from '../ui/IconButton.vue'
import StatusBadge from '../ui/StatusBadge.vue'
import PlatformPriceSummary from './PlatformPriceSummary.vue'
const props=defineProps({menu:Object,platforms:{type:Array,default:()=>[]},selectedId:String,ingredientCount:{type:Number,default:0},packageCount:{type:Number,default:0}})
defineEmits(['details','edit','delete'])
const selectedPlatforms=computed(()=>props.platforms.filter(p=>p.id===props.selectedId))
</script>
<style scoped>
.menu-management-row{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(140px,.7fr) minmax(120px,.6fr) auto;gap:20px;align-items:center;padding:20px;border-bottom:1px solid var(--border-subtle);min-width:0}.menu-management-row:last-child{border-bottom:0}.menu-row-name{display:flex;gap:14px;align-items:center;text-align:left;min-width:0;min-height:48px;border-radius:12px;cursor:pointer}.menu-row-name>span:last-child{min-width:0}.menu-row-name strong{display:block;font-size:.875rem;font-weight:600;line-height:1.6;overflow-wrap:anywhere}.menu-row-name small{display:block;color:var(--text-muted);font-size:.75rem;line-height:1.7;margin-top:4px;overflow-wrap:anywhere}.menu-row-emoji{display:grid;place-items:center;width:56px;height:56px;flex-shrink:0;background:var(--bg-soft);border-radius:12px;font-size:30px}.menu-row-meta{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-top:8px;font-size:.6875rem;color:var(--text-muted)}.menu-row-recipe{display:grid;gap:4px;justify-items:start;min-width:0}.menu-row-recipe small{font-size:.6875rem;color:var(--text-muted);line-height:1.7}.menu-row-price{min-width:0}.menu-row-price :deep(.platform-price){flex-direction:column;align-items:flex-start;background:transparent;padding:0;gap:4px}.menu-row-price :deep(.platform-price strong){font-size:1.25rem;color:var(--accent-brand)}.menu-row-price :deep(.platform-price span){font-size:.6875rem;line-height:1.6;overflow-wrap:anywhere}.menu-row-actions{display:flex;gap:4px;align-items:center}.menu-row-name:focus-visible{outline:2px solid var(--accent-brand);outline-offset:3px}@media(max-width:1100px){.menu-management-row{grid-template-columns:minmax(0,1fr) minmax(110px,.45fr) auto;gap:16px}.menu-row-recipe{grid-column:1;grid-row:2;display:flex;align-items:center;gap:8px}.menu-row-price{grid-column:2;grid-row:1/3}.menu-row-actions{grid-column:3;grid-row:1/3}}@media(max-width:639px){.menu-management-row{grid-template-columns:minmax(0,1fr) auto;padding:16px;gap:12px}.menu-row-name{grid-column:1/-1;align-items:flex-start}.menu-row-emoji{width:48px;height:48px;font-size:26px}.menu-row-recipe{grid-column:1/-1;grid-row:auto}.menu-row-price{grid-column:1;grid-row:auto}.menu-row-actions{grid-column:2;grid-row:auto}.menu-row-meta{margin-top:6px}}
</style>
