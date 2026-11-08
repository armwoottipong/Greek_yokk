import {it,expect} from 'vitest'
import {businessDay,dayKey,consumePreorder,scheduledSummary,isOrderEntry} from '../../src/cloud/core/orderEntry.js'

const id='ENTRY-PRE-1-01234567-0123-0123-0123-012345678901'
const op=id+'_01234567-0123-0123-0123-012345678901'

it('distinguishes an entered sale, a scheduled conversion and an ordinary POS receipt',()=>{
 const day=businessDay('2026-11-08')
 expect(dayKey(day)).toBe('2026-11-08')
 expect(isOrderEntry(op)).toBe(true)
 expect(isOrderEntry('ENTRY-'+day+'-01234567-0123-0123-0123-012345678901')).toBe(true)
 expect(isOrderEntry('SALE-1')).toBe(false)
})

it('consumes only the selected due preorder and rejects any repeat',()=>{
 const shop={preorders:{[id]:{pickupDay:20001,quoteCents:9000},other:{pickupDay:20002,quoteCents:7000}}}
 expect(()=>consumePreorder(shop,shop,op,20000)).toThrow('PREORDER_NOT_DUE')
 const next=consumePreorder(shop,{...shop,revision:2},op,20001)
 expect(scheduledSummary(next.preorders)).toMatchObject({subtotalCents:7000,orders:[{id:'other'}]})
 expect(shop.preorders[id]).toBeDefined()
 expect(()=>consumePreorder(next,next,op,20001)).toThrow('PREORDER_NO_LONGER_PENDING')
})
