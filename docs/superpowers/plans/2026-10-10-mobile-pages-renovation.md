# Mobile Stock → POS → Menu → Add-on Implementation Plan

> **SUPERSEDED — 11 ต.ค. 2026:** ผู้ใช้ยกเลิกแผนนี้และเปลี่ยนเป็น whole-system audit/design สำหรับ desktop+iPad หน้าร้านและ mobile quick management ใช้ [แผนใหม่](2026-10-11-system-interface-renovation.md) แทน ห้ามดำเนิน Task1–18 ต่อจากเอกสารนี้ เก็บไว้เป็นประวัติเท่านั้น

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Use superpowers:subagent-driven-development only if the user selects that execution method. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** รีโนเวท UI บนมือถือของคลัง POS เมนู และ Add-on ให้ทำงานหลักได้ง่าย ไม่ต้องเลื่อนตารางแนวนอน และคงผลการคำนวณ/บันทึกข้อมูลเดิม

**Architecture:** ใช้ Vue components สำหรับการนำเสนอและ emit intent กลับไปยัง view; views และ Pinia store ยังรับผิดชอบ business actions เดิม แยก CartPanel ให้ใช้ได้ทั้งจอใหญ่และ mobile sheet และใช้ toolbar/การแสดงราคาช่องทางร่วมกันเฉพาะหน้าจัดการเมนูกับ Add-on ไม่ทำ refactor store ระหว่างปรับ UI

**Tech Stack:** Vue 3 Composition API, Pinia, Tailwind + CSS variables เดิม, lucide-vue-next, Vitest, Vue Test Utils, Vite; browser QA ผ่านเครื่องมือเบราว์เซอร์ที่มีอยู่ ไม่เพิ่ม dependency

**Spec:** [Mobile design brief](../specs/2026-10-10-mobile-pages-renovation-design.md) — ถ่ายทอดคำแนะนำที่ผู้ใช้อนุมัติเมื่อ 10 ต.ค. 2026

**สถานะเริ่มต้น:** ยังไม่เริ่ม implementation แผนนี้เป็นเอกสารเท่านั้น; baseline ล่าสุด 32 test files / 182 tests ผ่าน, lint/build ผ่าน

## Global Constraints

- ธีมเดิม: พื้น #FBF5EA, พื้นการ์ด #FFFCF6, พื้นรอง #F4EBDD, แบรนด์ #780608, ตัวอักษร #352522, เส้นแบ่ง #E8DCCB; ส่วนมาสคอตคง #5E0205
- ใช้ Prompt สำหรับภาษาไทย และ Plus Jakarta Sans สำหรับตัวเลข ไม่เพิ่มฟอนต์หรือ UI/chart library
- หน้ารายการคลัง เมนู และ Add-on ใช้ mobile layout เมื่อความกว้าง <768px; จอ >=768px คงตารางเดิม
- POS ใช้ catalog + cart sheet เมื่อความกว้าง <1024px; จอ >=1024px ใช้ catalog + cart panel ด้านข้าง
- ตรวจที่ 320, 360, 390, 430, 768, 1024 และ 1280px รวมแนวนอน 844×390px
- ปุ่มหลักและ icon-only action มีพื้นที่กดอย่างน้อย 44×44px; ข้อความเนื้อหาบนมือถืออย่างน้อย 12px และข้อความประกอบอย่างน้อย 11px
- หน้าและการ์ดมือถือไม่เลื่อนแนวนอน; แถบหมวดหมู่ POS และตาราง desktop เลื่อนแนวนอนได้ภายในขอบเขตของตัวเอง
- ใช้ AppSelect, AppCheckbox, ModalShell และระบบยืนยัน/แจ้งเตือนเดิม ไม่สร้างชุด dropdown หรือ checkbox ซ้ำ
- Mobile sheet มี header/footer คงที่และ body เลื่อนเอง รองรับ safe area และคีย์บอร์ด ห้าม body/footer ถูกตัดนอกหน้าจอ
- เปิด overlay แล้ว background ไม่เลื่อนหรือรับโฟกัส; overlay ชั้นบนรับโฟกัส ปิดแล้วกลับ trigger หรือจุดสำรองที่ยังอยู่
- แอนิเมชัน sheet เข้า 200ms ออก 160ms; ไม่มีแอนิเมชันเมื่อ prefers-reduced-motion: reduce
- คง schema, localStorage keys, GAS sync payload, การคำนวณ GP/ต้นทุน/ราคา, วิธีจัดสรรล็อต และการ checkout เดิม
- ไม่ส่งข้อมูลร้านจริงระหว่างตรวจ UI และไม่ล้าง/นำเข้าข้อมูลจริงเพื่อทดสอบ

## Review Focus

1. **ร่างสต็อกและ resize:** สลับ card/table หรือนำทางแล้ว draft ไม่ถูก commit/discard อัตโนมัติ — Tasks 4–6, 17
2. **ล็อตผิดปกติ:** tracking none/receive-only/expiry, หลายล็อต, วัตถุดิบถูกจัดเก็บ และ stock 0 ต้องแสดง/เปิด action ถูกตัว — Tasks 4–5
3. **Cart overlay ซ้อน:** ยกเลิก shortage/lot dialog กลับตะกร้าได้ ไม่ checkout ซ้ำและไม่ปลดล็อก background ก่อนทุก overlay ปิด — Tasks 1, 8, 10
4. **ราคาขอบเขต:** ราคา 0, ราคาหาย, platform ถูกลบ และเลือกดูราคาในหน้าจัดการ ไม่แก้ช่องทาง POS — Tasks 9, 11–12, 15
5. **เนื้อหา/คีย์บอร์ด:** ชื่อไทย/อังกฤษยาว ไม่มีช่องว่าง รายการสูตรมาก และคีย์บอร์ดเปิดต้องยังอ่านชื่อ/เข้าถึงปุ่มบันทึกได้ — Tasks 13–14, 16–17

## การแบ่งงานและลำดับ

รวม **18 งานหลัก** แบ่งเป็น:

| ช่วง | งาน | ผลส่งมอบ |
|---|---|---|
| พื้นฐานร่วม | 1–2 | sheet/viewport/overlay และ header มือถือ |
| 1. คลัง | 3–6 | toolbar, cards, lots/actions, draft bar |
| 2. POS | 7–10 | CartPanel, cart sheet, catalog, checkout ซ้อน |
| 3. เมนู | 11–14 | toolbar/ราคา, cards, BOM, edit form |
| 4. Add-on | 15–16 | cards และ edit form |
| ตรวจรวม/ส่งมอบ | 17–18 | mobile QA, regression, push/deploy |

Dependency: 1 → 2/3/8/13; 3 → 4 → 5 → 6; 7 → 8 → 9 → 10; 11 → 12 → 13 → 14; 11 → 15 → 16; ทุกงาน → 17 → 18

ทำแต่ละช่วงให้ใช้งานได้และตรวจผ่านก่อนเริ่มช่วงถัดไป ไม่ปล่อยหน้าใดอยู่ระหว่างแยก component แล้วทำงานไม่ได้

## File structure และความรับผิดชอบ

| ไฟล์ | สถานะ | หน้าที่ |
|---|---|---|
| `src/components/ui/MobileBottomSheet.vue` | สร้าง | overlay, title, close, body/footer slots, transition; ไม่รู้จัก business store |
| `src/composables/useMediaQuery.js` | สร้าง | reactive matchMedia พร้อม cleanup |
| `src/composables/useOverlayScrollLock.js` | สร้าง | lock แบบนับจำนวนและอนุญาต scroll ใน overlay ที่ลงทะเบียน |
| `src/components/ui/ModalShell.vue` | แก้เฉพาะ overlay lifecycle | ลงทะเบียน scroll root ของ dialog เดิมกับ shared lock โดยใช้ focus/inert stack เดิม |
| `src/composables/useChartTooltip.js` | แก้เล็กน้อย | ใช้ shared scroll lock แทน logic ซ้ำ คง tooltip behavior เดิม |
| `src/components/layout/HeaderBar.vue` | แก้ | compact mobile title/actions และ sheet เพิ่มเติม |
| `src/components/layout/Sidebar.vue` | แก้เฉพาะ integration | ป้องกัน drawer กับ header menu เปิดพร้อมกัน |
| `src/App.vue` | แก้เฉพาะ coordination | รับ close intent สำหรับ drawer/header actions |
| `src/components/stock/StockMobileToolbar.vue` | สร้าง | คำสั่งหลัก search และ draft filter sheet |
| `src/components/stock/StockMaterialCard.vue` | สร้าง | อ่าน/แสดง material และ emits เท่านั้น |
| `src/components/stock/StockLotList.vue` | สร้าง | รายการล็อต/สถานะ/lot intent |
| `src/components/stock/StockDraftBar.vue` | สร้าง | draft summary/details/save/discard intent |
| `src/views/StockView.vue` | แก้ | จัดข้อมูลจาก helpers เดิม เชื่อม callbacks card/table |
| `src/components/pos/CartPanel.vue` | สร้าง | ย้าย UI ตะกร้าเดิม พร้อม callbacks ที่ส่งจาก view |
| `src/components/pos/MobileCartBar.vue` | สร้าง | จำนวนชาม/subtotal/open intent |
| `src/components/pos/PosMenuCard.vue` | สร้าง | การ์ดสินค้าขายและ select intent |
| `src/views/PosView.vue` | แก้ | catalog state, responsive cart, checkout coordinator |
| `src/components/catalog/CatalogManagementToolbar.vue` | สร้าง | shared search/category/price platform filters และ add intent |
| `src/components/catalog/PlatformPriceSummary.vue` | สร้าง | แสดงราคาเดียว + รายละเอียดราคาช่องทางอื่น ไม่เปลี่ยนราคา |
| `src/components/menu/MenuMobileCard.vue` | สร้าง | menu summary และ recipe/edit/delete intents |
| `src/components/menu/MenuRecipeDetails.vue` | สร้าง | ย้าย BOM popup content เดิม ไม่คำนวณ stock ใหม่ |
| `src/views/MenuView.vue` | แก้ | shared filters, mobile cards, existing desktop table, BOM coordinator |
| `src/components/modals/MenuEditModal.vue` | แก้ | mobile form layout และส่วนยุบได้ โดยคง form/validation |
| `src/components/addons/AddonMobileCard.vue` | สร้าง | addon summary/material link/edit/delete intents |
| `src/views/AddonView.vue` | แก้ | shared toolbar และ cards |
| `src/components/modals/AddonEditModal.vue` | แก้ | constrained-height form + pinned footer |
| `src/assets/mobile-pages.css` | สร้าง | shared mobile spacing/safe-area; page-specific rules ใช้ scoped CSS |
| `tests/ui/mobile*.test.js` และ tests ราย component ระบุด้านล่าง | สร้าง | พฤติกรรมใหม่และ regression ที่มีผลจริง |
| `docs/superpowers/verification/2026-10-10-mobile-pages-renovation.md` | สร้างตอน QA | ผลตรวจ browser/commands และรูปหลักฐาน |

**กฎแบ่ง components:** card/toolbar รับ props และ emit ID; การเรียก store อยู่ view ยกเว้น CartPanel ซึ่งย้ายการ bind กับ cart state เดิมแบบหนึ่งแหล่ง ไม่ให้ component สร้างสำเนา cart หรือ draft inventory

**กฎข้อมูล:** `Material`, `Lot`, `Menu`, `Addon`, `Platform`, `CartItem` ใน plan นี้หมายถึง object เดิมจาก `src/stores/posStore.js`; ไม่สร้าง schema หรือ TypeScript migration

---

## พื้นฐานร่วม

### Task 1: Mobile sheet, responsive state และ scroll lock

**Files:** Create `MobileBottomSheet.vue`, `useMediaQuery.js`, `useOverlayScrollLock.js`; Modify `ModalShell.vue`, `useChartTooltip.js`; Test `tests/ui/mobileBottomSheet.test.js`, `tests/ui/mediaQuery.test.js`, `tests/ui/chartTooltip.test.js`, existing `dialogs.test.js`

**Interfaces:**
- `useMediaQuery(query: string) -> Ref<boolean>`; queries ใช้ค่าจาก Global Constraints; เริ่มจาก `matchMedia(query).matches` และ remove listener ตอน unmount
- `useOverlayScrollLock(active: Ref<boolean>, scrollRoot?: Ref<HTMLElement|null>) -> void`; ไม่มี return value; นับ lock ทั้งหมดและคืนค่า overflow เดิมเมื่อจำนวนกลับเป็น 0; wheel/touch ใน scrollRoot ของ overlay บนสุดเลื่อนได้
- `ModalShell` เพิ่ม prop `lockScroll:Boolean=true`; ใช้ helper กับ computed open&&lockScroll และ root ref เดิม เพื่อให้ shortage/lot/emoji dialog ที่เปิดทับ sheet ลงทะเบียน scroll root ของตัวเองได้; คง focus/inert stack เดิม
- `MobileBottomSheet` props `{open:Boolean,id:String,title:String,maxHeight:String='90dvh'}`; emits `close`; slots default/body และ footer; Teleport body ผ่าน ModalShell; close/backdrop/Escape ส่ง intent ไม่แก้ parent state เอง
- Sheet ใช้ z-index 60; modal ธุรกิจที่เปิดทับ cart ใช้ 80 ขึ้นไป; ต้องตรวจ layer stack เดิม ไม่แก้ z-index ทั้งแอปแบบเหมารวม

- [ ] เขียน tests `traps focus and restores opener`, `nested locks release only after final overlay`, `scrolls sheet body but blocks background`, `cleans media listener`; assertions: เปิด → app inert, Tab วนใน top overlay, ปิด top → lower ยัง inert ถูกลำดับ, ปิดทั้งหมด → overflow เดิมและ trigger focus กลับ
- [ ] Run `npx vitest run tests/ui/mobileBottomSheet.test.js tests/ui/mediaQuery.test.js`; คาด FAIL เพราะ components/composable ยังไม่มี
- [ ] Implement interfaces ข้างต้น; sheet มีปุ่มปิด 44px, body `min-height:0;overflow-y:auto;overscroll-behavior:contain`, footer safe-area, enter 200ms/leave 160ms; คง content ระหว่าง leave และกัน open→close เร็วแล้ว stale focus
- [ ] Sheet ถือ `renderedOpen` ให้ ModalShell ยังเปิดระหว่าง panel leave และปิดหลัง after-leave; ไม่ลงทะเบียน lock ซ้ำทั้ง sheet และ shell; helper กัน scroll chaining ที่ต้น/ท้าย scrollable body โดยไม่ห้าม input/select interaction
- [ ] ย้าย scroll-lock logic ของ ChartTooltip ไป helper โดย active มาจาก `computed(()=>!!tooltip.value)`; tooltip ยังคง toggle/click/outside/arrow/dimming เหมือนเดิม; tooltip ไม่มี scrollRoot จึง block wheel/touch ทั้งหน้าเหมือนปัจจุบัน
- [ ] Run `npx vitest run tests/ui/mobileBottomSheet.test.js tests/ui/mediaQuery.test.js tests/ui/chartTooltip.test.js tests/ui/dialogs.test.js`; คาด PASS; ตรวจ keyboard และ reduced motion ใน browser
- [ ] Commit `feat: add shared mobile sheet and overlay scroll locking`

### Task 2: Header มือถือกระชับ ใช้เพิ่มเติมแทนปุ่มเสี่ยงเต็มแถว

**Files:** Modify `HeaderBar.vue`, `Sidebar.vue`, `App.vue`; Test `tests/ui/mobileHeader.test.js`, existing `mobileNavigation.test.js`, `headerSizing.test.js`

**Interfaces:** Header props/emits `mobileMenuOpen`, `toggle-menu` เดิม; เพิ่ม emit `request-close-navigation`; header action sheet local state `actionsOpen`; เปิด sheet ต้อง emit ปิด drawer ก่อน; toggle drawer ต้องปิด action sheet

- [ ] เขียน test `moves reset/demo/sync into mobile more sheet` ตรวจว่ามือถือ header มี hamburger, history, more; “ล้างข้อมูลทั้งหมด”/“โหลด Demo” อยู่เฉพาะ sheet; click intent เปิด confirmation เดิม โดยไม่เรียก clear/reset ทันที
- [ ] Run `npx vitest run tests/ui/mobileHeader.test.js`; คาด FAIL
- [ ] จัด title มือถือให้เป็น “คลังวัตถุดิบ”, “ขายหน้าร้าน”, “จัดการเมนู”, “จัดการท็อปปิ้ง”; subtitle ไม่เกินสองบรรทัด; desktop pageTitle เดิมยังครบ; low-stock count เป็นปุ่มสั้นที่มี accessible name เต็ม
- [ ] ใช้ Task 1 sheet สำหรับรายการเพิ่มเติม มีชื่อและ icon; Sheet ปิดก่อนเปิด confirm; ถ้ายกเลิก confirm คืนโฟกัสปุ่มเพิ่มเติม; sync disabled ระหว่าง syncing/ไม่มี URL ตาม logic เดิม
- [ ] Run `npx vitest run tests/ui/mobileHeader.test.js tests/ui/mobileNavigation.test.js tests/ui/headerSizing.test.js`; PASS; browser 320px และ 768px ต้องไม่มีปุ่มทับ hamburger/title
- [ ] Commit `style: simplify mobile header actions`

---

## 1. คลังวัตถุดิบ — Tasks 3–6

### หน้าตาเป้าหมาย

```text
☰  คลังวัตถุดิบ                     ประวัติ ⋯
มูลค่าคลัง           งบเติมสต็อก
ใกล้หมด              หมดสต็อก
[รับเข้า] [ตรวจนับ] [เพิ่มเติม]
[ค้นหาชื่อ รหัส หน่วย หรือหมวด............]
[ตัวกรอง 2]   หลัก / รอง ตามที่เลือก
┌ 🍓 สตรอว์เบอร์รี               ⋯ ┐
│ ผลไม้สด             คงเหลือ 800 g │
│ ใกล้หมด • รับ 10 ต.ค.            │
│ [รับเข้า]        [รายละเอียด ▾]  │
└─────────────────────────────────┘
[ยังไม่บันทึก 2 รายการ | ตรวจรายการ]
[ยกเลิก]                 [บันทึก]
```

### Task 3: คำสั่งคลังและตัวกรองบนมือถือ

**Files:** Create `StockMobileToolbar.vue`; Modify `StockView.vue`; Test `tests/ui/mobileStockToolbar.test.js`

**Interfaces:** props `{search:String,role:'all'|'main'|'sub',category:String,showDeleted:Boolean,categories:Array<{id,label}>,deletedCount:Number}`; emits `update:search`, `apply-filters({role,category,showDeleted})`, `stock-in`, `stocktake`, `stock-adjust`, `history`, `create-material`

- [ ] Test `applies filters only on apply`, `cancel preserves active filters`, `emits primary stock actions once`; แก้ role main + category แล้ว cancel → props/filter results ไม่เปลี่ยน; apply → emit payload ตรงค่าเลือกหนึ่งครั้ง; reset → `{role:'all',category:'all',showDeleted:false}`
- [ ] Run `npx vitest run tests/ui/mobileStockToolbar.test.js`; คาด FAIL
- [ ] Implement toolbar: รับเข้า/ตรวจนับสองปุ่มหลัก; sheet เพิ่มเติมมีปรับยอด/ประวัติ/เพิ่มวัตถุดิบ; search 100%; filter draft แยกจาก applied state, ใช้ AppSelect/AppCheckbox; ไม่ใช้ FilterDropdown เดิมเพราะผูก date-range มาด้วย
- [ ] ต่อ callbacks ไป `openStockIn`, `openStocktake`, `openStockAdjust`, `store.openActivityLog('stock')`, `openCreateMaterial`; แสดง role counts จากของเดิม ไม่คำนวณรวม archived โดยเผลอ
- [ ] Run test; browser 320/390px กดทุก action เปิด modal ถูกชนิด; ปุ่มไม่แตกเป็นข้อความแนวตั้ง; กรณีไม่มี active material ยังเปิด flow เดิมและใช้ validation เดิม
- [ ] Commit `feat: add mobile stock toolbar and filters`

### Task 4: Material cards ใช้ยอดและสถานะเดิม

**Files:** Create `StockMaterialCard.vue`; Modify `StockView.vue`; Test `tests/ui/mobileStockCards.test.js`

**Interfaces:** props `{material:Material,draftDiff:Number,baselineStock:Number|null,trackingMode:String,expanded:Boolean,hasMultipleLots:Boolean,activeLotCount:Number,receiveLabel:String,expiryLabel:String,statusLabel:String}`; emits `stock-in(materialId)`, `produce(materialId)`, `toggle-details(materialId)`, `open-actions(materialId)`; component ไม่เรียก store

- [ ] Test `renders zero and fractional stock with correct unit`, `renders archived status without active actions`, `keeps draft after switching viewport`; fixture stock 0, stock 0.25 g, draft +10/-5, tracking none; assert ไม่ซ่อน zero และไม่มีรับเข้า/ผลิตของ archived card
- [ ] Run `npx vitest run tests/ui/mobileStockCards.test.js`; คาด FAIL
- [ ] Implement การ์ด: ชื่ออ่านได้สองบรรทัดและชื่อเต็มในรายละเอียด; stock เด่น, category/role badges รอง, ไม่มีการ์ด clickable ทั้งใบ; details ยุบ cost/unit, valuation, pack conversion, วันรับ/หมดอายุ ตาม helpers เดิม
- [ ] เชื่อม status/date/draft diff จาก `getDraftDiff`, `getBaselineStock`, `store.getMaterialTrackingMode`, expiry helpers และ expressions เดิม; ปุ่มผลิตใช้ handler เดียวกับปุ่มผลิตใน table โดยคงเงื่อนไข `hasSubRecipe`
- [ ] Render mobile cards และ desktop table โดย CSS breakpoint; ห้ามซ่อน/ล้าง draft เมื่อ resize; view ใช้ `filteredMaterials` แหล่งเดียว; empty state แยก “ไม่มีวัตถุดิบ” กับ “ไม่พบตามตัวกรอง” พร้อม clear filters
- [ ] Run test + `npx vitest run tests/inventory`; PASS; browser card และ table ของ fixture เดียวกันต้องได้ stock/diff/cost ตรงกัน
- [ ] Commit `feat: present stock as mobile material cards`

### Task 5: รายละเอียดล็อตและ material actions ที่ใช้งานด้วยนิ้ว

**Files:** Create `StockLotList.vue`; Modify `StockMaterialCard.vue`, `StockView.vue`; Test `tests/ui/mobileStockLots.test.js`

**Interfaces:** props `{materialId:String,lots:Lot[],unit:String,trackingMode:String}`; emits `adjust-lot({materialId,lotId})`, `waste-lot({materialId,lotId})`, `switch-lot({materialId,lotId})`; material action sheet ใช้ selected material ID ของ view

- [ ] Test `opens exact lot actions`, `tracking none hides date and multi-lot controls`, `opening details never switches lot`, `archived actions restore rather than receive`; assert callbacks `onActionStockAdjustLot`, `onActionWasteLot`, `onActionSwitchLot` ได้ ID ของล็อตที่กด ไม่ใช่ active lot อัตโนมัติ
- [ ] Run `npx vitest run tests/ui/mobileStockLots.test.js`; คาด FAIL
- [ ] แสดงล็อตผ่าน `getDisplayLots(mat)` / `store.getMaterialLots(mat)`; แยก active badge, quantity, receive/expiry; ล็อตหมดอายุใช้ข้อความและสี ไม่ใช้สีอย่างเดียว; ไม่เปิดรายละเอียดเป็น table กว้าง
- [ ] มือถือเปลี่ยน floating action menu เป็น Task 1 sheet มีชื่อเต็มของวัตถุดิบ; mapping ใช้ `onActionHistory`, `onActionStockIn`, `onActionStockAdjust`, `onActionEdit`, `onActionWaste`, archive/restore/permanent-delete เดิม
- [ ] คง permanent-delete usage warning และ confirmation; ปิด action sheet ก่อนเปิด modal ถัดไป; เสร็จ/ยกเลิกแล้วคืน focus ไป material action button ถ้ายังอยู่ มิฉะนั้นไป search field
- [ ] Run test + inventory tests; browser 844×390px เปิดล็อต/เมนูเพิ่มเติมต้องเลื่อน body ได้และปุ่มปิดไม่หาย
- [ ] Commit `feat: add mobile lot details and stock action sheets`

### Task 6: Draft bar ไม่บังข้อมูลและไม่ทำให้ร่างหาย

**Files:** Create `StockDraftBar.vue`; Modify `StockView.vue`; Test `tests/ui/mobileStockDrafts.test.js`

**Interfaces:** props `{entries:Array,valuationDiff:Number}` จาก draft values ที่ view ใช้อยู่; emits `save`, `discard`, `open-details`; callbacks คง `savePendingChanges()`/`revertPendingChanges()` → `commitStockDrafts()`/`discardStockDrafts()`

- [ ] Test `closing draft details does not discard`, `save commits once`, `discard restores baseline`, `draft survives search/category/viewport changes`; spy commit/discard ก่อนเปิด/ปิด details ต้อง 0 calls
- [ ] Run `npx vitest run tests/ui/mobileStockDrafts.test.js`; คาด FAIL
- [ ] Implement แถบล่าง mobile: “ยังไม่บันทึก N รายการ”, diff มี +/- ชัด, รายละเอียดเปิด sheet, save/discard แยกปุ่ม; จำนวนรายการจาก draft ที่เปลี่ยนจริง ไม่ใช่จำนวนผลค้นหา
- [ ] ใส่ bottom padding เท่าความสูงแถบ + safe area และ z-index ต่ำกว่า drawer/modal; รายการท้ายสุดเลื่อนขึ้นพ้นแถบได้; desktop ใช้แถบเดิมหรือ component เดียวที่จัดวางเหมาะกับจอใหญ่
- [ ] Run test + `tests/inventory/drafts.test.js` และ `tests/inventory/recoveryEdges.test.js`; PASS; ตรวจ refresh/recovery ด้วยข้อมูลจำลองตามพฤติกรรมระบบเดิม
- [ ] Commit `feat: make stock draft controls usable on mobile`

**Gate จบคลัง:** รับเข้า/ผลิต/ปรับยอด/ตรวจนับ/ประวัติ/archived/ล็อตและ drafts เข้าถึงได้ครบโดยไม่เลื่อนตารางด้านข้าง; ทดสอบ inventory เดิมผ่านทั้งหมด

---

## 2. POS — Tasks 7–10

### หน้าตาเป้าหมาย

```text
☰ ขายหน้าร้าน                      ประวัติ ⋯
[ช่องทาง: หน้าร้าน ▾]                GP 0%
[ค้นหาเมนู...............................]
[ทั้งหมด] [Classic] [Signature] →
┌ 🥣 Greek Bowl ┐ ┌ 🍓 Berry Bowl ┐
│ ชื่อ 2 บรรทัด │ │ + ท็อปปิ้งได้ │
│ ฿69  เพิ่ม    │ │ ฿149 ปรับชาม  │
└───────────────┘ └───────────────┘
       พื้นที่สินค้าเลื่อนทั้งหน้า
[ตะกร้า 3 ชาม          ฿327 | ดูตะกร้า]
                  ↓ เปิด sheet
[ตะกร้า • ช่องทาง                   ×]
[รายการ / +/- / add-ons / หมายเหตุ ...]
[วิธีชำระ • subtotal • GP • คำเตือน ...]
[ชำระเงิน ฿327 — footer มองเห็นเสมอ]
```

### Task 7: แยก CartPanel เดิมก่อนเปลี่ยน layout

**Files:** Create `CartPanel.vue`; Modify `PosView.vue`; Test `tests/ui/cartPanel.test.js`

**Interfaces:** props `{checkoutPending:Boolean}`; emits `checkout`, `switch-lot(warning)`; CartPanel bind `store.cart`, `store.orderNote`, `store.paymentMethod`, `store.cartSummary`, `store.cartLotWarnings`; ใช้ `store.updateCartQty(index,newQty)`, `removeFromCart(index)`, `clearCart()` เดิม; ห้ามเก็บ local cart copy

- [ ] Test `editing qty/note/payment updates same store`, `addon total matches cartSummary`, `checkout emits exactly once per click`; fixture menu+addon 2 ชาม เปรียบเทียบยอด panel กับค่าจาก store ไม่ hardcodeสูตรใหม่
- [ ] Run `npx vitest run tests/ui/cartPanel.test.js`; คาด FAIL
- [ ] ย้าย cart markup รวม warnings/lot button/summary/payment ไป component; helper ราคาอ่าน currentPlatformId เหมือนเดิม; desktop ยังทำงานเหมือนก่อนแยก
- [ ] ให้ body เลื่อนและ footer คงที่; subtotal ที่ลูกค้าจ่ายเด่น ส่วน GP/net/COGS/gross profit อยู่รายละเอียดรอง ไม่ใช้ net revenue เป็น checkout amount
- [ ] Run test + `tests/pos/checkout.test.js` + `tests/ui/shortageReceipt.test.js`; PASS; ตรวจ clear/remove/update qty=0 ยังคงพฤติกรรมเดิม
- [ ] Commit `refactor: extract shared POS cart panel`

### Task 8: แถบตะกร้าและ cart bottom sheet

**Files:** Create `MobileCartBar.vue`; Modify `PosView.vue`, `CartPanel.vue`; Test `tests/ui/mobileCart.test.js`

**Interfaces:** MobileCartBar props `{quantity:Number,subtotal:Number,empty:Boolean}`; emits `open`; PosView state `cartOpen:Ref<boolean>` และ `compact=useMediaQuery('(max-width:1023px)')`

- [ ] Test `empty cart opens without checkout`, `cart survives close/reopen and desktop resize`, `only one CartPanel mounted`, `bar uses total quantity not cart row count`; ตัวอย่าง qty 2+3 → 5 ชาม ไม่ใช่ 2 รายการ
- [ ] Run `npx vitest run tests/ui/mobileCart.test.js`; คาด FAIL
- [ ] Desktop render CartPanel ด้านข้าง; compact render ใน MobileBottomSheet เมื่อ cartOpen; ห้าม mount desktop cart และ sheet cart พร้อมกัน; ปิด sheetไม่เรียก clearCart
- [ ] วาง MobileCartBar ด้านล่าง z-index 30, safe-area, reserve content padding; empty แสดง “ตะกร้าว่าง”/฿0 เปิดได้; มีสินค้าแสดงจำนวนชาม/subtotal; กด bar เปิดรายละเอียดเท่านั้น
- [ ] Resize เป็น desktop → cartOpen=false โดย cart/note/payment อยู่; กลับ mobile ไม่เปิด sheet เอง; keyboard focus fallback ไปปุ่มตะกร้าหรือ catalog เมื่อ trigger ถูก unmount
- [ ] Run test; browser 320px, 1023/1024px และหมุนหน้าจอ ต้องไม่ซ้อน/ล้าง cart และ bar ไม่ทับ drawer
- [ ] Commit `feat: add compact POS cart bar and bottom sheet`

### Task 9: Catalog POS เห็นสินค้าเต็มพื้นที่

**Files:** Create `PosMenuCard.vue`; Modify `PosView.vue`; Test `tests/ui/mobilePosCatalog.test.js`

**Interfaces:** props `{menu:Menu,price:Number,outOfStock:Boolean}`; emits `select(menuId)`; view ใช้ `handleMenuClick(menu)` เดิม, AppSelect platform v-model เชื่อม `store.setPlatform(id)`

- [ ] Test `selects exact platform and refreshes prices`, `keeps sold-out menu selectable`, `inactive menus remain hidden`, `addon menu opens customization`; click non-addon → addToCart หนึ่งครั้ง; click addon → customOrder.menuId ถูกตัว ไม่เพิ่มอัตโนมัติ
- [ ] Run `npx vitest run tests/ui/mobilePosCatalog.test.js`; คาด FAIL
- [ ] Mobile เอา fixed `h-[calc(100vh-8rem)]` และ catalog inner scroll ออก; main เป็น scroller หลัก; desktop คง constrained panel ตามพื้นที่จริง ไม่มี height สมมติที่ชน header หลายบรรทัด
- [ ] Platform selector เต็มแถวหรือคู่กับ GP สั้น; search เต็มแถว; category chips เลื่อนเฉพาะแนวนอน; menu cards สองคอลัมน์ ชื่อสองบรรทัด คำอธิบายรองหนึ่งบรรทัดราคาเด่น ป้ายของหมดไม่ทำการ์ดล้น
- [ ] ราคา undefined ใน POS ยังคง fallback ตาม `getMenuPrice` เดิม (ปัจจุบัน 0); ห้ามเปลี่ยนการขาย/validation ระหว่างงาน UI; แสดง empty state และ clear search ได้
- [ ] Run test + checkout tests; browser card tap areaไม่ซ้อน nested buttons, search keyboardเปิดแล้ว cartbar/ผลค้นหาเข้าถึงได้
- [ ] Commit `style: rebuild mobile POS product catalog`

### Task 10: Checkout และ dialog ซ้อนตะกร้า

**Files:** Modify `PosView.vue`, `CartPanel.vue`, layer styles เฉพาะ `LowStockWarningModal.vue`/`LotDepletionModal.vue`/`ReceiptModal.vue` ถ้าจำเป็น; Test `tests/ui/mobilePosCheckout.test.js`

**Interfaces:** parent `handleCheckout() -> void|Promise<void>` เป็นตัวเรียก `store.checkout()` เพียงจุดเดียว; parent `handleSwitchLot(warning)` คง promptLotDepletion เดิม; local `checkoutPending` ล็อกจน confirm/error/success settled และไม่ติดค้างหลัง cancel

- [ ] Test `cancel shortage retains cart and sheet`, `confirm creates one order`, `double tap does not duplicate checkout`, `lot prompt cancel keeps selected lot`, `success closes cart and leaves receipt topmost`; assert ordersเพิ่ม 1, stockลดตาม existing allocation, Cancel → ordersไม่เพิ่ม
- [ ] Run `npx vitest run tests/ui/mobilePosCheckout.test.js`; คาด FAIL
- [ ] เชื่อม completed checkout โดยดูผลจริงของ store/โมดัล ไม่ตั้ง success หลังเรียกฟังก์ชันเฉยๆ; store.checkout อาจ return null ขณะ shortage pending จึงห้ามปลด debounce จน pending flowจบ; ไม่แก้สูตร/transaction semantics
- [ ] ModalShell layers ต้องจัด active top layer; shortage/lot promptอยู่เหนือ cart; ปิดแล้ว focusกลับ cart action; receiptหลังcheckoutอยู่เหนือทั้งหมด; background lockคงอยู่จน top flowจบ
- [ ] Run test + `npx vitest run tests/pos tests/inventory tests/ui/shortageReceipt.test.js`; PASS; manual browserกดซ้ำเร็ว/ยกเลิก/สำเร็จด้วย demo เท่านั้น
- [ ] Commit `fix: preserve checkout flow across mobile overlays`

**Gate จบ POS:** เลือกช่องทาง → เพิ่ม/ปรับชาม → เปิดตะกร้า → แก้จำนวน/ชำระ → ได้ใบเสร็จครบ ไม่มีออเดอร์ซ้ำและยอด/stockตรงกับระบบเดิม

---

## 3. จัดการเมนู — Tasks 11–14

### หน้าตาเป้าหมาย

```text
[ค้นหาชื่อเมนู.........................]
[ตัวกรอง 2]                  [+ เพิ่มเมนู]
แสดงราคาหน้าร้าน · 4 เมนู
┌ 🥣 Greek Yogurt Bowl S          ⋯ ┐
│ Classic Bowls          ฿69        │
│ ท็อปปิ้งได้ • ตัดบรรจุภัณฑ์       │
│ [ดูสูตร 4 รายการ]      [แก้ไข]    │
└──────────────────────────────────┘
```

### Task 11: Shared catalog toolbar และราคาช่องทาง

**Files:** Create `CatalogManagementToolbar.vue`, `PlatformPriceSummary.vue`; Modify `MenuView.vue`, `AddonView.vue` imports/state; Test `tests/ui/catalogToolbar.test.js`, `tests/ui/platformPriceSummary.test.js`

**Interfaces:** Toolbar props `{search:String,category:String,platformId:String,categories:Array<{id,label}>,platforms:Platform[],addLabel:String}`; emits `update:search`, `apply-filters({category,platformId})`, `add`; default category sentinel ใช้ `ทั้งหมด` ตาม existing views; PriceSummary props `{prices:Object,platforms:Platform[],platformId:String}`, ไม่มี emit เปลี่ยน POS platform

- [ ] Tests `filter cancel preserves values`, `price zero differs from missing`, `unknown platform falls back predictably`, `management platform does not set POS platform`; `{P1:0}` → ฿0, `{}` → ยังไม่ตั้งราคา; ไม่มี platforms → ไม่มีช่องทางขาย
- [ ] Run `npx vitest run tests/ui/catalogToolbar.test.js tests/ui/platformPriceSummary.test.js`; คาด FAIL
- [ ] Implement toolbar mobile searchเต็มแถว + filter sheet/category/platform AppSelect + add button; desktopคง toolbarที่เหมาะสม; viewเลือก displayPlatformId โดย current POS id ถ้ามี ไม่งั้น platforms[0]?.id || ''
- [ ] PriceSummary แสดงราคา selected platform แหล่งเดียวและ `<details>` ราคาช่องทางอื่น พร้อมชื่อเต็ม; watch platforms ที่ถูกลบให้ fallback เฉพาะ state หน้าจัดการ ไม่เรียก setPlatform
- [ ] Run tests; ตรวจสลับราคาหน้าจัดการแล้วกลับ POS ช่องทางเดิมไม่เปลี่ยน และไม่มี date range ใน filter sheetนี้
- [ ] Commit `feat: share catalog filters and platform price summary`

### Task 12: Menu cards และปุ่มทำงานที่ชัดเจน

**Files:** Create `MenuMobileCard.vue`; Modify `MenuView.vue`; Test `tests/ui/mobileMenuCards.test.js`

**Interfaces:** props `{menu:Menu,platforms:Platform[],platformId:String}`; emits `recipe(menuId)`, `edit(menuId)`, `delete(menuId)`; viewใช้ openBomModal/editMenu/deleteMenu เดิม

- [ ] Test `card recipe/edit/delete target exact ID`, `search and category share results with desktop`, `filter does not mutate menus`, `long name remains available in details`; clickcardbackground → ไม่เปิดแก้ไข ไม่ลบ
- [ ] Run `npx vitest run tests/ui/mobileMenuCards.test.js`; คาด FAIL
- [ ] การ์ดหนึ่งคอลัมน์ mobile: icon/name/category/PriceSummary, hasAddons/hasPackage labels; ดูสูตร + แก้ไขเป็นปุ่ม 44px; deleteในรายละเอียดคำสั่งมี label ไม่ใช้ไอคอนถังขยะเปล่า
- [ ] Mobile cards และ desktop tableใช้ filteredMenus เดิม; ไม่เพิ่ม search วัตถุดิบใหม่ในรอบนี้ (ปัจจุบันชื่อ/description); ปรับ placeholderให้ตรงพฤติกรรม “ค้นหาชื่อเมนูหรือรายละเอียด”
- [ ] คง delete confirmation; หลังลบ IDที่เลือกแล้ว cardหายตามstore; ถ้าผลค้นหาว่างแสดงclear filters; ถ้าไม่มีเมนูแสดงเพิ่มเมนู
- [ ] Run tests + `tests/ui/priceForms.test.js`; browser 320px และชื่อ 100 ตัวอักษรต้องไม่ดันราคา/actionออกขอบ
- [ ] Commit `feat: add mobile menu management cards`

### Task 13: BOM details อ่านง่ายและไม่ค้างข้อมูล

**Files:** Create `MenuRecipeDetails.vue`; Modify `MenuView.vue`; Test `tests/ui/mobileMenuRecipe.test.js`

**Interfaces:** props `{menu:Menu,items:Array<{materialId,qty,mat,cost,servingsAvailable}>,foodCost:Number,storePrice:Number,gpPercent:Number}` จาก computed เดิม; emits `edit`; mobileเป็น sheet desktopเป็น dialog ModalShell; selectedMenuForBomคง IDที่ถูกเลือก

- [ ] Test `shows missing material rather than crashes`, `zero qty has no infinite servings`, `edit closes details before opening exact menu editor`, `open details does not mutate recipe/stock`; missing materialแสดงIDและข้อความแจ้ง ไม่มีราคาแต่งขึ้น
- [ ] Run `npx vitest run tests/ui/mobileMenuRecipe.test.js`; คาด FAIL
- [ ] ย้ายรายละเอียดสูตรเดิมเป็น component; แถวแต่ละรายการแสดงชื่อ/qty+unit/cost; costsummaryชื่อชัด; ชื่อ “ราคาหน้าร้าน” ตรง computed PLAT01 เดิม ไม่ทำให้ผู้ใช้คิดว่าเป็นช่องทางที่เลือกในtoolbar
- [ ] สูตรมาก 30รายการเลื่อนในbody; headerและปุ่มแก้ไขอยู่footer; ค่า servingsAvailable=nullแสดง “—”; ใช้ “วัตถุดิบต่อชาม”/“บรรจุภัณฑ์” ให้สอดคล้องข้อมูลเดิม
- [ ] ปิด BOMก่อน editMenu(menuId); stale selected menuถูกลบระหว่างเปิดให้ปิดรายละเอียดและไม่เปิด editorด้วยIDหาย; Return focusเมื่อ triggerหายใช้search fallback
- [ ] Run test; manualkeyboardEscape/Tab/ซ้อนemoji pickerถ้าเปิด editorถัดไป; PASS
- [ ] Commit `style: make recipe details readable on mobile`

### Task 14: Menu edit form ใช้มือถือได้ครบ

**Files:** Modify `MenuEditModal.vue`; Test `tests/ui/mobileMenuForm.test.js`, existing `priceForms.test.js`

**Interfaces:** คง `store.modals.menuEdit={isOpen,menuId}`, local form/save/requestClose เดิม; เพิ่ม presentation stateสำหรับยุบส่วน “ราคาแต่ละช่องทาง”, “สูตรวัตถุดิบ”, “ท็อปปิ้งและบรรจุภัณฑ์” เท่านั้น

- [ ] Test `collapsed fields preserve draft values`, `invalid price opens relevant section`, `save payload unchanged`, `dirty close still confirms`; ลด/ขยาย sectionต้องไม่resetfield, invalidsectionต้องเปิดและfocusช่องผิด
- [ ] Run `npx vitest run tests/ui/mobileMenuForm.test.js`; คาด FAIL
- [ ] Mobileใช้ขอบจอ8px bodypadding16px minheight0 overflowauto maxheightcalc(100dvh-16px); desktopคงความกว้างเดิม; pinnedfooterมี “ยกเลิก”/“บันทึกเมนู” พร้อมsafearea
- [ ] ราคาเป็นแถวชื่อช่องทาง+ช่องกรอกอ่านง่าย inputmode decimal; recipe rowชื่ออยู่เต็มแถว qty/unit/removeอยู่แถวถัดไป; ไม่ใช้tableสูตรกว้างบนmobile
- [ ] Menu name/emoji/categoryส่วนแรกเปิดเสมอ; editablesectionsมีaria-expanded; snapshot payloadก่อน/หลังrefactorต้องเท่ากัน; global AppSelect/AppCheckboxคงใช้
- [ ] Run test + priceForms + inventoryrequirements; browser keyboardจริง: focusราคาสุดท้าย/qtyแล้วเลื่อนถึงsaveได้; ตรวจform30recipe rows
- [ ] Commit `style: reorganize menu editor for mobile`

**Gate จบเมนู:** ค้นหา/กรอง/ดูราคา/ดูสูตร/เพิ่ม/แก้ไข/ลบ ทำได้ครบ ไม่เปลี่ยนราคาของPOSและไม่เปลี่ยนสูตรคำนวณ

---

## 4. Add-on — Tasks 15–16

### หน้าตาเป้าหมาย

```text
[ค้นหาท็อปปิ้ง..........................]
[ตัวกรอง 1]                [+ เพิ่มท็อปปิ้ง]
แสดงราคาหน้าร้าน
┌ 🍓 สตรอว์เบอร์รีสด 30g          ⋯ ┐
│ ผลไม้สด                       ฿20 │
│ ตัด: สตรอว์เบอร์รี 30 g / ครั้ง    │
│ [ราคาอื่น ▾]                 [แก้ไข]│
└───────────────────────────────────┘
```

### Task 15: Add-on cards กระชับและสื่อสถานะการผูกวัตถุดิบ

**Files:** Create `AddonMobileCard.vue`; Modify `AddonView.vue`; Test `tests/ui/mobileAddonCards.test.js`

**Interfaces:** props `{addon:Addon,material:Material|null,platforms:Platform[],platformId:String}`; emits `edit(addonId)`, `delete(addonId)`; materialมาจาก `store.matMap[addon.materialId] || null`

- [ ] Test `same emoji addons have distinct names and actions`, `unlinked and missing material are different`, `zero price is visible`, `search/category match desktop results`; amountUsed 0ต้องแสดง0 ไม่ fallbackเป็น1
- [ ] Run `npx vitest run tests/ui/mobileAddonCards.test.js`; คาด FAIL
- [ ] ใช้ Toolbar/PriceSummaryจากTask11; cardชื่อสองบรรทัดหมวดรอง, ราคาเด่น, linkedmaterial+amountUsed+unitบรรทัดเดียวที่wrapได้, edit44px; deletionอยู่detailsactionพร้อมconfirmเดิม
- [ ] ไม่มีmaterialId → “ไม่ผูกวัตถุดิบ”; มีmaterialIdแต่matMapไม่พบ → “ไม่พบวัตถุดิบที่ผูก”; ห้ามแก้ข้อมูลอัตโนมัติ; unknowncategoryยังใช้ otherAddonCategories เดิม
- [ ] Table/cardsใช้filteredAddonsเดียวกัน; ไม่มีผลค้นหาแสดงclear filters; ไม่มีข้อมูลแสดงadd; detailsราคาไม่เปลี่ยนPOSplatform
- [ ] Run test + `tests/ui/addons.test.js`; browserชื่อยาว/หมวดชื่อยาว/จำนวนทศนิยมและ6รายการdemoอ่านได้โดยไม่เลื่อนข้าง
- [ ] Commit `feat: add compact mobile addon cards`

### Task 16: Add-on editor ไม่ล้นคีย์บอร์ด

**Files:** Modify `AddonEditModal.vue`; Test `tests/ui/mobileAddonForm.test.js`, existing `priceForms.test.js`

**Interfaces:** คง `store.modals.addonEdit={isOpen,addonId}`, form/material selection/amountUsed/save/requestClose เดิม; ไม่มีการเพิ่มbusinessvalidationใหม่

- [ ] Test `switching material updates unit using existing behavior`, `collapse prices preserves inputs`, `dirty close retains form on cancel`, `save submits same addon payload`; input priceinvalidต้องแสดงข้อความเดิมและfocusได้
- [ ] Run `npx vitest run tests/ui/mobileAddonForm.test.js`; คาด FAIL
- [ ] แยกheader/body/footerจากcontainerเดิมที่ไม่มีscrollboundary; maxheightcalc(100dvh-16px), headerclose44px, footer “ยกเลิก”/“บันทึกท็อปปิ้ง”, bodymin-height0+overflowauto
- [ ] ข้อมูลหลักชื่อ/ไอคอน/หมวดอยู่บน; pricessectionยุบได้; material+amount+unitอยู่กลุ่ม “ตัดวัตถุดิบต่อครั้ง”; mobileamountfieldไม่บีบระหว่างdropdownกับunit
- [ ] ถ้าไม่ผูกวัตถุดิบใช้กฎclear/disablefieldเดิม; ห้ามแปลงamountUsedหรือราคาที่หายโดยเผลอ; emoji overlayใช้ModalShell stackเดิม
- [ ] Run test + priceForms + addons; manualkeyboardเปิดราคาช่องทางท้าย/amountfieldแล้วเข้าถึงsave/cancelได้ที่320pxและแนวนอน
- [ ] Commit `style: fit addon editor to mobile screens`

**Gate จบ Add-on:** ค้นหา/กรอง/ดูราคา/ตรวจวัตถุดิบที่ผูก/เพิ่ม/แก้ไข/ลบครบ และ CustomOrderModalยังเลือกAdd-onพร้อมราคาถูกตัว

---

## ตรวจรวมและส่งมอบ

### Task 17: Responsive integration และ browser QA ทั้งสี่หน้า

**Files:** Create `tests/ui/mobilePagesIntegration.test.js`, `src/assets/mobile-pages.css`, verification document; Modify scopedstylesของcomponentsที่พบปัญหาจริง

**Interfaces:** ไม่เพิ่มpublicbusinessAPI; CSS sharedclassesเป็น `.mobile-page`, `.mobile-page-with-bottom-bar`, `.mobile-action`, `.mobile-empty-state` ใช้เฉพาะหน้าที่ปรับ ไม่override button/input/tableทั้งระบบ

- [ ] Test `resize does not duplicate cart or reset filters`, `menu price view preserves POS platform`, `draft remains while switching tabs`, `opening drawer closes more menu`; ใช้createTestStoreและfake matchMedia event ตรวจ state/actions ไม่ใช้snapshotHTMLทั้งหน้า
- [ ] Run `npx vitest run tests/ui/mobilePagesIntegration.test.js`; คาด FAIL เฉพาะintegrationที่ยังขาด; แก้ผลที่พบทีละกรณี ไม่สร้างimplementationเพื่อผ่านassertเชิงclassอย่างเดียว
- [ ] ตั้งsafe-area/bottom paddingกับmobilebar, ไม่มีfixedbottomสองแถบทับกัน; cartอยู่เฉพาะPOS draftอยู่เฉพาะStock; dialogไม่ถูกblur/z-indexของdrawerบัง
- [ ] ตรวจbrowserที่320/360/390/430/768/1024/1280pxและ844×390; viewport overrideต้องคืนค่าหลังจบ; อ่านDOM/screenshotจริง ไม่อนุมานว่าCSSผ่านจากunit test
- [ ] ตรวจพื้นฐานทุกหน้า: search, filter cancel/apply/reset, emptydata/noresults, 100-characterชื่อ, ภาษาไทยติดกันไม่มีเว้นวรรค, ฿0/ราคาหาย, reducedmotion, keyboardTab/Escape, เปิดdrawer/เพิ่มเติม/overlayไม่ชนกัน
- [ ] ตรวจStockเฉพาะ: archived/restore, trackingnone, multi-lot/expired, stock0/decimal, draft +/- และsave/discard; comparedesktopค่าตรงกัน
- [ ] ตรวจPOSเฉพาะ: emptycart/หลายรายการ/add-ons, platformchange, qtyremove, note/payment, shortagecancel/confirm, lotswitchcancel/confirm, checkoutdoubletap, receiptและstockledger
- [ ] ตรวจMenu/Addonเฉพาะ: pricesfallback, create/editdirtycancel/save, missingmaterial, BOM30rows, keyboardvisiblefooter; ยังใช้งานdesktoptableได้ครบ
- [ ] ใช้fixtureข้อมูลจำลอง isolatedlocal originหรือteststore; manual checkoutต้องไม่ใช้ร้านจริง; realGASsyncไม่จำเป็นต่อUIรอบนี้
- [ ] บันทึกverificationแยกตามหน้า: viewport, fixture, action, expected, observed, screenshotpath; ถ้ายังมีข้อบกพร่องให้ระบุ “ยังไม่ผ่าน” ไม่ติ๊กเสร็จ
- [ ] Run `npm test`, `npm run lint`, `npm run build`, `git diff --check`; PASSทั้งหมด; testcountใหม่รายงานตามผลจริง ไม่บังคับให้เท่ากับ182
- [ ] Commit `test: verify mobile page renovation and responsive flows`

### Task 18: Final review, integration, push และ deployment

**Files:** Update verification document; ไม่มีproductfileใหม่ถ้าไม่พบdefect

- [ ] Review diffเทียบspecทีละข้อ: four mobilelayouts, sharedcomponentsไม่เกินความจำเป็น, desktopunchangedbusiness, overlaykeyboard, no data/schema changes; ถ้าต้องแก้defectใช้ systematic-debugging และ rerunเฉพาะtestที่สัมพันธ์ก่อนfullsuiteรอบสุดท้าย
- [ ] ตรวจ `git status --short`, `git diff --stat`, staged diff ไม่มีlocal demo JSON/URLs/ข้อมูลร้าน/รูปcaptureไม่จำเป็นถูกcommit
- [ ] ใช้worktree/featurebranch `codex/mobile-pages-renovation` ตอนเริ่มimplementationตามusing-git-worktrees; integrationเข้mainในเครื่องตามauthorizationเดิมเมื่อchecksผ่าน; ไม่forcepushหรือย้อนงานของผู้ใช้
- [ ] เก็บcommitแยกตามTasksก่อนintegrationเพื่อreview/rollbackได้; ถ้าmainเปลี่ยนระหว่างทำให้merge/rebaseอย่างเหมาะสมและตรวจใหม่ก่อนpush
- [ ] Run final `npm test`, `npm run lint`, `npm run build`, `git diff --check` บนrevisionที่จะpush ถ้าintegrationเปลี่ยนproductcode; เก็บexitcode/ผลไว้verification
- [ ] `git push origin main`; ติดตามBuild and Deploy to GitHub Pages และPages deploymentของSHAนี้จนsuccess; ถ้าfailให้อ่านlogsและแก้ ไม่ประกาศdeployสำเร็จจากpushอย่างเดียว
- [ ] Smoke testเว็บdeployล่าสุดทั้ง4หน้าในmobile: drawer, cards, cartsheet, editor, ไม่ส่งcheckout/syncร้านจริง; บันทึกversionURLและscreenshotแต่ละหน้า
- [ ] สรุปผู้ใช้: งาน1–4เสร็จเท่าไร, tests/lint/build, commit/SHA, deployedURL, รูปmobile, ข้อจำกัดที่ยังมีจริง; cleanupเฉพาะworktreeที่สร้างสำหรับงานนี้หลังintegrationสำเร็จ

---

## ตัวอย่าง assertions ที่ยึดเป็นเกณฑ์ระหว่างลงมือ

ตัวอย่างต่อไปนี้เป็นรูปแบบ test บางส่วน; fixtures/wrapperสร้างใน test fileเจ้าของงานตามInterfacesด้านบน ห้ามนำไปใช้เป็นtestที่ไม่ตรวจbehaviorจริง

```js
// Task 3: cancel ไม่ apply
expect(wrapper.emitted('apply-filters')).toBeUndefined()
// หลัง apply role/category/showDeleted
expect(wrapper.emitted('apply-filters')[0][0]).toEqual({role:'main',category:'Fresh Fruits',showDeleted:false})

// Task 6: เปิดรายละเอียดไม่แตะ transaction
expect(commitSpy).not.toHaveBeenCalled()
expect(discardSpy).not.toHaveBeenCalled()

// Task 8: cart เก็บใน storeเพียงแห่งเดียว
expect(wrapper.findAllComponents(CartPanel)).toHaveLength(1)
expect(store.cart[0].qty).toBe(3)
expect(store.orderNote).toBe('แยกท็อปปิ้ง')

// Task 10: checkoutปกติเกิดorderเดียวและเรียกcheckoutครั้งเดียว
expect(store.orders.length).toBe(beforeOrderCount+1)
expect(checkoutSpy).toHaveBeenCalledTimes(1)
// กรณีshortage: flowเดิมเรียกcheckoutแรก + checkout({allowShortage:true})
// จึงassertจำนวนorderเพิ่ม1 และรอบretryที่ได้รับอนุมัติหนึ่งครั้ง ไม่บังคับspyรวมเป็น1

// Task 11: displayplatformไม่เปลี่ยนPOS
expect(store.currentPlatformId).toBe(originalPosPlatformId)
expect(wrapper.text()).toContain('฿0')
expect(missingPriceWrapper.text()).toContain('ยังไม่ตั้งราคา')

// Task 15: แยกไม่ผูกกับIDที่หาไม่เจอ
expect(unlinkedWrapper.text()).toContain('ไม่ผูกวัตถุดิบ')
expect(missingMaterialWrapper.text()).toContain('ไม่พบวัตถุดิบที่ผูก')
```

## Definition of Done รายช่วง

| ช่วง | ต้องผ่านก่อนถือว่าเสร็จ |
|---|---|
| คลัง | mobileไม่มีtableแนวนอน, actionsครบ, lot IDsถูก, draftsave/discard/recoveryไม่เปลี่ยน |
| POS | productพื้นที่หลัก, cartเปิด/ปิดไม่หาย, subtotalถูก, checkoutไม่ซ้ำ, shortage/receiptflowครบ |
| เมนู | search/categoryเหมือนdesktop, priceviewแยกPOS, BOMและeditorทำงานด้วยมือถือ/คีย์บอร์ด |
| Add-on | cardกระชับ, linked/missingmaterialแยกชัด, editorไม่ล้น, CustomOrderยังใช้ราคา/amountเดิม |
| รวม | ทุกbreakpoint/keyboard/reducedmotionผ่าน, tests/lint/buildผ่าน, SHAที่pushdeploysuccess |

## ความเสี่ยงและวิธีคุม

- **Store checkoutมีcallbackผ่านshortage modal:** Task10ต้องอ่านflowปัจจุบันก่อนเขียนdebounce; ไม่ใช้แค่Promise.finallyถ้าstorereturnก่อนconfirmationจบ
- **StockViewยาวและstateเยอะ:** ย้ายเฉพาะUIและreusehandlers อย่าแยกstoreactions/คำนวณต้นทุนในรอบเดียว; ถ้าจำเป็นต้องเปลี่ยนbusinesscodeให้บันทึกเหตุผลและtestต่างหาก
- **Overlay stack:** ModalShellมีinert/focus stackอยู่แล้ว ใช้ตัวนี้ต่อ ไม่เพิ่มfocus trapอีกชุดแข่งกัน; scroll lockต้องนับnested overlaysและreleaseหลังleave
- **Responsiveสองหน้าตา:** cards/tableใช้computedเดียวกัน CartPanelmountเดียว; resizeต้องไม่มีwatchที่save/clearcart/discarddraft
- **มือถือคีย์บอร์ด:** CSS100dvhอย่างเดียวไม่รับประกัน keyboardพื้นที่พอ ต้องตรวจbrowserจริงและvisualViewportถ้าพบfooterโดนบัง; ติดlistenerเฉพาะoverlayที่เปิดและcleanup
- **การทดสอบราคา:** หน้าจัดการใช้dashเมื่อไม่กำหนด แต่POSfallback0ตามเดิม ความต่างนี้ตั้งใจและห้ามทำsharedformatterที่เปลี่ยนbehaviorPOSโดยไม่รู้ตัว

## Plan self-review

- [x] ครบสิ่งที่ผู้ใช้อนุมัติทั้ง4หน้า + headerที่เกี่ยวข้อง
- [x] มีไฟล์และprops/emits/actionsที่ชัด พร้อมtestsและcommandsทุกงานที่เปลี่ยนbehavior
- [x] Review Focusทั้ง5ข้อมีtask/testรองรับ
- [x] ไม่สร้างschemaใหม่ ไม่เพิ่มdependency และไม่เขียนสูตรราคาหรือstockใหม่
- [x] ไม่มีขั้นตอนส่งข้อมูลจริงไปSheetsหรือcheckoutร้านจริงระหว่างUI QA
- [x] ขอบเขตdesktop/mobile/cartbreakpointชัดและdesktopactionsยังอยู่
- [x] ระบุสิ่งที่ยังไม่เริ่มและgateจบแต่ละช่วง ไม่อ้างว่าimplementationเสร็จ

## Execution handoff

แนะนำ **Native / ทำในแชตนี้ตามลำดับ** เพราะStock draftsและPOS checkoutมีstateร่วม/overlayซ้อน การติดตามทีละงานช่วยคุมผลกระทบและลดการเปิดcontextซ้ำ ให้ผู้ใช้ตรวจแผนก่อนเริ่มimplementation; ถ้าผู้ใช้เลือกแบ่งagentsจึงใช้subagent-driven-developmentตามข้อกำหนดของskill
