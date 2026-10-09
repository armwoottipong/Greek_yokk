<template>
 <div v-if="open" ref="root" role="dialog" aria-modal="true" :aria-labelledby="labelledBy || undefined" :aria-label="labelledBy ? undefined : label" tabindex="-1" @keydown="handleKey" @click.self="$emit('request-close')"><slot /></div>
</template>
<script>
const stack = []
</script>
<script setup>
import { ref, watch, nextTick, onUnmounted } from 'vue'
const props = defineProps({ open:Boolean, labelledBy:String, label:{type:String,default:'Dialog'}, initialFocus:String })
const emit = defineEmits(['request-close'])
const root = ref(null)
const token = { node: null }
let opener = null
const controls = () => [...(root.value?.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href],[tabindex="0"]') || [])].filter(el => !el.closest('[inert]') && el.getAttribute('aria-hidden') !== 'true')
function updateLayers() {
 stack.forEach((entry,index) => {
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
 if (top && opener?.isConnected) opener.focus()
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
