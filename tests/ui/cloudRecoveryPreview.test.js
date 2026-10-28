import {it,expect,afterEach} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import Panel from '../../src/cloud/core/CloudRecoveryPanel.vue'
let w;afterEach(()=>w?.unmount())
it('previews legacy counts and owner-only commands without exposing a restore mutation button',async()=>{
 w=mount(Panel,{props:{projectId:'yoggie-db',shopId:'greek-yogg'}})
 const file={size:100,text:async()=>JSON.stringify({materials:[],menus:[],platforms:[],orders:[{}]})}
 Object.defineProperty(w.get('input').element,'files',{value:[file]});await w.get('input').trigger('change');await flushPromises()
 expect(w.text()).toContain('orders: 1');expect(w.get('pre').text()).toContain('--legacy');expect(w.get('pre').text()).toContain('--project yoggie-db');expect(w.find('button').exists()).toBe(false)
})
it('rejects malformed/oversized files and blocks the picker during disconnected state',async()=>{
 w=mount(Panel,{props:{blocked:true}});expect(w.get('input').element.disabled).toBe(true);await w.setProps({blocked:false})
 Object.defineProperty(w.get('input').element,'files',{value:[{size:21*1024*1024}]});await w.get('input').trigger('change');expect(w.get('[role="alert"]').text()).toContain('20 MB')
})
