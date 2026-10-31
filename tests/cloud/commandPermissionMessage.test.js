import {it,expect} from 'vitest'
import {commandErrorMessage} from '../../src/cloud/core/commandErrors.js'
it('explains that a denied write may be a data validation error as well as account access',()=>{
 const message=commandErrorMessage({causeCode:'permission-denied'})
 expect(message).toContain('สิทธิ์');expect(message).toContain('ข้อมูล');expect(message).toContain('ตรวจผล')
})
