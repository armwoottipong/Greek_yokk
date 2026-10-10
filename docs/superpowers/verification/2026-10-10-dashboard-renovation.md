# Dashboard renovation

## Delivered behavior

- Four selectable views: overview, sales channels, best-selling menus, current inventory.
- Shared FilterDropdown and DateRangeCalendar control an inclusive Bangkok date range for sales metrics, every sales chart, ranking and receipt list. Presets: today, seven days, thirty days, all. Custom ranges are preserved.
- Responsive reusable trend chart supports line, grouped bar and accessible data table. Daily, seven-day or monthly buckets selected by report length; empty dates are zero, losses retain negative coordinates.
- Breakdown component supports ranking bars and optional donut with numeric labels. Menu ranking uses recorded item quantities rather than invented per-menu revenue.
- Recorded order financial snapshots feed metrics. Gross profit explicitly excludes rent/payroll/other expenses. Inventory is current, separate from the selected sales period; category graph discloses unconfirmed drafts.
- Receipt access, shortage warnings and paginated historical orders retained.
- Mascot burgundy/cream palette and existing Prompt/Jakarta typography, keyboard focus and mobile layouts.

## Verification

- TDD red/green coverage: timezone boundaries, reversed custom range, zero days, snapshot totals, ranking, long histories, invalid timestamps, empty UI, shared filtering, receipt access, dialog outside inert app, midnight refresh preserving custom range, mobile dense bars/losses.
- Full suite: 29 files / 169 tests; ESLint and production build checked before integration.
- Browser demo on isolated localhost origin: calendar 1–9 October excludes both 10 October demo orders; seven-day preset restores sales397, GP68.4, cost93.7, profit234.9. Line/bar/table, channel donut, menu ranking and inventory views verified.
- Mobile360px: dashboard width322 equals scrollWidth322, date popup left8/right352/bottom836 within844px frame. Responsive graph viewBox288 keeps labels readable. Escape closes date popup.
- Read-only reviewer findings fixed: midnight preset refresh; negative narrow bar widths. No remaining known blockers.
- Screenshots stored outside repo: dashboard-channels.jpg, dashboard-mobile.jpg, dashboard-mobile-graph.jpg, dashboard-overview.jpg.

## Gentle motion follow-up

- Added finite 220–480ms chart reveal/draw/growth, 260ms donut arrival, 360ms ranking growth and 140ms press feedback. No repeating animations. All motion is gated by `prefers-reduced-motion: no-preference`.
- SVG bars grow from computed zero baseline, preserving negative values. Mode changes replay the graph's reveal.
- Browser confirmed bar animation400ms with origin0/225px matching baseline225px, donut260ms, no console warnings/errors. Static review found no blockers.
- Fresh full suite169 tests, lint and production build pass. Evidence: dashboard-animation.jpg.

## Hover follow-up

- Line points gain a cream-edged marker and a brief soft halo; a date band follows pointer/focus. Trend bars brighten without moving or resizing their data geometry. Continuous hit areas cover the line between dates.
- Donut segments thicken slightly and link to the matching ranking row and numerical detail. Ranking rows also respond to hover/focus/tap. Selection resets on incoming data.
- Added two red/green interaction regressions: geometry preserved, linked selection and reset. Full suite, lint and build pass; total test count171.
- Browser verified three active trend points with280ms halo; donut GrabFood228/57.4% and29px active stroke. Read-only elementFromPoint checks east/west identify the correct donut segments. Clean reload verified; console empty. Review found no blockers. Evidence: dashboard-hover.jpg.
