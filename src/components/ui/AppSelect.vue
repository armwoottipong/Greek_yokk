<template>
  <span ref="root" class="app-select" :class="$attrs.class" :style="$attrs.style">
    <select ref="source" v-model="selection" hidden aria-hidden="true" tabindex="-1" :aria-label="$attrs['aria-label']" :disabled="disabled" @change="$emit('change',$event)"><slot /></select>
    <button ref="trigger" v-bind="controlAttrs()" type="button" role="combobox" aria-haspopup="listbox" :aria-expanded="isOpen" :aria-controls="isOpen ? menuId : undefined" :aria-activedescendant="isOpen && active >= 0 ? `${menuId}-${active}` : undefined" :disabled="disabled || !options.length" class="app-select-trigger" @click="isOpen ? close() : open()" @keydown="handleKey">
      <span class="app-select-value" :class="selected ? '' : 'app-select-placeholder'">{{ selected?.label || placeholder }}</span><ChevronDown :size="15" aria-hidden="true" class="app-select-chevron" :class="isOpen ? 'is-open' : ''" />
    </button>
    <Teleport to="body">
      <div v-if="isOpen" :id="menuId" ref="menu" role="listbox" :aria-label="$attrs['aria-label'] || 'ตัวเลือก'" :style="position" class="app-select-menu">
        <template v-for="(option,index) in options" :key="index">
          <div v-if="option.group && (index === 0 || option.group !== options[index-1].group)" class="app-select-group">{{ option.group }}</div>
          <div :id="`${menuId}-${index}`" role="option" :aria-selected="option.value === String(modelValue)" :aria-disabled="option.disabled || undefined" class="app-select-option" :class="{'is-active':index === active,'is-selected':option.value === String(modelValue),'is-disabled':option.disabled}" @pointerdown.prevent @pointermove="!option.disabled && (active=index)" @click="choose(index)">
            <span>{{ option.label }}</span><Check v-if="option.value === String(modelValue)" :size="14" aria-hidden="true" />
          </div>
        </template>
      </div>
    </Teleport>
  </span>
</template>
<script>
let closeCurrent = null
</script>
<script setup>
import {ref,computed,useAttrs,useId,onMounted,onUpdated,onUnmounted,nextTick,watch} from 'vue'
import {ChevronDown,Check} from 'lucide-vue-next'
defineOptions({inheritAttrs:false})
const props=defineProps({modelValue:{type:[String,Number],default:''},disabled:Boolean,placeholder:{type:String,default:'เลือกรายการ'}})
const emit=defineEmits(['update:modelValue','change'])
const attrs=useAttrs(),menuId=`app-select-${useId()}`
const root=ref(null),source=ref(null),trigger=ref(null),menu=ref(null)
const options=ref([]),isOpen=ref(false),active=ref(-1),position=ref({})
let prefix='',prefixTimer
const selection=computed({get:()=>props.modelValue,set:value=>emit('update:modelValue',value)})
const selected=computed(()=>options.value.find(option=>option.value===String(props.modelValue)))
const controlAttrs=()=>Object.fromEntries(Object.entries(attrs).filter(([key])=>key!=='class' && key!=='style'))
function readOptions(){
  const next=[...(source.value?.options || [])].map(option=>({value:option.value,label:option.textContent.trim().replace(/\s+/g,' '),group:option.parentElement.tagName==='OPTGROUP'?option.parentElement.label:'',disabled:option.disabled || (option.parentElement.tagName==='OPTGROUP' && option.parentElement.disabled)}))
  if(JSON.stringify(next)!==JSON.stringify(options.value)) options.value=next
  if(isOpen.value && (active.value>=next.length || next[active.value]?.disabled)) active.value=next.findIndex(option=>!option.disabled)
}
onMounted(readOptions)
onUpdated(readOptions)
function positionMenu(){
  const anchor=trigger.value?.getBoundingClientRect()
  if(!anchor) return
  const margin=8,width=Math.min(Math.max(anchor.width,220),window.innerWidth-margin*2)
  const below=window.innerHeight-anchor.bottom-margin*2,above=anchor.top-margin*2,useAbove=below<160 && above>below
  const height=Math.min(300,Math.max(80,useAbove?above:below))
  position.value={left:`${Math.max(margin,Math.min(anchor.left,window.innerWidth-width-margin))}px`,top:useAbove?undefined:`${anchor.bottom+6}px`,bottom:useAbove?`${window.innerHeight-anchor.top+6}px`:undefined,width:`${width}px`,maxHeight:`${height}px`}
}
function outside(event){if(!root.value?.contains(event.target) && !menu.value?.contains(event.target)) close(false)}
function scroll(event){if(!menu.value?.contains(event.target)) positionMenu()}
function detach(){document.removeEventListener('pointerdown',outside,true);window.removeEventListener('resize',positionMenu);window.removeEventListener('scroll',scroll,true)}
function close(restoreFocus=true){
  isOpen.value=false;detach();clearTimeout(prefixTimer);prefix=''
  if(closeCurrent===close) closeCurrent=null
  if(restoreFocus) trigger.value?.focus()
}
async function open(){
  if(props.disabled || !options.value.length) return
  if(closeCurrent && closeCurrent!==close) closeCurrent(false)
  closeCurrent=close;positionMenu();isOpen.value=true
  active.value=options.value.findIndex(option=>option.value===String(props.modelValue) && !option.disabled)
  if(active.value<0) active.value=options.value.findIndex(option=>!option.disabled)
  document.addEventListener('pointerdown',outside,true);window.addEventListener('resize',positionMenu);window.addEventListener('scroll',scroll,true)
  await nextTick();revealActive()
}
function revealActive(){menu.value?.querySelector(`[id="${menuId}-${active.value}"]`)?.scrollIntoView?.({block:'nearest'})}
function choose(index){
  if(!options.value[index] || options.value[index].disabled) return
  // Vue's native v-model preserves typed option values and existing change events.
  source.value.selectedIndex=index;source.value.dispatchEvent(new Event('change',{bubbles:true}));close()
}
function move(direction){
  const enabled=options.value.map((option,index)=>option.disabled?-1:index).filter(index=>index>=0)
  if(!enabled.length) return
  const index=enabled.indexOf(active.value)
  active.value=enabled[(index+direction+enabled.length)%enabled.length];nextTick(revealActive)
}
function handleKey(event){
  const key=event.key
  if(key==='Tab'){if(isOpen.value) close(false);return}
  if(key==='Escape'){if(isOpen.value){event.preventDefault();event.stopPropagation();close()}return}
  if(['ArrowDown','ArrowUp','Home','End','Enter',' '].includes(key)){
    event.preventDefault();event.stopPropagation()
    if(!isOpen.value){open();return}
    if(key==='ArrowDown') move(1)
    else if(key==='ArrowUp') move(-1)
    else if(key==='Home' || key==='End') {const enabled=options.value.map((option,index)=>option.disabled?-1:index).filter(index=>index>=0);active.value=key==='Home'?enabled[0]:enabled.at(-1);nextTick(revealActive)}
    else choose(active.value)
  } else if(key.length===1 && !event.ctrlKey && !event.metaKey && !event.altKey){
    event.preventDefault();if(!isOpen.value) open()
    prefix+=key.toLocaleLowerCase();clearTimeout(prefixTimer)
    const found=options.value.findIndex(option=>!option.disabled && option.label.toLocaleLowerCase().startsWith(prefix))
    if(found>=0){active.value=found;nextTick(revealActive)}
    prefixTimer=setTimeout(()=>{prefix=''},600)
  }
}
watch(()=>props.disabled,value=>{if(value) close(false)})
onUnmounted(()=>close(false))
</script>
<style scoped>
.app-select{display:inline-flex;min-width:0;vertical-align:middle}
.app-select-trigger{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;min-width:0;min-height:40px;padding:8px 12px;background:#fff;border:1px solid #dedfd9;border-radius:9px;color:#44403c;font:inherit;font-size:12px;text-align:left;cursor:pointer;transition:border-color .15s,box-shadow .15s}
.app-select-trigger:hover{border-color:#a5b4aa}.app-select-trigger[aria-expanded=true]{border-color:#82ab97;box-shadow:0 0 0 3px #eaf4ed}.app-select-trigger:focus-visible{outline:2px solid #047857;outline-offset:2px}.app-select-trigger:disabled{opacity:.5;cursor:not-allowed;background:#f5f5f4}
.app-select-value{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}.app-select-placeholder{color:#a8a29e}.app-select-chevron{flex-shrink:0;color:#8a968d;transition:transform .15s}.app-select-chevron.is-open{transform:rotate(180deg)}
.app-select-menu{position:fixed;z-index:120;overflow-y:auto;overscroll-behavior:contain;padding:5px;border:1px solid #dce4dd;border-radius:11px;background:#fff;box-shadow:0 10px 30px #223c2d22,0 2px 5px #223c2d0a;font-family:inherit;font-size:12px;color:#44403c;scrollbar-width:thin}
.app-select-group{padding:9px 10px 5px;font-size:10px;font-weight:500;color:#87958b;pointer-events:none}.app-select-group:not(:first-child){margin-top:5px;border-top:1px solid #eef1ec}
.app-select-option{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 10px;min-height:37px;border-radius:6px;line-height:1.6;cursor:pointer}.app-select-option>span{min-width:0;overflow-wrap:anywhere}.app-select-option>svg{flex-shrink:0}.app-select-option.is-selected{color:#16634d;font-weight:500}.app-select-option.is-active{background:#ecf6ef;color:#16634d}.app-select-option.is-disabled{opacity:.4;cursor:not-allowed}
@media(prefers-reduced-motion:reduce){.app-select-trigger,.app-select-chevron{transition:none}}
</style>
