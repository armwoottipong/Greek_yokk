# Rehearsing recovery from a business backup

This is a local Firestore Emulator test, not a production restore command. The
offline planner imports no credentials and performs no networking. Tests refuse
any emulator host other than `127.0.0.1:8088`; the recovery target is fixed to
`demo-greek-yogg-restore`, shop `restore-shop`, and a new `g_restore_*` generation.
The source fixture uses a separate `demo-greek-yogg-recovery-source` project.

With the Firestore Emulator already running on that local port, use PowerShell:

```powershell
$env:FIRESTORE_EMULATOR_HOST = '127.0.0.1:8088'
npx vitest run --config vitest.firestore.config.js tests/firestore/backupRehearsal.test.js
```

To additionally test a private downloaded file, keep it outside the repository:

```powershell
$env:GY_RESTORE_BACKUP = 'C:/path/to/private-backup.json'
npx vitest run --config vitest.firestore.config.js tests/firestore/backupRehearsal.test.js
Remove-Item Env:GY_RESTORE_BACKUP
```

The tests clear only these disposable demo projects in the local emulator. They:

- Verify the format/checksum, typed values, counts, material/lot consistency,
  archive metadata and order-count manifest before preparing seed documents.
- Restore all business documents into the new generation. The root generation
  and document paths change; IDs, quantities, prices, timestamps, receipts and
  historical records retain their values.
- Independently read back every document and re-export the restored snapshot,
  comparing it exactly with the input business data.
- Sell using one authenticated client and read the stock with another, retry the
  same sale, cancel once, retry that cancellation, and reject a second return.
- Compare every material's business fields after the new sale/return cycle,
  including stock, lots, allocation and costs. Audit revisions/last-operation
  fields and transient preparation fields are intentionally excluded here.
- In the synthetic fixture, also cancel a sale created before the backup and
  verify that its original stock is restored exactly once.

A real-file sale test requires an active simple menu with usable stock. If none
exists, the rehearsal fails rather than approving a made-up shortage. Public CI
does not receive private backups; the optional real-file test is skipped there.

Business snapshots exclude transient preparations, local carts/pending commands
and authentication state. They are not full managed Firestore backups. Original
non-order archives have no trusted count manifest, so missing trailing records
before export cannot be detected; this limitation remains in the file.

Production recovery still requires a separately reviewed migration design,
dry-run, current-shop backup, write pause, generation-switch checks and rollback
conditions. No browser recovery action is enabled by this rehearsal.
