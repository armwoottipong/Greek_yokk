import {describe,it,expect} from 'vitest'
import {cropRect,validateImage,MAX_IMAGE_BYTES} from '../../src/domain/catalogImage.js'

describe('square catalog image',()=>{
 it('crops landscape and portrait to a square inside the source at every edge',()=>{
  for(const [w,h] of [[1200,400],[400,1200],[512,512]])for(const zoom of [1,2,4])for(const x of [0,50,100])for(const y of [0,50,100]){
   const r=cropRect(w,h,zoom,x,y)
   expect(r.size).toBe(Math.min(w,h)/zoom)
   expect(r.x).toBeGreaterThanOrEqual(0);expect(r.y).toBeGreaterThanOrEqual(0)
   expect(r.x+r.size).toBeLessThanOrEqual(w);expect(r.y+r.size).toBeLessThanOrEqual(h)
  }
 })
 it('rejects invalid geometry rather than drawing a blank crop',()=>{
  for(const args of [[0,1,1,50,50],[1,1,0,50,50],[1,1,5,50,50],[1,1,1,NaN,50]])expect(()=>cropRect(...args)).toThrow()
 })
 it('limits pictures to JPEG data URLs with a bounded decoded size',()=>{
  expect(validateImage('')).toBe('')
  const jpg='data:image/jpeg;base64,/9j/2Q=='
  expect(validateImage(jpg)).toBe(jpg)
  for(const value of ['https://example.com/photo.jpg','data:image/svg+xml;base64,AAAA','data:image/jpeg;base64,no spaces','data:image/jpeg;base64,'+'A'.repeat(Math.ceil(MAX_IMAGE_BYTES/3)*4+4)])expect(()=>validateImage(value)).toThrow()
 })
})
