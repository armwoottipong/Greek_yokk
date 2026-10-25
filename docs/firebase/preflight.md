# Local backup inspection

Prepared modules only; no active POS imports or Firebase uploads. A successful
inspection is **not** authorization to import or proof of production readiness.

`inspectLegacySnapshot(raw,{constraints})` uses the existing schema 3/4 domain
normalizer after rejecting non-JSON data. It returns a normalized copy, statistics
and diagnostics. It checks exact hundredth quantities and lot totals, retained
empty lot history, recipe/input/group counts, safe cost bounds, document IDs,
menu/addon/group prices and platform GP precision. It also checks the combined
selectable option-record count across assigned groups and legacy unrestricted
addons. Legacy menu/addon material unions are checked together rather than only
one recipe at a time. Missing prices remain missing;
explicit zero prices stay zero. It never rounds unsupported source precision,
merges lots or rewrites historical amounts. Unit costs retain IEEE-754 precision.

`conversion.js` parses decimal number representations for exact scaled values.
`auditIngredientRounding` reports the old-order versus canonical costRank-order
satang delta for supplied requirements; it never rewrites stored historical costs.
`paths.js` encodes legacy IDs reversibly as UTF-8 base64url and validates namespace
segments. These helpers do not publish the uncertified command protocol.

Run the read-only inspector against a JSON backup with explicit reviewed bounds:

```powershell
node scripts/firebase-preflight.mjs --input C:/backups/shop.json --constraints C:/backups/reviewed-bounds.json
```

The constraints JSON must contain positive integers for `maxStoredLots`,
`maxQuantityQ`, `maxMaterialsPerBill`, `maxProductionInputs`, `maxGroupsPerMenu`,
`maxOptionsPerLine`. The last bound counts distinct selected group/addon records,
not repeated quantity on one record. A backup can be valid legacy data yet blocked
because the candidate cannot preserve its selectable behavior. Never fix that by
silently reducing a group's selection count or dropping addons.
No defaults are supplied because the complete protocol is not yet certified.
An optional `maxUnitCost` numeric constraint can narrow the cost envelope. When
provided it must be finite, nonnegative, and its product with `maxQuantityQ` and
`maxMaterialsPerBill` must fit the JS safe-integer range. Inspection checks both
material averages and every stored lot's unit cost, including depleted history;
later returns or physical counts can restore such lots. An out-of-envelope value
blocks inspection rather than rounding or rewriting the source. Omitting this
optional field retains the existing aggregate safe-cost check on all those costs;
it does not certify a candidate policy's narrower envelope.
The CLI loads domain code through Vite's resolver in middleware mode without
opening an HTTP listener. It prints only diagnostics/statistics, excludes the
normalized shop snapshot, and does not change input files. Exit codes: 0 inspected
without blocking diagnostics, 2 blocked data, 1 argument/read/parse/runtime error.
It always reports `inspectionOnly:true,productionReady:false`.

The supplied 2026-10-20 backup exposed the previous inspector's missing option
checks. See `source-backup-inspection-2026-10-20.md`: the corrected inspector blocks
the candidate's two-option/twelve-material profile, even though the backup passes
the quantity/ID/price/lot checks. Such inspection bounds remain provisional and
are not a certified import protocol.

Remaining migration work: final document encoder/decoder and manifest, request and
document size bounds, complete catalog expansion and schema enforcement, staged
generation import with privileged local credentials, verification/export/restore,
historical provenance and recovery from interrupted imports. The inspector alone
does not validate every final Firestore document or complete basket combination.
