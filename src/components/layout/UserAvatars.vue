<template>
 <div class="user-avatars" role="group" aria-label="ผู้ใช้ที่กำลังใช้งานร้าน" tabindex="0" @scroll="hide">
  <button v-for="user in users" :key="user.uid" type="button" class="user-avatar" :class="{'is-active':shown===user.uid}"
   :aria-label="user.email" :aria-describedby="shown===user.uid?tooltipId:undefined"
   @pointerenter="show(user,$event)" @pointerleave="hide" @focus="show(user,$event)" @blur="hide" @click="show(user,$event)" @keydown.esc="hide">
   <img v-if="photo(user) && !failed[user.uid]" :src="photo(user)" alt="" referrerpolicy="no-referrer" @error="failed[user.uid]=true">
   <span v-else class="avatar-initials" aria-hidden="true">{{ initials(user) }}</span>
  </button>
  <Teleport to="body"><div v-if="shown" :id="tooltipId" role="tooltip" class="user-email-tooltip" :style="position">{{ email }}</div></Teleport>
 </div>
</template>
<script setup>
import {ref,useId,onUnmounted} from 'vue'
import {googlePhoto} from '@/cloud/shopAccess.js'
defineProps({users:{type:Array,default:()=>[]}})
const tooltipId=useId(),shown=ref(''),email=ref(''),position=ref({}),failed=ref({})
const photo=user=>googlePhoto(user.photoURL)
const initials=user=>Array.from(user.displayName?.trim()||user.email||'?').slice(0,2).join('').toUpperCase()
function show(user,event){
 const rect=event.currentTarget.getBoundingClientRect()
 shown.value=user.uid;email.value=user.email
 position.value={left:`${Math.max(8,Math.min(rect.left,window.innerWidth-288))}px`,top:`${Math.max(8,rect.top-42)}px`,maxWidth:`${Math.min(280,window.innerWidth-16)}px`}
}
function hide(){shown.value=''}
onUnmounted(hide)
</script>
<style scoped>
.user-avatars{display:flex;align-items:center;flex-wrap:nowrap;padding:8px 4px;gap:0;overflow:auto;scrollbar-width:thin;isolation:isolate}
.user-avatar{display:grid;place-items:center;position:relative;width:44px;height:44px;z-index:0;border-radius:50%;flex-shrink:0;cursor:default}
.user-avatar img,.avatar-initials{width:36px;height:36px;border:2px solid var(--bg-card,#fff);border-radius:50%;object-fit:cover}
.avatar-initials{display:grid;place-items:center;background:var(--accent-brand,#8b2527);color:var(--bg-card,#fff);font-size:11px;font-weight:600}
.user-avatar+.user-avatar{margin-left:-16px}.user-avatar:focus-visible{z-index:1}.user-avatar.is-active,.user-avatar:hover{z-index:2}.user-avatar.is-active img,.user-avatar.is-active .avatar-initials,.user-avatar:hover img,.user-avatar:hover .avatar-initials,.user-avatar:focus-visible img,.user-avatar:focus-visible .avatar-initials{transform:scale(1.12)}.user-avatars:focus-visible{outline:2px solid var(--accent-brand);outline-offset:2px;border-radius:8px}.user-avatar:focus-visible{outline:2px solid var(--accent-brand);outline-offset:1px}
.user-email-tooltip{position:fixed;z-index:110;background:var(--text-main,#352522);color:var(--bg-card,#fff);font-size:12px;line-height:1.5;padding:7px 10px;border-radius:8px;overflow-wrap:anywhere;pointer-events:none;box-shadow:0 3px 10px #35252220}
.user-email-tooltip:after{content:'';position:absolute;bottom:-5px;left:14px;border-left:5px solid transparent;border-right:5px solid transparent;border-top:5px solid var(--text-main,#352522)}
@media(prefers-reduced-motion:no-preference){.user-avatar img,.avatar-initials{transition:transform 150ms ease-out}}
</style>
