# Firebase save-system audit — 7 November 2026

Scope: original Menu Management, Option Groups, Stock & Package, POS, Settings/access/backup, and report reads. The original page layouts remain in place. No billing, backend feature enablement, business-data import, or permissive Rules fallback is included.

## Findings and fixes

| Area | Proven failure | Resulting behavior and evidence |
| --- | --- | --- |
| Menu | Finishing a nonempty group picker could leave `hasAddons` false and silently discard the selected groups. Creating a group could adopt a newer revision over a stale menu draft. | Picker enables options; revision adoption requires an unchanged persisted menu and fresh original draft. Original-form tests cover zero/one/two group transitions and interleaved edits. |
| Option groups | Cross-page references, revision conflicts, rename, min/max/repeat and failure handling needed explicit coverage. | Eight original-model audit cases plus native menu/group binding, reverse-reference and readback tests. No separate group-editor defect was established. Timestamp preservation from the preceding release remains exercised. |
| Stock | Zero unit cost was treated as missing during lot merge and waste. Legitimate merged receiving exceeded the Rules expression budget. | Nullish cost fallback preserves zero; equivalent receipt matching avoids eagerly constructing unused slot values. Native zero/paid-cost positive and rejection controls pass. |
| Package | Saving or resetting one draft row could erase edits to sibling rows. | Draft comparison preserves dirty siblings, follows new baselines for clean rows, and resets only the intended row. |
| POS | Unset channel prices could become free options; grouped selections lost identity in single-group carts; stale catalog preparation and receipt recovery had gaps. | Unpriced choices are disabled. All grouped lines carry group identity. Ambiguous restored grouped carts remain retained but require reselection. Catalog revision fences new sales. Recovery validates the immutable journal envelope, including free options, group identity, quantities, packages, price and shortage evidence. |
| Access | Viewer could read internal operational collections; identity could change during an awaited access transaction. | Internal reads require both allowlist identity and operator role. Viewer retains Dashboard reads. Stale identity cannot complete access writes. Native tests include removed/missing allowlist cases. |
| Backup/reports | Display/image changes can occur without a business revision bump. Duplicate historical order IDs could double count. | Backup checks bounded second metadata scans and reports busy state on disagreement. Report projection rejects ambiguous duplicate IDs instead of inventing a repair. |

## Verification and review

- Independent page investigations and four scoped review rounds completed. All important review findings were fixed with regression cases; the final scoped reviewer approved the changes.
- Native Firestore testing uses the emitted production Rules and source planners/transports. Original Vue menu forms run through the IndexedDB journal, commands, transport, server receipt and a second SDK session. Cases include menu binding, sale/retry/collision, unlink, historical recovery/cancel, same-price unset-channel races and unresolved journal collisions.
- A private read-only production snapshot was exercised in the emulator; stock, recipes, prices and ordering timestamps were preserved. No production data or credentials are committed.
- One archived candidate suite was invalidated by the Firebase CLI watching and reloading a concurrently regenerated Rules file. A dedicated deny-all emulator bootstrap now isolates SDK-installed test policies. The entire 178-case candidate suite was rerun successfully. No archived candidate feature was enabled.
- Final native targeted verification: 10 files, 265 passed, 2 skipped. Earlier completed native runs are recorded in the private audit ledger; optional unavailable snapshot suites remain explicitly skipped.
- Ordinary full-suite, lint/build, deployment and live checks must be recorded from their final outputs below. One earlier preflight CLI test timed out during simultaneous native/full-suite CPU load; its isolated rerun passed without changing its timeout.

## Production boundaries

The approved live proof uses one explicitly inactive test menu, two test groups and one test option. Fixture bootstrap uses owner tooling; that bootstrap does not prove client Rules. Normal logged-in form saves and readback provide the live client proof. Test entities are retired afterward; immutable operations and tombstones remain as audit history.

Sales, cancellation, receiving and production are tested in the emulator, not by creating artificial business transactions in the real shop. Real catalog entries, stock, lots, ordering metadata and access must be checked for unintended changes. No claim of universal bug absence follows from these checks.

## Release evidence

Final local gates: 220 ordinary test files passed (1,720 tests passed, one skipped); lint passed; production build passed with the existing large-chunk advisory. Production Rules compilation dry run passed with one unused-variable warning. Native final targets passed as recorded above. Remote `main` was inspected and still matched baseline `75a46ff` before release preparation.

Production execution and the deployed commit are recorded after the live proof.

Production exposed an additional release constraint: the first emitted Rules compiled to 256,283 bytes, above the service's 256,000-byte executable limit, although dry-run compilation succeeded. The initial CLI reported a misleading fallback release-conflict error. Caching the repeated reference-part offset and material ID preserves every check while bringing the executable within the production limit. The read gates remain unchanged. Independent review confirmed predicate equivalence across all 128 reference positions; 51 targeted native tests (including index/field bounds, hidden references, invalid identities, menu saves and zero-cost lots) and 27 generator tests passed, followed by lint/build. The active Rules source was read back and matched the tested file; ruleset `ea4b85e7-9f2c-49cb-b224-3fd3d187d735`.
