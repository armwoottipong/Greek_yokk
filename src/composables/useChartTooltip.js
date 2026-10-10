import {ref,onMounted,onUnmounted,watch} from 'vue'

let scrollLocks=0,previousBodyOverflow='',previousRootOverflow=''
const preventScroll=event=>event.preventDefault()
function preventScrollKey(event){
 if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','PageUp','PageDown','Home','End',' '].includes(event.key) && !event.target?.closest?.('input,textarea,select,[contenteditable="true"]'))event.preventDefault()
}
function lockScroll(){
 if(scrollLocks++>0)return
 previousBodyOverflow=document.body.style.overflow;previousRootOverflow=document.documentElement.style.overflow
 document.body.style.overflow='hidden';document.documentElement.style.overflow='hidden'
 document.addEventListener('wheel',preventScroll,{passive:false,capture:true})
 document.addEventListener('touchmove',preventScroll,{passive:false,capture:true})
 document.addEventListener('keydown',preventScrollKey,true)
}
function unlockScroll(){
 if(--scrollLocks>0)return
 document.body.style.overflow=previousBodyOverflow;document.documentElement.style.overflow=previousRootOverflow
 document.removeEventListener('wheel',preventScroll,true);document.removeEventListener('touchmove',preventScroll,true);document.removeEventListener('keydown',preventScrollKey,true)
}

export function useChartTooltip(){
 const tooltip=ref(null)
 let trigger=null
 let locked=false
 watch(tooltip,value=>{if(value && !locked){locked=true;lockScroll()}else if(!value && locked){locked=false;unlockScroll()}},{flush:'sync'})
 const contentKey=content=>JSON.stringify([content.selection,content.heading,content.label,content.items?.map(item=>item.label)])
 const hideTooltip=()=>{tooltip.value=null;trigger=null}
 function showTooltip(event,content,anchor){
  if(tooltip.value && contentKey(tooltip.value)===contentKey(content)){hideTooltip();return}
  const rect=event.currentTarget?.getBoundingClientRect()
  const pointer=event.type?.startsWith('mouse') || event.type?.startsWith('pointer') || (event.type==='click' && (event.clientX || event.clientY))
  trigger=event.currentTarget
  tooltip.value={...content,x:anchor?.x ?? (pointer?event.clientX:(rect?.left || 0)+(rect?.width || 0)/2),y:anchor?.y ?? (pointer?event.clientY:(rect?.top || 0))}
 }
 function dismissOutside(event){if(tooltip.value && !trigger?.contains(event.target))hideTooltip()}
 onMounted(()=>document.addEventListener('pointerdown',dismissOutside,true))
 onUnmounted(()=>{document.removeEventListener('pointerdown',dismissOutside,true);if(locked){locked=false;unlockScroll()}})
 return {tooltip,showTooltip,hideTooltip}
}
