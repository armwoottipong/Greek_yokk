import {createReportReader} from './reportReader.js'
import {createBackupReader} from './backupReader.js'
import {doc,collection,getDocFromServer,getDocsFromServer,query,orderBy,limit} from 'firebase/firestore'
import {getFirebaseClient} from '../firebaseClient.js'
import {createCommandJournal} from '../journal.js'
import {createCoreTransport} from './transport.js'
import {createCoreCommands} from './commands.js'
import {summaryMultiGroupSale} from './model/saleGroups.js'
import {planInventoryCommand} from './inventoryPlan.js'
export function createCoreWorkspace({connection,getContext}){
 const {db}=getFirebaseClient({mode:connection.mode,config:connection.config})
 const journal=createCommandJournal(),transport=createCoreTransport({db,getContext}),commands=createCoreCommands({journal,transport,getContext})
 const reports=createReportReader({db,getContext})
 const backups=createBackupReader({db,getContext})
 let current
 const base=()=>{const c=getContext();return `shops/${c.shopId}/generations/${c.generation}`}
 async function load(){
  const identity={...getContext()}
  for(let attempt=0;attempt<3;attempt++){
   const snapshot=await transport.snapshot(),path=`shops/${identity.shopId}/generations/${identity.generation}`
   const display=await getDocFromServer(doc(db,`${path}/display/catalog`))
   const root=await getDocFromServer(doc(db,`shops/${identity.shopId}`)),c=getContext()
   if(['uid','generation','shopId','projectId'].some(k=>identity[k]!==c[k])||!c.ready||!c.online)throw new Error('NOT_READY')
   if(!root.exists()||root.data().status!=='active'||root.data().generation!==identity.generation)throw new Error('SHOP_NOT_READY')
   if(root.data().revision!==snapshot.shop.revision)continue
   const ids=snapshot.materials.map(m=>m.id)
   if(!display.exists()||snapshot.shop.materialIds.length!==ids.length||snapshot.shop.materialIds.some(id=>!ids.includes(id))||snapshot.materials.some(m=>m.stock!==m.lotIds.reduce((n,id)=>n+m.lotQty[id],0)))throw new Error('INCOMPLETE_INVENTORY')
   current={...snapshot,display:display.data(),orders:current?.orders||[]};return current
  }
  throw new Error('SHOP_BUSY')
 }

 function previewSale(payload){if(!current)throw new Error('NOT_READY');return summaryMultiGroupSale(current.shop,current.materials,payload.lines,{platformId:payload.platformId,packages:payload.packages}).order}
 function previewCommand(command,snapshot=current){if(!snapshot)throw new Error('NOT_READY');return planInventoryCommand(snapshot.shop,snapshot.materials,command)}
 function previewInventory(kind,payload){return previewCommand({kind,payload})}
 async function orders(){const rows=await getDocsFromServer(query(collection(db,`${base()}/orders`),orderBy('createdAt','desc'),limit(100))),orders=rows.docs.map(d=>d.data());if(current)current={...current,orders};return orders}
 async function history(){const path=base(),rows=await Promise.all(Array.from({length:current?.display.legacyOrderCount||0},(_,i)=>getDocFromServer(doc(db,`${path}/legacyRecords/orders_${i}`))));return rows.map(d=>JSON.parse(d.data().json))}
 async function legacyReceipt(orderId){
  const identity={...getContext()}
  if(!identity.ready||!identity.online||typeof orderId!=='string'||!orderId)throw new Error('NOT_READY')
  const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(orderId)))].map(n=>n.toString(16).padStart(2,'0')).join('')
  const row=await getDocFromServer(doc(db,`shops/${identity.shopId}/generations/${identity.generation}/orders/LEGACY-${hash}`)),now=getContext()
  if(!now.ready||!now.online||['uid','generation','shopId','projectId'].some(k=>now[k]!==identity[k]))throw new Error('CONTEXT_CHANGED')
  const receipt=row.exists()?row.data():null
  if(!receipt||receipt.origin!=='legacy'||receipt.sourceLegacyId!==orderId)throw new Error('LEGACY_MIGRATION_REQUIRED')
  return receipt
 }
 return {...commands,load,orders,previewSale,previewInventory,previewCommand,history,legacyReceipt,backup:()=>backups.read(),report:range=>{if(!current)throw new Error('NOT_READY');return reports.read(range,{legacyOrderCount:current.display.legacyOrderCount??0})},close:()=>{reports.close();backups.close();return journal.close()}}
}
