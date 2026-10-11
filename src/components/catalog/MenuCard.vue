<template>
 <article class="catalog-card"><button type="button" :data-catalog-details="menu.id" class="catalog-card-main" :aria-label="`ดูรายละเอียด ${menu.name}`" @click="$emit('details',menu)"><span aria-hidden="true" class="catalog-card-emoji">{{ menu.emoji }}</span><span><strong>{{ menu.name }}</strong><small>{{ menu.category }}</small><span v-if="!menu.isActive" class="catalog-inactive">ปิดขาย</span></span></button><PlatformPriceSummary :prices="menu.prices||{}" :platforms="platforms" :selected-id="selectedId" /><div class="catalog-card-actions"><Button variant="secondary" :aria-label="`แก้ไข ${menu.name}`" @click="$emit('edit',menu.id)">แก้ไข</Button><IconButton :label="`ลบเมนู ${menu.name}`" @click="$emit('delete',menu)"><Trash2 :size="16" /></IconButton></div></article>
</template>
<script setup>
import {Trash2} from 'lucide-vue-next'
import Button from '../ui/Button.vue'
import IconButton from '../ui/IconButton.vue'
import PlatformPriceSummary from './PlatformPriceSummary.vue'
defineProps({menu:Object,platforms:Array,selectedId:String})
defineEmits(['details','edit','delete'])
</script>
