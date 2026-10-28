# Yoggie role release

Viewer opens Dashboard only and has no business writes. Manager operates POS, inventory, catalog and reports, but cannot open Settings or modify GP/access. Admin manages every area. armwoottipong@gmail.com is protected as an Admin in every access update.

The root allowedEmails and userRoles maps have exactly equal keys. userRoles is the canonical write grant; allowedEmails gates shop reads. Admin policy updates validate allowed role values, preserve the owner and current administrator, and remove both entries together on revocation. All business operations preserve access fields. Recovery/reset preserve both live maps instead of importing old backup access. New users default Viewer. No offline write queue is added.

Deployment: backup active Rules/root; compile and test candidate; compare and swap only access metadata using updateTime CAS (never overwrite business fields); activate tested Rules; deploy Pages and verify live version. Existing non-owner allowed accounts receive Viewer by default, owner receives Admin. Gmail worker activation is separately required; queued invitations are pending, not delivered mail.

Protocol IDs, Firebase project/shop IDs and current URL remain unchanged for compatibility. Visible brand is Yoggie.

## Verified activation (28 October 2026)

- Root access metadata revision 15 → 16. Owner Admin and existing other account Viewer. Canonical comparison confirmed only access/revision/operation metadata changed; business fields and generation unchanged.
- Active Rules 488fd65b-314c-4261-a447-71d445f85d9c, source matches repository, compiled 255651 bytes. Original Rules retained for rollback.
- Emulator runtime: 110 passed, 3 skipped over access, catalog, stock and sale/cancel suites; explicit dense16 Admin and Manager cases pass. Ordinary suite had 1469 passes and one outdated generator-declaration expectation; corrected inverse-preservation expectation and focused49 checks pass. CI will run complete suite again.
- Gmail authorization/trigger remains pending and is not part of Rules activation.
