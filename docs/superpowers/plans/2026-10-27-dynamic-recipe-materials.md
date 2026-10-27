# Dynamic recipe materials implementation plan

> **For agentic workers:** Use superpowers:executing-plans; one final fresh review.

**Goal:** Any active registered material (64 maximum per shop) can be used in
original menu/Add-on recipes. One sale uses at most16 distinct materials including
selected Add-ons and enabled packaging. Existing bill cancellation remains valid.

**Architecture:** Root canonical recipes become the stock-quantity authority.
Sale price preparations bind a complete per-bill material footprint; retain15/16
padded stock rows to preserve the proven distributed operand/read budget. Recipe
admission is proved in revision-fenced preparations before the atomic catalog
commit. Catalog cache writes are retired; separate command witnesses take over
price/option/reference checks previously distributed among material caches.
Archive/delete consult canonical references through revision-fenced proofs; type
changes update effective menu projections with distributed checks. No shop-wide
write lock, no offline queue and no data reset/import.

**Tech Stack:** Existing Vue/Pinia, Firebase JS SDK12, Firestore Spark Rules.
**Spec:** User approved64 registered materials,16 distinct used per bill on27Oct.

## Global constraints

- Preserve original UI/layout/styles; use existing form validation and spinners.
- Equal Google accounts; server-confirmed commands, immutable IDs and retained carts.
- Rules must validate every required write and forbid omitted stock/recipe rows.
- Preserve existing old bill receipts, quantities, costs and lot cancellation.
- No live synthetic stock/sales or billing changes. Publish only a working vertical
  integration after tests/lint/build and production Rules compiler/activation gates.

## Tasks

1. [x] Dynamic sale proof: add model footprint selection and direct canonical
   quantity calculations. Add footprint binding to prepared line proofs; validate
   complete base/selected-addon coverage and all stock rows. RED/GREEN unit + native:
   >16 catalog ingredients spread across bills;16 positive rows;17 overflow with
   untouched stocks/cart; hidden ingredient/packaging/addon omission; forged needs;
   stale catalog and multi-account contention; legacy receipt cancellation.
   Files: model/sale.js, model/recipe.js, transport.js, scripts/dynamic-recipe-policy.mjs,
   scripts/core-policy.mjs, tests/cloud/dynamicRecipe*.test.js, native proof.
2. [x] Recipe admission: prepare immutable-input material validation in groups of4
   with root revision fencing, nonarchived registration, integer quantities and
   packaging projection. Canonical used-material IDs are checked per row. Final
   admission witness binds all required proof parts to the same payload/revision/UID.
   Move catalog price/choice/reference validation into mandatory operation witness
   parts; remove cache mutation permissions/requirements together. Original forms
   admit registry materials and retain clear validation errors on failure.
   Files: catalogPlan, catalogBindings, catalog model/presentation, transport,
   dynamic policy, catalog policy; integration tests use real original model.
3. [x] Archive/delete/type consistency: no cache-zero shortcut may permit removing
   a referenced new material. Stage canonical reference checks tied to root revision;
   require final witness for archive/delete. Type change validates effective menu
   projection updates and invalidates staged sales. Update model guards/usage UI
   without replacing original layouts. Exercise receiving, production and all
   existing original inventory flows; preserve old-bill return lots.
4. [ ] Final integration and release: full operational native suites + ordinary
   tests, lint/build, focused fresh review, compiled Rules preflight and verified
   activation, Git fast-forward/push/Pages Actions + exact live version/assets.
   Record actual limits and tests; no operational readiness claim from plan/tests
   alone. Report scoped progress and the next proposal awaiting user approval.

## Review focus

- Missing base/selected-addon/packaging ID must never create a successful partial sale.
- Zero quantity, disabled packaging and repeated ingredients must not inflate used-ID count.
- Catalog/material mutation between proof staging and commit must invalidate proof.
- Archive/delete must inspect inactive/retired recipes and old bill dependencies safely.
- Rule per-request10/whole-transaction20 reads,1000 expressions, and compiled256000
  bytes must be verified at actual maximum supported footprints, not just small examples.

## Implemented protocol and release checks

- Root recipes are authoritative. Existing material recipeIndex maps remain
  unchanged and are no longer read as quantity or archive/delete authorities.
- Each recipe retains its original maximum16 declared material rows; the shop
  registry supports64. Actual bill coverage excludes zero/disabled packaging.
- Abandoned quantity caches are reclaimed by their owner; after seven days,
  equal accounts can reclaim expired or abandoned caches with server validation.
  Full-map admission attempts reclaim eligible entries while preserving live work.
- Staged price and coverage proofs bind immutable bill operands. A complete bill
  certificate binds all paired proofs. Material preparation caches certify each
  canonical quantity without modifying business fields; final atomic sale consumes
  its own entries. Proven concurrent cache changes permit bounded same-ID retries.
- Catalog admission uses4 parts of4 rows; separate input/admission witnesses and
  8 check witnesses split the previous leaf-cache validation workload.
- Archive/delete use8 revision-fenced canonical reference parts. Once a material
  appears in any bill's stock footprint, returnMaterials prevents permanent
  deletion so historic cancellation remains possible; archival stays available
  after recipe removal. Existing protected materials retain their prior policy.
- Type changes write only the target material and effective menu projections,
  certified by16 witnesses. Prices, declared recipes, lots and costs are preserved.
- No live synthetic writes, imports, billing or UI layout changes are included.
- Native tests include both private source snapshots, original form bindings,
  multi-account contention,16/17 bill capacity,64 registry materials, omitted and
  forged proofs, archival/type/deletion and cancellation after archival.
- Before release: all operational native suites, ordinary tests, lint/build,
  independent review, active-Rules backup + compiler + activation verification,
  normal Git push/Pages deployment and exact live version/entry verification.

### Verified implementation checkpoint

All9 operational native suites passed133 tests; catalog suite rechecked14/14
following removal of an unused helper argument. Production compiler test returned
200 with no issues. Independent review's preparation capacity finding is fixed,
with native recovery cases for both open-expired and abandoned manifests. Full
project tests, lint/build and deployment remain the release gate.

### Production compilation constraint

The readable candidate passed compiler tests but activation rejected269363
compiledbytes against256000. The active baseline remained unchanged. Final
Rules generation now alpha-renames function/local bindings with a token-aware
compactor; reviewed source modules remain readable. Strings, member names and
static document paths remain exact, including nested path interpolations.
Compactor/core-policy unit4/4 and compiler200 with no issues pass; focused review
passes. Operational suites are rerun against the emitted compact artifact before
activation is attempted again.

### Release acceptance

Compacted artifact passed all133 native tests. Focused generator units4/4,
project lint, policy-script lint and production build pass. All previously failed
ordinary tests passed on serial rerun (30/30 across the3 affected suites).
Production Rules activation and exact-source verification succeeded27Oct2026,
ruleset55413ba7-7cdc-4f8a-94de-9a69719dbcd0. Website publication/Actions and live
version verification are recorded in the release ledger after the Git push.
