<template>
 <div ref="element" class="menu-workbench" :class="{'is-mobile-detail':mobileDetail}">
  <slot name="before"/>
  <slot name="header"/>
  <slot name="after-header"/>
  <div :id="directoryId" v-show="active" class="workbench-columns">
   <slot name="browser"/>
   <section class="menu-content" :aria-label="labels.workspace"><slot/></section>
  </div>
 </div>
</template>
<script setup>
import {computed,ref} from 'vue'
import './catalogWorkspace.css'
import './menuFocus.css'
import {catalogLabels} from './catalogLabels'
const props=defineProps({entity:{type:String,required:true},mobileDetail:Boolean,active:{type:Boolean,default:true},directoryId:String})
const element=ref(null),labels=computed(()=>catalogLabels[props.entity])
defineExpose({element})
</script>
