<template>
 <main class="cloud-entry" aria-labelledby="cloud-title">
  <section class="cloud-entry-panel">
   <img :src="mascot" width="80" height="80" alt="" class="cloud-entry-mascot"/>
   <p v-if="emulator" class="cloud-entry-environment">ทดสอบบนเครื่องนี้</p>
   <h1 id="cloud-title">{{ copy.title }}</h1>
   <p class="cloud-entry-description" role="status" aria-live="polite"><LoaderCircle v-if="['connecting','loading'].includes(state.phase)" :size="18" class="animate-spin" aria-hidden="true"/>{{ copy.description }}</p>
   <p v-if="state.user" class="cloud-entry-account">{{ state.user.email || state.user.displayName || 'เข้าสู่ระบบแล้ว' }}</p>
   <p v-if="state.message" role="alert" class="cloud-entry-error">{{ state.message }}</p>
   <div v-if="showActions" class="cloud-entry-actions">
    <Button v-if="!state.user && ['signed_out','signing_in'].includes(state.phase)" data-sign-in :loading="state.phase==='signing_in'" @click="$emit('sign-in')"><span>เข้าสู่ระบบด้วย Google</span><ArrowRight v-if="state.phase!=='signing_in'" :size="18" aria-hidden="true"/></Button>
    <Button v-if="['loading','error','setup_required','maintenance','importing'].includes(state.phase)" data-reconnect variant="secondary" @click="$emit('reconnect')">ลองเชื่อมต่อใหม่</Button>
    <Button v-if="state.user" data-sign-out variant="secondary" :loading="signingOut" @click="$emit('sign-out')">ออกจากระบบ</Button>
   </div>
   <p v-if="state.phase==='ready'" class="cloud-entry-note">ยังไม่เปิดขายระหว่างเตรียมข้อมูลและระบบบันทึกของร้าน</p>
   <p v-if="['signed_out','signing_in'].includes(state.phase)" class="cloud-entry-permission"><ShieldCheck :size="16" aria-hidden="true"/>ใช้บัญชี Google ที่ได้รับอนุญาต</p>
  </section>
 </main>
</template>
<script setup>
import {computed} from 'vue'
import {ArrowRight,ShieldCheck,LoaderCircle} from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'
const props=defineProps({state:{type:Object,required:true},copy:{type:Object,required:true},emulator:Boolean,signingOut:Boolean})
defineEmits(['sign-in','reconnect','sign-out'])
const mascot=`${import.meta.env.BASE_URL}brand/content-mascot.svg`
const showActions=computed(()=>props.state.user||['signed_out','signing_in','loading','error','setup_required','maintenance','importing'].includes(props.state.phase))
</script>
<style scoped>
.cloud-entry{width:100%;min-width:0;height:100%;overflow:auto;display:grid;place-items:safe center;padding:24px 20px;background:var(--bg-primary);color:var(--text-main)}
.cloud-entry-panel{width:min(100%,400px);padding:32px;text-align:center;background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:20px}
.cloud-entry-mascot{display:block;object-fit:contain;margin:0 auto 16px}
h1{font-size:26px;font-weight:600;line-height:1.5;letter-spacing:-.5px;overflow-wrap:anywhere}
.cloud-entry-description{margin:8px auto 0;max-width:34ch;color:var(--text-muted);font-size:14px;line-height:1.8}.cloud-entry-description svg{display:inline-block;vertical-align:middle;margin-right:8px}
.cloud-entry-account{margin-top:12px;font-size:14px;overflow-wrap:anywhere}
.cloud-entry-actions{display:grid;gap:10px;margin-top:24px}.cloud-entry-actions :deep(button){min-height:48px;width:100%;font-size:14px}.cloud-entry-actions :deep(button:focus-visible){outline:2px solid var(--accent-brand);outline-offset:4px}
.cloud-entry-error{margin-top:16px;padding:12px;border-radius:10px;background:var(--accent-soft);color:var(--accent-red);font-size:14px;line-height:1.7;overflow-wrap:anywhere}
.cloud-entry-note{margin-top:16px;font-size:13px;line-height:1.7;color:var(--text-muted)}
.cloud-entry-permission{display:flex;justify-content:center;align-items:center;gap:7px;margin-top:20px;font-size:12px;line-height:1.7;color:var(--text-muted)}.cloud-entry-permission svg{flex-shrink:0}
.cloud-entry-environment{margin-bottom:8px;font-size:13px;color:var(--text-muted)}.cloud-entry ::selection{background:var(--accent-brand);color:var(--bg-card)}
@media(max-width:440px){.cloud-entry{padding:20px 16px}.cloud-entry-panel{padding:28px 24px}}
@media(prefers-reduced-motion:reduce){.cloud-entry .animate-spin{animation:none}}
</style>
