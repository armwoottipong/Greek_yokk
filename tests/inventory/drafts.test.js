import {it,expect,vi} from 'vitest'
import {createTestStore,material} from '../helpers/createStore'
const setup=()=>createTestStore({storage:{GY_MATERIALS:[material('RAW'),material('OUT',0)]}})
it('discarded production returns raw and output to committed lots',()=> {
 const s=setup();s.batchProduce('OUT',20,[{materialId:'RAW',qty:30}],'',{},true);s.discardStockDrafts()
 expect(s.materials.map(m=>m.stock)).toEqual([100,0]);expect(s.materials[0].lots[0].qty).toBe(100)
})
it('saving a menu does not commit a pending receipt',()=> {
 const s=setup();s.stockIn('RAW',30,1,'',null,{expiryDate:'2099-01-01'},true)
 s.saveMenu({name:'menu',prices:{PLAT01:10},recipe:[]});s.discardStockDrafts()
 expect(s.materials[0].stock).toBe(100);expect(JSON.parse(localStorage.getItem('GY_DATABASE_V3')).materials[0].stock).toBe(100)
})
it('failed draft commit keeps working edits available for retry',()=> {
 const s=setup();s.stockIn('RAW',30,1,'',null,{expiryDate:'2099-01-01'},true)
 vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new Error('quota')})
 expect(s.commitStockDrafts().ok).toBe(false);expect(s.materials[0].stock).toBe(130);expect(s.stockDraftSnapshot[0].stock).toBe(100)
})
it('lot-only switches count as pending changes',()=> {
 const s=setup();s.materials[0].lots.push({id:'L2',qty:10,isInUse:false});s.materials[0].stock=110;s.initStockDraftSnapshot();s.switchActiveLot('RAW','L2',true)
 expect(s.hasStockDrafts).toBe(true)
})
