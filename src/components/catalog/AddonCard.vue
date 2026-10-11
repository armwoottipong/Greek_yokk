<template>
 <article class="catalog-card"><button type="button" :data-addon-details="addon.id" class="catalog-card-main" :aria-label="`ดูรายละเอียด ${addon.name}`" @click="$emit('details',addon.id)"><span aria-hidden="true" class="catalog-card-emoji">{{ addon.emoji }}</span><span><strong>{{ addon.name }}</strong><small>{{ addon.category }}</small></span></button><PlatformPriceSummary :prices="addon.prices||{}" :platforms="platforms" :selected-id="selectedId" /><div class="catalog-card-actions"><Button variant="secondary" :aria-label="`แก้ไข ${addon.name}`" @click="$emit('edit',addon.id)">แก้ไข</Button><IconButton :label="`ลบ Add-on ${addon.name}`" @click="$emit('delete',addon)"><Trash2 :size="16" /></IconButton></div></article>
</template>
<script setup>
import {Trash2} from 'lucide-vue-next'
import Button from '../ui/Button.vue'
import IconButton from '../ui/IconButton.vue'
import PlatformPriceSummary from './PlatformPriceSummary.vue'
defineProps({addon:Object,platforms:Array,selectedId:String})
defineEmits(['details','edit','delete'])
</script>
