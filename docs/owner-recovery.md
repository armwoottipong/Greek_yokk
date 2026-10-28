# Owner workstation recovery

The website prepares and checks files. Final Firestore writes run only on the owner's computer using the existing Firebase CLI Google login. These scripts do not deploy Rules, enable billing, delete generations, or import data automatically. A passing unit test is not a live recovery rehearsal.

## Current supported scope

Native `greek-yogg.firebase-business-backup` version 1 restores all five exported business collections into a **new** `g_restore_...` generation. Document IDs, receipts, archives, amounts and timestamp nanoseconds survive unchanged. The active root adopts the snapshot's business fields, the new generation and revision `max(live revision, snapshot revision) + 1`.

Every candidate document and the reservation manifest are read back. Activation uses a single atomic commit containing their `updateTime` verify preconditions and the reviewed live root's `updateTime` precondition. A root revision or field change also invalidates the baseline before activation. The former generation stays in place. Immediate rollback requires the exact activation receipt and unchanged root `updateTime`/fields; a subsequent client business write closes that window. Rollback increments the revision again.

This release conservatively supports at most **450 business documents**, each encoded document at most **800,000 bytes**. Larger snapshots stop before staging. Staging batches stay under 100 documents and 7 MiB of encoded data. Failed staging leaves an inactive candidate; choose a fresh generation rather than overwriting or automatically deleting it. An interrupted/uncertain activation requires an owner readback before any retry. A `pending` output file means the command did not finish recording a verified result; it does not prove that nothing committed.

Backups exclude preparation/admission certificates, authentication, carts and pending commands. Historical archives without original count manifests cannot prove that trailing non-order records were present before export. SHA-256 detects changes to a file; it does not establish the author's identity. Review the source, counts, target and baseline.

Native backups use the default path. Add `--migrate-legacy` when preparing a plan to convert eligible archived bills with exact original lot/allocation evidence; already cancelled bills remain cancelled and the archive is retained. Any blocked receipt stops the whole plan. Reports deduplicate by original bill ID. No historical lot, quantity, or cost is invented.

For an original local/Google Sheets-era JSON snapshot, add `--legacy` to `--backup FILE`. The trusted compiler validates materials, prices, recipe references and archive identity before producing the native plan. Native and legacy imports stage into a new generation; they never overwrite the old generation.

Use `--reset` instead of `--backup FILE` to prepare an actual empty shop preserving the four existing channel GP settings and labels. Use `--demo` instead to prepare the original sample materials/menus/addons, clearly labelled demo data, with **no fabricated completed orders**. Both still require reviewing a saved plan and separate explicit stage/activate commands. Old generations are retained. Empty shops use only real physical materials, including zero materials; no hidden inventory padding is created.

## Commands (owner review required)

Run from the repository using its locked dependencies and Node with Web Crypto support. Use `npx firebase login` / `npx firebase login:use OWNER_EMAIL` first if necessary. The script accepts only the global CLI account matching `--account`; it rejects token/service-account environment overrides and emulator overrides. It checks the actual Google principal, Firebase project identity, IAM read/create/update permissions and Firestore database access. It neither prints nor saves OAuth tokens. Firebase debug/body logging is disabled in this CLI.

Store backup, plan and receipt files outside the published source tree. They contain business data. Examples below use explicit placeholder paths; replace the email/project only after checking the intended owner's account and project. Omitting `--apply` is read-only with respect to Firebase.

```powershell
# Read the live root and validate the backup, then save a reviewable plan.
node scripts/owner-recovery.mjs --backup D:/private/native-backup.json --project yoggie-db --shop greek-yogg --generation g_restore_OWNER_UNIQUE_ID --account OWNER_EMAIL --out D:/private/restore-plan.json

# Review the complete saved plan, source checksum, counts, root baseline and hash.
# Stage into the reserved NEW generation. Active shop remains unchanged.
node scripts/owner-recovery.mjs --plan D:/private/restore-plan.json --project yoggie-db --account OWNER_EMAIL --apply --reviewed-hash REVIEWED_64_HEX_HASH --out D:/private/stage-result.json

# Explicitly activate only that fully verified candidate against the same baseline.
node scripts/owner-recovery.mjs --plan D:/private/restore-plan.json --project yoggie-db --account OWNER_EMAIL --apply --activate --reviewed-hash REVIEWED_64_HEX_HASH --out D:/private/activation-receipt.json

# Optional: check whether immediate rollback is still admissible (read-only).
node scripts/owner-recovery.mjs --plan D:/private/restore-plan.json --project yoggie-db --account OWNER_EMAIL --rollback --receipt D:/private/activation-receipt.json

# Roll back only before any later business writes; keep BOTH generations.
node scripts/owner-recovery.mjs --plan D:/private/restore-plan.json --project yoggie-db --account OWNER_EMAIL --rollback --receipt D:/private/activation-receipt.json --apply --reviewed-hash REVIEWED_64_HEX_HASH --out D:/private/rollback-result.json
```

All `--apply` commands require a saved reviewed plan, exact hash and a **new** `--out` file. Existing output files are never overwritten at command start. The CLI first reserves a private `pending` file, then records the verified result. Standard output shows only a summary; the activation receipt file includes the root needed for guarded rollback. Keep receipt files private. Windows permissions still follow the containing directory's ACL.

If the baseline changes, stop and prepare/review a fresh plan with a new generation. Do not change the saved baseline to make a stale plan pass. Close/reload clients around activation so carts/drafts from the old generation are reconsidered against the replacement. Do not add a web path that performs these privileged writes.

## Portable preview interface

`scripts/recovery-plan.js` has no Node imports, credentials or network calls:

- `inspectOwnerBackup(text)` returns `{format, source, counts, checksum, issues, ready, limitations}`. `source` includes project/shop/generation/revision/date. `ready` means native snapshot structural validation passed, not that restore was applied or that an entire POS release is operational.
- `prepareOwnerRecovery({backup, projectId, shopId, generationId, baseline})` returns a hash-bound plan. `baseline` is `{root, updateTime}` with the exact typed `encodeBackupValue` root read from the server. The owner CLI obtains it; a browser preview is not a substitute for an owner baseline check.
- `verifyOwnerRecoveryPlan(plan)` verifies the reviewed hash, document bounds/paths, reconstructed snapshot counts/registry/archive and operational catalog/material/receipt consistency before every stage/activation.

Validation reuses `planBackupRehearsal`'s strict decoder, stock/registry/archive checks via its existing fixed emulator-only target; that call only builds an in-memory plan. It does not connect to an emulator or relax the rehearsal's production guard.

## Verification and release gate

Unit verification: `npx vitest run tests/cloud/ownerRecovery.test.js`; lint: `npx eslint scripts/recovery-plan.js scripts/owner-recovery.mjs tests/cloud/ownerRecovery.test.js`. Tests use an in-memory Firestore boundary and cover stale root/stage races, exact readback, retained generations, closed rollback windows, capacity guards and timestamp precision. Additional emulator proof `tests/firestore/ownerRecoveryProof.test.js` uses actual REST commit preconditions to stage/activate demo/reset and cancel the two eligible original receipts from a private backup. It rejects rollback after later business writes. Production adapter dry-run verifies the owner identity/IAM and database without changing the shop.

Before an owner elects to write production data, perform an isolated emulator rehearsal with a representative real-format snapshot and verify staged contents, activation, client reload, business command and the resulting blocked rollback. Then explicitly review the production plan and permissions on the owner's computer. Source publication alone does not authorize executing the apply commands.

API contracts were checked against the [Firestore v1 discovery document](https://firestore.googleapis.com/$discovery/rest?version=v1), [Resource Manager v1 discovery document](https://cloudresourcemanager.googleapis.com/$discovery/rest?version=v1), and [Google identity discovery document](https://accounts.google.com/.well-known/openid-configuration). The implementation uses the repository-pinned `firebase-tools` internals; recheck this adapter when upgrading that dependency.
