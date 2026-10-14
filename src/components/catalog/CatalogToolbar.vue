<template>
 <section class="catalog-toolbar" :aria-label="`จัดการ${noun}`">
  <AppSearch :model-value="search||''" :label="`ค้นหา${noun}`" :placeholder="placeholder" @update:model-value="$emit('update:search',$event)"/>
  <FormField v-if="inlinePlatform" label="แสดงราคาช่องทาง" class="catalog-platform" v-slot="{controlId}"><AppSelect :id="controlId" aria-label="ช่องทางที่แสดงราคา" :model-value="platform" @update:model-value="$emit('apply-filters',{platform:$event})"><option v-for="p in platforms" :key="p.id" :value="p.id">{{ p.name }}</option></AppSelect></FormField>
  <Button v-else ref="anchor" variant="secondary" data-catalog-filter :aria-expanded="open" @click="open=true"><SlidersHorizontal :size="16" />ตัวกรอง</Button>
  <Button data-catalog-add @click="$emit('add')"><Plus :size="16" />เพิ่ม{{ noun }}</Button>
  <FilterDropdown teleport :id="id+'-filters'" :open="open" :anchor="anchor?.$el" :include-dates="false" :values="{category,platform}" :fields="fields" @close="open=false" @apply="$emit('apply-filters',$event)" />
 </section>
</template>
<script setup>
import {computed,ref} from 'vue'
import {Plus,SlidersHorizontal} from 'lucide-vue-next'
import Button from '../ui/Button.vue'
import FilterDropdown from '../ui/FilterDropdown.vue'
import AppSearch from '../ui/AppSearch.vue'
import AppSelect from '../ui/AppSelect.vue'
import FormField from '../ui/FormField.vue'
const props=defineProps({id:String,label:String,search:String,placeholder:String,category:String,platform:String,categories:Array,platforms:Array,inlinePlatform:Boolean})
const noun=computed(()=>/^[a-z]/i.test(props.label||'')?` ${props.label}`:props.label)
defineEmits(['update:search','apply-filters','add'])
const open=ref(false),anchor=ref(null)
const fields=computed(()=>[...(props.categories?.length ? [{key:'category',label:'หมวดหมู่',defaultValue:'ทั้งหมด',options:[{id:'ทั้งหมด',label:'ทุกหมวดหมู่'},...(props.categories||[]).map(c=>({id:c,label:c}))]}] : []),{key:'platform',label:'ช่องทางที่แสดงราคา',defaultValue:props.platforms?.[0]?.id||'',options:(props.platforms||[]).map(p=>({id:p.id,label:p.name}))}])
</script>
<style scoped>
.catalog-toolbar{display:flex;align-items:end;gap:12px;min-width:0}.catalog-toolbar>.app-search{flex:1;min-width:0;background:var(--bg-card)}.catalog-platform{width:240px;min-width:0}.catalog-platform :deep(.app-select){width:100%}.catalog-platform :deep(.app-select-trigger){min-height:48px;border-radius:12px;background:var(--bg-card);border:0;font-size:.8125rem}.catalog-toolbar>.ui-button{flex-shrink:0;min-height:48px}@media(max-width:639px){.catalog-toolbar{flex-wrap:wrap;gap:10px}.catalog-toolbar>.app-search{flex-basis:100%;max-width:none}.catalog-platform{flex:1}.catalog-toolbar>.ui-button{flex:0 0 auto}}
</style>
