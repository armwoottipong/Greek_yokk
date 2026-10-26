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
Legacy bills are readable; cancel them in the original system. New Firebase bills
can be cancelled in the Firebase workspace.

Before real cutover: export the latest local backup after finishing pending local
bills, reconcile stock/history, rehearse the current snapshot, and switch once.
Never promote trial balances to current balances without that reconciliation.

## Transaction behavior

- Up to six distinct sale lines per bill; quantities of one menu may be combined.
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
