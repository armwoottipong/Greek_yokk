<template>
 <div class="local-shell">
  <aside class="local-mode" aria-label="โหมดข้อมูล">
   <span>ระบบเดิม · ข้อมูลเฉพาะเครื่อง (แยกจาก Firebase)</span>
   <a :href="firebaseUrl">เปิดระบบ Firebase</a>
  </aside>
  <div class="local-content"><App style="height:100%;min-height:0" /></div>
 </div>
</template>
<script setup>
import App from './App.vue'
const firebaseUrl=import.meta.env.BASE_URL
</script>
<style scoped>
.local-shell{width:100%;height:100%;min-width:0;display:flex;flex-direction:column}
.local-mode{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:4px 16px;padding:0 16px;background:var(--bg-soft);border-bottom:1px solid var(--border-subtle);font-size:.8125rem;line-height:1.7;color:var(--text-main)}
.local-mode a{min-height:44px;display:inline-flex;align-items:center;color:var(--accent-brand);text-decoration:underline;text-underline-offset:3px}
.local-content{flex:1;min-height:0;min-width:0}
</style>
