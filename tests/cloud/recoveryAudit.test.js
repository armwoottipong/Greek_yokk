// @vitest-environment node
import {it,expect} from 'vitest'
import {Timestamp} from 'firebase/firestore'
import {compileOwnerDemo} from '../../scripts/owner-imports.mjs'
import {decodeRehearsalValue} from '../../scripts/backup-rehearsal.js'
import {auditRecoveryProtocol} from '../../scripts/recovery-audit.js'
async function fixture(){const p=JSON.parse(await compileOwnerDemo()).payload;return {root:decodeRehearsalValue(p.root),rows:Object.fromEntries(Object.entries(p.collections).map(([k,v])=>[k,v.map(r=>({id:r.id,data:decodeRehearsalValue(r.data)}))]))}}
it('admits existing compiled addon defaults and an empty operational reset schema',async()=>{
 const {root,rows}=await fixture();expect(auditRecoveryProtocol(root,rows)).toBe(true)
 expect(Object.values(root.catalog.addons).some(a=>a.active===undefined)).toBe(true)
})
it.each(['duplicateLots','rowIdentity','receiptIdentity','paddingTake','money','missingCatalog'])('rejects trusted-import inconsistency: %s',async kind=>{
 const {root,rows}=await fixture(),m=rows.materials.find(r=>r.data.lotIds.length)?.data
 expect(m).toBeTruthy()
 const row={materialId:m.id,needed:100,take:100,shortage:0,lotIds:[m.lotIds[0]],lotTakes:[100,0,0,0]},receipt={opId:'ORDER',createdAt:new Timestamp(123,0),status:'committed',kind:'sale_set',materialIds:[m.id],inventory:[row],approvedShortages:{[m.id]:0},lines:[{menuId:'OLD',qty:1,totalCents:0}],subtotalCents:0,gpCents:0,netCents:0,ingredientCostCents:0,packagingCostCents:0,grossProfitCents:0}
 rows.orders=[{id:'ORDER',data:receipt}];expect(auditRecoveryProtocol(root,rows)).toBe(true)
 if(kind==='duplicateLots'){row.lotIds=[m.lotIds[0],m.lotIds[0]];row.lotTakes=[50,50,0,0]}
 if(kind==='rowIdentity')receipt.materialIds=['OTHER']
 if(kind==='receiptIdentity')receipt.opId='OTHER'
 if(kind==='paddingTake')row.lotTakes=[50,50,0,0]
 if(kind==='money')receipt.grossProfitCents=1
 if(kind==='missingCatalog')root.catalog={}
 expect(()=>auditRecoveryProtocol(root,rows)).toThrow('RECOVERY_PROTOCOL_INVALID')
})
