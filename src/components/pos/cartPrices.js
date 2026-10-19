export const menuPrice=(menu,platformId)=>(menu.prices&&menu.prices[platformId]!==undefined)?Number(menu.prices[platformId]):0
export { selectionPrice as addonPrice } from '@/domain/addonGroups'
import { selectionPrice as addonPrice } from '@/domain/addonGroups'
export const itemPrice=(item,platformId)=>(menuPrice(item.menu,platformId)+(item.selectedAddons||[]).reduce((sum,a)=>sum+addonPrice(a,platformId),0))*item.qty
