# Source-shaped selection experiment

Status: **test-only alternative; not a deployable policy or final protocol.**
`tests/firestore/candidates/set-catalog.rules` is separate from the main bounded
candidate. Root deployable Rules deny all. Product entrypoints, POS store and live
Firebase data are unchanged. No billing, migration or deployment was performed.

## Protected selection tables

The supplied catalog needs three included fruit choices, eleven optional legacy
addons, six bill lines and material unions up to fifteen. The adapter preserves
those choices, group limits, prices and recipes.

The experiment compiles all 2048 subsets of eleven globally indexed choices.
Each choice has a distinct power-of-two code; `_` is a zero padding sentinel and
cannot be selected. Every line proof validates unique allowed choices, group
minimum/maximum, its exact code, quantity, note and protected catalog snapshot.
Prices come from a protected platform/selection-code table. A missing price marks
that combination invalid; an explicit zero remains valid. Material requirements
come from a protected menu/selection-code table, multiplied by line quantities.

These tables are compiled from forward recipes and prices by TEST-ONLY code.
Trusted import and every future catalog edit must independently establish that
consistency. Sales cannot change the tables or metadata. A client-provided table
is not proof of correctness. The present source compiler still requires one
nonrepeating group and a single distinct addon quantity term per material.

## Lots and atomic links

Materials retain real lots by stable ID, insertion ordinals and original metadata.
The four allocation slots reference positive/active lots in the existing domain
allocation order; depleted history stays outside that working set without being
deleted. A protected zero sentinel pads unused slots. Trusted import must prove
nonnegative quantities, exact stock sum, unique real IDs, allocation completeness
and priority. Sales freeze these indices, all lot metadata except qty/isInUse,
and every history lot outside the working set. Stock-in/cancellation writers must
reestablish the invariant; they are not implemented in this alternative yet.

Each line requires the full potential material union of its menu, including
unselected choices. A zero-needed material preserves stock and active-lot state
exactly. Each material validates its exact requirement, sequential lot takes,
expiry behavior, approved shortage, costs and source revision.

The root checks mandatory post-write material links 0–8 and the ingredient cost
sum. The order checks links 9–14 and the packaging cost sum. Each link binds the
new operation ID and material index; material guards bind the expected source
revision and immutable order. The two parents therefore require every stock write
without a cumulative material cost chain. Line proofs still require every block
of at most two lines. Costs are summed in receipt/material order, preserving the
existing floating-point accumulation and rounding boundary.

Expected distinct global access budget: `materials + lineProofs + 2`, at most
15 + 3 + root-after + order-after = 20. Root uses at most ten distinct accesses;
order at most eight; material and line writes use fewer than ten. Cached duplicate
root reads count once. This budget is part of the experiment, not certification
for future commands or catalog changes.

An immutable receipt's expected material revisions no longer match after commit,
so replay cannot deduct stock again. Receipt/proof updates and replacement are
denied. Materials must remain strictly ordered by their protected costRank, so
permuting valid rows cannot alter floating-point rounding. Trusted initial generations must contain no dangling command references
or orphan proof sets. Import and catalog authoring must preserve those invariants.

## Evidence and limits

Current full verification: **23 files / 340 Emulator tests pass** in 200.75s,
including four opt-in source checks (`stock-in-final-emulator.log` in the ignored
execution ledger). Lint and `git diff --check` pass. The supplied backup SHA256
remains unchanged. The set alternative contributes 62 synthetic/adversarial/SDK
sale cases, 43 stock-in cases, six source cases and one reserve diagnostic; the other policy remains
separate. Eight added arithmetic comparisons pass for the six-line/fifteen-material
shape, sixteen and sixty-four fail. This is not exact expression headroom or a
guarantee for every four-lot/source combination.

New cases cover six lines with two/four lots, all fifteen materials with four lots,
forty depleted history lots, forged selection codes/tables, altered/deleted history,
wrong lot splits and active pointers. Existing omission, price, recipe, revision,
cost, coherent under-deduction, replay and two-user race cases remain mandatory.
The optional local source test verifies Fruit, eleven-addon menus, six-line bills,
every active platform, and unchanged backup SHA256. No historical orders, logs or
external URL from the backup are sent to the Emulator or copied into fixtures.

Protected lookup tables increase document and transaction sizes substantially.
Passing these examples does not establish a complete byte/index/headroom bound.
Seven domain-oracle adapter tests additionally cover duplicate recipe rows, menu
packaging opt-out and unsupported raw menu/addon/legacy-addon precision. Raw
precision is checked before normalization or aggregation can hide rounding.
The ordinary app suite passes **111 files / 770 tests**; the six actual-source
Emulator cases also pass after the final adapter changes.

Table fields need explicit index exemptions before any future deployment. A final
codec must avoid copying unnecessary derived data into immutable line snapshots
while preserving the authenticated revision/snapshot checks.

## Remaining gates

This is not ready for live migration. Stock-in now has a test-only atomic command (see `stock-in-experiment.md`).
Remaining work includes production,
cancellation, catalog/index maintenance, final codecs/history/size bounds, product
integration, and durable recovery/offline acceptance. Other inventory commands and positive packaging consolidation remain unimplemented.
The older candidate's
passing commands do not transfer automatically to this representation. Keep the
ordinary source preflight blocked against its provisional old bounds.
