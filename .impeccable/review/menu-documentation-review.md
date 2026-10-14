# Menu documentation review

Disposition: recorded after the final finish review's `ship` disposition on 14 October 2026. Scope is a narrow merge of the approved shared-control extension and menu surface facts; no source changes or unrelated drift repair.

## Authority and inherited-system comparison

PRODUCT.md and DESIGN.md remain the incumbent authority: cream surfaces, mascot burgundy, Prompt Thai UI, Plus Jakarta Sans numeric contexts, named actions and contextual detail in an Operate workspace. AppInput reuses the existing soft/text palette, body role and 12px pos-field radius. AppSearch composes it with the existing IconButton and global search focus treatment. RecipeEditorRow composes existing FormField/AppSelect/IconButton with the new shared input rather than introducing a separate control vocabulary. No new color, font, radius or spacing primitive was added. The existing Named State and One Transaction rules remain unchanged.

## Files recorded

- DESIGN.md: added the evidenced input-affixed component token and shared AppInput/AppSearch/RecipeEditorRow roles; reconciled the menu editor's price-grid behavior without changing the Add-on rule.
- .impeccable/design.json: retained every incumbent token extension, sample and narrative entry; added shared-control role metadata and one self-contained affixed popup-field sample; clarified that the old platform-price-grid sample represents Add-on.
- .impeccable/surfaces/menu-management.md: recorded directory/toolbar/editor reflow, all-channel detail/edit access, mounted disclosures, shared recipe rows and final picker target correction, plus final evidence boundaries.
- .impeccable/surfaces/system-interface.md: replaced only the stale Menu/Add-on paragraph with current menu-list behavior and retained Add-on's existing presentation.
- This review records the documentation boundary and evidence.

## Evidence inspected

Read the shipped documenter agent instructions and reference/document.md; PRODUCT.md, DESIGN.md, the incumbent sidecar and both surface contracts; MenuView.vue, MenuCard.vue, CatalogToolbar.vue, MenuRecipeDetails.vue, MenuEditModal.vue, EmojiPickerPopover.vue, AppInput.vue, AppSearch.vue, RecipeEditorRow.vue, and the global field/search/compact-typography rules in src/assets/main.css.

The final menu-finish-review.md reports `ship`, resolving its sole picker-category finding through shared 44px Button targets and aria-pressed; it inspected refreshed menu-icon-picker-desktop.jpg and menu-icon-picker-mobile.jpg. The complete capture packet is listed in the menu surface contract. This documentation pass relies on that visual review rather than claiming a separate capture review. menu-layout-checks.json directly confirms no measured document overflow at 390/820px and equal editor body/scroll widths at 320/390/820px.

Parent verification evidence: full suite 462/462 before the final picker adjustment; focused menuRenovation/dialogLayers 6/6, lint, build and git diff --check after it. These checks were not rerun by the documenter. Documentation checks: sidecar parses as JSON; diff was inspected for preserved incumbent values and narrowly scoped edits; git diff --check passes.

## Not canonized or repaired

The detector's nine advisory typography findings and existing small secondary metadata are not promoted into a new essential-information type role. The icon picker's legacy white/stone overlay styling and pre-existing sidecar references to POS whole-order-note fields remain outside this documentation boundary; no palette or field rule was invented to justify them. No concept roll, seed, quality card or image-comp approval is claimed for this inherited extension. Physical Safari/iPad, screen-reader, physical keyboard, 200% zoom and paper receipt results remain unverified; viewport emulation does not establish them.
