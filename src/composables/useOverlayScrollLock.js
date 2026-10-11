import {watch,onUnmounted} from 'vue'
const locks=[]
let saved=[],touchPosition=null
const scrollingKeys=['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','PageUp','PageDown','Home','End',' ']
function rootOf(token){return token.root?.value||null}
function canScroll(target,root,dx,dy){
 for(let node=target?.nodeType===1?target:target?.parentElement;node&&root?.contains(node);node=node.parentElement){
  const style=getComputedStyle(node)
  const vertical=/(auto|scroll)/.test(style.overflowY)&&node.scrollHeight>node.clientHeight
  const horizontal=/(auto|scroll)/.test(style.overflowX)&&node.scrollWidth>node.clientWidth
  if(dy&&vertical&&(dy<0?node.scrollTop>0:node.scrollTop+node.clientHeight<node.scrollHeight-1))return true
  if(dx&&horizontal&&(dx<0?node.scrollLeft>0:node.scrollLeft+node.clientWidth<node.scrollWidth-1))return true
  if(node===root)break
 }
 return false
}
function wheel(event){
 const root=rootOf(locks.at(-1)||{})
 if(!root||!canScroll(event.target,root,event.deltaX||0,event.deltaY||(event.deltaX?0:1)))event.preventDefault()
}
function touchStart(event){const p=event.touches?.length===1?event.touches[0]:null;touchPosition=p?{x:p.clientX,y:p.clientY}:null}
function touchMove(event){
 const p=event.touches?.[0],root=rootOf(locks.at(-1)||{})
 if(!p||!touchPosition||event.touches.length>1)return
 const dx=touchPosition.x-p.clientX,dy=touchPosition.y-p.clientY
 if(!root||!canScroll(event.target,root,dx,dy))event.preventDefault()
 touchPosition={x:p.clientX,y:p.clientY}
}
function keydown(event){
 if(!scrollingKeys.includes(event.key)||event.target?.closest?.('input,textarea,select,[contenteditable="true"]'))return
 if(event.key===' '&&event.target?.closest?.('button,[role="combobox"],summary,a[href]'))return
 const root=rootOf(locks.at(-1)||{})
 if(!root||!root.contains(event.target))event.preventDefault()
}
function acquire(token){
 if(locks.includes(token))return
 if(!locks.length){
  saved=[document.body,document.documentElement].map(node=>[node,node.style.overflow])
  saved.forEach(([node])=>{node.style.overflow='hidden'})
  document.addEventListener('wheel',wheel,{passive:false,capture:true})
  document.addEventListener('touchstart',touchStart,{passive:true,capture:true})
  document.addEventListener('touchmove',touchMove,{passive:false,capture:true})
  document.addEventListener('keydown',keydown,true)
 }
 locks.push(token)
}
function release(token){
 const index=locks.indexOf(token);if(index<0)return
 locks.splice(index,1)
 if(!locks.length){
  saved.forEach(([node,value])=>{node.style.overflow=value});saved=[]
  document.removeEventListener('wheel',wheel,true);document.removeEventListener('touchstart',touchStart,true);document.removeEventListener('touchmove',touchMove,true);document.removeEventListener('keydown',keydown,true);touchPosition=null
 }
}
export function useOverlayScrollLock(active,root){
 const token={root}
 watch(active,value=>value?acquire(token):release(token),{immediate:true,flush:'sync'})
 onUnmounted(()=>release(token))
}
