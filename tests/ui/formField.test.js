import {it,expect} from 'vitest'
import {mount} from '@vue/test-utils'
import FormField from '../../src/components/ui/FormField.vue'
it('pairs visible label, hint and error with the actual input',()=>{
 const w=mount(FormField,{props:{id:'price',label:'ราคาหน้าร้าน',required:true,hint:'บาท',error:'กรอกจำนวนตั้งแต่ 0'},slots:{default:'<template #default="{controlId,describedBy,invalid}"><input :id="controlId" :aria-describedby="describedBy" :aria-invalid="invalid"></template>'}})
 expect(w.get('label').attributes('for')).toBe('price')
 expect(w.get('input').attributes('aria-describedby')).toBe('price-hint price-error')
 expect(w.get('input').attributes('aria-invalid')).toBe('true')
 expect(w.get('[role="alert"]').text()).toContain('กรอกจำนวน')
 w.unmount()
})
