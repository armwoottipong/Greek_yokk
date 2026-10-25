# Prepared pricing model experiment

Status: Emulator-only successor candidate, **not deployed or connected to the
POS**. `firestore.rules` remains deny-all. The older `summary.rules` candidate
remains an independent inline-pricing regression reference; its three-unit
repeat limit does not describe this successor. Neither is a production protocol.

## Why prepare prices

Two complex lines in one inline witness exceeded the Rules expression budget.
This candidate verifies one line per preparation write, packing up to two
verified lines into each document. Preparation changes **only pricing metadata**.
It creates no order, changes no shop revision, and never deducts inventory.
Final confirmation still commits the receipt, shop revision and all fifteen
materials in **one atomic operation**. This is not splitting a sale into partial
business commits.

Candidate: `tests/firestore/candidates/prepared.rules`. Prototype planners and
helpers: `summaryPreparedSale`, `summaryMultiGroupSale`, `summaryPreparedMenu`,
`summaryPreparedGroup`, `summaryPreparedSource`, `summaryMaterialMetadata`,
`summaryMaterialAuthor`. They are test code, not runtime
APIs. The active local store and checkout remain unchanged.

## Current bounded profile

| Item | Tested prototype scope |
| --- | --- |
| Receipt | 1–6 lines; at most11 distinct addon IDs across the bill |
| Single group | Included/extra, nonrepeat or repeat, up to11 total units per bowl |
| Multiple groups | Exactly two groups per menu, at most3 units in each |
| Offered choices | Up to45 per group; sparse overrides across4 platforms |
| Registries | Existing64 menu/addon/group reference limits remain provisional |
| Inventory | Exactly15 protected sale materials,4 working lots each |

More groups, larger multi-group selections and byte/history limits remain open.
Never drop choices or quantities to make a source fit these limits. Shared addon
IDs selected in both groups retain independent group quantities/prices and are
summed only for inventory. An included group still consumes all selected units.
Explicit zero overrides differ from absent overrides/current addon fallbacks.

Single/legacy canonical lines retain unique optionIds plus numeric
optionQuantities with frozen `_:0`. Multi-group lines additionally keep exact
group snapshots and `groupSelections[groupId]` quantity maps. Their aggregate
optionQuantities must equal both maps summed, including when an addon occurs
in both. The server checks keys, positive integral values, min/max, membership,
snapshots, price and aggregate quantities. Invoice decoding MUST preserve group
identity and selectionQty; unique aggregate IDs alone lose information.

## Preparation and final proof binding

Documents live at:
`shops/{s}/generations/{g}/preparedSales/{opId}/lineProofs/{index}`.
Fields are opId/index/uid/catalogRevision/platformId/addonKeys/lines.

1. Create/reset a document with one fully verified current line.
2. Append a second verified line, preserving the first and every other field.
3. Confirm the sale only when every prepared pair exactly matches the receipt,
   account, platform, addon operand keys and current catalogue revision.

A pending document may be reset after a catalogue change. Another account
cannot overwrite or delete it. Preparation and cleanup stop once its order
exists, including after cancellation. These are command ownership checks, not
roles or membership; every signed-in account can create its own commands.

Catalogue changes invalidate prepared prices even if line prices happen to be
unchanged. Stock-only changes may reuse prices, but the final sale still needs
current stock, material revisions and shop revision. Stale writes fail atomically;
they never bypass stock allocation. The preparation helper can resume incomplete
metadata, but production must reconcile an existing receipt before retrying
preparation after an uncertain result.

| Final validation location | Obligations / distinct document accesses |
| --- | --- |
| Shop root | Material guards0–7, prepared pair1 when present, receipt: max10 |
| Receipt | Material guards8–14, last prepared pair, root: max9 |
| Material guard3 | First prepared pair plus ordinary receipt/root checks |
| Whole commit | 15 materials + up to3 prepared pairs + root + receipt = max20 |

Existing cached line operands remain exactly bound by material guards0–2;
eleven addon counters are independently checked by guards4–14. Recipes, lot
allocation, shortages, costs and revision fences remain mandatory. The fixed
fifteen-row profile lets sale/menu fences use direct touchedAt checks and lets
cost sums omit padding. Changing enrolment requires reproving these assumptions.

Six lines prepare at most6 metadata writes, then17 business writes; inline
reference sales used20 total writes. This is a local code-derived write count,
**not a daily free-quota certification**. Runtime online transactions, retry
behaviour, listener reads, rule-dependent reads and cleanup still require usage
estimation and testing. Test helpers use ordinary online Emulator writes and
must not be copied into production as an offline write queue.

## Authoring and source projection

Menus use groupId for one group and groupIds for two. Native prepared-menu
commands normalize zero/one/two bindings and maintain exact reverse menuIds and
multiMenuIds lists. Shape witnesses verify previous bindings; root guards verify
new attachments, keeping four-group rebinds within budget. Group commands freeze
both reverse lists and cannot raise max above3 while a multi-group menu uses the
group. Legacy catalogue edits cannot change group bindings. Initial import must
establish both exact reverse indexes; command preservation does not certify an
arbitrary imported state.

Source projection keeps original precision validation, group identities,
overrides, repeat quantities and production recipes. It explicitly rejects more
than two groups, multi-group maxima above3 and single-group maxima above11.
It rebuilds sample sale quantities without mutating the source, copying orders,
activity logs or external synchronization URLs. It is **not** the final codec,
migration tool or historical-stock-return certification.

## Material display metadata

The `material_metadata` prototype command atomically writes the shop revision,
one material revision and an immutable operation receipt (three documents).
It accepts only `name` (1–160 characters), `emoji` (0–32 characters) and
`minAlertQ` (integer 0–1,000,000,000 in hundredths of the existing base unit).
The client additionally rejects whitespace-only names. This is a metadata edit,
not material creation, archival, unit conversion or sale-member enrolment.

Rules freeze all stock, lots, costs, packaging, production recipes, coefficient
indexes, deletion flags and sale membership. The operation snapshot must match
the edited fields. Anonymous, stale, incomplete, foreign-generation and replayed
commands fail; every signed-in account has equal access without roles.

The catalogue revision stays unchanged because these fields do not change sale
pricing or recipes. A metadata edit increments the ordinary shop and material
revisions, so a previously planned final sale must re-read/replan inventory.
Unchanged staged price proofs can then be reused. Conversely, a sale invalidates
an earlier metadata draft: retrying requires the latest material snapshot and
must preserve its deducted quantities. The Emulator tests cover both orderings
and two accounts competing to edit the same material. Production still needs
online transactions, draft retention and explicit conflict handling; the test
batch helper is not an offline-safe runtime adapter.

## Material creation and conservative archival

`material_create` adds an ingredient or packaging material in a three-document
atomic command (shop, new material, immutable receipt). It starts at zero stock,
zero unit/pack cost and empty lot history. Initial quantities or costs cannot be
smuggled into creation: inventory enters through the existing stock-in command.
Name/emoji/alert limits match metadata edits; the new unit label is 1–32
characters, ID is 1–64 ASCII letters/digits/hyphens/underscores with an
alphanumeric first character, and pack size is an integer 1–10,000,000.
Changing an existing unit/type/pack size or production recipe is still pending.

The provisional material registry is **64 total entries, including archived
entries**. `shop.materialIds` stays in immutable cost-rank order; creation appends
one ID and assigns its rank from the previous length. IDs/ranks are never
recycled. `shop.productionUsers[inputId]` lists every material whose production
recipe references that input, including archived outputs. These fields are
trusted-import invariants, not client-supplied claims. The test-only
`materialRegistryShop` compiler establishes exact reverse lists and rejects
duplicate IDs, rank gaps, missing/self/duplicate inputs and unsupported counts.
The prepared source projection now uses it. There is no client bootstrap rule;
an uninitialized shop cannot use these authoring commands. All existing command
allowlists freeze the registry and reverse lists except material creation.

`material_archive` toggles the soft deletion flag in a three-document command;
it never deletes stock, lot history, costs or the registry entry. Archival and
restoration are restricted to materials outside the fixed fifteen sale guards,
with zero cached menu/addon coefficients and no production users. A client
cannot erase the reverse reference in the same command. Production-recipe
editing must eventually maintain both sides of this index atomically; it is not
implemented by this command. Keeping archived outputs in the reverse index is
deliberately conservative: restore and edit/clear their recipe before archiving
an input they still reference.

These commands advance ordinary shop/material revisions, leave catalogue
pricing and sale membership unchanged, and preserve staged price reuse after
stock replanning. Tests cover receiving both material types, positive-stock
archive/restore, blocked stock-in while archived, deletion/replay/anonymous and
foreign-generation denial, source-shaped authoring, sale/return preservation,
64th entry success and bypassed 65th entry denial. They do **not** enrol a new
material into sale recipes or certify daily Spark usage/document byte limits.
The exact fifteen protected sale roles remain unchanged.

Verification checkpoint (2026-10-21): combined reference/successor Emulator suite
22 files / 933 cases passes, including 56 material-authoring cases, 178 protected
replacement cases and four private-source opt-in cases. Ordinary app tests pass
126 files / 885 cases;
lint and diff checks pass. A maximum 18-material/four-lot waste regression was
isolated against the original reference and fixed by putting new authoring
allow branches after the existing hot command branches. No stock/cost/receipt
validation was removed; both count and waste maxima now pass. These are local
prototype results, not live product verification or a daily usage estimate.

## Bounded replacement of protected sale roles

The `material_enrol` prototype replaces exactly one unused protected material
with an existing active material from the global registry. It still commits all
fifteen mandatory sale roles. This **does not add a sixteenth simultaneous sale
material**, remove a referenced ingredient or migrate an existing recipe
automatically. Native menu/addon edits must first remove all references to both
IDs, including zero-quantity keys, inactive definitions and conservative cached
`menu.materialIds` supersets. Saving an affected menu rebuilds that cached union.

The fifteen mandatory material leaves independently scan five menu/addon
positions each, covering the entire 64/64 registries. Root guards bind the exact
set replacement and fence leaves0–7; the immutable receipt fences leaves8–14.
Each resulting leaf preserves stock, costs, lot provenance, production data and
global cost rank, advances its revision and verifies increasing rank relative
to the preceding result. Existing coefficient maps stay unchanged except their
catalogue revision. The incoming map is rebuilt as a complete zero map after
proving absence of canonical references; an outside material may have an old
cache revision. No other registry, group, menu or pricing fields may change.

The command writes17 documents (root, receipt,15 leaves). Its distinct dependency
set is18 documents, including the removed material read before the commit. Root
uses at most10 accesses, receipt8, and each leaf has only root/receipt/previous-leaf
dependencies. The outgoing document is retained untouched. Its original ID,
immutable cost rank and lot IDs remain usable by an older committed receipt,
including after soft archival when no production users remain. Tests cover
returning such a receipt once and swapping the unused role back. A catalogue
revision increment invalidates older staged prices; reprepare after replanning.

Newly enrolled materials can have no working lots. A strict empty-stock path
requires zero stock and all-zero quantity indexes, four sentinel slots, empty
active flags, zero takes and unchanged quantities/dates. Existing need, approved
shortage, cost, receipt and revision guards remain enforced. Empty/one-lot
dispatch is grouped below one `size < 2` check so the four-lot hot path retains
its original expression budget. An empty ingredient is not silently stocked;
runtime must still request the configured shortage confirmation.

## Production recipe authoring

The test candidate now supports `production_recipe` as one atomic root,
output-material and immutable-operation change. It adds, edits or clears a
recipe with one or two distinct registered active ingredient inputs; the
output must be an active ingredient and cannot reference itself. Quantity and
yield integers range from 1 through 1e9. Clearing removes the recipe field.
Other cycles are not prohibited: production consumes existing stock and does
not recursively expand recipes.

Root `productionUsers` changes exactly for old/new input membership, retaining
every other output reference. Existing stock, costs, lots, sale coefficients,
catalogue revision, material type and units stay frozen. Global and material
revision fences serialize competing accounts and invalidate stale production
or recipe drafts. No roles are introduced. The command writes three documents;
the dependency union is root, operation, output before/after and at most two
new input documents (five distinct paths, at most six before/after accesses).
This is a test-only planner/policy, not an online adapter or UI feature.

Verification: 36 recipe Emulator cases (including native production, disjoint
rebind, retained-input quantity edit, clearing, stale commands and archive
interlock), 19 planner unit cases, plus an affected five-file Emulator run of
197 passing cases including the four private source projections. This targeted
run does not replace the earlier 933-case complete-suite checkpoint.
The separate 178-case enrolment regression also passes after this Rules change:
all six current prepared-policy files are covered, 375 cases across sequential
runs. The unchanged 594-case reference policy was not rerun for this addition.

## Measurement and current-cost authoring

The test candidate `material_measure` atomically writes root, material and an
immutable operation. It changes exactly unit (non-whitespace string, up to32
characters), integer packSize1..1e7, finite unitCost0..100000 and integer
packCostCents0..1e9, preserving the supplied IEEE unit cost without rounding.
These are unit labels and current pack/cost settings; no quantity conversion
is performed, matching the existing editor. Historical lot quantities/costs,
initial quantities, stock, allocation, recipes, type, rank and catalogue remain
unchanged. The root and material revisions advance, fencing stale sales,
production, receipts and competing edits. Replanning can reuse unchanged price
proofs but must recompute current costs. Historical receipts keep their original
costs; cancellation restores original lots without restoring the former unit or
current cost. Inventory type changes require a separate contract because they
affect consumption, expiry eligibility, production and package pricing.

Verification: 40 new Emulator cases; affected six-file regression237 passes,
including source projection4. Focused planner and existing material editing,
requirements, packaging and classification tests total80 passes. All code remains
test-only; no active UI, online adapter, production Rules or data change.

## Declared menu recipes and package selection

Before enabling inventory type changes, the prepared projection now retains
paired `rawRecipe` and `hasPackage` fields alongside the effective menu `recipe`.
`rawRecipe` is the aggregated scaled declaration, not a lossless copy of the
source rows. It retains packaging requirements even when the menu opts out of
packaging. Prepared menu commands derive effective quantities from declared
quantities and current material types, retaining hidden and zero-valued declared
IDs in `materialIds`. This keeps existing role-replacement reference scans valid.

The shape witness validates paired map/boolean fields and their keys; mandatory
material guards validate each declared integer and its exact effective quantity.
The source profile currently requires all declared IDs to be among the fifteen
protected roles: unsupported hidden outside IDs stop explicitly, without dropping
them. Once declared fields exist, both menu and legacy catalogue commands reject
discarding them. Legacy menus without these fields remain supported; they cannot
be presumed to carry a complete original declaration for a future type change.

The quantity guard validates either the legacy effective integer or the declared
integer plus the derived effective equality. In the latter case a second numeric
check of the derived value is redundant. Combining equivalent validation allows
64 menus,45 choices,four platforms/four lots without exceeding the Rules expression
budget. The provenance check runs inside the existing menu-only branch so addon
edits retain their original evaluation path. Group bindings and reverse-index
ordering are preserved exactly. The original inline reference policy is unchanged.

This section records the prerequisite. The following type-change command now
uses the declaration directly; packaging receipt consolidation remains separate.

## Inventory type authoring

The candidate `material_type` atomically changes a registered active material
between ingredient and packaging. It retains all original lot IDs, quantities,
dates, initial quantities, costs, units and immutable ranks. Existing production
recipes/users must be cleared first. Every menu must already carry its declared
rawRecipe/hasPackage fields; a legacy menu without provenance blocks the command.

For declared menus, rawRecipe is authoritative. `menu.recipe` is the legacy
projection from the last menu-author command, not the current consumption source
after a type change. Current material recipeIndex.menus is the enforced effective
quantity. A type change freezes the entire root catalogue, recomputes the target's
menu coefficients from the declaration and new type, and increments all fifteen
protected cache revisions plus the root catalogue/global revisions. This avoids
rewriting and revalidating64 menu objects. Sale and catalogue planners derive
declared menu requirements from rawRecipe/current types; a later menu edit
refreshes that menu's legacy projection. Future public codecs/UI must follow this
same authority rule rather than consuming a stale legacy projection.

All fifteen mandatory leaves validate five strided menu positions each, covering
the64-entry profile. Root fences leaves0–7 and the operation fences8–14. An outside
target is appended as a compulsory sixteenth leaf, without enlarging sale guard
membership or changing its stale unused cache. Thus a protected change writes17
documents; an outside change18. Root has at most10 accesses and the receipt8/9;
each leaf uses root/receipt/target after-images. The dependency union is at most
18/19 before/after images over17/18 distinct paths. No extra witness documents.

Each leaf binds the current root operation/revision, and the target binds its
before revision to the immutable receipt. This rejects standalone reuse of an old
outside-material receipt, including a partial revision-only write. Preparation
from the previous catalogue revision must be repeated. Old receipts keep their
original allocations/costs and can return their original lots exactly once even
after reversing the material type. Expired ingredient stock remains ineligible;
reclassification never erases its original dates.

## Packaging receipts after a type change

The test-only package_stock_in command adds incoming units to the first positive
working slot. After sellout it reuses the first remembered allocation slot; only
when no working allocation remains does it fall back to the first historical lot.
It never discards or consolidates the other lots. This preserves old receipt IDs
and avoids activating an unrelated fifth lot before a four-lot bill is returned.
The existing four-working-lot profile still applies; arbitrary returns from other
historical allocations are not certified to fit that profile.

Three atomic writes update the root revision, material and immutable operation.
The root validates the resulting four-slot index, total and ordering. The
operation binds exact old lot metadata, its actual current quantity, global
stock/cost and active/zero flags; only the selected lot's allowed receipt metadata
changes. The leaf binds both the before material revision and current root head,
preventing stale, duplicate and standalone receipt replay. Root uses two
dependencies, receipt three, material two: four before/after images over three
distinct paths. No catalogue or recipe revision changes.

The global weighted cost uses all stock and is rounded to four decimals; the
chosen lot's weighted cost uses only its current quantity and remains unrounded.
Both preserve a real zero cost. Equal costs and zero old quantities have stable
arithmetic branches. Incoming receipt metadata uses no expiry, while the exact
previous dates remain in the immutable beforeLot snapshot; other lot dates stay
unchanged. Legacy qty/isInUse fields remain frozen. Empty incoming notes retain
the original note. Empty lot history uses the existing stock_in new-lot path.
This candidate command is not a production UI integration.

## Structural sales channels

The test-only platform command appends a stable channel ID up to four total,
including disabled channels. It copies all menu base/option prices, addon prices,
the addon price lookup and group overrides from an existing active template.
Zero overrides and absent group overrides keep their distinct semantics. Other
entity fields, declarations, bindings and revisions stay frozen. Subsequent menu,
addon and group author commands can change individual prices. The platform
command itself changes name/emoji/GP/active only on existing IDs, increments the
platform revision, retains at least one active channel, and never hard-deletes.
The generic platform-edit route also rejects disabling the final active channel.

The original idea of copying all columns and refreshing fifteen material guards
in one batch exceeded the1000-expression Rules ceiling at64/64/64. It is replaced
by immutable preparedPlatforms metadata. The proposal validates the registry and
exact new platform snapshot against the current root revision. Sequential
columnProofs validate two positions each across menus/addons/groups and require
the preceding proof. Their count is max(1,ceil(max(registry sizes)/2)), up to32.
Each proof binds the same immutable proposal and current root revision. Final
commit reads the last proof and proposal, compares the exact proposed catalogue,
and atomically writes only root and immutable receipt. At worst this costs33
preparation writes plus2 final writes. Editing an existing channel uses only the
two final writes and no proposal. Staged metadata is not a committed channel.

No recipe or pre-existing price column changes, so material documents and their
recipe-cache catalogue revision remain unchanged. Global root and platform
revisions fence stale sales; GP and active state are checked from current root.
Prepared sale proofs remain usable only for the exact matching lines and price
snapshots. After a channel is created, fresh line snapshots include its new price
column and normally require preparation again. Changing an actual menu/addon/
group price still advances catalogue/recipe-cache revisions through its author
command. A platform edit alone may reuse unchanged price proofs after replanning
the sale with the new global/platform revision and GP.

Any intervening shop write invalidates incomplete channel preparation. Immutable
proposal IDs cannot be overwritten, so retry needs a fresh ID and preparation.
Abandoned proposals/proofs need bounded cleanup and reconciliation in the future
online adapter; they are not an offline queue. This prototype does not prove
production byte/history/import limits or implement the online UI workflow.

## Optional material details

The test-only material_details command patches a nonempty subset of category,
packUnit, shelfLifeDays and isSubIngredient. It preserves missing vs explicit
null/empty/zero/false and retains fractional shelf-life without coercion. Category
is compatibility display data, not an inventory-type or date-policy switch.
Shelf-life never rewrites existing lot dates. Actual kind/usage still derives
from explicit inventoryType, productionRecipe and recipe references.

The immutable operation stores exact prior optional-key presence and values plus
the patch. Root/material/receipt three atomic writes bind current root head and
before material revision; stock, costs, lots, recipes and catalogue/cache revisions
are frozen. The receipt validates schema and preimage; the material enforces the
exact permitted key set, patch values and an actual change. Initial source docs
may lack operation bookkeeping keys, so the allowed result key union explicitly
includes revision/lastOpId/lastOpKind/lastOpIndex as well as existing and patch
keys. This prevents accidental deletion of nullable unpatched fields while
allowing the first legitimate update. A separate schema probe passed; an
isolated-command probe exposed the initial result-key mistake. Correcting this
union made the native positive pass; all temporary diagnostic tests were removed.

The prepared-source projection now preserves name/emoji/unit/minAlertQ and all
present optional details. It retains the original material-category registry as
legacyMaterialCategories and disabled production definitions with exact source
key presence under legacyInactiveProduction. These are immutable source metadata,
not new category CRUD or active production recipes. Active recipes use the
existing scaled productionRecipe command. Public import/export codecs still need
to reconcile current authored state with original provenance and unknown fields;
this projection is not a historical migration encoder. See material-field-coverage.md.

## Ordered mixed inventory drafts (test-only)

An inventory_batch contains 1–6 ordered receive/produce/count/waste/switch steps
touching at most six registered active materials in total. Production retains the
existing one/two-input and four-working-lot profile. Overlapping steps consume
the preceding quantities and costs; caller input remains unchanged on failure.

An immutable preparedInventory proposal binds initial server snapshots, author,
root revision and Thai business day. Each immutable step binds the preceding
state and proof chain. Three sequential proofs per material validate state,
lot/provenance and indexes separately within the Rules expression budget.
Untouched materials must be identical. Preparation changes no active stock.
The final atomic write changes root, receipt and all touched materials (at most
eight writes). Final material revisions advance once from their original value.
The final root requires already persisted proofs, and fences every material.

An intervening shop write or Thai day change invalidates preparation. A retry
requires current snapshots and a fresh proposal ID. Duplicate commits, missing
proofs and partial final writes are rejected. Test SDK batches are not the public
online adapter; durable client drafts, lost-response reconciliation and cleanup
remain integration work. This is not an offline sales queue.

The maximum profile costs 115 preparation writes (one proposal plus six steps
times one header and 18 proofs), then at most eight final writes: 123 total,
excluding price preparation and other workflows. Spark capacity still needs a
measured budget. The planner caps proposal/step UTF-8 JSON at 400,000 bytes and
history at 1,000 lot IDs; these guards are not complete Firestore encoding,
request-size or import certification.

Native tests cover the six-step/six-material boundary, four-lot production,
weighted-cost ordering, coherent forgeries, missing proof phases, duplicate and
stale commands, competing accounts, old-bill cancellation and the private source
fixture. No active runtime, deployed policy or production stock was changed.

## Remaining work

2026-10-25 lifecycle successor: preparations manifest, server receipt
reconciliation, atomic abandon/expire plus compulsory-proof deletion, and bounded
cleanup are implemented in test helpers/candidate Rules. See preparation-lifecycle.md
for retained business audit and concurrent requests that may both fail closed.
Current maximum includes one manifest:116 preparation +8 final=124 inventory writes;
six-line sale7 preparation +17 final=24 writes. Earlier figures below/above are
historical evidence, not current budget. Index config now13wildcards+5createdAt.
Final affected native regression6files189PASS, lifecycle24PASS in a separate final
run; unit4files67PASS. No production/runtime integration follows from this proof.

The 2026-10-23 whole-source review found a cross-command marker collision:
order and operation documents may share an ID. Shared touchedAt now binds the
tuple (lastOpId,lastOpKind,lastOpIndex), preventing prior count/sale markers from
satisfying an unrelated command without new material writes. Five native
adversarial/positive-control cases pass after the fix. The first conjunction
implementation exceeded expression limits; equivalent tuple equality preserves
all three checks. See prepared-policy-review.md for reproduction, importer
induction assumptions and why public protocol freeze still fails its gate.

The subsequent local index/admission proposal is in index-and-admission-profile.md.
Wildcard exemptions cover payload collections; createdAt is opted in for four
chronological collections. New test-only workflow admission checks every staged
request and final batch against800000storage bytes/document and8MiB modelled
Commit/request, retaining existing400kJSON mixed guards. Dense positive and joint
history/text negative cases demonstrate dynamic admission, not a guarantee all
count maxima jointly fit. Local CLI schema validation and Emulator query/cursor
proofs do not certify deployed indexes. The successor remains pending whole-policy
review, not a promoted production protocol.

The 2026-10-22 local profile/capacity audit is in profile-capacity-audit.md.
The supplied sample's projected documents fit measured storage and modelled
full-set Commit envelopes; no historical import or live capacity is certified.
New native boundary proofs accept the 1000th lot and reject the 1001st without
changing existing stock. A separate counterexample shows a valid material with
1000 stored lots can exceed mixed-draft snapshot guards. Count limits alone are
not a universal byte envelope. Automatic index configuration, final encoded
profile and the fifteen-protected-material product decision remain gates.

Complete profiles beyond fifteen protected sale materials,
numerical/byte/history/request/import invariants, then
choose and review one production policy. Integrate the public protocol/codec,
online preparation and commit adapter, journal reconciliation, login/store/UI,
listeners/reports, migration/restore and two-browser E2E before cutover. No
production readiness follows merely from these prototype tests.
