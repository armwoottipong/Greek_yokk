import { expect,it } from 'vitest'
import { summaryFixture } from '../firestore/summaryFixture.js'
import { summaryPlatform } from '../firestore/summaryPlatform.js'
import { platformFixture } from '../firestore/summaryPlatformFixture.js'

function setup(){
  const base=summaryFixture()
  base.shop.catalog.groups={G:{id:'G',revision:4,active:true,optionPrices:{P:{_:0,A0:0}}}}
  base.shop.catalog.groupIds=['G']
  base.shop.catalog.menus.SIMPLE.optionPrices.P={_:0,A0:0}
  return base
}
const create={id:'PLAT02',name:'  Pickup  ',emoji:'🛵',active:true,gpBasisPoints:3250,sourcePlatformId:'P'}

it('adds a platform by cloning source columns without material writes',()=>{
  const base=setup(),before=structuredClone(base),source='P',f=summaryPlatform(base.shop,base.materials,create,{opId:'PLATFORM-ADD'})
  expect(base).toEqual(before)
  expect(f.nextShop.catalog.platformIds).toEqual([...base.shop.catalog.platformIds,'PLAT02'])
  expect(f.nextShop.catalog.platforms.PLAT02).toEqual({revision:1,active:true,gpBasisPoints:3250,name:'  Pickup  ',emoji:'🛵'})
  for(const menu of Object.values(base.shop.catalog.menus)){
    expect(f.nextShop.catalog.menus[menu.id].pricesCents.PLAT02).toEqual(menu.pricesCents[source])
    expect(f.nextShop.catalog.menus[menu.id].optionPrices.PLAT02).toEqual(menu.optionPrices[source])
  }
  for(const [id,addon] of Object.entries(base.shop.catalog.addons))expect(f.nextShop.catalog.addons[id].pricesCents.PLAT02).toEqual(addon.pricesCents[source])
  expect(f.nextShop.catalog.groups.G.optionPrices.PLAT02).toEqual(base.shop.catalog.groups.G.optionPrices[source])
  expect(f.nextShop.catalog.addonPrices.PLAT02).toEqual(base.shop.catalog.addonPrices[source])
  expect(f.nextShop.catalog.menus.SIMPLE.revision).toBe(base.shop.catalog.menus.SIMPLE.revision)
  expect(f.nextMaterials).toEqual([])
  expect(f.nextShop.catalogRevision).toBe(base.shop.catalogRevision)
  expect(base.materials).toEqual(before.materials)
  expect(f.operation).toMatchObject({schemaVersion:2,kind:'platform',status:'committed',opId:'PLATFORM-ADD',entityId:'PLAT02',create:true,sourcePlatformId:'P',beforePlatform:{},entitySnapshot:f.nextShop.catalog.platforms.PLAT02,sourceCatalogRevision:base.shop.catalogRevision,shopRevision:base.shop.revision+1,materialIds:[]})
})

it('matches the independent create oracle',()=>{
  const {base,f:expected}=platformFixture()
  const actual=summaryPlatform(base.shop,base.materials,{id:'DELIVERY',name:'Delivery',emoji:'🛵',active:true,gpBasisPoints:3250,sourcePlatformId:'P'},{opId:'NEW-PLATFORM'})
  expect(actual.nextShop).toEqual(expected.nextShop)
  expect(actual.nextMaterials).toEqual(expected.nextMaterials)
  expect(actual.operation).toEqual(expected.operation)
})

it('copies sparse and explicit zero option overrides without normalizing either',()=>{
  const base=setup();delete base.shop.catalog.menus.SIMPLE.optionPrices.P.A0
  base.shop.catalog.groups.G.optionPrices.P.A0=0
  const f=summaryPlatform(base.shop,base.materials,{...create,id:'WEB',sourcePlatformId:'P'})
  expect(f.nextShop.catalog.menus.SIMPLE.optionPrices.WEB).toEqual({_:0})
  expect(f.nextShop.catalog.groups.G.optionPrices.WEB).toEqual({_:0,A0:0})
})

it('edits only one platform and can disable it while another remains active',()=>{
  const base=setup(),created=summaryPlatform(base.shop,base.materials,create),before=structuredClone(created.nextShop)
  const edit={id:'P',name:'Updated local',emoji:'',active:false,gpBasisPoints:0}
  const f=summaryPlatform(created.nextShop,created.nextMaterials,edit,{opId:'PLATFORM-EDIT'})
  expect(f.nextShop.catalog.platforms.P).toEqual({...before.catalog.platforms.P,name:'Updated local',emoji:'',active:false,gpBasisPoints:0,revision:before.catalog.platforms.P.revision+1})
  expect(f.nextShop.catalog.platforms.PLAT02).toEqual(before.catalog.platforms.PLAT02)
  for(const key of ['menus','addons','groups','addonPrices','platformIds'])expect(f.nextShop.catalog[key]).toEqual(before.catalog[key])
  expect(f.operation).toMatchObject({create:false,sourcePlatformId:'',beforePlatform:before.catalog.platforms.P,entitySnapshot:f.nextShop.catalog.platforms.P})
  expect(f.nextMaterials).toEqual([])
  expect(f.nextShop.catalogRevision).toBe(before.catalogRevision)
})

it('leaves all material documents and old price columns untouched',()=>{
  const base=setup(),before=structuredClone(base),f=summaryPlatform(base.shop,base.materials,create)
  expect(f.nextMaterials).toEqual([])
  expect(base.materials).toEqual(before.materials)
  expect(f.nextShop.catalogRevision).toBe(before.shop.catalogRevision)
  expect(f.nextShop.catalog.menus.SIMPLE.pricesCents.P).toBe(before.shop.catalog.menus.SIMPLE.pricesCents.P)
  expect(f.nextShop.catalog.addons.A0.pricesCents.P).toBe(before.shop.catalog.addons.A0.pricesCents.P)
})

it.each([
  ['bad id',patch=>patch.id='bad/id'],['reserved id',patch=>patch.id='_'],['long id',patch=>patch.id='a'.repeat(201)],
  ['blank name',patch=>patch.name='  '],['long name',patch=>patch.name='n'.repeat(201)],['bad emoji',patch=>patch.emoji='e'.repeat(33)],
  ['bad active',patch=>patch.active='true'],['fractional gp',patch=>patch.gpBasisPoints=1.5],['negative gp',patch=>patch.gpBasisPoints=-1],
  ['high gp',patch=>patch.gpBasisPoints=10000],['missing template',patch=>patch.sourcePlatformId='NOPE'],
  ['inactive template',(patch,base)=>{patch.sourcePlatformId='P';base.shop.catalog.platforms.P.active=false}],
])('rejects invalid platform create: %s',(label,mutate)=>{
  const base=setup(),input={...create};mutate(input,base)
  expect(()=>summaryPlatform(base.shop,base.materials,input)).toThrow()
})

it('rejects full registry and invalid edits, including disabling the final active platform',()=>{
  const base=setup(),full=structuredClone(base.shop)
  full.catalog.platformIds=['P','B','C','D'];full.catalog.platforms.B={...full.catalog.platforms.P};full.catalog.platforms.C={...full.catalog.platforms.P};full.catalog.platforms.D={...full.catalog.platforms.P}
  expect(()=>summaryPlatform(full,base.materials,{...create,id:'E'})).toThrow()
  expect(()=>summaryPlatform(base.shop,base.materials,{...create,id:'P'})).toThrow()
  expect(()=>summaryPlatform(base.shop,base.materials,{id:'P',name:'x',active:false,gpBasisPoints:3000,sourcePlatformId:'P'})).toThrow()
  expect(()=>summaryPlatform(base.shop,base.materials,{id:'P',name:'x',active:false,gpBasisPoints:3000})).toThrow()
  const created=summaryPlatform(base.shop,base.materials,create)
  for(const id of ['P','PLAT02'])created.nextShop.catalog.platforms[id].active=false
  expect(()=>summaryPlatform(created.nextShop,created.nextMaterials,{id:'P',name:'x',active:false,gpBasisPoints:3000})).toThrow()
})

it('replays the exact immutable operation snapshot',()=>{
  const base=setup(),input={...create},f=summaryPlatform(base.shop,base.materials,input)
  input.name='mutated';input.gpBasisPoints=0
  expect(f.operation.entitySnapshot).toEqual({revision:1,active:true,gpBasisPoints:3250,name:'  Pickup  ',emoji:'🛵'})
})
