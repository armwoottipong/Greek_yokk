# Add-on Package and Cost Separation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Add-ons support multi-item recipes, derive and adjust order-level Package requirements in POS, prevent negative Package stock, and report ingredient, fulfilled Package, and expected Package-shortage costs separately.

**Architecture:** Upgrade the canonical database to schema version 4, persist `inventoryType` on materials, and use one recipe shape for Menu and Add-on requirements. A new pure `packagePlan` domain module owns Package baseline/source/adjustment math; Pinia owns transient order adjustments and atomic checkout orchestration; Vue components only edit and present those models. Existing `foodCost` remains the compatibility total while new split fields and immutable order snapshots support reporting and Google Apps Script round trips.

**Tech Stack:** Vue 3, Pinia 3, JavaScript ES modules, Vitest, Vue Test Utils, Google Apps Script, localStorage

**Spec:** `docs/superpowers/specs/2026-10-12-addon-package-cost-design.md`

## Global Constraints

- Menu recipe management must remain functionally unchanged.
- POS Package adjustments are order-scoped and must never mutate Menu or Add-on recipes.
- Package additions never change customer subtotal or unit price.
- Package inventory and lot quantities must never become negative.
- Missing Package cost is informational only and must not enter `foodCost` or `grossProfit`.
- Existing ingredient shortage, expiry, lot allocation, and stock-draft rebase behavior must remain intact.
- Preserve `foodCost` as `ingredientCost + packagingCost` for compatibility.
- Version 3 migration must preserve Menu recipes, stock quantities, order totals, and historical gross profit exactly.
- Use the locked dependency versions in `package-lock.json`; run `npm ci` before the first test if `node_modules` is absent.
- Use Thai user-facing copy consistent with the existing POS and modal vocabulary.

## Review Focus

- A cart with ingredient and Package shortages at the same time must present complete warnings, require the correct confirmation, and commit neither category before confirmation; Task 6 pins this with a combined-shortage checkout test.
- A negative adjustment whose baseline shrinks or disappears must clamp effective quantity at zero without mutating the stored delta or recipe; Tasks 2 and 5 pin this in domain and store tests.
- A manually selected Package archived or retyped as an ingredient before checkout must block the order and retain the cart and adjustments; Task 6 owns this test.
- Version 3 data with renamed Thai/English Package categories must migrate deterministically and a second normalization must not change the version 4 result; Task 1 owns this test.
- Persistence failure or stock-draft rebase conflict during Package checkout must leave committed stock, orders, shortage events, cart, and adjustments recoverable; Task 6 owns both atomicity tests.

---

### Task 1: Canonical schema version 4 and deterministic migration

**Files:**
- Modify: `src/domain/database.js:1-225`
- Modify: `src/data/initialData.js:1-310`
- Modify: `src/stores/posStore.js:350-510,1220-1435`
- Modify: `tests/helpers/createStore.js:1-12`
- Create: `tests/data/schemaV4.test.js`
- Modify: `tests/data/database.test.js`
- Modify: `tests/data/schemaEdges.test.js`

**Interfaces:**
- Produces: `CURRENT_SCHEMA_VERSION = 4`
- Produces: `inferInventoryType(material) -> 'ingredient' | 'packaging'`
- Produces: `normalizeDatabase(raw, options) -> {ok, value?, errors?, warnings?}` accepting versions 3 and 4 and returning canonical version 4
- Produces: canonical `material.inventoryType`, `addon.recipe[]`, split order costs, typed shortages
- Consumes: the exact migration and compatibility rules in the design spec

- [ ] **Step 1: Write failing schema migration tests**

Create `tests/data/schemaV4.test.js` with named cases that assert:

```js
it('migrates version 3 material types addon linkage and historical costs to version 4', () => {
  const result = normalizeDatabase(version3Snapshot(), {source:'import'})
  expect(result.ok).toBe(true)
  expect(result.value.schemaVersion).toBe(4)
  expect(result.value.materials.find(x=>x.id==='CUP').inventoryType).toBe('packaging')
  expect(result.value.addons[0].recipe).toEqual([{materialId:'HONEY',qty:15}])
  expect(result.value.orders[0]).toMatchObject({ingredientCost:30,packagingCost:0,expectedPackagingShortageCost:0,foodCost:30})
})

it('makes version 3 migration idempotent after canonical serialization', () => {
  const once = normalizeDatabase(version3Snapshot(), {source:'import'}).value
  expect(normalizeDatabase(once,{source:'canonical'}).value).toEqual(once)
})
```

Also cover Thai/English renamed Package categories and name-based legacy Package detection; invalid `inventoryType`; missing Add-on recipe material; zero/negative recipe quantities; negative split-cost fields; and preserving version 3 order totals/gross profit.

- [ ] **Step 2: Run the focused tests and verify the intended failures**

Run: `npm test -- --run tests/data/schemaV4.test.js tests/data/database.test.js tests/data/schemaEdges.test.js`

Expected: FAIL because schema version 4, `inventoryType`, Add-on `recipe`, and split order costs are not normalized yet.

- [ ] **Step 3: Implement version 3-to-4 normalization**

In `src/domain/database.js`, export `CURRENT_SCHEMA_VERSION` and `inferInventoryType`. Accept missing/3/4 input versions, always construct version 4 output, validate exact enum values, normalize Add-on recipes through the same material-reference rules as Menu recipes, and omit canonical legacy `materialId`/`amountUsed` fields.

For historical orders, keep existing `foodCost` and `grossProfit`, default `ingredientCost` to `foodCost`, and default Package cost fields and `packagePlan` to zero/empty. Tag shortage records from the referenced material where possible without rejecting legacy orphaned history.

- [ ] **Step 4: Convert demo fixtures and snapshots to canonical version 4**

Set explicit `inventoryType` on every default material, replace default Add-on linkage with `recipe`, and ensure `databaseSnapshot()` writes `schemaVersion: CURRENT_SCHEMA_VERSION`. Update test helper `material()` to default to `inventoryType:'ingredient'` while allowing overrides.

- [ ] **Step 5: Run schema and existing data tests**

Run: `npm test -- --run tests/data/schemaV4.test.js tests/data/database.test.js tests/data/schemaEdges.test.js tests/data/replaceDatabase.test.js`

Expected: PASS.

- [ ] **Step 6: Commit the schema migration**

```bash
git add src/domain/database.js src/data/initialData.js src/stores/posStore.js tests/helpers/createStore.js tests/data
git commit -m "feat: migrate inventory data to schema v4"
```

---

### Task 2: Typed requirement expansion and Package plan domain

**Files:**
- Modify: `src/domain/inventory.js:1-150`
- Create: `src/domain/packagePlan.js`
- Modify: `tests/inventory/requirements.test.js`
- Create: `tests/inventory/packagePlan.test.js`

**Interfaces:**
- Consumes: canonical material `inventoryType` and Add-on `recipe[]` from Task 1
- Produces: `expandItemRequirements(menu, addons, qty, materials) -> RequirementSource[]`
- Produces: `ingredientRequirementsForCart(cart, materials) -> Requirement[]`
- Produces: `buildPackagePlan(cart, materials, adjustments = []) -> {ok, items, issues}`
- Produces: `packageRequirements(planItems) -> Requirement[]`
- Produces: `finalizePackagePlan(planItems, allocationResult) -> FinalPackagePlanItem[]`
- Produces: `PACKAGE_ADJUSTMENT_REASONS`

`RequirementSource` has `{materialId, qty, inventoryType, sourceType, sourceId, sourceName}`. Package plan items use the exact fields in the spec. `finalizePackagePlan` derives fulfilled quantity from allocations and shortage quantity from shortage records, using material `unitCost` for fulfilled and expected-shortage cost.

- [ ] **Step 1: Write failing requirement-expansion tests**

Update `tests/inventory/requirements.test.js` so Add-on requirements use `recipe`, duplicated Menu/Add-on materials aggregate correctly, `hasPackage:false` filters only typed packaging, and ingredients whose category happens to contain “ถ้วย” remain ingredients once their persisted type says so.

- [ ] **Step 2: Write failing Package plan tests**

Create `tests/inventory/packagePlan.test.js` covering source attribution, Menu plus Add-on quantities multiplied by cart quantity, manual-only Package additions, standard reasons, required note for `other`, negative adjustment clamping, baseline recomputation with an unchanged delta, missing/archived/non-Package adjustment targets, reset-by-omission, fulfilled cost, and expected shortage cost.

Include the review-focus assertion:

```js
expect(buildPackagePlan(shrunkCart, materials, [{materialId:'CUP',deltaQty:-3,reason:'customer_declined',note:''}]).items[0])
  .toMatchObject({baselineQty:1,adjustmentQty:-3,requestedQty:0})
```

- [ ] **Step 3: Run domain tests and verify failures**

Run: `npm test -- --run tests/inventory/requirements.test.js tests/inventory/packagePlan.test.js`

Expected: FAIL because source-rich expansion and Package planning do not exist.

- [ ] **Step 4: Implement typed requirement expansion**

Add `expandItemRequirements` and `ingredientRequirementsForCart` to `src/domain/inventory.js`. Keep `getEffectiveRequirements` as a compatibility wrapper returning aggregated requirements for callers that still need the combined list. Replace legacy Add-on `materialId` expansion with Add-on `recipe` expansion.

- [ ] **Step 5: Implement the pure Package plan module**

Create `src/domain/packagePlan.js` with the interfaces above. It must not import Pinia or Vue, mutate carts/materials/adjustments, or silently discard validation issues. Round quantities and money using the project's current two-decimal convention.

- [ ] **Step 6: Run focused domain tests**

Run: `npm test -- --run tests/inventory/requirements.test.js tests/inventory/packagePlan.test.js`

Expected: PASS.

- [ ] **Step 7: Commit the domain model**

```bash
git add src/domain/inventory.js src/domain/packagePlan.js tests/inventory
git commit -m "feat: derive typed package plans from recipes"
```

---

### Task 3: Material inventory type and Menu recipe compatibility

**Files:**
- Modify: `src/components/modals/MaterialEditModal.vue:1-1060`
- Modify: `src/components/modals/MenuEditModal.vue:320-530`
- Modify: `src/views/StockView.vue:690-880`
- Create: `tests/ui/materialInventoryType.test.js`
- Modify: `tests/ui/menuEditorInteraction.test.js`
- Modify: `tests/ui/stockForms.test.js`

**Interfaces:**
- Consumes: `material.inventoryType` from Task 1
- Produces: material editor submission with `inventoryType`
- Produces: Menu editor ingredient/Package grouping based only on persisted `inventoryType`
- Preserves: existing Menu `recipe`, `hasPackage`, pricing, and save payload behavior

- [ ] **Step 1: Write failing material-type UI tests**

Create `tests/ui/materialInventoryType.test.js` asserting that create mode defaults to `ingredient`, editing preserves the saved type, both Thai choices have accessible names and explanations, and `saveMaterial` receives the selected enum.

- [ ] **Step 2: Write failing Menu compatibility tests**

Extend `tests/ui/menuEditorInteraction.test.js` with a material named “ถ้วยทดลอง” typed `ingredient` and a material in a renamed category typed `packaging`. Assert each appears in the correct recipe section and the submitted Menu recipe/flags remain unchanged.

- [ ] **Step 3: Run focused UI tests and verify failures**

Run: `npm test -- --run tests/ui/materialInventoryType.test.js tests/ui/menuEditorInteraction.test.js tests/ui/stockForms.test.js`

Expected: FAIL because the editor has no type field and Menu grouping still uses category/name heuristics.

- [ ] **Step 4: Add the required Material type control**

Add `inventoryType` to the Material form lifecycle and `saveMaterial` payload. Use an accessible radio/toggle choice labeled `วัตถุดิบ` and `บรรจุภัณฑ์`; explain that category is only organization while type controls Package behavior and cost reporting. Do not infer a new value during edits.

- [ ] **Step 5: Replace Menu editor Package heuristics**

Remove the local `isPackagingMaterial` name/category heuristic and group active materials by `inventoryType`. Continue honoring `hasPackage:false` exactly as before.

- [ ] **Step 6: Expose type in stock details without changing stock workflow**

Show a readable type badge in relevant Stock detail/list surfaces and preserve current search, category filters, lots, drafts, and action menus.

- [ ] **Step 7: Run focused UI tests**

Run: `npm test -- --run tests/ui/materialInventoryType.test.js tests/ui/menuEditorInteraction.test.js tests/ui/stockForms.test.js tests/ui/stockDetailPresentation.test.js`

Expected: PASS.

- [ ] **Step 8: Commit typed Material UI**

```bash
git add src/components/modals/MaterialEditModal.vue src/components/modals/MenuEditModal.vue src/views/StockView.vue tests/ui
git commit -m "feat: manage stable inventory item types"
```

---

### Task 4: Add-on multi-row BOM management

**Files:**
- Modify: `src/components/modals/AddonEditModal.vue:1-240`
- Modify: `src/views/AddonView.vue:1-180`
- Modify: `src/components/modals/CustomOrderModal.vue:1-180`
- Modify: `src/stores/posStore.js:1835-1880`
- Modify: `tests/ui/addonEditorInteraction.test.js`
- Modify: `tests/ui/catalogReadFlows.test.js`
- Modify: `tests/ui/addons.test.js`
- Modify: `tests/inventory/materialEditing.test.js`

**Interfaces:**
- Consumes: canonical Add-on `recipe[]` and Material `inventoryType`
- Produces: Add-on save payload `{id?, name, category, emoji, prices, recipe}`
- Produces: detail presentation grouped into ingredients and packaging with estimated section costs
- Produces: `getMaterialUsage(materialId)` discovery through Add-on recipe rows
- Preserves: POS Add-on selection, price addition, active filtering, and selected Add-on snapshots

- [ ] **Step 1: Replace legacy Add-on editor tests with failing BOM tests**

Update `tests/ui/addonEditorInteraction.test.js` to assert add/remove recipe rows, material unit display, duplicate material aggregation or prevention, positive quantity validation, grouped ingredient/Package choices, zero platform price preservation, broken material recovery, and save payload containing `recipe` without legacy fields.

- [ ] **Step 2: Add failing Add-on detail and POS selection tests**

Update catalog tests to assert separate `วัตถุดิบ` and `บรรจุภัณฑ์` sections, estimated costs, and a useful missing-material message. Update POS Add-on tests to prove selecting an Add-on keeps its full recipe snapshot while customer price remains based only on `prices`. Extend `tests/inventory/materialEditing.test.js` to prove material archive/delete warnings discover every Add-on recipe row rather than the removed legacy linkage.

- [ ] **Step 3: Run focused Add-on tests and verify failures**

Run: `npm test -- --run tests/ui/addonEditorInteraction.test.js tests/ui/catalogReadFlows.test.js tests/ui/addons.test.js tests/inventory/materialEditing.test.js`

Expected: FAIL because the editor and detail view still use one material linkage.

- [ ] **Step 4: Implement Add-on recipe rows**

Refactor `AddonEditModal.vue` to use recipe rows following the Menu editor's established interaction and accessibility patterns. Group options by persisted type, validate each row before save, and preserve unsaved-change confirmation.

- [ ] **Step 5: Update Add-on details and POS snapshot handling**

Render grouped recipe details and costs in `AddonView.vue`. Ensure `CustomOrderModal.vue` uses Add-on `recipe` for stock messaging but does not add Package value to customer price. Update `getMaterialUsage` and related archive/delete protection to inspect Add-on recipe rows.

- [ ] **Step 6: Run focused Add-on tests**

Run: `npm test -- --run tests/ui/addonEditorInteraction.test.js tests/ui/catalogReadFlows.test.js tests/ui/addons.test.js tests/ui/catalogPriceContext.test.js tests/inventory/materialEditing.test.js`

Expected: PASS.

- [ ] **Step 7: Commit Add-on BOM management**

```bash
git add src/components/modals/AddonEditModal.vue src/components/modals/CustomOrderModal.vue src/views/AddonView.vue src/stores/posStore.js tests/ui tests/inventory/materialEditing.test.js
git commit -m "feat: support multi-item addon recipes"
```

---

### Task 5: Order-level Package adjustments and review UI

**Files:**
- Modify: `src/stores/posStore.js:350-570,900-1030,2655-2805`
- Create: `src/components/modals/PackageReviewModal.vue`
- Modify: `src/components/pos/CartBody.vue:1-50`
- Modify: `src/App.vue:20-75`
- Create: `tests/pos/packageAdjustments.test.js`
- Create: `tests/ui/packageReview.test.js`
- Modify: `tests/ui/adaptiveCart.test.js`

**Interfaces:**
- Consumes: `buildPackagePlan` and `PACKAGE_ADJUSTMENT_REASONS` from Task 2
- Produces getter: `cartPackagePlan -> PackagePlanResult`
- Produces actions: `savePackageAdjustment({materialId, requestedQty, reason, note}) -> {ok, success, message?}`
- Produces actions: `resetPackageAdjustment(materialId)` and `resetPackageAdjustments()`
- Produces state: `packageAdjustments` and `modals.packageReview.isOpen`
- Preserves: adjustment deltas across cart edits; clears them only with `clearCart()` or successful checkout

- [ ] **Step 1: Write failing store adjustment tests**

Create `tests/pos/packageAdjustments.test.js` covering baseline creation, requested-to-delta conversion, positive manual addition, required standard reason, required note for `other`, invalid/archived/ingredient targets, per-row/all reset, cart quantity changes, removed baselines with retained negative deltas clamped to zero, and recipe immutability.

- [ ] **Step 2: Write failing Package review component tests**

Create `tests/ui/packageReview.test.js` asserting the modal displays baseline/delta/effective quantities and source names, filters the add selector to active Package materials, validates reasons and notes, supports reset actions, restores focus on close, and fits phone/iPad presentations without horizontal page overflow.

- [ ] **Step 3: Run focused tests and verify failures**

Run: `npm test -- --run tests/pos/packageAdjustments.test.js tests/ui/packageReview.test.js tests/ui/adaptiveCart.test.js`

Expected: FAIL because adjustment state, actions, and modal do not exist.

- [ ] **Step 4: Add store adjustment state and actions**

Initialize transient state independently of the database snapshot. Derive `cartPackagePlan` through the pure domain module. Validate and store deltas without editing any cart recipe snapshot or master recipe. Make `clearCart()` clear both cart and adjustments.

- [ ] **Step 5: Implement Package review modal**

Create `PackageReviewModal.vue` with effective quantity controls, source disclosure, reason selection, optional note, `other` validation, add-Package selector, per-row reset, and reset-all. Use `DialogFrame` and the existing modal form/focus patterns.

- [ ] **Step 6: Add the compact cart summary**

Show effective Package quantities and an adjusted indicator in `CartBody.vue`, plus `ตรวจ/ปรับ Package`. Do not open the modal during normal checkout and do not change subtotal. Mount the modal in `App.vue`.

- [ ] **Step 7: Run focused store and UI tests**

Run: `npm test -- --run tests/pos/packageAdjustments.test.js tests/ui/packageReview.test.js tests/ui/adaptiveCart.test.js tests/ui/posOverlayFlow.test.js`

Expected: PASS.

- [ ] **Step 8: Commit Package review flow**

```bash
git add src/stores/posStore.js src/components/modals/PackageReviewModal.vue src/components/pos/CartBody.vue src/App.vue tests/pos/packageAdjustments.test.js tests/ui
git commit -m "feat: review and adjust order packaging"
```

---

### Task 6: Atomic checkout, Package shortage confirmation, and split costs

**Files:**
- Modify: `src/domain/inventory.js:35-100`
- Modify: `src/domain/packagePlan.js`
- Modify: `src/stores/posStore.js:920-1030,2658-2962`
- Modify: `src/components/modals/LowStockWarningModal.vue:1-80`
- Modify: `tests/pos/checkout.test.js`
- Create: `tests/pos/packageCheckout.test.js`
- Modify: `tests/inventory/recoveryEdges.test.js`
- Modify: `tests/inventory/drafts.test.js`

**Interfaces:**
- Consumes: Package plan and requirements from Tasks 2 and 5
- Produces: `prepareCheckout({allowShortage=false, allowPackageShortage=false})`
- Produces: `checkout({allowShortage=false, allowPackageShortage=false})`
- Produces order fields: `ingredientCost`, `packagingCost`, `expectedPackagingShortageCost`, compatible `foodCost`, final `packagePlan`
- Produces typed Package shortage events without negative stock

- [ ] **Step 1: Write failing Package checkout tests**

Create `tests/pos/packageCheckout.test.js` covering:

```js
it('confirms package shortage then allocates only available stock and separates costs', () => {
  // CUP requested 3, available 1, unitCost 2
  expect(store.checkout()).toBeNull()
  expect(store.modals.lowStockWarning.warningItems[0]).toMatchObject({inventoryType:'packaging',shortage:2})
  const order = store.checkout({allowPackageShortage:true})
  expect(store.matMap.CUP.stock).toBe(0)
  expect(order).toMatchObject({packagingCost:2,expectedPackagingShortageCost:4})
  expect(order.foodCost).toBe(order.ingredientCost + order.packagingCost)
})
```

Also test no substitute requirement; Package-only shortage; combined ingredient and Package shortages; Package adjustment reducing demand; active lots and expiry; archived/retyped manual Package blocking checkout while retaining cart/adjustments; persistence quota failure; and successful checkout clearing adjustments.

- [ ] **Step 2: Extend recovery and draft tests**

Assert an intervening Package sale rebases a stock draft without losing the sale, and an irreconcilable draft conflict preserves the saved order while reporting the conflict. Assert cancellation or failed commit changes no orders, shortages, lots, cart, or adjustments.

- [ ] **Step 3: Run focused checkout tests and verify failures**

Run: `npm test -- --run tests/pos/packageCheckout.test.js tests/pos/checkout.test.js tests/inventory/recoveryEdges.test.js tests/inventory/drafts.test.js`

Expected: FAIL because checkout has one combined cost and one shortage flag.

- [ ] **Step 4: Separate ingredient and Package preparation**

Have `prepareCheckout` build current ingredient requirements and the adjusted Package plan independently. Keep the existing ingredient allocation path. Run Package allocation with its own confirmation flag and preserve allocation outputs for final Package-plan calculation.

- [ ] **Step 5: Implement typed shortage confirmation**

Extend the warning model/component to label ingredient and Package shortages distinctly. If both exist, show both in one review and carry both confirmation flags into the retry. Package copy must state that checkout may continue, stock stops at zero, no substitute is recorded, and the shortage remains an order event.

- [ ] **Step 6: Save immutable split-cost order snapshots atomically**

Calculate ingredient cost under the existing convention, Package cost from fulfilled quantities only, and expected shortage cost separately. Save final `packagePlan`, typed `stockShortages`, allocations, split costs, compatible `foodCost`, and gross profit in the same candidate database commit.

- [ ] **Step 7: Run checkout, inventory, and formula regressions**

Run: `npm test -- --run tests/pos/packageCheckout.test.js tests/pos/checkout.test.js tests/inventory tests/pos`

Expected: PASS, including unchanged legacy ingredient-shortage tests.

- [ ] **Step 8: Commit checkout accounting**

```bash
git add src/domain src/stores/posStore.js src/components/modals/LowStockWarningModal.vue tests/pos tests/inventory
git commit -m "feat: account for fulfilled and missing packaging"
```

---

### Task 7: Receipt and period reporting

**Files:**
- Modify: `src/components/pos/CartBody.vue:12-50`
- Modify: `src/components/modals/ReceiptModal.vue:1-125`
- Modify: `src/domain/dashboard.js:1-65`
- Modify: `src/views/DashboardView.vue:1-90`
- Modify: `src/components/dashboard/DashboardTrend.vue:50-80`
- Modify: `tests/reports/dashboard.test.js`
- Create: `tests/reports/packageCosts.test.js`
- Modify: `tests/ui/dashboard.test.js`
- Modify: `tests/ui/dashboardDevicePresentation.test.js`
- Modify: `tests/ui/shortageReceipt.test.js`

**Interfaces:**
- Consumes: immutable order split-cost and Package plan fields from Task 6
- Produces dashboard metrics: `totalIngredientCost`, `totalPackagingCost`, `expectedPackagingShortageCost`, `packagingCostPerOrder`, adjustment counts/quantities by material and reason, Package shortage counts/quantities
- Preserves: `totalFoodCost`, existing chart series, period filtering, channel reports, and historical order display

- [ ] **Step 1: Write failing report aggregation tests**

Create `tests/reports/packageCosts.test.js` using current and migrated historical orders. Assert exact split totals, per-order average, adjustment grouping, shortage grouping, zero defaults for historical Package fields, and `totalFoodCost === totalIngredientCost + totalPackagingCost` for version 4 orders.

- [ ] **Step 2: Write failing Cart, Receipt, and Dashboard UI tests**

Assert Cart financial details show estimated ingredient and Package costs without changing subtotal; Receipt shows fulfilled Package cost, adjusted rows/reasons, Package shortages, and expected missing cost; Dashboard exposes period split totals and frequently adjusted Package/reason data on desktop and mobile.

- [ ] **Step 3: Run focused report tests and verify failures**

Run: `npm test -- --run tests/reports/packageCosts.test.js tests/reports/dashboard.test.js tests/ui/dashboard.test.js tests/ui/dashboardDevicePresentation.test.js tests/ui/shortageReceipt.test.js`

Expected: FAIL because only combined `foodCost` is aggregated and displayed.

- [ ] **Step 4: Extend pure dashboard aggregation**

Add split-cost sums and Package adjustment/shortage aggregations to `buildDashboard` while retaining all current keys and trend/channel outputs. Treat missing historical split fields according to the migration contract rather than inferring Package cost.

- [ ] **Step 5: Update Cart and Receipt financial presentation**

Use the same Thai labels across POS and receipts: `ต้นทุนวัตถุดิบ`, `ต้นทุนบรรจุภัณฑ์ที่ใช้จริง`, `ต้นทุนขายรวม`, and `ต้นทุน Package ที่ขาด (ไม่รวมกำไร)`. Never render Package items as customer charges.

- [ ] **Step 6: Add responsive Dashboard Package reporting**

Show split totals, Package cost per order, frequently adjusted items/reasons, and shortages without removing existing overview/channel/menu/inventory views. Keep chart meaning stable unless a new explicitly labeled series is added.

- [ ] **Step 7: Run report and UI tests**

Run: `npm test -- --run tests/reports tests/ui/dashboard.test.js tests/ui/dashboardDevicePresentation.test.js tests/ui/shortageReceipt.test.js tests/ui/adaptiveCart.test.js`

Expected: PASS.

- [ ] **Step 8: Commit reporting changes**

```bash
git add src/components/pos/CartBody.vue src/components/modals/ReceiptModal.vue src/components/dashboard src/domain/dashboard.js src/views/DashboardView.vue tests/reports tests/ui
git commit -m "feat: report ingredient and packaging costs separately"
```

---

### Task 8: Google Apps Script schema 4 round trips

**Files:**
- Modify: `google_apps_script/Code.gs:20-330,1000-1160`
- Modify: `tests/helpers/gasHarness.js`
- Modify: `tests/gas/backend.test.js`
- Modify: `tests/gas/sync.test.js`

**Interfaces:**
- Consumes: canonical schema 4 snapshot from Task 1 and order/Add-on fields from Tasks 4 and 6
- Produces: Apps Script snapshot validation and readback preserving `inventoryType`, Add-on `recipe`, order split costs, `packagePlan`, and typed shortage evidence
- Preserves: revision conflict protection, request replay, chunked snapshots, legacy sheet rows, formula injection protection, and recoverable sync behavior

- [ ] **Step 1: Write failing GAS schema 4 tests**

Update the harness fixtures to schema 4. Add tests asserting snapshot chunk round trip for all new fields, Add-on `Recipe_JSON`, split order cost columns, Package-plan JSON, and shortage evidence. Add rejection cases for unsupported versions, invalid material type, missing recipe material, non-positive recipe quantity, malformed adjustment reason/note, negative costs, and stock values that cannot round trip safely.

- [ ] **Step 2: Update recoverable action tests**

Replace legacy `saveAddon` payloads with recipe payloads and prove replay/recovery remains exactly-once. Keep explicit tests for retained business rows and formula-looking literal rejection.

- [ ] **Step 3: Run GAS tests and verify failures**

Run: `npm test -- --run tests/gas/backend.test.js tests/gas/sync.test.js`

Expected: FAIL because Apps Script requires schema 3 and stores legacy Add-on linkage.

- [ ] **Step 4: Upgrade Apps Script sheet and snapshot contracts**

Require schema 4 snapshots. Add/read `InventoryType`, Add-on `Recipe_JSON`, order split-cost columns, and Package-plan JSON. Legacy Add-on linkage columns may be read only for migration; version 4 writes make recipe JSON authoritative. Validate the exact enums and numeric constraints used by the client normalizer.

- [ ] **Step 5: Preserve sync recovery semantics**

Ensure failed validation or write leaves the previous committed snapshot/revision intact, and successful chunked readback is byte-equivalent after JSON normalization.

- [ ] **Step 6: Run GAS and client sync tests**

Run: `npm test -- --run tests/gas/backend.test.js tests/gas/sync.test.js tests/data/schemaV4.test.js`

Expected: PASS.

- [ ] **Step 7: Commit GAS support**

```bash
git add google_apps_script/Code.gs tests/helpers/gasHarness.js tests/gas
git commit -m "feat: sync package accounting with schema v4"
```

---

### Task 9: Full regression, responsive verification, and release evidence

**Files:**
- Modify if required by verified defects: `src/**`, `tests/**`
- Create: `docs/superpowers/verification/2026-10-12-addon-package-cost.md`

**Interfaces:**
- Consumes: completed Tasks 1-8
- Produces: evidence that migration, Add-on BOM, Package review, checkout, cost reporting, and sync meet the spec without regressing existing workflows

- [ ] **Step 1: Run the full automated suite**

Run: `npm test`

Expected: all tests PASS with zero unhandled errors.

- [ ] **Step 2: Run static and production checks**

Run: `npm run lint`

Expected: exit 0.

Run: `npm run build`

Expected: Vite production build exits 0.

- [ ] **Step 3: Exercise migration and backup round trips**

Load a version 3 fixture, confirm schema 4 material types/Add-on recipes/order history, export JSON, import it again, and verify no semantic diff. Record the fixture identity and results in the verification document.

- [ ] **Step 4: Exercise the critical POS scenarios locally**

Verify at desktop, iPad portrait/landscape, and 320/390px phone widths:

- normal Menu-only checkout without an extra modal;
- honey/jam Add-on automatically adding ingredient and sauce-cup Package rows;
- manual whole-order bag addition with a standard reason;
- adjustment retained after cart quantity/Add-on changes without recipe mutation;
- Package shortage warning followed by sale, zero Package stock, no substitute, saved event, and split cost;
- simultaneous ingredient and Package shortage;
- Receipt and Dashboard split-cost presentation.

Expected: no horizontal page overflow, trapped focus while dialogs are open, Escape/cancel recovery, and no console errors.

- [ ] **Step 5: Verify no negative Package state**

Search saved local snapshot, exported JSON, order shortage records, and rendered values for negative Package stock, lot quantity, requested quantity, fulfilled quantity, or cost. Expected: none; negative `adjustmentQty` is allowed only as an explicit delta.

- [ ] **Step 6: Write verification evidence**

Create `docs/superpowers/verification/2026-10-12-addon-package-cost.md` with commands, pass counts, build result, tested viewports, screenshots/metrics paths if captured, known external gates, and explicit confirmation that no production checkout or live Sheets write was performed.

- [ ] **Step 7: Commit verified repairs and evidence**

If verification found defects, commit each focused repair with its regression test before the evidence commit. Then:

```bash
git add docs/superpowers/verification/2026-10-12-addon-package-cost.md
git commit -m "docs: verify addon package cost workflow"
```

