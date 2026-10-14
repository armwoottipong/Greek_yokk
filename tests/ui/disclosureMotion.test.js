import {it,expect,vi} from 'vitest'
import {vSmoothDisclosure} from '../../src/directives/smoothDisclosure'

function setup(reduced=false) {
 const el=document.createElement('details')
 el.innerHTML='<summary>สูตร</summary><div><input value="draft"></div>'
 document.body.append(el)
 const animations=[]
 el.animate=vi.fn(()=>{const animation={onfinish:null,cancel:vi.fn()};animations.push(animation);return animation})
 vi.stubGlobal('matchMedia',()=>({matches:reduced}))
 vSmoothDisclosure.mounted(el)
 return {el,summary:el.querySelector('summary'),animations,cleanup:()=>{vSmoothDisclosure.unmounted(el);el.remove();vi.unstubAllGlobals()}}
}
it('reverses rapid disclosure changes without dropping the draft or exposing closing controls',()=>{
 const {el,summary,animations,cleanup}=setup()
 try {
  summary.click();expect(el.open).toBe(true)
  summary.click();expect(animations[0].cancel).toHaveBeenCalled()
  expect(el.querySelector('div').hasAttribute('inert')).toBe(true)
  expect(summary.getAttribute('aria-expanded')).toBe('false')
  summary.click();expect(animations[1].cancel).toHaveBeenCalled()
  expect(el.querySelector('div').hasAttribute('inert')).toBe(false)
  animations[2].onfinish()
  expect(el.open).toBe(true);expect(el.style.height).toBe('')
  expect(el.querySelector('input').value).toBe('draft')
  summary.click();animations[3].onfinish();expect(el.open).toBe(false)
 }finally{cleanup()}
})
it('uses immediate native state changes for reduced motion',()=>{
 const {el,summary,cleanup}=setup(true)
 try {
  summary.click();expect(el.open).toBe(true)
  summary.click();expect(el.open).toBe(false)
  expect(el.animate).not.toHaveBeenCalled()
 }finally{cleanup()}
})
