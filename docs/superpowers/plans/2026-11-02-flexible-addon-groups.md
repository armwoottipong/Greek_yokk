# Flexible Add-on Groups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let staff configure up to six reusable option groups per menu, preserve unavailable options as placeholders, and open platform analysis on demand across devices.

**Architecture:** Extend the existing group catalog and its local/cloud adapters. Make group availability group-scoped, generalize the current two-group sale proof, and keep inventory deduction in Add-on recipes. Reuse Yoggie catalog components for responsive management and analysis dialogs.

**Tech Stack:** Vue 3, Pinia, Vitest, Firebase Firestore Rules and emulator, Vite, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-11-02-flexible-addon-groups-design.md`

## Global Constraints

- Up to six groups per menu, subject to a measured combined selection and material-read budget. Never silently truncate a group or sale.
- Group-scoped unavailable options keep membership, price, and recipe. Existing snapshots remain immutable.
- Included groups are free; an extra-priced group can have zero-priced individual choices. Stock deduction depends on recipes, not price.
- Production Firebase login and `local.html` separation remain. Do not enable an unfinished backend or import live data.
- Reuse Yoggie typography, color, form, and overlay patterns; preserve the original StockView.
- Run appropriate tests, lint, build, and emulator proofs before release. Inspect remote changes, fast-forward/merge, commit, push, deploy Pages, then verify Actions and live assets.

## Review Focus

- A disabled group option in a stale cart must block checkout without losing the cart; Task 3 proves this.
- An included or zero-priced option with a recipe must still deduct stock; Task 3 proves this.
- One Add-on available in two groups may be disabled in only one; Task 1 proves this.
- A required group with too few available options must make the menu unsellable; Tasks 2 and 4 prove this.
- Existing one/two-group catalog and order snapshots must survive the new representation; Task 2 proves this.

## File structure

- `src/domain/addonGroups.js`: pure availability, price, and selection validation for local POS.
- `src/domain/database.js`: backward-compatible local group normalization and validation.
- `src/cloud/core/model/catalogGroup.js`, `catalogMenu.js`, `saleGroups.js`: canonical cloud group, menu binding, and sale planner.
- `src/cloud/core/catalogBindings.js`, `catalogPresentation.js`, `catalogPlan.js`: input/output adapters and catalog validation.
- `firestore.rules`: independent group, menu, sale, and availability validation.
- `src/components/catalog/AddonGroupManager.vue`, `src/views/AddonView.vue`: group-first management and item directory.
- `src/components/modals/MenuEditModal.vue`: responsive group picker and new-group return path.
- `src/components/catalog/{MenuRecipeDetails,AddonRecipeDetails}.vue`: analysis trigger and overlay reuse.
- `src/components/modals/CustomOrderModal.vue`, `src/cloud/core/CoreWorkspace.vue`: unavailable placeholders and unsellable state.

### Task 1: Group availability in local and cloud catalogs

**Files:** Modify `src/domain/addonGroups.js`, `src/domain/database.js`, `src/cloud/core/model/catalogGroup.js`, `src/cloud/core/catalogBindings.js`, `src/cloud/core/catalogPresentation.js`, `src/cloud/core/catalogPlan.js`; test `tests/pos/addonGroups.test.js`, `tests/cloud/catalogBindings.test.js`, `tests/firestore/catalogOriginalWorkflowProof.test.js`.

**Interfaces:** Each local `group.options[]` gains `isAvailable?: boolean` (omitted means true). Cloud groups gain `unavailableOptionIds?: string[]`, a unique subset of `optionIds`, default `[]`. `catalogGroups(data)` maps that set to local option flags. `resolveSelections(menu, selected, groups, addons)` rejects unavailable group options.

- [ ] Add failing local and cloud tests: one Add-on appears in two groups, disabled in one, keeps prices and recipe, and cannot be selected in the disabled group.
- [ ] Run `npx vitest run tests/pos/addonGroups.test.js tests/cloud/catalogBindings.test.js`; confirm the new assertions fail.
- [ ] Implement normalization, round-trip, save validation, and group-scoped availability; preserve omitted fields in existing snapshots.
- [ ] Run the same tests and the focused Firestore catalog proof; all pass.
- [ ] Commit Task 1 files.

### Task 2: Six-group menu binding and compatibility

**Files:** Modify `src/cloud/core/model/catalogMenu.js`, `src/cloud/core/catalogPlan.js`, `src/cloud/core/catalogPresentation.js`, `src/cloud/preflight.js`, `firestore.rules`; test `tests/cloud/summaryPreparedSource.test.js`, `tests/firestore/summaryPreparedProof.test.js`, `tests/firestore/deployRules.test.js`.

**Interfaces:** Menu `groupIds: string[]` is ordered, unique, and length `0..6`. Legacy `groupId` reads as a one-element list. `summaryPreparedMenu(shop, materials, input, options)` stores the canonical list and maintains each group's `menuIds` reference; it rejects inactive/missing groups and any unsatisfied combined budget.

- [ ] Add failing tests for zero, one, two, three, and six groups; reordered groups; duplicate/missing IDs; legacy import; and an over-budget binding with a precise error.
- [ ] Run focused Vitest and emulator tests; confirm failures are from the new cases.
- [ ] Generalize menu binding and reference updates; remove the two-group special case without changing old order evidence.
- [ ] Update Rules independently and run the emulator proof for accepted/rejected bindings.
- [ ] Commit Task 2 files.

### Task 3: Generalized sale proof and stock deduction

**Files:** Modify `src/cloud/core/model/saleGroups.js`, sale admission helpers it calls, `src/domain/addonGroups.js`, `src/stores/posStore.js`, `firestore.rules`; test `tests/pos/addonGroups.test.js`, `tests/firestore/summaryMultiGroupSale.js`, `tests/firestore/summaryPreparedSale.js`, `tests/firestore/summaryAddonProof.test.js` (use existing test entrypoints that import these fixtures).

**Interfaces:** `summaryMultiGroupSale(shop, materials, lines, options)` validates every assigned group, computes price by group-option-platform, and emits bounded `groups`/`groupSelections` evidence. Repeated group/Add-on pairs contribute their quantity; recipes are deducted independently of price. A disabled choice rejects sale before mutation and preserves the cart.

- [ ] Add failing tests for one through six groups, mixed free/paid options, repeated choices, stock deduction, unavailable stale selections, and a failed Rules write that changes no stock.
- [ ] Run focused local and emulator tests; confirm failures.
- [ ] Implement bounded generalized sale and Rules validation; determine the combined selection/material budget with worst-case Rules and document-size proof, then encode it in catalog validation and user-facing errors.
- [ ] Run focused tests plus `npm run test:firebase-proof`; all pass without increasing permitted reads beyond Spark limits.
- [ ] Commit Task 3 files.

### Task 4: Group-first management and menu picker

**Files:** Modify `src/views/AddonView.vue`, `src/components/catalog/AddonGroupManager.vue`, `src/components/modals/MenuEditModal.vue`; test `tests/ui/addonGroupsInteraction.test.js`, `tests/ui/addonWorkspace.test.js`, `tests/ui/menuEditorInteraction.test.js`.

**Interfaces:** Group card shows rule, ready count, and menu usage. Group editor distinguishes pause from removal. Menu editor opens a group picker: mobile drawer; desktop dialog/panel. Picker preserves group order and returns from new-group creation with the group selected.

- [ ] Add failing interaction tests for group-first navigation, unavailable placeholder and retained setup, picker order, six selections, create-and-return, and unsatisfiable required-group warning.
- [ ] Run focused Vitest tests; confirm failures.
- [ ] Implement the responsive interactions with existing Yoggie components, labels, keyboard focus, and unsaved-change handling.
- [ ] Run focused tests and inspect desktop, iPad, and mobile captures in one bounded round; correct defects and confirm once.
- [ ] Commit Task 4 files.

### Task 5: POS placeholders and analysis overlays

**Files:** Modify `src/components/modals/CustomOrderModal.vue`, `src/cloud/core/CoreWorkspace.vue`, `src/components/catalog/MenuRecipeDetails.vue`, `src/components/catalog/AddonRecipeDetails.vue`; add a shared analysis dialog component if both callers need it; test `tests/ui/addonGroupsInteraction.test.js`, `tests/ui/menuPlatformFinancials.test.js`, `tests/ui/menuAnalysisInfo.test.js`.

**Interfaces:** Unavailable options remain visible and disabled. A required group with insufficient ready options marks its menu “ยังขายไม่ได้” and disables add-to-cart. A labelled analysis icon opens the existing `MenuPlatformOverview`: dialog on desktop, drawer on phone; focus returns to the trigger on close.

- [ ] Add failing tests for placeholder labels, disabled choices, unsellable menu, dialog/drawer switching, and analysis content on both Menu and Add-on.
- [ ] Run focused tests; confirm failures.
- [ ] Implement shared display behavior without changing financial calculations or original POS/stock layouts.
- [ ] Run focused tests and a bounded responsive visual check; confirm keyboard and touch behavior.
- [ ] Commit Task 5 files.

### Task 6: Release proof and delivery

**Files:** Update spec/plan only if implementation evidence changes a documented constraint; add focused release evidence under `docs/superpowers/verification/`.

- [ ] Run `npm test`, `npm run lint`, `npm run build`, and `npm run test:firebase-proof`; fix failures.
- [ ] Run the Impeccable detector once on changed UI targets and verify its findings against rendered desktop/mobile views.
- [ ] Confirm unchanged local POS, protected Firebase roles, no offline queue, and no production Firebase enablement or live-data import.
- [ ] Fetch and inspect remote changes; integrate with normal fast-forward/merge, preserving unrelated files in `Logo_branding/`.
- [ ] Commit final evidence, push, verify GitHub Actions success, and verify live `version.json` and entry asset match the released commit.
