# Complete Firebase inventory

User approved completing the original inventory product. Preserve layout/styles,
Spark, Google login/equal accounts, server-confirmed writes, immutable command IDs.
User explicitly chose clearing the shared history view while retaining backend
receipts for idempotency/cancellation. No automatic live business deletion/test writes.

1. Certified material_delete removes only an archived, zero-stock, unreferenced,
non-protected material with no outgoing recipe. Atomic registry removal + document
removal + immutable receipt. Monotonic material ranks prevent reuse after deletion.
2. Certified history_clear advances a shared root revision cutoff and appends an
immutable receipt. Hide entries at/before cutoff and legacy entries. New operations
and cancellation of older bills remain visible/correct. Do not delete receipts.
3. Bind original buttons with existing loading/error/confirmation controls. Carry
removal through draft projections and refresh history when another device clears.
4. Native/emulator security + model/UI tests, full lint/test/build, fresh review,
deploy scoped Rules and Pages with rollback source and verified SHA/assets.
5. Physical two-device live acceptance requires user operating second device. Keep
that claim separate from two-client native race and read proofs; no invented100%.
