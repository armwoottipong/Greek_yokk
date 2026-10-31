# Command journal and recovery

The Firebase workspace uses `src/cloud/journal.js`, `commandExecutor.js` and
`core/commands.js` in production. The journal is an IndexedDB durability and tab
coordination mechanism; server receipts are the authority for business outcomes.

## Submission and recovery

- Commands are immutable `{opId, kind, payload}` envelopes scoped to project,
  shop, generation, account and device. Only one unresolved mutation may write
  from that scope. Claims have leases and fencing epochs.
- `execute` reports the underlying `causeCode` and whether this invocation was
  blocked, prepared or uncertain. A prior attempted command remains uncertain
  even if a later recovery attempt fails before sending.
- `inspect` can recover a receipt another tab already resolved. `rejectUnsent`
  atomically closes only a command with no durable attempted flag. It retains a
  terminal record so late tabs cannot claim and send it.
- Manual reload and reconnect read/reconcile commands; they never automatically
  submit a sale or stock command. Initialization can retry after a storage error.
  A retained inventory envelope is recoverable even if the parent cart snapshot
  was not saved. A missing journal entry does not prove a session command failed.
- When unsent cleanup races with another tab completing the operation, the actual
  committed receipt wins. A successful sale clears only its matching cart.

## Explicitly stopping a pending operation

Sales use the existing manifest abandonment transaction. A committed sale wins;
otherwise the server closes the manifest and keeps the cart. This also works for
an old session envelope whose IndexedDB entry is unavailable.

Inventory/catalog commands carry `expectedRevision`. Stopping one checks its
original receipt first. If still eligible to run, a transaction advances only
the shop revision and writes an immutable `command_abort` receipt at the original
operation ID. That receipt also closes the ID: ordinary mutations cannot replace
it, including a payload rebuilt at a newer revision. The transaction
cannot alter stock, catalog, access or money. An already advanced root and an
absent receipt also prove the original immutable revision command cannot run.
Manager/Admin authorization remains required. Cancellation commands without an
expected revision retain their existing receipt/retry flow.

## Drafts and inventory

Never-submitted stock drafts can be discarded even while another operation is
pending. Failed local persistence does not turn such a draft into an uncertain
write. An attempted draft needs server evidence before it can be cleared. A
stopped/stale draft remains available for inspection; discard it deliberately
before recreating it against current balances.

Deleting a menu or Add-on removes its live recipe bindings while retaining its
identity and immutable historical bill data. Archiving an unreferenced original
material may remove it from the current summary set, retaining its stock, lots
and return history. Legacy hidden recipe bindings are named and can be detached
through an explicit confirmation when archiving. Permanent deletion remains
blocked by nonzero lots, live formulas, production dependencies or return history.

## Verification

Unit/UI tests cover journal races, crash windows, failed persistence, readiness
retry, cross-tab receipts and diagnostics. Native Firestore proofs exercise
sale/stock deduction, original-lot cancellation after menu deletion/archival,
command stopping, forged writes and role restrictions. See
`docs/superpowers/verification/2026-10-31-command-recovery.md`.
