# Catalog square images implementation plan

> **For agentic workers:** Use superpowers:executing-plans inline. Track steps below.

**Goal:** Attach and crop menu/material pictures to 1:1 while retaining the existing layout.
**Architecture:** Shared browser cropper, shared image display/editor, separate generation-scoped Firestore image documents. Save business data first; retain the editor with its assigned ID if image confirmation fails so retries cannot duplicate a new entity.
**Tech Stack:** Vue 3, Canvas 2D, existing Firebase SDK, Vitest, Firestore emulator. No new dependencies or billing.
**Spec:** docs/superpowers/specs/2026-10-31-catalog-images-design.md (approved 2026-10-31).

## Global constraints

- Existing layout and business transactions remain intact; only image areas become square.
- JPEG 512×512, at most 150 KiB before base64. Firestore images are excluded from indexing.
- Manager/Admin writes, explicitly allowed Google accounts, active generation; Viewer cannot read catalog images.
- Server-only transaction writes; offline work stays in the form without an upload queue.
- Backup includes image documents; restore remains a prepared, explicit migration as before.

## Review focus

- Extreme landscape/portrait crops cannot reveal empty borders.
- Cancellation/reopening never applies a stale file decode.
- Image save failures retain the draft and assigned entity ID.
- Concurrent edits reject a stale image revision.
- Sign-out or generation change cannot publish a stale read/write result.

## Task 1: Browser image module

Files: src/domain/catalogImage.js, src/components/images/{EntityImage,ImageCropDialog,CatalogImageEditor}.vue, tests/unit/catalogImage.test.js, tests/ui/catalogImageEditor.test.js.
Interfaces: cropRect(width,height,zoom,x,y); cropImage(image,position) -> Promise<dataURL>; validateImage(dataURL); editor.save(entityId) -> Promise<void>.
- [x] Write crop bounds and JPEG validation tests, run red, implement and run green.
- [x] Write editor cancellation/error tests, run red, implement accessible crop controls and draft editor.

## Task 2: Cloud storage and backup

Files: src/cloud/core/catalogImages.js, workspace.js, CoreWorkspace.vue, backupReader.js, firestore.rules, firestore.indexes.json; tests/cloud/catalogImages.test.js, tests/firestore/catalogImages.test.js.
Interfaces: createCatalogImages({db,getContext}) exposes watch(kind,id,onValue,onError), save(kind,id,dataURL,revision), close(). Injection shares image state across catalog/stock/POS without including pictures in transaction payloads.
- [x] Write server/context/conflict and authorization tests, run red, implement and run green.
- [x] Include pictures in business backup and document recovery limits; run backup tests.

## Task 3: Original UI bindings

Files: original MenuEditModal.vue, MaterialEditModal.vue, PosMenuCard.vue, CatalogManagementRow.vue, StockMaterialCard.vue, relevant existing detail panels.
- [x] Integrate editor in existing forms, retain draft after failed confirmation, use saved entity IDs for retry.
- [x] Replace emoji presentation with shared image + emoji fallback; change only image aspect ratio.
- [x] Verify original form behavior and image integration tests.

## Task 4: Release

- [x] Run full tests, lint, production build, Rules proof, detector and desktop/tablet/mobile visual inspection.
- [x] Review entire change; fix material findings with regression tests.
- [ ] Commit package, inspect remote, fast-forward main, push and verify Pages Actions plus live version/entry.
- [ ] Deploy additive tested Rules/index change only with existing project credentials; otherwise report the exact blocker and do not claim cloud image saving works live.

## Execution ledger

- Ruling: Work inline on codex/catalog-square-images in the existing checkout; authorization already covers implementation and routine release. No worktree or additional approval round.
- Baseline: started npm test before implementation; result recorded below.

- Baseline result: 191 files, 1501 passed / 1 skipped before implementation.
- Task 1: crop geometry, JPEG caps and draft editor tests observed red (missing modules) then green.
- Task 2: image transaction/context/conflict tests green; production Rules image authorization 4/4 green on Java 22 Firestore Emulator. Backup and recovery tests observed red then 16/16 green.
- Task 3: existing menu/material form tests plus image-failure retry tests pass (same entity ID retained).
- Ruling: Images have their own revision; business backup pictures are coherent per document, independently timed from the root revision. Recovery preserves image bytes and revisions; no live import is enabled.

- Final review: one fresh reviewer found confirmed-business-save replay after image failure. Fixed both forms; regression observed RED then GREEN with remote stock changed to 9. Full suite: 196 files, 1515 passed / 1 skipped.
- UI: actual JPEG crop 512×512 (9789 bytes), cancel preserved old picture, persisted/reloaded POS picture. Crop/Pos ratio 1:1 at 1280/820/390px, no overflow; stock table picture 48×48. No page errors. Material keyboard edge/zoom crop stayed inside source.
- Firestore proof: 6 files, 99 passed / 2 skipped, including production image Rules, existing access policy, catalog/inventory runtime and backup/recovery.
- Lint and production build passed. Existing large-chunk warning remains. Detector new-component advisories are intentional translucent crop guides and decorative emoji size; inherited off-ramp source classes were preserved as required.
- Ruling: Business fields changed after a partial save are not replayed; the form reports that the user should reopen the saved entity. This avoids silent loss of those edits and stale stock compensation.
