import {Timestamp} from 'firebase/firestore'
import {auditMaterialProfile} from '../src/cloud/core/model/metrics.js'
const map=v=>v&&Object.getPrototypeOf(v)===Object.prototype
const int=(v,lo=0,hi=1e9)=>Number.isSafeInteger(v)&&v>=lo&&v<=hi
const same=(a,b)=>JSON.stringify([...a].sort())===JSON.stringify([...b].sort())
const list=(v,max)=>Array.isArray(v)&&v.length<=max&&new Set(v).size===v.length&&v.every(id=>typeof id==='string'&&/^[A-Za-z0-9_-]{1,200}$/.test(id))
export function auditRecoveryProtocol(shop,rows){
 const fail=(section='shape')=>{throw Object.assign(new Error('RECOVERY_PROTOCOL_INVALID'),{code:'RECOVERY_PROTOCOL_INVALID',section})}
 try{
  const c=shop.catalog,materials=rows.materials.map(r=>r.data),ids=shop.materialIds,byId=new Map(materials.map(m=>[m.id,m]))
  if(!map(c)||!list(ids,64)||!list(c.summaryMaterials,16)||!list(c.platformIds,4)||!c.platformIds.length||(Object.hasOwn(c,'counterIds')&&(!Array.isArray(c.counterIds)||c.counterIds.length!==15))||!map(shop.productionUsers))fail('audit-10')
  for(const [collection,key,max] of [['menus','menuIds',64],['addons','addonIds',64],['groups','groupIds',64],['platforms','platformIds',4]])if(!map(c[collection])||!list(c[key],max)||!same(Object.keys(c[collection]),c[key]))fail('audit-11')
  if(!c.platformIds.some(id=>c.platforms[id].active))fail('audit-12')
  for(const id of c.platformIds){const p=c.platforms[id];if(!map(p)||!int(p.revision,1,Number.MAX_SAFE_INTEGER)||typeof p.active!=='boolean'||!int(p.gpBasisPoints,0,9999))fail('audit-13')}
  if(auditMaterialProfile(shop,materials).violations.length)fail('audit-14')
  for(const m of materials)if(!int(m.revision,1,Number.MAX_SAFE_INTEGER)||typeof m.deleted!=='boolean'||!['ingredient','packaging'].includes(m.inventoryType)||typeof m.unit!=='string'||!m.unit||!int(m.packSize,1,1e7)||!int(m.minAlertQ)||!map(m.recipeIndex))fail('audit-15')
  const recipe=r=>map(r)&&Object.keys(r).length<=16&&Object.entries(r).every(([id,q])=>byId.has(id)&&int(q))
  const prices=p=>map(p)&&same(Object.keys(p),c.platformIds)&&c.platformIds.every(id=>int(p[id]))
  const choices=(p,options)=>map(p)&&same(Object.keys(p),c.platformIds)&&c.platformIds.every(id=>map(p[id])&&p[id]._===0&&Object.keys(p[id]).every(k=>k==='_'||options.includes(k))&&Object.values(p[id]).every(v=>int(v)))
  for(const id of c.addonIds){const a=c.addons[id];if((Object.hasOwn(a,'active')&&typeof a.active!=='boolean')||(Object.hasOwn(a,'revision')&&!int(a.revision,1,Number.MAX_SAFE_INTEGER))||!recipe(a.recipe)||!prices(a.pricesCents))fail('audit-19')}
  for(const id of c.menuIds){const m=c.menus[id],groups=m.groupIds|| (m.groupId?[m.groupId]:[]);if(m.id!==id||typeof m.active!=='boolean'||!int(m.revision,1,Number.MAX_SAFE_INTEGER)||!recipe(m.rawRecipe||m.recipe)||!recipe(m.recipe)||!prices(m.pricesCents)||!list(m.optionIds,45)||m.optionIds.some(a=>!c.addonIds.includes(a))||!int(m.min,0,11)||!int(m.max,m.min,11)||!list(groups,2)||groups.some(g=>!c.groupIds.includes(g))||!choices(m.optionPrices,m.optionIds))fail('audit-20')}
  for(const id of c.groupIds){const g=c.groups[id];if(g.id!==id||!int(g.revision,1,Number.MAX_SAFE_INTEGER)||typeof g.active!=='boolean'||!list(g.optionIds,45)||g.optionIds.some(a=>!c.addonIds.includes(a))||!int(g.min,0,11)||!int(g.max,g.min,11)||typeof g.allowRepeat!=='boolean'||!['included','extra'].includes(g.pricingMode)||!choices(g.optionPrices,g.optionIds))fail('audit-21')}
  const users=Object.fromEntries(ids.map(id=>[id,[]]))
  for(const m of materials){const r=m.productionRecipe;if(!r||!Object.keys(r).length)continue;if(m.inventoryType!=='ingredient'||!list(r.inputIds,2)||!r.inputIds.length||r.inputIds.includes(m.id)||!Array.isArray(r.quantities)||r.quantities.length!==r.inputIds.length||!r.quantities.every(q=>int(q,1))||!int(r.yieldQ,1)||r.inputIds.some(id=>byId.get(id)?.inventoryType!=='ingredient'))fail('audit-23');for(const id of r.inputIds)users[id].push(m.id)}
  if(!same(Object.keys(shop.productionUsers),ids)||ids.some(id=>!Array.isArray(shop.productionUsers[id])||!same(shop.productionUsers[id],users[id])))fail('audit-24')
  for(const {id:documentId,data:receipt} of rows.orders){
   if(receipt.opId!==documentId||!(receipt.createdAt instanceof Timestamp)||!['committed','cancelled'].includes(receipt.status)||receipt.kind!=='sale_set'||!list(receipt.materialIds,16)||!Array.isArray(receipt.inventory)||receipt.inventory.length!==receipt.materialIds.length||!Array.isArray(receipt.lines)||!receipt.lines.length||receipt.lines.some(l=>!map(l)||!int(l.qty,1,1e6)||!int(l.totalCents))||receipt.lines.reduce((n,l)=>n+l.totalCents,0)!==receipt.subtotalCents)fail('receipt-shape')
   if(['subtotalCents','gpCents','netCents','ingredientCostCents','packagingCostCents','grossProfitCents'].some(k=>!Number.isSafeInteger(receipt[k]))||receipt.subtotalCents<0||receipt.gpCents<0||receipt.ingredientCostCents<0||receipt.packagingCostCents<0||receipt.netCents!==receipt.subtotalCents-receipt.gpCents||receipt.grossProfitCents!==receipt.netCents-receipt.ingredientCostCents-receipt.packagingCostCents)fail('receipt-money')
   for(const [i,row] of receipt.inventory.entries()){
    const m=byId.get(row.materialId)
    if(row.materialId!==receipt.materialIds[i]||!int(row.take)||!int(row.needed)||!int(row.shortage)||row.needed!==row.take+row.shortage||receipt.approvedShortages?.[row.materialId]!==row.shortage||!list(row.lotIds,4)||row.lotIds.includes('_')||!Array.isArray(row.lotTakes)||row.lotTakes.length!==4||!row.lotTakes.every((q,j)=>int(q)&&(j<row.lotIds.length||q===0))||row.lotTakes.reduce((n,q)=>n+q,0)!==row.take)fail('receipt-allocation')
    if(receipt.status==='committed'&&(!m||m.stock+row.take>1e9||row.lotIds.some((id,j)=>!Object.hasOwn(m.lotQty,id)||m.lotQty[id]+row.lotTakes[j]>1e9)))fail('receipt-return')
   }
  }
  return true
 }catch(e){if(e.code==='RECOVERY_PROTOCOL_INVALID')throw e;fail('shape')}
}
