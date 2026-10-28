// @vitest-environment node
import {it,expect} from 'vitest'
import {Timestamp} from 'firebase/firestore'
import {createBusinessBackup,encodeBackupValue} from '../../src/cloud/core/businessBackup.js'
import {decodeRehearsalValue,planBackupRehearsal} from '../../scripts/backup-rehearsal.js'
const target={host:'127.0.0.1:8088',projectId:'demo-greek-yogg-restore',shopId:'restore-shop',generation:'g_restore_unit'}
async function file(change=()=>{}){
 const collections={materials:[{id:'M',data:encodeBackupValue({id:'M',stock:600,lotIds:['L'],lotQty:{L:600}})}],display:[{id:'catalog',data:encodeBackupValue({legacyOrderCount:0})}],orders:[],operations:[],legacyRecords:[]}
 const payload={scope:'business-snapshot',projectId:'original-project',shopId:'original-shop',generation:'original-generation',revision:4,root:encodeBackupValue({status:'active',generation:'original-generation',revision:4,materialIds:['M']}),counts:Object.fromEntries(Object.entries(collections).map(([k,v])=>[k,v.length])),collections};change(payload);return JSON.stringify(await createBusinessBackup(payload))
}
it('decodes exact values and rejects ambiguous, unsupported or lossy types',()=>{
 const original={stamp:new Timestamp(123,456789000),cost:0.2075,note:null,array:[true,6000,'x']}
 expect(decodeRehearsalValue(encodeBackupValue(original))).toEqual(original)
 for(const value of [{integerValue:'9007199254740993'},{integerValue:'1',stringValue:'1'},{doubleValue:Infinity},{timestampValue:{seconds:0,nanoseconds:1e9}},{referenceValue:'projects/live/documents/x/y'}])expect(()=>decodeRehearsalValue(value)).toThrow('INVALID_REHEARSAL_DATA')
})
it('keeps IDs and business values, remapping only paths and generation',async()=>{
 const text=await file(),p=await planBackupRehearsal(text,target)
 expect(p.projectId).toBe(target.projectId);expect(p.documents).toHaveLength(3)
 expect(p.documents[0]).toEqual({path:'shops/restore-shop',data:{status:'active',generation:'g_restore_unit',revision:4,materialIds:['M']}})
 expect(p.documents[1].path).toBe('shops/restore-shop/generations/g_restore_unit/materials/M')
 expect(p.documents[1].data.stock).toBe(600)
})
it('refuses all non-rehearsal targets before decoding',async()=>{
 for(const options of [{host:'firestore.googleapis.com:443'},{host:undefined},{projectId:'yoggie-db'},{shopId:'greek-yogg'},{generation:'original-generation'},{generation:'../escape'}])await expect(planBackupRehearsal('{}',{...target,...options})).rejects.toThrow('REHEARSAL_TARGET_REQUIRED')
})
it('rejects damaged checksums, mismatched counts/registry and path injection',async()=>{
 for(const change of [p=>p.counts.orders=1,p=>p.root=encodeBackupValue({status:'active',generation:p.generation,revision:4,materialIds:['MISSING']}),p=>p.collections.materials[0].id='../outside',p=>p.collections.orders.push({id:'X',data:encodeBackupValue({})})])await expect(planBackupRehearsal(await file(change),target)).rejects.toThrow('INVALID_REHEARSAL_DATA')
 const damaged=JSON.parse(await file());damaged.payload.revision=9;await expect(planBackupRehearsal(JSON.stringify(damaged),target)).rejects.toThrow('BACKUP_CHECKSUM_MISMATCH')
})
it.each([0,1])('rejects surplus order archives beyond the declared count %s',async declared=>{
 const text=await file(p=>{
  p.collections.display[0].data=encodeBackupValue({legacyOrderCount:declared})
  p.collections.legacyRecords=[{id:'header',data:encodeBackupValue({kind:'header',index:0,json:'{}'})},...Array.from({length:declared+1},(_,index)=>({id:`orders_${index}`,data:encodeBackupValue({kind:'orders',index,json:'{}'})}))]
  p.counts.legacyRecords=p.collections.legacyRecords.length
 })
 await expect(planBackupRehearsal(text,target)).rejects.toThrow('INVALID_REHEARSAL_DATA')
})
