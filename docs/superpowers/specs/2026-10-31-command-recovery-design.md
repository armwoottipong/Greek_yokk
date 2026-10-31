# Command recovery and inventory retirement

The user confirmed sale recording continues to deduct stock by recipe, with existing cancellation/return behavior. Preserve the original StockView/menu editor, Spark limits, Google allowlist and role authorization. No offline sales queue or live stock import.

Use the existing command protocol, with explicit failure outcome/diagnostic metadata rather than treating every failure as an uncertain write. Unsent commands can be discarded only through an atomic journal check. Previously attempted commands retain the immutable ID until a server receipt or revision fence proves their outcome. A missing journal entry alone never proves a session command was unsent.

Recovery must retry initialization and read the journal/receipt on manual reload and reconnect, never automatically submit. Session snapshots cannot override a resolved durable receipt. Each failure retains its original cause. The UI names the pending operation and separates connection, storage, access, conflict and pending-result errors. Draft editing/discard is independent of unrelated pending mutations where no command was submitted; writes still serialize for the shared shop revision.

Inventory retirement and permanent deletion use one eligibility model shared by UI/planner with Rules enforcing the same conditions. Hidden deleted catalog records remain visible as blockers until their live recipe bindings are removed by an explicit catalog edit; historical receipts remain immutable. Protected summary members cannot be bypassed only in UI. Any change to their retirement or generic command cancellation requires a tested, compatible server protocol; prepare and verify that protocol before enabling it.

Approaches: repair the current journal/transport (chosen recommendation: preserves original app and evidence); rewrite command storage/backend (rejected: broad migration and unnecessary risk); remove pending locks (rejected: permits duplicate stock deductions).

Release requires ordinary tests, focused Firestore emulator proofs, lint/build, review, normal integration, push, successful Pages Actions and live version/entry verification. Never clear browser storage or alter live balances as a recovery shortcut.
