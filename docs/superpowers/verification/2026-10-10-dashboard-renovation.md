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
