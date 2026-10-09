import {it,expect} from 'vitest'
import {normalizeDatabase} from '../../src/domain/database'
const base=()=>({materials:[],menus:[],addons:[],orders:[],activityLogs:[]})
it('rejects timestamps and item shapes that would break rendered history',()=> {
 expect(normalizeDatabase({...base(),orders:[{orderId:'O',createdAt:'not a date',items:{}}]}).ok).toBe(false)
 expect(normalizeDatabase({...base(),activityLogs:[{id:'L',timestamp:'not a date'}]}).ok).toBe(false)
})
it('rejects boolean quantities while retaining a signed historical loss',()=> {
 expect(normalizeDatabase({...base(),menus:[{id:'M',prices:{PLAT01:true},recipe:[]}]}).ok).toBe(false)
 const r=normalizeDatabase({...base(),orders:[{orderId:'O',grossProfit:'-10',items:[]}]})
 expect(r.ok).toBe(true);expect(r.value.orders[0].grossProfit).toBe(-10)
})
it('rejects malformed category records and discovers missing legacy categories',()=> {
 expect(normalizeDatabase({...base(),categories:{menu:[null],material:[],addon:[]}}).ok).toBe(false)
 const r=normalizeDatabase({...base(),menus:[{id:'M',category:'Custom',prices:{PLAT01:10},recipe:[]}]},{source:'legacy'})
 expect(r.ok).toBe(true);expect(r.value.categories.menu.some(c=>c.name==='Custom')).toBe(true)
})
