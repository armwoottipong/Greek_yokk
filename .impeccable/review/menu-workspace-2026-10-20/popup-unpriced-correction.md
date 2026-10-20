# Menu workspace — restored popup and unpriced platforms

Source-only correction record, 20 October 2026. The user explicitly restored the original add/edit popup after the inline-editor iteration. Current surface authority: ../../surfaces/menu-management.md. Earlier documentation.md, source-review.md, screenshots and test counts describe preceding snapshots.

## Five-line system summary

1. Keep the cream/burgundy, Prompt shop workspace and approved ภาพรวมร้าน style reference.
2. Retain left menu selection, center/top all-platform reading analysis and responsive recipe rail.
3. Restore the original MenuEditModal/DialogFrame add/edit flow and shared form controls.
4. Show unset/zero-priced platforms as static skeletons labeled “ยังไม่ได้ตั้งราคา”, without financial values or plotted points.
5. Preserve scoped no-outline styling; leave DESIGN.md, design.json and global tokens unchanged.

## Source evidence

Read .agents/skills/impeccable/reference/document.md and the current source diff. Inspected MenuView.vue, MenuEditModal.vue, MenuPlatformOverview.vue and PlatformFinanceLines.vue under src, with the existing layout record for MenuRecipeDetails/MenuRecipePanel.

MenuView now opens store.modals.menuEdit for add/edit; MenuEditModal renders DialogFrame again. Inline frame/preview code and the workbench dirty-navigation notice were removed. The original useModalForm requestClose/confirmSave flow handles popup close/save. The reading workspace composition remains; the 290px recipe rail depends on an 800px menu-content container, with stacking below it and phone list/detail switching below a 768px viewport.

MenuPlatformOverview accepts only finite prices greater than zero for analysis. Unset/zero prices take the named unpriced branch with a static skeleton shaped for the selected chart mode and an edit prompt. The metrics and normal graph branch are excluded. Row cost, GP amount and profit are null for these platforms, and PlatformFinanceLines omits nonnumeric points and breaks paths across gaps. Names/order may remain in the chart key, and the shared recipe-cost context remains visible. Positive-price platforms keep existing financial/chart behavior. No stored-price/schema migration is introduced by the display rule.

The no-outline request is applied through scoped workbench/menu-popup CSS. Cream surfaces, existing chart colors and shared controls are inherited. Skeleton geometry, local layout and focus suppression are recorded as surface implementation; no global design drift is canonized. DESIGN.md and .impeccable/design.json were not edited.

## Verification boundary

Visual/responsive/rendered keyboard QA: NOT VERIFIED. Browser use is disabled by Work settings. No current screenshot, viewport measurement, device or accessibility result is claimed. Older popup/graph captures do not show this correction.

Correction tests/checks are in progress at this documentation snapshot. The documenter did not run source tests and records no current pass count, completed build or deployment. Earlier inline-workspace verification totals are historical only.

This correction changed documentation only in .impeccable/surfaces/menu-management.md and this new popup-unpriced-correction.md. Earlier records remain preserved.

## Verification outcome

Full suite: 95 files, 581 tests passed. After the final popup CSS scope adjustment, 26 focused tests passed without the temporary class-forwarding warning. Source reviewer scored the no-outline fix resolved at source scope; no rendered acceptance is implied. Lint and production build passed; production deployment verification is recorded separately after release.
