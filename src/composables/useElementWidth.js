import {ref,onMounted,onUnmounted} from 'vue'
export function useElementWidth(element){
 const width=ref(0)
 let observer
 const measure=()=>{width.value=element.value?.getBoundingClientRect().width||0}
 onMounted(()=>{measure();if(typeof ResizeObserver!=='undefined'){observer=new ResizeObserver(entries=>{width.value=entries[0]?.contentRect.width||element.value?.getBoundingClientRect().width||0});if(element.value)observer.observe(element.value)}else window.addEventListener('resize',measure)})
 onUnmounted(()=>{observer?.disconnect();window.removeEventListener('resize',measure)})
 return width
}
