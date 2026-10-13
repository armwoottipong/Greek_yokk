# Global Inventory Classification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Replace independently managed business categories with three inventory types and recipe-derived usage roles, while making lot dates consistent and preserving production versus sale deductions.

**Architecture:** Derive presentation types from existing `inventoryType` and `hasSubRecipe`; derive usage references from saved recipes. Keep legacy category fields inert for storage compatibility. Centralize date validation for new stock events and reuse the existing production and checkout allocation paths.

**Tech Stack:** Vue 3, Pinia, JavaScript, Vite, Vitest, Vue Test Utils; existing Google Apps Script integration remains compatible.

**Spec:** `docs/superpowers/specs/2026-10-13-global-inventory-classification-notes.md` (user confirmed 2026-10-13).

## Global Constraints

- Use three types only: `วัตถุดิบที่มีการผลิต`, `วัตถุดิบปกติ`, `บรรจุภัณฑ์`.
- Usage labels are `ใช้ในการผลิต`, `ใช้ใน Add-on`, `ใช้ในเมนู`; roles can overlap and must not restrict selling or recipe selection.
- Production usage appears when a recipe is saved, without a production event. Add-on usage is direct, not recursively expanded through production recipes.
- New ingredient stock requires its receipt/production date; expiry is optional and requires that origin date. Packaging does not require either date. Dates belong to lots.
- Production deducts inputs and adds output; selling output does not deduct production inputs again. Inventory items do not automatically become sellable menus.
- Do not change live data, stored user records, `src/data/initialData.js`, example/seed datasets, or create mockups. Do not add migrations, reset the database, or deploy GAS.
- Retain legacy schema fields and import/export support; stop using category names and `isSubIngredient` to determine behavior. No schema-version change is needed.
- Test setup may use isolated in-memory records through existing test helpers; never connect tests to the user's saved database or a live GAS endpoint.
- Keep emoji-picker categories: they describe the icon library, not inventory or sales categories.

## Review Focus

1. A stale `isSubIngredient` value or a renamed legacy category must not change type, usage, selling eligibility, or dates (Tasks 1, 2, 3).
2. A material used by several recipes retains each role until its last relevant reference is removed; an inactive sales listing still has a saved recipe, while an archived producer is not an active production reference (Task 1).
3. Optional expiry must stay visible wherever a dated lot is displayed, including stock received under a former `receive_only` or `none` category (Tasks 2, 3).
4. Invalid dates must fail before any inventory mutation, draft snapshot, log, or persistence write; pre-existing undated lots must not be rewritten (Task 2).
5. A produced item can be sold alongside one of its inputs as an add-on: output is deducted for the main sale and that input only for its direct add-on quantity (Task 5).

## File Map

- Create `src/domain/materialClassification.js`: presentation types, recipe-reference index, filter semantics.
- Create `src/domain/lotDates.js`: validate and normalize date input for new stock events.
- Modify `src/stores/posStore.js`: expose derived types/references, replace category-based date policy, validate stock actions, preserve deduction logic.
- Modify inventory UI: `StockView.vue`, `StockToolbar.vue`, `StockMaterialCard.vue`, `MaterialDetails.vue`, `MaterialEditModal.vue`, `StockInModal.vue`, `StocktakeModal.vue`, `WasteModal.vue`.
- Modify sales UI: `MenuView.vue`, `AddonView.vue`, `PosView.vue`, `MenuEditModal.vue`, `AddonEditModal.vue`, `CustomOrderModal.vue`, `PosCatalog.vue`, `CatalogToolbar.vue`, `MenuCard.vue`, `AddonCard.vue`.
- Modify `SettingsView.vue` and `src/assets/settings.css`: remove the business-category management section and its controls.
- Modify `DashboardView.vue` and relevant getters in `posStore.js`: use three derived types for inventory summaries.
- Preserve `src/domain/database.js`, `src/services/localDatabase.js` and `google_apps_script/Code.gs` schema contracts; add compatibility regression coverage without changing existing payload fields.

### Task 1: Derive inventory types and usage references

**Files:** Create `src/domain/materialClassification.js`, `tests/inventory/materialClassification.test.js`; modify `src/stores/posStore.js`.

**Interfaces:**
- `getMaterialKind(material) -> 'produced' | 'normal' | 'packaging'`: packaging when `inventoryType === 'packaging'`; otherwise produced when `hasSubRecipe === true`; otherwise normal.
- `MATERIAL_KIND_OPTIONS -> Array<{id, label}>`: the three IDs above and their exact Thai labels from Global Constraints.
- `buildMaterialUsage({materials, menus, addons}) -> Map<materialId, {production, addon, menu}>`: each array contains `{sourceId, sourceName, qty, unit}` for direct recipe references. Include saved menu/add-on formulas even when sales availability is off; exclude archived sources and deleted rows. Production references come from non-archived produced materials' `subRecipe`.
- `matchesMaterialFilter(material, usage, {kind, role}) -> boolean`: `all` bypasses that dimension; roles are `production`, `addon`, `menu`. Kind and role combine with AND.
- Store getters `materialKindOptions`, `materialUsageById`, `getMaterialKind`: reactive wrappers consumed by later tasks.

- [x] **Step 1:** Write tests `classification_ignores_legacy_category_and_role`, `usage_changes_on_recipe_save_without_producing`, `roles_overlap`, `multiple_references_keep_role`, `addon_usage_is_direct`, `inactive_listing_keeps_saved_reference`, `archived_producer_does_not_mark_inputs`, and `filters_combine_kind_and_role`. Assert that editing only recipes changes references without changing any stock or lot.
- [x] **Step 2:** Run `npm test -- tests/inventory/materialClassification.test.js`; expect failures for missing exports/getters.
- [x] **Step 3:** Implement the interfaces. Aggregate duplicate references within one source by quantity; do not recursively traverse production inputs for sales roles. Replace behaviorally used main/sub getters with derived-reference membership; leave compatibility fields untouched.
- [x] **Step 4:** Run the targeted test command; expect PASS.
- [x] **Step 5:** Commit only Task 1 source/tests with message `feat: derive inventory types and recipe usage roles`.

### Task 2: Validate dates for new receipt and production events

**Files:** Create `src/domain/lotDates.js`, `tests/inventory/lotDates.test.js`; modify `src/stores/posStore.js`; extend `tests/inventory/materialEditing.test.js`, `tests/inventory/drafts.test.js`.

**Interfaces:**
- Consume `getMaterialKind` from Task 1.
- `validateLotDates(material, {receiveDate, expiryDate}, eventType) -> {ok:true, dates:{receiveDate,expiryDate}} | {ok:false, code, field}`; `eventType` is `receive` or `produce`. Origin dates use existing lot `receiveDate` storage; expiry may be null. Reject invalid calendar dates and expiry before origin. Return `ORIGIN_DATE_REQUIRED`, `INVALID_DATE`, or `EXPIRY_BEFORE_ORIGIN` as appropriate. Packaging may have null dates.
- Preserve store method signatures `batchProduce(targetMatId, yieldQty, subIngredients, note, dates, asDraft)` and existing stock-in/edit actions; validate new stock increases before allocation or writes.
- `getMaterialTrackingMode(material)` returns `none` for packaging and `expiry_and_receive` for ingredients, independent of category. The latter means expiry is supported, not mandatory.

- [x] **Step 1:** Test `ingredient_requires_origin`, `ingredient_allows_origin_without_expiry`, `expiry_requires_origin`, `invalid_calendar_date_rejected`, `expiry_before_origin_rejected`, `packaging_accepts_no_dates`, `legacy_category_cannot_change_policy`, and `invalid_date_does_not_mutate_stock_or_logs`. Test new production lot origin dates separately and unchanged old lots.
- [x] **Step 2:** Run `npm test -- tests/inventory/lotDates.test.js tests/inventory/materialEditing.test.js tests/inventory/drafts.test.js`; new cases must fail on old behavior.
- [x] **Step 3:** Validate receipt, production, and stock-increase paths before mutations, including material-editor increases. Preserve optional expiry as null when omitted instead of silently populating it from shelf life. Keep existing FEFO/allocation semantics and old stored lots; do not backfill dates.
- [x] **Step 4:** Run the targeted command; expect PASS. Existing tests invoking new stock increases must supply explicit origin dates rather than depend on silent defaults; do not alter initialData or external records.
- [x] **Step 5:** Commit only Task 2 source/tests with message `feat: validate lot dates independently of categories`.

### Task 3: Apply types and usage roles across inventory UI

**Files:** Modify `src/views/StockView.vue`, `src/components/inventory/StockToolbar.vue`, `StockMaterialCard.vue`, `MaterialDetails.vue`, `src/components/modals/MaterialEditModal.vue`, `StockInModal.vue`, `StocktakeModal.vue`, `WasteModal.vue`; create `tests/ui/inventoryClassification.test.js`; extend `tests/ui/materialInventoryType.test.js`, `stockFormInteraction.test.js`, `stockDetailPresentation.test.js`.

**Interfaces:** Consume Task 1 getters and Task 2 validation. StockToolbar filter values become `{kind:'all'|Kind, role:'all'|'production'|'addon'|'menu', showDeleted:boolean}`; `apply-filters` retains its existing event name. Stocktake uses the same three kinds instead of legacy category names.

- [x] **Step 1:** Add mounted tests for three type options, overlapping badges, automatic role changes after recipe edits, direct add-on names/quantities, combined filters, and a produced material that is itself used as an input. Test required origin/optional expiry UI and packaging without required dates. Verify optional expiry is shown in stock cards/details irrespective of legacy category.
- [x] **Step 2:** Run `npm test -- tests/ui/inventoryClassification.test.js tests/ui/materialInventoryType.test.js tests/ui/stockFormInteraction.test.js tests/ui/stockDetailPresentation.test.js`; expect new interaction failures.
- [x] **Step 3:** Replace category and manually assigned main/sub controls with three type choices. Map choices to existing `inventoryType` and `hasSubRecipe`; produced requires its existing recipe/yield form. Remove special-case material IDs, category-name heuristics, and main/sub restrictions. Render all applicable badges and source references. Use `วันรับเข้า` for receipt and `วันผลิต` for production; maintain accessible labels, errors, keyboard interaction, and responsive layout using existing components.
- [x] **Step 4:** Run the targeted tests; expect PASS. Also run `npm test -- tests/ui/adaptiveStockWorkspace.test.js tests/ui/stocktakeDraftInteraction.test.js` for filter/draft regressions.
- [x] **Step 5:** Commit only Task 3 source/tests with message `feat: simplify inventory classification and usage filters`.

### Task 4: Remove business-category management and sales grouping

**Files:** Modify sales UI listed in File Map, `src/views/SettingsView.vue`, `src/assets/settings.css`, `src/views/DashboardView.vue`, category-dependent presentation getters in `src/stores/posStore.js`; create `tests/ui/categoryRemoval.test.js`; extend `tests/ui/settingsNavigation.test.js`, `catalogReadFlows.test.js`, `addonEditorInteraction.test.js`, `menuEditorInteraction.test.js`, `adaptivePosCatalog.test.js`.

**Interfaces:** Recipe pickers consume Task 1 type options and getters; sale-item search uses name/description, not business category. Remove PosCatalog category props/events; retain search, platform, price and availability props. Generic CatalogToolbar may keep optional category support for unrelated reuse, but MenuView/AddonView stop passing business categories.

- [x] **Step 1:** Add interaction tests: settings has no category-management destination; menu/add-on editors have no independent category field; recipe pickers offer all ingredient roles and explicit packaging selection; POS searches multi-type menus without grouping; inventory dashboard groups by derived kind. Assert opening/saving existing records preserves legacy category fields instead of resetting their values.
- [x] **Step 2:** Run `npm test -- tests/ui/categoryRemoval.test.js tests/ui/settingsNavigation.test.js tests/ui/catalogReadFlows.test.js tests/ui/addonEditorInteraction.test.js tests/ui/menuEditorInteraction.test.js tests/ui/adaptivePosCatalog.test.js`; expect new failures.
- [x] **Step 3:** Remove category settings markup/state/handlers and independent sales-category controls, badges and grouping. In CustomOrderModal replace legacy add-on category headings with a flat add-on list; keep ingredient/packaging recipe selection distinct using derived kinds. Change inventory valuation grouping to derived type. Keep persisted legacy fields unchanged by merging edits into existing records rather than writing replacement defaults. Preserve emoji library grouping and pricing/channel behavior.
- [x] **Step 4:** Run targeted tests; expect PASS. Run `rg -n 'materialCategories|menuCategories|addonCategories|saveCategory|deleteCategory|getCategoryTrackingMode' src` and inspect remaining occurrences: only inert compatibility code may remain; no visible business UI or new date/role decisions may depend on them.
- [x] **Step 5:** Commit only Task 4 source/tests with message `refactor: remove independent business category controls`.

### Task 5: Verify deductions, compatibility and the complete workflow

**Files:** Extend `tests/inventory/requirements.test.js`, `tests/inventory/materialEditing.test.js`, `tests/pos/checkout.test.js`, `tests/data/schemaV4.test.js`, `tests/gas/sync.test.js`; create `docs/superpowers/verification/2026-10-13-global-inventory-classification.md` at verification time. Do not change backend contracts or defaults.

**Interfaces:** Existing `batchProduce`, `getEffectiveRequirements`, checkout, export/import and GAS snapshot contracts remain the integration boundary. Consume Task 1 derived getters and Task 2 date behavior.

- [x] **Step 1:** Add assertions for a production-plus-sale sequence: producing consumes inputs and adds output; selling output leaves inputs unchanged; selling an input as a direct add-on consumes only its recipe quantity. Verify an input with two roles remains selectable. Verify export/import round trips retain old categories and lots and payload inventoryType stays `ingredient`/`packaging`; derived kinds/roles are never persisted as new schema fields.
- [x] **Step 2:** Run `npm test -- tests/inventory/requirements.test.js tests/inventory/materialEditing.test.js tests/pos/checkout.test.js tests/data/schemaV4.test.js tests/gas/sync.test.js`; expect PASS on correct preserved behavior. If a new assertion fails, diagnose against the spec before changing allocation logic.
- [x] **Step 3:** Run `npm test`, then `npm run lint`, then `npm run build`. Expect all tests passing, lint exit 0, and a successful Vite build. Update obsolete UI expectations to the approved behavior, without weakening stock or compatibility assertions.
- [x] **Step 4:** Verify the UI locally with an isolated temporary browser profile/storage: all three types, immediate badges, overlapping roles, add-on references, date errors, production, sale, and settings navigation. Do not open the user's persisted POS database for write operations or call a live GAS endpoint. Record actual commands/results and any limitations in the verification document.
- [x] **Step 5:** Inspect `git diff --name-only` against Global Constraints. Exclude pre-existing branding changes and unrelated installed-skill files from implementation commits. Commit only Task 5 tests/verification with message `test: verify inventory classification workflow compatibility`.

## Execution Boundary

The user confirmed native execution. Tasks 1–5 have been implemented and verified in codex/inventory-classification; independent review and integration are the final gates. No migration, production data writes, mockups, or backend deployment were performed.
