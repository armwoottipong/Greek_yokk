<template><Button variant="quiet" class="ui-icon-button" :aria-label="label" :title="label" :disabled="disabled" :loading="loading" @click="$emit('click',$event)"><slot /></Button></template>
<script setup>
import Button from './Button.vue'
defineProps({label:{type:String,required:true},disabled:Boolean,loading:Boolean})
defineEmits(['click'])
</script>
