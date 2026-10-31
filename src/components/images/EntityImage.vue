<template>
 <span class="entity-image" aria-hidden="true">
  <img v-if="source&&!failed" :src="source" alt="" decoding="async" @error="failed=true"/>
  <span v-else>{{ emoji||'🥣' }}</span>
 </span>
</template>
<script setup>
import {computed,inject,onUnmounted,ref,watch} from 'vue'
const props=defineProps({kind:{type:String,default:'menus'},entityId:String,image:String,emoji:String})
const service=inject('catalog-images',null),remote=ref(''),failed=ref(false)
const source=computed(()=>service?remote.value:props.image||'')
let stop
watch(()=>[props.kind,props.entityId],()=>{
 stop?.();remote.value=''
 if(service&&props.entityId)try{stop=service.watch(props.kind,props.entityId,row=>{remote.value=row.dataURL},()=>{remote.value=''})}catch{remote.value=''}
},{immediate:true})
watch(source,()=>{failed.value=false})
onUnmounted(()=>stop?.())
</script>
<style scoped>
.entity-image{position:relative;display:grid;place-items:center;aspect-ratio:1;width:100%;height:100%;min-width:0;min-height:0;overflow:hidden;border-radius:inherit;flex-shrink:0}.entity-image img{position:absolute;inset:0;display:block;width:100%;height:100%;object-fit:cover}.entity-image>span{line-height:1}
</style>
