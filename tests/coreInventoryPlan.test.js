import {it,expect} from 'vitest'
import {summaryFixture} from './firestore/summaryFixture.js'
import {materialRegistryShop} from './firestore/summaryMaterialAuthor.js'
const base=()=>{const f=summaryFixture();f.shop=materialRegistryShop(f.shop,f.materials);return f}
it('plans immutable physical counts and rejects a stale inventory confirmation',async()=>{
 const module=await import('../src/cloud/core/inventoryPlan.js').catch(()=>({}));expect(module.planInventoryCommand).toBeTypeOf('function')
 const {shop,materials}=base(),before=structuredClone({shop,materials}),m=materials[0]
 const command={opId:'COUNT',kind:'stock_count',payload:{expectedRevision:shop.revision,requests:[{materialId:m.id,counts:[{id:m.lotIds[0],to:123}]}]}}
 const result=module.planInventoryCommand(shop,materials,command)
 expect(result.nextMaterials[0].stock).toBe(123);expect(result.operation.uid).toBe('preview');expect({shop,materials}).toEqual(before)
 expect(()=>module.planInventoryCommand({...shop,revision:shop.revision+1},materials,command)).toThrow('STALE_INVENTORY_DRAFT')
})
