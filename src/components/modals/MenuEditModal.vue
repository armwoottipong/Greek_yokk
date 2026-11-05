<template>
 <DialogFrame :busy="!!actionPending" :open="store.modals.menuEdit.isOpen" id="MenuEditModal" :title="isEditing?'แก้ไขเมนู':'เพิ่มเมนูใหม่'" description="ชื่อและราคา ตามด้วยสูตรที่ใช้ต่อ 1 เสิร์ฟ" width="720px" :teleport="false" :initial-focus="initialFocus" @request-close="requestClose(close)">
  <div class="menu-editor">
   <section class="menu-editor-basics" aria-label="ข้อมูลเมนู">
    <div class="menu-editor-identity"><FormField label="ไอคอน"><Button variant="secondary" class="menu-editor-emoji" aria-label="เปลี่ยนไอคอนเมนู" @click="openEmojiPicker"><span aria-hidden="true">{{ form.emoji }}</span></Button></FormField><FormField id="menu-name" label="ชื่อเมนู" required :error="nameError" v-slot="{controlId,describedBy,invalid}"><AppInput :id="controlId" v-model="form.name" :aria-describedby="describedBy" :aria-invalid="invalid" aria-required="true" placeholder="เช่น Greek Yogurt Bowl (M)"/></FormField></div>
    <FormField id="menu-description" label="คำอธิบายสั้น" v-slot="{controlId}"><AppInput :id="controlId" v-model="form.description" placeholder="เช่น กรีกโยเกิร์ตแท้ 160g พร้อมผลไม้สด"/></FormField>
    <CatalogImageEditor v-if="store.modals.menuEdit.isOpen" ref="imageEditor" v-model="form.image" kind="menus" :entity-id="form.id" :emoji="form.emoji" :disabled="!!actionPending"/>
   </section>
   <details v-smooth-disclosure class="menu-editor-section" data-menu-prices open><summary><span>ราคาขายแต่ละช่องทาง</span><small>{{ store.platforms.length }} ช่องทาง</small></summary><div class="menu-editor-section-body">
    <div class="menu-editor-prices">
     <div v-for="p in store.platforms" :key="p.id" class="menu-editor-price">
      <FormField :id="`menu-price-${p.id}`" :label="p.name" v-slot="{controlId}">
       <AppInput :id="controlId" v-model="form.prices[p.id]" type="number" min="0" step="any" :aria-label="`ราคา ${p.name}`" placeholder="0">
        <template #prefix>฿</template>
        <template #suffix><MenuPriceInfo :platform="p" :open="openPriceInfo === p.id" :selling-price="form.prices[p.id]" :storefront-price="storefront ? form.prices[storefront.id] : ''" :has-storefront="!!storefront" @toggle="openPriceInfo = openPriceInfo === p.id ? null : p.id" @close="openPriceInfo = null" @apply="form.prices[p.id] = $event" /></template>
       </AppInput>
      </FormField>
     </div>
    </div>
   </div></details>
   <details v-smooth-disclosure class="menu-editor-section" data-menu-groups open><summary><span>ตัวเลือกเสริม</span><small>{{ selectedGroups.length }} กลุ่ม</small></summary><div class="menu-editor-section-body menu-editor-options">
    <AppCheckbox v-model="form.hasAddons" variant="switch" label="เปิดตัวเลือกเสริมตอนขาย"><strong>เปิดตัวเลือกเสริมตอนขาย</strong><small>ใช้ได้ทั้งกลุ่มที่รวมในราคาและกลุ่มที่คิดเพิ่ม</small></AppCheckbox>
    <p v-if="sharedPackaging.length" class="menu-editor-help" role="status">บรรจุภัณฑ์ {{ sharedPackaging.join(', ') }} อยู่ทั้งในสูตรเมนูและในตัวเลือก เมื่อขายจะตัดตามทั้งสองสูตร กรุณาตรวจจำนวนก่อนบันทึก</p>
    <ul v-if="selectedGroups.length" data-menu-group-summary class="menu-group-summary">
     <li v-for="group in selectedGroups" :key="group.id"><strong>{{ group.name }}</strong><small v-if="group.pricingMode">{{ group.pricingMode === 'included' ? 'รวมในราคาเมนู' : 'คิดเงินเพิ่ม' }}</small></li>
    </ul>
    <p v-else class="menu-editor-help">ยังไม่ได้เลือกกลุ่ม</p>
    <Button variant="secondary" data-open-group-picker @click="openGroupPicker">{{ selectedGroups.length ? 'จัดการกลุ่มตัวเลือก' : 'เลือกกลุ่มตัวเลือก' }}</Button>
   </div></details>
   <details v-smooth-disclosure class="menu-editor-section" data-menu-permissions><summary><span>ตัวเลือกการขาย</span><small>การตัดบรรจุภัณฑ์</small></summary><div class="menu-editor-section-body menu-editor-options">
    <AppCheckbox v-model="form.hasPackage" variant="switch" label="ตัดสต็อกบรรจุภัณฑ์"><strong>ตัดสต็อกบรรจุภัณฑ์</strong><small>ใช้ถ้วย ช้อน และถุงตามสูตรด้านล่าง</small></AppCheckbox>
   </div></details>
   <details v-smooth-disclosure class="menu-editor-section" data-menu-recipe open><summary><span>สูตรวัตถุดิบ</span><small>{{ baseRecipeRows.length }} รายการ</small></summary><div class="menu-editor-section-body">
    <p class="menu-editor-help">ปริมาณที่ใช้ต่อ 1 เสิร์ฟ รวมวัตถุดิบหลักและผลไม้</p>
    <div class="menu-editor-recipe-list"><RecipeEditorRow v-for="(row,idx) in baseRecipeRows" :key="idx" v-model:material-id="row.materialId" v-model:qty="row.qty" label="วัตถุดิบในสูตร" :quantity-label="`ปริมาณ ${store.matMap[row.materialId]?.name||'วัตถุดิบในสูตร'}`" :unit="getUnit(row.materialId)" :remove-label="`ลบ ${store.matMap[row.materialId]?.name||'วัตถุดิบ'} จากสูตร`" @remove="removeBaseRecipeRow(idx)"><optgroup v-for="(mats,catName) in recipeMaterialsByCategory" :key="catName" :label="catName"><option v-for="m in mats" :key="m.id" :value="m.id">{{ m.emoji }} {{ m.name }} ({{ m.unit }})</option></optgroup></RecipeEditorRow></div>
    <p v-if="!baseRecipeRows.length" class="menu-editor-empty">ยังไม่มีวัตถุดิบ เพิ่มรายการเพื่อกำหนดสูตร</p>
    <Button variant="secondary" size="compact" @click="addBaseRecipeRow"><Plus :size="16" aria-hidden="true"/>เพิ่มวัตถุดิบ</Button>
   </div></details>
   <details v-smooth-disclosure class="menu-editor-section" data-menu-packaging><summary><span>บรรจุภัณฑ์</span><small>{{ form.hasPackage?packageRecipeRows.length+' รายการ':'ไม่ตัดสต็อก' }}</small></summary><div class="menu-editor-section-body">
    <p v-if="!form.hasPackage" class="menu-editor-help">เมนูนี้ไม่หักสต็อกบรรจุภัณฑ์ เปิดได้ในตัวเลือกการขาย</p>
    <template v-else>
     <p class="menu-editor-help">จำนวนที่ใช้ต่อ 1 เสิร์ฟ</p>
     <div class="menu-editor-recipe-list"><RecipeEditorRow v-for="(row,idx) in packageRecipeRows" :key="idx" v-model:material-id="row.materialId" v-model:qty="row.qty" label="บรรจุภัณฑ์ในสูตร" :quantity-label="`ปริมาณ ${store.matMap[row.materialId]?.name||'บรรจุภัณฑ์ในสูตร'}`" :unit="getUnit(row.materialId)" :min="1" :step="1" :remove-label="`ลบ ${store.matMap[row.materialId]?.name||'บรรจุภัณฑ์'} จากสูตร`" @remove="removePackageRecipeRow(idx)"><option v-for="m in packagingMaterials" :key="m.id" :value="m.id">{{ m.emoji }} {{ m.name }}</option></RecipeEditorRow></div>
     <p v-if="!packageRecipeRows.length" class="menu-editor-empty">ยังไม่มีบรรจุภัณฑ์ เพิ่มถ้วย ช้อน หรือถุงที่ใช้</p>
     <div class="menu-editor-package-actions"><Button variant="secondary" size="compact" @click="addPackageRecipeRow"><Plus :size="16" aria-hidden="true"/>เพิ่มบรรจุภัณฑ์</Button><Button v-for="pkg in packagingMaterials.slice(0,3)" :key="pkg.id" variant="quiet" size="compact" @click="quickAddPackage(pkg.id)">+ {{ pkg.name }}</Button></div>
    </template>
   </div></details>
  </div>
  <template #footer><div class="menu-editor-footer"><Button variant="quiet" :disabled="!!actionPending" @click="requestClose(close)">ยกเลิก</Button><Button :loading="!!actionPending" @click="submit"><Check :size="18" aria-hidden="true"/>บันทึกข้อมูลเมนู</Button></div></template>
 </DialogFrame>
 <DialogFrame :open="pickerOpen" id="menu-group-picker" title="เลือกกลุ่มตัวเลือก" description="ใช้กลุ่มที่รวมในราคาและกลุ่มที่คิดเพิ่มด้วยกันได้" :presentation="mobile?'drawer':'dialog'" width="640px" @request-close="closePicker">
  <div class="group-picker-list">
   <p class="menu-editor-help" role="status">เลือกแล้ว {{ pickerIds.length }} จาก 2 กลุ่ม</p>
   <label v-for="group in store.addonGroups" :key="group.id" class="group-picker-row" :data-picker-group="group.id"><span><strong>{{ group.name }}</strong><small>{{ group.pricingMode==='included'?'รวมในราคาเมนู':'คิดเงินเพิ่มตามตัวเลือก' }} · เลือก {{ group.minSelections }}–{{ group.maxSelections }} {{ group.allowRepeat?'ที่':'ชนิด' }} · {{ group.options.length }} ตัวเลือก</small><small v-if="!pickerIds.includes(group.id) && pickerIssue(group.id)">{{ pickerIssue(group.id) }}</small></span><input type="checkbox" :checked="pickerIds.includes(group.id)" :disabled="!pickerIds.includes(group.id) && !!pickerIssue(group.id)" :aria-label="`เลือกกลุ่ม ${group.name}`" @change="togglePickerGroup(group.id,$event.target.checked)"/></label>
   <p v-if="!store.addonGroups.length" class="menu-editor-empty">ยังไม่มีกลุ่มตัวเลือก สร้างกลุ่มแรกได้ด้านล่าง</p>
   <p v-if="store.cloud" class="menu-editor-help">เมื่อใช้ 2 กลุ่ม แต่ละกลุ่มต้องกำหนดให้เลือกได้สูงสุด 3</p>
   <Button variant="quiet" data-create-group-from-menu @click="createGroupFromPicker"><Plus :size="16" aria-hidden="true"/>สร้างกลุ่มตัวเลือก</Button>
  </div>
  <template #footer><Button variant="quiet" @click="closePicker">ยกเลิก</Button><Button @click="finishPicker">เสร็จสิ้น</Button></template>
 </DialogFrame>
 <AddonGroupManager ref="groupCreator" v-show="false"/>
</template>
<script setup>
import {cloudGroupBindingIssue} from '@/domain/addonGroups'
import '@/components/catalog/menuFocus.css'
import {vSmoothDisclosure} from '@/directives/smoothDisclosure'
import {getMaterialKindLabel} from '@/domain/materialClassification'
import MenuPriceInfo from '@/components/catalog/MenuPriceInfo.vue'
import {findStorefrontPlatform} from '@/domain/pricing'
import {matchesLegacyId} from '@/cloud/paths'
import CatalogImageEditor from '@/components/images/CatalogImageEditor.vue'
import FormField from '@/components/ui/FormField.vue'
import AppInput from '@/components/ui/AppInput.vue'
import RecipeEditorRow from '@/components/ui/RecipeEditorRow.vue'
import Button from '@/components/ui/Button.vue'
import AppCheckbox from '@/components/ui/AppCheckbox.vue'
import DialogFrame from '@/components/ui/DialogFrame.vue'
import AddonGroupManager from '@/components/catalog/AddonGroupManager.vue'
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useInventoryStore } from '@/composables/useInventoryStore'
import { useModalForm } from '@/composables/useModalForm'

import { Plus, Check } from 'lucide-vue-next'

import {useActionPending} from '@/composables/useActionPending'
const {pending:actionPending,run:runAction}=useActionPending()
const store = useInventoryStore()
const nameError=ref('')
const imageEditor=ref(null)
const confirmedBusiness=ref('')
const initialBusiness=ref('')
const businessFingerprint=()=>JSON.stringify({...form.value,image:undefined,baseRecipeRows:baseRecipeRows.value,packageRecipeRows:packageRecipeRows.value})
const editCatalogRevision=ref(null)
const openPriceInfo=ref(null)
const pickerOpen=ref(false),pickerIds=ref([]),mobile=ref(false),groupCreator=ref(null)
const syncViewport=()=>{mobile.value=window.innerWidth<768}
onMounted(()=>{syncViewport();window.addEventListener('resize',syncViewport)})
onUnmounted(()=>window.removeEventListener('resize',syncViewport))
watch(() => store.modals.menuEdit.isOpen, open => { openPriceInfo.value = null;if(!open)pickerOpen.value=false })

const form = ref({
  id: '',
  name: '',
  category: 'Classic Bowls',
  emoji: '🥣',
  description: '',
  prices: {},
  hasAddons: true,
  hasPackage: true
})

const baseRecipeRows = ref([])
const selectedGroups = computed(() => (form.value.addonGroupIds || []).map(id =>
  store.addonGroups.find(group => group.id === id) || { id, name: 'ไม่พบกลุ่มตัวเลือก' }
))
const packageRecipeRows = ref([])
const sharedPackaging = computed(() => {
  if (!form.value.hasPackage || !form.value.hasAddons) return []
  const optionIds = new Set(selectedGroups.value.flatMap(group => (group.options || []).map(option => option.addonId)))
  const optionMaterials = new Set(store.addons.filter(addon => optionIds.has(addon.id)).flatMap(addon => (addon.recipe || []).map(row => row.materialId)))
  return [...new Set(packageRecipeRows.value.filter(row => row.qty > 0 && optionMaterials.has(row.materialId)).map(row => store.matMap[row.materialId]?.name || row.materialId))]
})

const { saveSnapshot, requestClose, confirmSave } = useModalForm(() => ({
  form: form.value,
  baseRecipeRows: baseRecipeRows.value,
  packageRecipeRows: packageRecipeRows.value
}))

const initialFocus = computed(() => ({
  recipe: '[data-menu-recipe] button:not(:disabled)',
  groups: '[data-open-group-picker]'
})[store.modals.menuEdit.initialSection] || '#menu-name')
const isEditing = computed(() => Boolean(store.modals.menuEdit.menuId))
const storefront = computed(() => findStorefrontPlatform(store.platforms))

const recipeMaterialsByCategory = computed(() => {
  const nonPkgs = store.activeMaterials.filter(m => m.inventoryType === 'ingredient')
  const groups = {}
  nonPkgs.forEach(m => {
    const cat = getMaterialKindLabel(m)
    if (!groups[cat]) groups[cat] = []
    groups[cat].push(m)
  })
  return groups
})

const packagingMaterials = computed(() => {
  return store.activeMaterials.filter(m => m.inventoryType === 'packaging')
})

function isPackagingMaterial(m) {
  return m?.inventoryType === 'packaging'
}

function getUnit(matId) {
  const m = store.matMap[matId]
  return m ? m.unit : 'g'
}

// Watch modal open and populate
watch(() => store.modals.menuEdit.isOpen, (open) => {
  if (open) {
    confirmedBusiness.value=''
    editCatalogRevision.value=store.catalogRevision
    nameError.value=''
    const menuId = store.modals.menuEdit.menuId
    const menu = menuId ? store.menus.find(m => m.id === menuId) : null

    form.value = {
      id: menu ? menu.id : '',
      image: menu?.image || '',
      name: menu ? menu.name : '',
      category: menu ? menu.category : 'Classic Bowls',
      emoji: menu ? menu.emoji : '🥣',
      description: menu ? (menu.description || '') : '',
      prices: menu ? { ...menu.prices } : {},
      hasAddons: menu ? (menu.hasAddons !== false) : true,
      addonGroupIds: menu ? (menu.addonGroupIds ? [...menu.addonGroupIds] : undefined) : [],
      hasPackage: menu ? (menu.hasPackage !== false) : true
    }

    // Default prices template if empty
    store.platforms.forEach(p => {
      if (form.value.prices[p.id] === undefined) {
        form.value.prices[p.id] = ''
      }
    })

    // Separate recipes
    baseRecipeRows.value = []
    packageRecipeRows.value = []

    if (menu && Array.isArray(menu.recipe)) {
      menu.recipe.forEach(r => {
        const mat = store.matMap[r.materialId]
        if (mat && isPackagingMaterial(mat)) {
          packageRecipeRows.value.push({ materialId: r.materialId, qty: r.qty })
        } else {
          baseRecipeRows.value.push({ materialId: r.materialId, qty: r.qty })
        }
      })
    } else {
      // For new menu: if materials exist, add defaults if available
      const defaultBase = store.activeMaterials.find(m => matchesLegacyId(m.id, 'MAT001') && m.inventoryType === 'ingredient') || store.activeMaterials.find(m => m.inventoryType === 'ingredient')
      if (defaultBase) {
        baseRecipeRows.value.push({ materialId: defaultBase.id, qty: 100 })
      }
      const defaultCup = packagingMaterials.value.find(m => matchesLegacyId(m.id, 'MAT010')) || packagingMaterials.value[0]
      if (defaultCup) {
        packageRecipeRows.value.push({ materialId: defaultCup.id, qty: 1 })
      }
    }

    nextTick(() => {
      saveSnapshot()
      initialBusiness.value=businessFingerprint()
      const suggestedGroupId = store.modals.menuEdit.suggestedGroupId
      if (suggestedGroupId && store.addonGroups.some(group => group.id === suggestedGroupId)) {
        const ids = form.value.addonGroupIds || []
        if (ids.length < 2 && !ids.includes(suggestedGroupId)) {
          form.value.addonGroupIds = [...ids, suggestedGroupId]
          form.value.hasAddons = true
        }
      }
      if(store.modals.menuEdit.initialSection==='recipe'){
        const section=document.getElementById('MenuEditModal')?.querySelector('[data-menu-recipe]')
        if(section){section.open=true;section.querySelector('button:not(:disabled)')?.scrollIntoView?.({block:'nearest'})}
      }
    })
  }
})

function addBaseRecipeRow() {
  const defaultMat = store.activeMaterials.find(m => m.inventoryType === 'ingredient')
  if (!defaultMat) {
    store.showToast('ยังไม่มีรายการวัตถุดิบในระบบ กรุณาเพิ่มวัตถุดิบในหน้าสต็อกก่อน', 'error')
    return
  }
  baseRecipeRows.value.push({
    materialId: defaultMat.id,
    qty: 30
  })
}

function openGroupPicker(){pickerIds.value=[...(form.value.addonGroupIds||[])];pickerOpen.value=true}
function closePicker(){pickerOpen.value=false}
function pickerIssue(id){
  if(pickerIds.value.length>=2)return 'เมนูหนึ่งใช้ได้สูงสุด 2 กลุ่มตัวเลือก'
  if(!store.cloud)return ''
  return cloudGroupBindingIssue([...pickerIds.value,id].map(key=>store.addonGroups.find(group=>group.id===key)))
}
function togglePickerGroup(id,checked){
  if(!checked)pickerIds.value=pickerIds.value.filter(value=>value!==id)
  else if(!pickerIds.value.includes(id)&&!pickerIssue(id))pickerIds.value=[...pickerIds.value,id]
}
function finishPicker() {
  if (pickerIds.value.length || Array.isArray(form.value.addonGroupIds)) {
    form.value.addonGroupIds = [...pickerIds.value]
  }
  closePicker()
}
async function createGroupFromPicker(){
 pickerOpen.value=false
 const id=await groupCreator.value?.openNew()
 if(id){
  editCatalogRevision.value=store.catalogRevision
  const issue=pickerIssue(id)
  if(issue)store.showToast(`สร้างกลุ่มแล้ว · ${issue}`, 'info')
  else togglePickerGroup(id,true)
 }
 if(store.modals.menuEdit.isOpen)pickerOpen.value=true
}

function removeBaseRecipeRow(idx) {
  baseRecipeRows.value.splice(idx, 1)
}

function addPackageRecipeRow() {
  const defaultPkg = packagingMaterials.value[0]
  if (!defaultPkg) {
    store.showToast('ยังไม่มีรายการบรรจุภัณฑ์ในระบบ กรุณาเพิ่มบรรจุภัณฑ์ในหน้าสต็อกก่อน', 'error')
    return
  }
  packageRecipeRows.value.push({
    materialId: defaultPkg.id,
    qty: 1
  })
}

function removePackageRecipeRow(idx) {
  packageRecipeRows.value.splice(idx, 1)
}

function quickAddPackage(matId) {
  if (!store.matMap[matId]) {
    store.showToast('ไม่พบบรรจุภัณฑ์นี้ในระบบ', 'error')
    return
  }
  const existing = packageRecipeRows.value.find(r => r.materialId === matId)
  if (existing) {
    existing.qty += 1
    store.showToast('เพิ่มจำนวนบรรจุภัณฑ์แล้ว', 'success')
  } else {
    packageRecipeRows.value.push({ materialId: matId, qty: 1 })
  }
}

function openEmojiPicker() {
  store.modals.emojiPicker = {
    isOpen: true,
    targetCallback: (emoji) => {
      form.value.emoji = emoji
    }
  }
}

function close() {
  store.modals.menuEdit.isOpen = false
  store.modals.menuEdit.menuId = null
}

const submit=()=>runAction('save',performSave)
async function performSave() {
  nameError.value=''
  if(confirmedBusiness.value){
    if(confirmedBusiness.value!==businessFingerprint()){nameError.value='ข้อมูลเมนูถูกแก้เพิ่มหลังบันทึกแล้ว กรุณาคืนค่าหรือเปิดรายการใหม่ก่อนแก้ข้อมูลอื่น';return}
    await savePictureAndClose();return
  }
  if (!form.value.name.trim()) {
    nameError.value='กรุณากรอกชื่อเมนูก่อนบันทึก'
    await nextTick()
    document.getElementById('menu-name')?.focus()
    return
  }

  const ok = await confirmSave(form.value.name.trim())
  if (!ok) return
  try{imageEditor.value?.assertReady()}catch(e){nameError.value=e.message;return}
  if(store.cloud&&form.value.id&&initialBusiness.value===businessFingerprint()){
    confirmedBusiness.value=businessFingerprint()
    await savePictureAndClose();return
  }

  // Combine recipes
  const combinedRecipe = []
  baseRecipeRows.value.forEach(r => {
    if (r.materialId && r.qty > 0) {
      combinedRecipe.push({ materialId: r.materialId, qty: Number(r.qty) })
    }
  })

  if (form.value.hasPackage) {
    packageRecipeRows.value.forEach(r => {
      if (r.materialId && r.qty > 0) {
        combinedRecipe.push({ materialId: r.materialId, qty: Number(r.qty) })
      }
    })
  }

  const previousIds=new Set(store.menus.map(menu=>menu.id))
  const result = await store.saveMenu({
    ...(!store.cloud?{image:form.value.image||''}:{}),
    ...(store.cloud?{expectedCatalogRevision:editCatalogRevision.value}:{}),
    id: form.value.id || undefined,
    name: form.value.name.trim(),
    emoji: form.value.emoji || '🥣',
    description: form.value.description.trim(),
    prices: Object.fromEntries(Object.entries(form.value.prices).map(([id, value]) => [id, value === '' ? 0 : Number(value)])),
    recipe: combinedRecipe,
    hasAddons: form.value.hasAddons,
    addonGroupIds: form.value.addonGroupIds === undefined ? undefined : [...form.value.addonGroupIds],
    hasPackage: form.value.hasPackage
  })

  if (result?.ok || result?.success || (!store.cloud&&result===undefined)) {
    const savedId=form.value.id || store.menus.find(menu=>!previousIds.has(menu.id))?.id
    form.value.id=savedId
    editCatalogRevision.value=store.catalogRevision
    confirmedBusiness.value=businessFingerprint()
    await savePictureAndClose()
  } else nameError.value=result?.message||'บันทึกไม่สำเร็จ กรุณาตรวจข้อมูลและลองอีกครั้ง'
}
async function savePictureAndClose(){
  try{await imageEditor.value?.save(form.value.id)}catch(e){nameError.value=`บันทึกข้อมูลเมนูแล้ว แต่รูปยังไม่สำเร็จ: ${e.message} · รูปที่เลือกยังอยู่ กดบันทึกเพื่อลองส่งเฉพาะรูปอีกครั้ง`;return}
  store.modals.menuEdit.savedMenuId=form.value.id || null
  close()
}
</script>

<style scoped>
.menu-group-summary{display:flex;flex-wrap:wrap;gap:8px;margin:0;padding:0;list-style:none}
.menu-group-summary li{padding:8px 12px;border-radius:10px;background:var(--bg-soft);overflow-wrap:anywhere}
.group-picker-list{display:grid;gap:12px}
.group-picker-row{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px;border:1px solid var(--border-subtle);border-radius:14px;cursor:pointer}
.group-picker-row span{display:grid;gap:4px;min-width:0;overflow-wrap:anywhere}
.group-picker-row strong{font-size:.9375rem}
.group-picker-row small{color:var(--text-muted);font-size:.8125rem;line-height:1.6}
.group-picker-row input{width:22px;height:22px;accent-color:var(--accent-brand);flex-shrink:0}
.group-picker-row:has(input:checked){border-color:var(--accent-brand);background:var(--bg-soft)}
.group-picker-row:has(input:focus-visible){outline:2px solid var(--accent-brand);outline-offset:2px}
.group-picker-row:has(input:disabled){opacity:.55;cursor:not-allowed}
</style>





<style scoped src="@/components/ui/catalogEditor.css"></style>

<style>
#MenuEditModal:focus,#MenuEditModal :focus,#MenuEditModal :focus-visible{outline:none!important;box-shadow:none!important}
</style>


<style scoped>
.menu-editor{container:menu-editor / inline-size}
@container menu-editor (max-width:399px){.menu-editor-prices{grid-template-columns:minmax(0,1fr)}}
</style>
