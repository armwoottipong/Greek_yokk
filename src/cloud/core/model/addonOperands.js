// Core v1 planner. Rules independently validate every persisted result.
// Receipt operands: every selected addon has exactly one slot.
export function addonOperands(lines,catalog){
  const selected=new Set(lines.flatMap(line=>line.optionIds))
  const ids=catalog.addonIds.filter(id=>selected.has(id))
  if(ids.length!==selected.size||ids.length>11)throw new Error('Unsupported distinct addons per sale')
  return {
    addonKeys:Object.fromEntries(Array.from({length:11},(_,i)=>[`A${i}`,ids[i]||'_'])),
    addonCounts:Object.fromEntries(Array.from({length:11},(_,i)=>[`A${i}`,i<ids.length?lines.reduce((sum,line)=>sum+(line.optionQuantities[ids[i]]||0)*line.qty,0):0])),
  }
}
