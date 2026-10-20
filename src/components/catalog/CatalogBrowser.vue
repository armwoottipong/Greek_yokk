<template>
 <aside class="menu-browser" :aria-label="labels.listLabel"><div class="menu-browser-tools"><AppSearch :model-value="modelValue" :label="labels.search" :placeholder="labels.placeholder" @update:model-value="$emit('update:modelValue',$event)"/><p>{{ items.length }} {{ labels.countUnit }}</p></div>
  <div class="menu-browser-list"><button v-for="item in items" :key="item.id" type="button" v-bind="itemAttrs(item)" :aria-pressed="selectedId===item.id" class="menu-browser-item" @click="$emit('select',item.id)"><span class="menu-list-emoji" aria-hidden="true">{{ item.emoji }}</span><span><strong>{{ item.name }}</strong><small>{{ item.isActive===false?'ปิดขาย':'เปิดขาย' }} · {{ (item.recipe||[]).length }} รายการในสูตร</small></span><ChevronRight :size="14" aria-hidden="true"/></button></div>
  <div v-if="!items.length" class="menu-browser-empty"><strong>{{ modelValue?labels.notFound:labels.empty }}</strong><p>{{ modelValue?`ลองชื่ออื่น หรือ${labels.showAll}`:labels.description }}</p><Button v-if="modelValue" v-bind="{[`data-${entity}-clear-search`]:''}" variant="secondary" @click="$emit('update:modelValue','')">{{ labels.showAll }}</Button><Button v-else @click="$emit('add')">{{ labels.addFirst }}</Button></div>
 </aside>
</template>
<script setup>
import {computed} from 'vue'
import {ChevronRight} from 'lucide-vue-next'
import AppSearch from '../ui/AppSearch.vue'
import Button from '../ui/Button.vue'
import {catalogLabels} from './catalogLabels'
const props=defineProps({entity:{type:String,required:true},items:{type:Array,default:()=>[]},selectedId:String,modelValue:{type:String,default:''}})
const labels=computed(()=>catalogLabels[props.entity])
function itemAttrs(item){return {[`data-${props.entity}-select`]:item.id,[props.entity==='menu'?'data-catalog-details':'data-addon-details']:item.id}}
defineEmits(['update:modelValue','select','add'])
</script>
