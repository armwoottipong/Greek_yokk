<template>
  <div class="settings-page">
    <!-- Header -->
    <div class="settings-intro">
      <div>
      <h2>ตั้งค่าร้าน</h2>
      <p class="text-xs text-stone-400 mt-0.5">
        {{ store.cloud ? 'จัดการผู้ใช้งาน ช่องทางขาย และข้อมูลร้านในที่เดียว' : 'ข้อมูลหลักเก็บในเครื่องนี้ จัดหมวดหมู่ สำรองข้อมูล และดูการเชื่อมต่อได้ในที่เดียว' }}
      </p>
      </div>
      <span class="settings-local"><Database :size="15" /> {{ store.cloud ? 'ข้อมูลร้านบน Firebase' : 'ข้อมูลหลักเก็บในเครื่อง' }}</span>
    </div>

    <div v-if="store.cloud" class="settings-shop-status" :class="{'is-disconnected':!store.connected}">
      <div><Cloud :size="20"/><span><strong>{{ store.connected ? 'ร้านเชื่อมต่อแล้ว' : 'ยังยืนยันการเชื่อมต่อไม่ได้' }}</strong><small>{{ store.connected ? 'ใช้ข้อมูลเดียวกันทุกเครื่อง · บันทึกเมื่อเซิร์ฟเวอร์ยืนยัน' : 'พักการบันทึกไว้ก่อน กรุณาตรวจอินเทอร์เน็ต' }}</small></span></div>
      <button type="button" @click="activeSettingsSection='firebase'">ดูสถานะร้าน</button>
    </div>
    <label class="settings-mobile-nav" for="settings-category">หมวดการตั้งค่า
      <select id="settings-category" v-model="activeSettingsSection"><option v-for="section in settingsSections" :key="section.id" :value="section.id">{{ section.label }}</option></select>
    </label>
    <div class="settings-layout">
    <nav aria-label="หมวดการตั้งค่า" class="settings-nav">
      <button v-for="section in settingsSections" :key="section.id" type="button"
        :aria-controls="`settings-${section.id}`" :aria-current="activeSettingsSection === section.id ? 'page' : undefined"
        @click="activeSettingsSection = section.id"
        class="settings-nav-item">
        <component :is="section.icon" :size="18" />
        <span><strong>{{ section.label }}</strong><small>{{ section.description }}</small></span>
      </button>
    </nav>
    <div class="settings-content">
    <CloudAccessPanel v-if="store.cloud && visitedSections.has('access')" v-show="activeSettingsSection==='access'" :emails="store.allowedEmails||{}" :account="store.account" :blocked="store.settingsBlocked" :save-emails="store.saveAllowedEmails"/>
    <CloudRecoveryPanel v-if="store.cloud && visitedSections.has('recovery')" v-show="activeSettingsSection==='recovery'" :project-id="store.projectId" :shop-id="store.shopId" :blocked="store.settingsBlocked"/>
    <div v-if="store.cloud" id="settings-backup" v-show="activeSettingsSection==='backup'" class="editorial-card p-4 sm:p-6 space-y-4">
      <h3>สำรองข้อมูล Firebase</h3>
      <p>เก็บเมนู วัตถุดิบ ล็อต บิล และประวัติจากเซิร์ฟเวอร์ไว้ในไฟล์เดียว ก่อนกู้คืนหรือย้ายข้อมูลร้าน</p>
      <div class="settings-export-action"><Download :size="28"/><div><strong>ไฟล์สำรองข้อมูลร้าน (.json)</strong><p>ข้อมูลทั้งหมดจาก revision เดียวกัน ตรวจความครบด้วย SHA-256</p></div></div>
      <Button :loading="backupSaving" :disabled="store.settingsBlocked" @click="exportBackup">ดาวน์โหลดไฟล์สำรอง</Button>
      <details class="settings-disclosure"><summary>ข้อมูลที่สำรองและข้อจำกัด</summary><p>สำรองข้อมูลธุรกิจ สูงสุด 10,000 เอกสาร / 20 MB ต่อไฟล์ ไม่รวมตะกร้า ข้อมูลล็อกอิน และคำสั่งที่กำลังเตรียม หากร้านกำลังบันทึกต่อเนื่อง ให้พักการบันทึกชั่วคราวแล้วลองใหม่</p></details>
      <p>มีไฟล์สำรองแล้ว? <button class="settings-text-link" type="button" @click="activeSettingsSection='recovery'">ตรวจไฟล์และเตรียมกู้คืน</button> ผ่านเครื่องเจ้าของร้าน</p>
      <p v-if="backupError" role="alert">{{ backupError }}</p>
      <p v-if="backupSaved" role="status">เตรียมไฟล์ revision {{ backupSaved.revision }} สำเร็จ · ตรวจ SHA-256 แล้ว และส่งไฟล์ให้เบราว์เซอร์ดาวน์โหลด</p>
    </div>
    <div v-if="store.cloud" id="settings-firebase" v-show="activeSettingsSection==='firebase'" class="editorial-card p-4 sm:p-6 space-y-4">
      <h3>การเชื่อมต่อ Firebase</h3>
      <p role="status">{{ store.connected ? 'เชื่อมต่อเซิร์ฟเวอร์แล้ว' : 'ยังยืนยันการเชื่อมต่อเซิร์ฟเวอร์ไม่ได้ · พักการบันทึก' }}</p>
      <dl class="settings-connection-details"><dt>บัญชีที่กำลังใช้งาน</dt><dd>{{ store.account }}</dd><dt>การบันทึก</dt><dd>{{ store.settingsBlocked ? 'พักการบันทึก · รอระบบพร้อม' : 'พร้อมบันทึกข้อมูลร้าน' }}</dd></dl>
      <details class="settings-disclosure"><summary>รายละเอียด Firebase</summary><dl class="settings-connection-details"><dt>โปรเจกต์</dt><dd>{{ store.projectId }}</dd><dt>ร้าน</dt><dd>{{ store.shopId }}</dd></dl></details>
      <p class="text-sm text-stone-500">ใช้ข้อมูลร้านร่วมกันทุกเครื่อง บันทึกสำเร็จเมื่อได้รับการยืนยันจากเซิร์ฟเวอร์</p>
    </div>

    <!-- Section 1: Google Apps Script Web App Integration -->
    <div v-if="!store.cloud" id="settings-sheets" data-settings="sheets" v-show="activeSettingsSection === 'sheets'" class="editorial-card p-4 sm:p-6 bg-white space-y-4">
      <div class="flex items-center gap-3 border-b border-stone-100 pb-3">
        <div class="p-2 rounded-xl bg-emerald-50 text-emerald-800">
          <Cloud class="w-5 h-5" />
        </div>
        <div>
          <h3 class="text-sm font-bold text-stone-900">เชื่อมต่อ Google Sheets</h3>
          <p class="text-xs text-stone-500">สำรองข้อมูลไป Google Sheets เพิ่มเติม ระบบขายใช้งานได้โดยไม่ต้องเชื่อมต่อ</p>
        </div>
      </div>

      <div class="space-y-3">
        <div>
          <label for="gas-url" class="block text-xs font-semibold text-stone-700 mb-1">
            Google Apps Script Web App URL
          </label>
          <div class="flex flex-col sm:flex-row gap-2">
            <input
              v-model="gasUrlInput"
              id="gas-url"
              type="url"
              placeholder="https://script.google.com/macros/s/AKfycb.../exec"
              class="soft-input flex-1 px-3 py-2 rounded-xl text-xs font-mono text-stone-900 placeholder:text-stone-400"
            />
            <button
              @click="saveGasUrl"
              class="px-4 py-2 bg-brand-600 hover:bg-brand-800 text-white rounded-xl text-xs font-semibold transition-colors shrink-0"
            >
              บันทึก URL
            </button>
          </div>
          <p class="text-[11px] text-stone-400 mt-1.5">
            URL ที่ได้จากการ Deploy เป็น Web App ใน Google Apps Script (Who has access: Anyone)
          </p>
        </div>

        <div class="flex flex-wrap gap-3 items-center justify-between pt-2">
          <div class="flex items-center gap-2 text-xs">
            <span
              class="w-2.5 h-2.5 rounded-full"
              :class="store.gasApiUrl ? 'bg-emerald-500' : 'bg-stone-300'"
            ></span>
            <span class="text-stone-600 font-medium">
              {{ store.gasApiUrl ? 'บันทึก URL แล้ว' : 'ยังไม่ได้ระบุ URL' }}
            </span>
            <span v-if="store.lastSyncTime" class="text-stone-400 text-[11px]">
              (ซิงค์ล่าสุด: {{ store.lastSyncTime }})
            </span>
          </div>

          <button
            @click="testSync"
            :disabled="store.isSyncing || !store.gasApiUrl"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-semibold disabled:opacity-50 transition-colors"
          >
            <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': store.isSyncing }" />
            <span>{{ store.isSyncing ? 'กำลังส่งข้อมูล...' : store.syncError ? 'ลองสำรองอีกครั้ง' : 'สำรองไป Google Sheets' }}</span>
          </button>
        </div>
        <p data-sync-status role="status" aria-live="polite" class="text-xs text-stone-600">{{ store.isSyncing?'กำลังส่งข้อมูลไป Google Sheets':store.syncStatus==='success'?'ซิงค์ข้อมูลที่บันทึกแล้วสำเร็จ':store.syncError?'สำรองไม่สำเร็จ ตรวจ URL และอินเทอร์เน็ต แล้วลองอีกครั้ง':store.gasApiUrl?'บันทึก URL แล้ว · ยังไม่ซิงค์ข้อมูล':'ยังไม่เชื่อมต่อ ใช้ไฟล์สำรองในเครื่องได้' }}</p>
        <p v-if="store.syncError" role="alert" class="text-sm text-rose-700">{{ store.syncError }}</p>
      </div>
    </div>

    <!-- Section 2: Platform & Channel GP Rates -->
    <div id="settings-platforms" data-settings="platforms" v-show="activeSettingsSection === 'platforms'" class="editorial-card p-4 sm:p-6 bg-white space-y-4">
      <div class="flex items-center gap-3 border-b border-stone-100 pb-3">
        <div class="p-2 rounded-xl bg-amber-50 text-amber-800">
          <Store class="w-5 h-5" />
        </div>
        <div>
          <h3 class="text-sm font-bold text-stone-900">ช่องทางขายและค่าธรรมเนียม</h3>
          <p class="text-xs text-stone-400">กำหนด GP แยกตามช่องทาง เพื่อคำนวณยอดหลังหัก GP และราคาแนะนำของเมนู</p>
        </div>
      </div>

      <form data-gp-settings novalidate @submit.prevent="saveGpRates" class="settings-gp-form">
        <div class="settings-gp-fields">
          <FormField v-for="plat in store.platforms" :key="plat.id" :id="`gp-${plat.id}`"
            :label="plat.name" :error="gpErrors[plat.id]" v-slot="{controlId,describedBy,invalid}">
            <AppInput :id="controlId" v-model="gpDraft[plat.id]" type="number" min="0" max="100" :step="store.cloud ? '0.01' : 'any'" @update:model-value="gpSaved=false"
              :disabled="gpSaving || store.settingsBlocked"
              :aria-label="`GP ${plat.name}`" :aria-describedby="describedBy" :aria-invalid="invalid">
              <template #suffix>%</template>
            </AppInput>
          </FormField>
        </div>
        <p class="settings-gp-help">กรอกตั้งแต่ 0 และน้อยกว่า 100% · ใช้กับบิลใหม่และราคาแนะนำ ไม่เปลี่ยนราคาขายเมนูหรือบิลที่บันทึกแล้ว</p>
        <p v-if="store.cloud" class="settings-gp-help">รองรับทศนิยมไม่เกิน 2 ตำแหน่ง · บันทึก GP ของทุกช่องทางพร้อมกัน</p>
        <p v-if="gpSaveError" data-gp-save-error role="alert" class="settings-gp-error">{{ gpSaveError }}</p>
        <p v-if="gpConflict" role="alert">ข้อมูลร้านเปลี่ยนแล้ว กรุณาโหลดค่าใหม่และตรวจ GP อีกครั้งก่อนบันทึก</p>
        <p v-if="gpSaved" role="status">บันทึก GP สำเร็จ · ยืนยันจากเซิร์ฟเวอร์แล้ว</p>
        <div class="settings-gp-actions"><Button type="submit" :loading="gpSaving" :disabled="!gpDirty || gpConflict || store.settingsBlocked || Object.keys(gpErrors).length > 0">บันทึก GP</Button><Button v-if="store.cloud" variant="secondary" :disabled="gpSaving || store.settingsBlocked" @click="resetGpDraft">โหลดค่าปัจจุบัน</Button></div>
      </form>
    </div>

    <!-- Section 3: Category Management (จัดการหมวดหมู่ระบบ) -->
    <!-- Section 4: Data Management & Backup -->
    <div v-if="!store.cloud" id="settings-backup" data-settings="backup" v-show="activeSettingsSection === 'backup'" class="editorial-card p-4 sm:p-6 bg-white space-y-4">
      <div class="flex items-center gap-3 border-b border-stone-100 pb-3">
        <div class="p-2 rounded-xl bg-rose-50 text-rose-800">
          <Database class="w-5 h-5" />
        </div>
        <div>
          <h3 class="text-sm font-bold text-stone-900">สำรองและกู้คืนข้อมูล</h3>
          <p class="text-xs text-stone-500">ดาวน์โหลดข้อมูลเก็บไว้ก่อนกู้คืนหรือเริ่มร้านใหม่</p>
        </div>
      </div>

      <div class="settings-backup-actions">
        <!-- Export Backup -->
        <div class="settings-backup-card is-export">
          <div>
            <div class="font-bold text-xs text-stone-900 flex items-center gap-1.5">
              <Download class="w-4 h-4 text-stone-600" />
              <span>เก็บข้อมูลร้านไว้ให้อุ่นใจ</span>
            </div>
            <p class="text-[11px] text-stone-400 mt-1">
              ดาวน์โหลดไฟล์ .json รวมเมนู วัตถุดิบ และประวัติคำสั่งซื้อ
            </p>
          </div>
          <button
            @click="exportBackup"
            class="w-full py-2 bg-white hover:bg-stone-100 border border-stone-200 text-stone-800 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            ดาวน์โหลดไฟล์สำรอง
          </button>
        </div>

        <!-- Import Backup -->
        <div class="settings-backup-card">
          <div>
            <div class="font-bold text-xs text-stone-900 flex items-center gap-1.5">
              <Upload class="w-4 h-4 text-stone-600" />
              <span>กู้คืนจากไฟล์สำรอง</span>
            </div>
            <p class="text-[11px] text-stone-400 mt-1">
              กู้คืนข้อมูลจากไฟล์ JSON ที่เคยสำรองไว้
            </p>
          </div>
          <div>
            <input
              type="file"
              ref="fileInput"
              accept=".json"
              class="hidden"
              @change="handleImportFile"
            />
            <button
              @click="$refs.fileInput.click()"
              class="w-full py-2 bg-white hover:bg-stone-100 border border-stone-200 text-stone-800 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              เลือกไฟล์เพื่อกู้คืน
            </button>
          </div>
        </div>
      </div>
      <div class="settings-reset-heading"><h4>เริ่มต้นข้อมูลใหม่</h4><p>ทั้งสองตัวเลือกจะแทนที่ข้อมูลปัจจุบัน ควรเก็บไฟล์สำรองก่อน</p></div>
      <div class="settings-reset-actions">

        <!-- Clear All Data (Start Fresh) -->
        <div class="settings-reset-card is-danger">
          <div>
            <div class="font-bold text-xs text-rose-900 flex items-center gap-1.5">
              <Trash2 class="w-4 h-4 text-rose-600" />
              <span>ล้างข้อมูลทั้งหมด (เริ่มใหม่)</span>
            </div>
            <p class="text-[11px] text-stone-500 mt-1">
              ลบเมนู วัตถุดิบ ท็อปปิ้ง และประวัติขาย เพื่อเริ่มร้านใหม่
            </p>
          </div>
          <button
            @click="confirmClearAll"
            class="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            ล้างข้อมูลทั้งหมดออก
          </button>
        </div>

        <!-- Reset Demo Data -->
        <div class="settings-reset-card">
          <div>
            <div class="font-bold text-xs text-stone-800 flex items-center gap-1.5">
              <RotateCcw class="w-4 h-4 text-stone-600" />
              <span>โหลดตัวอย่าง (Demo Data)</span>
            </div>
            <p class="text-[11px] text-stone-400 mt-1">
              คืนค่าเมนู วัตถุดิบ และออเดอร์ตัวอย่างของร้านกรีกโยเกิร์ต
            </p>
          </div>
          <button
            @click="confirmResetDemo"
            class="w-full py-2 bg-white hover:bg-stone-100 border border-stone-200 text-stone-800 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            โหลดข้อมูลตัวอย่าง Demo
          </button>
        </div>
      </div>
    </div>

    <!-- Section 4: System Information -->
    <div class="settings-footer">
      <div class="flex items-center gap-2">
        <Database :size="14" />
        <span>Greek Yogg. · {{ store.cloud ? 'Firebase' : 'ข้อมูลในเครื่องนี้' }}</span>
      </div>
      <div>
        {{ (store.materials.length + store.menus.length + store.addons.length + store.orders.length) }} รายการ
      </div>
    </div>
    </div>
    </div>
  </div>
</template>

<script setup>
import '@/assets/settings.css'
import CloudRecoveryPanel from '@/cloud/core/CloudRecoveryPanel.vue'
import CloudAccessPanel from '@/cloud/core/CloudAccessPanel.vue'
import { businessDateKey } from '@/domain/businessDate'
import { ref, computed, watch } from 'vue'
import FormField from '@/components/ui/FormField.vue'
import AppInput from '@/components/ui/AppInput.vue'
import Button from '@/components/ui/Button.vue'
import { isValidGp } from '@/domain/pricing'
import { usePosStore } from '@/stores/posStore'
import {
  Cloud,
  Store,
  Database,
  RefreshCw,
  Download,
  Upload,
  RotateCcw,
  Tags,
  Plus,
  Edit3,
  Trash2,
  Check,
  X
} from 'lucide-vue-next'

const props=defineProps({model:{type:Object,default:null}})
const store = props.model || usePosStore()
const activeSettingsSection = ref(store.cloud ? 'access' : 'backup')
const visitedSections=ref(new Set([activeSettingsSection.value]))
watch(activeSettingsSection,section=>visitedSections.value.add(section))
const settingsSections = store.cloud ? [
  {id:'access',label:'ผู้ใช้งาน',description:'อีเมลที่อนุญาตให้เข้าร้าน',icon:Check},
  {id:'platforms',label:'ช่องทางขาย',description:'ตั้งค่า GP แต่ละช่องทาง',icon:Store},
  {id:'backup',label:'สำรองข้อมูล',description:'ดาวน์โหลดข้อมูลจาก Firebase',icon:Database},
  {id:'recovery',label:'กู้คืน / เริ่มร้านใหม่',description:'ตรวจไฟล์และใช้เครื่องเจ้าของ',icon:RotateCcw},
  {id:'firebase',label:'สถานะร้าน',description:'บัญชีและการเชื่อมต่อ Firebase',icon:Cloud}
] : [
  { id: 'backup', label: 'สำรองและกู้คืน', description: 'เก็บข้อมูลร้านให้อุ่นใจ', icon: Database },
  { id: 'platforms', label: 'ช่องทางขาย', description: 'ตั้งค่า GP แต่ละช่องทาง', icon: Store },
  { id: 'sheets', label: 'Google Sheets', description: 'เชื่อมต่อและสำรองออนไลน์', icon: Cloud }
]
const gasUrlInput = ref(store.gasApiUrl)
const fileInput = ref(null)
const gpDraft = ref({})
const gpSaveError = ref('')
const gpSaving=ref(false),gpSaved=ref(false),gpConflict=ref(false),gpRevision=ref(null)
function resetGpDraft(){
  gpDraft.value = Object.fromEntries(store.platforms.map(p => [p.id, p.gpPercent]))
  gpSaveError.value = '';gpConflict.value=false;gpSaved.value=false;gpRevision.value=store.revision
}
resetGpDraft()
watch(() => JSON.stringify(store.platforms.map(p => [p.id, p.gpPercent])), () => {
  if(store.cloud && gpDirty.value){if(!gpSaving.value)gpConflict.value=true;return}
  resetGpDraft()
})
const gpErrors = computed(() => Object.fromEntries(store.platforms
  .filter(p => !isValidGp(gpDraft.value[p.id]))
  .map(p => [p.id, 'กรอก GP ตั้งแต่ 0 และน้อยกว่า 100%'])))
const gpDirty = computed(() => store.platforms.some(p => Number(gpDraft.value[p.id]) !== p.gpPercent || !isValidGp(gpDraft.value[p.id])))
watch(()=>store.revision,()=>{if(!store.cloud||gpSaving.value)return;if(gpDirty.value)gpConflict.value=true;else resetGpDraft()})
async function saveGpRates() {
  gpSaveError.value = ''
  if (gpSaving.value || store.settingsBlocked || gpConflict.value || Object.keys(gpErrors.value).length || !gpDirty.value) return
  gpSaving.value=true;gpSaved.value=false
  try{
    const result = await store.savePlatformGpRates({...gpDraft.value},gpRevision.value)
    if (!result.ok) gpSaveError.value = result.message || 'ยังยืนยันการบันทึกไม่ได้ กรุณาตรวจคำสั่งค้างก่อนลองใหม่'
    else if(store.cloud){resetGpDraft();gpSaved.value=true}
  }catch{gpSaveError.value='ยังยืนยันการบันทึกไม่ได้ กรุณาตรวจคำสั่งค้างก่อนลองใหม่'}
  finally{gpSaving.value=false;if(store.cloud&&gpDirty.value&&gpRevision.value!==store.revision)gpConflict.value=true}
}

// ==========================================
// CATEGORY MANAGEMENT LOGIC
// ==========================================
// ==========================================
// SYSTEM SETTINGS & BACKUP
// ==========================================
function saveGasUrl() {
  store.saveGasUrl(gasUrlInput.value)
}

function testSync() {
  store.syncWithGas()
}

const backupSaving=ref(false),backupError=ref(''),backupSaved=ref(null)
async function exportBackup() {
  if(store.cloud){
    if(backupSaving.value||store.settingsBlocked)return
    backupSaving.value=true;backupError.value='';backupSaved.value=null
    try{
      const result=await store.exportCloudBackup()
      if(store.settingsBlocked)throw Object.assign(new Error('NOT_READY'),{code:'NOT_READY'})
      downloadBackup(result.text,result.filename);backupSaved.value={revision:result.revision,counts:result.counts}
    }catch(error){
      const code=error?.code||error?.message
      backupError.value=code==='BACKUP_BUSY'?'ข้อมูลร้านเปลี่ยนระหว่างสำรอง กรุณาพักการบันทึกแล้วลองใหม่':code==='BACKUP_TOO_LARGE'?'ข้อมูลเกินขนาดสำรองผ่านเว็บ กรุณาติดต่อผู้ดูแลเพื่อส่งออกให้ครบ':code==='BACKUP_INCOMPLETE'?'ข้อมูลร้านไม่ครบ จึงยังไม่สร้างไฟล์สำรอง กรุณาตรวจข้อมูลก่อนลองใหม่':'สำรองไม่สำเร็จ ยังไม่ได้ดาวน์โหลดไฟล์ กรุณาตรวจการเชื่อมต่อแล้วลองใหม่'
    }finally{backupSaving.value=false}
    return
  }
  const data = { ...store.exportDatabase(), exportDate: new Date().toISOString(), system: 'Greek Yogurt POS v3' }

  const jsonStr = JSON.stringify(data, null, 2)
  const dateStr = businessDateKey(new Date())
  downloadBackup(jsonStr,`greek-yogurt-pos-backup-${dateStr}.json`)
  store.showToast('ดาวน์โหลดไฟล์ข้อมูลสำรองสำเร็จ', 'success')
}
function downloadBackup(text,filename){
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  try{a.click()}finally{a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
}

function handleImportFile(event) {
  const file = event.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target.result)
      if (!await store.confirmDialog({title:'กู้คืนข้อมูลจากไฟล์?',message:'ข้อมูลปัจจุบันจะถูกแทนที่ด้วยไฟล์ '+file.name,confirmText:'กู้คืนข้อมูล',cancelText:'ยกเลิก',type:'danger'})) return
      const result = store.replaceDatabase(data,{source:'import'})
      if (!result.ok) { store.showToast('กู้คืนไม่สำเร็จ: ' + result.message,'error'); return }
      gasUrlInput.value = store.gasApiUrl
      store.showToast('กู้คืนข้อมูลจากไฟล์สำรองสำเร็จ','success')
    } catch (err) {
      console.error(err)
      store.showToast('ไม่สามารถอ่านไฟล์ JSON ได้: ' + err.message, 'error')
    } finally { event.target.value='' }
  }
  reader.readAsText(file)
}

async function confirmClearAll() {
  const ok = await store.confirmDialog({
    title: 'ยืนยันล้างข้อมูลทั้งหมดออก?',
    message: 'เมนู, วัตถุดิบ, สต็อก, Add-on และประวัติคำสั่งซื้อทั้งหมดจะถูกล้าง\n\n(คุณสามารถกด "โหลด Demo" เพื่อนำชุดข้อมูลตัวอย่างกลับมาได้ทุกเมื่อ)',
    confirmText: 'ล้างข้อมูลทั้งหมด',
    cancelText: 'ยกเลิก',
    type: 'danger'
  })
  if (ok) {
    store.clearAllData()
  }
}

async function confirmResetDemo() {
  const ok = await store.confirmDialog({
    title: 'โหลดชุดข้อมูลตัวอย่าง Demo?',
    message: 'ข้อมูลออเดอร์, ยอดสต็อก และเมนูจะถูกแทนที่ด้วยชุดข้อมูลตัวอย่างสำหรับร้านกรีกโยเกิร์ต\n\nต้องการดำเนินการต่อหรือไม่?',
    confirmText: 'โหลดข้อมูล Demo',
    cancelText: 'ยกเลิก',
    type: 'warning'
  })
  if (ok) {
    store.resetDemoData()
  }
}
</script>
