<template>
 <DialogFrame :id="id" :open="open" :title="title" description="ลากปุ่มจับเพื่อจัดลำดับ หรือใช้ปุ่มขึ้นและลง แล้วกดบันทึก" :busy="busy" width="640px" @request-close="close">
  <div class="catalog-order">
   <p v-if="conflict&&!busy" class="order-help">รายการหรือลำดับเปลี่ยนจากอีกหน้าต่าง <Button data-order-restart variant="secondary" size="compact" :disabled="busy" @click="reset">เริ่มจัดลำดับใหม่</Button></p>
   <p class="sr-only" role="status" aria-live="polite">{{ announcement }}</p>
   <TransitionGroup ref="listGroup" tag="ol" name="order-row" class="order-list">
    <li v-for="(item,index) in ordered" :key="item.id" :data-order-item="item.id" class="order-item" :class="{'is-moving':dragging===item.id}" :aria-posinset="index+1" :aria-setsize="ordered.length">
     <span class="order-position">{{ index+1 }}</span>
     <span class="order-image"><EntityImage v-bind="item.imageProps||{kind:'menus',entityId:item.id,image:item.image,emoji:item.emoji}"/></span>
     <strong :title="item.name">{{ item.name }}</strong>
     <div class="order-controls">
      <IconButton :label="`เลื่อน ${item.name} ขึ้น`" :disabled="busy||conflict||index===0" @click="move(item.id,-1)"><ArrowUp :size="16" aria-hidden="true"/></IconButton>
      <IconButton :label="`เลื่อน ${item.name} ลง`" :disabled="busy||conflict||index===ordered.length-1" @click="move(item.id,1)"><ArrowDown :size="16" aria-hidden="true"/></IconButton>
      <IconButton :data-order-handle="item.id" class="order-handle" :label="`ลากเพื่อจัดลำดับ ${item.name}`" aria-keyshortcuts="ArrowUp ArrowDown" :disabled="busy||conflict" @pointerdown="startDrag($event,item.id)" @keydown.up.prevent="move(item.id,-1)" @keydown.down.prevent="move(item.id,1)"><GripVertical :size="19" aria-hidden="true"/></IconButton>
     </div>
    </li>
   </TransitionGroup>
  </div>
  <template #footer><Button data-order-cancel variant="quiet" :disabled="busy" @click="close">ยกเลิก</Button><Button data-order-save :disabled="!changed||conflict" :loading="busy" @click="$emit('save',[...draftIds])">บันทึกลำดับ</Button></template>
 </DialogFrame>
</template>
<script setup>
import {computed,ref,watch,nextTick,onUnmounted} from 'vue'
import {ArrowUp,ArrowDown,GripVertical} from 'lucide-vue-next'
import DialogFrame from '@/components/ui/DialogFrame.vue'
import IconButton from '@/components/ui/IconButton.vue'
import Button from '@/components/ui/Button.vue'
import EntityImage from '@/components/images/EntityImage.vue'
const props=defineProps({id:{type:String,default:'catalog-order'},open:Boolean,title:{type:String,required:true},items:{type:Array,default:()=>[]},revision:{type:[String,Number],default:''},busy:Boolean})
const emit=defineEmits(['save','request-close','reset'])
const draftIds=ref([]),originalIds=ref([]),originalItems=ref([]),originalRevision=ref(''),announcement=ref(''),dragging=ref(null),listGroup=ref(null)
const ordered=computed(()=>draftIds.value.map(id=>props.items.find(item=>item.id===id)||originalItems.value.find(item=>item.id===id)))
const changed=computed(()=>JSON.stringify(draftIds.value)!==JSON.stringify(originalIds.value))
const conflict=computed(()=>props.revision!==originalRevision.value||JSON.stringify(props.items.map(item=>item.id))!==JSON.stringify(originalIds.value))
let pointerId=null,pointerX=0,pointerY=0,frame=null
function reset(){stopDrag();originalItems.value=[...props.items];originalIds.value=props.items.map(item=>item.id);draftIds.value=[...originalIds.value];originalRevision.value=props.revision;announcement.value='';emit('reset')}
function close(){if(!props.busy){stopDrag();emit('request-close')}}
function moveTo(id,index){
 const from=draftIds.value.indexOf(id)
 if(props.busy||conflict.value||from<0||index<0||index>=draftIds.value.length||from===index)return
 const ids=[...draftIds.value];ids.splice(from,1);ids.splice(index,0,id);draftIds.value=ids
 announcement.value=`${ordered.value[index]?.name} ลำดับ ${index+1} จาก ${ids.length}`
}
async function move(id,delta){moveTo(id,draftIds.value.indexOf(id)+delta);await nextTick();focusHandle(id)}
function focusHandle(id){const list=listGroup.value?.$el;[...(list?.querySelectorAll('[data-order-handle]')||[])].find(button=>button.dataset.orderHandle===id)?.focus({preventScroll:true})}
function reorderAtPointer(){
 const list=listGroup.value?.$el;if(!list||!dragging.value)return
 const rect=list.getBoundingClientRect();if(pointerX<rect.left||pointerX>rect.right)return
 const y=Math.min(Math.max(pointerY,rect.top+1),rect.bottom-1)
 const rows=[...list.children].filter(row=>row.dataset.orderItem)
 const target=rows.findIndex(row=>{const bounds=row.offsetHeight?{top:rect.top+row.offsetTop-list.scrollTop,height:row.offsetHeight}:row.getBoundingClientRect();return y>=bounds.top&&y<bounds.top+bounds.height})
 if(target>=0)moveTo(dragging.value,target)
}
function dragMove(event){if(event.pointerId!==undefined&&event.pointerId!==pointerId)return;pointerX=event.clientX;pointerY=event.clientY;reorderAtPointer()}
function autoScroll(){
 const list=listGroup.value?.$el
 if(!list||!dragging.value)return
 const rect=list.getBoundingClientRect()
 if(pointerX>=rect.left&&pointerX<=rect.right){if(pointerY<rect.top+36)list.scrollTop-=7;else if(pointerY>rect.bottom-36)list.scrollTop+=7;reorderAtPointer()}
 frame=requestAnimationFrame(autoScroll)
}
function startDrag(event,id){
 if(props.busy||conflict.value||event.button!==0)return
 event.preventDefault();stopDrag();pointerId=event.pointerId??0;pointerX=event.clientX;pointerY=event.clientY;dragging.value=id
 window.addEventListener('pointermove',dragMove);window.addEventListener('pointerup',stopDrag);window.addEventListener('pointercancel',stopDrag);frame=requestAnimationFrame(autoScroll)
}
function stopDrag(event){
 if(event?.pointerId!==undefined&&event.pointerId!==pointerId)return
 if(frame!==null)cancelAnimationFrame(frame);frame=null;dragging.value=null;pointerId=null
 window.removeEventListener('pointermove',dragMove);window.removeEventListener('pointerup',stopDrag);window.removeEventListener('pointercancel',stopDrag)
}
watch(()=>props.open,value=>{if(value)reset();else stopDrag()},{immediate:true})
watch(()=>props.busy,value=>{if(value)stopDrag()})
onUnmounted(()=>stopDrag())
</script>
<style scoped>
.catalog-order{padding:8px 0;min-width:0}.order-help{font-size:.8125rem;line-height:1.7;margin-bottom:12px}.order-help>.ui-button{margin-inline-start:8px}.order-list{position:relative;list-style:none;margin:0;padding:0;max-height:min(56dvh,560px);overflow:auto;overscroll-behavior:contain}.order-item{display:flex;align-items:center;gap:10px;min-height:68px;padding:8px 0;border-bottom:1px solid var(--border-subtle);background:var(--bg-card)}.order-item.is-moving{background:var(--accent-soft)}.order-position{width:24px;text-align:center;font-size:.75rem;font-variant-numeric:tabular-nums;color:var(--text-muted);flex-shrink:0}.order-image{width:40px;height:40px;border-radius:10px;flex-shrink:0}.order-item>strong{min-width:0;flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font-size:.875rem}.order-controls{display:flex;flex-shrink:0}.order-handle{touch-action:none;cursor:grab}.order-handle:active{cursor:grabbing}.order-row-move{transition:transform 180ms cubic-bezier(.16,1,.3,1)}
@media(max-width:479px){.order-item{gap:6px}.order-position{width:18px}.order-image{width:32px;height:32px}}
@media(prefers-reduced-motion:reduce){.order-row-move{transition:none}}
</style>
