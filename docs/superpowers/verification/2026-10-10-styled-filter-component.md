# Styled reusable filter component

User brief: turn history filtering into a styled, quality filter component. Preserve the previously requested anchored dropdown and range calendar.

Design: desktop dropdown has a left column for field choices/quick ranges and a right column for dates. Mobile stacks these in one scrollable body; action footer remains visible. Use existing Thai and numeric fonts with white #ffffff, stone #292524/#57534e, borders #d6ded9, emerald #16634d and selected-range #ecf7f0. The selected time range is the visual emphasis. Remove the duplicated calendar footer preview and present start/end separately. No new dependency.

Architecture: FilterDropdown.vue accepts a unique id, title, open, anchor element, flat values and field schema (key, label, options, optional defaultValue). It owns presentation, positioning, draft state, date presets and apply/close events. It has no store dependency. Caller-defined select fields default to 'all' on reset unless a different defaultValue is supplied. Caller mounts it alongside its parent dialog so ModalShell can manage sibling inert layers. ActivityLogModal supplies context fields and receives applied values, retaining filtering/CSV/domain logic.

Presets: today, last7/30 inclusive Bangkok business days, all dates. Manual range selection retains reverse/cross-month and single-day semantics. Calendar uses emerald endpoints/continuous tint and has optional showPreview to avoid duplicated information.

Verification: preset test observed RED before implementation, then passed. 22 files /150 tests passed; lint, build and diff check passed. A standalone component test exercises caller-defined status fields without the POS store, preserving caller values until Apply. Independent read-only review found no P1/P2 findings; its 12 focused tests passed.

Browser: disposable Demo origin localhost:3014 only. Desktop two-column layout,7-day preset (4..10 October2569), Apply and focus restoration checked. Responsive iframe screenshots at320x640 and390x844; at320 panel x8..312 with footer clientWidth=scrollWidth302, date body scrolls. At390 the whole calendar is visible. No captured warning/error console. Screenshots saved outside repo.

Rulings: existing user authorization to redesign difficult UX and explicit requested follow-up cover this bounded design. Prior explicit push-to-deploy authorization persists; integrate and push main after merged checks. Reviewer declined speculative generic validation and preserved positioning concerns without demonstrated regressions; parent covers browser/full-suite evidence.
