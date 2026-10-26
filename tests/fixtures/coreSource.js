export function coreSource({protectedCount=16}={}){
 return {schemaVersion:4,revision:0,
  materials:Array.from({length:protectedCount},(_,i)=>({id:`M${i}`,name:`Material ${i}`,inventoryType:'ingredient',stock:1000,unitCost:0.2,lots:[{id:`L${i}`,qty:1000,isInUse:true}]})),
  menus:Array.from({length:5},(_,i)=>({id:`MENU${i}`,name:`Menu ${i}`,isActive:true,hasAddons:false,hasPackage:true,prices:{P:69},recipe:i===4?[{materialId:`M${protectedCount-1}`,qty:1}]:Array.from({length:15},(_,j)=>({materialId:`M${j}`,qty:1}))})),
  addons:[],addonGroups:[],platforms:[{id:'P',name:'Shop',gpPercent:0,isActive:true}],orders:[],activityLogs:[],stockShortages:[],gasApiUrl:''}
}
