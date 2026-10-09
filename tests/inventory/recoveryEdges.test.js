import {it,expect} from 'vitest'
import {createTestStore,material} from '../helpers/createStore'
it('discard after conflicting sale permits a fresh recount',()=> {
 const s=createTestStore({storage:{GY_MATERIALS:[material()],GY_MENUS:[{id:'M',name:'M',prices:{PLAT01:10},recipe:[{materialId:'X',qty:80}]}]}})
 s.stockAdjust('X',50,'','',true);s.executeAddToCart(s.menus[0]);expect(s.checkout()).toBeTruthy();expect(s.stockDraftConflict).toBeTruthy()
 s.discardStockDrafts();expect(s.stockDraftConflict).toBeNull();s.stockAdjust('X',25,'','',true);expect(s.commitStockDrafts().ok).toBe(true)
})
it('zero-cost receipt contributes zero incoming valuation',()=> {
 const s=createTestStore({storage:{GY_MATERIALS:[material()]}})
 expect(s.stockIn('X',100,0,'',0,{expiryDate:'2099-01-01'},false).ok).toBe(true)
 expect(s.materials[0].stock).toBe(200);expect(s.materials[0].unitCost).toBe(0.5)
})
it('invalid draft inputs return failure without mutation',()=> {
 const s=createTestStore({storage:{GY_MATERIALS:[material()]}})
 expect(s.stockIn('X',NaN,1,'',null,{},true).ok).toBe(false)
 expect(s.stockAdjust('X',-10,'','',true).ok).toBe(false)
 expect(s.materials[0].stock).toBe(100)
})
it('sale preserves a draft switch from last to middle lot',()=> {
 const s=createTestStore({storage:{GY_MATERIALS:[material('X',300,{lots:[{id:'A',qty:100,isInUse:false},{id:'B',qty:100,isInUse:false},{id:'C',qty:100,isInUse:true}]})],GY_MENUS:[{id:'M',name:'M',prices:{PLAT01:10},recipe:[{materialId:'X',qty:1}]}]}})
 s.initStockDraftSnapshot();s.switchActiveLot('X','B',true);s.executeAddToCart(s.menus[0]);s.checkout()
 expect(s.materials[0].lots.find(l=>l.isInUse)?.id).toBe('B')
 expect(s.commitStockDrafts().ok).toBe(true);expect(s.materials[0].lots.find(l=>l.isInUse)?.id).toBe('B')
})
