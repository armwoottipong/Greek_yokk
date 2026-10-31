// @vitest-environment node
import {it,expect} from 'vitest'
import {factorRootData} from '../../scripts/rule-root-data.mjs'
import {buildCorePolicy} from '../../scripts/core-policy.mjs'
import {specializeShopRules} from '../../scripts/specialize-shop-rules.mjs'
it('shares only identical current-root lookup expressions and preserves every original predicate',()=>{
 const source=specializeShopRules(buildCorePolicy({compact:false}),'greek-yogg')
 const result=factorRootData(source,'greek-yogg')
 expect(result).not.toBe(source)
 const original=result.replace(/\nfunction (currentRootData|fixedRootData)\(\) \{ return ([^;]+); \}/g,'')
  .replaceAll('currentRootData()','get(rootPath()).data')
  .replaceAll('fixedRootData()','get(/databases/$(database)/documents/shops/greek-yogg).data')
 expect(original).toBe(source)
})
it('does not rewrite comments or quoted text',()=>{
 const expression='get(rootPath()).data'
 const source=`match /databases/{database}/documents {\n// ${expression}\nfunction example() {return '${expression}';}\n}`
 expect(factorRootData(source,'greek-yogg')).toBe(source)
})
