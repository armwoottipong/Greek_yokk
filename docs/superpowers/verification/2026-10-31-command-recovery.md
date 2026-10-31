# Command recovery verification ledger

Plan: docs/superpowers/plans/2026-10-31-command-recovery.md
Base: decd6411a3bfe7e8b1fae931fbb2d33e6721b1a4

User confirmed sale recording continues to deduct ingredients and packages by recipe. No live sale, stock adjustment or migration is part of verification.

- Task 1/2 RED: eight new journal/executor/service/draft tests failed; three recovery UI tests failed; access-cause UI test failed.
- Task 1/2 GREEN: focused journal, executor, service, inventory suites and workspace recovery tests pass after implementation.
- Task 3 RED: protected archive model/emulator test, eligibility test and deleted-menu recipe test failed before the fixes.
- Task 3 GREEN: retirement/catalog/inventory focused unit tests pass; five focused runtime/emulator suites pass (full counts recorded below after final checks).
- Ruling: keep shared-revision writes serialized while allowing unsent draft discard; a missing durable record never proves a stored session command was unsent.
- Ruling: non-sale stop atomically creates an immutable command_abort receipt at the original operation ID and advances only shop revision. Both original revision preconditions and the immutable receipt fence late clients, including reauthored payloads with the same ID, without altering stock/catalog balances. Sales use the existing server manifest abandonment protocol.
- Ruling: archival can remove an unreferenced original summary member while retaining the material document and return history. Permanent deletion remains forbidden for returnMaterials.
- Ruling: retired catalog recipes are live bindings, not historical bill snapshots. Remove them on deletion; legacy hidden bindings are detached only after an explicit original confirmation dialog. Historical receipts stay immutable.
- Environment: Windows worktree checks out CRLF; normalize frozen Rules source to LF before audited generator replacements. Java 22 selected explicitly for Firebase Emulator; default Java 17 was rejected before tests ran.
- Whole-branch read-only independent review requested before release.
- Final review P1 fixed: preserve an already committed receipt returned during atomic unsent cleanup. New UI reproduction failed with retained cart before the fix; confirmed receipt now follows the normal completion path.
- Additional crash-window test exposed uncertain inventory intent saved before the parent session command. Recover that original immutable envelope from the inventory model rather than leaving an undiscoverable lock.

Final verification results and release procedure follow below.

## Final local checks

- Full ordinary suite: 191 files, 1493 passed / 1 conditional skip. Windows default parallel run first hit the existing subprocess preflight test's 5-second timeout. Final direct Vitest with four workers and a 15-second timeout completed successfully; no assertion was weakened.
- Final affected unit/UI suite after the last recovery changes: 110 passed.
- Final ten Firestore suites: 148 passed / 3 conditional private-source skips. Includes production Google/allowlist roles, sale/cancel, archive/restore, original-lot cancellation after menu deletion/archival, immutable server stop receipts and malicious attempts to reuse a closed ID.
- Lint passed. Production build passed; retained existing large-chunk warning.
- Independent reviewer found one P1 cross-tab receipt race; its regression was reproduced RED and passed GREEN after preserving the committed receipt.
- Live Rules source was read before release and matched Git baseline. Production Rules compiler returned no errors (one existing unused-variable warning). Previous release/source retained privately in ignored verification scratch for rollback.
- No live sale, inventory adjustment, deletion or data import was used for verification. Deployment checks compare active Rules content and Pages version/entry to the released source; final commit/run receipt is reported in chat.
- Production executable size initially exceeded the 256,000-byte limit. Final protocol uses the original immutable receipt location; request/resource lookups are shared by `request-data.mjs` with exact inverse-source tests preserving every predicate and document path. Firebase preview release compiled at 254,257 bytes. The preview never changed the active release.

Active Firebase Rules verified after release: `projects/yoggie-db/rulesets/371655a8-76be-4944-86d4-d62166d87071`, executable 254,257 bytes, source exactly matches this release. Source publication/Pages checks follow this commit and are reported separately.
