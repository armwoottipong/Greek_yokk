# Sheets recovery and snapshot backup contract

This change has local VM verification only. No real Sheets rows were written, no
deployment was created, and readable browser redirects/CORS have not been proved.
The client must require readable matching acknowledgements and readback; an opaque
or failed transport never proves a successful backup.

## Legacy business operations

Every POST includes a nonempty, stable `requestId`, `action`, and `data`.
Supported existing actions retain their data/result shapes: `createOrder`,
`stockIn`, `stockConversion`, `stockAdjust`, `saveMenu`, `saveAddon`, `saveMaterial`,
`deleteMaterial`, `restoreMaterial`, `savePlatforms`, and `saveSettings`.
Retry the same request ID with the same payload. Reusing it for a different payload
returns an error. Newly generated menu/addon/material/order IDs use UUIDs rather
than row counts or a small random suffix.

Both GET and POST acquire the script lock. Before reading or accepting a new
mutation they recover outstanding PREPARED operations. If recovery cannot complete
they return `{status:'error',message}` instead of returning partially written data.
This protects API clients; manual spreadsheet edits and other scripts do not honor
this lock and are outside the concurrency guarantee.

Mutations validate their inputs and run legacy handlers against an in-memory
spreadsheet candidate. Duplicate production requirements aggregate by material.
Missing/archived inputs, missing targets, self production, negative/nonfinite
quantities and insufficient stock reject without changing business sheets.
Zero purchase cost remains a valid weighted-average input. Orders validate all
requirements before creating items or deducting stock.

`Operations` stores RequestID, Action, Status, Fingerprint, Generation, Chunks,
Checksum and Response_JSON. `OperationChunks` stores Generation, Index and JSON.
The candidate contains complete absolute row values for each changed table:

1. Write candidate chunks under a fresh generation and verify count, indices and
   checksum. A failure here may leave orphan chunks but changes no business rows.
2. Persist the PREPARED ledger row, then flush.
3. Replace changed tables with the recorded absolute values. Grow sheet grids
   before writes. Blank a retired tail only after writing its replacement.
4. Flush and read back every changed table. For snapshots, also verify reassembled
   snapshot chunks. Mark COMMITTED last, then return the stored result.

Recovery repeats steps 3–4. It never replays stock deltas or generates new order
IDs. A response lost after COMMITTED can be retried safely. The ledger is retained;
there is no automatic pruning, and orphan generations can be inspected separately.
The fingerprint and chunk checksum use FNV-1a over JavaScript UTF-16 code units
(eight lowercase hex characters); this detects accidental corruption, not malicious
tampering. Full candidate tables and retained history consume spreadsheet space;
large production datasets need separate measured capacity/retention planning.

Existing rows require no destructive migration. New infrastructure sheets are
created on first locked request. `setupDatabase` initializes absent/empty tabs;
rerunning it leaves populated tabs untouched. Correct references are used only
for fresh demo seeds. Existing incorrect recipe/addon references need an explicit
reviewed repair rather than guessing or rewriting historical rows. Seeds without
a matching material (kiwi/berry sauce/chocolate) are omitted from fresh setup.

`getOrders&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` filters inclusive Bangkok
calendar dates. Existing rows are retained and included; they do not need synthetic
ledger entries. An incomplete new order cannot be returned by a GET because the
GET completes recovery first or returns an error.

## Schema 3 snapshot backup

Request:

```js
{ action: 'syncAll', requestId, data: { snapshot } }
```

`snapshot` includes schemaVersion 3, nonnegative integer revision, materials,
menus, addons, platforms, orders, activityLogs, categories, gasApiUrl and
stockShortages. Materials include complete lots; stock and lot totals must agree.
The JSON is stored intact, retaining extension fields, costs, categories and
history rather than projecting it into the lossy legacy tables.

Successful response:

```js
{ status: 'success', data: {
  requestId, revision, status: 'committed', checksum
} }
```

The backend splits JSON into chunks of at most 30,000 UTF-16 code units. Stored
chunks have a `json:` prefix so a chunk beginning with `=` remains text in Sheets.
`SnapshotChunks` retains RequestID/Index/JSON for all committed backups;
`SnapshotMetadata` holds the active RequestID/Revision/Checksum/Chunks pointer.
An older revision cannot replace a newer backup. A retry of a committed ID returns
its original acknowledgement, even when a newer snapshot is now active.

Readback:

```js
// GET ?action=getSnapshot                  — active committed backup
// GET ?action=getSnapshot&requestId=...    — specific committed backup
{ status: 'success', data: {
  requestId, revision, status: 'committed', checksum, snapshot
} }
```

An absent/noncommitted request or damaged chunk returns an error. Snapshot writes
use the same PREPARED/COMMITTED transaction; readers cannot receive the active
pointer while its associated transaction is incomplete. Previous committed
snapshots remain available by request ID. This is backup storage, separate from
legacy row endpoints and from the local authoritative database.

## Local evidence and remaining proof

`node node_modules/vitest/vitest.mjs run tests/gas/backend.test.js` passes 67 tests.
The original defects first failed 22 regression cases. Subsequent RED cases
proved negative snapshot stock, formula-marker chunks, and sheet-grid growth.
Failure injection covers 12 write boundaries for conversion, order and snapshot,
plus each legacy mutation endpoint; assertions check one deduction, one order/item,
same replay result, complete readback and retention of the previous backup.
Corrupt recovery chunks cause GET failure until repaired and successfully replayed.

Real Apps Script runtime quotas, maximum practical database size, deployment
permissions and readable browser transport remain unverified. Before deployment,
take a spreadsheet copy, inspect existing invalid/duplicate rows, use a disposable
deployment with a synthetic snapshot, and verify matching acknowledgement plus
complete readback through the actual browser transport. Do not describe the live
integration as verified until that probe succeeds.
