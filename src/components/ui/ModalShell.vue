<template>
 <div v-if="open" ref="root" role="dialog" aria-modal="true" :aria-labelledby="labelledBy || undefined" :aria-label="labelledBy ? undefined : label" tabindex="-1" @keydown="handleKey" @click.self="$emit('request-close')"><slot /></div>
</template>
<script setup>
import { ref, watch, nextTick, onUnmounted,computed } from 'vue'
import {overlayStack as stack} from '@/composables/overlayState'
import {useOverlayScrollLock} from '@/composables/useOverlayScrollLock'
const props = defineProps({ open:Boolean, labelledBy:String, label:{type:String,default:'Dialog'}, initialFocus:String,lockScroll:{type:Boolean,default:true} })
const emit = defineEmits(['request-close'])
const root = ref(null)
useOverlayScrollLock(computed(()=>props.open&&props.lockScroll),root)
const token = { node: null }
let opener = null
function visibleControl(el){
 if(el.closest('[inert],[hidden]')||el.getAttribute('aria-hidden')==='true')return false
 if(el.closest('details:not([open])')&&!el.closest('summary'))return false
 for(let node=el;node&&node!==root.value;node=node.parentElement){const style=getComputedStyle(node);if(style.display==='none'||style.visibility==='hidden')return false}
 return true
}
const controls = () => [...(root.value?.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,a[href],[tabindex="0"]') || [])].filter(visibleControl)
function updateLayers() {
 stack.forEach((entry,index) => {
  if(entry.node)entry.node.style.zIndex=String(60+index*20)
  if(index === stack.length - 1) entry.node?.removeAttribute('inert')
  else entry.node?.setAttribute('inert','')
 })
}
function release() {
 const index = stack.indexOf(token)
 if (index < 0) return
 const top = index === stack.length - 1
 stack.splice(index,1)
 updateLayers()
 if (!stack.length) document.getElementById('app')?.removeAttribute('inert')
 if (top && opener?.isConnected && !opener.closest('[inert]')) opener.focus()
 else if(top&&!stack.length)document.querySelector('main input,main button,[data-focus-fallback]')?.focus()
}
watch(() => props.open, async open => {
 if (!open) { release(); return }
 opener = document.activeElement
 stack.push(token)
 document.getElementById('app')?.setAttribute('inert','')
 await nextTick()
 token.node = root.value
 updateLayers()
 if (props.open && stack.at(-1) === token) (root.value?.querySelector(props.initialFocus || '[data-initial-focus]') || controls()[0] || root.value)?.focus()
}, {immediate:true})
function handleKey(event) {
 if (stack.at(-1) !== token) return
 if (event.key === 'Escape') {event.preventDefault();event.stopPropagation();emit('request-close')}
 if (event.key !== 'Tab') return
 const list = controls(), first = list[0], last = list.at(-1)
 if (!first) {event.preventDefault();root.value?.focus();return}
 if (event.shiftKey && (document.activeElement === first || document.activeElement === root.value)) {event.preventDefault();last.focus()}
 else if (!event.shiftKey && (document.activeElement === last || document.activeElement === root.value)) {event.preventDefault();first.focus()}
}
onUnmounted(release)
</script>
