import {it,expect} from 'vitest'
import {mount} from '@vue/test-utils'
import {nextTick} from 'vue'
import {createTestStore} from '../helpers/createStore'
import Menu from '../../src/components/modals/MenuEditModal.vue'
import Addon from '../../src/components/modals/AddonEditModal.vue'
import Material from '../../src/components/modals/MaterialEditModal.vue'
import StockIn from '../../src/components/modals/StockInModal.vue'
import StockAdjust from '../../src/components/modals/StockAdjustModal.vue'
import Waste from '../../src/components/modals/WasteModal.vue'
import Emoji from '../../src/components/modals/EmojiPickerPopover.vue'
for(const [Component,key] of [[Menu,'menuEdit'],[Addon,'addonEdit'],[Material,'materialEdit'],[StockIn,'stockIn'],[StockAdjust,'stockAdjust'],[Waste,'waste'],[Emoji,'emojiPicker']]){
 it(key+' names each input without relying on its placeholder',async()=>{
  const store=createTestStore();store.resetDemoData()
  const w=mount(Component,{attachTo:document.body})
  try{
   store.modals[key]={...store.modals[key],isOpen:true,materialId:store.materials[0].id}
   await nextTick();await nextTick()
   const controls=w.findAll('input,textarea').filter(c=>c.attributes('type')!=='file'&&c.attributes('type')!=='checkbox'&&c.attributes('type')!=='radio')
   expect(controls.length).toBeGreaterThan(0)
   for(const c of controls)expect(c.attributes('aria-label')||c.attributes('aria-labelledby')||c.element.labels?.[0]?.textContent?.trim(),'Unnamed '+key+' '+c.attributes('placeholder')).toBeTruthy()
  }finally{w.unmount()}
 })
}
