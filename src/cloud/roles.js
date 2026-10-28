export const OWNER_EMAIL='armwoottipong@gmail.com'
export const ROLES=['viewer','manager','admin']
export const ROLE_LABELS={viewer:'ดู Dashboard เท่านั้น',manager:'ผู้จัดการ',admin:'ผู้ดูแลระบบ'}
export function shopRole(shop,email){
 const key=String(email||'').toLowerCase()
 if(shop?.allowedEmails?.[key]!==true)return 'viewer'
 const role=shop?.userRoles?.[key]
 return ROLES.includes(role)?role:'viewer'
}
export function roleMap(emails,roles={}){
 return Object.fromEntries(Object.keys(emails).sort().map(email=>{const role=email===OWNER_EMAIL?'admin':roles[email]||'viewer';if(!ROLES.includes(role))throw new Error('INVALID_ROLE');return [email,role]}))
}
export const roleTabs=role=>role==='admin'?['dashboard','pos','stock','menu','addon','settings']:role==='manager'?['dashboard','pos','stock','menu','addon']:['dashboard']
export const canOperate=role=>role==='admin'||role==='manager'
