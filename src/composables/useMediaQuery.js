import {ref,onMounted,onUnmounted} from 'vue'
export function useMediaQuery(query){
 const media=typeof window!=='undefined'?window.matchMedia?.(query):null
 const value=ref(media?.matches||false)
 const update=()=>{value.value=!!media?.matches}
 onMounted(()=>media?.addEventListener('change',update))
 onUnmounted(()=>media?.removeEventListener('change',update))
 return value
}
