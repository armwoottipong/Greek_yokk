<template>
  <section class="stock-toolbar" aria-label="จัดการคลังสต็อก">
    <div class="stock-actions">
      <Button data-stock-receive aria-label="รับเข้าสต็อก" @click="$emit('receive')"><ArrowDownToLine :size="16" /><span class="receive-full">รับเข้าสต็อก</span><span class="receive-short">รับเข้า</span></Button>
      <Button variant="secondary" data-stocktake-open @click="$emit('stocktake')"><ClipboardCheck :size="16" />ตรวจนับ</Button>
      <IconButton label="งานอื่นในคลังสต็อก" @click="moreOpen=true"><MoreHorizontal :size="20" /></IconButton>
    </div>
    <div class="stock-search">
      <Search :size="17" aria-hidden="true" />
      <input :value="search" aria-label="ค้นหาวัตถุดิบ" placeholder="ค้นหาชื่อ รหัส หรือหมวดหมู่" @input="$emit('update:search',$event.target.value)" />
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
import {ArrowDownToLine,ClipboardCheck,MoreHorizontal,Search,SlidersHorizontal} from 'lucide-vue-next'
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
.receive-short{display:none}.stock-actions .ui-button{white-space:nowrap}
.stock-toolbar{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;min-width:0}
.stock-actions,.stock-search{display:flex;align-items:center;gap:8px;min-width:0}.stock-search{flex:1;max-width:520px}.stock-search>svg{flex-shrink:0;color:var(--text-muted)}
.stock-search input{min-width:0;flex:1;height:44px;background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:10px;padding:0 12px;font-size:13px}.stock-search input:focus-visible{outline:2px solid var(--accent-brand);outline-offset:2px}.stock-more{display:grid;gap:10px}
@media(max-width:767px){.receive-full{display:none}.receive-short{display:inline}.stock-toolbar{gap:12px}.stock-actions,.stock-search{width:100%;max-width:none}.stock-actions>:first-child{flex:1}.stock-search>svg{display:none}.stock-search input{width:0}.stock-search .ui-button{flex-shrink:0}}
</style>
