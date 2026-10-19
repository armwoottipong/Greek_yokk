import { it, expect } from 'vitest'
import { createTestStore } from '../helpers/createStore'

it('refreshes menu and addon prices on channel changes while retaining quantities, notes and recipe snapshots', () => {
 const store=createTestStore();store.resetDemoData()
 store.executeAddToCart(store.menus[0],[store.addons[0]],2,false,'แยกท็อปปิ้ง')
 const recipe=JSON.stringify(store.cart[0].menu.recipe)
 store.menus[0].prices.PLAT02=120;store.addons[0].prices.PLAT02=20
 store.menus[0].recipe=[]
 store.setPlatform('PLAT02')
 expect(store.cartSummary.subtotal).toBe(280)
 expect(store.cartSummary.gpAmount).toBe(84)
 expect(store.cartSummary.netRevenue).toBe(196)
 expect(store.cart[0].qty).toBe(2)
 expect(store.cart[0].note).toBe('แยกท็อปปิ้ง')
 expect(JSON.stringify(store.cart[0].menu.recipe)).toBe(recipe)
 store.setPlatform('PLAT01')
 expect(store.cartSummary.gpAmount).toBe(0)
 expect(store.cartSummary.subtotal).toBe(2*(store.menus[0].prices.PLAT01+store.addons[0].prices.PLAT01))
})

it('ignores unknown and inactive channels', () => {
 const store=createTestStore();store.resetDemoData()
 store.platforms[1].isActive=false
 store.setPlatform('MISSING');expect(store.currentPlatformId).toBe('PLAT01')
 store.setPlatform('PLAT02');expect(store.currentPlatformId).toBe('PLAT01')
})

it('records the exact GP rate and amount on the completed order', () => {
 const store=createTestStore();store.resetDemoData()
 store.platforms.find(p=>p.id==='PLAT02').gpPercent=25.5
 store.setPlatform('PLAT02');store.executeAddToCart(store.menus[0],[],1)
 const order=store.checkout({allowShortage:true})
 expect(order).toMatchObject({subtotal:95,gpPercent:25.5,gpAmount:24.23,netRevenue:70.77,platformId:'PLAT02'})
})
