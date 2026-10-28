import {doc,collection,getDocFromServer,getDocsFromServer,query,orderBy,documentId,startAfter,limit} from 'firebase/firestore'
import {encodeBackupValue,createBusinessBackup,MAX_BACKUP_BYTES,verifyBusinessBackup} from './businessBackup.js'
import {businessDateKey} from '../../domain/businessDate.js'
const sdkDefault={doc,collection,getDocFromServer,getDocsFromServer,query,orderBy,documentId,startAfter,limit}
const fail=code=>Object.assign(new Error(code),{code})
const identity=['projectId','shopId','generation','uid'],collections=['materials','display','orders','operations','legacyRecords'],MAX_DOCS=10000,PAGE=250
export function createBackupReader({db,getContext},sdk=sdkDefault){
 let closed=false,inFlight=false
 function guard(s){const c=getContext();if(closed||!c?.online||!c.ready)throw fail('NOT_READY');if(identity.some(k=>!s[k]||s[k]!==c[k]))throw fail('CONTEXT_CHANGED')}
 async function readRoot(s){const row=await sdk.getDocFromServer(sdk.doc(db,`shops/${s.shopId}`));guard(s);const root=row.exists()?row.data():null;if(root?.status!=='active'||root.generation!==s.generation||!Number.isSafeInteger(root.revision))throw fail('SHOP_NOT_READY');return root}
 return {
  async read(){
   const s={...getContext()};guard(s);if(inFlight)throw fail('BACKUP_IN_PROGRESS');inFlight=true
   try{for(let attempt=0;attempt<2;attempt++){
    const before=await readRoot(s),data={},raw={},counts={};let total=1,bytes=0
    function encoded(value){const result=encodeBackupValue(value);bytes+=new TextEncoder().encode(JSON.stringify(result)).length;if(bytes>MAX_BACKUP_BYTES)throw fail('BACKUP_TOO_LARGE');return result}
    const root=encoded(before)
    for(const name of collections){
     const source=sdk.collection(db,`shops/${s.shopId}/generations/${s.generation}/${name}`),rows=[];raw[name]=[];let cursor
     for(;;){
      const clauses=[sdk.orderBy(sdk.documentId(),'asc'),sdk.limit(PAGE)];if(cursor)clauses.push(sdk.startAfter(cursor))
      const page=await sdk.getDocsFromServer(sdk.query(source,...clauses));guard(s)
      for(const row of page.docs){
       if(++total>MAX_DOCS)throw fail('BACKUP_TOO_LARGE')
       let value=row.data();raw[name].push({id:row.id,data:value})
       if(name==='materials'){value={...value};delete value.billPreparations;delete value.billPreparationId}
       rows.push({id:row.id,data:encoded(value)})
      }
      if(page.docs.length<PAGE)break
      cursor=page.docs.at(-1)
     }
     data[name]=rows;counts[name]=rows.length
    }
    const after=await readRoot(s);if(before.revision!==after.revision)continue
    const ids=before.materialIds,materials=raw.materials,catalog=raw.display.find(r=>r.id==='catalog')?.data
    if(!Array.isArray(ids)||new Set(ids).size!==ids.length||ids.length!==materials.length||ids.some(id=>!materials.some(m=>m.id===id&&m.data.id===id))||materials.some(({data:m})=>!Array.isArray(m.lotIds)||m.stock!==m.lotIds.reduce((n,id)=>n+m.lotQty?.[id],0))||!catalog)throw fail('BACKUP_INCOMPLETE')
    const count=catalog.legacyOrderCount??0,archiveIds=new Set(raw.legacyRecords.map(r=>r.id)),groups=new Map()
    if(!Number.isSafeInteger(count)||count<0||count>MAX_DOCS||Array.from({length:count},(_,i)=>`orders_${i}`).some(id=>!archiveIds.has(id)))throw fail('BACKUP_INCOMPLETE')
    if((raw.legacyRecords.length||catalog.sourceSha256)&&!archiveIds.has('header'))throw fail('BACKUP_INCOMPLETE')
    for(const row of raw.legacyRecords){
     const match=row.id.match(/^(materials|menus|addons|addonGroups|platforms|orders|activityLogs|stockShortages)_(0|[1-9]\d*)$/),kind=row.id==='header'?'header':match?.[1],index=row.id==='header'?0:Number(match?.[2])
     if(!kind||row.data.kind!==kind||row.data.index!==index)throw fail('BACKUP_INCOMPLETE')
     let value;try{value=JSON.parse(row.data.json)}catch{throw fail('BACKUP_INCOMPLETE')}
     if(!value||typeof value!=='object'||Array.isArray(value))throw fail('BACKUP_INCOMPLETE')
     if(kind!=='header'){if(!groups.has(kind))groups.set(kind,[]);groups.get(kind).push(index)}
    }
    for(const indices of groups.values())if(indices.sort((a,b)=>a-b).some((index,i)=>index!==i))throw fail('BACKUP_INCOMPLETE')
    const payload={exportedAt:new Date().toISOString(),projectId:s.projectId,shopId:s.shopId,generation:s.generation,revision:after.revision,scope:'business-snapshot',legacyValidation:{declaredOrders:count,contiguousCollections:Object.fromEntries([...groups].map(([kind,indices])=>[kind,indices.length])),limitation:'Original archive has no count manifest for non-order collections; missing trailing records before this export cannot be detected.'},exclusions:{subcollections:['preparations','preparedSales','recipeAdmissions','materialReferences','operations/*/referenceProofs'],materialFields:['billPreparations','billPreparationId'],localOnly:['authentication','carts','pendingCommands']},counts,root,collections:data}
    const backup=await createBusinessBackup(payload),text=JSON.stringify(backup);if(new TextEncoder().encode(text).length>MAX_BACKUP_BYTES)throw fail('BACKUP_TOO_LARGE');await verifyBusinessBackup(text);guard(s)
    return {text,filename:`greek-yogg-firebase-${s.shopId}-r${after.revision}-${businessDateKey(new Date(payload.exportedAt))}.json`,counts,revision:after.revision}
   }throw fail('BACKUP_BUSY')}finally{inFlight=false}
  },
  close(){closed=true}
 }
}
