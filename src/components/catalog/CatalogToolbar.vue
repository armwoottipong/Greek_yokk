<template>
 <section class="catalog-toolbar" :aria-label="`จัดการ${noun}`">
  <AppSearch :model-value="search||''" :label="`ค้นหา${noun}`" :placeholder="placeholder" @update:model-value="$emit('update:search',$event)"/>
  <div v-if="inlinePlatform && platformTabs" class="catalog-platform-tabs"><span :id="`${id}-platform-label`">แสดงราคาช่องทาง</span><div role="tablist" :aria-labelledby="`${id}-platform-label`"><button v-for="p in platforms" :id="`${id}-platform-${p.id}`" :key="p.id" type="button" role="tab" :data-platform-tab="p.id" :aria-selected="platform===p.id" :tabindex="platform===p.id?0:-1" :aria-controls="`${id}-prices`" @click="$emit('apply-filters',{platform:p.id})" @keydown="platformKey($event,p.id)">{{ p.name }}</button></div></div>
  <FormField v-else-if="inlinePlatform" label="แสดงราคาช่องทาง" class="catalog-platform" v-slot="{controlId}"><AppSelect :id="controlId" aria-label="ช่องทางที่แสดงราคา" :model-value="platform" @update:model-value="$emit('apply-filters',{platform:$event})"><option v-for="p in platforms" :key="p.id" :value="p.id">{{ p.name }}</option></AppSelect></FormField>
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
const props=defineProps({id:String,label:String,search:String,placeholder:String,category:String,platform:String,categories:Array,platforms:Array,inlinePlatform:Boolean,platformTabs:Boolean})
const noun=computed(()=>/^[a-z]/i.test(props.label||'')?` ${props.label}`:props.label)
const emit=defineEmits(['update:search','apply-filters','add'])
function platformKey(event,id){
 if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return
 event.preventDefault()
 const options=props.platforms||[],index=options.findIndex(p=>p.id===id)
 const next=event.key==='Home'?0:event.key==='End'?options.length-1:(index+(event.key==='ArrowRight'?1:-1)+options.length)%options.length
 if(!options[next])return
 emit('apply-filters',{platform:options[next].id})
 event.currentTarget.parentElement.querySelectorAll('[role="tab"]')[next]?.focus()
}
const open=ref(false),anchor=ref(null)
const fields=computed(()=>[...(props.categories?.length ? [{key:'category',label:'หมวดหมู่',defaultValue:'ทั้งหมด',options:[{id:'ทั้งหมด',label:'ทุกหมวดหมู่'},...(props.categories||[]).map(c=>({id:c,label:c}))]}] : []),{key:'platform',label:'ช่องทางที่แสดงราคา',defaultValue:props.platforms?.[0]?.id||'',options:(props.platforms||[]).map(p=>({id:p.id,label:p.name}))}])
</script>
<style scoped>
.catalog-toolbar{display:flex;align-items:end;gap:12px;min-width:0}.catalog-toolbar>.app-search{flex:1;min-width:0;background:var(--bg-card)}.catalog-platform{width:240px;min-width:0}.catalog-platform :deep(.app-select){width:100%}.catalog-platform :deep(.app-select-trigger){min-height:48px;border-radius:12px;background:var(--bg-card);border:0;font-size:.8125rem}.catalog-toolbar>.ui-button{flex-shrink:0;min-height:48px}@media(max-width:639px){.catalog-toolbar{flex-wrap:wrap;gap:10px}.catalog-toolbar>.app-search{flex-basis:100%;max-width:none}.catalog-platform{flex:1}.catalog-toolbar>.ui-button{flex:0 0 auto}}
</style>
<style scoped>
.catalog-toolbar:has(.catalog-platform-tabs){flex-wrap:wrap}.catalog-platform-tabs{flex-basis:100%;min-width:0;order:3}.catalog-platform-tabs>span{display:block;font-size:.75rem;font-weight:500;margin-bottom:8px;color:var(--text-main)}.catalog-platform-tabs>[role=tablist]{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;padding:4px;background:var(--bg-soft);border-radius:14px}.catalog-platform-tabs button{min-width:0;min-height:44px;padding:10px 12px;border:0;border-radius:10px;color:var(--text-muted);font-size:.8125rem;line-height:1.5;cursor:pointer;overflow-wrap:anywhere}.catalog-platform-tabs button:hover{background:var(--accent-soft);color:var(--accent-brand)}.catalog-platform-tabs button[aria-selected=true]{background:var(--accent-brand);color:var(--bg-card);font-weight:500}.catalog-platform-tabs button:focus-visible{outline:2px solid var(--accent-brand);outline-offset:2px}@media(max-width:639px){.catalog-platform-tabs>[role=tablist]{grid-template-columns:repeat(2,minmax(0,1fr))}.catalog-toolbar:has(.catalog-platform-tabs)>.app-search{flex-basis:0;flex-grow:1}}
</style>
