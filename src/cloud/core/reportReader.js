import {doc,collection,getDocFromServer,getDocsFromServer,query,orderBy,documentId,where,startAfter,limit,Timestamp} from 'firebase/firestore'
import {reportRangeBounds} from './reportProjection.js'
import {backdatedPrefix,backdatedSaleDay,businessDay,LAST_BACKDATED_DAY} from './orderEntry.js'
const sdkDefault={doc,collection,getDocFromServer,getDocsFromServer,query,orderBy,documentId,where,startAfter,limit,Timestamp}
const fail=code=>Object.assign(new Error(code),{code})
const PAGE=250,MAX=10000
export function createReportReader({db,getContext},sdk=sdkDefault){
 let closed=false,legacyCache,last
 const identity=['projectId','shopId','generation','uid']
 function guard(s){const c=getContext();if(closed||!c?.ready||!c.online)throw fail('NOT_READY');if(identity.some(k=>!s[k]||s[k]!==c[k]))throw fail('CONTEXT_CHANGED')}
 async function root(s){
  const row=await sdk.getDocFromServer(sdk.doc(db,`shops/${s.shopId}`));guard(s)
  const data=row.exists()?row.data():null
  if(data?.status!=='active'||data.generation!==s.generation||!Number.isSafeInteger(data.revision))throw fail('SHOP_NOT_READY')
  return data
 }
 async function history(s,count){
  const key=JSON.stringify(identity.map(k=>s[k]).concat(count))
  if(legacyCache?.key===key)return legacyCache.rows
  const rows=[]
  for(let start=0;start<count;start+=25){
   const batch=await Promise.all(Array.from({length:Math.min(25,count-start)},(_,i)=>sdk.getDocFromServer(sdk.doc(db,`shops/${s.shopId}/generations/${s.generation}/legacyRecords/orders_${start+i}`))))
   guard(s)
   for(const row of batch){
    if(!row.exists())throw fail('REPORT_INCOMPLETE_HISTORY')
    let value;try{value=JSON.parse(row.data().json)}catch{throw fail('REPORT_INVALID_DATA')}
    if(!value||typeof value!=='object'||Array.isArray(value))throw fail('REPORT_INVALID_DATA')
    rows.push(value)
   }
  }
  legacyCache={key,rows};return rows
 }
 async function readPages(s,source,filters,receipts,include){
  let cursor
  for(;;){
   const clauses=[...filters,sdk.limit(PAGE)]
   if(cursor)clauses.push(sdk.startAfter(cursor))
   const page=await sdk.getDocsFromServer(sdk.query(source,...clauses));guard(s)
   receipts.push(...page.docs.filter(include).map(d=>d.data()))
   if(receipts.length>MAX)throw fail('REPORT_TOO_LARGE')
   if(page.docs.length<PAGE)break
   cursor=page.docs.at(-1)
  }
 }
 async function native(s,bounds){
  const source=sdk.collection(db,`shops/${s.shopId}/generations/${s.generation}/orders`),receipts=[]
  const id=sdk.documentId(),timeOrder=[sdk.orderBy('createdAt','asc'),sdk.orderBy(id,'asc')]
  if(bounds.startMs===null){
   await readPages(s,source,timeOrder,receipts,()=>true)
   return receipts
  }
  await readPages(s,source,[...timeOrder,sdk.where('createdAt','>=',sdk.Timestamp.fromMillis(bounds.startMs)),sdk.where('createdAt','<',sdk.Timestamp.fromMillis(bounds.endMs))],receipts,d=>!backdatedSaleDay(d.id))
  // The operation ID indexes the chosen sale day while createdAt remains server time.
  const first=Math.max(0,businessDay(bounds.start)),last=Math.min(LAST_BACKDATED_DAY,businessDay(bounds.end))
  if(first<=last)await readPages(s,source,[sdk.orderBy(id,'asc'),sdk.where(id,'>=',backdatedPrefix(first)),sdk.where(id,'<=',backdatedPrefix(last)+'\uf8ff')],receipts,d=>!!backdatedSaleDay(d.id))
  return receipts
 }
 return {
  async read(range,{legacyOrderCount=0}={}){
   const s={...getContext()};guard(s)
   if(!Number.isSafeInteger(legacyOrderCount)||legacyOrderCount<0)throw fail('REPORT_INCOMPLETE_HISTORY')
   if(legacyOrderCount>MAX)throw fail('REPORT_HISTORY_TOO_LARGE')
   const bounds=reportRangeBounds(range),key=JSON.stringify([identity.map(k=>s[k]),bounds.start,bounds.end,legacyOrderCount])
   for(let attempt=0;attempt<3;attempt++){
    const before=await root(s)
    if(last?.key===key&&last.value.shopRevision===before.revision){guard(s);return last.value}
    const receipts=await native(s,bounds),legacyOrders=await history(s,legacyOrderCount),after=await root(s)
    if(before.revision!==after.revision)continue
    guard(s)
    const value={receipts,legacyOrders,shopRevision:after.revision,range:{start:bounds.start,end:bounds.end}}
    last={key,value};return value
   }
   throw fail('REPORT_BUSY')
  },
  close(){closed=true;legacyCache=null;last=null}
 }
}
