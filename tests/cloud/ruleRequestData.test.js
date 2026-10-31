// @vitest-environment node
import {it,expect} from 'vitest'
import {factorRequestData} from '../../scripts/request-data.mjs'
import {buildCorePolicy} from '../../scripts/core-policy.mjs'
it('restores all predicates and lookup paths exactly when shared request fields are inlined',()=>{
 const source=buildCorePolicy({shopId:'proof-shop',compact:false}),shared=factorRequestData(source)
 let restored=shared.replace('\nfunction requestData() { return request.resource.data; }\nfunction existingData() { return resource.data; }','')
 restored=restored.replaceAll('requestData()','request.resource.data').replaceAll('existingData()','resource.data')
 expect(restored).toBe(source)
})
it('does not substitute field names inside literals, comments or other member chains',()=>{
 const source="match /databases/{database}/documents { function sample() { return resource.data.id==request.resource.data.id && 'resource.data'=='request.resource.data'; } // resource.data\n }"
 const shared=factorRequestData(source)
 expect(shared).toContain("return existingData().id==requestData().id && 'resource.data'=='request.resource.data'")
 expect(shared).toContain('// resource.data')
})
