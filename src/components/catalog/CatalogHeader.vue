<template>
 <header v-bind="{[`data-${entity}-header`]:''}" class="menu-header-panel">
  <Button :disabled="busy" class="menu-back" variant="quiet" @click="$emit('back')"><ArrowLeft :size="16" aria-hidden="true"/>{{ labels.back }}</Button>
  <div v-if="selected" class="menu-header-identity"><span class="menu-header-emoji" aria-hidden="true">{{ selected.emoji }}</span><div>
   <h2 v-bind="{[`data-selected-${entity}-name`]:''}" tabindex="-1">{{ selected.name }}</h2>
   <p v-if="selected.description" class="menu-header-description">{{ selected.description }}</p>
   <div class="menu-header-meta"><StatusBadge :label="selected.isActive===false?'ปิดขาย':'เปิดขาย'" :tone="selected.isActive===false?'warning':'neutral'"/><span>{{ platformCount }} ช่องทางที่ตั้งราคา</span><span>{{ (selected.recipe||[]).length }} รายการในสูตร</span></div>
  </div></div>
  <div v-else class="menu-header-identity"><div><h2>{{ labels.headerTitle }}</h2><p class="menu-header-description">{{ labels.description }}</p></div></div>
  <div class="menu-header-actions">
   <Button data-catalog-add :disabled="busy" @click="$emit('add')"><Plus :size="16" aria-hidden="true"/>{{ labels.add }}</Button>
   <Button v-if="selected" v-bind="{[`data-${entity}-edit`]:''}" variant="secondary" :disabled="busy" @click="$emit('edit',selected.id)"><Pencil :size="15" aria-hidden="true"/>{{ labels.edit }}</Button>
   <Button v-if="selected" v-bind="{[`data-${entity}-delete`]:''}" :loading="removing" :disabled="busy" class="menu-delete" variant="danger" :aria-label="labels.remove" :title="labels.remove" @click="$emit('delete',selected)"><Trash2 :size="20" aria-hidden="true"/></Button>
  </div>
 </header>
</template>
<script setup>
import {computed} from 'vue'
import {ArrowLeft,Plus,Pencil,Trash2} from 'lucide-vue-next'
import Button from '../ui/Button.vue'
import StatusBadge from '../ui/StatusBadge.vue'
import {catalogLabels} from './catalogLabels'
const props=defineProps({entity:{type:String,required:true},busy:Boolean,removing:Boolean,selected:{type:Object,default:null},platformCount:{type:Number,default:0}})
const labels=computed(()=>catalogLabels[props.entity])
defineEmits(['back','add','edit','delete'])
</script>
