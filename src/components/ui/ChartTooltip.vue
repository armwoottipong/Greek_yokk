<template>
 <Teleport to="body">
  <div v-if="value" :id="id" ref="card" role="tooltip" class="chart-tooltip" :style="position">
   <i class="chart-tooltip-arrow" :class="{'is-below':below}" aria-hidden="true"></i>
   <span>{{ value.heading }}</span><div v-if="value.items" class="chart-tooltip-values"><div v-for="item in value.items" :key="item.label"><span><i :style="{background:item.color}"></i>{{ item.label }}</span><b class="font-number">{{ item.value }}</b></div></div><template v-else><div class="chart-tooltip-label"><i :style="{background:value.color}"></i><strong>{{ value.label }}</strong></div><b class="font-number">{{ value.value }}</b></template><small v-if="value.note">{{ value.note }}</small>
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
const below=computed(()=>props.value && props.value.y-size.value.height-16<8)
const position=computed(()=>{
 if(!props.value) return {}
 const width=Math.min(220,viewport.value.width-16),height=size.value.height
 const left=Math.max(8,Math.min(props.value.x-width/2,viewport.value.width-width-8))
 const preferred=props.value.y-height-16
 const top=Math.max(8,Math.min(below.value?props.value.y+16:preferred,viewport.value.height-height-16))
 return {left:`${left}px`,top:`${top}px`,width:`${width}px`,'--arrow-left':`${Math.max(16,Math.min(width-16,props.value.x-left))}px`}
})
</script>
<style scoped>
.chart-tooltip{position:fixed;z-index:90;pointer-events:none;padding:12px 14px;border:0;border-radius:13px;background:var(--bg-card);box-shadow:0 8px 28px #58040620,0 2px 6px #3525220a;color:var(--text-main);font-size:11px;overflow-wrap:anywhere}
.chart-tooltip>span,.chart-tooltip>small{display:block;color:var(--text-muted);font-size:10px;line-height:1.5}
.chart-tooltip-label{display:flex;align-items:center;gap:6px;margin:6px 0}.chart-tooltip-label i,.chart-tooltip-values span i{display:inline-block;width:8px;height:8px;border-radius:50%;flex-shrink:0}.chart-tooltip strong{font-weight:500}.chart-tooltip>b{display:block;font-size:20px;font-weight:600;color:var(--accent-brand)}.chart-tooltip>small{margin-top:5px}
.chart-tooltip-arrow{position:absolute;bottom:-5px;left:var(--arrow-left);width:11px;height:11px;background:var(--bg-card);transform:translateX(-50%) rotate(45deg);border-radius:2px}.chart-tooltip-arrow.is-below{bottom:auto;top:-5px}
.chart-tooltip-values{display:grid;gap:9px;margin-top:10px}.chart-tooltip-values>div{display:flex;align-items:center;justify-content:space-between;gap:12px}.chart-tooltip-values span{display:flex;align-items:center;gap:6px}.chart-tooltip-values b{font-size:13px;font-weight:600;white-space:nowrap}
@media(prefers-reduced-motion:no-preference){.chart-tooltip{animation:tooltip-arrive 120ms ease-out}}
@keyframes tooltip-arrive{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:translateY(0)}}
</style>
