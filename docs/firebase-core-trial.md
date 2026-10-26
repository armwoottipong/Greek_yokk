# Firebase core trial

The Firebase entry now provides sale/stock deduction, cancellation of new Firebase
bills, receiving and production. Google login is required; all signed-in accounts
have the same permissions. `local.html` keeps the original device-local POS.

## Data and cutover

The initial generation is explicitly a **trial**, compiled from the user's
20 October backup. It is not a statement of today's stock. The trial banner stays
visible on every workspace tab. Do not record real sales in both systems.

The trusted import validates the initial stock/lot totals, material registry,
recipe indexes, production references and reverse indexes, and document sizes.
It creates an inactive generation, reads back every field, then creates the root
with an `exists:false` precondition. It refuses to replace an existing shop.

Original materials, catalogue, orders, activity logs and shortages are archived as
immutable JSON records, preserving legacy values and nested structures. The root
external Sheets connection URL is excluded. The original backup is unchanged.
Legacy bills are readable for historical reference; their cancellation is not
supported by the Firebase core workspace. New Firebase bills can be cancelled there.

Before real cutover: export the latest local backup after finishing pending local
bills, reconcile stock/history, rehearse the current snapshot, and switch once.
Never promote trial balances to current balances without that reconciliation.

## Transaction behavior

- Up to six distinct sale lines with fifteen protected stock items, or four lines
  with sixteen items; quantities of one menu may be combined. The limit is shown
  in the cart and checked before command preparation and again by Rules.
- Explicitly approve displayed shortages. A changed shortage requires a new review.
- Confirmation follows a server receipt, never an optimistic local write.
- IndexedDB retains immutable pending commands. Reload/retry uses the same ID.
- No offline write queue. Offline or unconfirmed connectivity blocks writes.
- An uncertain sale can be fenced and abandoned while retaining its cart.
- Other uncertain commands retain their original intent and must be checked or
  retried; there is no unsafe local “forget command” action.
- Orders load on demand (100 latest), rather than re-reading history after every
  stock change. Use **โหลดข้อมูลล่าสุด** on the bills tab to refresh other sessions' bills.

## Free plan and remaining scope

No billing upgrade or paid backend is enabled. Usage still consumes Firebase's
free read/write allowance; test counts do not guarantee any daily sales volume.
Stock snapshots read the current material registry; history is loaded on demand.

Settings mutations, extended reports, legacy-bill cancellation in Firebase,
preparation-retention housekeeping and broader lot-history management remain
outside this first trial release. Current core bounds allow four working lots per
material and retain historical lots; exceeding a bound stops the command.

## Release checks

1. Import rehearsal: original SHA unchanged, archive roundtrip and initial-state
   validation, byte admission, create-only staging, exact server readback.
2. Native Rules/runtime: sale/cancel/receive/produce on actual source, two equal
   accounts, concurrent sale, same-ID replay, abandoned-sale fence, offline and
   forged-write rejection; six lines, repeat choices and four working lots.
3. Ordinary regression suite, lint, production build and a fresh code review.
4. Real Firebase compiler accepts the generated shop-scoped core policy; save
   the previous live Rules before activation. Default deny remains in force.
5. Deploy Pages, verify Actions and the live commit/entry; test actual browser
   receipts and shared stock before describing the trial as operational.

## Live browser verification — 26 October 2026

Verified Google login and loading the trial data on the published GitHub Pages
site. A marked trial bill received a server confirmation, deducted stock, and
was cancelled through the bills screen. All affected balances returned to their
starting values. Two ingredient receipts and a small production run then received
server confirmations; the output increased and both inputs decreased according
to the stored recipe. The resulting balances survived a page reload.

Desktop and mobile layouts were inspected. The desktop workspace needed an
explicit full width inside the existing flex shell; the mobile stock view fit its
viewport. A second automated browser login could not be completed, so the live
browser verification does not substitute for a two-device rehearsal. Concurrent
commands from two equal accounts are covered by the Emulator runtime tests.

These operations changed only the explicitly marked trial generation. Current
business balances still require a fresh export and cutover reconciliation.

## Latest-source reconciliation — 26 October 2026

The user confirmed the original system on this computer contains all current
business data. A fresh backup was downloaded through that system's export UI.
Compared with the original trial source: materials increased from 18 to 20,
menus from four to five, and activity logs from 29 to 33. The four historical
bills, eleven addons, channel settings and balances of existing materials match.
No menu or material is dropped to fit the earlier prototype bounds.

The latest recipes reference sixteen sale stock items. Four distinct lines per
bill keep sixteen stock guards, two price witnesses, root and receipt within
Firestore's twenty-document Rules access allowance. A fifteen-item shop retains
the original six-line limit. The extra material's deduction, cost and restoration
are validated, including rejection of an omitted sixteenth write.

Two physical devices read the same trial stock. The user then confirmed the
second device observed a second stock update without pressing reload. These
changes are marked trial receipts and do not change the original local data.
This demonstrates cross-device reads and live updates; concurrent command
contention is additionally covered by two-account Emulator tests.

The reconciled candidate must be staged with create-only writes and exact
readback. Staging leaves the active trial root unchanged. Switching the actual
business generation remains a separate, reviewable cutover step.

## Actual cutover completed — 26 October 2026

After explicit user approval, a final local export was compared with the staged
source. All business records and revision matched; only the export timestamp
changed. Every staged document was read back again before one atomic commit
switched the active generation and set its display flag to `trial:false`.
Update-time preconditions protected both changed documents. The previous
generation and both original backups were retained.

Post-switch server checks matched all twenty material balances, five menus, four
legacy bills and thirty-three activity records. Trial receipts and trial production
were excluded. Both physical devices showed five menus without the trial banner.
The new menu calculated correctly in a temporary cart; it was removed without
creating a live sale. Use the Firebase entry for current operations; local data
remains a separate historical copy.


## Original product UI on Firebase (26 October 2026)

The cloud entry now reuses the original sidebar, menu catalogue/cards, cart,
receipt, stock summary/material rows and lot list. Menu customization and stock
forms use the original dialog and form components/styles. The cloud presentation
passes an explicit model; it does not instantiate the local POS store. The
existing cloud command service remains the sole sale/receive/produce/cancel
write path, including the four-line bound and immutable pending-command retry.
Receipts open only after the matching server-confirmed sale.

Dashboard reports, catalogue editing and settings remain visibly disabled.
Stock adjustment, stocktake, waste, manual lot selection, package overrides and
payment-method recording are not offered as supported cloud actions. Core
receiving and production use the base units shown in their forms. Archived bills
remain read-only. Original local.html behavior is preserved separately.

No Rules, generation, live balance or billing changes are part of this UI
release. Browser acceptance used a local presentation harness whose execute
method refuses writes; release acceptance uses read-only live data checks.
