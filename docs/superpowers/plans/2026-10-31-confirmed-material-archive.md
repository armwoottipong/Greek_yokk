# Confirmed material archival and transient toasts

User authorization: when archiving, require typed confirmation and automatically remove the material from menu formulas. Follow-up: toasts disappear automatically. Keep original product modals/layout and existing sale/return behavior.

Approach: extend the existing ConfirmModal with an optional required phrase (`ยืนยัน`). Every cloud archive lists affected menus/Add-ons and the material name. After confirmation, remove only the selected material from canonical recipe maps, preserving prices, groups, options, display metadata and other ingredients. Archive only after all detachment commands are confirmed. Production-input dependencies remain explicit blockers; no Firebase Rules change or live data migration.

Reject confirmation if the source revision changed while the dialog was open. Cancellation/incorrect phrase sends nothing. Interrupted multi-command saves retain the existing recovery/draft flow; never announce an archived material before its archive receipt.

Toast policy: success/info 5 seconds, errors 8 seconds; pause during hover/keyboard focus, resume remaining time, clear timers on unmount. Persistent pending-command panels remain independent of toast lifetimes.

- [x] RED/GREEN tests: confirmation phrase, reset/cancel, detachment preservation, revision conflict, partial failure, toast expiration/pause/cleanup.
- [x] Implement canonical detachment helper, archive binding and original modal input.
- [x] Verify real Firestore detachment/archive/old-bill return through existing Rules.
- [x] Review change, full tests, lint, production build.
- [ ] Commit, inspect/integrate remote, push; verify Pages Actions and exact live version/assets.
