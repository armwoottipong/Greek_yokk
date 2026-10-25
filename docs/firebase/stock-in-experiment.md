# Stock-in command experiment

Status: **test only**, part of the source-shaped set candidate. No POS action,
product entrypoint, live database or deployable policy is enabled by this work.

A stock receipt updates exactly three documents atomically: shop revision,
material state and immutable operation. The receipt binds author, source material
revision, next shop revision, exact quantity, incoming price, pack cost, note,
received/expiry days and target lot. Source revision fences prevent replay. All
Google-signed-in users have equal access; there is no profile or role requirement.

Ingredient receipts merge into the earliest original positive lot with matching
receive/expiry days; otherwise they append a new stable lot ID. Packaging merges
into its existing master lot, or creates its first master when none exists. Every other lot and its metadata remain immutable.
Zero-quantity history is retained. The original insertion-order list remains
separate from sorted working allocation slots.

The material computes the same moving weighted unit cost as the POS and rounds
it to four decimals. An ingredient merged lot uses its own weighted cost, including
the existing POS zero-cost fallback behavior; a packaging master retains its
unrounded weighted cost. Prices remain Baht/unit IEEE values, quantities are exact
hundredths, and pack costs use satang. Original legacy lot fields remain provenance;
initialQtyQ and current canonical date/cost fields are separate until a final codec
has been certified.

The new lot's display createdAt is a client ISO string. createdByOpId links it to
the immutable receipt's authoritative server timestamp. A serverTimestamp transform
must never be kept in a material plan and re-emitted by a later sale. Follow-up
commands read resolved material state before staging writes.

The material guard checks exact stock increment, weighted cost, bounded slots,
nonnegative complete positive-stock sum and active/expiry/receive/ordinal order.
The receipt checks only-target-lot differences, expected merge versus append,
lot metadata, received/expiry dates and the stable original list. Root revision,
receipt and material links force all writes to exist in one commit. Distinct
accesses are root-after, receipt-after and material-before/after (four globally).
Individual write guards use fewer than ten accesses.

The planner retains zero-quantity stale active flags. Rules require all positive
stock to appear in the working slots but can omit an inactive zero or stale zero
active history lot from that working set. Its original lot/map metadata remains
preserved. Such omission does not change stock, cost or future positive allocation
priority; future commands that reactivate a lot must reconstruct the full index.

## Compatibility and remaining limits

The stock planner is tested against the existing Pinia stockIn action for new,
merged, packaging, free incoming stock and zero existing lot-cost cases. Optional receipt dates are accepted only for packaging; ingredient receipts
require a received day. Empty ingredient stock, a stale zero active lot, an
expired active lot with other unexpired stock, a zero packaging master and an
empty packaging inventory are covered as distinct positive shapes. Source
checks use temporary copies of an actual ingredient and packaging item and retain
the source backup hash. No source orders, logs or external URL are imported.

Four live allocation slots remain a hard experimental limit. A fifth positive lot
is rejected as a whole command. A merge at capacity may succeed. The importer must
already validate nonnegative complete stock, stable IDs/ordinals and current indices.
Multiple positive packaging lots requiring the old consolidation behavior are
not implemented here; those cases must remain blocked,
not silently discard history. Source backup packaging has one stored lot.

Stock-in, sale and the older bounded candidate still require complete common
size/index/headroom certification. Production, cancellation, other inventory
mutations and catalog maintenance are not added to the source-shaped candidate.
Tests from the older representation do not certify them here. The source preflight
and product transport remain closed until those gates are met.


## Verification checkpoint — 2026-10-20

Full serial Emulator verification passed **23 files / 340 tests** in 200.75s,
including 43 stock-in cases and six opt-in supplied-source checks
(`stock-in-final-emulator.log`, ignored execution ledger). The ordinary app suite
passed **111 files / 770 tests** in 54.47s. Lint, build and diff checks pass.

A final source audit found that 12 of the supplied 18 lots have initial quantities
different from remaining stock. Two unit regressions first failed when the test
adapter initialized initialQtyQ from remaining qty. It now converts the original
initialQty exactly; a missing original initialQty follows the existing POS zero
fallback. It never substitutes remaining qty. Original initialQty remains preserved
as provenance. The affected 43 stock-in and six source cases were rerun and passed
**49 tests** in 67.31s (`stock-in-final-initial-proof.log`) after that adapter-only
fix; Rules were unchanged from the full 340-test run. Domain comparison covers
seven stock-in scenarios plus seven source-adapter scenarios. The source backup
SHA256 remains unchanged.

Read-only independent review found no Critical/Important bypass under the stated
trusted-import invariants. The documented stale-zero working-index distinction
remains a minor modeling limitation. Passing counts do not complete the migration
or certify commands that have not been implemented in this representation.
