# Supplied backup inspection — 2026-10-20

**Status: valid legacy snapshot; blocked for the current Firebase candidate. No
upload, migration or production change has occurred.**

Continuation: a separate source-shaped set-selection experiment now passes Fruit's
three-choice case, an eleven-addon legacy case and a six-line case using copies of
this catalog/stock in the local demo Emulator. This addresses the observed sale
shape in isolation; it does not make the full backup importable. See
`set-catalog-experiment.md` for the new representation, invariants and remaining
command/integration gates.

Source: the JSON backup supplied by the user, 88,755 bytes, schema 4, revision 114,
exported at `2026-10-20T12:14:23.636Z`. SHA-256:
`DBA6C3C792E746223331ECDA12BC438648ECFDC1DF911581E67BDDBD50B8F3BA`.
The original file is read only. Its full contents, IDs and external backup URL are
not copied into repository fixtures or this report.

| Data | Count |
| --- | ---: |
| Materials and packaging | 18 |
| Menus | 4 |
| Active addons | 11 |
| Addon groups | 1 |
| Platforms | 4 |
| Orders | 4 |
| Cancelled orders, included in the four historical orders | 2 |
| Activity logs | 29 |
| Stored lots per material | 1 |
| Maximum production recipe inputs | 2 |

Quantity precision, exact stock/lot totals, IDs, individual recipe sizes,
production input counts, prices, group prices and GP pass the prepared inspector
using the provisional candidate bounds. This checks source data; it neither
encodes final documents nor certifies the app's ability to migrate it. In
particular, one source lot must be represented without inventing stock/history;
the current Two proof uses two slots and a final codec is still outstanding.

## Requirements exposed by the source

- **Fruit Trio** requires exactly three different included fruit choices from six
  options. Existing historical lines also contain three selected options. The
  current candidate's two-option bound cannot preserve that menu.
- **Simply Greek, Banana Biscoff and Biscoff Crunch** use the legacy unrestricted
  addon UI. All eleven active addons can be selected together. Their combined
  material sets can reach 14, 15 and 15 respectively, exceeding the candidate's
  twelve-material bound even within a single line. This is a permitted source
  behavior, not a corrupt backup.
- The four historical orders include two cancellations. Their original amounts,
  option snapshots, timestamps, allocations and cancellation states must be
  preserved as historical records, not recalculated using future cloud limits.

The initial inspector lacked option/combined-recipe checks and returned an
inspection success. Synthetic regression tests reproduced the omissions. The
corrected inspector explicitly blocks all four menu profiles above. No selections
or recipes were removed and no source quantities or amounts were rounded.

## Required next implementation work

Adapt the protected command model and Rules to the source's three-choice group,
legacy addon choices and larger material unions. Measure both single-line and
six-line combinations, pricing, quantities, stock deductions, replay, cancellation
and tampering before publishing a protocol. Do not simply raise numeric limits:
the candidate already has very little Rules-expression headroom.

Then finish the reversible codec/manifest, protected catalog/inventory commands,
login/readiness and awaited POS integration, staged import verification, export
and multi-device/offline acceptance tests. These are still outstanding. Firebase
Spark remains the intended plan; no billing or additional backend was enabled.
