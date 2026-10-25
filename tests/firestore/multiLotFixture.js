import {proofFixture} from './proofFixture.js'
import {recomputeFromDomain} from './proofDomainAdapter.js'
export function four(quantities=[1000,2000,3000,4000]) {
 const f=proofFixture(),m=f.materials[0]
 m.lots=quantities.map((qty,i)=>({...structuredClone(m.lots[0]),id:`YOGURT-${i}`,qty,isInUse:i===0,receiveDay:20000+i}))
 recomputeFromDomain(f)
 const row=f.order.inventory[0]
 row.four={ids:[...m.lots.map(l=>l.id),...Array(4-m.lots.length).fill('')],order:[0,1,2,3],takes:[...m.lots.map((l,i)=>l.qty-f.nextMaterials[0].lots[i].qty),...Array(4-m.lots.length).fill(0)]}
 f.order.inventoryBlockSize=1;f.order.witnessCount=f.materials.length
 return f
}
