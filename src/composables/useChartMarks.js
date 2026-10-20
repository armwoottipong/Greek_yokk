import {computed,ref,watch,useId} from 'vue'
import {useChartTooltip} from './useChartTooltip'

// Shares the Dashboard tooltip lifecycle; hover never changes chart geometry.
export function useChartMarks(source){
 const hovered=ref(null),tooltipId=`chart-mark-${useId()}`
 const {tooltip,showTooltip,hideTooltip}=useChartTooltip()
 const active=computed(()=>tooltip.value?.selection ?? hovered.value)
 watch(tooltip,value=>{if(!value)hovered.value=null},{flush:'sync'})
 function highlight(key){hovered.value=key}
 function clearHover(){hovered.value=null}
 function clearSelection(){hovered.value=null;hideTooltip()}
 function selectMark(event,key,content,anchor){hovered.value=null;showTooltip(event,{...content,selection:key},anchor)}
 watch(source,clearSelection)
 return {tooltipId,tooltip,active,highlight,clearHover,clearSelection,selectMark}
}
