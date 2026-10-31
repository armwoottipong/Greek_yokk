import {toScaledExact} from '../conversion.js'
import {detachMaterialCommands} from './catalogDetachment.js'
const clone=v=>JSON.parse(JSON.stringify(v))
const scaled=v=>{const result=toScaledExact(Number(v),100);if(!result.ok||result.value<0)throw new Error('กรุณาระบุจำนวนหรือราคาไม่ติดลบและมีทศนิยมไม่เกิน 2 ตำแหน่ง');return result.value}
const metadata=(input,old={})=>({name:input.name?.trim()||old.name||'',emoji:input.emoji??old.emoji??'',category:input.category??old.category??'',description:input.description??old.description??'',deleted:false})
export function createCatalogBindings({snapshot,mutate,error}){
 const guarded=action=>async(...args)=>{try{return await action(...args)}catch(e){const message=/CATALOG|Unsupported|Invalid.*(group|menu)|Group is assigned/.test(e.message)?'ข้อมูลเมนูหรือกลุ่มไม่อยู่ในรูปแบบที่รองรับ กรุณาตรวจสูตร ราคา จำนวนตัวเลือก และกลุ่มที่ผูกก่อนบันทึก':e.message;return error(message)}}
 const version=input=>{if(input.expectedCatalogRevision!==undefined&&input.expectedCatalogRevision!==snapshot().shop.catalogRevision)throw new Error('ข้อมูลเมนูหรือสูตรถูกแก้จากเครื่องอื่น กรุณาเปิดรายการใหม่และตรวจข้อมูลก่อนบันทึก')}
 const money=(values,c)=>Object.fromEntries(c.platformIds.map(id=>[id,scaled(values?.[id]??0)]))
 function recipe(rows,c,materials){
  const result={}
  for(const row of rows||[]){const m=materials.find(m=>m.id===row.materialId),qty=scaled(row.qty);if(!m||m.deleted)throw new Error('วัตถุดิบในสูตรไม่พบหรือถูกจัดเก็บแล้ว');if(!qty)throw new Error('ปริมาณในสูตรต้องมากกว่า 0');result[m.id]=(result[m.id]||0)+qty}
  return result
 }
 function menuPayload(input,retire=false){
  version(input)
  const data=snapshot(),c=data.shop.catalog,id=input.id||`MENU-${crypto.randomUUID()}`,old=c.menus[id]
  const selected=retire||input.hasAddons===false?[]:input.addonGroupIds
  const rawRecipe=retire?{}:recipe(input.recipe,c,data.materials)
  // Retain declared packaging quantities while the packaging toggle is off.
  if(!retire&&input.hasPackage===false)for(const [key,q] of Object.entries(old?.rawRecipe||{}))if(data.materials.find(m=>m.id===key)?.inventoryType==='packaging')rawRecipe[key]=q
  const options=selected===undefined&&input.hasAddons!==false?[...(old?.optionIds||[])]:[]
  const canonical={id,name:input.name?.trim()||old?.name||data.display.menus?.[id]?.name||id,active:retire?false:input.isActive??old?.active??true,pricesCents:retire?clone(old.pricesCents):money(input.prices,c),rawRecipe,recipe:clone(rawRecipe),hasPackage:retire?old.hasPackage!==false:input.hasPackage!==false,optionIds:retire?[]:options,min:retire?0:options.length?(old?.min||0):0,max:retire?0:options.length?(old?.max||0):0,priceMode:old?.priceMode||'addon',optionPrices:Object.fromEntries(c.platformIds.map(p=>[p,options.length?clone(old.optionPrices[p]):{_:0}]))}
  if(selected!==undefined)canonical.groupIds=[...selected]
  else if(old?.groupIds?.length)canonical.groupIds=[...old.groupIds]
  else if(old?.groupId)canonical.groupIds=[old.groupId]
  const display=retire?{...metadata(input,data.display.menus?.[id]),deleted:true}:metadata(input,data.display.menus?.[id])
  return {input:canonical,display}
 }
 return {
  detachMaterialCommands:materialId=>detachMaterialCommands(snapshot(),materialId),
  saveMenu:guarded(input=>mutate([{kind:'menu',payload:menuPayload(input)}])),
  deleteMenu:guarded(id=>{const data=snapshot(),old=data.shop.catalog.menus[id];if(!old)return error('ไม่พบเมนู');return mutate([{kind:'menu',payload:menuPayload({id,name:data.display.menus?.[id]?.name||old.name,hasAddons:false},true)}])}),
  saveAddon:guarded(input=>{version(input);const d=snapshot(),c=d.shop.catalog,id=input.id||`ADDON-${crypto.randomUUID()}`,old=c.addons[id];return mutate([{kind:'addon',payload:{entityId:id,input:{name:input.name.trim(),active:input.isActive??old?.active??true,pricesCents:money(input.prices,c),recipe:recipe(input.recipe,c,d.materials)},display:metadata(input,d.display.addons?.[id])}}])}),
  deleteAddon:guarded(id=>{const d=snapshot(),c=d.shop.catalog,old=c.addons[id];if(!old)return error('ไม่พบ Add-on');if(Object.values(c.menus).some(m=>m.active&&m.optionIds.includes(id))||Object.values(c.groups||{}).some(g=>g.active&&g.optionIds.includes(id)))return error('ยังลบไม่ได้: Add-on นี้อยู่ในเมนูหรือกลุ่มตัวเลือก กรุณานำออกก่อน');return mutate([{kind:'addon',payload:{entityId:id,input:{...clone(old),active:false,recipe:{},materialIds:[]},display:{...metadata({name:d.display.addons?.[id]?.name||old.name||id},d.display.addons?.[id]),deleted:true}}}])}),
  saveAddonGroup:guarded(input=>{version(input);const d=snapshot(),c=d.shop.catalog,id=input.id||`GROUP-${crypto.randomUUID()}`,ids=input.options.map(o=>o.addonId);return mutate([{kind:'group',payload:{input:{id,name:input.name.trim(),active:input.isActive!==false,min:Number(input.minSelections),max:Number(input.maxSelections),allowRepeat:!!input.allowRepeat,pricingMode:input.pricingMode,optionIds:ids,optionPrices:Object.fromEntries(c.platformIds.map(p=>[p,{_:0,...Object.fromEntries(input.options.filter(o=>o.prices&&Object.hasOwn(o.prices,p)).map(o=>[o.addonId,scaled(o.prices[p])]))}]))},display:metadata({name:input.name.trim()},d.display.groups?.[id])}}])}),
  deleteAddonGroup:guarded(id=>{const d=snapshot(),old=d.shop.catalog.groups[id];if(!old)return error('ไม่พบกลุ่มตัวเลือก');if(old.menuIds.length)return error('ยังลบไม่ได้: กลุ่มนี้ยังถูกใช้ในเมนู กรุณานำออกจากเมนูก่อน');const input=clone(old);delete input.revision;delete input.menuIds;delete input.multiMenuIds;input.active=false;return mutate([{kind:'group',payload:{input,display:{...metadata({name:old.name},d.display.groups?.[id]),deleted:true}}}])})
 }
}
