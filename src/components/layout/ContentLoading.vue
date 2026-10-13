<template>
  <section class="startup-screen content-loading" data-content-loading :data-state="error ? 'error' : undefined" aria-label="กำลังโหลดหน้า">
    <div class="startup-content">
      <div class="startup-mascot-stage" aria-hidden="true">
        <img class="startup-mascot" :src="base + 'brand/content-mascot.svg'" width="2000" height="2000" alt="">
      </div>
      <p :class="error ? 'startup-message' : 'sr-only'" :role="error ? 'alert' : 'status'" aria-live="polite">{{ error ? 'โหลดหน้าไม่สำเร็จ ลองโหลดใหม่อีกครั้งนะ' : 'กำลังโหลดหน้า' }}</p>
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
