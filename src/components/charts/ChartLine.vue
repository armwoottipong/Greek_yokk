<template>
 <path class="dashboard-chart-line" pathLength="1" :d="d" fill="none" :stroke="color" stroke-width="2.5" stroke-linejoin="round"/>
</template>
<script setup>
import './charts.css'
defineProps({d:{type:String,required:true},color:{type:String,required:true}})
</script>
