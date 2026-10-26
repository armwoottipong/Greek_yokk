// @vitest-environment node
import {it,expect} from 'vitest'
import {reconcileCoreSources} from '../../scripts/core-reconcile.js'
it('reports new catalogue records and exact balance/history changes without exposing business values or a connection URL',()=>{
 const a={materials:[{id:'m',stock:1}],menus:[],orders:[{orderId:'old',subtotal:0.123}],gasApiUrl:'private-url'},b={...a,materials:[{id:'m',stock:1.01},{id:'new',stock:500}],menus:[{id:'new-menu'}],orders:[{orderId:'old',subtotal:0.124}]}
 const r=reconcileCoreSources(a,b)
 expect(r.materialBalancesChanged).toBe(1);expect(r.collections.materials.added).toBe(1);expect(r.collections.orders.changed).toBe(1);expect(r.historyPreserved).toBe(true)
 expect(JSON.stringify(r)).not.toContain('private-url');expect(JSON.stringify(r)).not.toContain('0.124')
})
it('rejects duplicate or missing IDs and reports missing historical bills',()=>{
 expect(()=>reconcileCoreSources({},{materials:[{id:'a'},{id:'a'}]})).toThrow('Ambiguous')
 expect(()=>reconcileCoreSources({},{orders:[{}]})).toThrow('Ambiguous')
 expect(reconcileCoreSources({orders:[{orderId:'old'}]},{}).historyPreserved).toBe(false)
})
