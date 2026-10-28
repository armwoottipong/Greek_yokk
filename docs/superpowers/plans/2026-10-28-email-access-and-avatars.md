# Email access and sidebar users

User requests Settings email allowlist, moving Firebase status out of the sidebar,
and round active-user photos with email tooltips. This explicitly changes the
previous unrestricted Google-account access policy and sidebar footer only.
Keep the rest of the original product UI and equal account capabilities.

- Store lowercase allowed emails on the shop root. Require verified Google
  identity and current membership for every business read/write in Rules.
  Any allowed account may edit the list; no roles. Keep the caller's email and
  admit 1–50 distinct valid emails. Transaction guards reject stale list edits.
- Root listener permission failure removes the cached mounted workspace, while
  transient connectivity failures continue retaining carts/pending commands.
- Preserve the live ACL during owner recovery/reset/demo; old backup ACLs never
  overwrite current access. Bootstrap only after confirming initial addresses.
- Track one presence document per Firebase UID, with server timestamp and owned
  writes. Heartbeat at most once/minute while visible/online; expire avatars
  after two minutes. Multiple tabs/devices share one avatar; closing a tab does
  not delete another device's presence. Ignore cached presence snapshots.
- Sidebar footer uses real Google photos with initials fallback; tooltips work
  with pointer, keyboard focus and touch, escape clipping via portal, and contain
  the verified login email. Status/project/account remain in Settings > Firebase.
- Verify UI/session/transaction concurrency, denied and revoked users, presence
  ownership, worst supported sales/cancellation, recovery ACL retention, lint,
  build, Rules source/compiled limits, then commit/push/Pages and live assets.

The owner approved the initial address in chat; store it privately in the live
allowlist and allow subsequent edits from Settings. Do not activate strict Rules
without that admin seed and readback or claim access restriction is live early.
