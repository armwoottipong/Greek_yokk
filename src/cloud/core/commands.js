import {createCommandExecutor} from '../commandExecutor.js'
const transportKind=kind=>kind==='inventory'?'receive':kind
const wrap=(kind,receipt)=>({opId:receipt.opId,kind,result:JSON.parse(JSON.stringify(receipt))})
export function createCoreCommands({journal,transport,getContext}){
 const scope={...getContext()}
 const executor=createCommandExecutor({journal,getContext,
  getReceipt:async(s,kind,id)=>{const r=await transport.receipt(transportKind(kind),id);return r?wrap(kind,r):null},
  commit:async(s,c)=>wrap(c.kind,await transport.commit({...c,kind:transportKind(c.kind)}))})
 return {
  execute:command=>executor.execute(scope,command),
  reconcile:()=>executor.reconcile(scope),
  pending:()=>journal.listUnresolved(scope),
  async abandon(){
   const c=getContext()
   if(!c.online||!c.ready||['uid','generation','deviceId','shopId','projectId'].some(k=>c[k]!==scope[k]))return {ok:false,code:'NOT_READY'}
   const [record]=await journal.listUnresolved(scope)
   if(record?.envelope.kind!=='sale')return {ok:false,code:'RETRY_REQUIRED'}
   const result=await transport.abandonSale(record.envelope)
   const value=result.receipt?wrap('sale',result.receipt):{opId:record.envelope.opId,kind:'sale',abandoned:true}
   await journal.resolve(scope,record.envelope.opId,value)
   return {ok:true,value}
  }
 }
}
