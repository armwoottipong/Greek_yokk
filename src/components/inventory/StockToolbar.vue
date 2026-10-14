<template>
  <section class="stock-toolbar" aria-label="จัดการคลังสต็อก">
    <div class="stock-actions">
      <Button data-stock-receive aria-label="รับเข้าสต็อก" @click="$emit('receive')"><ArrowDownToLine :size="16" /><span class="receive-full">รับเข้าสต็อก</span><span class="receive-short">รับเข้า</span></Button>
      <Button variant="secondary" data-stocktake-open @click="$emit('stocktake')"><ClipboardCheck :size="16" />ตรวจนับ</Button>
      <IconButton label="งานอื่นในคลังสต็อก" @click="moreOpen=true"><MoreHorizontal :size="20" /></IconButton>
    </div>
    <div class="stock-search">
      <AppSearch :model-value="search" label="ค้นหาวัตถุดิบ" placeholder="ค้นหาชื่อ รหัส หรือประเภท" @update:model-value="$emit('update:search',$event)"/>
      <Button ref="filterButton" variant="secondary" data-stock-filter :aria-expanded="filterOpen" @click="filterOpen=true"><SlidersHorizontal :size="16" />ตัวกรอง<span v-if="filterCount">{{ filterCount }}</span></Button>
    </div>
    <FilterDropdown teleport id="stock-filters" title="กรองวัตถุดิบ" :open="filterOpen" :anchor="filterButton?.$el" :include-dates="false" :values="{role,kind,showDeleted}" :fields="fields" @close="filterOpen=false" @apply="$emit('apply-filters',$event)" />
    <DialogFrame id="stock-more-actions" title="งานอื่นในคลังสต็อก" :open="moreOpen" presentation="sheet" @request-close="moreOpen=false">
      <div class="stock-more">
        <Button variant="secondary" @click="run('adjust')">ปรับยอดนับจริง</Button>
        <Button variant="secondary" @click="run('create')">เพิ่มวัตถุดิบใหม่</Button>
        <Button variant="quiet" @click="run('history')">ประวัติสต็อก</Button>
      </div>
    </DialogFrame>
  </section>
</template>
<script setup>
import {computed,ref} from 'vue'
import {ArrowDownToLine,ClipboardCheck,MoreHorizontal,SlidersHorizontal} from 'lucide-vue-next'
import AppSearch from '../ui/AppSearch.vue'
import Button from '../ui/Button.vue'
import IconButton from '../ui/IconButton.vue'
import FilterDropdown from '../ui/FilterDropdown.vue'
import DialogFrame from '../ui/DialogFrame.vue'
import { MATERIAL_ROLE_OPTIONS } from '@/domain/materialClassification'
const props=defineProps({search:{type:String,default:''},role:String,kind:String,showDeleted:Boolean,kinds:Array,deletedCount:Number})
const emit=defineEmits(['update:search','apply-filters','receive','stocktake','adjust','create','history'])
const filterOpen=ref(false),moreOpen=ref(false),filterButton=ref(null)
const filterCount=computed(()=>Number(props.role!=='all')+Number(props.kind!=='all')+Number(props.showDeleted))
const fields=computed(()=>[
 {key:'role',label:'การใช้งาน',options:[{id:'all',label:'ทั้งหมด'},...MATERIAL_ROLE_OPTIONS]},
 {key:'kind',label:'ประเภทคลัง',options:props.kinds},
 {key:'showDeleted',label:`รวมรายการจัดเก็บ (${props.deletedCount})`,type:'checkbox',defaultValue:false}
])
function run(action){moreOpen.value=false;emit(action)}
</script>
<style scoped>
.receive-short{display:none}.stock-toolbar{display:flex;align-items:end;gap:12px;flex-wrap:wrap;min-width:0}.stock-actions,.stock-search{display:flex;align-items:center;gap:8px;min-width:0}.stock-actions{order:2}.stock-search{flex:1;order:1}.stock-search>.app-search{flex:1;min-width:0;background:var(--bg-card)}.stock-actions>.ui-button,.stock-search>.ui-button{min-height:48px;white-space:nowrap}.stock-more{display:grid;gap:10px}@media(max-width:767px){.receive-full{display:none}.receive-short{display:inline}.stock-search{flex-basis:100%}.stock-actions{width:100%}.stock-actions>:first-child{flex:1}.stock-search>.ui-button{flex-shrink:0}}
</style>
