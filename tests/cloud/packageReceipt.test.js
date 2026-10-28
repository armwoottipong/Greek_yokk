// @vitest-environment node
import {it,expect} from 'vitest'
import {receiptPackagePlan,receiptExpectedPackageShortage} from '../../src/cloud/core/packageReceipt.js'
it('keeps the sale-time baseline, reason, name and costs when packaging is adjusted',()=>{
 const receipt={billOperands:{packages:{B:{quantity:300,reason:'separate_bag',note:'two extra'}},packageSnapshots:{B:{name:'Historic bag',unit:'ใบ',unitCost:2,baselineQuantity:100}}},inventory:[{materialId:'B',take:200,shortage:100,packagingCostCents:400}]}
 expect(receiptPackagePlan(receipt)[0]).toMatchObject({materialName:'Historic bag',baselineQty:1,requestedQty:3,adjustmentQty:2,fulfilledQty:2,shortageQty:1,fulfilledCost:4,expectedShortageCost:2,reason:'separate_bag',note:'two extra'})
 expect(receiptExpectedPackageShortage(receipt)).toBe(2)
})
it('does not invent package metadata for an old receipt without snapshots',()=>{expect(receiptPackagePlan({inventory:[]})).toEqual([])})
