import { decodeSummaryMaterial } from './summaryFixture.js'
import { prepareStockMaterial,planSetStockIn } from './setStockInFixture.js'

export function summaryStock(shop,material,input={}){
  const before=structuredClone(material)
  const regular=prepareStockMaterial(decodeSummaryMaterial(before))
  const f=planSetStockIn(shop,regular,input)
  const next=f.next
  for(const lot of Object.values(next.lots))lot.sortKey=lot.expiryDay*1e9+lot.receiveDay*1000+lot.ordinal
  next.lotQty=Object.fromEntries(Object.entries(next.lots).map(([id,l])=>[id,l.qty]))
  next.zeroActiveIds=next.lotIds.filter(id=>next.lotQty[id]===0&&next.lots[id].isInUse)
  for(const id of before.lotIds){next.lots[id].qty=before.lots[id].qty;next.lots[id].isInUse=before.lots[id].isInUse}
  return {...f,before,next}
}
