<template>
 <section class="catalog-toolbar" :aria-label="`จัดการ${label}`">
  <input type="search" :value="search" :aria-label="`ค้นหา${label}`" :placeholder="placeholder" @input="$emit('update:search',$event.target.value)" />
  <Button ref="anchor" variant="secondary" data-catalog-filter :aria-expanded="open" @click="open=true"><SlidersHorizontal :size="16" />ตัวกรอง</Button>
  <Button data-catalog-add @click="$emit('add')"><Plus :size="16" />เพิ่ม{{ label }}</Button>
  <FilterDropdown teleport :id="id+'-filters'" :open="open" :anchor="anchor?.$el" :include-dates="false" :values="{category,platform}" :fields="fields" @close="open=false" @apply="$emit('apply-filters',$event)" />
 </section>
</template>
<script setup>
import {computed,ref} from 'vue'
import {Plus,SlidersHorizontal} from 'lucide-vue-next'
import Button from '../ui/Button.vue'
import FilterDropdown from '../ui/FilterDropdown.vue'
const props=defineProps({id:String,label:String,search:String,placeholder:String,category:String,platform:String,categories:Array,platforms:Array})
defineEmits(['update:search','apply-filters','add'])
const open=ref(false),anchor=ref(null)
const fields=computed(()=>[...(props.categories?.length ? [{key:'category',label:'หมวดหมู่',defaultValue:'ทั้งหมด',options:[{id:'ทั้งหมด',label:'ทุกหมวดหมู่'},...(props.categories||[]).map(c=>({id:c,label:c}))]}] : []),{key:'platform',label:'ช่องทางที่แสดงราคา',defaultValue:props.platforms?.[0]?.id||'',options:(props.platforms||[]).map(p=>({id:p.id,label:p.name}))}])
</script>
<style scoped>
.catalog-toolbar{display:flex;align-items:center;gap:10px;min-width:0}.catalog-toolbar input{flex:1;min-width:0;max-width:520px;min-height:44px;border:1px solid var(--border-subtle);border-radius:var(--control-radius);background:var(--bg-card);padding:10px 14px;font-size:14px}.catalog-toolbar .ui-button{flex-shrink:0}@media(max-width:639px){.catalog-toolbar{flex-wrap:wrap}.catalog-toolbar input{flex-basis:100%;max-width:none}.catalog-toolbar .ui-button{flex:1}}
</style>
