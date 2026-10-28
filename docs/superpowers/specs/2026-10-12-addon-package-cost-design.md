# Add-on Package and Cost Separation Design

**Date:** 2026-10-12  
**Status:** Proposed for implementation planning  
**Scope:** Add-on recipes, order-level package review, stock allocation, cost reporting, persistence, and Google Apps Script synchronization

## Intent

Yoggie needs packaging to follow the real preparation flow without slowing down normal checkout. An Add-on can require several stock items, including both edible ingredients and packaging. The POS must derive the expected package list from Menu and Add-on recipes, let staff adjust that list for one order with a reason, and never mutate the source recipes from an order adjustment.

Success means a normal order uses its recipe defaults without an extra confirmation step, an exceptional order records what changed, package shortages never drive stock below zero, and revenue reporting separates ingredient cost, fulfilled packaging cost, and expected-but-unfulfilled packaging cost.

## Confirmed Business Rules

- Menu recipe management remains functionally unchanged.
- An Add-on uses a multi-row BOM instead of a single `materialId` and `amountUsed` pair.
- Each stock item has a stable inventory type: `ingredient` or `packaging`. Category names remain editable presentation metadata and never determine accounting behavior.
- Package requirements are derived from both Menu recipes and selected Add-on recipes.
- Package adjustments belong to the whole order, not an individual cart line.
- Staff may add, reduce, or remove derived Package quantities. Every adjustment requires a standard reason; `other` also requires a note.
- Cart changes recalculate the derived baseline. Adjustments remain separate and are reapplied to the new baseline.
- An order adjustment never modifies a Menu or Add-on recipe.
- Extra Package items never increase customer-facing price.
- Package shortage opens a warning but may be confirmed without choosing a substitute.
- Package stock never becomes negative. A shortage is recorded as an event tied to the order and is never offset retroactively by a later stock receipt.
- Profit uses ingredient cost plus the cost of Package quantities actually allocated from stock. Expected cost for missing Package quantities is reported separately and is not included in actual cost or gross profit.
- Reporting exposes both order-level details and aggregate period metrics.

## Non-goals

- Automatically changing a Menu or Add-on recipe from POS adjustment history.
- Suggesting or selecting a substitute Package during checkout.
- Charging customers for additional Package items.
- Assigning manual Package adjustments to individual cart lines.
- Adding employee authentication or approval roles.
- Changing existing ingredient-shortage policy beyond ensuring the new Package path does not alter it.

## Architecture

Use one recipe model for Menu and Add-on requirements. A pure domain layer expands cart lines into typed requirements, aggregates package sources, reapplies order-level adjustments, and returns a package plan. Checkout allocates ingredients under the existing policy and packaging under the new shortage policy, then calculates cost from fulfilled allocation.

The Pinia store owns cart adjustment state and orchestration. Vue components render and edit a derived package plan but do not calculate inventory or cost. Database normalization owns schema migration and validation. Orders store immutable snapshots so later recipe, material, or cost changes do not rewrite historical results.

## Data Model

### Schema version

Increase the canonical database schema from version `3` to version `4`. Import, local persistence, backup/restore, demo data, and Google Apps Script snapshots must accept version 4. Version 3 data is migrated deterministically during load or import.

### Material

Add:

```js
inventoryType: 'ingredient' | 'packaging'
```

For version 3 migration, classify a material as `packaging` when the existing menu editor's packaging heuristic recognizes it; otherwise classify it as `ingredient`. Persist the result so future category renames cannot change accounting behavior. New materials default to `ingredient`, and the material editor requires an explicit type selection.

### Add-on

Replace the operational use of:

```js
materialId
amountUsed
```

with:

```js
recipe: Array<{
  materialId: string
  qty: number
}>
```

Version 3 migration converts a non-empty `materialId` into one recipe row using `amountUsed`. An Add-on without `materialId` receives an empty recipe. Version 4 serialization omits the legacy fields. Recipe rows require an existing material, a finite quantity greater than zero, and no duplicate semantic requirement after aggregation.

### Cart package adjustment state

Adjustments live only in transient POS state:

```js
packageAdjustments: Array<{
  materialId: string
  deltaQty: number
  reason: 'separate_bag' | 'customer_declined' | 'combined_packaging' |
          'package_unavailable' | 'repacked' | 'other'
  note: string
}>
```

`deltaQty` is relative to the current derived baseline. A negative adjustment may reduce the effective quantity to zero but never below zero. Adding a Package not present in the baseline creates a positive adjustment from zero. Only active, non-archived materials with `inventoryType: 'packaging'` can be added manually.

### Derived package plan

The domain layer produces:

```js
Array<{
  materialId: string
  materialName: string
  unit: string
  baselineQty: number
  adjustmentQty: number
  requestedQty: number
  fulfilledQty: number
  shortageQty: number
  unitCost: number
  fulfilledCost: number
  expectedShortageCost: number
  reason: string | null
  note: string
  sources: Array<{
    sourceType: 'menu' | 'addon'
    sourceId: string
    sourceName: string
    qty: number
  }>
}>
```

Before checkout, `fulfilledQty`, `shortageQty`, and their cost fields are projections from current available inventory. The saved order contains the final allocation results.

### Order financial snapshot

Add these canonical order fields:

```js
ingredientCost: number
packagingCost: number
expectedPackagingShortageCost: number
foodCost: number
grossProfit: number
packagePlan: DerivedPackagePlan[]
```

`foodCost` remains the compatibility total and equals `ingredientCost + packagingCost`. Existing dashboards and integrations may continue reading `foodCost`; new UI uses the split fields. For migrated historical orders, preserve `foodCost`, set `ingredientCost` to the historical `foodCost`, and default both packaging fields to zero because the old schema cannot reconstruct an accurate split.

Stock shortage records gain `inventoryType`. Package shortage records also retain `expectedCost` and `orderId`.

## Requirement Expansion and Adjustment

1. Expand every cart Menu recipe by cart quantity.
2. Expand every selected Add-on recipe by cart quantity.
3. Classify each requirement using the referenced material's persisted `inventoryType`.
4. Aggregate ingredient requirements by material ID using the existing inventory rules.
5. Aggregate Package requirements by material ID while retaining source contributions.
6. Apply the matching order-level adjustment to each Package baseline.
7. Clamp the effective requested quantity at zero.
8. Reject missing, archived, invalid, or non-Package materials in manual Package adjustments.

Recalculation never rewrites `packageAdjustments`. If a baseline changes, the same delta is applied to the new baseline. The UI must display baseline, delta, and effective quantity so this behavior is visible. A user may reset one adjustment or reset all adjustments to return to recipe defaults.

## Checkout and Stock Allocation

Ingredient allocation keeps the current expiration, lot selection, shortage confirmation, and draft-rebase behavior.

Package allocation uses available non-expired lots and consumes no more than the available quantity. When requested quantity exceeds available quantity:

- return a package-specific shortage result;
- open a warning that identifies requested, available, and missing quantities;
- allow staff to cancel or continue;
- on continue, allocate only the available quantity;
- do not create negative material stock or negative lot quantities;
- save the missing quantity as a package shortage event;
- do not require or infer a substitute;
- do not revisit the event when stock is received later.

The operation remains atomic: inventory, order, shortages, activity log, and draft rebase either commit together or remain unchanged.

## Cost Calculation

Use the existing unit-cost convention for ingredient cost so this feature does not silently change historical ingredient accounting.

Packaging calculations are:

```text
fulfilled packaging cost = fulfilled quantity × package unit cost
expected package shortage cost = shortage quantity × package unit cost
food cost = ingredient cost + fulfilled packaging cost
gross profit = net revenue - food cost
```

No Package cost can be negative. Reducing a Package requirement reduces requested and fulfilled cost to a minimum of zero. The expected shortage cost is informational and excluded from food cost and gross profit.

## User Experience

### Material editor

Add a required choice between `วัตถุดิบ` and `บรรจุภัณฑ์`. Explain that this type controls recipe grouping, Package review, and cost reporting; changing the category does not change the type.

### Add-on editor and catalog

Replace the single material selector with recipe rows matching the established Menu recipe interaction. Group available materials by inventory type and show each row's unit. The Add-on detail view shows separate ingredient and Package sections plus their estimated costs.

### Cart

Add a compact `บรรจุภัณฑ์` summary to the cart showing effective quantities and whether each value is from a recipe or has been adjusted. Normal checkout does not open another confirmation.

Provide `ตรวจ/ปรับ Package` to open an order-level editor. Staff can change effective quantity or add another active Package item. The UI stores the difference as `deltaQty`, requires one standard reason for every changed material, and requires a note for `other`. It provides per-row reset and reset-all actions.

### Package shortage warning

Open automatically only when final Package allocation has a shortage. Clearly state that checkout can continue, available stock will be reduced only to zero, no substitute will be recorded, and the shortage will be saved for review.

### Receipt and order details

Show:

- revenue and channel fee;
- ingredient cost;
- fulfilled Package cost;
- total food cost;
- gross profit;
- adjusted Package rows with reason and note;
- Package shortages and expected missing cost.

Package items do not appear as customer charges or change the order subtotal.

### Dashboard and reports

For the selected period, add:

- total ingredient cost;
- total fulfilled Package cost;
- expected Package shortage cost;
- Package cost per order;
- count and quantity of adjustments grouped by Package and reason;
- count and quantity of Package shortages.

Historical version 3 orders contribute their preserved total to ingredient cost and zero to Package-specific metrics, with no attempt to infer a split.

## Persistence and Google Apps Script

Local storage, JSON backup/restore, and sync payloads use schema version 4.

Google Apps Script must validate the new material type, Add-on recipe, order cost split, package plan, and typed shortage fields. Add-on sheet storage replaces the single material linkage columns operationally with `Recipe_JSON`; legacy columns may remain readable during migration but are not authoritative after a version 4 write. Order storage gains ingredient cost, Package cost, and expected Package shortage cost. Package-plan detail is stored as JSON so source and adjustment evidence survives round trips.

Snapshot validation must reject unsupported versions, invalid inventory types, missing recipe materials, non-positive recipe quantities, malformed adjustments, and negative financial fields. A failed sync must leave the committed local database intact and report the existing recoverable sync error state.

## Validation and Failure Handling

- Reject Add-on recipes containing missing or archived materials at save time.
- Reject finite quantities less than or equal to zero in recipe rows.
- Reject manual Package adjustments referencing an ingredient.
- Reject an `other` adjustment without a non-blank note.
- Prevent an adjustment from producing a requested quantity below zero.
- Revalidate current Menu and Add-on availability at checkout as today.
- If cart contents change while the Package editor is open, recompute the displayed baseline before save.
- If a referenced Package is archived after it was added to the cart, block checkout and ask staff to remove or replace that adjustment.
- Preserve cart, adjustments, and stock when checkout is cancelled or persistence fails.

## Migration and Compatibility

Migration from version 3 to version 4 is automatic, deterministic, and idempotent:

1. Assign every material an `inventoryType` using the current packaging heuristic.
2. Convert each Add-on linkage into `recipe[]`.
3. Add split-cost defaults to historical orders without changing `foodCost` or `grossProfit`.
4. Tag historical shortage records when the referenced material can identify their type.
5. Normalize and validate the resulting version 4 database before committing it.

The migration must not modify Menu recipes, material quantities, order totals, or historical gross profit. Export followed by import must preserve the canonical version 4 representation without another semantic change.

## Testing Strategy

Domain tests cover Add-on recipe expansion, aggregation, source attribution, baseline recalculation, adjustment deltas, clamping, fulfilled Package allocation, shortage events, and cost separation.

Database tests cover version 3 migration, version 4 round trips, invalid types and recipes, historical cost preservation, and malformed adjustment evidence.

Store tests cover cart changes after an adjustment, checkout cancellation, confirmed Package shortage, atomic persistence failure, stock-draft rebase, and the unchanged ingredient-shortage behavior.

Component tests cover accessible Add-on recipe rows, material type selection, Package summary, adjustment reason validation, reset actions, shortage copy, receipt details, and responsive behavior.

Google Apps Script harness tests cover version 4 validation, Add-on recipe storage, split order costs, Package plan round trips, and shortage handling without negative stock.

Run the full unit suite, lint, production build, and responsive smoke checks before release. No production checkout or live Google Sheets mutation is part of automated verification.

## Rollout Safety

- Deploy schema reader/migration and writer changes together.
- Keep the compatibility `foodCost` field throughout the rollout.
- Back up the version 3 database before the first version 4 write.
- Verify a migrated demo and a representative backup locally before deployment.
- Confirm the deployed source commit, Google Apps Script version, and live read-only navigation before enabling real checkout.

