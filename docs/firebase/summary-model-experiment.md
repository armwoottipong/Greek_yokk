# Finite-counter model experiment

Status: inline-pricing reference candidate, not deployed or connected to the POS.
The successor prepared-pricing model supports two groups and wider single-group
repeats; see [prepared-model-experiment.md](prepared-model-experiment.md). The deployment
policy remains deny-all. This is not a certified production protocol.

The subset-table model could sell the supplied catalogue, but its 2,048-entry
derived tables made secure recipe edits impractical. The isolated
`tests/firestore/candidates/summary.rules` experiment replaces those tables with
eleven per-bill addon counters and extensible verified menu/addon recipe maps
per material. Earlier candidates remain regression references.

## Sales and prices

The menu registry is no longer limited to four entries. Base requirements come
from the verified `recipeIndex.menus` map, including a frozen `_:0` sentinel.
The addon registry can also grow beyond eleven entries. Each receipt carries
two flat maps, `addonKeys` and `addonCounts`, with slots `A0`–`A10`. Real IDs are
unique; unused slots use `_` with count zero. All selected line options must
occur in the key map. Material guards 4–14 independently prove each count from
the real line operands, and reject a selected inactive addon. Requirements use
`recipeIndex.addons[addonKeys.Ai] * addonCounts.Ai` for all eleven slots. Both
recipe maps retain a frozen `_:0` sentinel. The old material quantity vector
and all `counterIds` are legacy edit metadata with NO sale quantity authority;
the old receipt quantity array is removed. Every sale touches the
same fifteen protected material IDs in original cost-accumulation order, including
unused members. Guards 4–14 independently verify the eleven addon counters.
Zero-needed members preserve inventory and active-lot state.

Receipts contain six padded `lineMenuIds`, `lineQtys`, and a
`lineOptionQuantities` map with quantity-map values `L0`–`L5`.
Order validation checks these container shapes. Mandatory material guards 0–2
each prove a pair of operands exactly matches the real receipt lines or padding
(`_`, zero, quantity map `{_:0}`). This avoids nested lookups without trusting
client-supplied calculation operands. Padding and zero-valued forgery tests
isolate this binding from all financial/allocation checks.

Two lines per immutable line proof validate current snapshots, selections and
prices. Unbound legacy choices use protected global addon prices or legacy
menu-specific overrides. Bound groups use the canonical shared group, including
zero-cost included choices and sparse extra-price overrides with current-addon
fallbacks. The source adapter preserves group membership and identity rather
than deriving mode from selection counts.

Maximum sale access is fifteen material after-images, three line proofs, the
root after-image and the receipt after-image: twenty distinct documents. This
is a bounded source-compatible experiment, not unlimited catalogue support.

## Authoritative lot state

`lotQty` is authoritative for current quantities. `activeLotId` and
`zeroActiveIds` describe current flags. The `lots` map retains lot details and
provenance; its `qty` and `isInUse` values remain frozen during sales. Every
decoder **must overlay** current quantities and flags before calling domain
functions. Reading frozen metadata as current stock is incorrect.

Up to four allocation slots represent positive lots and included zero-active
slots. Depleted history remains in the maps and original insertion list. Sales
and production inputs retain the existing allocation order as slots become zero.
Receiving and returning may rebuild the index. Commands exceeding the proven
representation reject in full, without dropping history or splitting commits.

Lot `sortKey = expiryDay * 1e9 + receiveDay * 1000 + ordinal` makes four-lot
returns affordable in Rules. Trusted conversion must verify it, date bounds and
ordinary ordinals below 1,000. New receiving/production lots validate the key;
packaging merges revalidate it after a date change. Other commands freeze it.
The stored-history/document-size bound still needs certification; 1,000 is an
encoding bound, not a claim that every such document is supported.

Primary material dates advance to the next active lot after sale/production
input consumption; if no active lot remains, they retain their previous value.
Rules validate both dates, and the original-store oracle checks lot advancement.

An explicit switch changes flags, index and primary dates in one command without
changing quantities or provenance. Selecting a zero-quantity lot retains its
zero-active flag and also activates the first positive lot by insertion order,
matching the original store's normalization. The selected lot still supplies
the primary dates. These distinct facts must not be collapsed into one pointer.

## Existing catalogue edits

One command edits one existing menu, addon or platform. The receipt, root and
all fifteen material recipe maps commit together. Only the edited addon-map
or menu-map entry may differ; Rules compare it to the new forward recipe.
Other entries stay unchanged. Material guards distribute menu option-price checks; global
addon prices must equal the source addon prices.

The material's source catalogue revision must equal the receipt's source
revision. A regression demonstrated that omitting this fence allowed replaying
a committed receipt to increment a material revision. Immediate replay and replay
after receiving or sale now fail.

Creating/updating/archiving menus uses the separate `menu` command below.
Addon creation is implemented in this candidate. Creating/removing platforms,
changing the fifteen-member set and physical deletion of menus/addons are
**not implemented**. Never expose these through
an unrestricted root update.

## Extensible menu authoring

The test-only command creates a fresh menu ID, updates any existing menu or
archives it using `active:false`. It supports a provisional registry bound of
64 total entries, including archived menus; document/request-size certification
is still required before publishing this as a production limit. Tests create
the sixty-fourth entry and reject a sixty-fifth even with the client limit
bypassed. The addon registry separately supports a provisional 64 entries;
one menu may offer up to 45, and one bill may select up to eleven distinct
addons across all six lines. Four platforms and fifteen sale materials remain
the current profile. These are experimental bounds, not certified product limits.

Root, immutable operation receipt and all fifteen material guards commit together.
Root checks source revision, exact entity snapshot, registry membership and one
menu revision increment. Each material validates its forward recipe quantity and
the corresponding changed cache entry, while other cached menus and cost/stock
fields stay frozen. A mandatory immutable shape witness validates menu shape.
Each of the fifteen material guards checks choice positions `i`, `i+15`, and
`i+30`; the first four also validate one platform's price-map keys, sentinel
and base price. All offered choices' reference metadata and four platform prices
are checked, even if that choice is not selected by the next sale.
The planner rebuilds derived choice-material references from canonical addons.
Authoring uses eighteen distinct documents (root, receipt, shape witness and
fifteen materials), while a six-line sale still uses twenty.

The multilot allocator relies on the inductive `stock == sum(all lotQty)` invariant
instead of re-summing its old slots on every sale/input deduction. Trusted import
must establish the exact total, nonnegative integer quantities and complete live
index. Receiving/output production add exactly their quantities; sales/input
production deduct exact bounded takes; counts/cancellation apply exact validated
deltas; switches/catalogue edits freeze quantities. Rebuilt indexes validate
coverage. An Emulator sequence checks every material total and nonnegative
quantity through menu creation, sale, receiving, production, count, cancellation
and switch, then compares final server data. This assumption must remain part of
the eventual importer and every future mutation; it is not permission to accept
an arbitrary initial state.

## Receiving and production

Receiving bridges the earlier append/merge planner through authoritative
quantity maps while preserving initial quantities, costs, dates and history.
The summary cases do not replace the forty-three earlier receiving cases;
equivalent adversarial coverage remains necessary on the common model.

Production reads a protected output recipe with one or two distinct inputs.
Required quantities use the existing UI scaling/rounding and domain allocation,
with no shortages. A single commit deducts inputs, appends the output lot, updates
weighted cost and advances the shop revision. Source revisions prevent replay;
the recipe and existing lot metadata remain unchanged.
An omitted output expiry uses the null-date sentinel, matching the existing POS.

Weighted cost retains the original evaluation order in domain units:
`(oldStock * oldUnitCost + rawCost) / (oldStock + producedQty)`.
Adding scaled integers before division changed an unrounded fractional result.
An original-store oracle exposed the difference; the regression now requires
exact equality. New lot cost is raw cost divided by produced domain quantity.

The supplied source's raw inputs are unavailable initially. Its opt-in test
receives test quantities through protected commands before producing with the
unchanged source recipe and costs. It never changes the backup or uploads its
historical records, logs or sync settings.

## Cancellation

Cancellation restores the immutable sale's actual allocations, including after
later sales, receiving or recipe changes. Original prices, costs, snapshots and
lot provenance stay intact. Approved shortages are not returned. A source
revision vector fences each material. The order transitions to cancelled once,
atomically with the receipt and all fifteen material updates.

A surviving/restored positive active flag remains active; otherwise the first
positive lot by original insertion ordinal becomes active, matching `undoOrder`.
A return exceeding four allocation slots or restoring multiple positive active
flags rejects in full. The single-pointer representation cannot silently merge
those flags.

Cancellation accesses nineteen distinct documents: fifteen material after-images,
root and operation after-images, and original order before/after images. Root
validation links nine materials; the receipt links six; leaves validate returns.

Keep SDK Timestamps intact when constructing a cancelled order. `structuredClone`
strips their prototype and changes the immutable creation timestamp into a map.
Shallow copying the immutable order and replacing cancellation fields fixes this.

## Evidence and remaining gates

Focused Emulator runs pass six-line/fifteen-material/four-lot sales, forged
counters, existing catalogue edits, receiving, four-slot production, exact
returns after other commands, missing writes, tampering, replay and competing
signed-in cancellation authors. Ordinary tests compare production with the
original POS store. Tests target only local `demo-greek-yogg`.

Read-only review found and verified the catalogue replay fix, and found no
concrete cancellation bypass under the stated assumptions. Subsequent sort-key
optimization and production implementation still need final review.

Before production, finish other inventory commands and structural catalogue
authoring, receiving coverage, complete bounds/import invariants, historical
codecs, runtime commands/read models, awaited UI integration, offline recovery
and two-session browser acceptance. Then prepare a trusted migration dry run
and reviewable deployment/cutover.

## Physical counts and waste (2026-10-21)

The isolated `summaryCount` planner supports one atomic command for 1–18
materials, each with 1–4 explicit existing-lot counts. Receipt cells retain the
exact before/after quantities and source revision; cost, recipes and lot
provenance cannot change. Waste clamps the requested amount to the selected lot
and verifies its recorded value. Root and operation checks divide the eighteen
material links, keeping the largest batch within twenty distinct document reads.

A derived index reuses the protected source ordering when no new historical slot
is activated. It filters depleted slots and moves the confirmed active pointer to
the front. General history restoration and legacy zero-active flags use the full
index proof. Untouched quantity keys are frozen; touched keys must exist, retain
the sentinel zero and have bounded integer values.

Default count planning retains the original POS choice of the first positive lot
by insertion order when the old active lot empties. The receipt explicitly binds
the resulting pointer. Rules preserve an old pointer that remains positive, and
allow a confirmed positive pointer after depletion, consistent with the existing
signed-in permission to switch lots. Legacy flag normalization remains checked.
Waste preserves an empty active pointer after a sale consumes all fresh stock;
remaining expired stock may still be discarded, matching the original POS.

These are test-only candidate commands. They do not enable the active app,
replace deployment rules, import a backup or establish complete protocol bounds.

The single-allocation-slot stock check has a separate equivalent fast path. It
proves the exact four-element take vector, quantity-map diff, total, shortage
eligibility, active pointer, zero flags and primary dates using the one protected
lot. This leaves expression headroom for source-shaped sales as more command
routes are introduced. Multi-slot sales retain the existing full allocation proof.
A waste operation that depletes the active slot must leave an empty pointer only
when stock is zero; if stock remains it must select a positive slot, including
when all remaining stock is expired.

## Candidate cost envelope (2026-10-21)

The common experiment now requires initial material averages and every stored
lot's unit cost to be finite and between zero and 100,000 Baht per unit. The
test-only canonical adapter checks this even for depleted historical lots.
Receiving validates its input cost, resulting average and appended/merged lot
cost. Production validates the resulting material average and new lot cost;
other implemented commands freeze cost fields. Actual migration must enforce
these same source invariants before activating a generation.

At a maximum required quantity of 1,000,000,000 hundredths, one material costs at
most 100,000,000,000,000 satang. Fifteen sale materials total at most
1,500,000,000,000,000 satang, below `Number.MAX_SAFE_INTEGER`. Two production
inputs total at most 2,000,000,000,000 Baht before deriving the output cost.
The existing sale subtotal limit of 1,000,000,000 satang also bounds the GP
intermediate product. This preserves unrounded source unit costs within the
envelope; it does not substitute decimal rounding for existing IEEE arithmetic.

Eight Emulator boundary cases distinguish exact accepted costs from just-over
inputs and excessive output costs, including merged receipts and production
into empty/nonempty output materials. The read-only inspector now checks every
lot's aggregate safe-cost bound and optionally an explicit `maxUnitCost` limit.
These numerical checks do not complete document/request-size limits, future
authoring commands, mixed drafts, the codec or the trusted production importer.

Latest focused common-policy verification: sixteen files / 559 cases pass, including
the opt-in supplied-source fixtures, shared groups, dynamic addon capacity and menu authoring. Ordinary suite:
121 files / 818 cases pass. GP authoring accepts 99.99% and rejects 100%, matching
the original POS domain and preflight constraint.
No production Firebase access, data migration or app activation is implied.

## Addon authoring and reference maintenance (2026-10-21)

The test-only `summaryAddon` command enrols a fresh ID into the addon registry
without replacing an existing entry. It atomically creates the root entry, per-platform price-cache
entries, immutable command receipt, and all fifteen material coefficients. It
does not attach the addon to any menu; a verified menu command explicitly opts
in. Existing entries support name, price and recipe edits plus disable/re-enable.
Legacy entries without `active` retain their original active behavior. Each
compulsory addon counter guard forbids a positive selected quantity when that
addon is inactive. No additional sale reads are introduced.

The registry now accepts a provisional 64 entries, including the twelfth and
sixty-fourth. New entries beyond the original eleven use ID-based catalogue
edits (`collection:'addons'`, `counterIndex:-1`); root validation proves that
they have no legacy address. Both old and new entries support edits and inactive
status. A menu can offer 45 choices, and a bill can select eleven distinct addon
IDs across all lines. Exceeding either bound rejects explicitly; no choices are
truncated. Source menus originally offer at most eleven, so this retains their
complete selection behavior. Reusable multi-group authoring remains open.

The 45-choice palette is an evidence-based experimental profile: 64 choices
with four platforms exceeded the Rules expression budget. Three choice checks
per compulsory material guard support 45 with all four prices validated. A
64-entry registry still lets menus offer different subsets. This is not a
certified production limit; byte bounds, the codec and UI constraints remain.

An existing authoring gap was found and fixed: changing addon ingredient keys
previously left menu `choiceMaterials` metadata stale, despite correct stock
coefficients. Catalogue addon edits now refresh that single choice reference in
every referencing menu, preserving all unrelated menu fields and a material-ID
superset containing both old references and the new ingredients. Keeping old
material references avoids accidentally deleting a material shared by another
choice. A later explicit menu edit can rebuild the minimal reference union.
The material list is reference metadata, never quantity authority.

Fifteen mandatory stock guards each validate four menu positions (indices
`i`, `i+15`, `i+30`, `i+45`). One immutable reference witness validates positions
60–63; the command receipt requires that witness in the same commit. Addon
shape/price validation moved from its stock guard into the mandatory receipt
to stay below the per-write expression ceiling with 64 menus and four platforms.
The edit reads eighteen distinct documents: root, receipt, witness, and fifteen
materials. Sale line witnesses are unchanged; the receipt addon operands changed
to the two flat maps described above. Creating an addon still needs only
seventeen distinct documents. Both models remain experimental until the final
codec, byte bounds, importer and full UI flow are certified.

## Shared single-group authoring (2026-10-21)

The candidate now keeps `catalog.groups` and `groupIds` in the protected root.
Each menu may bind one group through `groupId`. Repeats have the bounded profile
below. Group definitions
hold a name/revision, active flag, minimum/maximum, up to45 unique addon IDs,
`included` or `extra` pricing and sparse per-platform price overrides. Explicit
zero is an override; absence falls back to the CURRENT global addon price.
Included pricing adds zero even when override configuration is retained. No
resolved-price cache freezes fallback prices or requires rewriting menus on a
group price/rule change.

Grouped receipts store the complete canonical group snapshot alongside the
menu snapshot. Line proofs validate membership, unique selections, bounds,
current group state and exact prices. Stock requirements still use canonical
addon IDs and the existing verified addon maps/counters. Six lines, four lots,
four platforms and eleven selected distinct addons pass for extra pricing;
the included source shape also passes. No extra sale reads are introduced.

Bound menus have empty legacy option/min/max/price-reference fields and retain
their base recipe; display/decoder logic MUST derive effective group choices
from the current group, and historical receipts from their STORED group snapshot.
Do not read empty legacy choice metadata as 'this menu has no options'. Actual
runtime/codec integration remains pending.

Native menu commands maintain each group's reverse `menuIds` list atomically
when binding, rebinding or unbinding. Only those reverse-list fields may change
on group records during a menu command. Legacy catalogue menu edits cannot
change bindings. Group authoring creates/edits/archives a group with root,
immutable receipt, shape witness and fifteen material revision guards in one
commit (eighteen distinct documents). It changes only catalogue revisions in
the recipe indexes, preserving all quantities/costs/recipe coefficients. Three
options per material guard validate all45 override sets; the first four guards
validate one platform's keys and zero sentinel.

A group with any bound menu cannot be archived, including inactive menus.
Unbinding all menus permits `active:false`; the group and historical IDs remain.
Initial import must establish exact reverse bindings, and all menu mutations
must preserve them. A group edit can affect64 bound menus without copying their
definitions. Source projection now retains the supplied group ID, rules,
configuration overrides and receipt snapshot; it validates original override
precision even when included pricing would hide a nonzero configured price.

This is ONE group per menu, not complete general group support. Repeating
selections now have a bounded three-unit profile described below. Multiple
groups and larger repeat profiles remain unsupported. The source adapter rejects
unsupported shapes rather than flattening them. Registry64 and byte/request
limits still need full certification.


### Bounded repeating selections (21 October continuation)

The prototype accepts repeated input IDs, then stores unique line.optionIds
and a numeric line.optionQuantities map with frozen _:0. Legacy and grouped
lines both use this representation. order.lineOptionQuantities holds six map
copies, exactly bound to actual lines/padding by mandatory material guards0..2.
Addon counters multiply selection quantities by bowl quantity. Requirements
independently use canonical menu/addon recipes. Included pricing still consumes
every unit; extra pricing multiplies overrides or current fallback prices by
selection quantity. Receipt decoding MUST reconstruct selectionQty from the
map rather than assume one unit per unique ID, preserving the stored group.

Repeat groups currently author/select at most THREE units per bowl. One option
may satisfy min3 by selecting it three times. Nonrepeat profiles retain eleven
selected IDs,45 offered choices and six receipt lines. Multiple groups and
larger repeating profiles remain open. Six- and eleven-unit repeat experiments
exceeded1000 expressions at boundary cases; these are FAILED experiments, never
certified support. The three-unit profile matches the original Fruit count and
is enforced by group authoring Rules/planner and source projection. Trusted
import must enforce it too; never silently clamp larger source settings.

Line witnesses now contain only opId/index and validate actual receipt lines,
eliminating duplicate payloads. Each binds receipt.createdAt to request.time,
preventing later append to historical receipts. Mandatory new receipt/root
updates enforce authentication and active generation; each chained preceding
path validates its canonical index. Witness count remains ceil(lines/2), max3;
sale access remains15 materials+3 witnesses+root+receipt=20 distinct documents.
Stock/cost checks remain intact. Source projection explicitly opts into repeat
scaffolding in the older adapter and rebuilds the sale with canonical counts.
It never copies historical orders/logs or mutates source data. This remains a
prototype, not the production codec/importer.
