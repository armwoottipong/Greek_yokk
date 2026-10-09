import {it,expect,vi} from 'vitest'
import {reactive,nextTick} from 'vue'
import {mount} from '@vue/test-utils'
const state=vi.hoisted(()=>({store:null}))
vi.mock('@/stores/posStore',()=>({usePosStore:()=>state.store}))
vi.mock('@/composables/useModalForm',()=>({useModalForm:()=>({saveSnapshot:()=>{},confirmSave:async()=>true,requestClose:()=>{}})}))
import MenuEdit from '../../src/components/modals/MenuEditModal.vue'
import AddonEdit from '../../src/components/modals/AddonEditModal.vue'
for(const [label,Component,modal,action] of [['menu',MenuEdit,'menuEdit','saveMenu'],['addon',AddonEdit,'addonEdit','saveAddon']]) it(`${label} converts blank platform prices to numeric zero before validation`,async()=>{
 state.store=reactive({platforms:[{id:'P1',name:'Store'},{id:'P2',name:'Delivery'}],menus:[],addons:[],materials:[],activeMaterials:[],matMap:{},menuCategories:[],addonCategories:[],modals:{[modal]:{isOpen:false}},showToast:vi.fn(),[action]:vi.fn(()=>({ok:true}))})
 const wrapper=mount(Component)
 state.store.modals[modal].isOpen=true
 await nextTick();await nextTick()
 wrapper.vm.form.name='Test'
 wrapper.vm.form.prices.P1=10
 await wrapper.vm.submit()
 expect(state.store[action]).toHaveBeenCalledWith(expect.objectContaining({prices:{P1:10,P2:0}}))
 wrapper.unmount()
})
