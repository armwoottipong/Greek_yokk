import { DEFAULT_CATEGORIES, DEFAULT_PLATFORMS } from '../data/initialData'
export const clone = value => JSON.parse(JSON.stringify(value))
export const DATABASE_FIELDS = ['materials','menus','addons','platforms','orders','activityLogs','categories','gasApiUrl','stockShortages']
export function normalizeDatabase(raw, { source = 'import' } = {}) {
  const errors = [], warnings = []
  const fail = (path, code, message = code) => errors.push({ path, code, message })
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {ok:false,errors:[{path:'',code:'INVALID_DATABASE',message:'ข้อมูลต้องเป็น object'}]}
  if (raw.schemaVersion != null && raw.schemaVersion !== 3) fail('schemaVersion','UNSUPPORTED_VERSION')
  const number = (value, path, fallback = 0) => {
    const n = value === undefined ? fallback : Number(value)
    if (value === null || value === '' || !Number.isFinite(n) || n < 0) { fail(path,'INVALID_NUMBER'); return fallback }
    return n
  }
  const date = (value,path) => {
    if (!value) return null
    const d = new Date(`${value}T00:00:00Z`)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(+d) || d.toISOString().slice(0,10)!==value) fail(path,'INVALID_DATE')
    return value
  }
  const value = { schemaVersion:3, revision:number(raw.revision,'revision'), categories:clone(raw.categories ?? DEFAULT_CATEGORIES),gasApiUrl:typeof raw.gasApiUrl==='string'?raw.gasApiUrl:'',stockShortages:[] }
  for (const field of ['materials','menus','addons','platforms','orders','activityLogs','stockShortages']) {
    const records=raw[field] ?? (field==='platforms'?DEFAULT_PLATFORMS:[])
    if (!Array.isArray(records)) { fail(field,'INVALID_COLLECTION'); value[field]=[]; continue }
    const ids=new Set()
    value[field]=records.map((record,index)=> {
      const p=`${field}[${index}]`
      if (!record || typeof record!=='object' || Array.isArray(record)) {fail(p,'INVALID_RECORD');return {}}
      const item=clone(record), id=field==='orders'?record.orderId:record.id
      if (field !=='stockShortages') {
        if (typeof id!=='string'||!id) fail(`${p}.id`,'MISSING_ID')
        if(ids.has(id))fail(`${p}.id`,'DUPLICATE_ID');ids.add(id)
      }
      if(field==='materials') {
        item.stock=number(record.stock,`${p}.stock`);item.unitCost=number(record.unitCost,`${p}.unitCost`)
        item.minAlert=number(record.minAlert,`${p}.minAlert`);item.packSize=number(record.packSize,`${p}.packSize`,1)
        if(item.packSize<=0)fail(`${p}.packSize`,'INVALID_PACK_SIZE')
        item.packCost=number(record.packCost,`${p}.packCost`,item.unitCost*item.packSize)
        item.lastStockInDate=date(record.lastStockInDate,`${p}.lastStockInDate`);item.expiryDate=date(record.expiryDate,`${p}.expiryDate`)
        if(record.shelfLifeDays!=null) item.shelfLifeDays=number(record.shelfLifeDays,`${p}.shelfLifeDays`)
        item.isDeleted=!!record.isDeleted
        if(record.lots!=null&&!Array.isArray(record.lots))fail(`${p}.lots`,'INVALID_COLLECTION')
        const lotIds=new Set()
        item.lots=(Array.isArray(record.lots)?record.lots:[]).map((lot,i)=> {
          const lp=`${p}.lots[${i}]`
          if(!lot||typeof lot!=='object'){fail(lp,'INVALID_LOT');return {id:'',qty:0}}
          const l={...clone(lot),id:lot.id||`LOT-${id}-LEGACY-${i}`,qty:number(lot.qty,`${lp}.qty`),unitCost:number(lot.unitCost,`${lp}.unitCost`,item.unitCost),packCost:number(lot.packCost,`${lp}.packCost`,item.packCost),receiveDate:date(lot.receiveDate,`${lp}.receiveDate`),expiryDate:date(lot.expiryDate,`${lp}.expiryDate`),isInUse:!!lot.isInUse}
          if(lotIds.has(l.id))fail(`${lp}.id`,'DUPLICATE_ID');lotIds.add(l.id)
          return l
        })
        if(!item.lots.length && item.stock>0)item.lots=[{id:`LOT-${id}-INIT`,qty:item.stock,initialQty:item.stock,unitCost:item.unitCost,packCost:item.packCost,receiveDate:item.lastStockInDate,expiryDate:item.expiryDate,isInUse:true,note:'ยอดยกมาเริ่มต้น'}]
        const total=Math.round(item.lots.reduce((s,l)=>s+l.qty,0)*100)/100
        if(Math.abs(total-item.stock)>0.005)fail(`${p}.stock`,'LOT_TOTAL_CONFLICT','ยอดรวมไม่ตรงล็อต ต้องตรวจข้อมูลก่อนกู้คืน')
        if(item.lots.filter(l=>l.qty>0&&l.isInUse).length>1)fail(`${p}.lots`,'MULTIPLE_ACTIVE_LOTS')
        if(item.lots.some(l=>l.qty>0)&&!item.lots.some(l=>l.qty>0&&l.isInUse))item.lots.find(l=>l.qty>0).isInUse=true
      }
      if(field==='platforms') {item.gpPercent=number(record.gpPercent,`${p}.gpPercent`);if(item.gpPercent>100)fail(`${p}.gpPercent`,'INVALID_GP')}
      if(field==='menus'||field==='addons') {
        if(record.prices!=null&&(typeof record.prices!=='object'||Array.isArray(record.prices)))fail(`${p}.prices`,'INVALID_PRICES')
        item.prices=Object.fromEntries(Object.entries(record.prices||{}).map(([k,v])=>[k,number(v,`${p}.prices.${k}`)]))
        if(field==='addons')item.amountUsed=number(record.amountUsed,`${p}.amountUsed`)
      }
      if(field==='orders')for(const k of ['subtotal','gpAmount','netRevenue','foodCost'])if(record[k]!=null)item[k]=number(record[k],`${p}.${k}`)
      return item
    })
  }
  for(const type of ['menu','material','addon'])if(!Array.isArray(value.categories?.[type]))fail(`categories.${type}`,'INVALID_COLLECTION')
  if(!value.platforms.length||!value.platforms.some(p=>p.isActive!==false))fail('platforms','NO_ACTIVE_PLATFORM')
  const materialIds=new Set(value.materials.map(m=>m.id))
  for(const [field,key] of [['menus','recipe'],['materials','subRecipe']])value[field].forEach((item,index)=> {
    if(item[key]!=null&&!Array.isArray(item[key])) {fail(`${field}[${index}].${key}`,'INVALID_COLLECTION');return}
    item[key]=(item[key]||[]).map((r,i)=> {
      if(!r||typeof r!=='object'){fail(`${field}[${index}].${key}[${i}]`,'INVALID_RECIPE');return {}}
      if(!materialIds.has(r.materialId))fail(`${field}[${index}].${key}[${i}]`,'MISSING_MATERIAL')
      return {...r,qty:number(r.qty,`${field}[${index}].${key}[${i}].qty`)}
    })
  })
  value.addons.forEach((a,i)=> {if(a.materialId&&!materialIds.has(a.materialId))fail(`addons[${i}].materialId`,'MISSING_MATERIAL')})
  const visit=(id,stack=[])=> {if(stack.includes(id)){fail(`materials.${id}.subRecipe`,'RECIPE_CYCLE');return}const m=value.materials.find(x=>x.id===id);for(const r of m?.subRecipe||[])visit(r.materialId,[...stack,id])}
  value.materials.forEach(m=>visit(m.id))
  if(!raw.schemaVersion)warnings.push({code:'LEGACY_MIGRATION',source})
  return errors.length?{ok:false,errors}:{ok:true,value,warnings}
}
