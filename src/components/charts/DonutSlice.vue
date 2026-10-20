<template>
 <ChartMark as="circle" class="dashboard-donut-slice" :cx="cx" :cy="cy" :r="radius" fill="none" :stroke="color" :stroke-width="strokeWidth" pathLength="100" :stroke-dasharray="`${share} ${100-share}`" :stroke-dashoffset="-offset" :transform="`rotate(-90 ${cx} ${cy})`"/>
</template>
<script setup>
import ChartMark from './ChartMark.vue'
defineProps({cx:{type:Number,required:true},cy:{type:Number,required:true},radius:{type:Number,required:true},strokeWidth:{type:Number,required:true},color:{type:String,required:true},share:{type:Number,required:true},offset:{type:Number,default:0}})
</script>
