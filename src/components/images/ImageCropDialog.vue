<template>
 <DialogFrame :id="id" :open="!!source" title="ครอปรูป" description="ลากรูปหรือปรับตำแหน่งให้พอดีกับกรอบ 1:1" width="520px" :busy="busy" @request-close="$emit('cancel')">
  <div v-if="source" class="image-crop-editor">
   <div ref="viewport" class="crop-viewport" aria-label="ตัวอย่างรูปสี่เหลี่ยมจัตุรัส" @pointerdown="startDrag" @pointermove="drag" @pointerup="endDrag" @pointercancel="endDrag">
    <img :src="source.url" :style="previewStyle" alt="ตัวอย่างตำแหน่งครอป" draggable="false"/>
    <span class="crop-grid" aria-hidden="true"></span>
   </div>
   <label>ซูม <output>{{ zoom.toFixed(1) }}×</output><input v-model.number="zoom" type="range" min="1" max="4" step="0.1" :disabled="busy"/></label>
   <label>ตำแหน่งแนวนอน<input v-model.number="x" type="range" min="0" max="100" step="1" :disabled="busy"/></label>
   <label>ตำแหน่งแนวตั้ง<input v-model.number="y" type="range" min="0" max="100" step="1" :disabled="busy"/></label>
   <p v-if="error" role="alert" class="image-error">{{ error }}</p>
  </div>
  <template #footer><Button variant="secondary" :disabled="busy" @click="$emit('cancel')">ยกเลิก</Button><Button :loading="busy" @click="apply">ใช้รูปนี้</Button></template>
 </DialogFrame>
</template>
<script setup>
import {computed,ref,useId,watch} from 'vue'
import DialogFrame from '../ui/DialogFrame.vue'
import Button from '../ui/Button.vue'
import {cropRect,cropImage} from '@/domain/catalogImage.js'
const props=defineProps({source:Object})
const emit=defineEmits(['cancel','apply'])
const id=`image-crop-${useId()}`,zoom=ref(1),x=ref(50),y=ref(50),busy=ref(false),error=ref(''),viewport=ref(null)
let pointer=null
watch(()=>props.source,()=>{zoom.value=1;x.value=y.value=50;error.value='';pointer=null})
const rect=computed(()=>props.source?cropRect(props.source.image.naturalWidth,props.source.image.naturalHeight,zoom.value,x.value,y.value):null)
const previewStyle=computed(()=>{const r=rect.value;if(!r)return {};return {width:`${props.source.image.naturalWidth/r.size*100}%`,height:`${props.source.image.naturalHeight/r.size*100}%`,left:`${-r.x/r.size*100}%`,top:`${-r.y/r.size*100}%`}})
function startDrag(e){if(busy.value||e.button!==0)return;pointer={id:e.pointerId,x:e.clientX,y:e.clientY};viewport.value.setPointerCapture(e.pointerId)}
function endDrag(){pointer=null}
function drag(e){
 if(!pointer||pointer.id!==e.pointerId)return
 const r=rect.value,scale=r.size/viewport.value.clientWidth,w=props.source.image.naturalWidth-r.size,h=props.source.image.naturalHeight-r.size
 if(w)x.value=Math.max(0,Math.min(100,x.value-(e.clientX-pointer.x)*scale/w*100))
 if(h)y.value=Math.max(0,Math.min(100,y.value-(e.clientY-pointer.y)*scale/h*100))
 pointer={id:e.pointerId,x:e.clientX,y:e.clientY}
}
async function apply(){if(busy.value||!props.source)return;busy.value=true;error.value='';try{emit('apply',await cropImage(props.source.image,{zoom:zoom.value,x:x.value,y:y.value}))}catch(e){error.value=e.message}finally{busy.value=false}}
</script>
<style scoped>
.image-crop-editor{display:grid;gap:16px}.crop-viewport{position:relative;width:min(100%,320px);aspect-ratio:1;margin-inline:auto;overflow:hidden;background:var(--bg-soft);border-radius:12px;touch-action:none;cursor:grab}.crop-viewport:active{cursor:grabbing}.crop-viewport img{position:absolute;max-width:none;user-select:none;pointer-events:none}.crop-grid{position:absolute;inset:0;pointer-events:none;background:linear-gradient(to right,transparent 33%,#ffffff80 33%,#ffffff80 33.5%,transparent 33.5%,transparent 66%,#ffffff80 66%,#ffffff80 66.5%,transparent 66.5%),linear-gradient(to bottom,transparent 33%,#ffffff80 33%,#ffffff80 33.5%,transparent 33.5%,transparent 66%,#ffffff80 66%,#ffffff80 66.5%,transparent 66.5%)}.image-crop-editor label{display:flex;flex-wrap:wrap;justify-content:space-between;gap:6px;font-size:.875rem;color:var(--text-main)}.image-crop-editor input{width:100%;min-height:32px;accent-color:var(--accent-brand)}.image-crop-editor input:focus-visible{outline:2px solid var(--accent-brand);outline-offset:2px}.image-error{color:var(--state-error);font-size:.8125rem}
</style>
