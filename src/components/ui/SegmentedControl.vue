<template>
 <div class="segmented-control dashboard-segments" role="group" :aria-label="label">
  <button v-for="option in options" :key="option.value" type="button" v-bind="buttonAttrs(option)" :aria-pressed="modelValue===option.value" @click="select(option.value)">
   <component :is="option.icon" v-if="option.icon" :size="14" aria-hidden="true"/>{{ option.label }}
  </button>
 </div>
</template>
<script setup>
const props=defineProps({modelValue:{type:[String,Number],required:true},label:{type:String,required:true},options:{type:Array,required:true},buttonAttrs:{type:Function,default:()=>({})}})
const emit=defineEmits(['update:modelValue'])
function select(value){if(value!==props.modelValue)emit('update:modelValue',value)}
</script>
<style scoped>
.segmented-control{display:flex;align-items:center;gap:3px;padding:3px;background:var(--bg-soft);border-radius:10px;font-size:.75rem;flex-shrink:0}
.segmented-control button{display:flex;align-items:center;justify-content:center;gap:5px;min-height:32px;padding:4px 10px;border-radius:7px;color:var(--text-muted);white-space:nowrap;cursor:pointer}
.segmented-control button[aria-pressed=true]{background:var(--bg-card);color:var(--accent-brand);box-shadow:0 1px 4px #3525220d;font-weight:600}
.segmented-control button:focus-visible{outline:2px solid var(--accent-brand);outline-offset:3px}
@media(max-width:1199px),(pointer:coarse){.segmented-control button{min-height:44px}}
@media(prefers-reduced-motion:no-preference){.segmented-control button{transition:transform 140ms ease,background-color 140ms ease,color 140ms ease}.segmented-control button:active{transform:scale(.97)}}
</style>
