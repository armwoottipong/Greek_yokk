# Menu and recipes — immediate platform comparison

Current surface brief, 20 October 2026. Mode: Operate. This extends the established cream/burgundy shop workspace. PRODUCT.md and DESIGN.md remain the global authority; this brief records the menu surface only.

Primary targets: src/views/MenuView.vue; src/components/catalog/MenuRecipeDetails.vue, MenuPlatformOverview.vue, PlatformFinanceDonut.vue and PlatformFinanceLines.vue. The existing directory, menu editor and shared primitives retain their established behavior.

User direction: selecting a menu should immediately show a dashboard-like financial overview for every selling platform, without selecting or filtering platforms inside details. The subsequent request adds bar, circle and line representations of the same figures. The directory continues to display the selected channel's price.

THESIS: Select one menu and immediately compare its price, costs, GP and profit across all platforms.
OWN-WORLD: Inherit the cream/burgundy shop, Prompt Thai type, numeric hierarchy and existing mascot from PRODUCT.md and DESIGN.md. No global identity replacement.
STORY: Search or browse the menu directory, open one menu, compare every platform, choose a chart representation, then review the recipe or edit. Details no longer offer a platform selector or filter step.
FIRST VIEWPORT: The details sheet leads with financial figures, chart guidance, the ต้นทุน / GP / กำไร legend and three controls labeled แท่ง / วงกลม / เส้น. Bar is the initial representation. Recipe ingredients and packaging follow the comparison.
FORM: Extend the existing Operate components and DialogFrame sheet. Details request a maximum width of 960px. Platform reports use two equal columns at 768px and above, one column below 768px, with wrapping names and three textual financial columns per report. The shared footer retains close and edit actions.

Chart and financial behavior:

- แท่ง: stacked cost, GP and positive profit use one shared scale in baht across all complete platforms. The common maximum accommodates selling price or total expenses, whichever is greater. A losing platform has an explicit loss sentence and a selling-price marker within the expenses bar; no positive profit segment is invented.
- วงกลม: each complete platform has its own donut. Profitable or break-even platforms use selling price as the denominator. A losing platform explicitly labels the expense denominator (cost + GP), omits a positive profit segment and retains the separate loss figure. Zero amounts receive an explicit no-amount caption.
- เส้น: one shared chart compares cost, GP and profit by platform order, with a baht axis, a zero baseline, signed profit values and numbered platform names. Series use distinct solid/dashed/dotted strokes. Missing values create gaps in their series; available values remain visible. This is a platform comparison, not a time trend.
- Every representation retains selling price, cost, GP amount/rate, signed profit or loss, net revenue after GP and profit margin as text. Shares below monetary figures divide by selling price; profit margin divides by net revenue after GP. Undefined shares show a dash; margin is unavailable when net revenue is zero or missing.
- Missing prices, invalid GP and unavailable costs remain named per-platform states. An empty platform collection directs the user to Settings. Chart graphics are supplemental to the textual figures.
- Where free-choice estimates exist, the average / worst-cost switch recalculates all platforms together. Its explanation retains the free-choice assumptions and exclusion of paid Add-ons. Reopening or changing the menu resets that cost switch to average.

Scoped visual choices: costs use existing burgundy, profit uses existing green and losses use existing red. Fee series use warm brown (#A07847); overview secondary text uses dark warm brown (#705C50). These values belong to this chart surface and are not new global tokens. Rounded chart controls and quiet report dividers inherit the existing working language. This extension adds no motion and preserves the user's existing scoped no-outline treatments.

Current evidence: .impeccable/review/menu-platform-overview-2026-10-20/{bar,donut,line}-{desktop,mobile}.png plus {line,donut}-{320,ipad,edge}.png. The edge captures cover loss/missing-data presentations. Earlier *-first.png and *-final.png in that folder predate the three-mode addition and are historical only. Documentation and verification provenance: .impeccable/review/menu-platform-overview-2026-10-20/documentation.md. Parent-reported final validation: 94 test files / 573 tests, lint and build passed; no source edits followed final captures. Browser viewport evidence does not establish physical iPad/Safari or assistive-technology behavior.

## Historical evidence — 14 October 2026 directory and editor work

The following brief and verification record are retained as historical evidence. Its original single-channel detail framing and test totals do not supersede the current all-platform details behavior above.

### Menu and recipes — one calm management list

Mode: Operate. Primary target: src/views/MenuView.vue. Related targets: src/components/catalog/MenuCard.vue, MenuRecipeDetails.vue, CatalogToolbar.vue; src/components/modals/MenuEditModal.vue, EmojiPickerPopover.vue; src/components/ui/AppInput.vue, AppSearch.vue, RecipeEditorRow.vue.

User direction, 14 October 2026: renovate the menu/recipe page and add/edit popups to match Greek Yogg branding, reduce clutter and make data easy to manage. Inputs, dropdowns and search use shared components. Confirmed answer: show the selected channel's price in the list, with all channel prices available in details/edit. Earlier popup border/outline and search focus preferences remain.

THESIS: Find one menu, review its selected-channel price and recipe, then edit only the relevant group.
OWN-WORLD: Inherit PRODUCT.md and DESIGN.md cream/burgundy, Prompt Thai, real catalog emoji and the existing mascot. No new visual identity or generated imagery.
STORY: Search and the inline display-channel selector lead into one responsive row list; recipe details group ingredients and packaging. Add/edit preserves the current store save, discard, confirmation, schema and inventory behavior.
FIRST VIEWPORT: Search, named channel selector and add action; row name/description/status, recipe counts, one price and named edit/delete actions. Phone rows reflow, not a separate data table.
FORM: Code-led extension of the established system. AppInput, AppSearch and RecipeEditorRow are shared primitives composed with AppSelect, FormField, Button, IconButton and AppCheckbox. Four editor groups fold without destroying draft values; fixed footer retains save/cancel.

Motion refinement, 14 October 2026: DialogFrame uses appear for every presentation because ModalShell mounts the transition subtree when opening. Menu disclosures share vSmoothDisclosure: measured-height expansion 260ms, collapse 200ms, cubic-bezier(.2,.8,.3,1), interruption starts from the current rendered height. Draft fields stay mounted, closing bodies are inert, and reduced motion uses immediate native state changes. Summary chevrons rotate in 200ms, with no rotation transition under reduced motion. Regression tests reproduced missing dialog/panel entrance before the fix; all 16 targeted motion/dialog/menu tests, lint and build passed afterward. Browser preview verified mouse collapse, keyboard expansion and phone layout; menu-motion-mobile.jpg records the final collapsed state, not an animation sequence.
FINISH: Inspect desktop/mobile/iPad captures, real search/clear/channel/add/save flow and regression tests; finish reviewer and documenter record the result.

Implemented: directory rows use four columns, reflow at 1100px, and stack identity/recipe above price/actions at 639px and below. Toolbar search occupies its own row at 639px and below. Menu editor uses four disclosures with mounted draft fields and the shared DialogFrame footer; prices retain two columns until below 360px. Shared RecipeEditorRow stacks the material selector above quantity/remove at 480px and below. Icon-picker categories use shared 44px Button targets and aria-pressed selection semantics.

Evidence packet: .impeccable/review/menu-directory-{desktop,mobile,ipad}.jpg; menu-edit-{desktop,mobile,ipad}.jpg; menu-recipe-editor-mobile.jpg; menu-add-{desktop,mobile}.jpg; menu-recipe-details-{desktop,mobile}.jpg; menu-icon-picker-{desktop,mobile}.jpg; menu-layout-checks.json; menu-design-detector.json. Final menu-finish-review.md disposition: ship after the picker touch-target correction and fresh captures. The earlier full suite passed 462 tests; after the final correction the six focused menu/dialog tests, lint and build passed, as reported by the parent. Layout measurements cover 320/390/820px without measured document or editor-body overflow. Detector findings remain advisory; no rerun is claimed. No concept roll, FORM seed, quality card or approved image comp is claimed for this inherited-system extension. Preview uses in-memory synthetic demo data; no shop data was changed. Physical Safari/iPad, screen-reader and physical keyboard behavior are not established by viewport emulation.
