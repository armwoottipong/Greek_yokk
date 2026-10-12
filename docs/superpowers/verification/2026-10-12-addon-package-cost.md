# Add-on Package Cost Verification — 2026-10-12

## Scope

Verified schema v4 migration, stable inventory types, multi-row Add-on BOMs, order-level Package adjustments, shortage checkout, split cost reporting, and Google Apps Script round trips against the approved design and implementation plan.

## Automated evidence

- `npm test` — PASS: 65 files, 389 tests.
- `npm run lint` — PASS: ESLint exit 0.
- `npm run build` — PASS: Vite production build completed in 8.56s.
- Critical workflow selection — PASS: 11 files, 166 tests covering schema migration/idempotence, Package planning, adjustment retention/reset, shortage checkout and zero-floor allocation, split reports, GAS recovery/round trip, dialog focus, Package review, receipt, and responsive dashboard presentation.

Logs are retained in the ignored task workspace at `.superpowers/sdd/2026-10-12-addon-package-cost/task-9-*.log` until final review cleanup.

## Migration and backup

- Fixture: `tests/data/schemaV4.test.js` version 3 snapshot.
- Confirmed deterministic migration to schema 4 for `inventoryType`, Add-on `recipe[]`, historical split-cost defaults, and typed shortage evidence.
- Confirmed a second canonical normalization is semantically identical.
- Confirmed schema 4 frontend export is byte-equivalent after the actual GAS chunked snapshot write/read path.
- Confirmed invalid types, recipe references/quantities, costs, adjustment reasons/notes, and unsafe stock values are rejected without replacing the committed backup.

## Critical POS scenarios

Automated component/store coverage confirms:

- normal Menu checkout does not open Package review automatically;
- Menu and Add-on recipe rows contribute Package defaults with source attribution;
- a whole-order Package can be added using a standard reason;
- adjustment deltas survive cart quantity changes without mutating Menu/Add-on recipe snapshots;
- Package shortage confirmation permits sale without a substitute, stops stock/lots at zero, records a typed shortage event, and separates fulfilled cost from expected missing cost;
- simultaneous ingredient and Package shortages appear in one decision and commit nothing before confirmation;
- archived or retyped manual Package selections block checkout while preserving cart and adjustments;
- receipt, cart, and period dashboard render ingredient cost, fulfilled Package cost, combined cost, and expected missing Package cost without changing customer subtotal;
- dialog focus trapping, Escape/cancel recovery, adaptive cart, iPad navigation, and mobile dashboard paths remain covered.

## Responsive/browser gate

Responsive behavior is covered by component tests and CSS breakpoints for phone (`<=600/767px`), iPad rail/adaptive cart, and desktop layouts. A live local-browser smoke pass was attempted against `http://localhost:5173/`, but the in-app browser blocked localhost (`ERR_BLOCKED_BY_CLIENT`) and no Chrome automation surface was available. Therefore no browser screenshots are claimed. A final human smoke pass at 320px, 390px, iPad portrait/landscape, and desktop remains an external release gate.

## Non-negative Package confirmation

Allocation and checkout tests confirm Package stock and lot quantities stop at zero. Saved `requestedQty`, `fulfilledQty`, `shortageQty`, `fulfilledCost`, and `expectedShortageCost` are non-negative and schema-validated. Only `adjustmentQty` may be negative as an explicit order delta; effective requested quantity clamps to zero without rewriting that delta or a recipe.

## Safety statement

No production checkout, live Google Sheets write, deployment, push, or merge was performed. Verification used isolated local storage, the in-memory GAS harness, and the managed Git worktree only.
