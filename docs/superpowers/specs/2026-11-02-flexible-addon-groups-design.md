# Flexible Add-on Groups and Focused Catalog UI

**Date:** 2026-11-02
**Status:** Long-term design; first release scope revised by user
**Scope:** Add-on group management, menu assignment, availability, POS selection, and catalog analysis presentation

## First release scope revision (2026-11-02)

The user chose to ship the reference-inspired UI on the existing Firebase capability first. This release changes the management presentation: group-first Add-on cards, a menu group picker that can create a group and return, and on-demand all-platform analysis in a desktop dialog or mobile drawer. Existing pricing, selection and recipe-based stock deduction remain in force. A menu remains limited to **two groups** in the current cloud validation. Group-scoped availability is labeled **“ไม่พร้อมใช้งาน”** as a placeholder and cannot be changed or enforced yet. The six-group and availability sections below describe future work and are not release claims for this UI package. No Firebase Rules or cloud protocol changes are included in this release.

## Intent

Yoggie staff should create reusable option groups without a code or Firebase change for each new group. A menu can combine a required spoon choice, three included fruits, and optional paid toppings, then use different groups later. Free and paid choices still deduct stock from their recipes. The management UI should read like the supplied mobile references while retaining Yoggie's visual identity. Detailed financial analysis should be opened on demand.

## Goals and boundaries

- Support up to six groups assigned to one menu. Creating, reordering, or assigning groups within that proven capacity is normal catalog editing, not a deployment.
- Preserve the existing Add-on catalog, recipes, per-platform prices, inventory behavior, order snapshots, and role permissions.
- Allow a group to be entirely included in the menu price or to price each option by platform. In the latter mode, a zero price makes an individual option free. Price never controls stock deduction.
- Keep unavailable options in their group as visible, disabled placeholders. Availability belongs to the group-option relationship; the same Add-on can remain available in another group.
- Block adding a menu to the cart when its required groups cannot meet their minimum with available options. Revalidate selections at checkout, including carts opened before an availability change.
- Keep current production Firebase login and local POS separation. This design does not authorize enabling an unfinished backend, importing live data, or changing billing.

Out of scope: copying the reference app's branding, changing the original StockView, redesigning checkout, or moving recipes into option groups. A group points to Add-ons; each Add-on continues to own its recipe.

## Approaches

1. **Selected: extend the existing group model and bounded Firestore proof.** Use the current catalog, menu group IDs, recipes, and presentation components. Generalize the planners and Rules once for six groups, with an explicit checked transaction budget. Staff then add groups through the UI. This preserves Spark and existing order history, but requires a careful Rules and migration proof.
2. Keep the current two-group backend and combine several customer questions into one group. This would obscure required counts, pricing, and stock behavior, and would not meet the flexible-group goal.
3. Move catalog and sale validation to a server service. This changes the deployment and operating model and is unsuitable for the current Spark release.

## Domain and data

- A **group** owns its name, minimum and maximum selections, repeat rule, pricing mode, ordered option IDs, and per-platform option price overrides. A menu stores ordered group IDs.
- A **group option** keeps its Add-on ID and availability state. Add a group-scoped unavailable ID set to the canonical cloud group and an equivalent state to local groups. An omitted field means all existing options are available. Removing an option from a group remains a separate explicit action.
- An unavailable option keeps its price override and Add-on recipe. It cannot be selected for a new sale. Globally retiring an Add-on continues to make it unavailable everywhere.
- `included` groups price all selections at zero. `extra` groups use each option's price for the selected platform, including zero. The selected Add-on recipe deducts the same inventory quantity in either mode.
- A spoon choice can be a required, exactly-one group. The “รับช้อน” Add-on recipe consumes one spoon; “ไม่รับช้อน” has no spoon requirement. If the base menu recipe already consumes that spoon, block saving the menu-group assignment until staff correct the base recipe; a warning alone would permit double deduction.
- Existing order snapshots remain immutable. New sales record the selected group/Add-on pair, price, recipe and stock evidence. Changing group availability or prices later must not rewrite history.

## Capacity and validation

The current cloud path validates at most two groups per menu in `catalogMenu.js`, `saleGroups.js`, and `firestore.rules`; it also contains special two-group sale snapshots and a three-selection-per-group condition. These are application limits, not a reason to edit Firebase whenever staff create a group.

Generalize group binding, sale calculation, receipt evidence, backup/import checks, and Rules for an ordered list of up to six groups. Set a tested combined selection and material-read budget; reject an over-budget configuration in the editor with a specific explanation. Do not silently omit choices or accept a sale that Rules cannot validate. Prove worst-case document size, Rules evaluation, transaction reads/writes, and Spark compatibility before releasing the six-group capacity. If the proof fails, bring the measured limit back for a product decision; do not silently reduce the agreed capacity.

All six groups need the same semantics. Avoid separate one-group and two-group sale paths that would need another rewrite for the next group count. Existing records with `groupId` or two `groupIds` must remain readable and gain the new form through a deterministic compatibility path.

## Management experience

### Add-on area

Show reusable groups as the primary directory. Each card shows its name, required/optional rule, number of available options, and number of menus using it. Expand a card to scan its options and availability; open its editor to change the name, rules, prices, order, or availability. Keep the existing Add-on item directory and recipe editor reachable as a secondary section. A group needs existing Add-ons before options can be added; its empty state links to creating one.

The availability control uses an explicit “พร้อมใช้งาน” state. When off, the row stays in place with “ไม่พร้อมใช้งาน”, disabled styling, and retained details. The editor distinguishes “ไม่พร้อมใช้งาน” from “นำออกจากกลุ่ม” so a temporary pause does not erase setup.

### Assigning groups to a menu

In the menu editor, a “เลือกกลุ่มตัวเลือก” control opens a picker. Show every group with its required/optional rule, option summary, readiness, and a checkbox. Provide “สร้างกลุ่มตัวเลือกใหม่” and return to the picker with the new group selected after save. Preserve the chosen order because the POS shows groups in that order. Show the resulting group summary in the menu editor before saving.

On phones, this picker is a bottom drawer like the reference. On desktop, use a centered, keyboard-accessible dialog or anchored panel sized for scanning and editing; do not stretch the phone sheet across the screen. On iPad, choose the sheet or dialog based on available width and touch space. Keep Yoggie colors, typography, and existing form components.

### Analysis on demand

Replace the always-open “ภาพรวมทุกแพลตฟอร์ม” section in both Menu and Add-on detail with a compact, labelled icon button “วิเคราะห์ต้นทุนกำไร”. Desktop opens a dialog; mobile opens a drawer. Reuse the current `MenuPlatformOverview` and its explanatory text, including menu estimate modes. Keep recipe, stock, and group information visible in the main detail view. The control shows no fabricated profit when cost is unknown.

## Sale experience and edge cases

- POS lists groups in menu order, with their required/optional counts and free/paid prices. Unavailable options remain visible with “ไม่พร้อมใช้งาน” and cannot be selected.
- If available options cannot satisfy a required minimum, show the menu with “ยังขายไม่ได้” and disable add-to-cart. Do not default to an unavailable selection.
- If an option becomes unavailable after it entered a cart, keep the cart and pending command visible, reject checkout, and ask staff to reselect. Never create an offline sale queue.
- A group may be shared by several menus. Changing availability updates future selections for each menu, while historical orders stay unchanged. Show how many menus a change affects before saving.
- Free options still consume their recipe. Paid options without a recipe do not deduct stock; show that explicitly in management UI.

## Verification and release

Test required/optional groups, included and per-option zero/paid prices across platforms, group-scoped unavailability, repeat counts, group order, unsatisfiable menus, stale carts, stock deduction, cancellation, backups, Rules acceptance/rejection, and one through six groups. Use a bounded worst-case proof for the combined selections and inventory transaction. Check desktop, iPad, and mobile layouts, focus return, keyboard access, screen-reader labels, and long Thai option names.

Before a release, run relevant tests, lint, and production build; inspect remote changes; commit, push, deploy through GitHub Pages, then verify GitHub Actions and live `version.json` plus entry asset. Source publication alone does not enable the Firebase backend or live business-data migration.
