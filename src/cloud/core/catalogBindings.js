import {encodeGroupAvailability} from './groupAvailability.js'
import {planLegacyOptionMigration} from './legacyOptionMigration.js'
import {cloudGroupBindingIssue,duplicateNewStockOption} from '../../domain/addonGroups.js'
import {catalogAddons,catalogGroups,catalogMenus} from './catalogPresentation.js'
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
 const addonCommand=input=>{const d=snapshot(),c=d.shop.catalog,id=input.id||`ADDON-${crypto.randomUUID()}`,old=c.addons[id];return {kind:'addon',payload:{entityId:id,input:{name:input.name.trim(),active:input.isActive??old?.active??true,pricesCents:money(input.prices,c),recipe:recipe(input.recipe,c,d.materials)},display:metadata(input,d.display.addons?.[id])}}}
 return {
  legacyOptionMigrationPlan:()=>{
   const data=snapshot()
   return { revision:data.shop.revision, ...planLegacyOptionMigration(data) }
  },
  migrateLegacyOptions:guarded(expectedRevision=>{
   const data=snapshot()
   if(data.shop.revision!==expectedRevision)throw new Error('ข้อมูลร้านเปลี่ยน กรุณาตรวจรายการที่จะย้ายอีกครั้ง')
   const {profiles,blockers}=planLegacyOptionMigration(data)
   if(blockers.length)throw new Error('บางเมนูมีราคาหรือกติกาเดิมที่ต้องตรวจสอบก่อนย้าย')
   const menus=new Map(catalogMenus(data).map(menu=>[menu.id,menu]))
   const entries=[]
   for(const profile of profiles){
    const {optionIds,min,max,optionPrices}=profile
    const groupIds=[]
    if(max){
     const id=`GROUP-${crypto.randomUUID()}`
     const name='ตัวเลือกจากเมนูเดิม'
     entries.push({kind:'group',payload:{input:{id,name,active:true,min,max,allowRepeat:false,pricingMode:'extra',optionIds,optionPrices},display:metadata({name})}})
     groupIds.push(id)
    }
    for(const id of profile.menus){
     entries.push({kind:'menu',payload:menuPayload({...menus.get(id),hasAddons:groupIds.length>0,addonGroupIds:groupIds})})
    }
   }
   return mutate(entries)
  }),
  detachMaterialCommands:materialId=>detachMaterialCommands(snapshot(),materialId),
  saveMenu:guarded(input=>{
   const payload=menuPayload(input)
   const groups=new Map(catalogGroups(snapshot()).map(group=>[group.id,group]))
   const issue=cloudGroupBindingIssue((payload.input.groupIds||[]).map(id=>groups.get(id)))
   if(issue)throw new Error(issue)
   return mutate([{kind:'menu',payload}])
  }),
  deleteMenu:guarded(id=>{const data=snapshot(),old=data.shop.catalog.menus[id];if(!old)return error('ไม่พบเมนู');return mutate([{kind:'menu',payload:menuPayload({id,name:data.display.menus?.[id]?.name||old.name,hasAddons:false},true)}])}),
  saveAddon:guarded(input=>{version(input);return mutate([addonCommand(input)])}),
  deleteAddon:guarded(id=>{const d=snapshot(),c=d.shop.catalog,old=c.addons[id];if(!old)return error('ไม่พบตัวเลือกเสริม');if(Object.values(c.menus).some(m=>m.active&&m.optionIds.includes(id))||Object.values(c.groups||{}).some(g=>g.active&&g.optionIds.includes(id)))return error('ยังลบไม่ได้: ตัวเลือกเสริมนี้อยู่ในเมนูหรือกลุ่มตัวเลือก กรุณานำออกก่อน');return mutate([{kind:'addon',payload:{entityId:id,input:{...clone(old),active:false,recipe:{},materialIds:[]},display:{...metadata({name:d.display.addons?.[id]?.name||old.name||id},d.display.addons?.[id]),deleted:true}}}])}),
  saveAddonGroup:guarded(input=>{
   version(input)
   const d=snapshot(),c=d.shop.catalog,id=input.id||`GROUP-${crypto.randomUUID()}`,ids=input.options.map(o=>o.addonId)
   const groups=new Map(catalogGroups(d).map(group=>[group.id,group]))
   groups.set(id,input)
   const menuEntries=[], detachBeforeGroup=[]
   for(const menu of catalogMenus(d)){
    const current=menu.addonGroupIds||[]
    const wasLinked=current.includes(id)
    const selected=input.menuIds===undefined?wasLinked:input.menuIds.includes(menu.id)
    const addonGroupIds=selected?[...current.filter(key=>key!==id),id]:current.filter(key=>key!==id)
    if(selected){
     const issue=cloudGroupBindingIssue(addonGroupIds.map(key=>groups.get(key)))
     if(issue)throw new Error(`${menu.name} · ${issue}`)
    }
    if(selected!==wasLinked){
     const entry={kind:'menu',payload:menuPayload({...menu,addonGroupIds,hasAddons:addonGroupIds.length>0})}
     if(!selected&&(input.isActive===false||current.length===2&&Number(input.maxSelections)>3))detachBeforeGroup.push(entry)
     else menuEntries.push(entry)
    }
   }
   if(input.newAddons?.length){
    const changed=new Map((input.updatedAddons||[]).map(addon=>[addon.id,addon]))
    const existing=catalogAddons(d).map(addon=>changed.get(addon.id)||addon)
    const materials=Object.fromEntries(d.materials.map(material=>[material.id,material]))
    const duplicate=duplicateNewStockOption(input.options,existing,input.newAddons,materials)
    if(duplicate)throw new Error(duplicate)
   }
   const entries=[...(input.newAddons||[]),...(input.updatedAddons||[])].map(addonCommand)
   entries.push({kind:'group',payload:{input:{id,name:input.name.trim(),active:input.isActive!==false,min:Number(input.minSelections),max:Number(input.maxSelections),allowRepeat:!!input.allowRepeat,pricingMode:input.pricingMode,optionIds:ids,optionPrices:Object.fromEntries(c.platformIds.map(p=>[p,{_:0,...Object.fromEntries(input.options.filter(o=>o.prices&&Object.hasOwn(o.prices,p)).map(o=>[o.addonId,scaled(o.prices[p])]))}]))},display:metadata({name:input.name.trim(),description:encodeGroupAvailability(input)},d.display.groups?.[id])}})
   return mutate([...detachBeforeGroup,...entries,...menuEntries])
  }),
  deleteAddonGroup:guarded((id,options={})=>{
   version(options)
   const d=snapshot(),old=d.shop.catalog.groups[id]
   if(!old)return error('ไม่พบกลุ่มตัวเลือก')
   if(old.active===false&&d.display.groups?.[id]?.deleted)return {ok:true}
   const menus=new Map(catalogMenus({...d,display:{...d.display,menus:{}}}).map(menu=>[menu.id,menu]))
   const entries=[]
   for(const menuId of old.menuIds){
    const menu=menus.get(menuId)
    if(!menu)throw new Error('ไม่พบเมนูที่เชื่อมกับกลุ่ม กรุณาโหลดข้อมูลล่าสุด')
    const addonGroupIds=(menu.addonGroupIds||[]).filter(groupId=>groupId!==id)
    const payload=menuPayload({...menu,addonGroupIds,hasAddons:addonGroupIds.length>0})
    if(d.display.menus?.[menuId])payload.display=clone(d.display.menus[menuId])
    entries.push({kind:'menu',payload})
   }
   const input=clone(old)
   delete input.revision;delete input.menuIds;delete input.multiMenuIds
   input.active=false
   entries.push({kind:'group',payload:{input,display:{...metadata({name:old.name},d.display.groups?.[id]),deleted:true}}})
   return mutate(entries)
  })
 }
}
