// @vitest-environment node
import {it,expect} from 'vitest'
import {compileCoreImport,validateInitialCore} from '../../scripts/core-import.js'
const source=()=>({schemaVersion:4,revision:0,materials:Array.from({length:15},(_,i)=>({id:`M${i}`,name:`Material ${i}`,inventoryType:'ingredient',stock:1000,unitCost:0.2,lots:[{id:`L${i}`,qty:1000,isInUse:true}]})),menus:[{id:'MENU',name:'Menu',isActive:true,hasAddons:false,hasPackage:true,prices:{P:69},recipe:Array.from({length:15},(_,i)=>({materialId:`M${i}`,qty:1}))}],addons:[],addonGroups:[],platforms:[{id:'P',name:'Shop',gpPercent:0,isActive:true}],orders:[{orderId:'old',createdAt:'2026-10-20T12:00:00+07:00',items:[['nested',null]],price:0.123456789}],activityLogs:[{id:'log',note:null}],stockShortages:[],gasApiUrl:'private-connection',exportDate:'2026-10-20'})
const options={generation:'g_trial_test',sourceSha256:'a'.repeat(64)}
it('preserves all original records and precision without modifying source or uploading connection settings',()=>{
 const raw=source(),before=structuredClone(raw),p=compileCoreImport(raw,options)
 expect(raw).toEqual(before);expect(p.report.orders).toBe(1)
 expect(JSON.parse(p.documents.find(d=>d.data.kind==='orders').data.json)).toEqual(raw.orders[0])
 expect(JSON.stringify(p)).not.toContain('private-connection');expect(p.documents.some(d=>d.path.includes('/orders/'))).toBe(false)
})
it('rejects unknown source data, invalid reverse indexes and mismatched stock rather than silently importing',()=>{
 expect(()=>compileCoreImport({...source(),unknown:'secret'},options)).toThrow('Unknown')
 const p=compileCoreImport(source(),options),m=p.documents.filter(d=>d.path.includes('/materials/')).map(d=>d.data)
 m[0].stock++;expect(()=>validateInitialCore(p.shop,m)).toThrow('STOCK_TOTAL');m[0].stock--
 p.shop.productionUsers[m[0].id]=[m[1].id];expect(()=>validateInitialCore(p.shop,m)).toThrow('PRODUCTION_INDEX')
})
