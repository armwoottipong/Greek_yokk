# Isolated backup recovery rehearsal

Approved scope: prove the downloaded Firebase business snapshot can be restored and used in an isolated local Firestore Emulator. Do not import into the live shop, enable a browser restore button, deploy Rules or use production credentials.

Use the existing isolated worktree and current production Rules. Add an offline decoder/planner for the typed business backup. Verify checksum, types, manifest counts, identity/registry/lot consistency and required business collections before producing any seed documents. Target is fixed to localhost:8088, demo-greek-yogg-restore, restore-shop and a new rehearsal generation. No networking or credentials in the planner. Keep receipts/IDs and values; only remap root generation and document paths. Transient preparations remain excluded. A snapshot with missing original non-order trailing archives cannot be independently proved complete; retain the export limitation.

1. RED/GREEN unit tests for typed decoding, invalid/tampered files, counts/registry/paths and production-target rejection. No lossy type conversion or path interpolation from unvalidated IDs.
2. Native tests export a synthetic shop with an existing sale, restore to the separate demo project, independently read every document back, and verify the round trip. Then prove new sales, duplicate retry, original-sale cancellation, new-sale cancellation and rejection of double returns, including exact stock/lot/cost restoration. Use two equal authenticated clients. Re-export restored data and verify business equality (generation intentionally differs).
3. Repeat the same recovery/deduction/return verification using the user's downloaded backup, via an optional private environment path. No real business data in tracked fixtures or public logs.
4. One fresh review, appropriate ordinary/native tests, lint/build. Document results/remaining limitations privately. Commit/push and Pages deploy per standing instruction; verify Actions and live version/entry. Website remains read-only for recovery until a separately approved production design.

Review finding: reject surplus archived orders beyond the declared legacy order count. Apply the same equality guard in the exporter and rehearsal planner, with regression tests, so both agree on valid snapshots. This is a fail-closed export fix, not a live data migration.
