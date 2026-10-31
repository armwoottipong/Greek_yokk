# Confirmed material archive and automatic toast dismissal

User requested typed confirmation before archival, automatic removal from menu formulas, and automatically disappearing toasts.

- Cloud archive now names the material and affected menu/Add-on formulas. The existing confirmation dialog requires `ยืนยัน`; wrong/empty input cannot confirm, Enter uses the same guard, reopening resets input, and Cancel sends nothing.
- Detachment copies canonical price/choice/group/packaging/display fields and removes only the selected material from recipes. Legacy Add-ons without an explicit active flag retain their effective active state. Other ingredients, menu availability and historical receipts remain.
- A revision change while reviewing requires fresh confirmation. Production-input references remain explicit blockers. Existing sequential durable commands handle partial/interrupted results; archival is the final server command.
- Success/info toasts expire in 5 seconds; errors in 8 seconds. Existing hover/focus pause, manual dismissal, screen-reader roles and unmount timer cleanup remain. Persistent recovery panels are independent.
- Original dialog, inputs and styling retained. Browser preview inspected at desktop and 360px mobile width using synthetic data; the actual input enabled confirmation only after the correct phrase. Preview harness and screenshots remain outside committed product files.

Verification:

- RED/GREEN coverage: typed gate/reset/cancel, exact recipe detachment/field preservation, multi-group/disabled-packaging preservation, revision conflict, interrupted command recovery and toast expiration/pause.
- Full ordinary suite: 191 files, 1501 passed, 1 conditional skip. Final direct Vitest run used four workers and a 15-second timeout on Windows.
- Firestore Emulator: 8 workflow/retirement proofs passed, including automatic live-formula detachment followed by archival and original-lot return of an old bill. Demo project only; no live shop data changed for acceptance.
- Independent read-only review: no material findings.
- Lint and production build passed; existing large-chunk warning retained.
- Existing Firebase Rules and billing configuration unchanged. Normal commit/push/Pages release verification follows this commit and is reported in chat.
