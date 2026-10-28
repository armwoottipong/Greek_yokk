# Email access and sidebar users

Settings → ผู้ใช้งาน manages the Google emails allowed to enter the shop.
Each allowed account has equal capabilities; there are no roles or approval
queues. Enter one email per line and save. Addresses are normalized to lowercase,
must be unique, and the list supports 1–50 addresses. The current caller must
remain on the list to avoid removing their own access accidentally.

The transaction compares the reviewed email list with the current server list
and uses the latest shop revision. A concurrent permission edit requires loading
and reviewing the current list. Other business updates do not silently overwrite
the email list. Save is locked and shows a spinner until the server responds.

Rules require a verified Google identity and the current allowlist for every
shop/business read or write. Removing an email blocks subsequent requests even
when its Firebase Authentication session still exists. The application removes
the mounted workspace when access is denied and offers sign-out/account switching.
Temporary connectivity failures continue preserving carts and pending commands.

## Sidebar

The original sidebar footer replaces the Firebase connection label with round
Google profile photos; unavailable photos use initials. Pointer hover, keyboard
focus and touch expose the login email in a tooltip. Firebase connection status,
project/shop identifiers and the current account remain in Settings → Firebase.

Other active accounts are read from server-confirmed presence. Each authenticated
UID owns its document and supplies a server timestamp. A visible, online client
updates at most once per minute; avatars expire after two minutes without a
heartbeat. Background/browser timer delays can affect this approximate indicator.
Multiple tabs/devices using the same account share one avatar; closing one tab
does not remove another device's presence. No invented users are displayed.

## Release and recovery

The shop root must be seeded with an owner-approved `allowedEmails` map before
activating these Rules. An absent or empty map denies all client access by design;
there is no public bootstrap permission. Initial setup uses the owner's existing
admin CLI identity, a current-root update-time precondition, and exact readback.
Only the allowlist and revision/last-operation metadata change. Existing business
data and the generation remain intact. Approved initial addresses are private
configuration in Firestore, not hardcoded in the public application bundle.

Owner recovery/reset/demo retains the live allowlist exactly. Old backup access
lists never replace current permissions, and even a rehashed plan that removes
or changes the baseline list is rejected. See [owner recovery](owner-recovery.md).

Rules optimizations retain validation predicates: repeated receipt fields and
request UIDs are shared, proof alternatives share one identity gate, fourteen-row
receipts omit only known-out-of-range row checks, and unrelated unchanged menus
avoid loading recipe checks they do not require. Inverse-source tests, native
denial/positive proofs and a separate review cover these transformations.

The candidate compiler check uses a separately named preview release; it does
not repoint `cloud.firestore`. That active release is switched only after native
tests, the owner seed and readback pass. These API operations follow the official
[release creation](https://firebase.google.com/docs/reference/rules/rest/v1/projects.releases/create)
and [executable retrieval](https://firebase.google.com/docs/reference/rules/rest/v1/projects.releases/getExecutable)
contracts. Web publication is verified separately through Actions and the exact
live `version.json` and entry assets.
