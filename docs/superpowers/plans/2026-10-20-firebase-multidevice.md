# Firebase Spark Multi-device POS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Greek Yogg from browser-local storage and Sheets backup to a shared Firebase Spark database, preserving checkout and inventory behavior with safe concurrent writes and no offline sale confirmation.

**Architecture:** Vue/Pinia clients authenticate with Google, subscribe to shop-scoped Firestore data, and submit idempotent transactions whose business invariants are enforced by Security Rules. Keep local carts and drafts separate from committed stock; reconcile uncertain commands after reconnect. Prove that the full bounded sale can be secured within Rules limits before building the remaining integration; failure stops this architecture before production.

**Tech Stack:** Existing Vue 3, Pinia, Vite, Vitest; add Firebase Web SDK, Firebase Rules Unit Testing, Firebase CLI, and Firebase Admin SDK for a local migration tool only. Node 22 locally; Java 21+ for current Firestore Emulator; GitHub Pages remains the web host.

**Spec:** `docs/superpowers/specs/2026-10-20-firebase-multidevice-design.md`

## Global Constraints

- หลายเครื่องใช้ยอดขายและสต็อกชุดเดียวกัน
- อินเทอร์เน็ตหลุดให้หยุดยืนยันการขายชั่วคราว
- ใช้แพ็กเกจฟรี ไม่เปิด Blaze หรือผูก billing เพื่อการย้ายครั้งนี้
- Security Rules เป็นผู้บังคับสิทธิ์และข้อกำหนดข้อมูลบน Firebase ไม่อาศัย validation หน้าเว็บอย่างเดียว
- หากตรวจครบไม่ได้ ให้หยุดก่อน production และเสนอปรับโมเดลหรือขอบเขตที่ตรวจได้ ห้ามลดเหลือเพียงตรวจว่าล็อกอินแล้ว
- ทุกธุรกรรมที่ต้องสำเร็จพร้อมกันต้องไม่แยกเป็นหลาย commit เพื่อหลบข้อจำกัด
- Do not deploy, import live data, assign a real owner, change billing, or send test writes to `yoggie-db` as part of automated verification.
- Tests use synthetic data and project ID `demo-greek-yogg`; never use production credentials. Existing JSON exports and `GY_DATABASE_V3` recovery keys remain intact.
- Native execution is recommended for the sequential schema/domain/store work; execution method remains for user selection after plan review.

## Review Focus

1. Shared-browser account or shop switch during an in-flight sale: clear the screen, retain the original scoped pending command, never show its result to the next account (Tasks 3, 4, 6).
2. Catalog, recipe, GP, or shortage changes while a basket is open: require a new exact preview approval; transaction retries never silently accept changed business terms (Tasks 1, 5, 6).
3. Historically valid fractional costs or imported legacy IDs: report precision/path problems before any write, preserve original amounts and records, never silently round or discard them (Tasks 2, 10).
4. Partial history loads, import interruption, and reads spanning concurrent writes: report incomplete data and restart consistent export; never present partial totals as whole-shop totals (Tasks 9, 10).
5. Permission revocation, quota exhaustion, multiple browser tabs, and response loss: retain the basket, do not queue an offline sale or duplicate an uncertain sale (Tasks 1, 4, 6, 11).

## Repository findings and prerequisites

- Active entry is `src/main.js`, shell `src/App.vue`, main state/actions `src/stores/posStore.js` (about 3,300 lines). Root legacy JS files are inactive.
- `commitDatabase()` is synchronous and writes a whole snapshot to localStorage; action wrappers also assume synchronous completion. Do not replace its body with a Promise and leave callers unchanged.
- `src/views/PosView.vue:handleCheckout()` currently does not await checkout. StockView, settings, editor modals and history actions similarly need an explicit async audit.
- Existing `checkout()` accepts confirmed ingredient/package shortages; current local tests intentionally preserve basket price snapshots. Cloud mode changes this to explicit re-approval of current prices/recipes; keep local compatibility tests separate.
- Reuse domain modules `inventory.js`, `packagePlan.js`, `addonGroups.js`, `pricing.js`, `businessDate.js`, `database.js`. Do not reimplement production expansion or package adjustments independently.
- Schema version is 4, although the storage key and some documentation still say V3.
- Existing `vitest.config.js` discovers every `tests/**/*.test.js`; Emulator suites must be excluded from ordinary `npm test` and run explicitly in a separate Node test configuration.
- Node is v22.17.1. Only Java 8 was found on PATH, and no global Firebase CLI was found. Select a compatible local CLI and provision Java 21+ for testing without changing system-wide defaults. Verify package engines and official release requirements during execution; record exact installed versions in the lockfile.
- User supplied project `yoggie-db`, app ID `1:411310411447:web:0487b3031b8000188c8732`, and web config. User reports console setup complete; live service availability, region, plan and owner UID are still unverified.

## Shared interfaces and file responsibilities

New modules use ESM. `Result<T>` is `{ok:true,value:T}` or `{ok:false,code,message,details?}`; no truthiness-based success checks. Committed commands return `Promise<Result<CommandReceipt>>`.

- `src/cloud/protocol.js`: cloud schema version, allowed command names, integer scale constants, path validation and proven finite shape limits. Limit values are an output of Task 1, not an assumed unlimited capability.
- `src/cloud/codec.js`: `encodeSnapshot(snapshot)` / `decodeSnapshot(records)` / exact scaled-number conversion. Historical imported records remain distinguishable from newly verified cloud sales.
- `src/cloud/firebaseClient.js`: SDK initialization from public web config; explicit emulator wiring and memory-only cache; no Analytics SDK.
- `src/cloud/session.js`: `createShopSession({auth,db,shopId,onState}) -> {start,signIn,signOut,dispose}`; owns membership and listener lifetimes.
- `src/cloud/commandJournal.js`: durable pending commands scoped by project/shop/UID/device; transactional IndexedDB ownership for multi-tab recovery, no offline mutation queue.
- `src/cloud/commandRepository.js`: `executeCommand(context,envelope)` / `getCommandResult(context,opId)`; transaction transport, retry safety and error mapping.
- `src/cloud/checkout.js`: `previewCheckout(snapshot,basket,options)` / `submitCheckout(context,request)`; uses latest transaction reads and exact approval state.
- `src/cloud/inventoryCommands.js`, `catalogCommands.js`, `undoOrder.js`: pure operation planners plus the shared transaction transport.
- `src/cloud/readModel.js`: `subscribeCatalog(context,onPatch,onError)` and date-range paged queries; assemble domain objects without using partial arrays as complete history.
- `src/cloud/backup.js`: consistent JSON export orchestration; no client-side database replacement.
- `src/stores/cloudStore.js`: session/read/write state, roles, readiness and pending-result recovery; no second implementation of business calculations.
- `firestore.rules`, `firestore.indexes.json`, `firebase.json`: security, query indexes and local Emulator configuration. No Functions or Hosting deployment targets.
- `scripts/firebase-migration.mjs`: local privileged dry-run/import/verify/export/restore commands with explicit project and shop arguments.
- `tests/cloud/`, `tests/firestore/`, `tests/migration/`: unit, actual Rules/transaction Emulator, and migration tests respectively.

Command envelope: `{schemaVersion,kind,shopId,uid,deviceId,opId,payload,expectedVersions,approval}`. A receipt contains `{opId,kind,status:'committed',resultIds,committedAt}`. IDs are UUID-based and path-safe. The canonical payload is immutable once submitted. A digest detects local changes; a client-provided digest is never treated as proof of correct pricing or authorization by Rules.

Shop lifecycle is `importing | active | maintenance`; data is namespaced by generation under a shop to stage import/restore without destroying the active generation. Every transaction reads and Rules validate the lifecycle and generation pointer. Changing to maintenance conflicts with already-running transactions; generation selection never accepts a client-chosen inactive generation.

## Task 1: Prove the Spark security model and its real limits

**Files:** Create `firebase.json`, `firestore.rules`, `firestore.indexes.json`, `vitest.firestore.config.js`, `tests/firestore/helpers.js`, `tests/firestore/securityProof.test.js`, `tests/firestore/proofFixture.js`, `src/cloud/protocol.js`, `docs/firebase/security-proof.md`. Modify `package.json`, `package-lock.json`, `vitest.config.js`, `.gitignore`.

**Interfaces:** Produces the supported document shapes, fixed integer representation and measured `CLOUD_LIMITS` used by every subsequent task. Helpers expose `withRulesTest({projectId,rules},fn)` and refuse project IDs not starting with `demo-`. No Firebase Web SDK connects to production during this task.

- [ ] Write table-driven failing Rules tests: an authorized valid sale succeeds; outsider, cross-shop access, self-promotion, forged owner role, wrong author, altered unit price/GP/recipe, omitted ingredient/package deductions, duplicate references, wrong lot, extra field, negative stock, replaced operation payload, modified receipt and writes during maintenance all fail.
- [ ] Include a realistic synthetic basket with two menus, repeated add-ons with group-specific prices, a produced ingredient, packaging adjustment, one split across lots, GP, confirmed shortages and an immutable historical sale. Explicitly exercise each omitted write and each altered component of the valid transaction.
- [ ] Run the new tests under the actual Emulator and confirm failures arise from missing/denying rules, not from a broken test harness. Install compatible local dev dependencies and Java runtime as prerequisites; use `npx firebase emulators:exec --project demo-greek-yogg --only auth,firestore "npx vitest run --config vitest.firestore.config.js tests/firestore/securityProof.test.js"`.
- [ ] Implement bounded Rules validation with `getAfter()` relationships. Use explicit finite slot validation where Rules cannot iterate; never accept arbitrary arrays/maps simply because the caller is a member. Keep catalog/prices immutable to cashiers; validate selected group options and quantities against owner-authored current definitions.
- [ ] Measure accepted and rejected boundary baskets: distinct menu lines, options, recipe components, lots, movements, document size, request size, expressions and access calls. Account for membership and shop-generation reads, cost/profit fields, exact lot availability/expiry policy, shortage approval and the undo/production transaction shapes. Exercise every slot at its upper boundary, not only a one-line example.
- [ ] Write exact passing limits, document schema, scales, read/write budget and any demonstrated inability into `docs/firebase/security-proof.md`; export matching constants from `protocol.js`. Rerun the full proof. **Stop here if the complete supported flow cannot be enforced or would require changing approved behavior. Present evidence and request a design adjustment; do not open Rules or proceed to migration.**
- [ ] Commit only this testable proof and harness after it passes. Do not describe it as the completed migration.

## Task 2: Add the cloud codec without losing legacy precision

**Files:** Create `src/cloud/codec.js`, `src/cloud/paths.js`, `tests/cloud/codec.test.js`, `tests/cloud/paths.test.js`. Reuse `src/domain/database.js` and Task 1 protocol; do not change local schema behavior yet.

**Interfaces:** `encodeSnapshot(snapshot) -> Result<{records,manifest,diagnostics}>`; `decodeSnapshot(records) -> Result<Schema4Snapshot>`; `toScaledExact(value,scale,path) -> Result<number>`; `cloudPath(shopId,generation,collection,id) -> string`. Codecs preserve original legacy IDs as data while using reversible safe document IDs.

- [ ] Write failing tests that round-trip schema-3/4 synthetic imports with lots, historical order snapshots, group pricing, package plans, shortages and undo metadata. Assert unsupported precision reports the exact path and performs no rounding; finite values and all intermediate products must stay within JS safe integers.
- [ ] Include reserved/slash/Unicode IDs, duplicate IDs, broken references, missing-price versus explicit zero-price, negative profit, invalid dates and invalid lot totals. Test historical timestamp preservation and new server timestamp decoding separately.
- [ ] Run `npx vitest run tests/cloud/codec.test.js tests/cloud/paths.test.js`; observe the expected missing-module failures.
- [ ] Implement the codecs and path adapter against the proven Task 1 model. Derived totals are recomputed for verification; originals are preserved in the import record. Precision or unsupported shape issues block import and return a conversion report for user review.
- [ ] Run those tests and `npx vitest run tests/data`; require PASS, then commit this deliverable.

## Task 3: Initialize Firebase and gate all shop data on membership

**Files:** Create `src/cloud/firebaseClient.js`, `src/cloud/session.js`, `src/stores/cloudStore.js`, `src/components/auth/SignInGate.vue`, `tests/cloud/session.test.js`, `tests/ui/firebaseAuthGate.test.js`. Modify `src/main.js`, `src/App.vue` and `.env.example`.

**Interfaces:** `getFirebaseClient({config,useEmulators,projectId}) -> {app,auth,db}`; `createShopSession(...)` as defined above. Session states: `signed_out | signing_in | awaiting_access | importing | loading | ready | read_only | error`. `canWrite` requires current identity, active membership, active generation, completed initial server reads and no unresolved command for that device.

- [ ] Write failing tests: registered Google user without membership cannot see shop data; membership role changes revoke controls; sign-out clears data and subscriptions; old in-flight callbacks are ignored after identity change; emulator mode refuses a live project ID; missing config never falls back to local production writes.
- [ ] Run `npx vitest run tests/cloud/session.test.js tests/ui/firebaseAuthGate.test.js` and confirm missing implementation failures.
- [ ] Initialize `yoggie-db` using the public web config supplied by the user, excluding Analytics. Use explicit emulator configuration only in development/test, memory-only Firestore cache and explicit Auth persistence. Implement popup failure/cancel messaging without automatically switching redirect mechanisms on an unrelated host.
- [ ] Render Thai sign-in/no-access/loading states before mounting shop views or teleported sensitive modals. Scope carts/drafts by identity and shop; expose local legacy JSON export only through an explicit migration/recovery path, never as a silent fallback sales mode.
- [ ] Pass the tests, then run `npx vitest run tests/ui/appStartup.test.js tests/store/startup.test.js`; preserve startup behavior and commit.

## Task 4: Build durable command recovery and an idempotent transaction transport

**Files:** Create `src/cloud/commandJournal.js`, `src/cloud/commandRepository.js`, `src/cloud/errors.js`, `tests/cloud/commandJournal.test.js`, `tests/cloud/commandRepository.test.js`, `tests/firestore/commands.test.js`.

**Interfaces:** `journal.prepare(scope,envelope)`, `journal.resolve(scope,opId,receipt)`, `journal.listUnresolved(scope)` return Promises; `executeCommand(context,envelope)` returns `Result<CommandReceipt>` or errors including `OFFLINE`, `NEEDS_REVIEW`, `PENDING_RESULT`, `PERMISSION_DENIED`, `QUOTA_EXCEEDED`, `UNSUPPORTED_SHAPE`, `LOCAL_JOURNAL_FAILED`. Only the shared transport calls Firestore transactions for business operations.

- [ ] Write failing tests for double submission, same op with different payload, account switch, two tabs claiming the same pending operation, journal failure before network submission, and response loss after a successful commit. Assert a successful command creates exactly one immutable receipt and a replay returns that receipt.
- [ ] Run `npx vitest run tests/cloud/commandJournal.test.js tests/cloud/commandRepository.test.js`; run `tests/firestore/commands.test.js` through the Task 1 Emulator command.
- [ ] Implement transactional IndexedDB claims and a single unresolved sale per device scope; persist before sending. Do not use a timer as evidence that an operation failed. Reconcile via server reads; `not found` is a point-in-time result, so any retry keeps the same immutable operation ID.
- [ ] Make transaction callback side-effect-free: all reads before writes, no Pinia mutations/toasts/new IDs inside retries. Persist receipts and business writes atomically; invalid shape or approval changes cause zero writes. Recheck shop generation and membership on every transaction.
- [ ] Pass unit and real transaction tests and commit. Cached reads, navigator.onLine and optimistic listeners must never prove success.

## Task 5: Extract pure checkout planning and exact approval behavior

**Files:** Create `src/cloud/checkout.js`, `tests/cloud/checkoutPlan.test.js`; modify `src/stores/posStore.js` only to reuse extracted pure helpers where behavior is identical. Reuse existing domain functions rather than a second allocation algorithm.

**Interfaces:** `previewCheckout(snapshot,basket,options) -> Result<{preview,approval,readSet}>`; `planCheckout(snapshot,request) -> Result<{writes,receiptData}>`. Approval covers relevant current prices, menu/add-on/group/GP/recipe revisions, package adjustments and each confirmed shortage amount; it excludes unrelated records and changing network metadata.

- [ ] Write failing tests using existing checkout fixtures: production inputs consumed once, add-on multiplicity, all packaging reasons, disabled packaging, lot selection/FIFO/expiry, current prices and GP, and independent ingredient/package shortage consent.
- [ ] Assert changed price/recipe/GP or shortage returns `NEEDS_REVIEW` with no writes, while a harmless unrelated update does not. Reuse a fixed logical operation time across retry calculations; server time determines committed timestamps.
- [ ] Run `npx vitest run tests/cloud/checkoutPlan.test.js` and observe failure, then implement pure planners against Task 1/2 representations. Match the Rules arithmetic exactly and reject overflow before network writes.
- [ ] Run the planner test plus `npx vitest run tests/pos tests/inventory/requirements.test.js tests/inventory/packagePlan.test.js`; local snapshot-price compatibility remains tested independently from cloud re-approval. Commit.

## Task 6: Wire cloud checkout to the POS and prove concurrent sales

**Files:** Modify `src/stores/posStore.js`, `src/stores/cloudStore.js`, `src/views/PosView.vue`, `src/components/pos/CartPanel.vue`, `src/components/pos/CartPaymentFooter.vue`, `src/components/modals/LowStockWarningModal.vue`, `src/components/modals/PackageReviewModal.vue`, `src/components/modals/ReceiptModal.vue`; create `tests/firestore/checkoutConcurrency.test.js`, `tests/ui/cloudCheckout.test.js`.

**Interfaces:** Cloud `store.checkout(options) -> Promise<Result<CommandReceipt>>`, with the committed order available only after receipt confirmation. `submitCheckout(context,request)` uses Tasks 4/5; cloud checkout never calls local `commitDatabase()` or `syncWithGas()`.

- [ ] Write failing tests: two independent authenticated clients compete for the final stock; one succeeds and the other must re-review the new shortage. Replaying either op does not duplicate a bill. A forged client transaction still fails Rules even if UI checks are bypassed.
- [ ] UI tests assert a basket remains on offline/quota/permission failure, receipt stays closed until success, reload restores a pending-result state, basket editing is locked while that submitted payload is unresolved, and reconnect resolves the original order without a second sale. Test permission revocation during submission and identity change before the response.
- [ ] Run both suites (Emulator for the concurrency suite); implement awaited actions and an audit of every checkout callback. Update pending flags to follow the durable operation state, not whether a modal happens to be open.
- [ ] Add Thai network/pending/error status with aria-live; disable sale confirmation when unavailable and show how to retry/review. Do not expose technical payload or Firebase errors to cashiers.
- [ ] Pass the suites plus `npx vitest run tests/ui/checkoutInteraction.test.js tests/ui/paymentChoices.test.js tests/ui/packageReview.test.js tests/ui/receiptMotion.test.js`; commit.

## Task 7: Move all inventory writes and drafts into cloud commands

**Files:** Create `src/cloud/inventoryCommands.js`, `tests/cloud/inventoryCommands.test.js`, `tests/firestore/inventoryConcurrency.test.js`; modify `src/stores/posStore.js`, `src/views/StockView.vue`, `src/views/PosView.vue`, `src/components/modals/StockInModal.vue`, `StockAdjustModal.vue`, `StocktakeModal.vue`, `WasteModal.vue`, `LotDepletionModal.vue`, and `src/components/inventory/StockDraftReview.vue`.

**Interfaces:** `planInventoryCommand(snapshot,envelope) -> Result<{writes,receiptData}>`; kinds `stock_in`, `stock_adjust`, `stocktake`, `produce`, `switch_lot`, `waste`, `commit_stock_draft`. All committed actions return awaited Results; draft-only operations remain local and never publish to catalog listeners as committed stock.

- [ ] Write failing tests for each kind plus concurrent sale vs count/production/waste, duplicate command, stale draft revision, changed production recipe, expired lots and an owner-role check enforced by Rules. Assert input deductions and output addition are one transaction; no partial production result.
- [ ] Run the new unit and Emulator suites, then implement command planning and wrappers with expected material/lot revisions. A conflict retains the user's draft and identifies affected items; it does not overwrite latest stock or silently reapply a physical count as a delta.
- [ ] Audit `switchActiveLotSilently`, direct `materials` mutations, `persistLocal`, and every `committedActions` wrapper, not only named cloud entrypoints. Remove local-success toasts and premature modal closing from all async callers.
- [ ] Run `npx vitest run tests/inventory tests/ui/stockFormInteraction.test.js tests/ui/stocktakeDraftInteraction.test.js` and the new suites; commit after all pass.

## Task 8: Move catalog/settings edits and order cancellation into secured transactions

**Files:** Create `src/cloud/catalogCommands.js`, `src/cloud/undoOrder.js`, `tests/firestore/catalogPermissions.test.js`, `tests/firestore/undoConcurrency.test.js`, `tests/ui/cloudEditors.test.js`; modify `src/stores/posStore.js`, `src/views/SettingsView.vue`, `src/components/modals/MenuEditModal.vue`, `AddonEditModal.vue`, `MaterialEditModal.vue`, `ActivityLogModal.vue` and add-on group editor callers found by the async audit.

**Interfaces:** `planCatalogCommand(snapshot,envelope) -> Result<{writes,receiptData}>`; `submitUndoOrder(context,{orderId,opId,expectedVersion}) -> Promise<Result<CommandReceipt>>`. Catalog kinds cover menu, add-on, group, material metadata, category, platform GP and activation/deletion; member management is owner-only and cannot remove the last active owner.

- [ ] Write failing tests: cashier cannot change prices or roles; stale revisions do not overwrite another device; forbidden recipe/reference deletion fails; explicit zero price differs from unset; saving GP respects the existing `<100%` domain constraint.
- [ ] Write failing cancellation tests for two owners cancelling the same bill, cancellation racing a sale, exact restoration of original allocations/costs and shortages, and references to hidden or missing historical lots. Imported orders without sufficient allocation history must return a specific no-write recovery error rather than inventing stock restoration.
- [ ] Run the three suites with real Rules where applicable. Implement awaited editor saves and exact immutable order history plus a separate cancellation record. Status projection, stock returns and receipt are committed together.
- [ ] Replace cloud-mode clear-all, demo reset, direct log clearing, local import and permanent destructive operations with the explicit maintenance/admin workflow; Rules also deny bypasses. Preserve a separate local test/demo harness, never a production fallback.
- [ ] Pass those tests plus existing pricing, add-on and undo suites; commit.

## Task 9: Subscribe to shared data and make paged reports complete and explicit

**Files:** Create `src/cloud/readModel.js`, `tests/cloud/readModel.test.js`, `tests/firestore/reportQueries.test.js`, `tests/ui/cloudReports.test.js`; modify `src/stores/cloudStore.js`, `src/stores/posStore.js`, `src/domain/dashboard.js`, `src/views/DashboardView.vue`, `src/components/modals/ActivityLogModal.vue`, `src/components/layout/HeaderBar.vue`, `Sidebar.vue`, and `firestore.indexes.json`.

**Interfaces:** `loadOrderPage(context,{from,to,cursor,pageSize:50}) -> Result<{rows,nextCursor,complete}>`; `loadActivityPage(...)` with the same paging contract; `subscribeCatalog(...) -> unsubscribe`. Dates use Asia/Bangkok boundaries and a deterministic server-time-plus-document-ID cursor. The store distinguishes current stock, local draft, and date-scoped report data.

- [ ] Write failing tests for listener updates to another device, cleanup/reconnect, stale session callbacks, server versus cache metadata, page boundaries with identical timestamps, midnight Bangkok and cancellation reflected in reports.
- [ ] Test reports across more than one page and a range with no orders; totals must be computed over the complete selected range, never over just the visible page or the initial loaded slice. A quota/error mid-load shows incomplete/error instead of a plausible partial grand total.
- [ ] Run the new suites. Implement bounded active-data listeners and range-based loading; avoid a global growing `orders` listener. For complete summaries, stream the selected range in bounded pages and publish final totals only after completion. Keep cancelled revenue and inventory history semantics consistent with existing reports.
- [ ] Replace Sheets/live-local badges and backup buttons with accurate session/database status. Use the real persisted result timestamp; don't label a cache refresh as a saved sale.
- [ ] Pass `npx vitest run tests/reports tests/ui/cloudReports.test.js tests/cloud/readModel.test.js` and the Emulator query suite, then commit.

## Task 10: Deliver resumable migration, consistent backup and safe restore

**Files:** Create `scripts/firebase-migration.mjs`, `scripts/firebase/migrationPlan.mjs`, `src/cloud/backup.js`, `tests/migration/migrationPlan.test.js`, `tests/firestore/migration.test.js`, `tests/ui/cloudBackup.test.js`, `docs/firebase/migration.md`; modify `src/views/SettingsView.vue` and cloud-mode reset/import/export entrypoints in `src/components/layout/HeaderBar.vue`.

**Interfaces:** CLI `dry-run --input --project --shop --owner-uid`, `import --input --project --shop --owner-uid --manifest`, `verify --project --shop --generation`, `activate --project --shop --generation`, `export --project --shop --output`, `restore --input --project --shop --manifest`. Every write mode requires the explicit target; dry-run is local-only. `exportShopBackup(context) -> Result<{snapshot,manifest}>` reports completeness and consistency.

- [ ] Write failing tests for dry-run without network/credentials; invalid source precision, duplicate IDs and broken links; interrupted import and retry; mismatched input digest; changed target project; activation before verification; and a failed stage that leaves existing active data untouched.
- [ ] Verify round-trip counts, historical order timestamps/IDs/costs/profit, category references, group options, materials/lots, package plans, shortages and cancelled orders. Imported sales are read-only history with import provenance, never forged new cloud transactions.
- [ ] Run local migration tests, then implement deterministic manifests, checksums and generation-scoped staging with a durable checkpoint after each acknowledged batch. No credentials, real exports or migration reports containing shop data go into git.
- [ ] Implement authentication for the privileged local tool with Admin SDK Application Default Credentials; Firebase CLI login alone does not automatically provide ADC. Document supported `gcloud auth application-default login` setup separately from Firebase CLI Rules deployment; never ask for passwords or embed service-account keys in the web build.
- [ ] For a consistent export while sales may occur, read a shop mutation revision before and after the paged export; accept only an unchanged revision, otherwise retry a bounded number of times and require maintenance for a consistent copy. Every command must advance that revision; Task 1 tests this coupling. A client export cannot call itself complete if a collection read failed.
- [ ] Restore and activation take maintenance status first, drain/reconcile pending commands, verify source/target manifests, then switch the active generation atomically. Retain the previous generation; no recursive live deletion. A rollback after new sales requires a fresh export and reconciliation rather than blindly selecting old stock.
- [ ] Run unit, Emulator migration, and backup UI suites. Confirm no automatic production calls and commit.

## Task 11: Add release checks and demonstrate two real browser sessions

**Files:** Create `vitest.cloud.config.js`, `tests/cloud/noLocalFallback.test.js`, `tests/e2e/firebaseMultiDevice.spec.js`, `playwright.firebase.config.js`, `.github/workflows/firebase-tests.yml`, `docs/firebase/verification.md`; modify `package.json`, `.github/workflows/deploy.yml`, `vitest.config.js`, `eslint.config.js`, `.gitignore`.

**Interfaces:** `npm run test:firestore` starts Auth/Firestore Emulators under `demo-greek-yogg` and runs the Node-only integration config; `npm run test:cloud` runs cloud unit/UI suites; `npm run test:e2e:firebase` launches the Vite test app and two independent authenticated Playwright contexts against those Emulators. Normal `npm test` remains network-free.

- [ ] Write failing release checks: cloud-mode committed actions cannot call local `saveDatabase` or GAS; production builds contain no emulator-only admin helpers or migration credentials; no production-write fallback on config/network/auth errors.
- [ ] Exercise the full sequence in two independent browsers: approved account access, same shared catalog/stock, competing final stock, shortage re-review, one bill after double-click, response-loss recovery after reload, offline blocked sale, concurrent draft conflict, owner-only cancellation, role revocation and logout. Use Auth Emulator mock Google credentials only in tests; production has no test sign-in shortcut.
- [ ] Add isolated fake Firestore errors for resource-exhausted and permission-denied rather than exhausting the live quota. Verify basket retention and no success toast/receipt.
- [ ] Configure CI with a compatible pinned Java 21 distribution and compatible Node/dependency engines. Add Emulator/integration checks as required dependencies of the Pages release; do not add automatic Rules or production-data deployment. Keep existing published-commit verification.
- [ ] Run `npm test`, `npm run test:cloud`, `npm run test:firestore`, `npm run test:e2e:firebase`, `npm run lint`, `npm run build`; record exact commands, counts, failures and fixes, and reproducible demo screenshots in verification notes. Resolve failures before commit or claiming completion.

## Task 12: Finish the operator handoff and perform the final release review

**Files:** Create `docs/firebase/setup.md`, `docs/firebase/operations.md`; modify `README.md`, `PRODUCT.md`, `docs/firebase/migration.md`, `docs/firebase/verification.md`. Do not edit domain glossary/ADRs unless separately using the domain-modeling skill.

**Interfaces:** A complete handoff describes deployment order, first-owner bootstrap, missing inputs, recovery commands, actual tested limits and evidence. The production app only accepts an active, verified generation with the matching cloud schema version.

- [ ] Document the configured project, how to verify Spark/Standard/default database/actual region, authorized domains including local development, Google sign-in support email, and the correct separation between login and membership. Record service setup as user-reported until tested.
- [ ] Document owner UID collection from Authentication and one-time Console bootstrap, then owner-managed membership. Do not invent an owner email or use an email string as the authorization boundary.
- [ ] Include tested basket/lot limits, Rules proof evidence, export cadence, quota behavior and daily reset timezone. Estimate reads/writes using measured transactions and user-supplied device/bill counts; state that synthetic load testing is not evidence that the actual store fits the free quota.
- [ ] Give a cutover checklist: original JSON saved and verified; real source device selected; all old devices stop writing; owner/project permissions verified; Rules and indexes deployed and propagated; final staged import verified; controlled two-device smoke test; production version checked; recovery copy retained. No automatic upgrade or billing linkage.
- [ ] Review the entire change against the approved spec and negative security tests, following the requesting-code-review and verification-before-completion skills. Resolve actionable findings; report any untested external steps explicitly. Use the chosen execution method for the review workflow.
- [ ] Commit reviewed docs and implementation. Report actual validation and remaining production inputs. Any production deployment/import approval is requested only with the tested build, exact commands, target, manifest and recovery steps already prepared for review.

## Dependency order and completion criteria

Tasks 1 → 2 → 3 → 4 → 5 → 6 establish a secured sale. Tasks 7 → 8 → 9 complete inventory, editing and reporting against the same interfaces. Task 10 prepares safe data movement; Tasks 11 → 12 verify and hand off the full system. Keep incomplete integration unavailable on the live app; do not deploy a feature that leaves a direct local write route active.

No later task bypasses Task 1. If it fails, the deliverable is an evidence-backed limitation and proposed revised design, not a falsely completed migration.

Implementation is complete only when all supported store mutations are secured cloud commands, all automated acceptance checks pass, all relevant async callers are audited, recovery and consistent export are proven, and operator instructions include actual limits. Production migration is a separate final cutover requiring the real source backup, owner UID and authorized project access; it must not be claimed complete from local tests.

## Plan self-review

- Spec coverage: authentication/roles (1,3,8), finite security model (1,2), idempotent sale/network recovery (4–6), inventory and drafts (7), catalog and undo (8), shared reads/reports (9), migration/export/restore (10), quotas and deployment readiness (11–12).
- All transport signatures use the same envelope/Result contract. Cloud committed actions are explicitly awaited; local-only drafts and local compatibility tests are separate.
- Slot counts and integer scales are deliberately conditional on the measured security proof; no claim of arbitrary-size Rules validation. Task 1 fixes those values and document paths before downstream implementation, then this plan is updated to the proven contract without weakening scope.
- Each task includes failing tests, explicit commands, implementation boundaries, pass criteria and a scoped commit. UI-only polish does not require a separate framework or speculative redesign.
- All five Review Focus risks have explicit test ownership. Real owner UID, real source backup, usage volumes, actual project region and external deployment permissions are production inputs, not reasons to block local implementation.

## Execution handoff

The user has approved the written spec and requested completeness and detail. This plan still requires the user's review and selection of native execution or subagent-driven execution under the writing-plans workflow before implementation starts. Recommend native execution: the tasks depend heavily on one measured schema and one evolving async store interface. No product code, SDK installation, Firebase Rules deployment or data migration has been performed while writing this plan.

Official references checked while planning:
- https://firebase.google.com/docs/firestore/security/rules-conditions
- https://firebase.google.com/docs/firestore/manage-data/transactions
- https://firebase.google.com/docs/firestore/quotas
- https://firebase.google.com/docs/emulator-suite/install_and_configure
- https://github.com/firebase/firebase-tools/blob/main/src/emulator/commandUtils.ts
