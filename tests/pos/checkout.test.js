import {it,expect,vi} from 'vitest'
import {createTestStore,material} from '../helpers/createStore'
const menu=(qty=60,extra={})=>({id:'M',name:'M',isActive:true,prices:{PLAT01:100},recipe:[{materialId:'X',qty}],...extra})
const setup=()=>{const s=createTestStore({storage:{GY_MATERIALS:[material()],GY_MENUS:[menu()]}});s.executeAddToCart(s.menus[0]);return s}
it('revalidates changed inventory without clearing cart',()=> {
 const s=setup();s.stockAdjust('X',20,'','',false);expect(s.checkout()).toBeNull();expect(s.cart).toHaveLength(1);expect(s.orders).toHaveLength(0)
})
it('records confirmed shortage as outstanding without negative lots',()=> {
 const s=setup();s.stockAdjust('X',20,'','',false);const o=s.checkout({allowShortage:true})
 expect(o.stockShortages[0].qty).toBe(40);expect(s.stockShortages[0].orderId).toBe(o.orderId);expect(s.materials[0].stock).toBe(0)
})
it('quota failure retains cart and committed stock without receipt',()=> {
 const s=setup();vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new Error('quota')})
 expect(s.checkout()).toBeNull();expect(s.cart).toHaveLength(1);expect(s.materials[0].stock).toBe(100);expect(s.orders).toEqual([]);expect(s.modals.receipt.isOpen).toBe(false)
})
it('sale between receipt draft and discard preserves only the sale',()=> {
 const s=setup();s.stockIn('X',30,1,'',null,{expiryDate:'2099-01-01'},true);s.checkout();s.discardStockDrafts()
 expect(s.materials[0].stock).toBe(40);expect(s.materials[0].lots.reduce((n,l)=>n+l.qty,0)).toBe(40)
})
it('packaging disabled means no requirement or cost or deduction',()=> {
 const s=createTestStore({storage:{GY_MATERIALS:[material('X',100,{category:'Packaging'})],GY_MENUS:[menu(120,{hasPackage:false})]}})
 expect(s.checkStockAvailability(s.menus[0]).canAdd).toBe(true);s.executeAddToCart(s.menus[0]);expect(s.cartSummary.totalFoodCost).toBe(0);s.checkout();expect(s.materials[0].stock).toBe(100)
})
it('cart preserves recipe snapshots across later menu edits',()=> {
 const s=setup();s.menus[0].recipe[0].qty=90;s.menus[0].prices.PLAT01=200
 const o=s.checkout();expect(o.subtotal).toBe(100);expect(s.materials[0].stock).toBe(40)
})
