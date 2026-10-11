export const menuPrice=(menu,platformId)=>(menu.prices&&menu.prices[platformId]!==undefined)?Number(menu.prices[platformId]):0
export const addonPrice=(addon,platformId)=>(addon.prices&&addon.prices[platformId]!==undefined)?Number(addon.prices[platformId]):0
export const itemPrice=(item,platformId)=>(menuPrice(item.menu,platformId)+(item.selectedAddons||[]).reduce((sum,a)=>sum+addonPrice(a,platformId),0))*item.qty
