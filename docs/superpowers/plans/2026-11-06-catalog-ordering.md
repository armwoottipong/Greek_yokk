# Catalog display ordering implementation plan

> Execute inline with superpowers:executing-plans; use test-driven-development and verification-before-completion.

**Goal:** An icon opens a drag/drop ordering dialog for menus and for options inside the selected group, with persisted Local/Firebase order.

**Architecture:** Shared accessible pointer/keyboard dialog. Local menu order persists the menu array. Firebase menu order is visual metadata on the existing display/catalog document, saved in one guarded transaction with its own revision and operator-only Rules; recipes, prices and stock stay outside that write. Group option order uses the existing validated group save command. Catalog presentation applies the menu metadata order for management and POS; display listeners synchronize devices. Existing backup includes the display document.

**Constraints:** Google allowlist roles and server connectivity checks; no offline write queue; preserve pending commands and stock drafts; reject stale ordering and duplicate/unknown IDs; preserve all option prices/stock policy/packaging links; keep original drawers and popups.

**Added user requirements:** Sidebar owns the separator border, main owns none. POS cart becomes an icon launcher; confirming an added order animates the source card into the launcher and gives it a smooth small bounce. Desktop cart opens a side drawer, mobile cart a bottom drawer; preserve all checkout/package/pending behavior and reduced-motion support in Local and Firebase.

- [x] Domain order helpers and regression tests for permutations, appended/deleted entities, Local persistence and shared display projection.
- [x] Firebase menu order transaction, generation/role/revision checks and read-only realtime listener; Rules permit only ordering metadata changes.
- [x] Shared ordering dialog supports desktop/touch pointer dragging, keyboard up/down, save/cancel, busy state, long lists and stable focus.
- [x] Menu browser icon and selected-group icon, guarded save and persisted order in both modes.
- [x] Sidebar separator, shared POS cart launcher/drawers, add-to-cart motion, keyboard/focus/reduced-motion and responsive checks.
- [x] UI/Local/Emulator tests for reload, conflict, invalid IDs, Viewer denial and unchanged business data; verify desktop/mobile.
- [ ] Lint/build/tests, review, commit/push, deploy verified Rules and Pages, verify live version and entry asset.


Verification before release:
- Desktop Local browser: source card confirmation leaves the cart collapsed, icon count opens a right drawer; payment, quantities and package review remain accessible.
- Mobile 390x844: bottom drawer and compact option ordering; desktop pointer drag moved the last menu first, saving and reload retained the new order.
- Shared launcher tests cover flight cleanup, leaving POS and reduced motion. Existing Local and cloud cart tests now open the launcher explicitly.
- Firebase Emulator: 57 passed, 1 optional legacy-backup workflow skipped. Production-structure group deletion proof passed. Operator order-only write, Viewer denial, Google auth, generations, exact ID permutations and immutable business root verified.
- Review found and fixed independent menu-order revision loss on stock-draft acknowledgement. Added red/green regression covering live updates, acknowledgement and stale reads; focused re-review found no outstanding issue.
- Design detector: zero anti-patterns; intentional 22px launcher radius has one advisory. Lint and production build passed; Vite retains the existing large-chunk advisory.
- Before release, live Rules matched baseline HEAD; no remote Git changes to integrate.
- Final normal suite: 1618 passed, 1 skipped (210 files); no failures. Lint, production build and diff whitespace checks passed.
