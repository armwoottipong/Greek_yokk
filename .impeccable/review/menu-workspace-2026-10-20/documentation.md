# Menu workspace documentation — 20 October 2026

This source-grounded record covers the current inline menu workspace redesign. Its surface brief is ../../surfaces/menu-management.md. It inherits the existing system; PRODUCT.md, DESIGN.md and .impeccable/design.json remain unchanged global authorities.

## Five-line system summary

1. Inherit Greek Yogg's cream/burgundy, Prompt Thai, existing numeric presentation and calm shop workspace; ภาพรวมร้าน is the approved primary style reference.
2. Keep an active menu selection in a searchable left list, all-platform financial analysis at center/top and recipe/materials at right when the content container is wide enough.
3. Reuse bar, circle and line comparisons with persistent textual figures and explicit missing-data/loss states.
4. Add/edit inline with an unsaved graph preview, sticky save/cancel actions and local dirty-navigation save/discard/stay handling.
5. Keep responsive composition and the user's explicit no-outline treatment local; preserve the global design document and sidecar.

## Source inspected and resulting behavior

Reviewed .agents/skills/impeccable/reference/document.md, PRODUCT.md, DESIGN.md and .impeccable/design.json, then src/views/MenuView.vue and src/components/catalog/{MenuRecipeDetails.vue,MenuRecipePanel.vue,MenuInlineEditorFrame.vue}. The optional inline branch of src/components/modals/MenuEditModal.vue and existing MenuPlatformOverview.vue were inspected to establish the rendering and draft-preview boundary.

MenuView selects the first available stored menu and keeps a searchable left directory. “Active” refers to the current selection: closed-sale menus are still listed with a status, and search filters name/description. This version replaces the former row-price/channel-selector presentation. The selected menu's detail is rendered directly in the page, with full platform data sent to MenuRecipeDetails. Selection and add/edit on this page do not call the global menu-details/edit popup.

MenuRecipeDetails separates the analysis panel from MenuRecipePanel. The recipe panel groups ingredient and packaging rows, quantities, costs and stock availability, names missing material references, describes packaging exclusion and includes option-group details. The existing three graph modes and textual financial measures remain in MenuPlatformOverview. Detail free-choice estimates retain average/worst assumptions and the paid Add-on exclusion.

MenuEditModal now supports an inline prop and menuId. The inline branch renders MenuInlineEditorFrame (a section with heading and footer) in place of DialogFrame. The legacy global modal branch remains for other consumers and existing tests; reuse of the component name is not evidence that the workbench opens a popup. Shared native form controls and disclosure behavior remain in use. Ancillary emoji selection still uses the existing picker.

Draft graph preview is computed from unsaved form prices, option groups, packaging choice and combined recipe, using estimateMenuCosts with average free-choice cost. The preview names itself as unsaved. The parent invokes the editor's exposed isDirty/submit methods for local navigation. Dirty selection/add/cancel/back actions produce an inline save/discard/stay notice; a failed save does not continue. A beforeunload listener handles browser departure with a dirty draft. No application-wide route guard is established by this record.

## Layout evidence from source

At viewport widths of 768px and above, the list and content form two columns: 220px/minmax(0,1fr) with a 24px gap, changing to a 200px list and 20px gap at 1199px and below. The recipe rail appears only at a named menu-content container width of at least 800px and measures 290px. It is not an 800px viewport rule. Tablet normally keeps list plus analysis with the recipe below. Narrower desktop content can also stack.

Below 768px viewport width, list and content switch based on mobile selection state; a named back action returns to the list. The source requests heading/list-button focus for that transition. At the same 800px content-container threshold, the inline editor arranges its preview/form main column beside ingredient and packaging editors. Otherwise those sections stack, with a sticky footer. These rules describe implementation intent; no rendered layout, overflow, touch reachability or keyboard result was observed in this pass.

## Visual scope and drift not canonized

The approved dashboard reference guides local composition within the incumbent world; this record does not certify visual parity with ภาพรวมร้าน. Card fill, burgundy active selection, semantic profit/loss and native shared controls are inherited. Fee brown (#A07847), warm secondary text (#705C50), panel spacing and the 290px recipe rail remain surface-local choices.

The user explicitly requested no outline focus on this workspace. Scoped CSS suppresses focus outlines and shadows within the workbench/inline editor. This documents the authorized local behavior without changing global focus guidance or asserting rendered accessibility conformance. Native inputs, labels, pressed-state attributes and source focus requests do not substitute for keyboard QA.

DESIGN.md and the sidecar retain older shared menu/directory/dialog descriptions. The current surface brief supersedes their menu presentation locally for this task; the documenter did not silently rewrite the global system. Compact secondary type, local radii, broad descendant focus suppression and any other implementation drift are observed facts, not newly canonized global design tokens or recommendations. No new typography, palette, imagery, animation system or global component migration is claimed.

## Evidence and verification status

Current visual/responsive/rendered keyboard QA: NOT VERIFIED. Browser use is disabled by Work settings. No screenshot or viewport measurement was produced for this inline workspace, and no older screenshot demonstrates its layout or interactions. Physical iPad/Safari, zoom and assistive-technology behavior remain unverified.

The screenshots in ../menu-platform-overview-2026-10-20 and the older 14 October directory/editor evidence document the previous popup/graph implementations only. The prior 94-files/573-tests report and earlier validation counts likewise belong to those historical snapshots. Historical “final” labels in preserved documents do not certify this redesign.

Current source tests/checks are in progress at the documentation snapshot. The documenter did not run them and records no current pass totals, completed build or deployment. The parent implementer's final verification record should supply actual command results and any subsequent source changes.

## Documentation boundary

Only .impeccable/surfaces/menu-management.md and this new documentation.md were written by the documenter. The existing brief was preserved under an explicit historical heading, with a current source-grounded brief prepended. PRODUCT.md, DESIGN.md, .impeccable/design.json, source files and older evidence records were not edited.


## Final source validation from implementer

After the new-draft discard correction and native focus handoff adjustments, npm test passed all 579 tests in 95 files; npm run lint and npm run build passed. git diff --check passed. One independently reported source defect was reproduced with a failing regression and corrected by a fresh keyed editor session; the follow-up source-only verdict scored it resolved. The mechanical detector reported only advisory local font sizes, emoji display sizes and previously scoped #705C50. No further detector run or visual approval is claimed.

These checks establish source/build behavior only. Current rendered visual/responsive QA remains NOT VERIFIED because browser use is disabled in Work settings. This working-tree redesign has not been committed, pushed or deployed in this turn.
