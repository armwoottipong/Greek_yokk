<template>
 <div class="product-shell">
  <a class="skip-content" href="#cloud-main" @click.prevent="focusMain">ข้ามไปเนื้อหาหลัก</a>
  <Sidebar :model="model" :items="items" :mobile-open="mobileOpen" @close="closeMenu"/>
  <div class="product-main">
   <header class="brand-page-header">
    <button id="mobile-menu-toggle" ref="toggle" class="mobile-menu-toggle" :aria-expanded="mobileOpen" aria-controls="main-sidebar" :aria-label="mobileOpen?'ปิดเมนูหลัก':'เปิดเมนูหลัก'" @click="mobileOpen=!mobileOpen"><Menu v-if="!mobileOpen" :size="22"/><X v-else :size="22"/></button>
    <div class="header-page-title" :inert="mobileOpen||undefined"><h2>{{ title }}</h2><p>{{ model.connected?'ข้อมูลร้านจาก Firebase · ใช้ร่วมกันทุกเครื่อง':'ขาดการเชื่อมต่อ · เก็บตะกร้าไว้แล้ว ยังบันทึกไม่ได้' }}</p></div>
    <div class="header-quick-actions" :inert="mobileOpen||undefined"><Button variant="quiet" size="compact" aria-label="ประวัติบิลขายและคืนบิล" @click="$emit('history')"><History :size="17"/><span>ประวัติ</span></Button><Button variant="quiet" size="compact" :disabled="busy||!online" aria-label="โหลดข้อมูลล่าสุด" @click="$emit('reload')"><RefreshCw :size="17"/><span>โหลดข้อมูลล่าสุด</span></Button><Button variant="quiet" size="compact" :disabled="busy" aria-label="ออกจากระบบ" @click="$emit('sign-out')"><LogOut :size="17"/><span>ออกจากระบบ</span></Button></div>
   </header>
   <main id="cloud-main" ref="main" tabindex="-1" :inert="mobileOpen||undefined" class="product-content"><slot/></main>
  </div>
 </div>
</template>
<script setup>
import {ref,watch,nextTick} from 'vue'
import {Menu,X,RefreshCw,LogOut,History} from 'lucide-vue-next'
import Sidebar from '@/components/layout/Sidebar.vue'
import Button from '@/components/ui/Button.vue'
const props=defineProps({model:{type:Object,required:true},items:Array,title:String,busy:Boolean,online:Boolean})
defineEmits(['reload','sign-out','history'])
const mobileOpen=ref(false),main=ref(null),toggle=ref(null)
function focusMain(){main.value?.focus({preventScroll:true})}
async function closeMenu(){mobileOpen.value=false;await nextTick();toggle.value?.focus()}
watch(()=>props.model.currentTab,async()=>{mobileOpen.value=false;await nextTick();focusMain();document.title=`${props.title} · Greek Yogg.`})
</script>
<style scoped>
.product-shell{display:flex;width:100%;height:100dvh;min-width:0;background:var(--bg-primary);color:var(--text-main);overflow:hidden}.product-main{display:flex;flex:1;flex-direction:column;min-width:0;min-height:0}.product-content{flex:1;min-height:0;overflow:auto;padding:24px;outline:none}.brand-page-header{min-height:var(--panel-header-height);display:flex;align-items:center;justify-content:space-between;padding:16px 24px;gap:16px;background:var(--bg-card);flex-shrink:0}.header-page-title{min-width:0}.header-page-title h2{font-size:1rem;font-weight:600;line-height:1.5}.header-page-title p{font-size:.75rem;line-height:1.6;color:var(--text-muted);margin-top:3px}.header-quick-actions{display:flex;gap:6px;flex-shrink:0}.mobile-menu-toggle{display:none;place-items:center;width:44px;height:44px;color:var(--accent-brand);border-radius:12px}.mobile-menu-toggle:focus-visible{outline:2px solid var(--accent-brand);outline-offset:2px}
@media(max-width:1199px){.mobile-menu-toggle{display:grid;position:fixed;left:82px;top:12px;z-index:70}.mobile-menu-toggle[aria-expanded=true]{left:10px;color:var(--bg-card)}.brand-page-header{padding-left:66px}.header-quick-actions span{display:none}}
@media(max-width:767px){.mobile-menu-toggle{left:10px}.brand-page-header{padding:12px 12px 12px 66px;gap:8px}.header-page-title h2{font-size:.875rem}.header-page-title p{display:none}.product-content{padding:16px}.header-quick-actions{gap:0}}
</style>
