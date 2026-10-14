<template>
 <CatalogManagementRow :item="addon" details-attribute="data-addon-details" :platforms="platforms" :selected-id="selectedId" :recipe-summary="addon.recipe?.length?`${ingredientCount} วัตถุดิบ · ${packageCount} บรรจุภัณฑ์`:'ไม่ตัดวัตถุดิบหรือบรรจุภัณฑ์'" @details="$emit('details',addon.id)" @edit="$emit('edit',$event)" @delete="$emit('delete',$event)"/>
</template>
<script setup>
import CatalogManagementRow from './CatalogManagementRow.vue'
defineProps({addon:Object,platforms:{type:Array,default:()=>[]},selectedId:String,ingredientCount:{type:Number,default:0},packageCount:{type:Number,default:0}})
defineEmits(['details','edit','delete'])
</script>
