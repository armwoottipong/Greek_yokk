import { createApp } from 'vue'
import { createPinia } from 'pinia'
import {loadApplication} from './cloud/appEntry.js'
import {showAppStartupError} from './composables/appStartup.js'
import './assets/main.css'

async function start(){
 const {component,props}=await loadApplication(import.meta.env)
 const app=createApp(component,props)
 app.use(createPinia())
 app.mount('#app')
}
start().catch(()=>showAppStartupError())
