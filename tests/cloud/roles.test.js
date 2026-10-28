import {it,expect} from 'vitest'
import {OWNER_EMAIL,shopRole,roleMap,roleTabs,canOperate} from '../../src/cloud/roles.js'
it('defaults missing, invalid and non-allowed identities to read-only',()=>{
 for(const userRoles of [{},{'a@example.com':'superadmin'},{'a@example.com':'manager'}])expect(shopRole({allowedEmails:{},userRoles},'a@example.com')).toBe('viewer')
 expect(shopRole({allowedEmails:{'a@example.com':true}},'a@example.com')).toBe('viewer')
})
it('normalizes roles to listed emails and protects owner admin',()=>{
 expect(roleMap({[OWNER_EMAIL]:true,'staff@example.com':true},{[OWNER_EMAIL]:'viewer','staff@example.com':'manager','unknown@example.com':'admin'})).toEqual({[OWNER_EMAIL]:'admin','staff@example.com':'manager'})
 expect(()=>roleMap({'staff@example.com':true},{'staff@example.com':'anything'})).toThrow('INVALID_ROLE')
})
it('exposes only permitted areas for each role',()=>{
 expect(roleTabs('viewer')).toEqual(['dashboard']);expect(canOperate('viewer')).toBe(false)
 expect(roleTabs('manager')).not.toContain('settings');expect(roleTabs('admin')).toContain('settings')
 for(const role of ['admin','manager'])expect(canOperate(role)).toBe(true)
})
