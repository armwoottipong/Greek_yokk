<template><button :type="type" :class="['ui-button',`ui-button--${variant}`,`ui-button--${size}`]" :disabled="disabled||loading" :aria-busy="loading||undefined" @click="handleClick"><span v-if="loading" class="ui-button-spinner" aria-hidden="true"></span><slot /></button></template>
<script setup>
const props=defineProps({variant:{type:String,default:'primary'},size:{type:String,default:'touch'},type:{type:String,default:'button'},loading:Boolean,disabled:Boolean})
const emit=defineEmits(['click'])
function handleClick(event){if(!props.disabled&&!props.loading)emit('click',event)}
</script>
