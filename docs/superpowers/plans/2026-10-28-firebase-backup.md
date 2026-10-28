# Rules headroom and downloadable Firebase business backup

Approved: reduce Rules size without changing authorization/validation, then add a read-only Firebase backup download to the original settings page. All authenticated accounts remain equal; Spark only. No imports, resets, billing or live business mutations.

Design: allocate collision-free short Rules function aliases by call frequency and shorten the outer database wildcard only when no local/nested binding shadows it. Preserve field names, strings, static paths, scopes and conditions. Compare generated policy, exercise native allow/deny workflows and verify actual compiled size after guarded activation, retaining the prior active source for rollback.

Backup: server-only paginated reads of root, materials, display, orders, operation receipts and immutable legacy records. Fence all committed business data by before/after shop revision, retry at most twice, fail closed on incomplete material registry/archive, auth/generation/connectivity changes, errors or bounds (10,000 documents / 20 MiB). No partial download. Preserve Firestore value types in an explicit typed encoding; include counts, revision, exclusions and SHA-256 checksum. Transient preparation/proof subcollections and material bill-preparation caches are explicitly excluded: this is a portable business snapshot, not a managed database backup or a browser restore workflow. Include no auth credentials or local carts.

Steps:
Archive limitation: the existing import provides only an order count. Validate that header exists and every observed archive kind has consecutive indices and valid JSON. Missing trailing non-order records predating this export cannot be proven without a trusted historical count manifest; disclose this in the file. Export remains a snapshot of all currently stored business records.

1. Add RED lexical compaction tests, implement frequency-aware aliases, regenerate Rules; run native checks.
2. Add typed encoding/integrity and fenced paginated reader tests, implement export and wire workspace lifecycle.
3. Reuse settings backup card for cloud download with pending spinner, duplicate guards, limits/failure copy and checksum verification; hide local destructive/import actions in cloud mode.
4. One fresh review; full ordinary tests/lint/build and native snapshot + operational regressions. Back up active Rules, verify baseline, compile/activate exact candidate and measure headroom. Read-only live export validation; no real business writes.
5. Commit/push/Pages deploy; verify Actions, exact version/entry/settings assets. State remaining limitations and next proposed milestone.
