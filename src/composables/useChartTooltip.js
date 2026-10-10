import {ref} from 'vue'

export function useChartTooltip(){
 const tooltip=ref(null)
 function showTooltip(event,content){
  const rect=event.currentTarget?.getBoundingClientRect()
  const pointer=event.type?.startsWith('mouse') || event.type?.startsWith('pointer')
  tooltip.value={...content,x:pointer?event.clientX:(rect?.left || 0)+(rect?.width || 0)/2,y:pointer?event.clientY:(rect?.top || 0)}
 }
 const hideTooltip=()=>{tooltip.value=null}
 return {tooltip,showTooltip,hideTooltip}
}
