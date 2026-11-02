export function floatingInfoPlacement(trigger, panel, maxWidth, layer) {
 const edge=12, gap=10, viewportWidth=window.innerWidth, viewportHeight=window.innerHeight
 const anchor=trigger.getBoundingClientRect()
 const width=Math.min(maxWidth,viewportWidth-edge*2)
 const height=Math.min(panel.getBoundingClientRect().height,viewportHeight-edge*2)
 const belowRoom=viewportHeight-edge-anchor.bottom-gap
 const aboveRoom=anchor.top-gap-edge
 const above=belowRoom<height && aboveRoom>belowRoom
 const preferredTop=above?anchor.top-height-gap:anchor.bottom+gap
 const top=Math.max(edge,Math.min(preferredTop,viewportHeight-height-edge))
 const left=Math.max(edge,Math.min(anchor.right-width,viewportWidth-width-edge))
 const arrowLeft=Math.max(left+18,Math.min(anchor.left+anchor.width/2,left+width-18))
 const arrowTop=above?top+height-6:top-6
 const pointsToTrigger=anchor.bottom>=0 && anchor.top<=viewportHeight && Math.abs((above?top+height:top)-(above?anchor.top:anchor.bottom))<=gap+8
 return {
  panel:{zIndex:layer,width:`${width}px`,left:`${left}px`,top:`${top}px`,maxHeight:`${viewportHeight-edge*2}px`,visibility:'visible'},
  arrow:{zIndex:layer+1,left:`${arrowLeft-6}px`,top:`${arrowTop}px`,visibility:pointsToTrigger?'visible':'hidden'},
  above
 }
}
