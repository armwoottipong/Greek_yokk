# Catalog save regression after menu ordering — 7 November 2026

Saving a group on production returned `permission-denied`, including saving its
existing values. The deployed Rules matched `firestore.rules`. The root was
revision 139 and the display document had a server-confirmed menu order.

`applyCatalogDisplay` used `structuredClone` on the entire display document.
This removes the Firebase `Timestamp` prototype from `menuOrderUpdatedAt` and
sends that field back as a map. Catalog Rules correctly reject a transaction
that also changes unrelated ordering metadata. Group commands fail before their
following menu-binding commands can run. Menu and add-on edits share this path.

The fix copies the document and changed collection structurally, preserving all
unrelated Firestore values, and clones only the new entity display value.
Authorization, Rules, recipes, prices and stock validation are unchanged. Retried
commands read the current display document in the transaction, so they use this
fix without modifying their retained operation IDs or payloads.

Verification:

- Three unit regressions first failed on lost Timestamp types, then passed.
- Four native regressions first failed with `permission-denied`, then passed:
  real ordering followed by menu/add-on/group rename or an additional menu link.
  They use deployed Rules, Google Manager identity, four platforms and sixteen
  protected materials, and check timestamp, ordering metadata and stock.
- A private production snapshot reproduced the same failures once its Timestamp
  types were preserved. All three rename/link rehearsals passed after the fix.
  The snapshot and temporary diagnostic tests remain outside Git.
- Related native checks cover original authoring/sale/cancellation/retirement,
  prepared-command recovery, and forbidden ordering changes. The selected native
  run passed 23 cases with one optional private-import case skipped.
- The ordinary suite passed 1,624 tests with one conditional skip; lint and the
  production build passed. Unit regressions run in the existing Pages CI gate.

Release verification must check the Pages Actions result, live `version.json`
and entry asset, then repeat the failing unchanged-group save on production.
No Rules deployment or business-data migration is needed.
