import { summaryFixture } from './summaryFixture.js'

export function groupFixture({mode='included',options=6,platforms=1,fourLots=false}={}){
  const base=summaryFixture(fourLots?{prepareMaterials:materials=>{for(const m of materials){m.lots=[500,500,1000,998000].map((qty,i)=>({...m.lots[0],id:`${m.id}-${i}`,qty,isInUse:i===0,receiveDay:20000+i}));m.activeLotId=m.lots[0].id}}}:{})
  const c=base.shop.catalog
  for(let i=11;i<options;i++){
    const id=`A${i}`;c.addonIds.push(id);c.addons[id]={recipe:{S0:100,S11:100},pricesCents:{P:1200}};c.addonPrices.P[id]=1200
  }
  for(const m of base.materials)m.recipeIndex.addons={_:0,...Object.fromEntries(c.addonIds.map(id=>[id,c.addons[id].recipe[m.id]||0]))}
  for(let i=1;i<platforms;i++){
    const id=`P${i}`;c.platformIds.push(id);c.platforms[id]={...c.platforms.P};c.addonPrices[id]=structuredClone(c.addonPrices.P)
    for(const a of Object.values(c.addons))a.pricesCents[id]=a.pricesCents.P
    for(const m of Object.values(c.menus)){m.pricesCents[id]=m.pricesCents.P;m.optionPrices[id]=structuredClone(m.optionPrices.P)}
  }
  const g={id:'G',name:'Fruit choices',revision:1,active:true,allowRepeat:false,pricingMode:mode,min:mode==='included'?3:0,max:mode==='included'?3:11,
    optionIds:c.addonIds.slice(0,options),optionPrices:Object.fromEntries(c.platformIds.map(p=>[p,{_:0,A0:500,A1:0}])),menuIds:['SIMPLE']}
  c.groups={G:g};c.groupIds=['G']
  const m=c.menus.SIMPLE;m.groupId='G';m.optionIds=[];m.min=0;m.max=0;m.choiceMaterials={};m.materialIds=Object.keys(m.recipe)
  m.optionPrices=Object.fromEntries(c.platformIds.map(p=>[p,{_:0}]))
  return base
}
