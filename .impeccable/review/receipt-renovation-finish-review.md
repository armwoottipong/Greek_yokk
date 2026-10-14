## verdict

1. Resolved — empty expiry affix/calendar alignment. All six recaptures are valid and show the expiry calendar aligned with the receive/production calendar at equal trailing insets; the stacked phone fields now align directly. StockInModal.vue conditionally declares the suffix slot with `v-if="expiryDate"`, retaining the named inline clear action when populated. The parent reports the targeted populated/clear/no-affix regression test and final lint/build passed; this verdict independently inspected source and captures only.
2. Fix-batch regressions: none visible in the six recaptures.

## remaining

Clear. This ship verdict covers the scored empty-affix fix.

disposition: ship
