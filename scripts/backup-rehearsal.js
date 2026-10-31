// Offline rehearsal planner only. No Firebase connection, credentials or writes.
import {Timestamp} from 'firebase/firestore'
import {verifyBusinessBackup} from '../src/cloud/core/businessBackup.js'
import {validateImage} from '../src/domain/catalogImage.js'
const invalid=()=>Object.assign(new Error('INVALID_REHEARSAL_DATA'),{code:'INVALID_REHEARSAL_DATA'})
const map=v=>v&&Object.getPrototypeOf(v)===Object.prototype
const exact=(v,keys)=>map(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k))
const id=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,200}$/.test(v)
const names=['materials','display','orders','operations','legacyRecords']
export function decodeRehearsalValue(value,depth=0){
 if(depth>32||!map(value)||Object.keys(value).length!==1)throw invalid()
 if(exact(value,['nullValue'])&&value.nullValue===null)return null
 if(exact(value,['stringValue'])&&typeof value.stringValue==='string')return value.stringValue
 if(exact(value,['booleanValue'])&&typeof value.booleanValue==='boolean')return value.booleanValue
 if(exact(value,['integerValue'])&&typeof value.integerValue==='string'){
  const n=Number(value.integerValue);if(Number.isSafeInteger(n)&&String(n)===value.integerValue)return n
 }
 if(exact(value,['doubleValue'])&&typeof value.doubleValue==='number'&&Number.isFinite(value.doubleValue)&&(!Number.isInteger(value.doubleValue)||Number.isSafeInteger(value.doubleValue)))return value.doubleValue
 if(exact(value,['timestampValue'])&&exact(value.timestampValue,['seconds','nanoseconds'])){
  const t=value.timestampValue
  if(Number.isSafeInteger(t.seconds)&&Number.isInteger(t.nanoseconds))try{return new Timestamp(t.seconds,t.nanoseconds)}catch{throw invalid()}
 }
 if(exact(value,['arrayValue'])&&exact(value.arrayValue,['values'])&&Array.isArray(value.arrayValue.values))return value.arrayValue.values.map(v=>decodeRehearsalValue(v,depth+1))
 if(exact(value,['mapValue'])&&exact(value.mapValue,['fields'])&&map(value.mapValue.fields))return Object.fromEntries(Object.entries(value.mapValue.fields).map(([k,v])=>[k,decodeRehearsalValue(v,depth+1)]))
 throw invalid()
}
export async function planBackupRehearsal(text,target={}){
 if(target.host!=='127.0.0.1:8088'||target.projectId!=='demo-greek-yogg-restore'||target.shopId!=='restore-shop'||!/^g_restore_[A-Za-z0-9_-]{1,100}$/.test(target.generation||''))throw Object.assign(new Error('REHEARSAL_TARGET_REQUIRED'),{code:'REHEARSAL_TARGET_REQUIRED'})
 await verifyBusinessBackup(text)
 const p=JSON.parse(text).payload
 const collections=Object.hasOwn(p.collections||{},'catalogImages')?[...names,'catalogImages']:names
 if(p.scope!=='business-snapshot'||!id(p.projectId)||!id(p.shopId)||!id(p.generation)||target.generation===p.generation||!Number.isSafeInteger(p.revision)||p.revision<0||!exact(p.collections,collections)||!exact(p.counts,collections))throw invalid()
 const root=decodeRehearsalValue(p.root),rows={};let count=1
 if(!map(root)||root.status!=='active'||root.generation!==p.generation||root.revision!==p.revision)throw invalid()
 for(const name of collections){
  const source=p.collections[name]
  if(!Array.isArray(source)||source.length!==p.counts[name]||(count+=source.length)>10000||new Set(source.map(r=>r?.id)).size!==source.length)throw invalid()
  rows[name]=source.map(row=>{if(!exact(row,['id','data'])||!id(row.id))throw invalid();const data=decodeRehearsalValue(row.data);if(!map(data))throw invalid();return {id:row.id,data}})
 }
 const registry=root.materialIds,materials=rows.materials,catalog=rows.display.find(r=>r.id==='catalog')?.data
 for(const row of rows.catalogImages||[]){const image=row.data;try{validateImage(image.dataURL)}catch{throw invalid()}if(!['menus','materials'].includes(image.kind)||!id(image.entityId)||row.id!==`${image.kind}_${image.entityId}`||!Number.isSafeInteger(image.revision)||image.revision<1)throw invalid()}
 if(!Array.isArray(registry)||new Set(registry).size!==registry.length||registry.length!==materials.length||registry.some(key=>!materials.some(m=>m.id===key&&m.data.id===key))||!catalog)throw invalid()
 for(const {data:m} of materials)if(!Array.isArray(m.lotIds)||new Set(m.lotIds).size!==m.lotIds.length||!map(m.lotQty)||!Number.isSafeInteger(m.stock)||m.stock<0||m.lotIds.some(key=>!Number.isSafeInteger(m.lotQty[key])||m.lotQty[key]<0)||m.stock!==m.lotIds.reduce((n,key)=>n+m.lotQty[key],0)||Object.hasOwn(m,'billPreparations')||Object.hasOwn(m,'billPreparationId'))throw invalid()
 const declared=catalog.legacyOrderCount??0,archives=new Map(rows.legacyRecords.map(r=>[r.id,r.data])),groups=new Map()
 if(!Number.isSafeInteger(declared)||declared<0||declared>10000||(archives.size||catalog.sourceSha256)&&!archives.has('header'))throw invalid()
 for(let i=0;i<declared;i++)if(!archives.has(`orders_${i}`))throw invalid()
 for(const [key,data] of archives){
  const match=key.match(/^(materials|menus|addons|addonGroups|platforms|orders|activityLogs|stockShortages)_(0|[1-9]\d*)$/),kind=key==='header'?'header':match?.[1],index=key==='header'?0:Number(match?.[2])
  if(!kind||data.kind!==kind||data.index!==index)throw invalid()
  let parsed;try{parsed=JSON.parse(data.json)}catch{throw invalid()}
  if(!map(parsed))throw invalid()
  if(kind!=='header'){if(!groups.has(kind))groups.set(kind,[]);groups.get(kind).push(index)}
 }
 for(const indices of groups.values())if(indices.sort((a,b)=>a-b).some((n,i)=>n!==i))throw invalid()
 if((groups.get('orders')?.length??0)!==declared)throw invalid()
 const base=`shops/${target.shopId}`,documents=[{path:base,data:{...root,generation:target.generation}}]
 for(const name of collections)for(const row of rows[name])documents.push({path:`${base}/generations/${target.generation}/${name}/${row.id}`,data:row.data})
 return {projectId:target.projectId,shopId:target.shopId,generation:target.generation,sourceRevision:p.revision,counts:{...p.counts},documents}
}
