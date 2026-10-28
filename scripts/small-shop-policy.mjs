// Empty/small native shops use physical materials only. Preserve distributed
// guards for old 15/16-row clients; smaller receipts prove every operand here.
export const smallShopPolicy=String.raw`
 function smallOperands(d,i,c) {
  let z={'menuId':'_','qty':0,'optionQuantities':{'_':0}};
  let l=d.lines.concat([z,z,z,z,z,z]);
  let o={'lines':d.lines,'lineMenuIds':d.billOperands.lineMenuIds,'lineQtys':d.billOperands.lineQtys,'addonKeys':d.addonKeys,'addonCounts':d.billOperands.addonCounts,
   'lineOptionQuantities':{'L0':l[0].optionQuantities,'L1':l[1].optionQuantities,'L2':l[2].optionQuantities,'L3':l[3].optionQuantities,'L4':l[4].optionQuantities,'L5':l[5].optionQuantities}};
  let n=i*4+4;
  return d.addonKeys==d.billOperands.addonKeys && (i!=0 || d.lineOptionQuantities==o.lineOptionQuantities) && operandPair(o,i*2) && counter(o,n,c) && counter(o,n+1,c) && counter(o,n+2,c) && (n+3>14 || counter(o,n+3,c));
 }
 function smallOperandPath(s,g,id,i) {return /databases/$(database)/documents/shops/$(s)/generations/$(g)/preparedSales/$(id)/operandProofs/$(i);}
 function smallOperandWrite(s,g,id,index,d) {
  let root=get(rootPath(s)).data;
  return active(s,g) && index in ['0','1','2'] && d.uid==request.auth.uid && d.opId==id && d.catalogRevision==root.catalogRevision && d.lines.size()>0 && d.lines.size()<=6 &&
   d.materialIds.size()<15 && smallOperands(d,int(index),root.catalog);
 }
 function smallCertificate(s,g,d) {
  return billCertificatePart(s,g,d,0) && billCertificatePart(s,g,d,1) && billCertificatePart(s,g,d,2) && (d.materialIds.size()>=15 ||
   get(smallOperandPath(s,g,d.opId,'0')).data==d && get(smallOperandPath(s,g,d.opId,'1')).data==d && get(smallOperandPath(s,g,d.opId,'2')).data==d);
 }
 function smallCost(rows,key,i) { return i<rows.size() ? rows[i][key] : 0; }
 function smallOrder(o,c) {
  return o.materialIds.size()>=4 ||
   o.billOperands=={'lineMenuIds':o.lineMenuIds,'lineQtys':o.lineQtys,'addonKeys':o.addonKeys,'addonCounts':o.addonCounts};
 }
`;
const replace=(body,before,after)=>{if(!body.includes(before))throw new Error(`Small-shop validator source changed: ${before}`);return body.replace(before,after)}
export function extendSmallShopRule(name,body){
 if(name==='billCertificateMatch')body=body.replace('d.lines==o.lines;', 'd.lines==o.lines && (o.materialIds.size()>=3 || d.lineOptionQuantities==o.lineOptionQuantities);')
 if(name==='billCertificateCreate')body=body.replace("'billOperands','lines']","'billOperands','lines','lineOptionQuantities']").replace('billCertificatePart(s,g,d,0) && billCertificatePart(s,g,d,1) && billCertificatePart(s,g,d,2)', 'smallCertificate(s,g,d)')
 if(name==='validMaterial')return body
 if(['validOrder','validRoot','cancelRoot'].includes(name))body=body.replace(/touchedAt\(s,[^,]+,o,\d+\)(?:\s*&&\s*touchedAt\(s,[^,]+,o,\d+\))*/g,group=>{
  const max=Math.max(...[...group.matchAll(/,o,(\d+)\)/g)].map(m=>Number(m[1])))
  const guarded=group.replace(/touchedAt\((s,[^,]+,o,)(\d+)\)/g,(_,args,i)=>`(${i}>=o.materialIds.size() || touchedAt(${args}${i}))`)
  // Fourteen real rows need only the final optional row guard. Avoid repeating
  // seven known-in-range guards on the largest small-shop receipt.
  const fast=name==='validOrder'&&max===14
  const full=fast?group.replace(/touchedAt\((s,[^,]+,o,)14\)/g,(_,args)=>`(o.materialIds.size()==14 || touchedAt(${args}14))`):group
  return `(o.materialIds.size()>=${fast?14:max+1} ? (${full}) : (${guarded}))`
 })
 if(name==='validRoot')body=replace(body,'o.materialIds.size()==15 ||','o.materialIds.size()<=15 ||')
 if(name==='validOrder'){
  body=replace(body,'o.inventory.size() in [15,16]','integer(o.inventory.size(),0,16)')
  body=replace(body,"o.proofMode=='prepared' &&","smallOrder(o,root.catalog) && o.proofMode=='prepared' &&")
 }
 if(name==='validMaterial'){
  body=replace(body,'(i<4 || i>=15 || counter(o,i,root.catalog))','(o.materialIds.size()<15 || i<4 || i>=15 || counter(o,i,root.catalog))')
  body=replace(body,'billOperandField(o,i) &&','(o.materialIds.size()<15 || billOperandField(o,i)) &&')
  body=replace(body,'(i>=3 || operandPair(o,i*2))','(o.materialIds.size()<15 || i>=3 || operandPair(o,i*2))')
 }
 if(name==='costs')body=body.replace('let rows = o.inventory;',"let z={'ingredientCostBaht':0,'packagingCostCents':0}; let rows=o.inventory.size()>=15 ? o.inventory : o.inventory.concat([z,z,z,z,z,z,z,z,z,z,z,z,z,z,z]);")
 if(name==='billLineCoverage')body=replace(body,'ids.size() in [15,16]','integer(ids.size(),0,16)')
 if(name==='cancelOperation')body=replace(body,'o.materialIds.size() in [15,16]','integer(o.materialIds.size(),0,16)')
 return body
}
