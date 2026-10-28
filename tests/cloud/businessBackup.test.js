// @vitest-environment node
import {it,expect} from 'vitest'
import {Timestamp} from 'firebase/firestore'
import {encodeBackupValue,createBusinessBackup,verifyBusinessBackup} from '../../src/cloud/core/businessBackup.js'
it('preserves timestamps, nulls, numeric scales, arrays and maps without ambiguous tags',()=>{
 const value=encodeBackupValue({createdAt:new Timestamp(123,456789123),price:0.2075,qty:600000,note:null,items:[true,'x'],tag:{timestampValue:'plain user text'}})
 expect(value.mapValue.fields.createdAt).toEqual({timestampValue:{seconds:123,nanoseconds:456789123}})
 expect(value.mapValue.fields.price).toEqual({doubleValue:0.2075});expect(value.mapValue.fields.qty).toEqual({integerValue:'600000'})
 expect(value.mapValue.fields.tag.mapValue.fields.timestampValue).toEqual({stringValue:'plain user text'})
})
it('rejects unsupported and nonfinite data instead of producing a lossy backup',()=>{
 for(const value of [undefined,NaN,Infinity,new Date(),new Uint8Array([1])])expect(()=>encodeBackupValue(value)).toThrow('BACKUP_INVALID_DATA')
})
it('checks SHA-256 integrity and rejects damaged or unknown files',async()=>{
 const backup=await createBusinessBackup({revision:4,collections:{orders:[]}})
 expect(await verifyBusinessBackup(JSON.stringify(backup))).toBe(true)
 backup.payload.revision=5;await expect(verifyBusinessBackup(JSON.stringify(backup))).rejects.toThrow('BACKUP_CHECKSUM_MISMATCH')
 await expect(verifyBusinessBackup('{}')).rejects.toThrow('BACKUP_INVALID_FILE')
})
it('rejects payloads above the byte limit',async()=>{await expect(createBusinessBackup({text:'x'.repeat(20*1024*1024)})).rejects.toThrow('BACKUP_TOO_LARGE')})
