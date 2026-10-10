<template>
 <Teleport to="body">
  <div v-if="value" :id="id" ref="card" role="tooltip" class="chart-tooltip" :style="position">
   <span>{{ value.heading }}</span><div><i :style="{background:value.color}"></i><strong>{{ value.label }}</strong></div><b class="font-number">{{ value.value }}</b><small v-if="value.note">{{ value.note }}</small>
  </div>
 </Teleport>
</template>
<script setup>
import {computed,ref,watch,nextTick,onMounted,onUnmounted} from 'vue'
const props=defineProps({id:{type:String,required:true},value:{type:Object,default:null}})
const card=ref(null),size=ref({width:220,height:114}),viewport=ref({width:1024,height:768})
function resize(){viewport.value={width:window.innerWidth,height:window.innerHeight}}
onMounted(()=>{resize();window.addEventListener('resize',resize)})
onUnmounted(()=>window.removeEventListener('resize',resize))
watch(()=>props.value,async()=>{await nextTick();if(card.value){const rect=card.value.getBoundingClientRect();if(rect.width)size.value={width:rect.width,height:rect.height}}},{immediate:true})
const position=computed(()=>{
 if(!props.value) return {}
 const width=Math.min(220,viewport.value.width-16),height=size.value.height
 const left=Math.max(8,Math.min(props.value.x+14,viewport.value.width-width-8))
 const preferred=props.value.y-height-12
 const top=Math.max(8,Math.min(preferred>=8?preferred:props.value.y+16,viewport.value.height-height-8))
 return {left:`${left}px`,top:`${top}px`,width:`${width}px`}
})
</script>
<style scoped>
.chart-tooltip{position:fixed;z-index:90;pointer-events:none;padding:12px 14px;border:1px solid var(--accent-border);border-radius:13px;background:var(--bg-card);box-shadow:var(--shadow-popup);color:var(--text-main);font-size:11px;overflow-wrap:anywhere}
.chart-tooltip>span,.chart-tooltip>small{display:block;color:var(--text-muted);font-size:10px;line-height:1.5}
.chart-tooltip>div{display:flex;align-items:center;gap:6px;margin:6px 0}.chart-tooltip i{width:8px;height:8px;border-radius:50%;flex-shrink:0}.chart-tooltip strong{font-weight:500}.chart-tooltip>b{display:block;font-size:20px;font-weight:600;color:var(--accent-brand)}.chart-tooltip>small{margin-top:5px}
@media(prefers-reduced-motion:no-preference){.chart-tooltip{animation:tooltip-arrive 120ms ease-out}}
@keyframes tooltip-arrive{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:translateY(0)}}
</style>
