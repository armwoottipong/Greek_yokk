<template>
 <CatalogManagementRow :item="menu" :platforms="platforms" :selected-id="selectedId" :status="menu.isActive===false?'ปิดขาย':'เปิดขาย'" :status-tone="menu.isActive===false?'warning':'neutral'" :metadata="menu.hasAddons?'เลือกท็อปปิ้งได้':''" :recipe-summary="`${ingredientCount} วัตถุดิบ · ${menu.hasPackage!==false?packageCount:0} บรรจุภัณฑ์`" @details="$emit('details',$event)" @edit="$emit('edit',$event)" @delete="$emit('delete',$event)"/>
</template>
<script setup>
import CatalogManagementRow from './CatalogManagementRow.vue'
defineProps({menu:Object,platforms:{type:Array,default:()=>[]},selectedId:String,ingredientCount:{type:Number,default:0},packageCount:{type:Number,default:0}})
defineEmits(['details','edit','delete'])
</script>
