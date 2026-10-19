# Option groups verification

Implemented reusable groups in Add-on management and multiple group assignments in the menu editor. POS enforces distinct-kind or repeated-portion limits. Included groups contribute zero selling price while all chosen recipes consume inventory. Extra groups inherit add-on channel prices unless overridden per option. Cart/receipt show group identity and repeated quantities.

## Automated evidence
- Final `npm test`: 89 files, 549 tests passed (including 18 group domain/store tests and 5 group interaction tests).
- `npm run lint` and `npm run build`: passed after final product changes.
- `git diff --check`: passed.
- Tested schema-4 optional fields, legacy defaults, local roundtrip, real GAS snapshot harness roundtrip, min/max, duplicate/foreign choices, invalid portions, free and paid choices on the same menu, platform refresh and merging, repeated packaging consumption and immutable sold orders.
- Regression tests first reproduced blocked dialog focus, a discard prompt after successful save, stale grouped selections after switching to legacy, and cart merging after refreshed group prices; all pass after fixes.
- Independent review identified the stale grouped-to-legacy checkout issue; fixed and covered. Existing cart price/recipe snapshot behavior retained. Checkout validates current assignments and limits, while sold orders never depend on current groups.

## Browser evidence
Separate development origin `127.0.0.1:3019`; demo catalog only, no production deployment or live Sheets calls.
- Created a free group requiring exactly 3 kinds from 4 fruit choices, and an optional paid group allowing repeats up to 2 portions; assigned both to the demo Size M menu.
- Real mobile flow selected 3 free fruits and granola at +15: base 99, cart total 114. Cart displays free choices as included.
- 390px editor: document width 390, editor client/scroll widths 368/368; name field focused outside inert app.
- 390px POS: document width 390, drawer width 390, body client/scroll widths 384/384.
- 820px and 1280px directories: document widths equal viewport widths.
- Images and measurements: `.impeccable/review/option-groups/` (`editor-mobile.png`, `cart-mobile.png`, `pos-desktop.png`, `pos-mobile.png`, `groups-820.png`, `groups-1280.png`, `layout-checks.json`). These are actual local UI captures, not generated raster assets.
- Mechanical detector ran once on changed surfaces: advisory typography findings matching inherited UI scale; no blocking findings. No palette/type redesign performed.

Physical iPad/Safari, physical keyboard, screen readers and paper printing were not tested. No commit, push or deployment performed.
