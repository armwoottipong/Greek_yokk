<template><span class="ui-status" :class="`ui-status--${tone}`"><slot name="icon" /><span>{{ label }}</span></span></template>
<script setup>
defineProps({tone:{type:String,default:'neutral'},label:{type:String,required:true}})
</script>
