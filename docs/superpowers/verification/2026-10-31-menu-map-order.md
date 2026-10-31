# Menu permission-denied after a picture edit

## Evidence and root cause

The reported command passed recipe admission but had no committed operation
receipt. Read-only checks confirmed its account was an allowed, verified Google
Admin. Active production Rules matched the repository. No production business
write, command retry, stop, deletion or import was performed during diagnosis.

The rejected browser Commit log and saved admission had identical input, prices,
recipe quantities, base IDs and material registry. Their entity snapshots differed
in `choiceMaterials`: each Add-on's recipe is a Firestore map, and its key iteration
order differed between the preparation read and final transaction read.
`Object.keys(recipe)` converted that non-semantic order into a positional array.
The existing admission equality check correctly rejected the mismatch.

A reconstructed command alone initially passed in Emulator; this did not reproduce
the differing reads. A synthetic, public fixture then reversed an equivalent
Add-on recipe map between admission and final planning. The unit snapshot equality
failed and the native batch failed with permission-denied before the fix. The same
cases pass after sorting the derived IDs. Private diagnostics remain in ignored
scratch and are not committed or sent to external services.

## Changes

- Derive `choiceMaterials` in stable ID order in menu planning and referenced
  Add-on updates. Recipe IDs, quantities and validation predicates are unchanged.
- Editing only an existing cloud menu/material's picture saves only its image
  document. It does not re-submit catalog/stock metadata. Local picture saves
  still use the original local database.
- Permission-denied copy now explains both possible access and data-validation
  causes instead of asserting an account-permission failure.
- Rules are unchanged. Native proof includes refreshing a legacy, unsorted
  admission under the same operation ID before committing the final transaction.

## Recovery

An already pending command must be checked using its original ID after loading
the fixed client. No replacement command or forced journal clearing is required.
If a picture-only edit was blocked at menu save, image upload had not started.
If that form has since been closed, the user will need to select the picture
again after resolving the old command.

## Verification

Regression tests: `catalogMapOrder.test.js`, `catalogMapOrderProof.test.js`,
`catalogImageForms.test.js`, `commandPermissionMessage.test.js`.
An independent source/test reviewer found no important or critical issue.
Full ordinary suite: 199 files / 1,521 passed / 1 skipped. Native proof: seven
files / 101 passed / 2 skipped. Lint and production build passed; existing
large-chunk build warning remains. The original loading/spinner test now edits
a business field so it continues to test a real server save instead of the new
unchanged-form no-op path. Release commit and Pages readback are reported in chat.
