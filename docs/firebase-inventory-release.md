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


## Inventory completion checks (26 October 2026)

The original editor now waits for archive/restore confirmation before changing
its displayed state. A rejected deletion keeps the editor open with its existing
error field. The original delete/alternative-archive dialog and draft review stay
open if the command cannot finish. Synchronous local-store behavior is preserved;
no templates or styles changed.

Additional native tests connect the actual original inventory model directly to
the Firestore runtime transport and scoped Rules. They verify editor creation with
initial stock, receiving, packaging, production/input deductions, physical count,
waste, lot switching, archive/restore, independent-account reads, same-command
recovery after a lost result, and rejection of stale counts. The combined core,
inventory and workflow suites pass69 native cases, including both private source
backups. Ordinary tests pass1209 cases with one conditional skip; lint/build pass.

Read-only inspection of the existing live Google session confirmed milk receiving
+4000ml and physical count -2000ml on26 October with2000ml remaining, as shown in
the original history modal. These were existing business records; no new live
stock operation or data import was performed for acceptance. Final physical
second-device/operator acceptance remains separate from emulator race proofs.

For normal receiving/production/count/waste/lot changes, use the original form,
review the original draft bar, and choose Save; wait for Firebase confirmation.
Material edits and archive/restore wait for server confirmation directly. Reload
never discards or automatically sends uncommitted session drafts. Permanent
erasure and history clearing remain unavailable; supported archive/restore keeps
audit evidence. See the bounds above before bulk operations.


## Loading feedback and repeated-action protection (26 October 2026)

Firebase mutations now keep the initiating button spinning and disabled until
both the server result and post-write reload complete. This covers checkout,
cancellation, explicit retry, stopping an unresolved sale, inventory draft Save,
material Save/Archive/Restore, and the original context/detail actions. Original
layout/CSS stay unchanged. Disabled/busy state also prevents dismissing the active
edit/review dialog or starting a conflicting action while its operation is pending.

Local draft forms do not write Firebase immediately. Their async production,
physical-adjustment and waste lot decisions are guarded too, so repeated taps do
not duplicate staged intent. Locks are set before the first await, released in
finally, and preserve original forms/drafts on failed or uncertain results. Retry
uses the same immutable command ID; uncertain commands are not discarded.

Manual reload shows its spinner through both inventory and order reads, sharing
in-flight requests. A successful mutation waits for any older read, then starts a
fresh reload before unlocking. No artificial sleep or fixed delay is introduced.
