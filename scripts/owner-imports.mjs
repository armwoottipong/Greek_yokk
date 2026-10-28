// Trusted owner-workstation compiler. No network or credentials.
import {createHash} from 'node:crypto'
import {compileCoreImport} from './core-import.js'
import {planLegacyReceipts} from './legacy-receipts.js'
import {decodeRehearsalValue} from './backup-rehearsal.js'
import {createBusinessBackup,encodeBackupValue,verifyBusinessBackup} from '../src/cloud/core/businessBackup.js'
import {DEFAULT_MATERIALS,DEFAULT_MENUS,DEFAULT_ADDONS,DEFAULT_PLATFORMS,DEFAULT_CATEGORIES} from '../src/data/initialData.js'
const error=code=>Object.assign(new Error(code),{code})
export async function migrateLegacyReceipts(backup){
 await verifyBusinessBackup(backup)
 const p=JSON.parse(backup).payload,shop=decodeRehearsalValue(p.root),read=name=>p.collections[name].map(r=>({id:r.id,data:decodeRehearsalValue(r.data)}))
 const conversion=planLegacyReceipts({shop,materials:read('materials').map(r=>r.data),legacyRecords:read('legacyRecords'),existingOrders:read('orders')})
 if(conversion.blocked.length){const e=error('LEGACY_RECEIPTS_BLOCKED');e.diagnostics=conversion.blocked;throw e}
 const updated={...p,root:encodeBackupValue({...shop,...conversion.rootPatch}),collections:{...p.collections,orders:[...p.collections.orders,...conversion.orders.map(r=>({id:r.id,data:encodeBackupValue(r.data)}))]}}
 updated.counts={...p.counts,orders:updated.collections.orders.length};updated.legacyMigration={converted:conversion.orders.length,alreadyPresent:conversion.skipped.length,retainedArchive:true}
 return JSON.stringify(await createBusinessBackup(updated))
}
export async function compileOwnerLegacy(text,{demo=false}={}){
 let raw;try{raw=JSON.parse(text)}catch{throw error('LEGACY_INVALID_FILE')}
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw error('LEGACY_INVALID_FILE')
 const hash=createHash('sha256').update(text).digest('hex'),generation='g_trial_owner_'+hash.slice(0,16)
 const compiled=compileCoreImport(raw,{shopId:'source-shop',generation,sourceSha256:hash,trial:true})
 const root={...compiled.shop,generation,returnMaterials:compiled.shop.returnMaterials||{}}
 root.catalog.counterIds=[...root.catalog.menuIds.slice(0,4),...Array(Math.max(0,4-root.catalog.menuIds.length)).fill('_'),...root.catalog.addonIds.slice(0,11),...Array(Math.max(0,11-root.catalog.addonIds.length)).fill('_')]
 const collections=Object.fromEntries(['materials','display','orders','operations','legacyRecords'].map(k=>[k,[]]))
 for(const d of compiled.documents){const parts=d.path.split('/'),name=parts.at(-2),id=parts.at(-1);if(!collections[name])throw error('LEGACY_INVALID_DOCUMENT');let data=d.data;if(name==='display')data={...data,trial:demo,recoveryPurpose:demo?'demo':'legacy-import'};collections[name].push({id,data:encodeBackupValue(data)})}
 const file=JSON.stringify(await createBusinessBackup({scope:'business-snapshot',ownerRecoveryPurpose:demo?'demo':'legacy-import',projectId:'legacy-source',shopId:'source-shop',generation,revision:root.revision,exportedAt:new Date().toISOString(),root:encodeBackupValue(root),collections,counts:Object.fromEntries(Object.entries(collections).map(([k,v])=>[k,v.length]))}))
 return demo?file:migrateLegacyReceipts(file)
}
export async function compileOwnerDemo(){
 const raw={schemaVersion:4,revision:0,materials:structuredClone(DEFAULT_MATERIALS),menus:structuredClone(DEFAULT_MENUS),addons:structuredClone(DEFAULT_ADDONS),addonGroups:[],platforms:structuredClone(DEFAULT_PLATFORMS),categories:structuredClone(DEFAULT_CATEGORIES),orders:[],activityLogs:[],stockShortages:[],exportDate:new Date().toISOString()}
 return compileOwnerLegacy(JSON.stringify(raw),{demo:true})
}
