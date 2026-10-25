# Prepared command journal and recovery coordinator

These modules are isolated preparation. The running POS does not import them, no
Firebase transaction adapter is connected, and the security proof is still
uncertified. This is not a completed cloud checkout or migration.

`src/cloud/journal.js` stores a strict immutable JSON envelope in IndexedDB before
submission. Its draft local envelope is `{opId,kind,payload}`; final protocol data
such as expected revisions and approvals must be encoded in the payload by the
future certified planner. This is not the published Firestore protocol.

Records are scoped by project, shop, generation, UID and device. One IndexedDB
read/write transaction writes both the command and the unresolved-command pointer.
Two tabs cannot prepare different commands in the same scope simultaneously. A
resolved operation remains available for replay; resolving it again cannot clear
a newer pending command. This conservative first implementation allows one pending
mutation of any kind per device scope.

Each page instance generates a fresh owner UUID; do not replace it with a copied
sessionStorage tab ID. Claims have a lease and fencing epoch. Lease expiry permits
another tab to inspect the same operation, but does not declare the sale failed.
A takeover or uncertain attempt requires a server receipt read before an explicit
retry. Stale owners cannot change claim state. A late authoritative receipt can
resolve its own operation even after ownership changes.

`src/cloud/commandExecutor.js` accepts injected receipt-read and commit adapters.
It checks current identity, generation, readiness, network state and an internal
protocol-certification gate before and after asynchronous preparation. Journal
failure blocks all network calls. It persists `sending` before calling commit and
retains an uncertain command if the reply is lost. Reconciliation reads only; it
never submits a command. A missing receipt leaves the command pending. An explicit
retry submits the original ID and stored payload. There is no automatic queue,
online listener or background retry.

The future Firebase adapter must use server-only receipt reads scoped to the
authenticated shop/generation, validate the receipt's complete protocol schema,
and perform one atomic idempotent transaction. Network hints and IndexedDB claims
alone do not enforce server availability or exact-once writes. The coordinator's
`protocolCertified` flag must remain disabled in product integration until the
Rules/model gate passes; it is not a permission role.

Remaining work includes final protocol/receipt schemas, a local payload digest,
real browser storage/reload/multi-tab tests, storage-eviction handling, Firebase
transaction contention tests, and UI integration retaining the original basket.
Browser storage can be cleared or evicted; local persistence is not a server
backup or a security boundary. This journal has no abandon/delete API for an
uncertain command.

Tests use fake-indexeddb in Node to exercise actual IndexedDB transactions across
independent connections, rollback after a pending-pointer write failure, identity
isolation, claim fencing, response loss, replay and offline blocking. They do not
claim real-browser or live Firebase verification.
