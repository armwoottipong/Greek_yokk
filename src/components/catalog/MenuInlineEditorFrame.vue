<template>
 <section v-if="open" class="inline-menu-editor" :aria-label="title">
  <header class="inline-editor-heading"><div><h3>{{ title }}</h3><p>แก้ไขข้อมูลในหน้านี้ · กราฟเป็นตัวอย่างจากแบบร่าง ยังไม่บันทึก</p></div></header>
  <slot/>
  <footer class="inline-editor-footer"><slot name="footer"/></footer>
 </section>
</template>
<script setup>
defineOptions({inheritAttrs:false})
defineProps({open:Boolean,title:String})
</script>
<style scoped>
.inline-menu-editor{display:grid;gap:24px;min-width:0}.inline-editor-heading h3{font-size:1.125rem;font-weight:600}.inline-editor-heading p{font-size:.8125rem;color:var(--text-muted);line-height:1.7;margin-top:4px}.inline-editor-footer{position:sticky;bottom:0;padding:16px;background:var(--bg-card);border-top:1px solid var(--border-subtle);z-index:2;border-radius:12px}
</style>
