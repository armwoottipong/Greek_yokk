# Shared chart presentation

Dashboard and catalog finance adapters reuse:

- `ChartMark`: accessible interactive SVG/HTML mark. Forwards geometry/data attributes and emits `highlight`, `clear` and `activate`. Handles Enter/Space once and preserves the original DOM target for tooltip positioning.
- `DonutSlice`: normalized circle geometry; accepts center/radius/stroke width, percentage and offset. Uses ChartMark for interaction.
- `ChartLine`: normalized animated SVG path; adapters supply path data and selection attributes.
- `chartPalette.js`: one palette used by financial series, dashboard series and tooltip swatches.
- `charts.css`: chart-only layout, selected states and reduced-motion-aware animation. Catalog components do not import the Dashboard page CSS.
- `../ui/SegmentedControl.vue`: controlled selection, optional icons, accessible group label and caller-provided per-button attributes.
- `../ui/ChartTooltip.vue` and `../../composables/useChartTooltip.js`: common tooltip rendering and lifecycle; `useChartMarks` adds simple mark selection for catalog adapters.

DashboardTrend retains date buckets, scales, grouped bars and multi-series selection. DashboardBreakdown retains category totals/ranking. Catalog adapters retain negative profit, zero-price eligibility, gaps for unknown costs and per-serving units. Reuse the presentation primitives; do not coerce those different datasets into the same business model.
