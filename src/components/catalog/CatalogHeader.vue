<template>
 <header v-bind="{[`data-${entity}-header`]:''}" class="menu-header-panel">
  <Button :disabled="busy" class="menu-back" variant="quiet" @click="$emit('back')"><ArrowLeft :size="16" aria-hidden="true"/>{{ labels.back }}</Button>
  <div v-if="selected" class="menu-header-identity"><span class="menu-header-emoji" aria-hidden="true"><EntityImage v-if="entity==='menu'" kind="menus" :entity-id="selected.id" :image="selected.image" :emoji="selected.emoji"/><template v-else>{{ selected.emoji }}</template></span><div>
   <h2 v-bind="{[`data-selected-${entity}-name`]:''}" tabindex="-1">{{ selected.name }}</h2>
   <p v-if="selected.description" class="menu-header-description">{{ selected.description }}</p>
   <div class="menu-header-meta"><StatusBadge :label="selected.isActive===false?'ปิดขาย':'เปิดขาย'" :tone="selected.isActive===false?'warning':'neutral'"/><span>{{ platformCount }} ช่องทางที่ตั้งราคา</span><span>{{ (selected.recipe||[]).length }} รายการในสูตร</span></div>
  </div></div>
  <div v-else class="menu-header-identity"><div><h2>{{ labels.headerTitle }}</h2><p class="menu-header-description">{{ labels.description }}</p></div></div>
  <Button v-bind="{[`data-${entity}-more`]:''}" class="catalog-more-trigger" variant="secondary" :disabled="busy" aria-haspopup="dialog" :aria-expanded="moreOpen" :aria-controls="`${entity}-header-actions`" @click="moreOpen=true"><MoreHorizontal :size="20" aria-hidden="true"/>เพิ่มเติม</Button>
  <div class="menu-header-actions">
   <Button data-catalog-add :disabled="busy" @click="$emit('add')"><Plus :size="16" aria-hidden="true"/>{{ labels.add }}</Button>
   <Button v-if="selected" v-bind="{[`data-${entity}-edit`]:''}" variant="secondary" :disabled="busy" @click="$emit('edit',selected.id)"><Pencil :size="15" aria-hidden="true"/>{{ labels.edit }}</Button>
   <Button v-if="selected" v-bind="{[`data-${entity}-delete`]:''}" :loading="removing" :disabled="busy" class="menu-delete" variant="danger" :aria-label="labels.remove" :title="labels.remove" @click="$emit('delete',selected)"><Trash2 :size="20" aria-hidden="true"/></Button>
  </div>
  <DialogFrame :id="`${entity}-header-actions`" :title="selected?.name||labels.headerTitle" :open="moreOpen" presentation="sheet" compact @request-close="moreOpen=false">
   <div class="catalog-more-actions">
    <Button data-catalog-more-add :disabled="busy" @click="run('add')"><Plus :size="18" aria-hidden="true"/>{{ labels.add }}</Button>
    <Button v-if="selected" data-catalog-more-edit variant="secondary" :disabled="busy" @click="run('edit',selected.id)"><Pencil :size="18" aria-hidden="true"/>{{ labels.edit }}</Button>
    <Button v-if="selected" data-catalog-more-delete variant="danger" :disabled="busy" @click="run('delete',selected)"><Trash2 :size="18" aria-hidden="true"/>{{ labels.remove }}</Button>
   </div>
  </DialogFrame>
 </header>
</template>
<script setup>
import EntityImage from '@/components/images/EntityImage.vue'
import {computed,ref} from 'vue'
import {ArrowLeft,Plus,Pencil,Trash2,MoreHorizontal} from 'lucide-vue-next'
import DialogFrame from '../ui/DialogFrame.vue'
import Button from '../ui/Button.vue'
import StatusBadge from '../ui/StatusBadge.vue'
import {catalogLabels} from './catalogLabels'
const props=defineProps({entity:{type:String,required:true},busy:Boolean,removing:Boolean,selected:{type:Object,default:null},platformCount:{type:Number,default:0}})
const labels=computed(()=>catalogLabels[props.entity])
const emit=defineEmits(['back','add','edit','delete'])
const moreOpen=ref(false)
function run(action,value){moreOpen.value=false;emit(action,value)}
</script>
<style scoped>
.catalog-more-trigger{display:none}.catalog-more-actions{display:grid;gap:10px}
@media(max-width:1199px){.menu-header-panel{grid-template-columns:minmax(0,1fr) auto;gap:12px}.menu-header-actions{display:none}.catalog-more-trigger{display:inline-flex;align-self:start}.menu-back{grid-column:1/-1}.menu-header-identity{grid-column:1}.catalog-more-trigger{grid-column:2}.menu-header-meta{gap:4px 12px}}
@media(max-width:479px){.catalog-more-trigger{width:44px;min-height:44px;padding:0;font-size:0;gap:0}.catalog-more-trigger svg{flex-shrink:0}}
</style>
