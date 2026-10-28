# Firebase parity release — 28 October 2026

This release completes the remaining implementation gaps identified after the
inventory, catalog, reporting and backup releases. Cash/QR selection and payment
method recording remain excluded by the user's instruction. Earlier dated
experiment/trial documents describe their release at that time, not this release.

## Supported workflows

- Original product UI and sidebar with Firebase command/data bindings.
- Sale, stock deduction, cancellation, receiving, production, stocktake, waste,
  lots, catalog/settings, reports and business snapshot export from prior releases.
- Original Package review dialog now supports bill-specific quantities, reasons
  and notes. The saved bill retains the original packaging baseline/name/unit/cost;
  cancellation restores the actual allocations exactly once. Recipe edits do not
  rewrite historical packaging reports.
- Historical bill conversion requires exact original allocation/lot evidence.
  Missing or ambiguous evidence blocks conversion. Archives remain intact;
  reports deduplicate the converted bill. Direct server lookup supports old bills
  beyond the most recent 100 receipts.
- Owner-computer recovery supports native snapshots, original legacy JSON, an
  actual empty reset, and the original demo catalog without invented sales.
  Settings previews files; final writes use reviewed owner CLI plans. See
  [owner recovery](owner-recovery.md) for commands and safety boundaries.
- Empty and small shops use only actual materials; there are no hidden stock
  placeholders to satisfy the sale proof profile.

## Operational boundaries

Firebase Spark and Google login remain unchanged; logged-in users are equal.
Offline shop writes remain blocked and pending commands/carts are retained.
Sales use at most 16 distinct physical materials per bill. Existing line, lot
and production limits still apply; this release does not remove them.
Recovery currently accepts at most 450 business documents, each at most 800 KB,
so every staged document can be verified in the atomic activation commit.

The production compiler accepted the generated Rules at 255,301 bytes, below
the 256,000-byte limit. Dispatch factoring retains all validation predicates and
their order; it shares only repeated operation-kind access. Native proof covers
the supported small/15/16-material profiles and invalid writes.

## Live-data migration gate

The prepared historical-bill backfill copies the current business snapshot into
a new generation and converts four archived bills (two still eligible for
cancellation). Read-only preflight verified all 105 source business documents,
unchanged stock/prices/report totals, and an unchanged root baseline. The old
generation is retained. No historical bill is actually cancelled as a live test.

Source deployment is separate from this live generation switch. The reviewed
plan must still match the live baseline immediately before staging/activation;
a business write invalidates it. Reload clients around the switch and reconsider
old cart/draft contents. Reset/demo/old-backup recovery must never be applied to
the active shop merely to test these features.

UI interaction verification on the live release requires browser control to be
enabled in Work settings; it was disabled during this continuation. Production
asset verification and emulator/UI tests do not replace that final device check.

## Release verification

- Ordinary suite: 179 files passed; one optimizer integration expectation still
  assumed the old byte pipeline. After updating that expectation, all 22 tests
  in both optimizer files passed. Its inverse predicate-preservation proof was
  unchanged. The publishing workflow runs the complete ordinary suite again.
- Native Firestore release suite: 12 files, 163 passed, 3 intentionally skipped.
  The private-backup rehearsal and historical-bill return proof were enabled.
- Source/test/new-script lint, production build, generated Rules equality and
  diff whitespace checks passed. The existing large-chunk build warning remains.
- A focused review restored all 56 factored dispatch alternatives across 14
  generated scopes and confirmed the original predicates and order.
