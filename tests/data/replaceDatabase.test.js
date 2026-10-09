import { it, expect, vi } from 'vitest'
import {createTestStore,material} from '../helpers/createStore'
import {createPinia,setActivePinia} from 'pinia'
import {usePosStore} from '../../src/stores/posStore'
const raw=()=>({materials:[material()],menus:[],addons:[],orders:[],activityLogs:[{id:'L',action:'waste'}]})
it('persists and reloads the canonical database',()=> {
  const s=createTestStore();expect(s.replaceDatabase(raw(),{source:'import'}).ok).toBe(true)
  setActivePinia(createPinia());expect(usePosStore().materials[0].stock).toBe(100);expect(usePosStore().activityLogs[0].id).toBe('L')
})
it('invalid import never overwrites working data',()=> {
  const s=createTestStore({storage:{GY_MATERIALS:[material()]}})
  expect(s.replaceDatabase({materials:'bad',menus:{},addons:42},{source:'import'}).ok).toBe(false)
  expect(s.materials[0].stock).toBe(100)
})
it('clear and import reset stale drafts and carts',()=> {
  const s=createTestStore({storage:{GY_MATERIALS:[material()]}});s.initStockDraftSnapshot();s.cart=[{menu:{id:'old'},qty:1}]
  s.clearAllData();s.discardStockDrafts();expect(s.materials).toEqual([]);expect(s.cart).toEqual([])
  s.replaceDatabase(raw(),{source:'import'});s.discardStockDrafts();expect(s.materials[0].stock).toBe(100)
})
it('exports audit logs and normalized baseline lots',()=> {
  const s=createTestStore();s.replaceDatabase({...raw(),materials:[material('X',15000,{lots:undefined})]},{source:'import'})
  const backup=s.exportDatabase();expect(backup.activityLogs[0].id).toBe('L');expect(backup.materials[0].lots[0].qty).toBe(15000)
  s.stockIn('X',100,1,'',null,{expiryDate:'2099-01-01'},false);expect(s.materials[0].stock).toBe(15100)
})
it('generated material IDs are unique after a deletion',()=> {
  const s=createTestStore({storage:{GY_MATERIALS:[material('MAT001'),material('MAT002'),material('MAT003')]}})
  s.deleteMaterialPermanently('MAT002');s.saveMaterial({name:'new',stock:0,unitCost:0})
  expect(new Set(s.materials.map(m=>m.id)).size).toBe(3)
})
it('failed save restores committed database and reports failure',()=> {
  const s=createTestStore();s.replaceDatabase(raw(),{source:'import'})
  vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new Error('quota')})
  s.menus.push({id:'M',name:'M',prices:{PLAT01:10},recipe:[]})
  expect(s.persistLocal().ok).toBe(false);expect(s.menus).toEqual([]);expect(s.materials[0].stock).toBe(100)
})
it('explicit restore can recover corrupt canonical data while preserving its raw bytes',()=> {
 const s=createTestStore({storage:{GY_DATABASE_V3:'{broken canonical'}})
 expect(s.storageError).toBeTruthy()
 expect(s.replaceDatabase(raw(),{source:'import'}).ok).toBe(true)
 const keys=Object.keys(localStorage).filter(k=>k.startsWith('GY_CORRUPT_RECOVERY_V3'))
 expect(keys.length).toBe(1);expect(localStorage.getItem(keys[0])).toBe('{broken canonical')
 expect(s.materials[0].stock).toBe(100)
})
it('demo receipt and stocktake preserve initial milk baseline',()=> {
 const s=createTestStore();expect(s.resetDemoData().ok).toBe(true)
 const before=s.materials.find(m=>m.id==='MAT002').stock
 s.stockIn('MAT002',100,1,'',null,{expiryDate:'2099-01-01'},false)
 expect(s.materials.find(m=>m.id==='MAT002').stock).toBe(before+100)
 s.stockAdjust('MAT002',14000,'','',false);expect(s.materials.find(m=>m.id==='MAT002').stock).toBe(14000)
})
it('unrelated JSON cannot replace the database as an import',()=> {
 const s=createTestStore({storage:{GY_MATERIALS:[material()]}})
 expect(s.replaceDatabase({},{source:'import'}).ok).toBe(false)
 expect(s.materials[0].stock).toBe(100)
})
it('intentional replacement preserves the exact previous canonical snapshot',()=> {
 const s=createTestStore();s.replaceDatabase(raw(),{source:'import'});s.stockIn('X',1,1,'',null,{expiryDate:'2099-01-01'},false)
 const previous=localStorage.getItem('GY_DATABASE_V3')
 expect(s.replaceDatabase({materials:[],menus:[],addons:[]},{source:'import'}).ok).toBe(true)
 const keys=Object.keys(localStorage).filter(k=>k.startsWith('GY_REPLACEMENT_RECOVERY_V3'))
 expect(keys.some(k=>localStorage.getItem(k)===previous)).toBe(true)
})
