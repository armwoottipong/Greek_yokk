# Shared catalog and chart components implementation plan

**Goal:** Make Menu, Add-on and Dashboard reuse components and chart presentation without changing financial or navigation behavior.
**Architecture:** CatalogWorkspace owns layout, CatalogHeader owns identity/actions, CatalogBrowser owns search/selection and CatalogEmptyState owns the empty view. Views retain store actions, costs, saving and focus coordination. SegmentedControl and ChartMark provide shared controls and accessible chart interaction; chart adapters retain their own geometry and semantics. Shared chart CSS must not depend on importing the Dashboard page stylesheet.
**Constraints:** Work on codex/addon-dashboard-workspace. Keep selectors, Thai copy, mobile navigation, saved-ID selection, unknown-cost handling and explicit-zero Add-on prices. Preserve the untracked preview. No production deployment.

- [x] Add behavior tests for segmented controls and chart keyboard/mouse events, including SVG namespace and no duplicate native activation.
- [x] Extract SegmentedControl and adopt it in Dashboard and finance chart controls.
- [x] Extract ChartMark and reuse it in Dashboard and finance marks. Extract shared chart styles and palette from the Dashboard page.
- [x] Extract catalog workspace/header/browser/empty components and adopt them in MenuView and AddonView. Keep business calculations in the views.
- [x] Run existing catalog, navigation and chart regressions, then full tests, lint, build and diff checks. Review final diff and record outcomes.
- [x] Commit and push the current feature branch.

## Verification and review

101 test files / 626 tests PASS; npm run lint PASS; npm run build PASS; git diff --check PASS. Focus/navigation, saved-ID selection, Add-on zero surcharge, negative/unknown costs, SVG namespace and Enter/Space activation are covered by existing and new behavior tests. An independent read-only review found no actionable regressions; adjacent repeated shared-CSS media blocks were consolidated for readability. No new browser-rendered acceptance or production deployment is claimed.
