import {ref,onMounted,onUnmounted,computed} from 'vue'
import {useOverlayScrollLock} from './useOverlayScrollLock'

export function useChartTooltip(){
 const tooltip=ref(null)
 let trigger=null
 useOverlayScrollLock(computed(()=>!!tooltip.value))
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
 onUnmounted(()=>document.removeEventListener('pointerdown',dismissOutside,true))
 return {tooltip,showTooltip,hideTooltip}
}
