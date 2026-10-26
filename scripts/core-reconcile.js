const groups={materials:'id',menus:'id',addons:'id',addonGroups:'id',platforms:'id',orders:'orderId',activityLogs:'id'}
const canonical=v=>JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x)
export function reconcileCoreSources(baseline,latest){
 const report={collections:{},materialBalancesChanged:0,externalConnectionIncluded:false}
 for(const [kind,idKey] of Object.entries(groups)){
  const before=baseline[kind]||[],after=latest[kind]||[],a=new Map(before.map(r=>[r[idKey],r])),b=new Map(after.map(r=>[r[idKey],r]))
  if(a.size!==before.length||b.size!==after.length||a.has(undefined)||b.has(undefined))throw new Error('Ambiguous source identifiers')
  const oldKeys=[...a.keys()],newKeys=[...b.keys()]
  report.collections[kind]={before:before.length,after:after.length,added:newKeys.filter(id=>!a.has(id)).length,removed:oldKeys.filter(id=>!b.has(id)).length,changed:newKeys.filter(id=>a.has(id)&&canonical(a.get(id))!==canonical(b.get(id))).length}
  if(kind==='materials')report.materialBalancesChanged=newKeys.filter(id=>a.has(id)&&a.get(id).stock!==b.get(id).stock).length
 }
 report.historyPreserved=report.collections.orders.removed===0
 return report
}
