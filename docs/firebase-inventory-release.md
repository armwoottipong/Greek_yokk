# Firebase inventory with the original product interface

The user approved inventory-first completion on 26 October 2026 and explicitly
requires the original interface. CloudStockWorkspace mounts StockView and its
original receiving, adjustment, stocktake, waste, material editor, lot decision,
history, confirmation and draft-review components. Their templates and styles
match the preceding product revision; only injected data/commands and awaiting
server saves change. There is no replacement stock layout and no local database
instance in this cloud tree.

## Operational behavior

- Original receiving and production forms stage canonical previews in the original
  draft bar. Physical counts, waste and lot switches use the same review flow.
- Original Save executes immutable Firebase command IDs and clears only confirmed
  commands. Partial success retains the remaining draft and reports failure.
- Drafts persist per project/shop/generation/account in this tab. They never send
  automatically after reconnect. Server readiness is required for sending.
- A changed server baseline blocks physical count overwrite. Stale pending intent
  can be terminally rejected only after proving the monotonic root advanced and
  the server receipt is absent; a committed receipt always wins.
- Original material editing creates/edits measurement, labels, optional details,
  type and production recipe with certified commands. Save reports success only
  after every command is confirmed. Existing stock drafts must be saved/discarded
  before material editing. Referenced materials cannot be archived.
- Stock history loads on demand from server receipts and the original immutable
  archives. Legacy material IDs map to current IDs for per-material filtering.

## Bounds and explicit limitations

The certified count command handles up to18 materials and four working lots per
material. Larger stocktakes are explicit sequential commands under the same draft
review, with partial-result handling. Registry capacity is64 materials. Production
recipes support up to2 input materials, sale retains the16 protected-material /
four-distinct-line profile, and all size/precision guards remain active.

A new material without any lot needs its first receipt before a positive physical
count; initial stock through the editor uses receiving/production commands.
History reads up to500 latest operations and500 latest orders plus archived logs;
a toast identifies this bound when reached. Audit receipts are immutable:
permanent material deletion and clearing server history are not enabled. Original
buttons report the limitation and do not mutate the local database; archival is
available where references permit it. No billing upgrade, generation switch or
stock re-import is part of this release.

## Verification and deployment

Native core and inventory suites passed65 cases with both private source backups,
covering forged/omitted writes, stale recovery, two-account races,18-by-four count,
16-protected-material/four-line sale/cancel and the registry cap. The final ordinary
suite, lint and production build are recorded in the delivery report. Browser
acceptance uses a local harness that refuses writes, then read-only live checks.
Deploy the verified scoped Rules, commit/push the completed package, verify Pages
Actions and live version.json/entry assets. Keep the previous Rules source for
rollback; never roll back or re-import live business balances.

## Original sidebar restoration (26 October 2026)

The Firebase shell now uses the shared Sidebar's original six menu definitions,
icons, order, badges, low-stock alert and inventory valuation footer. The cloud
model supplies canonical catalogue counts and the inventory model's live/draft
valuations. Only the connection label changes to Firebase. No sidebar layout or
responsive styles are replaced. Unfinished destinations remain disabled.
Production opens from the original stock row action. Bill history/cancellation
remains accessible from the header History action rather than an extra sidebar
entry. This change does not deploy Rules or write business data.
