# Original Stock UI Firebase Integration

User approved: complete inventory first; use exact original UI, no layout or style changes except settings.

**Goal:** Original StockView, original modals, original draft review/save flow backed by Firebase.
**Architecture:** Inject a cloud inventory model into existing presentation. Stage immutable command intents against a confirmed baseline, show their canonical preview, and commit via the existing durable command service only on original Save. Block stale counts and retain uncertain commands. Never instantiate local persistence in the cloud tree.

- [x] Restore exact original StockView and modals via injection; keep templates and styles unchanged.
- [x] Connect original receive/production/count/adjust/waste/lot switch draft methods to certified command planners.
- [x] Connect material creation/metadata/measurement/type/production recipe/archive within certified bounds.
- [x] Read real operation history only on demand into original history modal.
- [x] Persist uncommitted drafts per account/shop/generation; reject stale baseline and recover same-ID uncertain results.
- [x] Extend scoped Rules with reviewed inventory validators, prove native allow/deny and existing sale/cancel regressions.
Release: full tests/lint/build and original-UI acceptance; deploy verified Rules without replacing live data; commit/push, verify Pages Actions and live assets. Delivery report records the result.

Constraints: Spark free, Google login, no roles. Four distinct sale lines/16 protected materials unchanged. Count command bound18 materials and4working lots; multi-command draft review may confirm operations sequentially, reporting partial completion and retaining remaining drafts. Never report all saved after partial failure. Live business test writes require user intentional transaction; use emulator for dummy mutations. Permanent erasure/history clearing cannot erase immutable audit receipts through a generic client mutation.


## Warehouse completion follow-through (26 October 2026)

- [x] Make original archive/restore/delete/discard handlers wait for confirmed results; retain the form/review on rejection. Preserve templates/styles and local-mode compatibility.
- [x] Exercise the original inventory model against the real Firestore emulator transport for receiving, production, stocktake/waste, lot selection and material lifecycle; verify independent-account reads and uncertain-result replay.
- [x] Run appropriate regression checks, lint/build. Release result (commit/push/Pages and live SHA/assets) is recorded in the delivery ledger. Keep immutable audit records and explicit limitations intact.

User said to use currently visible data; this supplies no measured receipt/count amount. Use existing shop data for read-only live acceptance and isolated emulator fixtures for stock-changing tests; do not invent live business quantities.
