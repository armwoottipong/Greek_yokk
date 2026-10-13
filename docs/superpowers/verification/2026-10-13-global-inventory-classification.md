# Inventory classification verification — 2026-10-13

## Final result after independent review

- Baseline: 65 files, 398 tests passed.
- Final suite after review fixes: 69 files, 430 tests passed (`npm test`).
- `npm run lint`: exit 0.
- `npm run build`: exit 0; Vite production build successful.
- No changes to seed data, database schema, local-storage implementation or GAS backend. No migration, live sync, deployment or live-data edits performed.

## Covered behavior

- Three types derive from existing fields independently of category names and old primary/secondary flags.
- Recipe saves immediately update production usage without changing stock; overlapping roles and last-reference removal work.
- Add-on references are direct, include quantity and source name, and do not recursively mark production inputs.
- Stock filters combine type, usage and archive selection. Sales search works without category strips; category settings and sales-category fields are removed.
- New stock requires receipt/production origin for ingredients; expiry is optional and validated before mutations. New dated lots do not absorb undated historical lots.
- Production consumes inputs and adds output; sale consumes output and separately consumes a directly selected input add-on. No production-input deduction is repeated on sale.
- Legacy category and lot records round trip unchanged; derived types/usage are not persisted as new schema fields.
- Invalid empty production recipes or nonpositive yields cannot be saved as produced materials.

## Browser inspection

Inspected the actual Vite app at `http://127.0.0.1:5181/Greek_yokk/` in a separate browser origin containing zero materials/menus. Checked stock filters and the three choices in the new-material form at desktop 1440×900 and mobile 390×844. Mobile dialog measured 374px within the 390px viewport. Did not save materials, reset demo data, perform a sale, or connect GAS in the browser; populated workflows are covered by isolated automated tests.

The mechanical design scan reported existing typography advisories and four existing Stocktake font warnings; the font-family declarations were unchanged by this work. Impeccable also reported pre-existing DESIGN sidecar drift and missing buildPath configuration. Those project-design metadata repairs are outside this change.

## Implementation rulings

- Used equivalent PowerShell task/ledger tracking for the POSIX helper scripts on this Windows host; commit history and test logs retain task evidence.
- Dated lots merge only when both origin and expiry match; this preserves each receipt's dates and may produce more distinct lots.
- Active-lot summary clears absent dates rather than showing a later receipt's expiry; old unknown dates remain unknown.
- Regraded the preview mismatch as Important: promising a merge when receipt creates a new lot misleads lot control. Cost if overgraded: a small preview fix and regression test.
- Retained legacy type inference for records missing inventoryType because migration/data repair is excluded. Cost: incomplete historical records remain ambiguous until edited.
- Retained physical count corrections as adjustments, distinct from receipt/production events. Cost: corrections may retain unknown lot dates.

## Independent review

Independent whole-branch review identified stale summary dates on manual/automatic lot switches, indistinguishable adjustment-lot options, and receipt-preview matching that differed from receipt execution. All were addressed in one fix pass.

Four regression cases first failed for the reported behavior; the targeted 18 tests then passed. The final full suite passed 430/430, lint and build exited 0, and diff whitespace checks passed. Selected lot summaries now clear absent dates, adjustment options show lot ID and optional expiry, and previews merge only when both origin and expiry match. No deferred minor findings remain.
