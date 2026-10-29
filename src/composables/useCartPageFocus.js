import {watch,nextTick,onMounted,onUnmounted} from 'vue'
import {overlayStack} from './overlayState'

// The cart remains one model while narrow screens navigate between two pages.
export function useCartPageFocus(root,split,open){
 let observer,stop,pendingFocus=null
 function fitPage(){
  const element=root.value,main=element?.closest('main')
  if(!main)return
  const top=element.getBoundingClientRect().top-main.getBoundingClientRect().top+main.scrollTop
  const bottom=parseFloat(getComputedStyle(main).paddingBottom)||0
  element.style.setProperty('--pos-workspace-height',`${Math.max(320,main.clientHeight-top-bottom)}px`)
 }
 onMounted(()=>{
  stop=watch(root,()=>{
   observer?.disconnect()
   const main=root.value?.closest('main')
   if(main&&typeof ResizeObserver!=='undefined'){
    observer ||= new ResizeObserver(fitPage)
    observer.observe(main)
   }
   fitPage()
  },{immediate:true,flush:'post'})
  window.addEventListener('resize',fitPage)
 })
 onUnmounted(()=>{stop?.();observer?.disconnect();window.removeEventListener('resize',fitPage)})
 async function focusPage(){
  await nextTick()
  if(!pendingFocus||overlayStack.length)return
  root.value?.querySelector(pendingFocus)?.focus()
  pendingFocus=null
 }
 watch(()=>overlayStack.length,focusPage,{flush:'post'})
 watch([open,split],async([isOpen,isSplit],[wasOpen])=>{
  pendingFocus=isSplit?null:isOpen?'[data-cart-page]':wasOpen?'[data-cart-open]':null
  await nextTick()
  fitPage()
  await focusPage()
 })
}
