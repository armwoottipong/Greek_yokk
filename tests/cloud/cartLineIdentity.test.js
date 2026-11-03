import {it,expect} from 'vitest'
import {sameCartPreparation} from '../../src/cloud/core/cartLineIdentity.js'

it('compares menu, note, and option quantities without treating selection order as a difference',()=>{
 const base={menuId:'M',qty:1,note:' แยกน้ำผึ้ง ',optionIds:['B','A','A']}
 expect(sameCartPreparation(base,{menuId:'M',qty:3,note:'แยกน้ำผึ้ง',optionIds:['A','B','A']})).toBe(true)
 expect(sameCartPreparation(base,{...base,note:''})).toBe(false)
 expect(sameCartPreparation(base,{...base,optionIds:['A','B']})).toBe(false)
 expect(sameCartPreparation(base,{...base,menuId:'OTHER'})).toBe(false)
 const grouped={menuId:'M',selections:[{groupId:'FRUIT',id:'A',selectionQty:2},{groupId:'TOPPING',id:'B',selectionQty:1}]}
 expect(sameCartPreparation(grouped,{menuId:'M',selections:[{groupId:'TOPPING',id:'B',selectionQty:1},{groupId:'FRUIT',id:'A',selectionQty:2}]})).toBe(true)
 expect(sameCartPreparation(grouped,{menuId:'M',selections:[{groupId:'TOPPING',id:'B',selectionQty:1},{groupId:'FRUIT',id:'A',selectionQty:1}]})).toBe(false)
})
