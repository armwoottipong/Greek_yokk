# POS — clean counter workspace

Mode: Operate. Primary target: src/views/PosView.vue. Related targets: src/components/pos; CustomOrderModal, PackageReviewModal, LowStockWarningModal, LotDepletionModal, ReceiptModal; shared dialog field styling.

User direction, 13 October 2026: redesign PC, iPad and mobile including popups. Clean design with fewer input borders, no input outlines or focus rings, recognizable branding and clear operation. Preserve price, stock, checkout and overlay behavior.

## Direction contract

THESIS: A clear selling counter: choose a bowl, review one order, pay. Avoid equal emphasis on transaction totals and accounting details.

OWN-WORLD: Existing Greek Yogg cream and burgundy, Prompt Thai and tabular numeric prices. Rounded cream fields without resting outlines or input focus rings as requested. Mascot appears in the empty cart; actual menu emoji remain catalog content.

STORY: Channel sets the price context; menu cards expose price and customization. One shared cart keeps notes, packaging and payment through rotation. Warnings name the shortage and next action.

FIRST VIEWPORT: Catalog heading, channel and search above two or more menu columns; desktop order on the right with payment anchored below it. Compact screens expose a fixed cart total and a scrollable review sheet. Popups keep actions outside their scrolling body.

FORM: Code-led refinement of the specifically proposed and user-steered existing catalog/cart composition; no concept seed or generated comp. Selection checkmarks and clear action labels carry state without input rings.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance


## Implemented composition

The workspace splits at 696px of available width, with a 16px gap and a cart width of clamp(320px,30%,380px). Catalog and cart scroll independently; payment stays in the cart footer. Below this threshold, one fixed review bar exposes quantity and total and opens the shared cart sheet. The sheet keeps payment outside its scrolling body; changing presentation retains one cart.

Catalog heading, channel and search precede an auto-fill grid with a 200px minimum card width and 14px gaps. At catalog container widths <=440px, controls stack and cards stay in two minmax(0,1fr) columns with 10px gaps. Cards retain actual menu emoji, wrapped names, burgundy prices and named add/customization actions. Empty catalog distinguishes no search matches from no menus ready to sell. At the user's request, the empty order reuses public/brand/content-mascot.svg, the branding logo used by the content loading screen on a cream background, at 88×88px; no new shipping raster was introduced.

Cart rows expose bowl quantity, topping amounts, packaging and a named order note. Accounting detail stays in a disclosure. Payment selection uses a checkmark and aria-pressed; checkout has a 52px minimum height. Popup customization uses named selectable topping buttons and a separate quantity/total/action footer. Packaging editor rows use spacing and separators; shortage and next-lot decisions use named semantic fills. Receipt names wrap inside a 440px dialog.

## Field and type treatment

All DialogFrame native text/number fields, selects, textareas and AppSelect triggers use warm bg-soft fill and transparent borders with no outline or box-shadow, including focus and expanded states. Focus keeps the same fill. The cart order note follows the same borderless and ringless treatment. This is the user's explicit 13 October instruction, scoped to those fields; action buttons keep existing keyboard focus. Visible labels, hints, error relationships and keyboard selection semantics remain. Popup disabled fields use .55 opacity; aria-invalid fields use danger-soft fill and danger text.

POS channel/search, cart note and package fields use 12px corners. Channel/search and package inputs have 48px minimum height; other shared popup fields retain their component radius and at least 44px minimum height. Native controls below 1200px retain the existing 16px type rule. Prompt remains the Thai face and Plus Jakarta Sans remains the numeric face. Catalog/cart/dialog titles use 18px at weight 600, menu prices and review totals use 18px numeric type, customization bowl total uses 24px, and payment total uses 26px. These are scoped roles, without changing the app's global type ramp.

## Evidence and limits

Browser measurements reported no horizontal overflow at viewport widths 320, 390, 820 and 1180px; final screenshots are under .impeccable/review/*.jpg. The earlier full regression run passed 71 files and 447 tests. Final validation after the UI batch passed eight UI test files and 28 tests; lint and production build both exited 0. An in-memory browser checkout after closing nested packaging review produced a receipt. Price, GP, cost, stock, checkout, persistence and sync semantics remain the constraint. Viewport emulation does not validate physical iPad/Safari, screen readers or paper-printer output; these remain unverified. No generated comp, concept seed or QUALITYBAR approval is claimed.
