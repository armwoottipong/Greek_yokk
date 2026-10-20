<template>
 <DialogFrame :open="store.modals.menuEdit.isOpen" id="MenuEditModal" :title="isEditing?'แก้ไขเมนู':'เพิ่มเมนูใหม่'" description="ชื่อและราคา ตามด้วยสูตรที่ใช้ต่อ 1 เสิร์ฟ" width="720px" :teleport="false" initial-focus="#menu-name" @request-close="requestClose(close)">
  <div class="menu-editor">
   <section class="menu-editor-basics" aria-label="ข้อมูลเมนู">
    <div class="menu-editor-identity"><FormField label="ไอคอน"><Button variant="secondary" class="menu-editor-emoji" aria-label="เปลี่ยนไอคอนเมนู" @click="openEmojiPicker"><span aria-hidden="true">{{ form.emoji }}</span></Button></FormField><FormField id="menu-name" label="ชื่อเมนู" required :error="nameError" v-slot="{controlId,describedBy,invalid}"><AppInput :id="controlId" v-model="form.name" :aria-describedby="describedBy" :aria-invalid="invalid" aria-required="true" placeholder="เช่น Greek Yogurt Bowl (M)"/></FormField></div>
    <FormField id="menu-description" label="คำอธิบายสั้น" v-slot="{controlId}"><AppInput :id="controlId" v-model="form.description" aria-label="คำอธิบายเมนู" placeholder="เช่น กรีกโยเกิร์ตแท้ 160g พร้อมผลไม้สด"/></FormField>
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
   <details v-smooth-disclosure class="menu-editor-section" data-menu-groups open><summary><span>กลุ่มตัวเลือก</span><small>{{ form.addonGroupIds?.length || 0 }} กลุ่ม</small></summary><div class="menu-editor-section-body menu-editor-options">
    <FormField id="menu-option-mode" label="รูปแบบตัวเลือก" v-slot="{controlId}"><AppSelect :id="controlId" :model-value="Array.isArray(form.addonGroupIds) ? 'groups' : 'legacy'" @update:model-value="form.addonGroupIds = $event === 'groups' ? [] : undefined"><option value="legacy">ใช้ Add-on ทั้งหมดตามเดิม</option><option value="groups">ใช้กลุ่มตัวเลือกที่กำหนด</option></AppSelect></FormField>
    <template v-if="Array.isArray(form.addonGroupIds)">
     <p class="menu-editor-help">เลือกได้หลายกลุ่ม กำหนดรายการ จำนวน และราคาได้ที่หน้า Add-on หากไม่เลือกกลุ่ม เมนูนี้จะไม่มีตัวเลือก</p>
     <p v-if="!form.hasAddons" class="menu-editor-help">เปิด “อนุญาตให้เลือก Add-on” ในตัวเลือกการขาย เพื่อใช้กลุ่มที่เลือกไว้</p>
     <AppCheckbox v-for="group in store.addonGroups" :key="group.id" :model-value="form.addonGroupIds.includes(group.id)" :label="group.name" @update:model-value="toggleGroup(group.id, $event)">{{ group.name }} · {{ group.pricingMode === 'included' ? 'รวมในราคา' : 'เพิ่มเงิน' }} · {{ group.minSelections }}–{{ group.maxSelections }} {{ group.allowRepeat ? 'ที่' : 'ชนิด' }}</AppCheckbox>
     <p v-if="!store.addonGroups.length" class="menu-editor-empty">ยังไม่มีกลุ่มตัวเลือก สร้างกลุ่มได้ที่หน้า Add-on</p>
    </template>
   </div></details>
   <details v-smooth-disclosure class="menu-editor-section" data-menu-permissions><summary><span>ตัวเลือกการขาย</span><small>ท็อปปิ้งและบรรจุภัณฑ์</small></summary><div class="menu-editor-section-body menu-editor-options">
    <AppCheckbox v-model="form.hasAddons" variant="switch" label="อนุญาตให้เลือก Add-on"><strong>อนุญาตให้เลือก Add-on</strong><small>ลูกค้าสั่งท็อปปิ้งเพิ่มเติมได้</small></AppCheckbox>
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
  <template #footer><div class="menu-editor-footer"><Button variant="quiet" @click="requestClose(close)">ยกเลิก</Button><Button @click="submit"><Check :size="18" aria-hidden="true"/>บันทึกข้อมูลเมนู</Button></div></template>
 </DialogFrame>
</template>
<script setup>
import {vSmoothDisclosure} from '@/directives/smoothDisclosure'
import {getMaterialKindLabel} from '@/domain/materialClassification'
import MenuPriceInfo from '@/components/catalog/MenuPriceInfo.vue'
import FormField from '@/components/ui/FormField.vue'
import AppInput from '@/components/ui/AppInput.vue'
import RecipeEditorRow from '@/components/ui/RecipeEditorRow.vue'
import Button from '@/components/ui/Button.vue'
import AppCheckbox from '@/components/ui/AppCheckbox.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import DialogFrame from '@/components/ui/DialogFrame.vue'
import { ref, computed, watch, nextTick } from 'vue'
import { usePosStore } from '@/stores/posStore'
import { useModalForm } from '@/composables/useModalForm'

import { Plus, Check } from 'lucide-vue-next'

const store = usePosStore()
const nameError=ref('')
const openPriceInfo=ref(null)
watch(() => store.modals.menuEdit.isOpen, () => { openPriceInfo.value = null })

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
const packageRecipeRows = ref([])

const { saveSnapshot, requestClose, confirmSave } = useModalForm(() => ({
  form: form.value,
  baseRecipeRows: baseRecipeRows.value,
  packageRecipeRows: packageRecipeRows.value
}))

const isEditing = computed(() => Boolean(store.modals.menuEdit.menuId))
const storefront = computed(() => store.platforms.find(p => p.id === 'PLAT01'))

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
    nameError.value=''
    const menuId = store.modals.menuEdit.menuId
    const menu = menuId ? store.menus.find(m => m.id === menuId) : null

    form.value = {
      id: menu ? menu.id : '',
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
      const defaultBase = store.activeMaterials.find(m => m.id === 'MAT001' && m.inventoryType === 'ingredient') || store.activeMaterials.find(m => m.inventoryType === 'ingredient')
      if (defaultBase) {
        baseRecipeRows.value.push({ materialId: defaultBase.id, qty: 100 })
      }
      const defaultCup = packagingMaterials.value.find(m => m.id === 'MAT010') || packagingMaterials.value[0]
      if (defaultCup) {
        packageRecipeRows.value.push({ materialId: defaultCup.id, qty: 1 })
      }
    }

    nextTick(() => {
      saveSnapshot()
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

function toggleGroup(id, checked) {
  form.value.addonGroupIds = checked ? [...form.value.addonGroupIds, id] : form.value.addonGroupIds.filter(value => value !== id)
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

async function submit() {
  nameError.value=''
  if (!form.value.name.trim()) {
    nameError.value='กรุณากรอกชื่อเมนูก่อนบันทึก'
    await nextTick()
    document.getElementById('menu-name')?.focus()
    return
  }

  const ok = await confirmSave(form.value.name.trim())
  if (!ok) return

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
  const result = store.saveMenu({
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

  if (result?.ok || result?.success) {
    store.modals.menuEdit.savedMenuId=form.value.id || store.menus.find(menu=>!previousIds.has(menu.id))?.id || null
    close()
  }
}
</script>





<style scoped src="@/components/ui/catalogEditor.css"></style>

<style>
#MenuEditModal:focus,#MenuEditModal :focus,#MenuEditModal :focus-visible{outline:none!important;box-shadow:none!important}
</style>
