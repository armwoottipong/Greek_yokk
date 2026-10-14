<template>
 <DialogFrame :open="store.modals.menuEdit.isOpen" id="MenuEditModal" :title="isEditing?'แก้ไขเมนู':'เพิ่มเมนูใหม่'" description="ชื่อและราคา ตามด้วยสูตรที่ใช้ต่อ 1 เสิร์ฟ" width="720px" :teleport="false" initial-focus="#menu-name" @request-close="requestClose(close)">
  <div class="menu-editor">
   <section class="menu-editor-basics" aria-label="ข้อมูลเมนู">
    <div class="menu-editor-identity"><FormField label="ไอคอน"><Button variant="secondary" class="menu-editor-emoji" aria-label="เปลี่ยนไอคอนเมนู" @click="openEmojiPicker"><span aria-hidden="true">{{ form.emoji }}</span></Button></FormField><FormField id="menu-name" label="ชื่อเมนู" required :error="nameError" v-slot="{controlId,describedBy,invalid}"><AppInput :id="controlId" v-model="form.name" :aria-describedby="describedBy" :aria-invalid="invalid" aria-required="true" placeholder="เช่น Greek Yogurt Bowl (M)"/></FormField></div>
    <FormField id="menu-description" label="คำอธิบายสั้น" v-slot="{controlId}"><AppInput :id="controlId" v-model="form.description" aria-label="คำอธิบายเมนู" placeholder="เช่น กรีกโยเกิร์ตแท้ 160g พร้อมผลไม้สด"/></FormField>
   </section>
   <details v-smooth-disclosure class="menu-editor-section" data-menu-prices open><summary><span>ราคาขายแต่ละช่องทาง</span><small>{{ store.platforms.length }} ช่องทาง</small></summary><div class="menu-editor-section-body">
    <div class="menu-editor-prices"><FormField v-for="p in store.platforms" :key="p.id" :label="p.name" :hint="p.gpPercent>0?'ค่าธรรมเนียมช่องทาง '+p.gpPercent+'%':undefined" v-slot="{controlId}"><AppInput :id="controlId" v-model="form.prices[p.id]" type="number" min="0" step="any" :aria-label="`ราคา ${p.name}`" placeholder="0"><template #prefix>฿</template></AppInput></FormField></div>
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
import FormField from '@/components/ui/FormField.vue'
import AppInput from '@/components/ui/AppInput.vue'
import RecipeEditorRow from '@/components/ui/RecipeEditorRow.vue'
import Button from '@/components/ui/Button.vue'
import AppCheckbox from '@/components/ui/AppCheckbox.vue'
import DialogFrame from '@/components/ui/DialogFrame.vue'
import { ref, computed, watch, nextTick } from 'vue'
import { usePosStore } from '@/stores/posStore'
import { useModalForm } from '@/composables/useModalForm'

import { Plus, Check } from 'lucide-vue-next'

const store = usePosStore()
const nameError=ref('')

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

  const result = store.saveMenu({
    id: form.value.id || undefined,
    name: form.value.name.trim(),
    emoji: form.value.emoji || '🥣',
    description: form.value.description.trim(),
    prices: Object.fromEntries(Object.entries(form.value.prices).map(([id, value]) => [id, value === '' ? 0 : Number(value)])),
    recipe: combinedRecipe,
    hasAddons: form.value.hasAddons,
    hasPackage: form.value.hasPackage
  })

  if (result?.ok || result?.success) close()
}
</script>


<style scoped>
.menu-editor{display:grid;gap:24px;min-width:0}.menu-editor-basics{display:grid;gap:16px}.menu-editor-identity{display:grid;grid-template-columns:64px minmax(0,1fr);gap:14px;align-items:start}.menu-editor-emoji{width:64px;min-height:48px;padding:6px;font-size:28px;border-radius:12px}.menu-editor-section{border-top:1px solid var(--border-subtle)}.menu-editor-section>summary{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:56px;padding:12px 0;cursor:pointer;list-style:none;font-weight:500;font-size:.9375rem;color:var(--text-main)}.menu-editor-section>summary::-webkit-details-marker{display:none}.menu-editor-section>summary>span{display:flex;gap:10px;align-items:center}.menu-editor-section>summary>span::before{content:'';width:7px;height:7px;border-right:1.5px solid var(--accent-brand);border-bottom:1.5px solid var(--accent-brand);transform:rotate(-45deg);flex-shrink:0;transition:transform 200ms ease}.menu-editor-section[open]>summary>span::before{transform:rotate(45deg)}.menu-editor-section>summary>small{font-size:.75rem;font-weight:400;color:var(--text-muted);text-align:right}.menu-editor-section>summary:focus-visible{outline:2px solid var(--accent-brand);outline-offset:2px;border-radius:8px}.menu-editor-section-body{display:grid;gap:14px;padding:4px 0 0}.menu-editor-prices{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.menu-editor-prices :deep(input){text-align:right}.menu-editor-recipe-list{display:grid;gap:16px}.menu-editor-help,.menu-editor-empty{font-size:.75rem;color:var(--text-muted);line-height:1.7;margin:0}.menu-editor-empty{padding:12px 0}.menu-editor-section-body>.ui-button{justify-self:start}.menu-editor-options>.app-checkbox{display:flex;justify-content:space-between;gap:16px;flex-direction:row-reverse;min-height:56px;width:100%}.menu-editor-options :deep(.app-checkbox-content){flex:1}.menu-editor-options strong{display:block;font-weight:500;font-size:.8125rem}.menu-editor-options small{display:block;font-size:.75rem;color:var(--text-muted);margin-top:4px}.menu-editor-package-actions{display:flex;gap:6px;flex-wrap:wrap;align-items:center}.menu-editor-package-actions>.ui-button{max-width:100%;white-space:normal;overflow-wrap:anywhere;font-size:.75rem}.menu-editor-footer{display:flex;gap:12px;width:100%;justify-content:flex-end}.menu-editor-footer>.ui-button:last-child{min-width:200px}@media(max-width:480px){.menu-editor{gap:20px}.menu-editor-prices{gap:14px}.menu-editor-footer>.ui-button:last-child{flex:1;min-width:0}.menu-editor-section>summary{font-size:.875rem}.menu-editor-section>summary>small{font-size:.6875rem}}
@media(max-width:359px){.menu-editor-prices{grid-template-columns:1fr}}
</style>
<style scoped>
@media(prefers-reduced-motion:reduce){.menu-editor-section>summary>span::before{transition:none}}
</style>
