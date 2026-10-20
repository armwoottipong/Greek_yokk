# Menu platform financial overview — 20 October 2026

## User outcome

Selecting a menu opens a dashboard-style overview for every configured platform, without selecting a channel in the detail sheet. Native named buttons switch between bar, circle and line representations while the full financial data remain visible. The catalog's existing channel selection and POS channel remain independent and unchanged.

## Implementation

- MenuRecipeDetails uses the existing sheet frame at 960px desktop width. MenuPlatformOverview lays platform details out in two desktop/tablet columns and one phone column.
- Every platform reports selling price, current recipe/estimated cost, GP amount, net revenue, profit, selling-price shares and margin against net revenue. Average/worst free-option estimates update all platforms together. Paid Add-ons remain outside the estimate, as before.
- Bar charts use a shared baht scale and nonnegative segments. Negative profit is reported explicitly and marked at the selling-price position.
- Circular charts use selling-price proportions for nonnegative profit; loss cases explicitly show the composition of cost plus GP instead, with a separate loss figure. No negative wedge or invented percentage is drawn.
- Lines compare cost, GP and profit by numbered platform category. A shared numeric axis includes zero and losses. Missing values break the line instead of becoming zero. The line shape does not represent sales history.
- Source-local chart roles and the established cream/burgundy system are retained. No store, checkout, inventory, storage schema or sync logic changed.

## Validation

The new all-platform tests were observed failing before implementation. Graph-mode switching/sign/gap tests were likewise observed failing before the three-format extension. Final npm test: 94 files / 573 tests PASS; lint/build PASS; diff check PASS. Tests cover all-platform visibility, reactive GP and prices, missing/zero price, invalid GP, unavailable cost, shared bar scale, average/worst cost across platforms, chart switching without mutation, negative line placement and missing-data gaps.

Browser evidence used a temporary in-memory synthetic fixture, not shop data. Inspected 1440x1000 desktop, 820x1180 tablet, 390x844 and 320x760 phones. Document widths matched viewport; measured dialog client/scroll widths were 772/772 at820, 368/368 at390 and 298/298 at320. Final graph captures and independent ship verdict are in .impeccable/review/menu-platform-overview-2026-10-20. Physical Safari/iPad, assistive technology, 200% zoom and production transactions remain unverified.

Detector ran for the three-format extension: advisory literal typography and 3px legend corner only. No global design-system migration was performed. Documentation comparison is recorded in documentation.md alongside the evidence.
