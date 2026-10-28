// @vitest-environment node
import {it,expect} from 'vitest'
import {maxSaleLines} from '../../src/cloud/core/model/limits.js'
import {buildCorePolicy} from '../../scripts/core-policy.mjs'
it.each(Array.from({length:17},(_,i)=>i))('accepts %i physical guard rows with bounded line count',count=>{
 expect(maxSaleLines({catalog:{summaryMaterials:Array(count).fill('M')}})).toBe(Math.min(6,2*(18-count)))
})
it.each([-1,17,undefined])('rejects invalid profile %s',count=>{expect(()=>maxSaleLines({catalog:{summaryMaterials:{length:count}}})).toThrow('UNSUPPORTED_MATERIAL_PROFILE')})
it('emits optional material touches and guarded small-shop operand/cost checks',()=>{
 const policy=buildCorePolicy({shopId:'proof-shop',compact:false})
 expect(policy).toContain('function smallOrder(');expect(policy).toContain('function smallOperands(');expect(policy).toContain('function smallOperandWrite(')
 expect(policy).toMatch(/integer\(o.inventory.size\(\),0,16\)/)
 expect(policy).toMatch(/integer\(ids.size\(\),0,16\)/)
})
