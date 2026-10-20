<template>
 <div class="menu-content-empty"><BookOpen :size="32" aria-hidden="true"/><h3>{{ labels.first }}</h3><p>ข้อมูลวิเคราะห์ทุกช่องทางและสูตรจะแสดงตรงนี้</p><Button @click="$emit('add')">{{ labels.add }}</Button></div>
</template>
<script setup>
import {computed} from 'vue'
import {BookOpen} from 'lucide-vue-next'
import Button from '../ui/Button.vue'
import {catalogLabels} from './catalogLabels'
const props=defineProps({entity:{type:String,required:true}})
const labels=computed(()=>catalogLabels[props.entity])
defineEmits(['add'])
</script>
