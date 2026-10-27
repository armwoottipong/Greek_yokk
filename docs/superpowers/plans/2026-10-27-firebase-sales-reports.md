# Firebase sales reports implementation plan

> For agentic workers: use superpowers:executing-plans inline; one final focused review.

**Goal:** Enable the original Dashboard UI with server-confirmed Firebase sales,
historic costs, Thai date ranges, channel totals and cancelled bills excluded.

**Architecture:** Reuse DashboardView through its established optional-model
pattern. A separate read-only report reader pages native orders by createdAt and
document ID within Bangkok day bounds, loads immutable imported order archives
once per identity/generation, and fences results with the shop revision. Never
reuse the 100-order history list or local Pinia data. No Rules/billing changes.

**Tech stack:** Existing Vue, Firebase SDK12, original dashboard/domain/chart UI.

## Acceptance and decisions

- Preserve layouts/styles/components; wire data and existing controls only.
- Use receipt cents and original line snapshots, not current menu prices/costs.
- Include imported history already in Firebase; retain source identity even if
  an old order ID equals a native order ID. Normalize original catalogue IDs.
- Cancelled bills do not contribute on their original sale date, as in the
  existing dashboard. This is sales reporting, not refund-date cash accounting.
- Range reads paginate250 documents; cap10000 per native range/legacy manifest.
  Exceeding bounds, missing archive, stale identity, offline/error or busy root
  must hide financial totals and explain retry/narrower dates, never show partial
  data as complete. Legacy immutable pages are cached only in memory.
- Lazy-load reports only while the report tab is active; refresh on shop revision,
  reconnection, date selection and the existing reload control. Fence async races.
- Keep stock draft behaviour and shared receipt modal; missing historical addon
  unit prices are labelled as included in the recorded total, not guessed.

## Tasks

1. [x] RED/GREEN projection and reader tests: stored cents, returns, duplicate IDs,
   invalid dates, Bangkok midnight, >100/tied-date pagination, legacy completeness,
   root retry/context changes and failure bounds. Implement report reader/projection.
2. [x] RED/GREEN original Dashboard injection/UI tests: sidebar, date controls,
   financial totals, receipt, inventory view, loading/error/stale-result safety.
   Wire the original view into the cloud shell; no redesign or local fallback.
3. [ ] Run relevant unit/native proofs, full tests/lint/build and focused review.
   Read-only live reconciliation (including cancelled test bill), commit/push/Pages,
   verify Actions and exact live version/asset and report scoped completion.

## Review rulings

- Preserve the shared receipt modal object (Object.assign), because checkout
  retains its original reactive reference. Regression test asserts identity.
- Keep the original date toolbar mounted/visible on read errors; gate only the
  financial/report body so oversized ranges can be narrowed without a reload.
- Imported native menu snapshots omit names until first authored. When no name
  was stored, label the current display name explicitly as current; never claim
  an unavailable historical label. Exact recorded monetary totals stay unchanged.
