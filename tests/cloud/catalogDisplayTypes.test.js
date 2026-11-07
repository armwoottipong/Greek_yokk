import {it,expect} from 'vitest'
import {Timestamp} from 'firebase/firestore'
import {applyCatalogDisplay} from '../../src/cloud/core/catalogPlan.js'

it.each(['menus','addons','groups'])('preserves server timestamp metadata when saving %s after menu ordering',collection=>{
 const orderedAt=new Timestamp(1793966533,352000000)
 const before={menus:{M:{name:'Menu'}},addons:{A:{name:'Option'}},groups:{G:{name:'Group'}},menuOrder:['M'],menuOrderRevision:1,menuOrderUpdatedAt:orderedAt}
 const value={name:'Renamed',emoji:''},change={collection,entityId:'NEW',value}
 const next=applyCatalogDisplay(before,change)
 expect(next.menuOrderUpdatedAt).toBeInstanceOf(Timestamp)
 expect(next.menuOrderUpdatedAt.isEqual(orderedAt)).toBe(true)
 expect(next.menuOrderRevision).toBe(1)
 expect(next.menuOrder).toEqual(['M'])
 expect(next[collection].NEW).toEqual(value)
 expect(before[collection].NEW).toBeUndefined()
 value.name='Changed outside'
 expect(next[collection].NEW.name).toBe('Renamed')
})
