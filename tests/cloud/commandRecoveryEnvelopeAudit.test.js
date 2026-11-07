// @vitest-environment node
import {afterEach,describe,expect,it,vi} from 'vitest'
import {IDBFactory} from 'fake-indexeddb'
import {isDeepStrictEqual} from 'node:util'
import {createCommandJournal} from '../../src/cloud/journal.js'
import {createCoreCommands} from '../../src/cloud/core/commands.js'

const scope={projectId:'demo-yogg',shopId:'shop',generation:'g1',uid:'cashier',deviceId:'device'}
const sale={opId:'sale-recovery',kind:'sale',payload:{platformId:'P',lines:[{menuId:'M',qty:1,note:'original',selections:[{groupId:'G',id:'A0',selectionQty:1}]}],subtotalCents:6900,expectedCatalogRevision:1,approvedShortages:{}}}
const collision=()=>Object.assign(new Error('COMMAND_ID_COLLISION'),{code:'COMMAND_ID_COLLISION'})
const normalize=command=>({...structuredClone(command),kind:command.kind==='inventory'?'receive':command.kind})
const journals=[]
afterEach(async()=>{await Promise.all(journals.splice(0).map(j=>j.close()))})
function setup(command=sale){
 const journal=createCommandJournal({indexedDB:new IDBFactory(),ownerId:'tab'});journals.push(journal)
 const context={...scope,online:true,ready:true,protocolCertified:true,catalogRevision:1}
 const confirmed=normalize(command)
 const receipt={opId:command.opId,uid:scope.uid,kind:command.kind==='sale'?'sale_set':'stock_in',status:'committed',catalogRevision:1}
 const server={confirmed,receipt}
 // Transport double models the optional immutable-envelope validation contract.
 // Missing envelope intentionally retains old ID-only reads, reproducing the bypass.
 const transport={
  commit:vi.fn(async()=>{throw Object.assign(new Error('response lost after server commit'),{code:'unavailable'})}),
  receipt:vi.fn(async(kind,id,envelope)=>{
   expect(kind).toBe(server.confirmed.kind);expect(id).toBe(server.receipt.opId)
   if(envelope&&!isDeepStrictEqual(envelope,server.confirmed))throw collision()
   return structuredClone(server.receipt)
  }),
 }
 const commands=createCoreCommands({journal,transport,getContext:()=>context})
 return {commands,journal,transport,server,context,command:structuredClone(command)}
}
const actions={recover:f=>f.commands.recover(f.command),retry:f=>f.commands.execute(f.command),reconcile:f=>f.commands.reconcile()}
describe('immutable recovery envelope propagation',()=>{
 it.each(Object.keys(actions).flatMap(action=>['group','quantity'].map(change=>[action,change])))('%s rejects a same-UID/id receipt with different %s payload',async(action,change)=>{
  const f=setup();expect(await f.commands.execute(f.command)).toMatchObject({ok:false,outcome:'uncertain'})
  if(change==='group')f.server.confirmed.payload.lines[0].selections[0].groupId='H'
  else f.server.confirmed.payload.lines[0].qty=2
  expect(await actions[action](f)).toMatchObject({ok:false,code:'COMMAND_ID_COLLISION'})
  expect(await f.journal.listUnresolved(scope)).toHaveLength(1)
  expect(f.transport.commit).toHaveBeenCalledTimes(1)
  expect(f.transport.receipt).toHaveBeenLastCalledWith('sale',f.command.opId,normalize(f.command))
 })
 it.each(Object.keys(actions))('%s resolves the original historical receipt without recommitting after catalog changes',async action=>{
  const f=setup();await f.commands.execute(f.command);f.context.catalogRevision=99
  const result=await actions[action](f)
  expect(result).toMatchObject({ok:true,value:{kind:'sale',result:f.server.receipt}})
  expect(await f.journal.listUnresolved(scope)).toEqual([]);expect(f.transport.commit).toHaveBeenCalledTimes(1)
  expect(f.transport.receipt).toHaveBeenLastCalledWith('sale',f.command.opId,normalize(f.command))
 })
 it.each(Object.keys(actions))('%s forwards inventory under the same normalized receive envelope as commit',async action=>{
  const command={opId:'inventory-recovery',kind:'inventory',payload:{materialId:'S0',input:{qtyQ:100,unitCost:2},expectedRevision:1}},f=setup(command)
  await f.commands.execute(f.command)
  const result=await actions[action](f)
  expect(result).toMatchObject({ok:true,value:{kind:'inventory',result:f.server.receipt}})
  expect(f.transport.commit).toHaveBeenCalledWith(normalize(command))
  expect(f.transport.receipt).toHaveBeenLastCalledWith('receive',command.opId,normalize(command))
  expect(await f.journal.listUnresolved(scope)).toEqual([]);expect(f.transport.commit).toHaveBeenCalledTimes(1)
 })
 it('direct recovery without a journal record also validates its original envelope',async()=>{
  const f=setup();f.server.confirmed.payload.lines[0].selections[0].groupId='H'
  expect(await f.commands.recover(f.command)).toMatchObject({ok:false,code:'COMMAND_ID_COLLISION'})
  expect(f.transport.commit).not.toHaveBeenCalled()
  expect(f.transport.receipt).toHaveBeenLastCalledWith('sale',f.command.opId,normalize(f.command))
 })
})
