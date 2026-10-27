// @vitest-environment node
import {it,expect} from 'vitest'
import {buildCorePolicy} from '../../scripts/core-policy.mjs'
import {readFileSync} from 'node:fs'
it('builds a shop-scoped policy containing only the first operational commands',()=>{
 const text=buildCorePolicy({shopId:'greek-yogg',compact:false})
 expect(text).toContain('match /shops/greek-yogg {')
 expect(text).toContain('match /shops/greek-yogg/generations/{g}/operations/{id}/referenceProofs/{index} {')
 expect(text).not.toContain('match /generations/{g}')
 expect(text).toContain('function validRoot(')
 expect(text).toContain('function preparationCreate(')
 expect(text).toContain('function catalogRoot(')
 expect(text).toContain('function catalogDisplayWrite(')
 expect(text).not.toContain('function materialEnrolRoot(')
 expect(text).toContain('legacyRecords')
 expect(()=>buildCorePolicy({shopId:'../wrong'})).toThrow()
 expect(readFileSync(new URL('../../firestore.rules',import.meta.url),'utf8').replaceAll('\r\n','\n')).toBe(buildCorePolicy({shopId:'greek-yogg'}).replaceAll('\r\n','\n'))
})

it('keeps the last legacy retirement checks in the generated reference proof',()=>{
 const text=buildCorePolicy({shopId:'greek-yogg',compact:false})
 const body=text.split('function catalogReferenceProof(')[1].split('function ')[0]
 for(const index of [60,61,62,63])expect(body).toContain(`addonMenuReference(root.catalog,old.catalog,o.entityId,${index})`)
 expect(text).toContain('addonRetirementGroup(c,o.entityId,i*4+3)')
 expect(text).toContain('function catalogRootChecksPresent(')
 expect(text).toContain('function recipeAdmissionCommitProof(')
 for(const name of ['menuOperation','addonOperation','groupOperation','catalogOperation']){
  const operation=text.split(`function ${name}(`)[1].split('function ')[0]
  expect(operation).toContain('getAfter(catalogInputPath(s,g,id)).data.opId==id')
 }
})
