# Stock documentation review

Disposition: documentation complete; final finish verdict ship for the scored touch-target fix.

This is an Operate extension of PRODUCT.md, DESIGN.md and the approved Menu/Add-on style. The finished Stock directory and forms reuse the incumbent cream/burgundy palette, Prompt Thai text, numeric conventions and protected dialog behavior. No identity change, primitive token, seed, concept roll or approved image comp is introduced.

## Source-grounded comparison

Inspected StockView.vue, StockMaterialCard.vue, StockToolbar.vue, inventory/stockForms.css, MaterialEditModal.vue, StockInModal.vue, StockAdjustModal.vue, WasteModal.vue and StocktakeModal.vue. The former duplicated desktop table/mobile inventory presentation is replaced by one responsive row list. DESIGN.md records its identity/quantity/cost/value/action composition and surface breakpoints; system-interface.md now describes the actual shared controls and form frames. Existing POS, Menu/Add-on, history, payment and normative primitive definitions remain preserved.

The four detailed forms use default shared DialogFrame headings and bounded 720px desktop frames, AppInput/AppSelect and shared Button variants. Stocktake uses a 980px DialogFrame with shared search/count inputs while retaining its count map, unit conversion, next-field Enter navigation and staged draft boundary. Surface CSS supplies spacing and arrangement rather than a new global control system. Existing sidecar primitives and component metadata already describe these shared controls, so .impeccable/design.json requires no change.

## Evidence and limits

Read stock-layout-checks.json: the recorded document widths equal 390px and 820px viewports; measured material/count/recipe/receive scrolling bodies equal their available widths. The parent and finish reviewer supplied the 17 stock-*.jpg captures. This documenter did not independently view those captures, recapture the browser or rerun application tests.

The parent reports 469 tests across 77 files before the final Stocktake frame/styles refinement; 30 targeted tests, lint and build passed after that refinement, and diff checks passed after whitespace cleanup. The subsequent unit-button correction sets a 44px minimum width at every viewport; its three Stocktake tests passed. Final lint/build and diff checks passed on resume. These evidence stages are distinct; the earlier full suite is not claimed to cover the last refinement.

The final reviewer re-read refreshed desktop/mobile count captures and the additional tablet capture, bringing the evidence packet to 18 captures. Its bounded ship verdict resolves the sole initial finding and reports no visible regression from that correction. stock-count-targets.json confirms 44×44px tablet toggles and a 145px native count field; the count field sits above the toggles at 640–1199px. The documenter agent was interrupted by a usage limit after merging the source-grounded documentation; the parent completed this final evidence refresh inline without changing the implementation.

The parent exercised a preview-only receive flow: milk +1,200 was staged and draft review displayed 15,000 → 16,200, without a final stock commit or real shop write. This is in-memory preview evidence, not a production transaction.

Read stock-design-detector.json: 85 advisories comprise 80 font-size, four radius and one color findings; two overused-font warnings concern the pinned Plus Jakarta Sans numeric face in Stocktake. They do not establish an approved token change. No detector rerun, normalization or unrelated drift repair was performed by this documenter. Physical iPad/Safari, screen readers, physical keyboard and 200% zoom remain unverified; viewport emulation does not certify them.

## Documentation validation

The sidecar parses as JSON with schemaVersion 2 and 12 components; its read-back text exactly matches the pre-documentation baseline. The normative DESIGN.md frontmatter SHA-256 remains 793E179C32DED34CFD5DCED190E3FAD50E6AC3A378C0EF871281BABF67610286. git diff --check passed. No application source is edited by this documentation pass.

## Not canonized

Local dense metadata and detector type/font advisories are not promoted into normative primitives or repaired. This pass records only the authorized Stock composition and shared-control use while preserving incumbent design authority.

Post-review functional verification on resume found that StockIn's native input synchronization ran before AppInput emitted the new model value. The parent moved all four purchase/production conversion callbacks to update:model-value, preserving the conversion formulas. New regression tests first reproduced the stale pack quantity, then passed for purchase packs/base units and production batches/yield. The targeted 14-test stock form set passed. This event-order correction changes no visual style; it is parent-tested evidence and is not attributed to the earlier visual reviewer.
