import { it, expect, vi } from 'vitest'
import { reactive } from 'vue'
import { mount } from '@vue/test-utils'
const state=vi.hoisted(()=>({store:null}))
vi.mock('@/stores/posStore',()=>({usePosStore:()=>state.store}))
import CustomOrder from '../../src/components/modals/CustomOrderModal.vue'
it('names same-emoji addons and exposes selection on native buttons',async()=>{
 state.store=reactive({modals:{customOrder:{isOpen:true,menuId:'M'}}, menus:[{id:'M',name:'Yogurt',hasAddons:true,prices:{P:10}}], addons:[{id:'A',name:'Strawberry',emoji:'🍓',prices:{P:5}},{id:'B',name:'Berry jam',emoji:'🍓',prices:{P:6}}],currentPlatformId:'P',currentPlatform:{name:'Local'},matMap:{}})
 const wrapper=mount(CustomOrder)
 const button=wrapper.findAll('button').find(b=>b.text().includes('Strawberry'))
 expect(button).toBeDefined()
 expect(button.text()).toContain('+฿5')
 expect(wrapper.text()).toContain('Berry jam')
 await button.trigger('click')
 expect(button.attributes('aria-pressed')).toBe('true')
 wrapper.unmount()
})
