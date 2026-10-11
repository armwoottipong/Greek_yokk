export const overlayStack=[]
export const topOverlayNode=()=>overlayStack.at(-1)?.node||null
export const topOverlayLayer=()=>60+Math.max(0,overlayStack.length-1)*20
