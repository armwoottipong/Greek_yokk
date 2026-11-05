import {it,expect} from 'vitest'
import {encodeGroupAvailability,groupAvailability} from '../../src/cloud/core/groupAvailability.js'
import {optionPrices} from '../../src/domain/addonGroups.js'

it('fits full 45-option price states in the existing display metadata limit and reloads each channel',()=>{
 const platformIds=Array.from({length:4},(_,i)=>`P${i}${'x'.repeat(190)}`)
 const group={id:'G',warnLowStock:true,autoPauseOutOfStock:true,options:Array.from({length:45},(_,i)=>({addonId:`A${i}`,paused:true,unpricedPlatformIds:platformIds}))}
 const description=encodeGroupAvailability(group,platformIds)
 expect(description.length).toBeLessThanOrEqual(1000)
 const loaded=groupAvailability({shop:{catalog:{platformIds}},display:{groups:{G:{description}}}},{id:'G',optionIds:group.options.map(o=>o.addonId)})
 expect(loaded.unpricedById.A44).toEqual(platformIds)
 expect(loaded.pausedIds.size).toBe(45)
})
it('keeps legacy included prices free and does not replace unset prices with addon fallback prices',()=>{
 expect(optionPrices({pricingMode:'included'},{},{prices:{}},['P'])).toEqual({P:0})
 expect(optionPrices({pricingMode:'extra'},{prices:{Q:0},unpricedPlatformIds:['P']},{prices:{P:30,Q:20}})).toEqual({Q:0})
})
