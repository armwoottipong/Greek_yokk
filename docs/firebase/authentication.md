# Login-only Firebase connection groundwork

The user chose Google login only: every signed-in account has equal access. There are no roles, membership approvals or first-owner bootstrap.

## Prepared modules

- `src/cloud/firebaseClient.js` creates a Firebase client only when explicitly called with a mode and web config. Importing the module makes no connection.
- `src/cloud/session.js` observes login and shop lifecycle, cleans up listeners on identity changes, clears old shop data immediately and ignores late callbacks. It performs no membership/role lookup.
- Firebase is now an application dependency, pinned to the already-tested 12.19.0. Analytics is neither imported nor initialized.

25 October update: `main.js` now selects a lazy entry through `src/cloud/appEntry.js`.
Default/unset/`local` still loads the existing POS. Explicit `firebase` or
`firebase-emulator` loads `src/CloudApp.vue`, which wires the client/session to
Google login, readiness, reconnect and sign-out controls. It never mounts the
old local POS/store. Authenticated readiness alone still exposes no sale/write
controls. This is an actual browser entry checkpoint, not an operational cloud POS.

## Select an explicit build

`.env.firebase.example` contains the public web configuration supplied by the
user. Copying its values into `.env.local` explicitly selects the production
Firebase entry; do not enable it for a live release until import/core-command
acceptance is complete. The chosen shop ID `greek-yogg` is a proposed namespace,
not an assertion that production data already exists there.

`VITE_DATA_MODE=firebase` requires a non-demo project. For local testing use
`firebase-emulator`, a `demo-` project config and an explicit shop ID. Unknown
modes, malformed config and invalid shop IDs fail before loading either app;
there is no automatic fallback to a disconnected local POS.
Config is validated before client initialization; optional Analytics measurement
configuration is discarded. No mode is activated or deployed by adding the example.

The screen distinguishes signed-out, popup, connecting, missing-shop, import,
maintenance and error states. Reconnect disposes the old session and rejects
late callbacks. It displays that selling is not yet enabled even after a
server-origin active shop snapshot. Next core-launch work must replace this
checkpoint with validated shop data and confirmed command adapters.

## Initialization contract

Call `getFirebaseClient({mode,config})` once per project/mode. Mode must explicitly be `production` or `emulator`; there is no automatic fallback. Required public config fields are apiKey, authDomain, projectId and appId. Analytics measurementId is discarded.

Emulator mode accepts only `demo-` projects and connects Auth to `http://127.0.0.1:9098` and Firestore to `127.0.0.1:8088`. Production mode rejects demo projects. A changed config cannot silently reuse an initialized project client.

Browser Auth uses session persistence and the browser popup resolver. Firestore uses memory-only cache. **Memory caching does not itself block queued/offline writes.** The future transaction transport, operation journal and UI readiness gate must enforce the approved offline-sale block; they are not implemented by these modules.

## Session readiness

Session states include signed_out, signing_in, loading, ready, importing, maintenance, setup_required and error. A server-origin active shop snapshot sets serverReady; a cached snapshot never does. This is login/read readiness only and is deliberately not a canWrite flag.

The UI must still wait for complete initial inventory/catalog data, the certified command protocol and pending-operation reconciliation before enabling any mutation. Sign-out/account change must also clear scoped view/store/cart state through the future cloud store; the low-level session only clears its own state and listeners.

## Verification

Bootstrap and session unit tests exercise 23 cases without network calls. A separate local Auth Emulator integration test initializes the real Firebase SDK, signs in using an unsigned **Emulator-only** Google token, verifies its google.com provider, deletes that generated test account and signs out. Node has no sessionStorage/popup resolver, so that test injects a Node-only in-memory Auth adapter. Browser persistence wiring is verified by unit tests; real browser popup behavior still requires end-to-end verification before enabling the UI.

No production Firebase requests, accounts, data or settings are touched by these tests.

References: [Auth persistence](https://firebase.google.com/docs/auth/web/auth-state-persistence), [Auth Emulator](https://firebase.google.com/docs/emulator-suite/connect_auth), [Firestore cache configuration](https://firebase.google.com/docs/firestore/manage-data/enable-offline).

Historical groundwork verification: application suite **103 files / 658 tests passed**,
local Emulator suite **11 files / 159 tests passed**, ESLint and production build passed.
Do not treat that historical run as a fresh whole-suite run after entry integration.

25 October entry verification: new entry9/UI10, existing session10/client13 and
checkout3 =45 tests passed; startup13/content-loading2/interface10 =25 additional
tests passed. Default and explicit demo Firebase build profiles compile; full lint
passes. Browser preview at a loopback origin displays the Firebase sign-in screen
with the real SDK and no local POS. Google popup success with production credentials,
mobile browser acceptance and operational sales remain unverified. Independent
fresh-context small-model review found no Critical/Important entry-boundary issue.
