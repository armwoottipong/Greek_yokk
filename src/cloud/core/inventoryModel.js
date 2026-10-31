import {reactive,shallowRef} from 'vue'
import {planInventoryCommand} from './inventoryPlan.js'
import {createCatalogBindings} from './catalogBindings.js'
import {declaredMaterialReferences,materialDeletionEligibility} from './materialEligibility.js'
import {catalogMenus,catalogAddons,catalogGroups,catalogPlatforms} from './catalogPresentation.js'
import {projectMaterial} from './productPresentation.js'
import {buildMaterialUsage,getMaterialKind,MATERIAL_KIND_OPTIONS} from '@/domain/materialClassification'
import {EMOJI_CATALOG} from '@/data/initialData'
import {toScaledExact} from '../conversion.js'
const clone=v=>JSON.parse(JSON.stringify(v))
const scaled=v=>{const q=toScaledExact(Number(v),100);if(!q.ok||q.value<0)throw new Error('จำนวนต้องไม่ติดลบและมีทศนิยมไม่เกิน 2 ตำแหน่ง');return q.value}
const day=value=>value?Math.floor(Date.parse(`${value}T00:00:00Z`)/86400000):999999
const view=m=>{const p=projectMaterial(m);return {...p,yieldQty:m.productionRecipe?.yieldQ/100||0,subRecipe:m.productionRecipe?.inputIds?.map((materialId,i)=>({materialId,qty:m.productionRecipe.quantities[i]/100}))||[]}}
const snapshot=data=>clone({shop:data.shop,materials:data.materials,display:data.display})
const apply=(before,plan)=>({...before,shop:plan.nextShop,display:plan.displayChange?{...before.display,[plan.displayChange.collection]:{...before.display[plan.displayChange.collection],[plan.displayChange.entityId]:plan.displayChange.value}}:before.display,materials:[...before.materials.filter(m=>!(plan.removedMaterialIds||[]).includes(m.id)).map(m=>plan.nextMaterials.find(n=>n.id===m.id)||m),...plan.nextMaterials.filter(m=>!before.materials.some(b=>b.id===m.id))]})
const names={inventory:'รับเข้าสต็อก',produce:'ผลิตตามสูตร',stock_count:'ปรับยอดนับจริง',switch_lot:'สลับล็อตใช้งาน',material_create:'เพิ่มวัตถุดิบ',material_archive:'จัดเก็บวัตถุดิบ',material_metadata:'แก้ข้อมูลวัตถุดิบ',material_measure:'แก้หน่วยและต้นทุน',material_details:'แก้รายละเอียดวัตถุดิบ',material_type:'แก้ประเภทวัตถุดิบ',production_recipe:'แก้สูตรผลิต',material_delete:'ลบวัตถุดิบถาวร',history_clear:'ล้างหน้าประวัติ',menu:'บันทึกเมนู',addon:'บันทึก Add-on',group:'บันทึกกลุ่มตัวเลือก'}
export function createInventoryModel({getData,execute,loadServer,isReady,isBlocked,storageKey,readHistory=async()=>({logs:[]})}){
 let alive=true,historyRequest=0
 const latest=shallowRef(snapshot(getData())),virtual=shallowRef(latest.value)
 const state=reactive({base:null,commands:[],uncertain:false,conflict:false,saving:false,historyLoading:false,logs:[],toasts:[],modals:Object.fromEntries(['stockIn','stockAdjust','stocktake','waste','materialEdit','activityLog','confirm','lotDepletion','emojiPicker','menuEdit','addonEdit'].map(id=>[id,{isOpen:false}]))})
 const error=message=>{model.showToast(message,'error');return {ok:false,message}}
 function persist(){try{sessionStorage.setItem(storageKey,JSON.stringify({base:state.base,commands:state.commands,uncertain:state.uncertain,conflict:state.conflict}));return true}catch{return false}}
 function rebuild(){virtual.value=state.base?clone(state.base):latest.value;for(const c of state.commands)virtual.value=apply(virtual.value,planInventoryCommand(virtual.value.shop,virtual.value.materials,clone(c)))}
 try{const saved=JSON.parse(sessionStorage.getItem(storageKey)||'null');if(saved?.commands?.length){state.base=saved.base;state.commands=saved.commands;state.uncertain=!!saved.uncertain;state.conflict=!!saved.conflict;rebuild();if(latest.value.shop.revision!==state.base.shop.revision)state.conflict=true}}catch{state.conflict=true}
 function guard(){if(!alive||!isReady()||isBlocked()||state.saving||state.uncertain||state.conflict)throw new Error(state.conflict?'ยอดร้านเปลี่ยนระหว่างทำแบบร่าง กรุณายกเลิกแบบร่างที่ยังไม่บันทึกและตรวจยอดใหม่':'ยังบันทึกไม่ได้ กรุณาเชื่อมต่อและตรวจผลรายการค้างก่อน')}
 function stageMany(entries){
  if(!entries.length)return {ok:true,success:true}
  const before={base:state.base,commands:[...state.commands],projection:virtual.value}
  try{guard();if(!state.base)state.base=clone(latest.value)
   for(const entry of entries){const command={opId:crypto.randomUUID(),kind:entry.kind,payload:{...clone(entry.payload),expectedRevision:virtual.value.shop.revision}};const result=planInventoryCommand(virtual.value.shop,virtual.value.materials,command);virtual.value=apply(virtual.value,result);state.commands.push(command)}
   if(!persist())throw new Error('พื้นที่เก็บแบบร่างไม่พร้อม กรุณาเปิดพื้นที่จัดเก็บก่อนบันทึก')
   return {ok:true,success:true}
  }catch(e){state.base=before.base;state.commands=before.commands;virtual.value=before.projection;return error(e.message)}
 }
 function countRequest(materialId,newStock,reason,note,lotId){
  const m=virtual.value.materials.find(m=>m.id===materialId);if(!m)throw new Error('ไม่พบวัตถุดิบ')
  const target=scaled(newStock)
  if(!lotId&&target===m.stock)return {materialId,mode:'count',reason:reason||'',note:note||'',counts:[]}
  // Match the original stockAdjust: active first, then the stored lot order.
  const active=m.lotIds.find(id=>id===m.activeLotId&&m.lotQty[id]>0)||m.lotIds.find(id=>m.lotQty[id]>0)
  const increase=m.activeLotId||m.lotIds.find(id=>m.zeroActiveIds.includes(id))||m.lotIds[0]
  const ids=lotId?[lotId]:target>m.stock?(increase?[increase]:[]):[active,...m.lotIds.filter(id=>id!==active&&m.lotQty[id]>0)].filter(Boolean)
  if(!ids.length)throw new Error('รายการนี้ยังไม่มีล็อต กรุณารับเข้าล็อตแรกก่อนตรวจนับ')
  if(lotId)return {materialId,mode:'count',reason:reason||'นับสต็อกจริงรายวัน',note:note||'',counts:[{id:lotId,to:target}]}
  let difference=target-m.stock
  const counts=ids.map(id=>({id,to:m.lotQty[id]}))
  if(difference>0)counts[0].to+=difference
  else for(const c of counts){const take=Math.min(c.to,-difference);c.to-=take;difference+=take}
  if(difference<0)throw new Error('จัดสรรยอดนับลงล็อตไม่ครบ กรุณาตรวจนับแยกล็อต')
  return {materialId,mode:'count',reason:reason||'นับสต็อกจริงรายวัน',note:note||'',counts:counts.filter(c=>c.to!==m.lotQty[c.id])}
 }
 async function commit(){
  if(state.saving)return error('กำลังบันทึกแบบร่างนี้ กรุณารอผล')
  if(isBlocked())return error('มีรายการอื่นรอตรวจผล กรุณาตรวจผลจากแถบสถานะด้านบนก่อนบันทึก')
  if(!isReady())return error('ยังยืนยันการเชื่อมต่อเซิร์ฟเวอร์ไม่ได้ แบบร่างยังอยู่ กรุณาเชื่อมต่อแล้วลองใหม่')
  if(!state.commands.length)return {ok:true,success:true}
  if(state.conflict&&!state.uncertain)return error('ยอดร้านเปลี่ยน กรุณายกเลิกแบบร่างที่ยังไม่บันทึกแล้วตรวจยอดใหม่')
  state.saving=true
  let completed=0
  const firstKind=state.commands[0]?.kind
  try{
   const fresh=await loadServer()
   if(!state.uncertain&&fresh.shop.revision!==state.base.shop.revision){state.conflict=true;persist();return error('ยอดร้านเปลี่ยนจากเครื่องอื่น ยังไม่บันทึกแบบร่าง กรุณาตรวจยอดใหม่')}
   while(state.commands.length){
    const command=clone(state.commands[0]),wasUncertain=state.uncertain;state.uncertain=true
    if(!persist()){state.uncertain=wasUncertain;throw new Error('เก็บคำสั่งไม่ได้ จึงยังไม่ส่งข้อมูล')}
    const result=await execute(command)
    if(!alive)return {ok:false}
    if(!result?.ok){
     if(result?.outcome==='not_submitted'||!wasUncertain&&result?.outcome==='blocked'){state.uncertain=false;state.commands[0].opId=crypto.randomUUID();persist();return error(result.message||'ยังไม่ได้ส่งข้อมูล แบบร่างยังอยู่ สามารถแก้ไขหรือยกเลิกได้')}
     return error(`ยังไม่ทราบผลรายการ ${names[command.kind]}${completed?` · ยืนยันแล้ว ${completed} คำสั่ง`:''} กรุณาตรวจผลคำสั่งเดิมก่อนทำต่อ`)
    }
    if(result.value?.rejected){acknowledge(result.value);return error('ยอดร้านเปลี่ยน คำสั่งที่ยังไม่สำเร็จถูกหยุดแล้ว กรุณาตรวจแบบร่างที่เหลือใหม่')}
    // The parent also calls acknowledge; this makes the model usable by a direct service adapter.
    acknowledge(result.value||{opId:command.opId,kind:command.kind});completed++
   }
   model.showToast(['menu','addon','group'].includes(firstKind)?`${names[firstKind]}สำเร็จ · ยืนยันจาก Firebase แล้ว`:'บันทึกข้อมูลคลังสำเร็จ · ยืนยันจาก Firebase แล้ว','success');return {ok:true,success:true}
  }catch(e){return error(e.message||'บันทึกไม่สำเร็จ แบบร่างยังอยู่')}finally{state.saving=false}
 }
 function acknowledge(value){
  if(!alive||!value||state.commands[0]?.opId!==value.opId)return
  if(value.rejected){state.uncertain=false;state.conflict=true;persist();return}
  const command=clone(state.commands[0]),confirmed=apply(clone(state.base),planInventoryCommand(clone(state.base.shop),clone(state.base.materials),command))
  state.commands.shift();state.base=state.commands.length?confirmed:null;state.uncertain=false
  if(latest.value.shop.revision<=confirmed.shop.revision)latest.value=confirmed
  if(!state.commands.length)state.conflict=false
  if(command.kind==='history_clear'){historyRequest++;state.historyLoading=false;state.logs=[]}
  rebuild();persist()
 }
 const recipes=(kind)=>Object.entries(virtual.value.shop.catalog[kind]||{}).map(([id,row])=>({id,isDeleted:!!virtual.value.display[kind]?.[id]?.deleted,name:virtual.value.display[kind]?.[id]?.name||row.name||id,recipe:Object.entries(row.rawRecipe||row.recipe||{}).filter(([,q])=>q>0).map(([materialId,q])=>({materialId,qty:q/100}))}))
 const valuation=rows=>rows.filter(m=>!m.isDeleted).reduce((n,m)=>n+Math.max(0,m.stock)*(m.unitCost||0),0)
 const model=reactive({
  ...createCatalogBindings({snapshot:()=>virtual.value,mutate,error}),
  get catalogRevision(){return virtual.value.shop.catalogRevision},
  get menus(){return catalogMenus(virtual.value)},get addons(){return catalogAddons(virtual.value)},get addonGroups(){return catalogGroups(virtual.value)},get platforms(){return catalogPlatforms(virtual.value)},
  get inventorySaving(){return state.saving},get unresolvedDraftCommand(){return state.uncertain?state.commands[0]||null:null},modals:state.modals,emojiCatalog:EMOJI_CATALOG,get toasts(){return state.toasts},get activityLogs(){return state.logs},get orders(){return []},
  get materials(){return virtual.value.materials.map(view)},get activeMaterials(){return this.materials.filter(m=>!m.isDeleted)},get matMap(){return Object.fromEntries(this.materials.map(m=>[m.id,m]))},
  get materialKindOptions(){return MATERIAL_KIND_OPTIONS},getMaterialKind,get materialUsageById(){return buildMaterialUsage({materials:this.materials,menus:recipes('menus'),addons:recipes('addons')})},
  get lowStockMaterials(){return this.activeMaterials.filter(m=>m.stock<=m.minAlert)},get outOfStockMaterials(){return this.activeMaterials.filter(m=>m.stock<=0)},
  get stockDraftSnapshot(){return (state.base?.materials||latest.value.materials).map(view)},get hasStockDrafts(){return state.commands.length>0},
  get totalInventoryValuation(){return valuation(this.stockDraftSnapshot)},get projectedInventoryValuation(){return valuation(this.materials)},get draftInventoryValuationDiff(){return this.projectedInventoryValuation-this.totalInventoryValuation},get reorderBudgetNeeded(){return this.activeMaterials.reduce((n,m)=>n+Math.max(0,2*m.minAlert-m.stock)*m.unitCost,0)},
  get stockDraftSummary(){const ids=new Set(state.commands.flatMap(c=>c.payload.requests?.map(r=>r.materialId)||[c.payload.materialId||c.payload.input?.id]));const items=[...ids].filter(Boolean).map(id=>{const m=this.matMap[id],before=this.stockDraftSnapshot.find(m=>m.id===id),c=[...state.commands].reverse().find(c=>c.payload.materialId===id||c.payload.input?.id===id||c.payload.requests?.some(r=>r.materialId===id));return {id,materialId:id,name:m?.name||id,emoji:m?.emoji||'',unit:m?.unit||'',title:names[c?.kind]||'แก้ข้อมูล',description:c?.payload.requests?.find(r=>r.materialId===id)?.mode==='waste'?'บันทึกของเสีย':names[c?.kind]||'',delta:(m?.stock||0)-(before?.stock||0)}});return {count:items.length,items,text:items.map(i=>i.name).join(', ')}},
  showToast(message,type='info'){state.toasts.push({id:crypto.randomUUID(),message,type})},dismissToast(id){state.toasts=state.toasts.filter(t=>t.id!==id)},
  initStockDraftSnapshot(){},commitStockDrafts:commit,
  discardStockDrafts(){if(state.saving||state.uncertain)return error('แบบร่างนี้มีคำสั่งที่รอตรวจผล กรุณาตรวจผลจากแถบสถานะด้านบนก่อนยกเลิก');state.commands=[];state.base=null;state.conflict=false;virtual.value=latest.value;persist();return {ok:true}},
  getMaterialTrackingMode:m=>!m||m.inventoryType==='packaging'?'none':'expiry_and_receive',
  getMaterialLots(m,showDepleted=false){return (m?.lots||[]).filter(l=>showDepleted||l.qty>0).sort((a,b)=>Number(b.isInUse)-Number(a.isInUse)||(a.expiryDate||'9999').localeCompare(b.expiryDate||'9999')||(a.receiveDate||'').localeCompare(b.receiveDate||''))},
  getMaterialUsage(id){const refs=declaredMaterialReferences(virtual.value,id),production=virtual.value.shop.productionUsers?.[id]||[];const name=ref=>`${ref.name}${ref.retired?' (ลบแล้ว)':''}`;return {isInUse:refs.length>0||production.length>0,usedInMenus:refs.filter(ref=>ref.collection==='menus').map(name),usedInAddons:refs.filter(ref=>ref.collection==='addons').map(name),usedInMaterials:production.map(key=>this.matMap[key]?.name||key)}},
  getLotActionPreview(m,receiveDate,expiryDate){const same=m?.lots?.some(l=>(l.receiveDate||'')===(receiveDate||'')&&(l.expiryDate||'')===(expiryDate||''));return {action:same?'merge_lot':'new_lot',label:m?.inventoryType==='packaging'?'บวกเข้ายอดบรรจุภัณฑ์':same?'รับเพิ่มในล็อตวันที่เดียวกัน':'เปิดล็อตใหม่ตามวันที่รับเข้าและหมดอายุ',shortLabel:same?'รวมล็อตเดิม':'เปิดล็อตใหม่',badgeClass:'text-stone-600'}},
  checkLotDepletion(id,qty){const m=this.matMap[id],lots=this.getMaterialLots(m),current=lots.find(l=>l.isInUse)||lots[0],next=lots.find(l=>l.id!==current?.id&&l.qty>0),available=current?.qty||0;return {currentLot:current||null,nextLot:next||null,willDeplete:qty>=available,isShort:qty>available,isLow:available>0&&available-qty<available*.1,availableInCurrent:available,neededQty:qty,remainingAfter:available-qty,shortageQty:Math.max(0,qty-available)}},
  promptLotDepletion(info){return new Promise(resolve=>{const m=info.material;state.modals.lotDepletion={...info,isOpen:true,materialId:m?.id,materialName:m?.name,materialEmoji:m?.emoji,unit:m?.unit,onConfirm:()=>{state.modals.lotDepletion.isOpen=false;resolve(true)},onCancel:()=>{state.modals.lotDepletion.isOpen=false;resolve(false)}}})},
  confirmDialog(options){return new Promise(resolve=>{state.modals.confirm={...options,isOpen:true,onConfirm:()=>resolve(true),onCancel:()=>resolve(false)}})},
  stockIn(materialId,qty,unitCost,note='',packCost=null,dates={}){return stageMany([{kind:'inventory',payload:{materialId,input:{qtyQ:scaled(qty),unitCost:Number(unitCost),note,receiveDay:day(dates.receiveDate),expiryDay:day(dates.expiryDate),...(packCost===null?{}:{packCostCents:scaled(packCost)}),newLotId:`LOT-${crypto.randomUUID()}`,lotCreatedAtISO:new Date().toISOString()}}}])},
  batchProduce(materialId,qty,ingredients,note='',dates={}){return stageMany([{kind:'produce',payload:{materialId,input:{qtyQ:scaled(qty),note,receiveDay:day(dates.receiveDate),expiryDay:day(dates.expiryDate),lotId:`LOT-${crypto.randomUUID()}`,lotCreatedAtISO:new Date().toISOString()}}}])},
  stockAdjust(materialId,newStock,reason,note,asDraft,lotId){try{const request=countRequest(materialId,newStock,reason,note,lotId);if(!request.counts.length)return {ok:true};return stageMany([{kind:'stock_count',payload:{requests:[request]}}])}catch(e){return error(e.message)}},
  batchStocktake(items){try{const requests=items.map(i=>countRequest(i.materialId,i.newStock,i.reason||'ตรวจนับสต็อกปิดร้าน',i.note)).filter(r=>r.counts.length);const entries=[];for(let i=0;i<requests.length;i+=18)entries.push({kind:'stock_count',payload:{requests:requests.slice(i,i+18)}});return stageMany(entries)}catch(e){return error(e.message)}},
  switchActiveLot(materialId,lotId){return stageMany([{kind:'switch_lot',payload:{materialId,lotId}}])},switchActiveLotSilently(materialId,lotId){return this.switchActiveLot(materialId,lotId)},
  recordLotWaste({materialId,lotId,wasteQty,reason,note=''}){try{const m=virtual.value.materials.find(m=>m.id===materialId),qty=scaled(wasteQty),from=m?.lotQty[lotId];return stageMany([{kind:'stock_count',payload:{requests:[{materialId,mode:'waste',reason,note,requestedQ:qty,counts:[{id:lotId,to:Math.max(0,from-qty)}]}]}}])}catch(e){return error(e.message)}},
  openStocktakeModal(){state.modals.stocktake={isOpen:true}},openWasteModal(materialId,lotId){state.modals.waste={isOpen:true,materialId,lotId}},closeWasteModal(){state.modals.waste.isOpen=false},
  cloud:true,get historyLoading(){return state.historyLoading},
  async openActivityLog(module='stock',targetMaterialId=null){state.modals.activityLog={isOpen:true,module,targetMaterialId};await refreshHistory()},
  closeActivityLog(){historyRequest++;state.historyLoading=false;state.modals.activityLog.isOpen=false},
  async clearActivityLogs(){const result=await mutate([{kind:'history_clear',payload:{}}]);if(result.ok){state.logs=[];await refreshHistory()}return result},
  undoOrder(){return error('กรุณาคืนบิลจากปุ่มประวัติด้านบน')},

  materialDeletionEligibility(id){return materialDeletionEligibility(virtual.value,id)},
  async softDeleteMaterial(id){
   if(state.commands.length)return error('กรุณาบันทึกหรือยกเลิกแบบร่างคลังก่อนจัดเก็บวัตถุดิบ')
   const refs=declaredMaterialReferences(virtual.value,id),live=refs.filter(ref=>!ref.retired)
   if(live.length)return error(`ยังจัดเก็บไม่ได้: มีสูตรอ้างอิง ${live.map(ref=>ref.name).join(', ')} กรุณานำวัตถุดิบออกจากสูตรก่อน`)
   const users=virtual.value.shop.productionUsers?.[id]||[]
   if(users.length)return error(`ยังจัดเก็บไม่ได้: ใช้ในสูตรผลิต ${users.map(key=>this.matMap[key]?.name||key).join(', ')}`)
   if(refs.length&&!await this.confirmDialog({title:'นำสูตรของรายการที่ลบแล้วออก?',message:`${refs.map(ref=>ref.name).join(', ')} ยังมีสูตรอ้างอิง จะนำสูตรของรายการที่ลบแล้วออกจากการใช้งานเพื่อจัดเก็บวัตถุดิบ ประวัติบิลเดิมยังอยู่`,confirmText:'นำสูตรออกและจัดเก็บ',cancelText:'เก็บไว้'}))return {ok:false}
   return mutate([...this.retiredMaterialCommands(id),{kind:'material_archive',payload:{materialId:id,deleted:true}}])
  },
  async restoreMaterial(id){return mutate([{kind:'material_archive',payload:{materialId:id,deleted:false}}])},
  async deleteMaterialPermanently(id){const eligibility=this.materialDeletionEligibility(id);if(!eligibility.allowed)return error(`ยังลบไม่ได้: ${eligibility.blockers.join(' · ')}`);return mutate([{kind:'material_delete',payload:{materialId:id}}])},
  async saveMaterial(input){
   if(state.commands.length)return error('กรุณาบันทึกหรือยกเลิกแบบร่างคลังก่อนแก้ข้อมูลวัตถุดิบ')
   try{
    const id=input.id||`MAT-${crypto.randomUUID()}`,current=virtual.value.materials.find(m=>m.id===id),entries=[]
    const metadata={name:input.name,emoji:input.emoji||'',minAlertQ:scaled(input.minAlert||0)},measure={unit:input.unit,packSize:Number(input.packSize),unitCost:Number(input.unitCost),packCostCents:scaled(input.packCost||0)},details={category:input.category??null,packUnit:input.packUnit||null,shelfLifeDays:input.shelfLifeDays??null,isSubIngredient:!!input.isSubIngredient}
    if(!current)entries.push({kind:'material_create',payload:{input:{id,...metadata,unit:input.unit,packSize:Number(input.packSize),inventoryType:input.inventoryType||'ingredient'}}})
    if(current&&Object.entries(metadata).some(([k,v])=>current[k]!==v))entries.push({kind:'material_metadata',payload:{materialId:id,metadata}})
    if(!current||Object.entries(measure).some(([k,v])=>current[k]!==v))entries.push({kind:'material_measure',payload:{materialId:id,measure}})
    if(!current||Object.entries(details).some(([k,v])=>current[k]!==v))entries.push({kind:'material_details',payload:{materialId:id,details}})
    const recipe=input.hasSubRecipe?{inputIds:input.subRecipe.map(r=>r.materialId),quantities:input.subRecipe.map(r=>scaled(r.qty)),yieldQ:scaled(input.yieldQty||input.packSize)}:null
    const recipeChanged=JSON.stringify(recipe)!==JSON.stringify(current?.productionRecipe||null)
    if(recipeChanged&&!recipe)entries.push({kind:'production_recipe',payload:{materialId:id,recipe:{}}})
    if(current&&input.inventoryType!==current.inventoryType)entries.push({kind:'material_type',payload:{materialId:id,inventoryType:input.inventoryType}})
    if(recipeChanged&&recipe)entries.push({kind:'production_recipe',payload:{materialId:id,recipe}})
    if(Number(input.stock)>(current?.stock||0)/100){const qty=scaled(Number(input.stock)-(current?.stock||0)/100),produce=!!recipe;entries.push({kind:produce?'produce':'inventory',payload:{materialId:id,input:{qtyQ:qty,note:'ยอดตั้งต้นจากการบันทึกวัตถุดิบ',receiveDay:day(input.lastStockInDate||new Date(Date.now()+7*3600000).toISOString().slice(0,10)),expiryDay:day(input.expiryDate),lotCreatedAtISO:new Date().toISOString(),...(produce?{lotId:`LOT-${crypto.randomUUID()}`}:{unitCost:measure.unitCost,newLotId:`LOT-${crypto.randomUUID()}`})}}})}
    if(current&&Number(input.stock)<current.stock/100)entries.push({kind:'stock_count',payload:{requests:[countRequest(id,input.stock,'ปรับยอดจากข้อมูลวัตถุดิบ','')]}})
    return mutate(entries)
   }catch(e){return error(e.message)}
  },
  update(data){if(data.shop.revision<latest.value.shop.revision)return;const oldCutoff=latest.value.shop.inventoryHistoryCutoff||0;latest.value=snapshot(data);if((data.shop.inventoryHistoryCutoff||0)!==oldCutoff){state.logs=[];if(state.modals.activityLog.isOpen)void refreshHistory()}if(!state.commands.length)virtual.value=latest.value;else if(latest.value.shop.revision!==state.base.shop.revision&&!state.saving&&!state.uncertain)state.conflict=true},
  acknowledge,
  close(){alive=false;for(const modal of Object.values(state.modals)){modal.onCancel?.();modal.isOpen=false}}
 })
 async function refreshHistory(){
  const request=++historyRequest;state.historyLoading=true
  try{const result=await readHistory({clearedThroughRevision:latest.value.shop.inventoryHistoryCutoff||0});if(alive&&request===historyRequest){state.logs=result.logs;if(result.truncated)model.showToast('แสดงประวัติ Firebase 500 รายการล่าสุดต่อประเภท','info')}}catch{if(alive&&request===historyRequest)model.showToast('โหลดประวัติไม่ได้ กรุณาเชื่อมต่อแล้วลองใหม่','error')}finally{if(request===historyRequest)state.historyLoading=false}
 }
 async function mutate(entries){if(state.commands.length)return error('กรุณาบันทึกแบบร่างคลังก่อนแก้ข้อมูล');const staged=stageMany(entries);return staged.ok?commit():staged}
 for(const method of ['stockIn','batchProduce','recordLotWaste','switchActiveLot','switchActiveLotSilently']){const action=model[method];model[method]=(...args)=>{try{return action.apply(model,args)}catch(e){return error(e.message)}}}
 return model
}
