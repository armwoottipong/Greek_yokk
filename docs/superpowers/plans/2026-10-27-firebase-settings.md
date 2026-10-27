# Firebase channel settings

Approved scope: expose the original SettingsView in the Firebase product; atomically save GP for existing channels, with server-confirmed status and duplicate submission protection. Preserve menu prices, receipts, stock and other catalog fields. No channel creation/deletion, roles, billing, import/reset or Google Sheets writes.

1. Add a strict GP command (integer basis points, 0–9999, all existing channel IDs, expected shop revision) and immutable receipt through the existing journal/transaction pipeline. Increment shop/catalog and channel revisions. Reject stale drafts; retries use the original command.
2. Add narrow Rules for the atomic root + receipt pair. Test unauthorized, malformed, standalone, unrelated-field and stale writes, retry/collision and sale/cancel behavior with two authenticated clients. Verify compiled deployment size before activation.
3. Reuse SettingsView with an optional cloud model. Show Firebase connection details instead of local/Sheets/restore controls. Keep drafts when remote settings change, require explicit reload after conflicts, show a spinner and disable controls while saving or blocked. Surface the original sidebar settings item.
4. Run focused tests, full tests, lint/build and one whole-change review. Back up active Rules, activate only the verified complete candidate, commit/push/Pages deploy and verify Actions plus live version/entry and read-only settings UI.

Completion is scoped to these settings; production backups/import/reset remain outside this package. No business data will be changed for live tests.
