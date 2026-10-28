export const packageSalePolicy=String.raw`
 function packageBillShape(o,ids) {
  let p=o.get('packages',{});
  let snapshots=o.get('packageSnapshots',{});
  return p is map && p.size()<=16 && p.keys().hasOnly(ids) && snapshots is map && snapshots.size()<=16 && snapshots.keys().hasOnly(ids) && p.keys().hasOnly(snapshots.keys());
 }
 function packageBillRow(m,o) {
  let p=o.get('packages',{});
  return !(m.id in p) || packageBillEntry(m,p[m.id]);
 }
 function packageBillEntry(m,p) {
  return m.inventoryType=='packaging' && p is map && p.keys().hasOnly(['quantity','reason','note']) &&
   integer(p.quantity,0,1000000000) && p.reason in ['separate_bag','customer_declined','combined_packaging','package_unavailable','repacked','other'] &&
   p.note is string && p.note.size()<=1000 && (p.reason!='other' || p.note.size()>0);
 }
 function packageBillNeed(m,o,c) { return m.id in o.get('packages',{}) ? o.packages[m.id].quantity : billMaterialNeed(m,o,c); }
 function packageCertifiedNeed(m,o,c,needed) {
  let base=billMaterialNeed(m,o,c);
  let snapshots=o.get('packageSnapshots',{});
  let p=snapshots.get(m.id,{});
  return packageBillRow(m,o) && needed==(m.id in o.get('packages',{}) ? o.packages[m.id].quantity : base) &&
   (!(m.id in snapshots) || m.inventoryType=='packaging' && p.keys().hasOnly(['name','unit','unitCost','baselineQuantity']) && p.name==m.get('name',m.id) && p.unit==m.get('unit','') && p.unitCost==m.unitCost && p.baselineQuantity==base);
 }
`;
export function extendPackageSaleRule(name,body){
 if(name==='billCacheWrite')body=body.replace('d.needed==billMaterialNeed(b,proof.billOperands,root.catalog)','packageCertifiedNeed(b,proof.billOperands,root.catalog,d.needed)')
 if(name==='billCertificateCreate')body=body.replace("['lineMenuIds','lineQtys','addonKeys','addonCounts'])", "['lineMenuIds','lineQtys','addonKeys','addonCounts','packages','packageSnapshots']) && packageBillShape(d.billOperands,d.materialIds)")
 if(name==='smallOrder')body=body.replace("o.billOperands=={'lineMenuIds':o.lineMenuIds,'lineQtys':o.lineQtys,'addonKeys':o.addonKeys,'addonCounts':o.addonCounts}","o.billOperands.diff({'lineMenuIds':o.lineMenuIds,'lineQtys':o.lineQtys,'addonKeys':o.addonKeys,'addonCounts':o.addonCounts}).affectedKeys().hasOnly(['packages','packageSnapshots'])")
 return body
}
