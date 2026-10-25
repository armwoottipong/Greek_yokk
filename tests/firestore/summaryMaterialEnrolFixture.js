import { serverTimestamp } from 'firebase/firestore'
import { summaryFixture } from './summaryFixture.js'
import { materialRegistryShop,summaryMaterialCreate } from './summaryMaterialAuthor.js'

// Hand-built oracle, initially independent of the command planner and Rules.
export function enrolFixture(){
  const base=summaryFixture(),c=base.shop.catalog
  for(const menu of Object.values(c.menus)){
    delete menu.recipe.S0;menu.materialIds=menu.materialIds.filter(id=>id!=='S0')
    for(const key of Object.keys(menu.choiceMaterials))menu.choiceMaterials[key]=menu.choiceMaterials[key].filter(id=>id!=='S0')
  }
  for(const addon of Object.values(c.addons))delete addon.recipe.S0
  const unused=base.materials[0]
  unused.recipeIndex.menus=Object.fromEntries(Object.keys(unused.recipeIndex.menus).map(id=>[id,0]))
  unused.recipeIndex.addons=Object.fromEntries(Object.keys(unused.recipeIndex.addons).map(id=>[id,0]));unused.recipeIndex.quantities.fill(0)
  base.shop=materialRegistryShop(base.shop,base.materials)
  const created=summaryMaterialCreate(base.shop,{id:'NEW',name:'New',emoji:'',unit:'g',packSize:1000,minAlertQ:0,inventoryType:'ingredient'})
  base.shop=created.nextShop;base.materials.push(created.next)
  const ids=c.summaryMaterials.filter(id=>id!=='S0').concat('NEW'),opId='ENROL'
  const nextMaterials=ids.map((id,i)=>{
    const m=base.materials.find(m=>m.id===id)
    return {...structuredClone(m),revision:m.revision+1,lastOpId:opId,lastOpKind:'material_enrol',lastOpIndex:i,
      recipeIndex:{...structuredClone(m.recipeIndex),catalogRevision:base.shop.catalogRevision+1}}
  })
  const nextShop={...structuredClone(base.shop),revision:base.shop.revision+1,catalogRevision:base.shop.catalogRevision+1,lastOpId:opId,lastOpKind:'material_enrol'}
  nextShop.catalog.summaryMaterials=ids
  const operation={schemaVersion:2,kind:'material_enrol',status:'committed',opId,uid:'cashier',createdAt:serverTimestamp(),
    addedId:'NEW',removedId:'S0',removedRevision:unused.revision,sourceCatalogRevision:base.shop.catalogRevision,shopRevision:nextShop.revision,materialIds:[...ids]}
  return {base,f:{nextMaterials,nextShop,operation}}
}
