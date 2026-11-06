import {onUnmounted,onDeactivated} from 'vue'

export function useCartMotion(target) {
 let source=null,bounce=null
 const flights=new Set(),animations=new Set()
 const reduced=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
 function track(animation,done=()=>{}){
  if(!animation)return
  animations.add(animation)
  animation.finished?.then(()=>{animations.delete(animation);done()},()=>{animations.delete(animation);done()})
 }
 function capture(id){
  const element=[...document.querySelectorAll('[data-pos-menu]')].find(node=>node.dataset.posMenu===id)
  source=element?{element,rect:element.getBoundingClientRect(),snapshot:element.cloneNode(true)}:null
 }
 function fly(){
  const button=target.value
  if(!button||!button.animate||reduced())return
  const destination=button.getBoundingClientRect();if(!destination.width||!destination.height)return
  const canFly=source?.rect.width>0&&source?.rect.height>0
  bounce?.cancel()
  bounce=button.animate([{transform:'translateY(0) scale(1) rotate(0)'},{transform:'translateY(-7px) scale(1.12) rotate(-5deg)',offset:.34},{transform:'translateY(1px) scale(.96) rotate(3deg)',offset:.68},{transform:'translateY(0) scale(1) rotate(0)'}],{duration:460,delay:canFly?590:0,easing:'cubic-bezier(.16,1,.3,1)'})
  track(bounce)
  if(!canFly)return
  if(flights.size>=3){const first=flights.values().next().value;first.animation.cancel();first.node.remove();flights.delete(first)}
  const {rect,element,snapshot}=source,node=snapshot.cloneNode(true),style=getComputedStyle(element)
  node.removeAttribute('id');node.setAttribute('aria-hidden','true');node.setAttribute('inert','');node.setAttribute('data-cart-flight','')
  for(const child of node.querySelectorAll('[id]'))child.removeAttribute('id')
  Object.assign(node.style,{position:'fixed',left:`${rect.left}px`,top:`${rect.top}px`,width:`${rect.width}px`,height:`${rect.height}px`,margin:'0',pointerEvents:'none',zIndex:'240',opacity:'0',transformOrigin:'center center',boxSizing:'border-box'})
  for(const key of ['display','flexDirection','alignItems','gap','padding','fontFamily','fontSize','lineHeight','color','background','border','borderRadius','textAlign'])node.style[key]=style[key]
  node.style.boxShadow='0 12px 32px #35252225'
  document.body.append(node)
  const x=destination.left+destination.width/2-rect.left-rect.width/2,y=destination.top+destination.height/2-rect.top-rect.height/2
  const animation=node.animate([{transform:'translate3d(0,0,0) scale(1) rotate(0)',opacity:1},{transform:`translate3d(${x*.28}px,${Math.min(-64,y*.05-120)}px,0) scale(.58) rotate(-7deg)`,opacity:1,offset:.36},{transform:`translate3d(${x}px,${y}px,0) scale(.08) rotate(8deg)`,opacity:0}],{duration:630,delay:90,easing:'cubic-bezier(.32,0,.67,1)',fill:'forwards'})
  const flight={node,animation};flights.add(flight)
  track(animation,()=>{node.remove();flights.delete(flight)})
  if(element.isConnected)track(element.animate?.([{transform:'scale(1)'},{transform:'scale(.97)',offset:.5},{transform:'scale(1)'}],{duration:200,easing:'ease-out'}))
 }
 function cancel(){for(const animation of animations)animation.cancel();animations.clear();for(const flight of flights)flight.node.remove();flights.clear();source=null;bounce=null}
 onUnmounted(cancel);onDeactivated(cancel)
 return {capture,fly,cancel}
}
