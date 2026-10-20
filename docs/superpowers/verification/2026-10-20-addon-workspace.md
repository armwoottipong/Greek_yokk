# Add-on workspace verification — 20 October 2026

Implementation candidate in C:/Users/user/.codex/worktrees/addon-dashboard-workspace/Greek_yogg. Current surface: [.impeccable/surfaces/addon-management.md](../../../.impeccable/surfaces/addon-management.md). No Add-on production deployment is recorded.

## Five-line system summary

1. Inherit cream/burgundy, Prompt and the established menu workspace composition.
2. Show active identity/add/edit/direct trash in the header, left selection list, central all-channel analysis and responsive recipe rail.
3. Reuse bar/donut/line with explicit-zero Add-on prices configured and unset prices hidden.
4. Preserve the original add/edit popup, separate option groups section and local non-outline keyboard feedback.
5. Keep incremental standard-price analysis honest about group-price exclusions and unknown costs, without changing global tokens.

## Inspected implementation

Reviewed the current source diff, PRODUCT.md, the impeccable document reference and historical Add-on brief. Key sources: src/views/AddonView.vue, new src/components/catalog/AddonRecipeDetails.vue, shared MenuPlatformOverview/PlatformFinanceDonut/PlatformFinanceLines, menuFocus.css and AddonEditModal.vue; updated workspace/renovation regressions were also inspected.

AddonView replaces directory rows/details sheet with the selected-item workbench. Header carries identity/status/counts, add/edit and a direct trash button opening confirmed delete. Search/selection are local, groups remain in a separate mounted section, and phone list/detail switching retains a back route. Successful creation follows savedAddonId; recipe actions open the original popup at the recipe section. The corrected back-focus selector uses data-addon-select/dataset.addonSelect rather than a menu selector.

AddonRecipeDetails composes the shared analysis with includeZeroPrices and Add-on-specific labels. A stored numeric zero surcharge remains a configured channel; missing/null/blank/invalid values are excluded from rows and the line key. Menu callers keep their positive-price-only default. The visible explanatory note excludes base-menu revenue, group custom prices and included-free choices. Costs are incremental Add-on recipe costs; unknown rows propagate null to groups/total/analysis, while known zero and no-deduction recipes remain zero.

Recipe details retain ingredients, packaging, quantities, per-item costs, stock and missing/archived warnings, plus group usage. The existing DialogFrame add/edit form, validation/save/close semantics and native/shared controls remain. No outline/ring/halo is added; scoped fill/underline/label/search-icon cues and forced-colors source rules extend the inherited pattern. DESIGN.md and .impeccable/design.json are unchanged; no global design drift is canonized.

## Current rendered evidence

The documenter inspected these actual browser captures in [.impeccable/review/addon-workspace-2026-10-20](../../../.impeccable/review/addon-workspace-2026-10-20):

| Capture | Observed state |
| --- | --- |
| desktop.png | 1440px, selected Add-on, bar analysis and right recipe rail |
| phone-320.png | 320px selected detail, donut, wrapped actions/figures |
| editor-320.png | Original editor at 320px, one-column channel prices and reachable save/cancel footer in capture |
| ipad.png | 768px tablet navigation/list with line comparison; recipe stacks below |
| wide.png | 1920px, two-column platform reports and right recipe rail |

Implementer-reported actual browser-width measurements at 320/768/1440/1920px found no horizontal overflow. Captures establish these states, not every interaction or offscreen section. They are separate from historical directory/group captures and old test counts.

## Verification status

| Check | Status |
| --- | --- |
| Source review | One back-focus data-selector defect identified; regression observed RED, fixed GREEN |
| Focused follow-up | Implementer reports 11 tests passed |
| npm test | PASS: 98 files / 618 tests |
| npm run lint | PASS |
| npm run build | PASS: 1749 modules |
| git diff --check | PASS |
| Browser widths and five captures | Current evidence inspected; no-overflow measurement reported above |
| Physical Safari / physical iPad / 200% zoom | Not verified |
| Comprehensive keyboard / assistive-technology acceptance | Not established by the screenshots |
| Add-on production deployment | Not performed |

The documenter did not independently rerun tests or browser measurements. Final command results above were confirmed by the implementer; addonWorkspace passed 11 tests after the selector fix. Only this record and the Add-on surface brief were written in this documentation pass, within this worktree; source, global DESIGN.md/design.json and other worktrees were untouched.

## Follow-up alignment with main

Main through eb4a478 is merged into codex/addon-dashboard-workspace. Shared-chart conflicts preserve includeZeroPrices and unit/price/entity labels alongside Dashboard styling and interactions. Add-on uses a direct confirmed trash action and the shared AnalysisInfo component for both accounting definitions and standard-price exclusions. AddonEditModal receives the same focused-label background correction as MenuEditModal. Existing addon-workspace-preview.html is unrelated untracked work and is preserved. The prior screenshots do not represent this follow-up; browser rendering has not been reverified.

Follow-up source verification: 100 test files / 623 tests PASS; npm run lint PASS; npm run build PASS; git diff --check PASS. New regressions cover direct trash confirmation, shared Add-on accounting tooltip and existing zero-price behavior across all graph modes.

## Shared component refactor

Menu and Add-on now compose CatalogWorkspace, CatalogHeader, CatalogBrowser and CatalogEmptyState. Views retain store/domain/modal state and saved-ID focus coordination; the shell exposes its DOM element for caller-owned focus restoration. Dashboard, Menu and Add-on use SegmentedControl, ChartMark, DonutSlice and ChartLine with a common palette and chart-only stylesheet. Catalog no longer imports the Dashboard page stylesheet. Component responsibilities and extension boundaries are documented in src/components/catalog/README.md and src/components/charts/README.md.

Verification: 101 test files / 626 tests PASS; lint/build/diff check PASS. A read-only review found no actionable regressions. Existing preview/screenshot acceptance does not cover this structural refactor; no production deployment is recorded.

## Follow-up: unpriced Add-on channels and sidebar list

The user requested unpriced Add-on platforms hidden, superseding the earlier explicit-zero display rule. Analysis and header counts now share parsePlatformPrice and show only positive configured prices across bar/donut/line modes. The editor omits blank, whitespace and unset prices instead of manufacturing zero entries; deliberately entered zero remains valid stored data. All-unpriced Add-ons show the existing price-setting next step. POS and group-option price behavior is unchanged. Regression tests cover unset/blank/whitespace/zero/negative/invalid values, all chart modes, counts and editor blank persistence.

Shared catalog list padding is zero, item corner/border declarations are removed, and its scrollbar is 3px where WebKit scrollbar styling is supported, with a thin native fallback elsewhere.
