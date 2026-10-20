# Add-on management — task-first catalog

Mode: Operate. This is an ordinary extension of the approved menu-management surface and existing cream/burgundy identity. The 14 October 2026 direction established shared menu styling, add/edit popups and responsive layouts. The approved 20 October 2026 direction makes the directory the default and exposes option groups on demand.

## Direction contract

- THESIS: task-first catalog.
- OWN-WORLD: the existing shop workspace; retain its cream surfaces, burgundy accents, Thai typography and familiar controls.
- STORY: directory first, option groups through a separate section switch.
- FIRST VIEWPORT: section navigation, search/channel/add controls and aligned directory rows.
- FORM: Operate; prioritize recognizable actions, readable prices and dependable validation.

## Current surface behavior

The page opens on the Add-on directory. Two named switch buttons show directory/group counts and expose their selected state with `aria-pressed`; they are buttons, not a tab-widget contract. The toolbar, directory and option-group manager remain mounted through `v-show`, so switching sections preserves the directory search and selected display channel. The display channel is local to this page and independent of the checkout channel.

The responsive directory shows name, ingredient/packaging recipe summary, selected-channel surcharge and named edit/delete actions. Desktop column headings align the row content; compact layouts omit the headings. Empty and no-match states name the next action. Details and edit retain every channel price. The option-group list shows selection limits, included/extra pricing, option names and usage counts, with its own add/edit/delete actions and empty-state guidance.

Add/edit retains identity, channel-price and recipe disclosures, smooth disclosure motion and fixed footer actions. Preserve ingredient/packaging grouping, missing/archived material warnings, duplicate checks, positive recipe quantities, save/discard behavior and store payloads. The group editor associates inline name/minimum/maximum errors with their fields and an options error with the option section. Failed submission focuses the first invalid name/minimum/maximum field, then the options section when those fields are valid. Add-on name and recipe validation retain their existing focus/reveal behavior.

Phone native inputs use 16px text. Secondary copy uses the surface-local `--addon-text-secondary` value (#705C50), rather than changing the global muted token. The latest explicit user override is no outline focus: scoped Add-on workspace, group-form and Add-on editor content suppress focus-visible outline and box-shadow. Keyboard focus movement, labels and error associations remain. This override is local to this surface; it does not redefine shared button focus elsewhere.

Checkout pricing, option-group rules, inventory behavior, storage and sync remain outside the redesign. Reuse shared toolbar, field, search, select, recipe and dialog components. Do not promote this page composition or its local overrides into the global design system, and do not repair unrelated pre-existing drift in this task.

## Current review evidence

Documentation comparison: `.impeccable/review/addon-redesign-2026-10-20/documentation.md`. Current capture folder: `.impeccable/review/addon-redesign-2026-10-20/`, including `desktop.png`, `mobile.png`, `ipad.png`, `groups-mobile.png`, `group-error-mobile.png` and `group-error-320.png`. These capture references are separate from the historical verification below; final implementation validation belongs to the current review record.

## Historical verification — 14 October 2026

The prior reviewer recorded ship in `review/addon-finish-review.md` after twelve captures and source inspection. Documentation comparison was `review/addon-documentation-review.md`; incumbent token values were preserved. Captures were `review/addon-directory-{desktop,mobile,ipad}.jpg`, `addon-edit-{desktop,mobile,ipad,320}.jpg`, `addon-recipe-editor-mobile.jpg`, `addon-add-{desktop,mobile}.jpg` and `addon-details-{desktop,mobile}.jpg`. Layout measurements in `addon-layout-checks.json` reported no document/editor horizontal overflow at 320/390/820px. Synthetic in-memory preview add/save with zero price and an empty recipe succeeded. The prior full run passed 77 files / 469 tests, lint/build and diff check. Detector advisory typography findings were retained without a palette/type change. These results describe the earlier implementation, not certification of the 20 October redesign. Physical iPad/Safari, screen-reader and physical keyboard behavior is not certified by viewport emulation.
