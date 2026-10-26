// @vitest-environment node
import {it,expect} from 'vitest'
import {buildCorePolicy} from '../../scripts/core-policy.mjs'
import {readFileSync} from 'node:fs'
it('builds a shop-scoped policy containing only the first operational commands',()=>{
 const text=buildCorePolicy({shopId:'greek-yogg'})
 expect(text).toContain('match /shops/greek-yogg {')
 expect(text).toContain('function validRoot(')
 expect(text).toContain('function preparationCreate(')
 expect(text).not.toContain('function catalogRoot(')
 expect(text).not.toContain('function materialEnrolRoot(')
 expect(text).toContain('legacyRecords')
 expect(()=>buildCorePolicy({shopId:'../wrong'})).toThrow()
 expect(readFileSync(new URL('../../firestore.rules',import.meta.url),'utf8').replaceAll('\r\n','\n')).toBe(text.replaceAll('\r\n','\n'))
})
