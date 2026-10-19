# Menu option groups

Approved in chat: reusable groups of existing add-ons; menus attach multiple groups; selection limits and prices belong to the group. Execute inline as requested by the user.

## Decisions
- Keep schema 4 compatible by adding optional `addonGroups` and menu `addonGroupIds`. Missing menu group IDs preserve the legacy global add-on picker; an explicit empty list offers no options.
- Group: ID, name, min/max selections, allowRepeat, pricingMode (`included` or `extra`), options (`addonId`, optional platform `prices`). Extra without an override uses the add-on prices. Included is always zero.
- Selections snapshot group ID/name, resolved platform prices and selectionQty. Inventory still consumes the add-on recipe, including free choices. Counts refer to portions when repetition is enabled, otherwise distinct kinds.
- Invalid/stale group selections block add-to-cart and checkout. In-use groups/options cannot be deleted silently. Existing order snapshots remain immutable.

## Tasks
1. Add behavior tests for migration, persistence, constraints, mixed free/paid pricing, repetition, inventory and platform switching; run red.
2. Implement `src/domain/addonGroups.js`, optional database normalization and store CRUD/selection checks; update pricing and inventory consumers.
3. Add group management inside Add-on view using shared form/dialog controls. Add menu group assignments and grouped POS selection with limits and optional quantity controls.
4. Verify interaction tests, full test suite, lint/build, sync roundtrip and desktop/mobile browser checks. Record evidence and limitations.

## Ledger
- Initial repository clean. Existing Vue/Pinia app, schema 4, JSON snapshot sync; existing recipes and add-on catalog reused.
- User's instruction to proceed is the approved in-chat design and execution direction; no unrelated redesign or live shop data edits.
- Completed all tasks. Final verification: 549 tests across 89 files, lint/build, diff check, real browser create/assign/sell flow at 390/820/1280px. See `docs/superpowers/verification/2026-10-19-option-groups.md`.
- Review fix: reject stale group-tagged cart items after switching a menu to legacy; refresh cart selection identity after channel price updates. Preserve existing cart price/recipe snapshot policy and immutable sold orders.
