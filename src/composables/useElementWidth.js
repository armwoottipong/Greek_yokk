import {ref,watch,onMounted,onUnmounted} from 'vue'
export function useElementWidth(element){
 const width=ref(0)
 let observer,stop
 const measure=()=>{width.value=element.value?.getBoundingClientRect().width||0}
 onMounted(()=>{
  if(typeof ResizeObserver!=='undefined')observer=new ResizeObserver(entries=>{width.value=entries[0]?.contentRect.width||element.value?.getBoundingClientRect().width||0})
  else window.addEventListener('resize',measure)
  // Server-loaded views may not have a DOM element at the parent's mount.
  stop=watch(element,()=>{observer?.disconnect();measure();if(element.value)observer?.observe(element.value)},{immediate:true,flush:'post'})
 })
 onUnmounted(()=>{stop?.();observer?.disconnect();window.removeEventListener('resize',measure)})
 return width
}
