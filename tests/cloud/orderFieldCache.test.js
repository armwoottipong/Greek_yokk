// @vitest-environment node
import {it,expect} from 'vitest'
import {cacheOrderFields,orderFieldCache} from '../../scripts/order-field-cache.mjs'
import {buildCorePolicy} from '../../scripts/core-policy.mjs'
it('preserves every generated receipt predicate and ordering after inlining locals',()=>{
 const extract=source=>{const start=source.indexOf('function validOrder(');return source.slice(start,source.indexOf('\n    }',start)+6)}
 const body=extract(buildCorePolicy({shopId:'proof-shop',compact:false}))
 const original=extract(buildCorePolicy({shopId:'proof-shop',compact:false,cacheReceiptFields:false}))
 let restored=body
 for(const [name,expression] of orderFieldCache){
  const declaration=`let ${name}=${expression};`
  if(name==='orderAddonValues'){expect(body).not.toContain(declaration);continue}
  expect(body).toContain(declaration)
  restored=restored.replace(declaration,'').replaceAll(name,expression)
 }
 expect(restored.replace(/\s+/g,' ')).toBe(original.replace(/\s+/g,' '))
 expect((body.match(/\blet /g)||[]).length).toBeLessThanOrEqual(10)
})
it('reuses a repeated expression without changing the conjunction or alternative',()=>{
 const source='function validOrder(o) { return o.materialIds.size()>0 && (o.materialIds.size()<16 || o.lines.size()==1); }'
 const result=cacheOrderFields(source)
 expect(result).toContain('return orderMaterialCount>0 && (orderMaterialCount<16 || orderLineCount==1);')
})
