import {beforeAll,beforeEach,afterAll,it,expect,vi} from 'vitest'
import {createRulesTest} from './helpers.js'
import {buildCorePolicy} from '../../scripts/core-policy.mjs'
import {summaryFixture} from './summaryFixture.js'
import {materialRegistryShop} from './summaryMaterialAuthor.js'
import {seedSetCatalog} from './setCatalogFixture.js'
import {createCoreTransport} from '../../src/cloud/core/transport.js'
import {createInventoryModel} from '../../src/cloud/core/inventoryModel.js'
let env
const storage=new Map()
beforeAll(async()=>{
 vi.stubGlobal('sessionStorage',{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)})
 env=await createRulesTest({rules:buildCorePolicy({shopId:'proof-shop'})})
})
beforeEach(async()=>{storage.clear();await env.clearFirestore()})
afterAll(async()=>{await env.cleanup();vi.unstubAllGlobals()})
function transport(uid){
 const context={projectId:'demo-greek-yogg',shopId:'proof-shop',generation:'g1',uid,deviceId:uid,online:true,ready:true}
 return createCoreTransport({db:env.authenticatedContext(uid).firestore(),getContext:()=>context})
}
async function seed(){
 const base=summaryFixture();base.materials[12].productionRecipe={yieldQ:120000,inputIds:['S0','S1'],quantities:[200000,10000]}
 base.shop=materialRegistryShop(base.shop,base.materials);await seedSetCatalog(env,base);return base
}
async function inventory(api,{loseFirstResult=false}={}){
 const load=async()=>({...await api.snapshot(),display:{menus:{},addons:{},platforms:{}}})
 const initial=await load();let first=true
 const execute=vi.fn(async c=>{
  const result=await api.commit(c)
  if(first&&loseFirstResult){first=false;return {ok:false,code:'PENDING_RESULT'}}
  return {ok:true,value:{opId:c.opId,kind:c.kind,result}}
 })
 const model=createInventoryModel({getData:()=>initial,loadServer:load,execute,isReady:()=>true,isBlocked:()=>false,storageKey:'workflow'})
 return {model,execute}
}
const dates={receiveDate:'2026-10-26',expiryDate:'2027-01-01'}

it('saves original editor, receiving, count, waste, lot switch and archive intents that another account reads',async()=>{
 await seed();const a=transport('device-a'),b=transport('device-b'),{model}=await inventory(a)
 try {
  expect(await model.saveMaterial({id:'NEW',name:'New',emoji:'',unit:'g',inventoryType:'ingredient',packSize:100,packCost:50,unitCost:.5,stock:100,minAlert:10,packUnit:'bag',hasSubRecipe:false,lastStockInDate:dates.receiveDate,expiryDate:dates.expiryDate})).toMatchObject({ok:true})
  expect((await b.snapshot()).materials.find(m=>m.id==='NEW').stock).toBe(10000)
  expect(model.stockIn('NEW',20,.5,'second lot',50,{receiveDate:'2026-10-27',expiryDate:'2027-01-02'})).toMatchObject({ok:true})
  expect((await model.commitStockDrafts()).ok).toBe(true)
  const lots=model.matMap.NEW.lots
  expect(model.stockAdjust('NEW',110,'physical count','')).toMatchObject({ok:true})
  expect(model.recordLotWaste({materialId:'NEW',lotId:lots[0].id,wasteQty:5,reason:'damaged'})).toMatchObject({ok:true})
  expect(model.switchActiveLot('NEW',lots[1].id)).toMatchObject({ok:true})
  expect((await model.commitStockDrafts()).ok).toBe(true)
  const remote=(await b.snapshot()).materials.find(m=>m.id==='NEW')
  expect(remote.stock).toBe(10500);expect(remote.activeLotId).toBe(lots[1].id)
  expect((await model.softDeleteMaterial('NEW')).ok).toBe(true)
  expect((await b.snapshot()).materials.find(m=>m.id==='NEW').deleted).toBe(true)
  expect((await model.restoreMaterial('NEW')).ok).toBe(true)
  expect((await b.snapshot()).materials.find(m=>m.id==='NEW').deleted).toBe(false)
 } finally {model.close()}
})

it('stages packaging and production in the original model and persists exact stock deductions',async()=>{
 const base=await seed(),a=transport('device-a'),b=transport('device-b'),{model}=await inventory(a)
 try {
  const packaging=base.materials.find(m=>m.inventoryType==='packaging'),output=base.materials[12]
  expect(model.stockIn(packaging.id,10,.5,'',.5,{}).ok).toBe(true)
  expect(model.batchProduce(output.id,100,[],'production',dates).ok).toBe(true)
  expect((await model.commitStockDrafts()).ok).toBe(true)
  const remote=await b.snapshot(),find=id=>remote.materials.find(m=>m.id===id)
  expect(find(packaging.id).stock).toBe(packaging.stock+1000)
  expect(find(output.id).stock).toBe(output.stock+10000)
  expect(find('S0').stock).toBe(base.materials[0].stock-16667)
  expect(find('S1').stock).toBe(base.materials[1].stock-833)
 } finally {model.close()}
})

it('recovers an acknowledged-on-server receipt without applying the original receiving draft twice',async()=>{
 const base=await seed(),api=transport('device-a'),{model,execute}=await inventory(api,{loseFirstResult:true})
 try {
  const m=base.materials[0]
  expect(model.stockIn(m.id,1,.5,'',.5,dates).ok).toBe(true)
  expect((await model.commitStockDrafts()).ok).toBe(false)
  expect(model.discardStockDrafts().ok).toBe(false)
  expect((await model.commitStockDrafts()).ok).toBe(true)
  expect(execute.mock.calls[0][0]).toEqual(execute.mock.calls[1][0])
  expect((await api.snapshot()).materials.find(row=>row.id===m.id).stock).toBe(m.stock+100)
 } finally {model.close()}
})

it('refuses a stale original physical count after a different account updates the shop',async()=>{
 const base=await seed(),a=transport('device-a'),b=transport('device-b'),{model,execute}=await inventory(a)
 try {
  const m=base.materials[0]
  expect(model.stockAdjust(m.id,m.stock/100-1,'physical count','').ok).toBe(true)
  await b.commit({opId:'OTHER-DEVICE',kind:'inventory',payload:{materialId:m.id,input:{qtyQ:200,unitCost:.5,receiveDay:21000,expiryDay:22000,newLotId:'OTHER-LOT'}}})
  expect((await model.commitStockDrafts()).ok).toBe(false);expect(execute).not.toHaveBeenCalled()
  expect((await a.snapshot()).materials.find(row=>row.id===m.id).stock).toBe(m.stock+200)
  expect(model.discardStockDrafts().ok).toBe(true)
 } finally {model.close()}
})
