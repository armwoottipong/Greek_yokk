export function reorderExact(rows, ids) {
 if (!Array.isArray(ids) || ids.length !== rows.length || new Set(ids).size !== ids.length) throw new Error('INVALID_CATALOG_ORDER')
 const byId=new Map(rows.map(row=>[row.id,row]))
 if(ids.some(id=>!byId.has(id)))throw new Error('INVALID_CATALOG_ORDER')
 return ids.map(id=>byId.get(id))
}

// Deleted IDs are ignored; new items follow the saved order without disappearing.
export function applyDisplayOrder(rows, ids) {
 if(!Array.isArray(ids))return rows
 const byId=new Map(rows.map(row=>[row.id,row])),seen=new Set(),ordered=[]
 for(const id of ids)if(byId.has(id)&&!seen.has(id)){seen.add(id);ordered.push(byId.get(id))}
 return ordered.concat(rows.filter(row=>!seen.has(row.id)))
}

export const menuOrderFields=display=>({
 menuOrder:Array.isArray(display?.menuOrder)?display.menuOrder:[],
 menuOrderRevision:display?.menuOrderRevision||0,
 menuOrderCatalogRevision:display?.menuOrderCatalogRevision||0,
 menuOrderUpdatedBy:display?.menuOrderUpdatedBy||'',
 menuOrderUpdatedAt:display?.menuOrderUpdatedAt||null
})
export function withLatestMenuOrder(display, latest) {
 if(!display)return latest||display
 return latest && latest.menuOrderRevision>(display?.menuOrderRevision||0)?{...display,...latest}:display
}
