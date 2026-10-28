// @vitest-environment node
import {it,expect} from 'vitest'
import {factorRuleFields} from '../../scripts/rule-field-cache.mjs'
import {factorRequestUid} from '../../scripts/request-uid.mjs'
import {buildCorePolicy} from '../../scripts/core-policy.mjs'
it('restores every predicate in the complete readable policy after inlining cached fields',()=>{
 const source=buildCorePolicy({shopId:'proof-shop',compact:false}),optimized=factorRuleFields(source)
 const bindings=new Map()
 let restored=optimized.replace(/let (cachedField\d+)=([^;]+);/g,(_all,name,value)=>{if(bindings.has(name))expect(bindings.get(name)).toBe(value);bindings.set(name,value);return ''})
 for(const [name,value] of bindings)restored=restored.replace(new RegExp('\\b'+name+'\\b','g'),value)
 expect(bindings.size).toBeGreaterThan(0)
 expect(restored.replace(/\s+/g,' ')).toBe(source.replace(/\s+/g,' '))
})
it('preserves literals and comments and leaves ten-local functions unchanged',()=>{
 const body="return request.auth.uid==request.auth.uid && request.auth.uid!='request.auth.uid'; /* request.auth.uid */"
 const source='function sample() { '+body+' }',result=factorRuleFields(source)
 expect(result).toContain("!='request.auth.uid'");expect(result).toContain('/* request.auth.uid */')
 const full='function full() { '+Array.from({length:10},(_,i)=>'let a'+i+'='+i+';').join('')+body+' }'
 expect(factorRuleFields(full)).toBe(full)
})
it('shares the request UID field without changing its value or other code',()=>{
 const source=buildCorePolicy({shopId:'proof-shop',compact:false}),shared=factorRequestUid(source)
 const restored=shared.replace('\nfunction requestUid() { return request.auth.uid; }','').replaceAll('requestUid()','request.auth.uid')
 expect(restored).toBe(source)
})
