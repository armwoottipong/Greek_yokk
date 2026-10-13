# POS — clean counter workspace

Mode: Operate. Primary target: src/views/PosView.vue. Related targets: src/components/pos; CustomOrderModal, PackageReviewModal, LowStockWarningModal, LotDepletionModal, ReceiptModal; shared dialog field styling.

User direction, 13 October 2026: redesign PC, iPad and mobile including popups. Clean design with fewer input borders, no input outlines or focus rings, recognizable branding and clear operation. Preserve price, stock, checkout and overlay behavior.

## Direction contract

User clarification: product drawers open from the bottom on PC, iPad and phone. The shared drawer is centered at 520px on PC/iPad and full-width on phone, with top corners and vertical enter/leave motion. The earlier side-drawer description below is superseded. Bottom coordinates equal viewport height at 1440×900, 820×1180 and 390×844 with no horizontal overflow; evidence is product-bottom-drawer-checks.json and product-bottom-drawer-{desktop,mobile}.jpg. Fifteen related tests, lint and build passed after this CSS refinement.

THESIS: A clear selling counter: choose a bowl, review one order, pay. Avoid equal emphasis on transaction totals and accounting details.

OWN-WORLD: Existing Greek Yogg cream and burgundy, Prompt Thai and tabular numeric prices. Rounded cream fields without resting outlines or input focus rings as requested. Mascot appears in the empty cart; actual menu emoji remain catalog content.

STORY: Channel sets the price context; menu cards expose price and customization. One shared cart keeps notes, packaging and payment through rotation. Warnings name the shortage and next action.

FIRST VIEWPORT: Catalog heading, channel and search above two or more menu columns; desktop order on the right with payment anchored below it. Compact screens expose a fixed cart total and a scrollable review sheet. Popups keep actions outside their scrolling body.

FORM: Code-led refinement of the specifically proposed and user-steered existing catalog/cart composition; no concept seed or generated comp. Selection checkmarks and clear action labels carry state without input rings.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance


## Implemented composition

Product drawer follow-up: every menu selection opens CustomOrderModal through the shared DialogFrame drawer presentation. Desktop/tablet (768px+) uses a 520px side drawer flush to the right; phone uses a full-width bottom drawer with at most viewport minus 12px height. Existing catalog emoji is the product visual, followed by title, description, base price, vertical optional toppings and a FormField note. Quantity, unit price and total add action stay fixed in the footer. Notes apply to all units in that cart line, survive deferred stock confirmation and are included in saved order items and receipts. Only equal menu/addons/trimmed-note lines merge. A 36px burgundy circle at each menu card's bottom-right sums all matching cart line quantities and disappears at zero; the card's accessible name includes the count. Existing whole-order note remains available. No new product imagery or claims were added.

The workspace splits at 696px of available width, with a 16px gap and a cart width of clamp(320px,30%,380px). Catalog and cart scroll independently; payment stays in the cart footer. Below this threshold, one fixed review bar exposes quantity and total and opens the shared cart sheet. The sheet keeps payment outside its scrolling body; changing presentation retains one cart.

Catalog heading, channel and search precede an auto-fill grid with a 200px minimum card width and 14px gaps. At catalog container widths <=440px, controls stack and cards stay in two minmax(0,1fr) columns with 10px gaps. Cards retain actual menu emoji, wrapped names, burgundy prices and named add/customization actions. Empty catalog distinguishes no search matches from no menus ready to sell. At the user's request, the empty order reuses public/brand/content-mascot.svg, the branding logo used by the content loading screen on a cream background, at 88×88px; no new shipping raster was introduced.

Cart rows expose bowl quantity, topping amounts, packaging and a named order note. Accounting detail stays in a disclosure. Payment uses the shared AppChoiceGroup cards variant with native exclusive radios in a named radiogroup; checkout has a 52px minimum height. Popup customization uses named selectable topping buttons and a separate quantity/total/action footer. The cart packaging heading is บรรจุภัณฑ์ with an item count and the existing review Button; package names remain in the popup. Packaging editor rows use FormField labels, AppSelect add/reason choices, an effective-quantity StatusBadge, recipe-source disclosure and save/reset Buttons below the fields, with spacing and separators; shortage and next-lot decisions use named semantic fills. Receipt names wrap inside a 440px dialog.

Payment cards use three equal minmax(0,1fr) columns with an 8px gap, 90px minimum height, 12px corners and 30px 10px 12px padding. Their 18px radio/checkmark sits at an absolute top/right offset of 10px, so check visibility does not alter card geometry. Each primary label has an optional secondary description. POS displays QR / PromptPay, เงินสด / Cash and Platform / Delivery while retaining stored values QR PromptPay, เงินสด and Platform Delivery. Existing AppChoiceGroup checkmark/switch variants are preserved.

## Field and type treatment

All DialogFrame native text/number fields, selects, textareas and AppSelect triggers use warm bg-soft fill and transparent borders with no outline or box-shadow, including focus and expanded states. Focus keeps the same fill. The cart order note follows the same borderless and ringless treatment. This is the user's explicit 13 October instruction, scoped to those fields; action buttons keep existing keyboard focus. Visible labels, hints, error relationships and keyboard selection semantics remain. Popup disabled fields use .55 opacity; aria-invalid fields use danger-soft fill and danger text.

POS channel/search, cart note and package fields use 12px corners. Channel/search and package inputs have 48px minimum height; other shared popup fields retain their component radius and at least 44px minimum height. Native controls below 1200px retain the existing 16px type rule. Prompt remains the Thai face and Plus Jakarta Sans remains the numeric face. Catalog/cart/dialog titles use 18px at weight 600, menu prices and review totals use 18px numeric type, customization bowl total uses 24px, and payment total uses 26px. These are scoped roles, without changing the app's global type ramp.

## Evidence and limits

Product drawer browser checks at 320, 390, 820 and 1440px verified scrolling note access, fixed add action, draft addition and badge aggregation. product-drawer-checks.json records no horizontal document overflow at 320/390/820px; note outline is none. Desktop/mobile screenshots are product-drawer-desktop.jpg, product-drawer-mobile-note.jpg and product-cart-badges-*.jpg. The full suite passed 73 files / 457 tests, lint and build; targeted follow-up verifies the deferred confirmation closes the drawer. Physical mobile keyboard and Safari/iPad are not covered by viewport emulation.

Packaging quantity follow-up: shared AppQuantityInput composes the existing IconButton with Lucide minus/plus and an editable numeric field. Buttons step by 1, clamp at 0, preserve fractional entries and only change the draft until the existing save action. The cream field stays borderless; each icon button is 44px. Quantity/reason fields stack below 520px to keep touch controls usable. Browser checks at 320, 390, 820 and 1440px confirmed the increment and zero-disabled state, with no document overflow at 320px. Evidence: package-stepper-mobile.jpg and package-stepper-desktop.jpg. Full suite: 451 tests in 72 files; lint and build exited 0.

Browser measurements reported no horizontal overflow at viewport widths 320, 390, 820 and 1180px; final screenshots are under .impeccable/review/*.jpg. The packaging/payment follow-up passed the full regression run of 72 files and 450 tests. After the final card-padding and cart-summary changes, six test files and 25 tests passed; ESLint and the Vite production build exited 0. Final payment-size-checks.json measurements at viewport widths 320, 390, 820, 1180 and 1440px showed identical card widths and heights before and after changing cash to QR selection, with 90px card height at every width and document width equal to viewport width. Final payment screenshots at all five sizes and package desktop/mobile v2 screenshots were opened and inspected. The shared add combobox had computed transparent borders, no outline and no box-shadow. An in-memory browser checkout after closing nested packaging review produced a receipt. Price, GP, cost, stock, checkout, persistence and sync semantics remain the constraint. Viewport emulation does not validate physical iPad/Safari, screen readers or paper-printer output; these remain unverified. No generated comp, concept seed or QUALITYBAR approval is claimed.
