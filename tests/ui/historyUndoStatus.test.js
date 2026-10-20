import {it, expect} from 'vitest'
import {mount} from '@vue/test-utils'
import HistoryLogEntry from '../../src/components/ui/HistoryLogEntry.vue'

const log = {id:'L', action:'order_complete', title:'ขาย', targetId:'O', delta:100, timestamp:'2026-10-20T01:00:00Z'}
it.each([
 [{...log}, {orderId:'O', status:'cancelled', items:[], subtotal:100}],
 [{...log, action:'order_cancel', delta:undefined}, null]
])('marks reversed history with an icon and visible highlighted status while collapsed', (entry, order) => {
 const wrapper = mount(HistoryLogEntry, {props:{log:entry, order}})
 expect(wrapper.attributes('open')).toBeUndefined()
 expect(wrapper.classes()).toContain('history-entry--reversed')
 const summary = wrapper.get('summary')
 expect(summary.text()).toContain('ย้อนกลับแล้ว')
 expect(summary.get('[data-undo-icon]').attributes('aria-hidden')).toBe('true')
 expect(summary.get('.history-reversed-status').text()).toBe('ย้อนกลับแล้ว')
 if (entry.delta) expect(summary.get('[data-history-delta]').classes()).toContain('line-through')
 wrapper.unmount()
})
it('keeps active sales unhighlighted and gives the undo button an icon', () => {
 const wrapper = mount(HistoryLogEntry, {props:{log, order:{orderId:'O', items:[], subtotal:100, inventoryAllocations:[]}}})
 expect(wrapper.classes()).not.toContain('history-entry--reversed')
 expect(wrapper.find('.history-reversed-status').exists()).toBe(false)
 expect(wrapper.get('button').get('svg').attributes('aria-hidden')).toBe('true')
 wrapper.unmount()
})
