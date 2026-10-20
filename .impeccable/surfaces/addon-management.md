# Add-on management — selected-item analytics workspace

Current superseding surface brief, 20 October 2026. This worktree implementation extends the approved menu workspace pattern within the established cream/burgundy/Prompt shop. The previous directory/detail-sheet composition is preserved as history below. PRODUCT.md, DESIGN.md and .impeccable/design.json retain global authority; no new visual world or global token migration.

THESIS: Select one Add-on and read its standard per-channel surcharge, incremental costs/profit and recipe together.
OWN-WORLD: Inherit the calm shop workspace, menu-like header/list/analysis/recipe composition, semantic chart colors and existing native/shared controls.
STORY: Search the left list, select an Add-on, compare bar/circle/line analysis, inspect its recipe and open the original editor popup. Open option groups through a separate section switch.
FIRST VIEWPORT: The active Add-on identity, sale status, configured-channel/recipe counts and add/edit actions lead the workspace. A direct trash button opens confirmed delete; the selected list, analysis and recipe follow.
FORM: AddonView composes new AddonRecipeDetails with shared MenuPlatformOverview/finance charts. AddonEditModal remains the original DialogFrame popup; no inline editor or replacement details popup is introduced.

## Follow-up alignment with main

Merged main through eb4a478. The Add-on header now uses the same direct trash action as MenuView, retaining exact-item confirmation. Menu and Add-on share AnalysisInfo: calculation definitions and the Add-on standard-price exclusions are behind the upper-right info tooltip, with hover, touch, keyboard, Escape and outside dismissal. Focused form labels retain text/underline feedback without the burgundy background, including AddonEditModal. The shared finance charts retain explicit-zero Add-on prices and unit labels while adopting Dashboard segments, colors, hover/selection, tooltip and motion styles. Earlier captures below predate this follow-up; no new rendered acceptance is claimed.

## Latest requested pricing visibility

Supersedes the earlier zero-surcharge display rule: Menu and Add-on analysis now show only configured prices greater than zero. Header channel counts follow the same rule; blank/unset prices are omitted when saving Add-on drafts instead of becoming zero. Explicit zero remains stored for existing sale/group behavior but is hidden in analysis. The shared sidebar list now has zero padding and square, borderless items with a 3px WebKit scrollbar and thin native fallback.

## Current implementation

The list searches name/description and exposes selected state. Desktop retains list at left, financial analysis centrally and a 288px recipe rail when menu-content is at least 840px. List width is 208px by default, 192px through viewport 1199px and 224px from 1800px. Reports become two columns only when their analysis container reaches 728px. Below 768px the page switches between list and selected detail, with a named back action. Section switches use named aria-pressed buttons, not an ARIA tab widget; the existing group manager remains separate and mounted.

Header add/edit retain the established popup. More uses native details, closes on Escape/outside/focus departure and keeps delete behind the existing destructive confirmation. Recipe edit enters the recipe section of the same editor. Successful creation selects savedAddonId, clears search if it would hide the saved Add-on, and waits for overlay release before requesting heading focus. Cancel/failure do not select an unrelated added record. The corrected phone back action restores the selected Add-on list button through its Add-on data selector.

All-channel analysis has bar, circle and line modes with textual surcharge, cost, GP, profit/loss, net and margin. An explicit numeric zero Add-on surcharge is configured and remains visible; absent/null/blank or invalid prices are hidden. This Add-on opt-in does not change menus' positive-price-only default. Zero-denominator shares/margins remain unavailable; losses are named. The UI explicitly limits analysis to standard Add-on channel prices: it excludes the main menu price, group-specific custom prices and choices included free in menus. It is incremental Add-on analysis, not total order profitability.

Unknown material costs/missing materials/indeterminate quantities propagate null through row, group and total costs; analysis cannot invent profit from an unknown total. Genuine zero cost and a recipe with no stock deductions retain zero. Recipe sections name ingredient/packaging quantities, stock availability, missing/archived materials and groups using the Add-on.

Local no-outline/no-ring styling retains non-outline fill/underline/label/search-icon feedback, with forced-colors rules inherited from the menu pattern. Cream surfaces, burgundy selection, Prompt and local warm secondary text stay in scope. These are surface arrangements, not new global token rules.

## Current evidence and limits

Five real browser captures were inspected: ../review/addon-workspace-2026-10-20/{desktop,phone-320,editor-320,ipad,wide}.png. They show the 1440px bar/recipe composition, 320px donut detail, original editor at 320px, 768px line comparison with tablet navigation and 1920px two-column reports/recipe rail. The implementer reports actual browser-width checks at 320/768/1440/1920px with no horizontal overflow. This is current rendered evidence, distinct from earlier Add-on screenshots below.

The source reviewer found one phone back-focus data-selector defect; the implementer reports a failing regression followed by the fix and 11 passing focused tests. Fresh final verification reported by the implementer: npm test PASS (98 files / 618 tests), npm run lint PASS, npm run build PASS (1749 modules), git diff --check PASS. The back-focus follow-up addonWorkspace suite passed 11 tests. Physical Safari, physical iPad behavior, 200% zoom and comprehensive assistive-technology/keyboard acceptance remain unverified. No Add-on production deployment is claimed. Current verification: ../../docs/superpowers/verification/2026-10-20-addon-workspace.md.

## Historical directory and editor records

The following brief is preserved for provenance. Its directory channel selector, row layout, details sheet and “current” evidence language belong to the earlier implementation and do not supersede this workspace.

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
