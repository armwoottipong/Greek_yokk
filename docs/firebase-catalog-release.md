# Original menu and Add-on Firebase release — 27 October 2026

This package connects original MenuView, AddonView, menu/add-on editors and
AddonGroupManager through the same server-confirmed command path as inventory.
Existing sidebar, layouts and CSS remain; saving/removal uses button spinners,
disables repeat actions and retains failed edits. Local mode keeps its original
store fallback; the Firebase root never falls back to local data.

## Behavior and integrity

Menu/add-on/group creation and editing, platform prices, recipes, packaging and
one/two-group menu bindings use atomic root, material-cache, display and immutable
receipt changes. All Google-authenticated accounts remain equal. Other devices
reload on shop revision changes; root/material/display reads must agree on one
revision before publication. An editor opened before a catalog change must be
reopened. Selected POS options reset after a catalog update; existing cart lines
remain for explicit review and price reconfirmation.

Removal retires and hides the record while keeping bill and audit identities.
Referenced add-ons/groups cannot be removed until detached. Existing bills retain
the recipe/price evidence needed for cancellation after subsequent catalog edits.
No offline commands are queued; uncertain commands retain their IDs for proof-based
retry. No live stock, price or sales mutations are used as release tests.

Rules require separate immutable input, shape/reference witnesses in the same
transaction. They validate the declared input/display against the canonical entity,
all 15/16 protected material caches, derived group/menu references and unchanged
unrelated fields. Direct display writes and incomplete or altered transactions are
refused. Splitting witnesses keeps validation within Spark Rules evaluation limits
without removing validation. Rules are generated from scripts/core-policy.mjs;
do not deploy the earlier exploratory candidate policies.

## Current supported limits

This release keeps the proven 15/16 protected sale-material profile, four platforms,
64 registered materials and 64 retained identities per menu/add-on/group collection.
Retirement retains those identities. Recipes selecting newly registered materials
outside the protected sale set are explicitly refused with the original form retained;
extending that set requires a later validated backend change. Up to two groups per
menu are supported, with at most three choices each for a two-group menu; repeated
selection has a maximum of three. Large profiles outside these limits are not claimed
as supported. Extended settings and reports are separate milestones.

## Verification

Native emulator checks exercise the original model and real transport using both
synthetic fixtures and a private copy of the actual four-platform shop snapshot,
including save, sale, cancellation, retirement and cross-account reads. No private
snapshot is committed. Ordinary component checks cover existing UI/local behavior,
loading, stale carts and consistent multi-document reads. Final counts, lint/build
and Rules/Pages deployment results are recorded after the release gates complete.

Final release gates: 158 ordinary files, 1,251 passed and one conditional skip;
110 distinct native regression cases (94 operational inventory/sale cases and
16 catalog/original-workflow cases), including the private four-platform source.
The paired group63 legacy retirement case exposed a generator replacement-order
bug; checked replacement and generated-policy assertions fix it. Native negative
is now refused and the corresponding unreferenced positive request commits.
Lint and production build pass. Style blocks in all eight changed Vue components
match the prior release. Active live Rules were backed up and matched the prior
Git release; the live root remains revision4 during read-only preflight.
