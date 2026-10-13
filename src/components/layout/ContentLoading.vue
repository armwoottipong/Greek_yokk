<template>
  <section class="startup-screen content-loading" data-content-loading :data-state="error ? 'error' : undefined" aria-label="กำลังโหลดหน้า">
    <div class="startup-content">
      <div class="startup-mascot-stage" aria-hidden="true">
        <img class="startup-mascot" :src="base + 'brand/loading-mascot.png'" width="6000" height="6001" alt="">
      </div>
      <div class="startup-brand">
        <img :src="base + 'brand/loading-wordmark.png'" width="6001" height="6001" alt="Yoggie — โลโก้ร้าน">
      </div>
      <p class="startup-message" :role="error ? 'alert' : 'status'" aria-live="polite">{{ error ? 'โหลดหน้าไม่สำเร็จ ลองโหลดใหม่อีกครั้งนะ' : 'กำลังเตรียมหน้าให้พร้อม…' }}</p>
      <div v-if="!error" class="startup-dots" aria-hidden="true"><i></i><i></i><i></i></div>
      <button v-else class="startup-retry" type="button" @click="$emit('retry')">ลองโหลดใหม่</button>
    </div>
  </section>
</template>
<script setup>
defineProps({ error: Boolean })
defineEmits(['retry'])
const base = import.meta.env.BASE_URL
</script>
