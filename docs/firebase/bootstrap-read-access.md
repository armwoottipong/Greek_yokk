# Live shop-status read access — 25 October 2026

Diagnosis from the authenticated CLI: deployed Firestore Rules denied every
read/write; `shops/greek-yogg` does not exist. Google authentication works, but
it cannot override Firestore Rules. The live policy was backed up locally before
changing it; no business data was exported or modified.

The bootstrap policy allows `get` only on `shops/greek-yogg` for an authenticated
user, only while its fields are limited to status/generation. An admin adding
other fields closes this bootstrap read until the core policy is activated.
This also allows a non-existent-document result so the app can show
`setup_required`. Other shops, shop collection listing, all child collections and
all client writes remain denied. No roles or membership checks are introduced.

Native Emulator tests verify two accounts, missing setup, anonymous denial,
other-shop/list denial, child data denial and create/update/delete denial.
This is a connection/setup fix, not activation of prototype sales Rules. Do not
deploy prepared.rules merely to remove a permission error. The shop still needs
validated current data and core adapters before shared sales can be enabled.

Verified delivery:10 native cases and25 affected session/UI/production-entry
cases pass, lint/build pass. Rules compiled/deployed to yoggie-db using the
owner's completed CLI login, then read back for exact source equality. Anonymous
REST read still returns403. In the user's authenticated live tab, reconnect
changed permission-denied to `setup_required` ("ยังไม่มีข้อมูลร้าน"). This proves
the read permission fix, not populated data or shared sales. No shop document or
business record was created/updated during this fix.
