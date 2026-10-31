export function declaredMaterialReferences(data,id){
 const references=[]
 for(const collection of ['menus','addons'])for(const [key,row] of Object.entries(data.shop.catalog[collection]||{})){
  if(!Object.hasOwn(row.rawRecipe||row.recipe||{},id))continue
  const display=data.display?.[collection]?.[key]
  references.push({collection,id:key,name:display?.name||row.name||key,retired:row.active===false&&display?.deleted===true})
 }
 return references
}
export function materialDeletionEligibility(data,id){
 const material=data.materials.find(m=>m.id===id),blockers=[]
 if(!material)return {allowed:false,blockers:['ไม่พบวัตถุดิบ'],references:[]}
 if(!material.deleted)blockers.push('กรุณาจัดเก็บวัตถุดิบก่อนลบถาวร')
 if(material.stock!==0)blockers.push('มีสต็อกคงเหลือ กรุณาตรวจนับหรือบันทึกของเสียก่อน')
 if(Object.values(material.lotQty||{}).some(q=>q!==0))blockers.push('มีจำนวนคงเหลือในล็อต')
 if(data.shop.catalog.summaryMaterials.includes(id))blockers.push('ยังเป็นวัตถุดิบใช้งานของระบบ กรุณาจัดเก็บก่อน')
 if(data.shop.returnMaterials?.[id])blockers.push('มีประวัติขายที่ต้องเก็บวัตถุดิบไว้รองรับการคืนบิล สามารถจัดเก็บแทนได้')
 const references=declaredMaterialReferences(data,id)
 for(const ref of references)blockers.push(`อยู่ในสูตร${ref.collection==='menus'?'เมนู':' Add-on'} ${ref.name}${ref.retired?' (ลบแล้ว)':''}`)
 for(const source of data.shop.productionUsers?.[id]||[])blockers.push(`ใช้ในสูตรผลิต ${data.materials.find(m=>m.id===source)?.name||source}`)
 if(Object.keys(material.productionRecipe||{}).length)blockers.push('รายการนี้มีสูตรผลิต กรุณานำสูตรออกก่อนลบถาวร')
 return {allowed:blockers.length===0,blockers,references}
}
