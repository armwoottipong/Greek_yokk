import {it, expect} from 'vitest'
import {mount, flushPromises} from '@vue/test-utils'
import {createTestStore, material} from '../helpers/createStore'
import ActivityLogModal from '../../src/components/modals/ActivityLogModal.vue'

it('confirms an undo from history, supports cancellation and disables the returned order', async () => {
 const store = createTestStore({storage:{GY_MATERIALS:[material()], GY_MENUS:[{id:'M', name:'Yogurt', isActive:true, prices:{PLAT01:100}, recipe:[{materialId:'X',qty:30}]}]}})
 store.executeAddToCart(store.menus[0]); const order = store.checkout()
 store.modals.receipt.isOpen = false
 store.openActivityLog('all')
 const wrapper = mount(ActivityLogModal, {attachTo:document.body})
 const undo = () => wrapper.findAll('button').find(b => b.text() === 'ย้อนกลับออเดอร์')
 expect(undo()).toBeDefined()
 await undo().trigger('click')
 expect(store.modals.confirm.message).toContain(order.orderId)
 expect(store.materials[0].stock).toBe(70)
 store.modals.confirm.onCancel(); await flushPromises()
 expect(store.orders[0].status).not.toBe('cancelled')
 await undo().trigger('click')
 store.modals.confirm.onConfirm(); await flushPromises()
 expect(store.materials[0].stock).toBe(100)
 expect(wrapper.text()).toContain('ย้อนกลับแล้ว')
 expect(undo()).toBeUndefined()
 wrapper.unmount()
})
