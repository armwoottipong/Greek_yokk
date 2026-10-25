// @vitest-environment node
import {it,expect} from 'vitest'
import {loadEnv} from 'vite'
import {loadApplication} from '../../src/cloud/appEntry.js'
it('activates the live Google-login entry in production builds',async()=>{
 const env=loadEnv('production',process.cwd(),'VITE_')
 const entry=await loadApplication(env,{local:async()=>({default:'LOCAL'}),cloud:async()=>({default:'FIREBASE'})})
 expect(entry.component).toBe('FIREBASE')
 expect(entry.props.connection).toMatchObject({mode:'production',shopId:'greek-yogg',config:{projectId:'yoggie-db'}})
})
