import {beforeAll,beforeEach,afterAll,it,expect} from 'vitest'
import {doc,writeBatch,setDoc,Timestamp} from 'firebase/firestore'
import {createRulesTest} from './helpers.js'
import {summaryFixture} from './summaryFixture.js'
import {buildCorePolicy} from '../../scripts/core-policy.mjs'
import {createReportReader} from '../../src/cloud/core/reportReader.js'
import {projectReportOrders} from '../../src/cloud/core/reportProjection.js'
import {buildDashboard} from '../../src/domain/dashboard.js'
let env
beforeAll(async()=>{env=await createRulesTest({rules:buildCorePolicy({legacyTestAuth:true,shopId:'proof-shop'})})})
beforeEach(async()=>{await env.clearFirestore()})
afterAll(async()=>{await env.cleanup()})
const root='shops/proof-shop',base=root+'/generations/g1'
const receipt=(id,time,status='committed')=>({opId:id,status,createdAt:Timestamp.fromDate(new Date(time)),platformId:'P',subtotalCents:1000,gpCents:100,netCents:900,ingredientCostCents:200,packagingCostCents:100,grossProfitCents:600,lines:[{menuId:'SIMPLE',qty:1,totalCents:1000,catalog:{name:'Historic'}}],inventory:[]})
const legacy={orderId:'N001',createdAt:'2026-10-27T05:00:00+07:00',platformId:'P',platformName:'Store',subtotal:50,gpAmount:0,netRevenue:50,foodCost:10,grossProfit:40,items:[{menuId:'SIMPLE',menuName:'Historic',qty:2}]}
function reader(anonymous=false){return createReportReader({db:anonymous?env.unauthenticatedContext().firestore():env.authenticatedContext('reader').firestore(),getContext:()=>({projectId:'demo-greek-yogg',shopId:'proof-shop',generation:'g1',uid:'reader',ready:true,online:true})})}
it('reads every tied-timestamp page under active Rules and removes a later refund from the original sale period',async()=>{
 const f=summaryFixture()
 await env.withSecurityRulesDisabled(async c=>{const db=c.firestore(),b=writeBatch(db);b.set(doc(db,root),f.shop)
  for(let i=0;i<251;i++){const id=`N${String(i).padStart(3,'0')}`;b.set(doc(db,`${base}/orders/${id}`),receipt(id,'2026-10-26T17:00:00Z',i%5===0?'cancelled':'committed'))}
  b.set(doc(db,`${base}/orders/BEFORE`),receipt('BEFORE','2026-10-26T16:59:59.999Z'))
  b.set(doc(db,`${base}/orders/AFTER`),receipt('AFTER','2026-10-27T17:00:00Z'))
  b.set(doc(db,`${base}/legacyRecords/orders_0`),{kind:'orders',json:JSON.stringify(legacy)});await b.commit()
 })
 const api=reader(),range={start:'2026-10-27',end:'2026-10-27'},data={shop:f.shop,display:{menus:{},addons:{},platforms:{P:{name:'Store'}}},materials:[]}
 try{
  const result=await api.read(range,{legacyOrderCount:1});expect(result.receipts).toHaveLength(251)
  const report=buildDashboard(projectReportOrders(result,data),range)
  expect(report.metrics).toMatchObject({orderCount:201,totalSales:2050,totalGp:200,netRevenue:1850,totalFoodCost:610,grossProfit:1240})
  expect(report.channels).toHaveLength(1);expect(report.menus[0].qty).toBe(202)
  await env.withSecurityRulesDisabled(async c=>{const db=c.firestore(),b=writeBatch(db);b.update(doc(db,`${base}/orders/N001`),{status:'cancelled',cancelledAt:Timestamp.fromDate(new Date('2026-11-10'))});b.update(doc(db,root),{revision:f.shop.revision+1,inventoryHistoryCutoff:999});await b.commit()})
  const refreshed=buildDashboard(projectReportOrders(await api.read(range,{legacyOrderCount:1}),data),range)
  expect(refreshed.metrics).toMatchObject({orderCount:200,totalSales:2040,totalGp:199,netRevenue:1841,totalFoodCost:607,grossProfit:1234})
 }finally{api.close()}
})
it('does not turn permission errors or a missing legacy archive into empty financial reports',async()=>{
 const f=summaryFixture();await env.withSecurityRulesDisabled(c=>setDoc(doc(c.firestore(),root),f.shop))
 const api=reader(),guest=reader(true)
 try{await expect(api.read({start:null,end:null},{legacyOrderCount:1})).rejects.toThrow('REPORT_INCOMPLETE_HISTORY');await expect(guest.read({start:null,end:null})).rejects.toMatchObject({code:'permission-denied'})}
 finally{api.close();guest.close()}
})
