# System interface — confirmed A

Mode: Operate. Targets: src/App.vue; src/views/*.vue; src/components/**/*.vue.
Authority: PRODUCT.md, DESIGN.md, docs/superpowers/specs/2026-10-11-system-interface-design.md.
Build path: code-first app screens.

POS: catalog and one shared cart; adaptive review sheet when the container cannot split. CustomOrder, shortage and lot decisions preserve their layered flow. Subtotal is payment; GP/COGS are secondary details.

Stock: at 1200px and above, use the inventory table with a dedicated two-line date column between material and type. Inline lot rows share the eight column proportions (23/13/10/15/11/12/8/8 percent). Keep its 1280px minimum width and horizontal scrolling inside the table wrapper. Apply the renovated cream/burgundy styling. Below 1200px, retain the responsive inventory list carrying identity/type/usage, quantity and draft delta, purchase-unit cost, value, named status and receive/produce actions; identity spans the row and metrics/actions reflow into two columns below 640px. AppSearch and shared Button filters lead the toolbar; edit/history/waste/archive and archived restore/permanent-delete remain contextual. MaterialEdit, StockIn, StockAdjust and Waste share named AppInput/AppSelect controls, shared Buttons, default DialogFrame headers and the bounded 720px form frame; Stocktake uses a 980px DialogFrame with AppSearch/AppInput and its retained count/variance layout. Form groups inherit the existing warm filled popup treatment and share responsive section/footer spacing. Source of truth remains store helpers. Draft review never commits on close/filter/resize; count units, Enter navigation, purchase, production, waste and deletion retain existing intent/confirmation. See stock-management.md for the bounded surface direction, review/stock-documentation-review.md for historical renovation evidence and review/stock-table-documentation-review.md for the table correction comparison.

Menu and Add-on: one responsive management row list with shared search and an inline display-channel selector, independent of the POS platform. Show the selected channel's price in each row; all channel prices remain in contextual details and edit. CatalogManagementRow reflows on compact screens, with named recipe/edit/delete actions. Ingredient and packaging details are grouped; editors share affixed price inputs, selects, error-aware recipe rows and mounted disclosures inside the common dialog pattern. Price fields stay in two columns until below 360px. Add-on validation reveals a collapsed recipe section before focusing its invalid control; save/discard and confirmation retain the existing store behavior. Search and display channel replace the former category-filter presentation.

Dashboard: preserve four report views, Bangkok ranges and recorded financial snapshots. Make bill list and graphs usable on touch/keyboard; preserve exact tooltip toggle, arrow, highlight and dimming behavior.

Inventory valuation: a two-sided switch in the chart header switches between categories and individual material names. Categories remain the initial view; material rows include active ingredients and packaging, sorted by value descending, including zero-value stock. Stable material IDs distinguish duplicate names. Both views use the existing current/draft stock × latest unit cost, independently of sales report dates, and retain the selected bar/donut presentation. Controls wrap on narrow screens. Verified desktop and 390×844 mobile controls, keyboard focus, matching totals, pending drafts, reactive stock changes, archived-item exclusion and empty inventory. Regression suite: 71 files / 447 tests passed; lint and production build passed. No shop data was changed.

Settings: preserve the existing category structure; fix edit-field labels, connection feedback and confirmation consistency. Saved URL is not a successful sync.

States: default, empty, no-results, dirty, loading, error, success, disabled and long content where real. Physical iPad/Safari/keyboard/zoom remain explicit manual QA gates.

Anti-goals: no backend changes, new auth, new payment processor, new report formulas, schema migration or data writes to the real shop during verification.

## Implemented direction promises
Dropdowns use the shared `AppSelect` component. The dashboard inventory view uses shared `AppChoiceGroup` with its switch variant: two visible options on one soft cream track, a cream selected button and burgundy selected text, matching the bar/donut controls. Native radio semantics keep exactly one view selected and support arrow-key navigation. Verified desktop and mobile without horizontal overflow; dashboard regression tests, lint and build passed. Surface CSS only arranges the controls.

THESIS: A shop workspace with essential actions first and contextual details on demand.
OWN-WORLD: Cream yogurt surfaces, burgundy #5E0205 mascot identity, rounded touch controls and restrained motion.
STORY: Choose, review, act, then receive explicit feedback; preserve business drafts across device layouts.
FIRST VIEWPORT: Desktop and iPad expose shop work; phone prioritizes quick management over analytical density.
FORM: Shared named fields and viewport-bounded dialogs; compact touch lists reveal detailed lots, recipes and channel data.
Evidence boundary: These promises describe the user-approved A direction and implemented code. No separate FORM seed or QUALITYBAR card was supplied or approved; no retrospective concept approval is claimed.
