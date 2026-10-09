# Full Project Audit Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This document is a proposal; writing it does not authorize implementation, deployment, or data migration.

**Goal:** แก้ความเสี่ยงข้อมูลหาย สต็อกผิด ซิงค์หลอกว่าสำเร็จ และ UI ที่ใช้งานไม่ได้ตาม Full Project Audit โดยมี regression evidence ก่อนแต่ละการเปลี่ยนแปลง

**Architecture:** คง Vue/Pinia และให้ local database เป็นแหล่งข้อมูลหลัก แยก committed database กับ inventory draft; domain operations เตรียม candidate โดยไม่ mutate ข้อมูลจริง แล้ว persist สำเร็จก่อน publish เข้า UI เพิ่ม shared normalization/validation และ inventory requirements เพื่อให้ทุก entry path ใช้กติกาเดียวกัน Google Sheets เป็น optional backup/export ในแผนนี้ ไม่เพิ่ม multi-device realtime database

**Tech Stack:** JavaScript ES modules, Vue 3, Pinia 3, Vite 6, Tailwind 3, Google Apps Script; proposed test tooling Vitest 3.2.7, Vue Test Utils 2 และ jsdom 26 ไม่เปลี่ยนโปรเจกต์เป็น TypeScript

**Spec:** [Full Project Audit](C:/Users/user/.codex/visualizations/2026/10/09/01a1217c-5703-79d1-ad7e-725beb8120f4/Full-Project-Audit.md). รหัส A/D/B/C/U ด้านล่างตรงกับรายงาน

**Status:** Plan only — ยังไม่ติดตั้ง dependencies ไม่แก้ product code ไม่รัน migration และไม่ commit

## Global Constraints

- “ยังไม่ต้องแก้ไขสิ่งใด ให้รายงานผลการตรวจสอบและเสนอแผนปรับปรุงก่อนเท่านั้น” — ข้อจำกัดเดิมยังมีผลจนผู้ใช้สั่งเริ่มแก้
- “ถ้าไม่มี auth หรือ security ให้ข้าม” — ไม่เพิ่ม auth/roles/security subsystem ในงานนี้
- Data Integrity, Business Logic และ Functional Correctness มาก่อน cosmetic UI
- Existing records/history ต้องไม่ถูกลบหรือ renumber เงียบ ๆ; migration/restore เตรียม candidate และ recovery copy ก่อนแทนข้อมูล
- ไม่มี real Google Sheets writes, deploy หรือ production reset ระหว่าง local verification ใช้ mocks/ข้อมูลทดสอบก่อน
- คง public store action names ที่ callers ใช้; เปลี่ยน return contract แล้วต้องแก้ callers ใน task เดียวกัน
- ทุก bug task ทำ red → minimal fix → green → related regression suite → reviewable commit เมื่อเริ่ม implementation
- ไม่ทำ broad store rewrite, dependency upgrades ที่ไม่เกี่ยวกับ tests หรือ legacy deletion ในชุดแรก

## Decisions for review before execution

1. **แนะนำแยก committed/draft และ candidate transactions** แทน patch snapshot เฉพาะจุด เพราะ D03/D04/D07 มีสาเหตุร่วมกัน การ patch รายจุดเร็วกว่าแต่ยังมี paths ที่ serialize draft ส่วนการเปลี่ยนเป็น server database ใหญ่เกินขอบเขตนี้
2. **เก็บ moving weighted-average cost ที่มีอยู่** สำหรับ order COGS; ยังไม่เปลี่ยนเป็น per-lot accounting ต้นทุน history เก็บเป็น snapshot และไม่คำนวณย้อนหลังใหม่
3. **คง intentional shortage override** แต่ checkout ต้องยืนยัน shortage ณ เวลาขายและบันทึก outstanding quantity แยก expired/missing/archived ซึ่งไม่อนุญาต override ต้อง review กติกานี้ก่อน Task 7
4. **Sheets เป็น snapshot backup** ไม่ใช่ realtime authority ต้องมี readable acknowledgement/readback จึงแสดง “สำเร็จ” หาก transport เดิมทำไม่ได้ ให้แสดง unavailable/pending และไม่อ้างว่างาน sync ผ่าน ไม่เพิ่ม proxy/server โดยอัตโนมัติ
5. **Business timezone = Asia/Bangkok** ไม่ขึ้นกับ timezone ของเครื่องผู้ใช้

## Review Focus

- Legacy database ไม่มี marker หรือมี duplicate IDs: ไม่ล้าง/ไม่แก้ references โดยเดา — Task 1–3
- Storage quota failure ระหว่าง sale: cart และ committed stock/history ต้องยังอยู่ — Task 2/7
- Sale ระหว่าง inventory draft: discard คืนเฉพาะ draft แต่เก็บ sale — Task 4
- Recipe มี repeated material หรือ expired active lot: aggregate requirements และไม่ใช้ expired stock — Task 5/7/11
- Cancel ที่ focus แล้ว Enter และ lot ที่เปิดครั้งแรก: action target ต้องตรงความตั้งใจ — Task 8/9

## Workstreams and dependencies

| ชุด | Tasks | เงื่อนไขเริ่ม | สิ่งที่ส่งมอบ |
|---|---|---|---|
| 1. Local data safety | 1–7 | อนุมัติให้เริ่มแก้และ review decisions | Startup/import/storage/draft/checkout ที่มี invariants |
| 2. UI and reports | 8–10 | Tasks 4–7 สำหรับ inventory UI | Lot/unit/keyboard/mobile/date/CSV ถูกต้อง |
| 3. Sheets and release quality | 11–14 | Task 2 snapshot contract; transport proof ก่อน Task 12 | Backend recovery, truthful sync, CI และ verification |

แยก review/commit แต่ละ task ได้ Tasks 8–10 ไม่ต้องรอ Sheets ส่วน backend validation Task 11 ไม่ต้องรอ UI ห้ามทำ store-mutating tasks พร้อมกันโดยไม่มี isolation

## Proposed file responsibilities and shared contracts

ไฟล์ใหม่ต่อไปนี้เป็นการแยกเฉพาะ logic ที่ต้องใช้แก้ ไม่ย้าย store ทั้งหมด:

- `src/domain/database.js`: schema validation/normalization, legacy migration candidate, database replacement
- `src/services/localDatabase.js`: load/persist snapshot และ recovery; ไม่รู้จัก modal/toast
- `src/domain/ids.js`: collision-resistant identifiers
- `src/domain/inventory.js`: aggregate requirements, expiry/lot allocation และ operation candidates
- `src/domain/businessDate.js`: business calendar keys
- `src/services/gasClient.js`: transport, acknowledgements, sync lifecycle
- `src/components/ui/ModalShell.vue`: dialog semantics/focus lifecycle
- `tests/helpers/createStore.js`: fresh Pinia, fake storage, fake clock, fake network สำหรับ tests เท่านั้น
- `tests/helpers/gasHarness.js`: VM + Spreadsheet/Lock/ContentService mocks ไม่มี external writes

JSDoc contracts ที่ทุก task ต้องใช้ชื่อเดียวกัน:

```js
// DatabaseSnapshot: {schemaVersion:3, revision:number, materials:[], menus:[],
// addons:[], platforms:[], orders:[], activityLogs:[], categories:{}, gasApiUrl:string,
// stockShortages:[]}
// ValidationResult: {ok:true,value:DatabaseSnapshot,warnings:[]}
//   | {ok:false,errors:[{path:string,code:string,message:string}]}
// CommitResult: {ok:true,revision:number} | {ok:false,code:string,message:string}
// Requirement: {materialId:string,qty:number}
// Allocation: {materialId:string,lotId:string,qty:number}
// InventoryResult: {ok:true,materials:[],allocations:[],shortages:[]}
//   | {ok:false,code:string,issues:[]}
```

## Task 1: Non-destructive startup and first regression tests

**Covers:** D01, startup portion C01.  
**Files:** Modify `package.json`, `package-lock.json`, `src/stores/posStore.js:313-393`; create `vitest.config.js`, `tests/helpers/createStore.js`, `tests/store/startup.test.js`.  
**Interfaces:** helper `createTestStore({storage,now}) → store`; startup keeps existing collection data and surfaces a recovery error instead of replacing corrupt keys.

- [ ] Add test tooling only: `npm install -D vitest@3.2.7 @vue/test-utils@2 jsdom@26`; add `test: "vitest run"`, merge Vite aliases/plugin into Vitest configuration and isolate fake storage per test. Vitest v3 supports Vite >=5/Node >=18 per [official guide](https://v3.vitest.dev/guide/); verify resolved dependencies before executing install.
- [ ] Write `preserves_existing_data_without_clear_marker`: seed material/order and no `GY_CLEARED_ALL_V1`; assert both remain after store initialization. Write `preserves_corrupt_raw_key_for_recovery`: seed malformed JSON; assert no overwrite and recoverable error, not mount exception. New empty install must have empty real history rather than fabricated activity.
- [ ] Run `npm test -- tests/store/startup.test.js`; expected RED on current destructive initialization/corrupt parse.
- [ ] Remove destructive migration, catch load failures without silently reset; retain old raw keys for recovery. Demo remains explicit action.
- [ ] Repeat targeted test; expected all PASS. Commit `fix: preserve local records during startup`.

## Task 2: Validated and failure-safe local database snapshots

**Covers:** C01, D08, part A01.  
**Files:** Create `src/domain/database.js`, `src/services/localDatabase.js`, `tests/data/database.test.js`, `tests/data/localDatabase.test.js`; modify `src/stores/posStore.js:1285-1293`, startup, callers of persistence and activity logging.  
**Interfaces:** `normalizeDatabase(raw,{source}) → ValidationResult`; `loadDatabase(storage) → ValidationResult`; `saveDatabase(storage,candidate,{expectedRevision}) → CommitResult`. Store `commitDatabase(candidate) → CommitResult` persists before publishing collections.

- [ ] Write `rejects_invalid_backup_without_mutation`: materials string/menus object/addons42 → ok=false and working state/storage unchanged. Write `rejects_duplicate_ids_and_dangling_references`; assert path-specific errors. Validate finite nonnegative quantities/costs/prices, supported dates, positive pack size, and active platform existence.
- [ ] Write `quota_failure_leaves_previous_database_readable`: make setItem throw on candidate write; previous snapshot/revision and state remain identical. Write `migration_does_not_delete_legacy_keys_on_failure`.
- [ ] Run `npm test -- tests/data/database.test.js tests/data/localDatabase.test.js`; expected RED for missing interfaces/behavior.
- [ ] Use one committed `GY_DATABASE_V3` JSON snapshot; before first migration store exact legacy key/value recovery copy. Never remove legacy/recovery keys in this task. Prepare/validate candidate before one canonical setItem; no multi-key half-commit. Reject revision mismatch instead of overwrite. Activity log construction must not call persistence recursively.
- [ ] Run targeted tests and startup suite; all PASS including malformed input and failure injection. Commit `feat: add validated local database commits`.

## Task 3: Normalized lots, unique IDs and safe replace/backup

**Covers:** D02, D06–D09.  
**Files:** Modify `src/domain/database.js`, store save/reset/clear actions, `src/views/SettingsView.vue:666-723`, `src/data/initialData.js`; create `src/domain/ids.js`, `tests/data/replaceDatabase.test.js`, `tests/data/ids.test.js`.  
**Interfaces:** `createEntityId(prefix,existingIds) → string`; store `replaceDatabase(raw,{source}) → CommitResult`; `exportDatabase() → DatabaseSnapshot`. source is `import|demo|clear|legacy`.

- [ ] Write `receipt_preserves_legacy_positive_stock`: stock15000/no lots → normalize → receive100 → total15100. Write `stocktake_legacy_stock_returns_14000_not_zero`.
- [ ] Write `delete_then_create_never_reuses_id`: MAT001/002/003, delete002, add → all unique. Generate >1000 same-day order IDs; all unique. Duplicate IDs in imported data fail without automatic renumber.
- [ ] Write `replace_resets_draft_cart_and_modal_callbacks`: snapshot→clear/import→discard cannot resurrect previous materials. Write `backup_round_trip_preserves_logs_lots_categories_platforms`; backup older than schema3 receives explicit migration warnings and no fabricated history.
- [ ] Run `npm test -- tests/data/replaceDatabase.test.js tests/data/ids.test.js`; expected RED.
- [ ] Normalize all entry paths. For positive stock with absent/empty lots create one baseline lot; if existing lots disagree with stock, report conflict rather than guess. Set default cost explicitly only when absent, not when valid zero. After successful replace clear draft/actions/cart/orderNote and stale modal callbacks. Export only committed state; backup includes history/shortages/schema version.
- [ ] Run data/startup suite and targeted tests; all PASS. Commit `fix: normalize and replace database consistently`.

## Task 4: Separate inventory drafts from committed transactions

**Covers:** D03/D04/D07, A01.  
**Files:** Modify `src/stores/posStore.js:1299-1426`, stock/production/waste/deduction actions, `src/views/StockView.vue`, `src/components/modals/StockInModal.vue`, `StockAdjustModal.vue`, `WasteModal.vue`, `StocktakeModal.vue`; create `tests/inventory/drafts.test.js`.  
**Interfaces:** store `initStockDraftSnapshot()`, `commitStockDrafts() → CommitResult`, `discardStockDrafts()` retain names. Keep committed materials separately; existing `materials` consumers see the working draft on Stock but persistence receives committed candidate only. Persisted actions return failures to callers.

- [ ] Write exact assertions: raw100/output0 → draftproduce(raw30,output20) → discard => raw100/output0; committed storage unchanged.
- [ ] Write stock100→draft+30→saveMenu→discard→reload =>100. Write stock100→draft+30→sale20→discard =>80, with lot sums80 and persisted80.
- [ ] Write `failed_draft_commit_retains_draft_for_retry` and `draft_only_lot_switch_is_detected` (same total but active lot differs). Assert date/cost/lot state returns on discard, not just stock.
- [ ] Run `npm test -- tests/inventory/drafts.test.js`; expected RED.
- [ ] Represent draft as operations applied to a committed baseline. Committed sale applies its allocations to committed database and rebases draft operations; if rebase invalidates pending operation, keep committed sale and mark draft conflict for review instead of merging silently. Remove unconditional whole-material snapshot replacement from deduction.
- [ ] Run draft and database suite; all PASS. Commit `fix: isolate stock drafts from committed changes`.

## Task 5: One recipe, expiry and lot allocation contract

**Covers:** B01/B03/B04.  
**Files:** Create `src/domain/inventory.js`, `tests/inventory/requirements.test.js`, `tests/inventory/expiry.test.js`; modify store availability/cost/productionCapacity/cartLotWarnings/deduction.  
**Interfaces:** `getEffectiveRequirements(menu,addons,qty,materials) → Requirement[]`; `isExpiredOn(expiryDate,businessDate) → boolean`; `allocateInventory(materials,requirements,{businessDate,allowShortage}) → InventoryResult`. Allocate active eligible lot then existing expiry/receive ordering; today is valid, yesterday expired.

- [ ] Write expired lot100/request20 => rejected/no mutations; fresh alternative lot supplies20 instead. Write production capacity excludes expired lots and rejects missing/archived inputs.
- [ ] Write hasPackage=false/packaging100/recipe120 => requirements omit packaging, no shortage, packaging COGS0, stock100 after sale.
- [ ] Write recipe/addon repeats X10+X20 with quantity2 => requirement X60 and one consistent allocation. Failed allocation must leave all materials unchanged.
- [ ] Run `npm test -- tests/inventory/requirements.test.js tests/inventory/expiry.test.js`; expected RED.
- [ ] Route availability, cost, warnings, production and deduction through same effective requirements and expiry predicate. Preserve current weighted-average cost policy; return allocations/shortages rather than unconditional success.
- [ ] Run targeted and draft suites; all PASS. Commit `fix: unify recipe requirements and expiry allocation`.

## Task 6: Lot-aware material editing and production

**Covers:** D05, remaining D06.  
**Files:** Modify `src/components/modals/MaterialEditModal.vue:929-1095`, store `saveMaterial`/`batchProduce`/`stockAdjust`; create `tests/inventory/materialEditing.test.js`.  
**Interfaces:** `saveMaterialMetadata(data) → CommitResult`; existing `saveMaterial(data) → CommitResult` routes requested quantity delta through domain actions. `batchProduce` preserves existing positional arguments and returns structured result; update all boolean/undefined callers together.

- [ ] Write editor production raw1000/output540 → consume100/produce540 => raw900/lots900 and output1080/lots1080, identical after reload.
- [ ] Write metadata-only edit leaves stock/lots unchanged. Editing positive stock without lots normalizes baseline; lowering stock allocates a recorded adjustment. Duplicate recipe inputs aggregate before validation; self-production/cycles are rejected with clear error.
- [ ] Run `npm test -- tests/inventory/materialEditing.test.js`; expected RED.
- [ ] Remove direct sub.stock mutations in component. Prepare production candidate, metadata and logs once; publish only after commit. Preserve input form if validation/persist fails; no false success toast.
- [ ] Run inventory suite and component scenario; all PASS. Commit `fix: save material quantities through lot operations`.

## Task 7: Checkout validation, recorded shortage and storage failure recovery

**Covers:** B02/D02/C01, risk of stale cart.  
**Files:** Modify store `checkout`/cart actions, `src/views/PosView.vue`, `src/components/modals/LowStockWarningModal.vue`, `ReceiptModal.vue`; create `tests/pos/checkout.test.js`.  
**Interfaces:** store `prepareCheckout({allowShortage:false}) → candidate or issues`; `checkout({allowShortage:false}={}) → order|null` retains order/null compatibility. Orders save `inventoryAllocations` and `stockShortages`; database keeps outstanding shortage records instead of negative lot qty.

- [ ] Write add menu60 at stock100→change stock20→checkout => null, unchanged cart/stock/orders and shortage confirmation. Explicitly confirmed shortage => consume20, record outstanding40 linked to order and material; display it on receipt/history. Expired/missing/archived never bypass.
- [ ] Write quota failure => cart retained, stock/order/history unchanged, no receipt/success. Write repeated click after success cannot create another order because cart clears only after committed publish.
- [ ] Write edit/delete/import during cart: validate current entity availability but use a deep immutable recipe/price snapshot captured when added; reset/import clears cart as Task3 specifies.
- [ ] Run `npm test -- tests/pos/checkout.test.js`; expected RED.
- [ ] Prepare order, stock allocations, shortage and history in one candidate; save first, publish then clear cart/open receipt. Failed confirmation/storage retains user work. Review shortage policy before implementing this task.
- [ ] Run full local suite and build; all PASS. Commit `fix: commit checkout with validated inventory`.

## Task 8: Lot targets, exact unit toggles and archive state

**Covers:** U02/U04/U07.  
**Files:** Modify `StockAdjustModal.vue`, `StocktakeModal.vue`, `MaterialEditModal.vue`; create `tests/ui/stockForms.test.js`.  
**Interfaces:** forms consume structured action results from Tasks4–6; unit toggle changes display unit only, canonical counted base quantity is authoritative.

- [ ] Mount StockAdjust: first opening L2qty500/material900 => selectedLotId L2/count500; reopen another material remains requested lot. Manual material selection resets to all deliberately.
- [ ] Mount Stocktake: count540g/pack1000 → toggle pack/base repeatedly => canonical540 and variance0. Fractional1.25ml round-trip stays1.25.
- [ ] Open archived MaterialEdit => restore label/action; first click restores once.
- [ ] Run `npm test -- tests/ui/stockForms.test.js`; expected RED. Fix initialization watcher ordering, canonical quantity, loaded archive flag.
- [ ] Repeat targeted tests plus inventory suite; all PASS. Commit `fix: preserve stock form targets and quantities`.

## Task 9: Safe keyboard dialogs, mobile navigation and named add-ons

**Covers:** U01/U03/U05/U06.  
**Files:** Create `src/components/ui/ModalShell.vue`, `tests/ui/dialogs.test.js`; modify `ConfirmModal.vue`, `LotDepletionModal.vue`, `MenuEditModal.vue`, other modal wrappers, `Sidebar.vue`, `App.vue`, `PosView.vue`, `CustomOrderModal.vue`.

**Interfaces:** `ModalShell` props `{open, labelledBy, initialFocus}`; emits `request-close`; restores opener focus on close, traps focus within topmost dialog, Escape emits rather than mutates store. Preserve each form's dirty-close confirmation via useModalForm.

- [ ] Write focused Cancel+Enter => onCancel once/onConfirm0; focused Confirm+Enter => onConfirm once. Underlying controls inaccessible while modal open; focus restored after close.
- [ ] Write keyboard menu/addon buttons usable by Enter/Space and selection state announced; render addon.name and price for two identical emojis.
- [ ] Run `npm test -- tests/ui/dialogs.test.js`; expected RED; use native button activation and accessible controls/modal shell.
- [ ] Replace mobile w-full sidebar with compact navigation/drawer below768px; desktop retains256px sidebar. Every existing modal adopts shell incrementally, preserving close/save semantics and nested confirm/popover stacking.
- [ ] Browser checks 390×844,768×1024,1440×900: main has visible width, all6views accessible, POS cart usable; open Menu→Confirm→Cancel and keyboard test. Check no warning/error logs. Run UI suite; PASS. Commit `fix: make navigation and dialogs accessible`.

## Task 10: Bangkok calendar keys and valid CSV exports

**Covers:** C02/C03.  
**Files:** Create `src/domain/businessDate.js`, `tests/reports/datesAndCsv.test.js`; modify dashboard getter, `ActivityLogModal.vue`, backup filename date; create `src/domain/csv.js`.

**Interfaces:** `businessDateKey(timestamp) → YYYY-MM-DD` using Asia/Bangkok; `csvField(value) → string` doubles inner quotes and quotes commas/newlines.

- [ ] Assert `businessDateKey('2026-10-09T17:20:00Z') === '2026-10-10'`; dashboard at17:30Z excludes15:00Z order and includes17:20Z. Activity atOct9 01:00 Bangkok groups/filters Oct9. Add month/year rollover cases.
- [ ] Assert `csvField('note "broken",\nnext') === '"note ""broken"",\nnext"'`; retain BOM and Thai round-trip.
- [ ] Run `npm test -- tests/reports/datesAndCsv.test.js`; RED then implement helpers/replace ISO slicing.
- [ ] Run reports/local suite and inspect generated CSV in parser; PASS. Commit `fix: use business dates and escape CSV fields`.

## Task 11: Backend prevalidation, seed repair and recoverable transactions

**Covers:** B06–B10 and concurrent read risk.  
**Files:** Modify `google_apps_script/Code.gs`, create `tests/helpers/gasHarness.js`, `tests/gas/backend.test.js`, `docs/superpowers/specs/2026-10-09-gas-recovery.md` at execution.

**Interfaces:** `fetchOrders(startDate,endDate) → orders`; backend `validateConversion(data) → prepared or throw`; stable `requestId` on mutation payloads; `Operations` sheet with requestId/status/PREPARED candidate/COMMITTED response. Existing mutating endpoints use same recovery path and lock.

- [ ] Write missing target production => no row changes/error; inputX10+X20 stock100 =>70 and logs30. Add finite/nonnegative checks before any mutation.
- [ ] Write rerun setupDatabase leaves business rows untouched; seed strawberry references strawberry/granola references granola; getOrders date filter resolves actual function.
- [ ] Write identical requestId replay => same order/result, one deduction; injected failure after item writes then retry => one complete transaction/no orphan counted as successful. GET excludes incomplete operations and uses compatible lock/read recovery.
- [ ] Run `npm test -- tests/gas/backend.test.js`; RED. Store operation intent under lock before idempotent deterministic row writes; mark COMMITTED last. Recover existing PREPARED operation before accepting new mutation; do not count incomplete orders.
- [ ] Repeat backend suite with failure injection at each mutation boundary; PASS. Document schema/recovery and existing-row migration without clearing tables. Commit `fix: validate and recover Sheets transactions`.

## Task 12: Truthful Sheets snapshot sync with transport proof

**Covers:** B05/D09 and sync overlap risk.  
**Files:** Create `src/services/gasClient.js`, `tests/gas/sync.test.js`; modify store `syncWithGas`, Settings/Header/Sidebar status, backend router/snapshot storage.

**Interfaces:** `syncDatabase(url,snapshot,{requestId,signal}) → Promise<{requestId,revision,status:'committed'}>`; backend `syncAll` accepts schema3 snapshot and requestId, preserves all entities/lots/history; readback exposes committed revision. One in-flight sync, newer pending revision replaces older queued snapshot.

- [ ] First run a disposable transport probe with tiny synthetic snapshot against a test deployment: browser must read matching requestId/revision acknowledgement. Record request/response and redirects. No real store data. If unreadable, stop this task's transport work and leave UI reporting unsupported/pending; propose separate reviewed transport rather than silently adding infrastructure.
- [ ] Write mock rejection/opaque response => no success/time update; ack mismatch=>error; timeout=>retryable; two revisions=>latest eventually synced, one in flight. Replayed requestId never duplicates snapshot.
- [ ] Run `npm test -- tests/gas/sync.test.js`; RED. Add syncAll handler with PREPARED/COMMITTED snapshot storage, checksum/chunk validation and round-trip readback; never replace active snapshot before all chunks validate.
- [ ] Return structured sync status to UI; success/lastSyncTime only after committed ack. If revision changes during request, retain dirty status for next queued sync.
- [ ] Mock suite PASS plus test-deployment round-trip matches full snapshot. If live test environment unavailable, mark live verification pending and do not claim complete integration. Commit `fix: acknowledge committed Sheets snapshots`.

## Task 13: Release checks, deployment agreement and targeted architecture cleanup

**Covers:** A01–A04/testing gaps.  
**Files:** Modify `.github/workflows/deploy.yml`, `README.md`, `App.vue`, `vite.config.js`; create `docs/superpowers/verification/2026-10-09-remediation.md` and optionally `eslint.config.js` in execution.

- [ ] Add `npm test` before build/deploy in CI; configure lint for JS/Vue and fix only actionable errors in touched modules. Do not pretend TypeScript typecheck exists.
- [ ] Keep current gh-pages publisher and correct README to branch-based Pages setup; document remote setting check before deployment. Do not deploy in this task without authorization.
- [ ] Measure initial bundle/network and choose lazy views/modal imports only after functional tests pass; browser all6views and modal activation must remain valid. Build warning/performance alone does not justify a broad rewrite.
- [ ] Document legacy files as inactive reference; retain them until usage/retirement approved. No delete/move in this plan.
- [ ] Run `npm test`, `npm run lint`, `npm run build`; expected zero failures/errors and explain any retained bundle warning. Commit `chore: gate releases with regression checks`.

## Task 14: Whole-project verification and handoff

**Files:** Update verification document only; no additional feature work.

- [ ] Run full suite once after final changes and inspect actual exit/output; map every audit finding to test, manual proof, explicitly accepted deferral or remaining limitation.
- [ ] In disposable browser data exercise create/edit/archive/restore, receive/produce/waste/stocktake, draft→sale→discard, checkout/receipt, export/import round-trip, failure/loading/empty states, dates and keyboard/mobile. Inspect console.
- [ ] Exercise two tabs with revision mismatch: stale writer must not overwrite newer database; mark support limits for simultaneous editing. Multi-device synchronization remains outside this plan.
- [ ] Review migration/backup rollback, storage quota and GAS partial-failure evidence. Existing corrupted/duplicate data must be reported for repair rather than automatically guessed.
- [ ] Review full diff and git status; report tests run, uncovered gaps, changed contracts and deployment steps. Do not merge/deploy/replace production data automatically.

## Coverage and acceptance

| Findings | Task |
|---|---|
| D01/C01 | 1–2,7 |
| D02/D06–D09 | 3 |
| D03/D04/D07 | 4 |
| B01/B03/B04 | 5 |
| D05 | 6 |
| B02 | 7 |
| U02/U04/U07 | 8 |
| U01/U03/U05/U06 | 9 |
| C02/C03 | 10 |
| B06–B10 | 11 |
| B05 | 12 |
| A01–A04 and missing checks | 2,4,13–14 |

**Definition of done:** Functional regression scenarios pass, state/reload/backup agree, invalid operations leave committed data unchanged, success messages reflect committed results, browser workflow evidence recorded and remaining external verification explicitly named. Build alone is insufficient.

**Self-review:** Audit IDs all mapped; shared contract names consistent; Review Focus assigned concrete tests; no pending product implementation in this turn. Task12 live transport is a mandatory proof gate, not assumed available. Proposed shortage policy, snapshot migration and Sheets role require review before their respective execution tasks.

**Suggested execution:** Native execution in this chat for tightly coupled Tasks1–7, then an independent review before proceeding to UI/Sheets; use agents only if authorized. Review this plan first; no implementation has started.
