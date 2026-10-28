// @vitest-environment node
import {it,expect} from 'vitest'
import {factorRuleDispatch} from '../../scripts/rule-dispatch.mjs'
it('retains every predicate and alternative order while sharing the discriminant',()=>{
 const source=`allow read: if auth(); allow update: if request.resource.data.lastOpKind=='a' && checkA(); allow update: if request.resource.data.lastOpKind=='b' && checkB(); allow update: if request.resource.data.lastOpKind=='c' && checkC();`
 const compact=factorRuleDispatch(source,1)
 expect(compact).toContain("let releaseKind=request.resource.data.get('lastOpKind','')")
 expect(compact).toContain("(releaseKind=='a' && checkA()) || (releaseKind=='b' && checkB()) || (releaseKind=='c' && checkC())")
 expect(compact).toContain('allow read: if auth();');expect(compact.match(/allow update:/g)).toHaveLength(1)
})
it('does not change a scope with only one or two alternatives',()=>{const s='allow update: if request.resource.data.kind=="a" && valid();';expect(factorRuleDispatch(s,0)).toBe(s)})
it('keeps index-based proof alternatives in order under one common action gate',()=>{
 const source="allow create: if index=='a' && checkA(); allow create: if index=='b' && checkB();"
 expect(factorRuleDispatch(source,2)).toBe("allow create: if (index=='a' && checkA()) || (index=='b' && checkB()); ")
})
