# Add-on pictures and catalog identity layout

User requested the existing square picture module for Add-ons and materials,
then asked for a taller catalog identity picture and balanced mobile content.

## Implementation

- Add-on create/edit form uses the existing JPEG crop/editor module, with local
  persistence and separate Firebase `catalogImages/addons_{id}` documents.
- Existing cloud Add-on picture-only edits skip business writes. If business
  save succeeds but the picture fails, retain the new entity ID and retry only
  the picture. An edited business form is not silently replayed after that point.
- Add-on pictures display in the original catalog header/list/rows and local/cloud
  order options. Option thumbnails have explicit 32×32 bounds.
- Materials already use this module; regression coverage checks that picture-only
  material updates do not restore a stale stock quantity after another sale.
- Local import validates Add-on JPEGs; Firebase backup recovery accepts their
  separate image documents. No changes to backup protocol identifiers.
- Rules add only the `addons` picture kind, require an existing catalog entity,
  and retain Google/allowlist/Manager/Admin, active-generation, author, timestamp,
  revision and data-size checks. Viewer cannot read/write catalog pictures.
- Replaced the equivalent ID-length comparisons with `integer(size,1,160)` to
  fit the same compiler budget. Production preview executable: 255,941 bytes.
- Selected catalog identity uses a square picture column of 112–144px with a
  flexible text column, vertically centered content and 112px picture on phones.
  On phones, description/status span below the picture/title row and the More
  action sits beside status so it does not squeeze long Thai names.
  Empty headers retain their original single text block. List pictures stay 40px.

## Verification boundary

New Add-on UI, transaction, Rules and recovery cases were observed failing before
implementation and passing afterward. Shared crop logic is unchanged. The native
picture permissions test covers Manager/Admin success, Viewer denial and missing
Add-on denial. UI tests exercise picture-only Add-on saves and partial-save retries
without duplicate entity creation. Existing exact payload expectation now includes
the local `image` field.

During layout inspection, a local-only fixture with 512px JPEGs exposed an early
flex sizing attempt making a rectangular thumbnail; that was replaced by an
explicit square grid. Final native browser screenshots verified 1280px, 820px,
390px and 320px: square images, full picture/title-row height and no horizontal
overflow. Mobile description/status use the full available width. Screenshots
are retained in the ignored local evidence directory. No production business
data was edited.

An initial combined native run saw rules-context failures in the legacy inventory
suite while source regeneration was in progress; isolated frozen-source inventory
and picture suites subsequently passed 51/51. Final frozen-source ordinary/native
suite passed: 199 ordinary files (1,525 passed, one skipped), seven native Firebase
files (102 passed, two skipped). After the final responsive CSS adjustment, four
catalog UI files passed 15 tests; lint and production build passed. Build retains
the existing chunk-size advisory. Active Rules readback and Pages outcomes are
recorded in chat.
