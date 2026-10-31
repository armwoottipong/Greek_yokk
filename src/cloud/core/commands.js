import {createCommandExecutor} from '../commandExecutor.js'
const transportKind=kind=>kind==='inventory'?'receive':kind
const wrap=(kind,receipt)=>receipt.kind==='command_abort'?{opId:receipt.opId,kind,rejected:true,code:'COMMAND_STOPPED'}:{opId:receipt.opId,kind,result:JSON.parse(JSON.stringify(receipt))}
export function createCoreCommands({journal,transport,getContext}){
 const scope={...getContext()}
 const executor=createCommandExecutor({journal,getContext,
  getReceipt:async(s,kind,id)=>{const r=await transport.receipt(transportKind(kind),id);return r?wrap(kind,r):null},
  commit:async(s,c)=>wrap(c.kind,await transport.commit({...c,kind:transportKind(c.kind)}))})
 function guard(){const c=getContext();if(!c.online||!c.ready||!c.protocolCertified||['uid','generation','deviceId','shopId','projectId'].some(k=>c[k]!==scope[k]))throw Object.assign(new Error('NOT_READY'),{code:'NOT_READY'})}
 return {
  execute:command=>executor.execute(scope,command),
  reconcile:()=>executor.reconcile(scope),
  pending:()=>journal.listUnresolved(scope),
  async discardUnsent(command){
   try{guard();await journal.inspect(scope,command.opId,command);const record=await journal.rejectUnsent(scope,command.opId);return {ok:true,value:record.receipt}}
   catch(error){return {ok:false,code:error.code||'LOCAL_JOURNAL_FAILED'}}
  },
  async recover(command){
   try{
    guard()
    if(!command)return executor.reconcile(scope)
    const record=await journal.inspect(scope,command.opId,command);guard()
    if(record?.state==='resolved')return {ok:true,value:record.receipt}
    const receipt=await transport.receipt(transportKind(command.kind),command.opId);guard()
    if(receipt){const value=wrap(command.kind,receipt);if(record)await journal.resolve(scope,command.opId,value);return {ok:true,value}}
    if(command.payload?.expectedRevision!==undefined){
     try{const resolved=await transport.rejectStaleInventory({...command,kind:transportKind(command.kind)});guard()
      const value=resolved.receipt?wrap(command.kind,resolved.receipt):{opId:command.opId,kind:command.kind,rejected:true,code:resolved.code}
      if(record)await journal.resolve(scope,command.opId,value)
      return {ok:true,value}
     }catch(error){if(error.code!=='STALE_NOT_PROVEN')throw error}
    }
    return {ok:false,code:'PENDING_RESULT',outcome:'uncertain'}
   }catch(error){return {ok:false,code:error.code||'PENDING_RESULT',causeCode:error.code||'UNKNOWN',outcome:'uncertain'}}
  },
  async stop(command){
   try{
    guard()
    const record=await journal.inspect(scope,command.opId,command)
    if(record?.state==='resolved')return {ok:true,value:record.receipt}
    if(record&&!record.attempted){const closed=await journal.rejectUnsent(scope,command.opId);return {ok:true,value:closed.receipt}}
    const result=await transport.abortInventory({...command,kind:transportKind(command.kind)});guard()
    const value=result.receipt?wrap(command.kind,result.receipt):{opId:command.opId,kind:command.kind,rejected:true,code:result.code}
    if(record)await journal.resolve(scope,command.opId,value)
    return {ok:true,value}
   }catch(error){return {ok:false,code:error.code||'PENDING_RESULT',causeCode:error.code||'UNKNOWN'}}
  },
  async rejectStaleInventory(){
   try{
    const c=getContext()
    if(!c.online||!c.ready||!c.protocolCertified||['uid','generation','deviceId','shopId','projectId'].some(k=>c[k]!==scope[k]))return {ok:false,code:'NOT_READY'}
    const [record]=await journal.listUnresolved(scope)
    if(!record)return {ok:true,value:null}
    const envelope=record.envelope,result=await transport.rejectStaleInventory({...envelope,kind:transportKind(envelope.kind)})
    const value=result.receipt?wrap(envelope.kind,result.receipt):{opId:envelope.opId,kind:envelope.kind,rejected:true,code:result.code}
    await journal.resolve(scope,envelope.opId,value)
    return {ok:true,value}
   }catch(error){return {ok:false,code:error.code||'PENDING_RESULT'}}
  },
  async abandon(command){
   const c=getContext()
   if(!c.online||!c.ready||['uid','generation','deviceId','shopId','projectId'].some(k=>c[k]!==scope[k]))return {ok:false,code:'NOT_READY'}
   const [record]=await journal.listUnresolved(scope)
   guard()
   if(record&&command&&record.envelope.opId!==command.opId)return {ok:false,code:'PENDING_COMMAND'}
   const envelope=record?.envelope||command
   if(envelope?.kind!=='sale')return {ok:false,code:'RETRY_REQUIRED'}
   if(record&&command)await journal.inspect(scope,command.opId,command)
   const result=await transport.abandonSale(envelope);guard()
   const value=result.receipt?wrap('sale',result.receipt):{opId:envelope.opId,kind:'sale',abandoned:true}
   if(record)await journal.resolve(scope,envelope.opId,value)
   return {ok:true,value}
  }
 }
}
