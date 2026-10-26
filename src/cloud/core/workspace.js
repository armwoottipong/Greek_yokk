import {doc,collection,getDocFromServer,getDocsFromServer,query,orderBy,limit} from 'firebase/firestore'
import {getFirebaseClient} from '../firebaseClient.js'
import {createCommandJournal} from '../journal.js'
import {createCoreTransport} from './transport.js'
import {createCoreCommands} from './commands.js'
import {summaryMultiGroupSale} from './model/saleGroups.js'
import {summaryStock} from './model/stock.js'
import {summaryPackageStock} from './model/packageStock.js'
import {summaryProduce} from './model/produce.js'
export function createCoreWorkspace({connection,getContext}){
 const {db}=getFirebaseClient({mode:connection.mode,config:connection.config})
 const journal=createCommandJournal(),transport=createCoreTransport({db,getContext}),commands=createCoreCommands({journal,transport,getContext})
 let current
 const base=()=>{const c=getContext();return `shops/${c.shopId}/generations/${c.generation}`}
 async function load(){
  const identity={...getContext()},snapshot=await transport.snapshot(),path=base()
  const display=await getDocFromServer(doc(db,`${path}/display/catalog`))
  const c=getContext()
  if(['uid','generation','shopId','projectId'].some(k=>identity[k]!==c[k])||!c.ready||!c.online)throw new Error('NOT_READY')
  const ids=snapshot.materials.map(m=>m.id)
  if(!display.exists()||snapshot.shop.materialIds.length!==ids.length||snapshot.shop.materialIds.some(id=>!ids.includes(id))||snapshot.materials.some(m=>m.stock!==m.lotIds.reduce((n,id)=>n+m.lotQty[id],0)))throw new Error('INCOMPLETE_INVENTORY')
  current={...snapshot,display:display.data(),orders:current?.orders||[]};return current
 }
 function previewSale(payload){if(!current)throw new Error('NOT_READY');return summaryMultiGroupSale(current.shop,current.materials,payload.lines,{platformId:payload.platformId}).order}
 function previewInventory(kind,payload){
  if(!current)throw new Error('NOT_READY')
  if(kind==='produce')return summaryProduce(current.shop,current.materials,payload.materialId,payload.input)
  const m=current.materials.find(m=>m.id===payload.materialId)
  if(!m||m.deleted)throw new Error('MATERIAL_NOT_FOUND')
  return (m.inventoryType==='packaging'?summaryPackageStock:summaryStock)(current.shop,m,payload.input)
 }
 async function orders(){const rows=await getDocsFromServer(query(collection(db,`${base()}/orders`),orderBy('createdAt','desc'),limit(100))),orders=rows.docs.map(d=>d.data());if(current)current={...current,orders};return orders}
 async function history(){const path=base(),rows=await Promise.all(Array.from({length:current?.display.legacyOrderCount||0},(_,i)=>getDocFromServer(doc(db,`${path}/legacyRecords/orders_${i}`))));return rows.map(d=>JSON.parse(d.data().json))}
 return {...commands,load,orders,previewSale,previewInventory,history,close:()=>journal.close()}
}
