# Menu interface remediation — implementation candidate

20 October 2026. Release source from the isolated menu-interface-layout worktree, compared with baseline a5e1c83. The user explicitly authorized production deployment and Git cleanup after the preview/header iteration. The implementation supersedes the historical dimensions below; rendered/device acceptance remains unverified. Earlier no-deploy notes below describe prior snapshots. Approved plan: ../../docs/superpowers/plans/2026-10-20-menu-interface-layout.md. Source/DOM audit: ../../docs/ui-audit/2026-10-20-menu-interface-review.md.

THESIS: Keep financial meaning dependable and selection/editing continuous, then size the existing reading workspace by available content width.
OWN-WORLD: Preserve cream/burgundy, Prompt and the ภาพรวมร้าน reference. PRODUCT.md, DESIGN.md and .impeccable/design.json remain global authorities; no global token migration.
STORY: Search/select a menu, read configured-platform financials and recipe, then add/edit in the original popup. Successful creation selects the actual saved menu and clears a search only when it would hide that menu. Recipe edit enters the recipe section of the same popup.
FORM: Left list, analysis at center/top and recipe rail when space permits; original MenuEditModal/DialogFrame and native/shared form controls. Missing/zero-priced platforms remain absent from reports and all three charts/line keys. No priced platforms shows the edit-menu next step, with chart controls/legend/guidance omitted.

## Candidate behavior grounded in source

User follow-up from the attached preview screenshot: the redundant body title/add row and selected-menu heading are consolidated into one cream header panel. It contains the active menu identity, description/status, configured-platform and recipe counts plus add/edit actions. Delete is in a native “…” disclosure, retaining confirmation; outside pointer, Escape, focus departure, selection and route deactivation close it. The search/list and analysis/recipe start beneath this shared header. These changes are source/DOM verified, not a new screenshot acceptance.

- Unknown material costs, missing materials and indeterminate recipe quantities produce null row costs and “ยังไม่ทราบต้นทุน”; genuine known zero remains ฿0.00. The display estimate gates base/average/worst costs to null if an included recipe row is unknown, preventing a contradictory profit/chart. Packaging explicitly excluded from analysis does not block financials. Domain estimator, schema and transactions remain unchanged.
- The original popup records savedMenuId after successful save. The workbench consumes the matching new ID, selects it, reveals it through search and requests heading focus after the overlay stack is released. Cancel, failed save and unrelated added IDs do not select a new menu. Existing-menu edits preserve selection/search.
- “แก้ไขสูตร” opens the same menu popup with recipe entry, expands that disclosure and targets a usable button, including the add-material control for an empty recipe. Ordinary edit and invalid-name handling still target the name field. “คำอธิบายสั้น” now supplies the description field's accessible name without a conflicting aria-label.
- Surface-scoped keyboard feedback candidates use burgundy fill, cream text, underline, focused field/checkbox labels and the search icon; the selected chart mode keeps an internal marker. No outline, ring or halo is introduced. Forced-colors CSS uses Highlight/HighlightText. These source rules are not rendered keyboard acceptance.
- Local muted #705C50 on declared soft fill #F4EBDD computes to 5.3285:1; this is declared-color evidence, not sampled/computed-browser evidence. Shared Button/AppSelect/AppCheckbox/MenuPriceInfo hover rules now require (hover:hover); selected/checked/expanded/focus behavior stays outside that guard. Shared caller visual/touch checks remain pending.

## Candidate proportions — awaiting rendered validation

List width is 208px by default, 192px through viewport 1199px, and 224px from 1800px; gutters are 24px/default and 16px/narrow. The recipe rail is 288px and appears only when menu-content reaches 840px. Platform reports become two columns only when their actual menu-analysis container reaches 728px, replacing the viewport-triggered override. Phones retain list/detail switching below 768px.

Price emphasis is 18px, supporting amounts 16px and profit/loss 20px (18px on phones); supporting financial text rises to 12px, with tabular amounts. Recipe amounts use Thai grouping/decimals. Editor price fields become one column when the editor's inner container is at most 399px. These are implementation candidates, not measured reflow, zoom or device results.

## Candidate verification boundary

Code Tasks 1–3 are complete. Tasks 4–7 are source candidates with visual checks pending. A source reviewer found one Important unknown-cost/estimate mismatch; targeted regressions reproduced it RED and passed GREEN after the display gate fix, as reported by the implementer. Implementer-reported final source checks at code commit 9ba1874: 96 files / 601 tests PASS; lint PASS; production build PASS; diff-check PASS. The Important mismatch was fixed with two RED-to-GREEN regressions plus an excluded-packaging control; no other source findings, deferred minors or declined behaviors were reported. A shared CSS import build issue was resolved with a normal JavaScript import rather than Vue style-src.

Browser tools still report disabled access despite the user enabling it, a fresh session reset and an attempted createTab. No screenshots, rendered viewport measurements or keyboard/forced-colors acceptance exist for this candidate. The local demo preview is on port 5186; HTML/modules returned HTTP 200, which is not rendered verification or deployment. Source-only record: ../../docs/superpowers/verification/2026-10-20-menu-interface-remediation.md. Physical device, zoom, soft keyboard and assistive-technology checks remain unverified.

## Historical surface records — not candidate verification

Preserved below for provenance. Earlier “current”, “final”, pass-count, screenshot and deployment language applies to those preceding snapshots, not this worktree candidate. Local geometry, compact type and focus rules are not canonized into the global design system.

# Menu and recipes — reading workspace with original edit popup

Current superseding brief, 20 October 2026 (hide unpriced platforms). The user now requests platforms with missing or zero prices hidden entirely, superseding the static skeleton iteration. The original add/edit MenuEditModal popup remains restored. Reading retains the left menu list, center/top analysis and responsive recipe/materials rail.

THESIS: Read one menu's configured-platform analysis and recipe in context; add/edit through the established popup.
OWN-WORLD: Inherit cream/burgundy, Prompt, existing numeric hierarchy and the ภาพรวมร้าน dashboard reference. No new visual world or global tokens.
STORY: Search/select a menu, compare its configured selling platforms, inspect its recipe and open the original popup to add/edit.
FIRST VIEWPORT: Searchable left menu list with selected state and open/closed-sale labels; selected-menu identity/actions, configured-platform analysis and recipe. The list is not active-only.
FORM: MenuView opens store.modals.menuEdit; MenuEditModal renders the established DialogFrame/shared-field/footer flow. Inline editing and draft preview remain removed.

## Current behavior from source

- Reading layout retains the 220px list (200px at viewport widths of 1199px and below). The 290px recipe rail appears at a menu-content container width of at least 800px. Tablet normally shows list beside analysis with recipe below; phones below 768px switch list/detail with a back action.
- Only finite prices greater than zero produce platform rows. The same filtered rows feed all three chart modes and the line key: missing/zero-priced platforms have no report, placeholder, financial values, names, numbered positions or plotted points. This display filter does not migrate stored prices.
- When platforms exist but none have a configured positive price, the empty state says “ยังไม่ได้ตั้งราคาขาย แก้ไขเมนูเพื่อเพิ่มราคาของช่องทางที่ต้องการ”. With no platform configuration, the separate Settings next step remains.
- Configured-price platforms retain bar/circle/line analysis, textual figures, the estimate switch and explicit loss/unavailable-data handling. The shared recipe-cost context remains.
- No-outline styling stays scoped to the reading workspace and original menu-edit popup. DESIGN.md and .impeccable/design.json remain unchanged. Local layout/filtering/focus behavior is not canonized into global design tokens.

Source-only record: ../review/menu-workspace-2026-10-20/popup-unpriced-correction.md (latest superseding note). The parent reports 16 focused tests passed for the hide-unpriced correction; full verification is pending. Visual/responsive/rendered keyboard QA: NOT VERIFIED because browser use is disabled by Work settings. No current build or deployment claim is made. Earlier screenshot, suite and deployment references belong to previous snapshots.

## Historical records — superseded inline editing and earlier popup/graph versions

The following records are preserved for provenance. Their “current”, “final”, inline-edit, draft-preview and prior test claims apply only to those earlier snapshots and do not override the restored popup/unpriced behavior above.

# Menu and recipes — inline management workspace

Current surface brief, 20 October 2026. Mode: Operate. This source-grounded extension supersedes the popup presentation described in the historical records below. PRODUCT.md, DESIGN.md and .impeccable/design.json retain global authority; this change adds a local workspace composition.

User-approved direction: remove the menu details/add/edit popup from this page. Use the shop overview dashboard (ภาพรวมร้าน) as the primary style reference, with an active menu selection on the left, all-platform analysis at the center/top, and recipe/materials on the right where space permits. Edit in place with a draft graph preview and save/discard/stay handling. The user explicitly requested no focus outline on this surface. Inherit cream, burgundy, Prompt, numeric hierarchy and existing shared controls; no new visual world or global design-system migration.

THESIS: Keep one selected menu, every selling platform's financial figures, and its recipe in the same working context.
OWN-WORLD: Extend the established calm shop workspace with quiet cream panels, burgundy selection/actions, existing chart semantic colors and source-local warm secondary text.
STORY: Search the left menu list; select a menu; compare all platforms using bar, circle or line; inspect ingredients/packaging; edit inline while previewing draft financials; save or resolve unsaved changes before moving to another local action.
FIRST VIEWPORT: Page title/add action and a searchable selectable menu list accompany the selected menu heading, all-platform analysis and recipe panel. The first stored menu is selected initially. The list includes open/closed sale status and recipe count; it is not an active-only filter and no longer carries a display-channel price selector.
FORM: Source-local dashboard-style composition using MenuView, MenuRecipeDetails, MenuRecipePanel and MenuInlineEditorFrame. MenuEditModal is reused with its inline prop; this branch renders a section instead of DialogFrame and does not open the global menu-edit popup. The existing modal branch remains available for other callers. Shared FormField/AppInput/AppSelect/RecipeEditorRow controls retain native inputs and selects.

## Layout and responsive behavior recorded from source

- At viewport widths of 768px and above, the left list and main content coexist. The list is 220px wide, becoming 200px at 1199px and below; the inter-column gap changes from 24px to 20px. The list has its own bounded vertical scroll on these widths.
- The main content establishes a named inline-size container. A recipe rail (290px) appears beside analysis only when that content container reaches 800px. This is a container threshold, not an 800px viewport breakpoint. A desktop with narrower available content may still stack the recipe below analysis.
- Tablet layouts retain the list beside analysis and normally place the recipe below it. At content widths of 560px or less the analysis panel padding reduces from 24px to 16px. Source rules keep platform reports in one column inside the wide analysis-plus-recipe composition.
- Below 768px viewport width, the page switches between the menu list and selected detail/editor. A named back action returns to the list. Selecting a menu requests focus on its heading; returning requests focus on its list button. These are source behaviors, not rendered keyboard QA results.
- Inline editing keeps the graph preview before the form in source order. At a content-container width of 800px and above, preview/basic/price/group/sale controls occupy the main column and ingredient/packaging editors occupy the right column. Below that threshold they stack. Save/cancel live in a sticky inline footer.

## Financial and draft behavior

The current overview retains three user-selected representations: แท่ง / วงกลม / เส้น. Every mode includes textual selling price, cost, GP rate/amount, signed profit/loss, net revenue and margin for every platform; selecting a menu requires no platform filter. Bar uses a common baht scale, donut describes per-platform composition, and line compares platforms rather than time. Missing prices, invalid GP, unavailable costs, losses and no-platform states remain named. The existing average/worst free-choice estimate switch applies to every platform in detail view and resets when the selected menu ID changes.

Inline preview derives from the draft prices, recipe, packaging flag and option-group selection through the existing cost estimator. Its label states that it is an unsaved preview and uses the average cost of free choices. It does not update stored menu data merely by rendering. Recipe panels group ingredients and packaging, name missing materials, show per-serving quantities/costs and available servings, explain excluded packaging and list option-group rules.

The workbench checks the editor's dirty snapshot before local menu selection, add, cancel or phone-back actions. Its inline notice offers แก้ไขต่อ, ทิ้งแบบร่าง and บันทึกแล้วไปต่อ; saving continues only when submission succeeds. Dirty drafts also register a browser beforeunload guard. This is not evidence of an application-wide route-change guard. Delete retains the existing destructive confirmation. The optional emoji picker and ancillary shared UI are separate from the removed menu details/edit popup.

## Scoped styling and evidence limits

Panels inherit the existing card fill and rounded surface language. Cost burgundy, profit green and loss red remain semantic chart colors; fee brown (#A07847) and warm secondary text (#705C50) remain local values. Focus outline and box-shadow suppression are scoped to this menu workspace and inline editor per the explicit user direction. Native focusability, labels and pressed states remain in source; visible keyboard focus and accessibility acceptance have not been verified in a rendered session. This is not a global focus-token change.

Current visual, responsive and rendered keyboard QA: NOT VERIFIED. Browser use is disabled by Work settings. No current redesign screenshots or viewport measurements are claimed. Source tests/checks are in progress at this documentation snapshot; no current pass count, completed build, deployment or physical-device result is asserted. Current documentation provenance: ../review/menu-workspace-2026-10-20/documentation.md.

The prior popup screenshots, graph screenshots and test counts below are historical evidence for their earlier implementations. They do not show or verify this inline workspace redesign.

Final source validation for this workspace: 95 files / 579 tests, lint and build passed after the fresh keyed draft-session fix. Source-only reviewer scored the reported discard defect resolved. No current rendered visual QA or deployment is claimed; browser use is disabled in Work settings. See review/menu-workspace-2026-10-20/{documentation.md,source-review.md}.

## Historical records — superseded popup, directory and graph presentations

The following earlier brief is preserved verbatim for provenance. Its claims of a details sheet, selected-channel directory prices and screenshots being current/final apply only to that historical version. They do not override the current inline workspace description above.

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
