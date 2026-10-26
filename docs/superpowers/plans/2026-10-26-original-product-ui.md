# Original Product UI Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement inline.

**Goal:** Run the original product presentation against the live Firebase core.
**Architecture:** Reuse presentation components with an optional cloud model; retain CoreWorkspace command ownership and immutable journal. No local store instance in the cloud tree.
**Tech Stack:** Vue 3, existing CSS, Firebase.
**Spec:** docs/superpowers/specs/2026-10-26-original-product-ui-design.md (approved).

## Global Constraints
- No live data import, generation changes, billing changes or Rules changes.
- Google login, equal accounts, confirmed server writes, saved carts and four-line bound remain.
- Unsupported actions must not invoke local mutations.

## Review Focus
- Restored pending commands lock quantity/platform changes.
- Included/repeated topping prices match canonical preview.
- Dialog focus returns after adding a line and mobile cart remains usable.
- Stock projection converts hundredths once, including lots and alert thresholds.
- Cloud presentation never instantiates the local persistence store.

### Task 1: Bind original product presentation
Files: CoreWorkspace.vue; productPresentation.js; CloudProductShell.vue; original Sidebar, CartPanel, CartBody, CartPaymentFooter, StockMaterialCard.
Interfaces: projectMenus(data), projectMaterial(material), projectCart(lines,data); optional model prop uses original store only when absent.
- [x] Add integration tests for original catalogue/sidebar/cart and locked mutations; observe failures.
- [x] Add pure conversion tests for menu/stock/cart projection; observe failures.
- [x] Implement cloud projection and reuse original presentation; retain service execution.
- [x] Verify sale, offline and uncertain recovery tests plus original component regression suites.

### Task 2: Inventory and bills
Files: CoreWorkspace.vue, cloud product CSS; reused StockMaterialCard, StockLotList and DialogFrame.
- [x] Test receive/produce payloads and cancellation confirmation through the product interface.
- [x] Implement original stock rows, lot detail and receiving/production dialogs, bills and explicit unavailable-action copy.
- [x] Verify no local persistence is instantiated.

### Task 3: Release
- [x] Run full tests, lint and production build.
- [x] Inspect desktop/mobile and fix material issues in one batch.
Release procedure: review the diff, commit, inspect remote changes, push and verify Pages Actions plus live version and entry. The live result is recorded in the delivery report.
