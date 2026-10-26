// Core v1 planner. Rules independently validate every persisted result.
// Admission audit for full-set documents and serverTimestamp transforms.
// No SDK initialization, IO or quota guarantee.
// Storage formula: firebase.google.com/docs/firestore/storage-size
// Wire model: google/firestore/v1/{document,write,firestore}.proto.
import { serverTimestamp, Timestamp } from 'firebase/firestore'
const timestampClass=serverTimestamp().constructor
const utf8=value=>new TextEncoder().encode(value).length
const stringSize=value=>utf8(value)+1
const plain=value=>value&&Object.getPrototypeOf(value)===Object.prototype
const timestamp=value=>value instanceof timestampClass
const varint=value=>{let n=BigInt(value),bytes=1;if(n<0n)return 10;while(n>=128n){n>>=7n;bytes++}return bytes}
const field=(number,bytes)=>varint(number*8+2)+varint(bytes)+bytes
const scalar=number=>varint(number*8)
const fieldSegment=key=>/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)?key:'`'+key.replaceAll('\\','\\\\').replaceAll('`','\\`')+'`'
function valueSize(value,depth,state,inArray=false,path=[]){
  if(timestamp(value)||value instanceof Date||value instanceof Timestamp){
    if(value instanceof Date&&!Number.isFinite(value.getTime()))throw new Error('Invalid date')
    return {storage:8,wire:field(10,17)} // conservative timestamp bound including negative seconds
  }
  if(value===null)return {storage:1,wire:scalar(11)+1}
  if(typeof value==='boolean')return {storage:1,wire:scalar(1)+1}
  if(typeof value==='number'){
    if(!Number.isFinite(value)||Number.isInteger(value)&&!Number.isSafeInteger(value))throw new Error('Unsupported number')
    return {storage:8,wire:Number.isSafeInteger(value)&&!Object.is(value,-0)?scalar(2)+varint(value):scalar(3)+8}
  }
  if(typeof value==='string')return {storage:stringSize(value),wire:field(17,utf8(value))}
  if(Array.isArray(value)){
    if(inArray)throw new Error('Nested arrays unsupported')
    for(let i=0;i<value.length;i++)if(!Object.hasOwn(value,i))throw new Error('Sparse arrays unsupported')
    state.depth=Math.max(state.depth,depth)
    const values=value.map(v=>valueSize(v,depth+1,state,true,path))
    return {storage:values.reduce((n,v)=>n+v.storage,0),wire:field(9,values.reduce((n,v)=>n+field(1,v.wire),0))}
  }
  if(plain(value)){
    state.depth=Math.max(state.depth,depth)
    const map=mapSize(value,depth,state,path)
    return {storage:map.storage+32,wire:field(6,map.wire)}
  }
  throw new Error('Unsupported Firestore audit value')
}
function mapSize(data,depth,state,parents=[]){
  let storage=0,wire=0
  for(const [key,value] of Object.entries(data)){
    if(!key||utf8(key)>1500||/^__.*__$/.test(key))state.violations.add('FIELD_NAME')
    const path=[...parents,fieldSegment(key)]
    if(utf8(path.join('.'))>1500)state.violations.add('FIELD_PATH')
    const v=valueSize(value,depth+1,state,false,path)
    storage+=stringSize(key)+v.storage
    wire+=field(2,field(1,utf8(key))+field(2,v.wire))
  }
  return {storage,wire}
}
export function documentMetrics(path,data){
  if(typeof path!=='string'||!plain(data))throw new Error('Invalid audit document')
  const segments=path.split('/'),state={depth:0,violations:new Set()}
  if(segments.length%2||segments.some(s=>!s||utf8(s)>1500||s==='.'||s==='..'||/^__.*__$/.test(s)))state.violations.add('DOCUMENT_PATH')
  const nameBytes=segments.reduce((n,s)=>n+stringSize(s),16),map=mapSize(data,0,state)
  const storageBytes=nameBytes+map.storage+32
  if(nameBytes>6144)state.violations.add('DOCUMENT_NAME')
  if(storageBytes>1048576)state.violations.add('DOCUMENT_SIZE')
  if(state.depth>20)state.violations.add('DEPTH')
  return {storageBytes,maxDepth:state.depth,violations:[...state.violations]}
}
export function commitMetrics(database,writes){
  if(typeof database!=='string'||!Array.isArray(writes))throw new Error('Invalid commit audit')
  let wireBytes=field(1,utf8(database)),maxDocumentBytes=0
  const violations=new Set()
  for(const {path,data} of writes){
    const metrics=documentMetrics(path,data);maxDocumentBytes=Math.max(maxDocumentBytes,metrics.storageBytes)
    metrics.violations.forEach(v=>violations.add(v))
    const fields={},transforms=[]
    for(const [key,value] of Object.entries(data)){
      if(timestamp(value)){
        if(!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key))throw new Error('Quoted transform field paths unsupported')
        transforms.push(field(7,field(1,utf8(key))+scalar(2)+1))
      }
      else {
        const hasNestedTimestamp=v=>timestamp(v)||Array.isArray(v)&&v.some(hasNestedTimestamp)||plain(v)&&Object.values(v).some(hasNestedTimestamp)
        if(hasNestedTimestamp(value))throw new Error('Only top-level timestamp transforms supported by wire audit')
        fields[key]=value
      }
    }
    const state={depth:0,violations:new Set()},map=mapSize(fields,0,state)
    // Document.fields uses tag2; MapValue.fields uses tag1 instead (same tag length).
    const document=field(1,utf8(`${database}/documents/${path}`))+map.wire
    if(document>1048572)violations.add('WIRE_DOCUMENT_SIZE')
    wireBytes+=field(2,field(1,document)+transforms.reduce((n,v)=>n+v,0))
  }
  if(wireBytes>10485760)violations.add('REQUEST_SIZE')
  return {wireBytes,maxDocumentBytes,violations:[...violations],model:'full-set Commit, top-level serverTimestamp transforms; no masks/preconditions/index deltas'}
}
const bounded=(value,max)=>Number.isInteger(value)&&value>=1&&value<=max
export function inventoryBudget(steps,materials){
  if(!bounded(steps,6)||!bounded(materials,6))throw new Error('Invalid inventory budget')
  const preparationWrites=2+steps*(1+3*materials),finalWrites=materials+2
  return {preparationWrites,preparationDocuments:preparationWrites,finalWrites,writes:preparationWrites+finalWrites,
    // Conservative access allowance, not observed billable reads. Every prep is
    // one request (<=10); final is one batch (<=20), no cross-request cache credit.
    rulesReadAllowance:10*preparationWrites+20,measuredBillableReads:false}
}
export function saleBudget(lines){
  if(!bounded(lines,6))throw new Error('Invalid sale budget')
  return {preparationWrites:lines+1,preparationDocuments:Math.ceil(lines/2)+1,finalWrites:17,writes:lines+18,
    rulesReadAllowance:10*(lines+1)+20,measuredBillableReads:false}
}
export function auditMaterialProfile(shop,materials){
  const violations=new Set(),ids=materials.map(m=>m.id),protectedIds=shop.catalog.summaryMaterials
  if(new Set(ids).size!==ids.length||shop.materialIds&&(shop.materialIds.length!==ids.length||!shop.materialIds.every(id=>ids.includes(id))||new Set(shop.materialIds).size!==shop.materialIds.length))violations.add('REGISTRY')
  const ranks=materials.map(m=>m.costRank)
  if(new Set(ranks).size!==ranks.length||ranks.some(r=>!Number.isSafeInteger(r)||r<0))violations.add('COST_RANK')
  if(![15,16].includes(protectedIds.length)||new Set(protectedIds).size!==protectedIds.length||protectedIds.some(id=>!ids.includes(id)))violations.add('PROTECTED_MEMBERS')
  for(const m of materials){
    const lotIds=m.lotIds,keys=Object.keys(m.lots).filter(id=>id!=='_'),quantities=Object.keys(m.lotQty).filter(id=>id!=='_')
    if(m.lotQty._!==0||m.lots._?.id!=='_'||m.lots._.qty!==0||m.lots._.isInUse!==false||m.lots._.expiryDay!==999999||m.lots._.receiveDay!==999999||m.lots._.ordinal!==999999)violations.add('SENTINEL')
    if(lotIds.length>1000)violations.add('LOT_HISTORY')
    if(new Set(lotIds).size!==lotIds.length||keys.length!==lotIds.length||quantities.length!==lotIds.length||lotIds.some(id=>!keys.includes(id)||!quantities.includes(id)))violations.add('LOT_KEYS')
    if(m.allocationIds.length>4||new Set(m.allocationIds).size!==m.allocationIds.length||m.allocationIds.some(id=>!lotIds.includes(id))||lotIds.some(id=>m.lotQty[id]>0&&!m.allocationIds.includes(id)))violations.add('WORKING_LOTS')
    if(JSON.stringify(m.slotIds)!==JSON.stringify([...m.allocationIds,...Array(Math.max(0,4-m.allocationIds.length)).fill('_')]))violations.add('SLOT_INDEX')
    if(m.activeLotId!==''&&(!lotIds.includes(m.activeLotId)||!(m.lotQty[m.activeLotId]>0)))violations.add('ACTIVE_LOT')
    if(!Number.isSafeInteger(m.stock)||m.stock<0||m.stock>1e9||lotIds.some(id=>!Number.isSafeInteger(m.lotQty[id])||m.lotQty[id]<0||m.lotQty[id]>1e9))violations.add('QUANTITY')
    if(m.stock!==lotIds.reduce((n,id)=>n+m.lotQty[id],0))violations.add('STOCK_TOTAL')
    if(!Number.isFinite(m.unitCost)||m.unitCost<0||m.unitCost>100000)violations.add('COST')
    if(lotIds.some(id=>!Number.isFinite(m.lots[id]?.unitCost)||m.lots[id].unitCost<0||m.lots[id].unitCost>100000))violations.add('LOT_COST')
  }
  return {violations:[...violations],materials:materials.length,protectedMaterials:protectedIds.length,
    maxHistoricalLots:Math.max(0,...materials.map(m=>m.lotIds.length)),maxWorkingLots:Math.max(0,...materials.map(m=>m.allocationIds.length)),productionReady:false}
}
