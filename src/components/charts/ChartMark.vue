<template>
 <component :is="as" tabindex="0" role="button" :aria-label="label||undefined" @mouseenter="emit('highlight')" @mouseleave="emit('clear')" @focus="emit('highlight')" @blur="emit('clear')" @click.stop="emit('activate',$event)" @keydown="activateKey"><slot/></component>
</template>
<script setup>
import './charts.css'
defineProps({as:{type:String,default:'g'},label:String})
const emit=defineEmits(['highlight','clear','activate'])
function activateKey(event){
 if(event.key!=='Enter' && event.key!==' ')return
 event.preventDefault();event.stopPropagation();emit('activate',event)
}
</script>
