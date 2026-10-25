import {createApp} from 'vue'
import {createPinia} from 'pinia'
import LocalApp from './LocalApp.vue'
import './assets/main.css'
// Explicit legacy entry: never infer shared-shop readiness from this local POS.
createApp(LocalApp).use(createPinia()).mount('#app')
