<template>
 <div class="presence-panel" :class="{'presence-panel--rail':rail}">
  <div v-if="!compact" class="presence-desktop">
   <div class="presence-heading"><span class="presence-status" :class="{'is-connected':connected}" aria-hidden="true"></span><span>{{ status }}</span><span class="presence-count">{{ users.length }} คน</span></div>
   <UserAvatars v-if="users.length" :users="users" />
   <p v-else class="presence-empty">ยังไม่มีผู้ใช้งานออนไลน์</p>
  </div>
  <button v-else type="button" class="presence-trigger" :aria-label="`ดูผู้ใช้งาน ${users.length} คน · ${status}`" aria-haspopup="dialog" :aria-expanded="open" :aria-controls="dialogId" @click="open=true">
   <span class="presence-symbol"><UsersRound aria-hidden="true"/><span class="presence-status" :class="{'is-connected':connected}" aria-hidden="true"></span></span>
   <span v-if="!rail" class="presence-trigger-copy"><strong>ผู้ใช้งานร้าน <span class="presence-count">{{ users.length }} คน</span></strong><span>{{ status }}</span></span>
   <ChevronRight v-if="!rail" class="presence-chevron" aria-hidden="true"/>
  </button>
  <DialogFrame :id="dialogId" :open="open" title="ผู้ใช้งาน Yoggie" :description="connected ? 'บัญชีที่กำลังใช้งานร้านในขณะนี้' : 'ขาดการเชื่อมต่อ · รายชื่ออาจไม่เป็นปัจจุบัน'" presentation="drawer" width="480px" contained-body @request-close="open=false">
   <div class="presence-roster-heading"><span class="presence-status" :class="{'is-connected':connected}" aria-hidden="true"></span><span>{{ status }}</span><span class="presence-count">{{ users.length }} คน</span></div>
   <div class="presence-roster-region" role="region" aria-label="รายชื่อผู้ใช้งานร้าน" tabindex="0">
   <ul v-if="users.length" class="presence-roster">
    <li v-for="user in users" :key="user.uid" class="presence-person">
     <img v-if="photo(user) && !failed[user.uid]" :src="photo(user)" alt="" referrerpolicy="no-referrer" @error="failed[user.uid]=true">
     <span v-else class="presence-initials" aria-hidden="true">{{ initials(user) }}</span>
     <div class="presence-person-copy"><p class="presence-person-name">{{ user.displayName || user.email }}<span v-if="isSelf(user)" class="presence-self">คุณ</span></p><p v-if="user.displayName" class="presence-email">{{ user.email }}</p><span class="presence-role">{{ roleLabel(user.role) }}</span></div>
    </li>
   </ul>
   <p v-else class="presence-roster-empty">ยังไม่มีผู้ใช้งานออนไลน์</p>
   </div>
  </DialogFrame>
 </div>
</template>
<script setup>
import {computed,ref,useId,watch} from 'vue'
import {UsersRound,ChevronRight} from 'lucide-vue-next'
import {googlePhoto} from '@/cloud/shopAccess.js'
import DialogFrame from '@/components/ui/DialogFrame.vue'
import UserAvatars from './UserAvatars.vue'
const props=defineProps({users:{type:Array,default:()=>[]},connected:Boolean,compact:Boolean,rail:Boolean,account:[String,Object]})
const open=ref(false),failed=ref({}),dialogId=`presence-${useId()}`
const status=computed(()=>props.connected?'เชื่อมต่อร้านแล้ว':'ขาดการเชื่อมต่อ')
const photo=user=>googlePhoto(user.photoURL)
const initials=user=>Array.from(user.displayName?.trim()||user.email||'?').slice(0,2).join('').toUpperCase()
const roleLabel=role=>({viewer:'ดู Dashboard',manager:'ผู้จัดการ',admin:'ผู้ดูแลระบบ'}[role]||'ผู้ใช้งานร้าน')
const isSelf=user=>user.email===(typeof props.account==='string'?props.account:props.account?.email)
watch(()=>props.compact,compact=>{if(!compact)open.value=false})
</script>
<style scoped>
.presence-panel{min-width:0;color:var(--text-main,#352522)}
.presence-heading,.presence-roster-heading{display:flex;align-items:center;gap:7px;font-size:12px;font-weight:500;line-height:1.6}
.presence-status{display:inline-block;width:7px;height:7px;flex-shrink:0;border-radius:50%;background:var(--text-muted,#7D675B)}
.presence-status.is-connected{background:#15803D}
.presence-count{margin-left:auto;font-size:11px;font-weight:500;color:var(--text-muted,#7D675B);white-space:nowrap;font-variant-numeric:tabular-nums}
.presence-empty{margin-top:8px;font-size:12px;color:var(--text-muted,#7D675B)}
.presence-trigger{display:flex;align-items:center;width:100%;gap:10px;min-height:52px;border-radius:12px;text-align:left;padding:6px;color:inherit;background:transparent}
.presence-trigger:hover{background:var(--bg-soft,#F4EBDD)}
.presence-trigger:focus-visible{outline:2px solid var(--accent-brand,#780608);outline-offset:3px}
.presence-symbol{position:relative;display:grid;place-items:center;width:36px;height:36px;flex-shrink:0;border-radius:12px;background:var(--bg-soft,#F4EBDD);color:var(--accent-brand,#780608)}
.presence-symbol>svg{width:19px;height:19px}.presence-symbol>.presence-status{position:absolute;right:1px;bottom:1px;width:9px;height:9px;border:2px solid var(--bg-app,#FBF5EA)}
.presence-trigger-copy{display:flex;flex-direction:column;gap:3px;flex:1;min-width:0}.presence-trigger-copy strong{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:600}.presence-trigger-copy>span{font-size:11px;color:var(--text-muted,#7D675B)}
.presence-chevron{width:16px;height:16px;color:var(--text-muted,#7D675B);flex-shrink:0}
.presence-panel--rail .presence-trigger{justify-content:center;min-height:48px;padding:4px}
.presence-roster-heading{flex-shrink:0;padding-bottom:16px;border-bottom:1px solid var(--border-color,#E8DCCB)}
.presence-roster-region{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;scrollbar-color:var(--text-muted,#7D675B) var(--bg-soft,#F4EBDD);scrollbar-width:thin}.presence-roster-region:focus-visible{outline:2px solid var(--accent-brand,#780608);outline-offset:-2px;border-radius:8px}
.presence-roster{list-style:none;margin:0;padding:0 0 max(16px,env(safe-area-inset-bottom))}.presence-person{display:flex;align-items:flex-start;gap:12px;padding:18px 0}.presence-person+.presence-person{border-top:1px solid var(--border-color,#E8DCCB)}
.presence-person>img,.presence-initials{width:44px;height:44px;flex-shrink:0;border-radius:50%;object-fit:cover}.presence-initials{display:grid;place-items:center;background:var(--accent-brand,#780608);color:var(--bg-card,#FFFCF6);font-size:13px;font-weight:600}
.presence-person-copy{min-width:0;flex:1}.presence-person-name{font-size:14px;font-weight:500;overflow-wrap:anywhere;line-height:1.6}.presence-self{display:inline-block;margin-left:8px;font-size:11px;font-weight:400;color:var(--text-muted,#7D675B)}
.presence-email{font-size:12px;line-height:1.7;color:var(--text-muted,#7D675B);overflow-wrap:anywhere}.presence-role{display:inline-block;margin-top:6px;font-size:11px;color:var(--accent-brand,#780608);background:var(--bg-soft,#F4EBDD);border-radius:6px;padding:3px 7px}
.presence-roster-empty{padding:32px 0;text-align:center;font-size:13px;color:var(--text-muted,#7D675B)}
</style>
