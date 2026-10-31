<template>
 <section class="catalog-image-editor" aria-label="รูปภาพ">
  <div class="image-editor-preview"><img v-if="current" :src="current" alt="รูปที่เลือก"/><span v-else aria-hidden="true">{{ emoji||'🥣' }}</span></div>
  <div class="image-editor-actions">
   <strong>รูปภาพ 1:1</strong>
   <p>เลือกและครอปรูปก่อนบันทึก · JPG, PNG, WebP ไม่เกิน 10 MB</p>
   <input ref="fileInput" type="file" accept="image/jpeg,image/png,image/webp" aria-label="เลือกไฟล์รูปภาพ" class="image-file-input" :disabled="disabled||decoding||loading" @change="choose"/>
   <div class="image-editor-buttons"><Button variant="secondary" size="compact" :disabled="disabled||decoding||loading" :loading="decoding" @click="fileInput.click()">{{ current?'เปลี่ยนรูป':'แนบรูป' }}</Button><Button v-if="current" data-remove-image variant="quiet" size="compact" :disabled="disabled||loading" @click="setDraft('')">ลบรูป</Button><Button v-if="error&&service" variant="quiet" size="compact" :disabled="disabled" @click="reload">โหลดรูปปัจจุบันใหม่</Button></div>
   <p v-if="loading" role="status">กำลังโหลดรูป…</p><p v-if="error" role="alert" class="image-error">{{ error }}</p>
  </div>
  <ImageCropDialog :source="source" @cancel="cancelCrop" @apply="applyCrop"/>
 </section>
</template>
<script setup>
import {inject,onUnmounted,ref,watch} from 'vue'
import Button from '../ui/Button.vue'
import ImageCropDialog from './ImageCropDialog.vue'
import {readImageFile,validateImage} from '@/domain/catalogImage.js'
const props=defineProps({kind:{type:String,required:true},entityId:String,modelValue:{type:String,default:''},emoji:String,disabled:Boolean})
const emit=defineEmits(['update:modelValue'])
const service=inject('catalog-images',null),current=ref(props.modelValue),source=ref(null),fileInput=ref(null),loading=ref(false),decoding=ref(false),error=ref('')
let revision=0,dirty=false,stop,request=0,alive=true
function setDraft(value){current.value=value;dirty=true;emit('update:modelValue',value)}
function reload(){dirty=false;load()}
function load(){
 stop?.();error.value=''
 if(!service||!props.entityId){loading.value=false;return}
 loading.value=true
 try{stop=service.watch(props.kind,props.entityId,row=>{loading.value=false;if(!dirty){revision=row.revision;current.value=row.dataURL;emit('update:modelValue',row.dataURL)}},()=>{loading.value=false;error.value='โหลดรูปไม่ได้ กรุณาเชื่อมต่อแล้วลองใหม่'})}catch{loading.value=false;error.value='ยังเชื่อมต่อรูปไม่ได้ กรุณาลองใหม่'}
}
watch(()=>props.entityId,load,{immediate:true})
function cancelCrop(){request++;if(source.value)URL.revokeObjectURL(source.value.url);source.value=null}
function applyCrop(value){setDraft(value);cancelCrop()}
async function choose(e){
 const file=e.target.files?.[0];e.target.value='';if(!file)return
 const token=++request;decoding.value=true;error.value=''
 try{const result=await readImageFile(file);if(!alive||token!==request){URL.revokeObjectURL(result.url);return}source.value=result}catch(e){if(alive&&token===request)error.value=e.message}finally{if(alive&&token===request)decoding.value=false}
}
function assertReady(){
 if(loading.value||decoding.value||source.value)throw new Error('กรุณารอรูปและยืนยันการครอปก่อนบันทึก')
 if(error.value&&service)throw new Error(error.value)
}
async function save(entityId){
 assertReady()
 if(!dirty)return
 validateImage(current.value)
 if(service){try{const result=await service.save(props.kind,entityId,current.value,revision);revision=result.revision}catch(e){if(e.code==='IMAGE_CONFLICT')error.value='รูปถูกแก้จากเครื่องอื่น กรุณาโหลดรูปปัจจุบันใหม่';throw e}}
 dirty=false
}
onUnmounted(()=>{alive=false;cancelCrop();stop?.()})
defineExpose({save,assertReady})
</script>
<style scoped>
.catalog-image-editor{display:flex;align-items:center;gap:16px;min-width:0}.image-editor-preview{width:80px;aspect-ratio:1;flex-shrink:0;display:grid;place-items:center;overflow:hidden;border-radius:12px;background:var(--bg-soft);font-size:32px}.image-editor-preview img{width:100%;height:100%;object-fit:cover}.image-editor-actions{min-width:0}.image-editor-actions strong{font-size:.875rem;font-weight:500}.image-editor-actions p{font-size:.75rem;color:var(--text-muted);line-height:1.7;margin-block:4px 8px}.image-editor-buttons{display:flex;flex-wrap:wrap;gap:8px}.image-file-input{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}.image-editor-actions .image-error{color:var(--state-error)}@media(max-width:399px){.catalog-image-editor{align-items:flex-start;gap:12px}.image-editor-preview{width:64px}}
</style>
