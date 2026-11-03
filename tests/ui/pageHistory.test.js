import {it,expect} from 'vitest'
import {createTestStore} from '../helpers/createStore'

it('records local menu and Add-on edits in their own history modules',()=>{
 const store=createTestStore()
 store.resetDemoData()
 const menu=store.menus[0],addon=store.addons[0]
 expect(store.saveMenu({...menu,name:'เมนูใหม่'}).ok).toBe(true)
 expect(store.saveAddon({...addon,name:'ท็อปปิ้งใหม่'}).ok).toBe(true)
 expect(store.activityLogs.find(log=>log.module==='menu'&&log.targetId===menu.id)).toMatchObject({action:'edit',targetName:'เมนูใหม่'})
 expect(store.activityLogs.find(log=>log.module==='addon'&&log.targetId===addon.id)).toMatchObject({action:'edit',targetName:'ท็อปปิ้งใหม่'})
})
