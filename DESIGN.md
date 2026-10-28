---
name: Yoggie
description: Calm, precise shop operations in the mascot's cream and burgundy identity.
colors:
  brand: "#780608"
  brand-deep: "#580406"
  mascot-ground: "#5E0205"
  background: "#FBF5EA"
  surface: "#FFFCF6"
  soft: "#F4EBDD"
  text: "#352522"
  muted: "#7D675B"
  divider: "#E8DCCB"
  control-border: "#9A8374"
  accent-soft: "#FBF0E9"
  accent-border: "#E8BEB0"
  danger: "#B91C1C"
  danger-deep: "#991B1B"
  danger-soft: "#FEF2F2"
  success: "#15803D"
  success-text: "#166534"
  success-soft: "#ECFDF5"
  warning: "#92400E"
  warning-soft: "#FFFBEB"
typography:
  title:
    fontFamily: "Prompt, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.5
  section-title:
    fontFamily: "Prompt, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.5
  pos-payment-total:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "1.625rem"
  pos-bowl-total:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "1.5rem"
  body:
    fontFamily: "Prompt, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  caption:
    fontFamily: "Prompt, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "Prompt, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  control: "10px"
  surface: "16px"
  dialog: "24px"
  card: "20px"
  badge: "8px"
  select: "9px"
  field: "14px"
  pos-field: "12px"
spacing:
  tight: "4px"
  related: "8px"
  control: "12px"
  group: "16px"
  section: "24px"
  generous: "32px"
components:
  button-primary:
    typography: "{typography.label}"
    backgroundColor: "{colors.brand}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  button-secondary:
    typography: "{typography.label}"
    backgroundColor: "{colors.soft}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  button-quiet:
    typography: "{typography.label}"
    backgroundColor: "transparent"
    textColor: "{colors.brand}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  button-danger:
    typography: "{typography.label}"
    backgroundColor: "{colors.danger}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  input-soft:
    backgroundColor: "{colors.soft}"
    textColor: "{colors.text}"
    rounded: "{rounded.field}"
    padding: "8px 12px"
  input-popup-filled:
    backgroundColor: "{colors.soft}"
    textColor: "{colors.text}"
  input-affixed:
    typography: "{typography.body}"
    backgroundColor: "{colors.soft}"
    textColor: "{colors.text}"
    rounded: "{rounded.pos-field}"
    padding: "0 12px"
    height: "48px"
  input-pos-note:
    backgroundColor: "{colors.soft}"
    textColor: "{colors.text}"
    rounded: "{rounded.pos-field}"
    padding: "12px 14px"
  navigation-active:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.surface}"
    rounded: "12px 20px 20px 12px"
    padding: "12px 14px"
  status-warning:
    backgroundColor: "{colors.warning-soft}"
    textColor: "{colors.warning}"
    rounded: "{rounded.badge}"
    padding: "4px 8px"
  choice-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.pos-field}"
    padding: "30px 10px 12px"
  choice-card-selected:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.brand}"
  catalog-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.surface}"
    padding: "16px"
---

## Overview

**Creative North Star: "Calm shop workspace"**

Confirmed direction A: workspace with contextual details. Desktop and iPad are the main shop tools; phones prioritize quick management with full details on request. Keep the smiling cream mascot and burgundy identity. User approved this direction on 11 October 2026.

This is an Operate interface. Familiar controls, readable quantities and dependable feedback carry the work. Brand belongs in the shell and deliberate accents, not in extra decoration on every data row.

**Key Characteristics:**

- Cream and mascot burgundy
- Named controls
- Contextual detail
- One business state across devices

## Colors

Use cream surfaces with dark warm text. Burgundy identifies primary actions and current selection. Danger actions use a distinct treatment, label and confirmation. Green/amber/red states always include a word or icon. Preserve chart-series colors when they distinguish real data.

### Primary

Mascot burgundy identifies the primary action and active route; deeper burgundy supplies hover. The separately fixed mascot ground belongs to the sidebar header. Soft burgundy marks quiet-action hover and selected price context; its border tint supports selection. Strong burgundy marks button keyboard focus and field focus outside the scoped filled-field treatment; pale rings remain supplemental expanded-state feedback for selects outside dialogs.

### Neutral

Cream background, near-white card, warm soft fill, dark warm text, muted text and a subtle divider form the working surface. The stronger control border distinguishes ordinary editable fields, select triggers and unchecked selections from quiet surface dividers. Dialog fields and the POS order note instead use fill without a visible field boundary. Tailwind's existing stone and brand ramps remain available; their exact source is `tailwind.config.js`.

### Semantic

Danger, success and warning each use a distinct text/fill pairing. Primary and danger buttons use light card text. Status badges use pale semantic fills with darker semantic text, rather than the filled-button treatment.

**The Named State Rule.** Status always carries text; color supports the label.

## Typography

Prompt carries Thai UI; Plus Jakarta Sans carries numeric data, with tabular numerals applied to price and table contexts. The full body fallback stack is Prompt, Plus Jakarta Sans, -apple-system, BlinkMacSystemFont, sans-serif.

### Hierarchy

- **Title:** shared page headings use the title token; settings and dashboard retain larger local headings.
- **Section title:** POS catalog/cart and shared dialog headings use the section-title token.
- **POS totals:** payment total and custom bowl total use their scoped numeric tokens; menu prices and the compact cart total use 1.125rem numeric type.
- **Body:** dialog content uses the body token. Catalog names use the same size with a more open line height (1.6).
- **Label:** shared buttons use the label token; FormField labels share its size and weight.
- **Caption:** shared badges use the caption token. Form hints use its size with line height (1.6).

Names wrap or have a visible detail path. The build retains local 10–12px secondary metadata; that observed density is not a recommendation for new essential information.

## Layout

Desktop >=1200px: full sidebar, tables and contextual panels. Tablet 768–1199px: 72px navigation rail with full-name drawer. Phone <768px: transparent hamburger trigger and drawer.

POS splits catalog and cart at a workspace width of 696px, retaining 360px catalog + 320px cart + 16px gap at the threshold. The cart grows within clamp(320px,30%,380px). Otherwise show a fixed cart review bar and adaptive sheet; payment remains outside the scrolling order body. A resize changes presentation, never business state.

Keep one page title, grouped controls and a main vertical scrolling region. Phone management uses concise lists/cards; deeper data remains available. A table may scroll inside a clearly bounded desktop container.

Desktop navigation occupies 256px; tablet rail occupies 72px. Compact drawers are bounded by min(300px,85vw). POS catalog cards use an auto-fill grid with a 200px minimum; at catalog container widths of 440px or less, keep two minmax(0,1fr) columns and stack channel/search controls. Menu and Add-on management share one responsive row list: four columns on wide screens, reflowed recipe content at 1100px and below, and identity/recipe above price/actions at 639px and below. Settings and dashboard retain local layout breakpoints; the sidecar records these separately from the shell boundaries.

**The One Transaction Rule.** Presentation changes never duplicate checkout or commit a draft.

Stock management keeps its inventory table at viewport widths of 1200px and above, adding a date column between material/product and type per the user clarification. Eight column proportions are material/product 23%, dates 13%, type 10%, quantity 15%, unit cost 11%, value 12%, status 8% and management 8%. Receive and expiry dates occupy at most two compact lines; dates no longer add height below the material name. Expandable lot rows use the same column alignment. The table has a minimum width of 1280px; horizontal scrolling belongs to its bounded wrapper. Below 1200px the renovated responsive inventory list remains: identity spans the row, and at 639px and below metrics/actions reflow into two columns. The toolbar search/filter group takes a full row below 768px, followed by receive/count actions. These are Stock surface arrangements, not replacements for other tables or catalog layouts.

## Elevation & Depth

Resting catalog, dashboard, inventory summary and editorial surfaces use cream fills and spacing without visible perimeter borders or editorial shadows. Decorative nesting should not repeat outlines; table separators and control boundaries remain functional. Floating menus and dialogs use the shared popup shadow. Compact navigation drawers use a lateral shadow. The sidecar records their exact values.

Buttons retain their burgundy keyboard-focus outline. Ordinary native fields outside DialogFrame retain the control border and burgundy focus treatment. All DialogFrame native text/number fields, selects, textareas and AppSelect triggers have transparent borders, warm soft fill, no outline and no box-shadow at rest, on focus and while expanded, following the explicit user request of 13 October 2026. The POS cart order note has the same borderless and ringless treatment. Filled popup fields keep the same fill on focus; an invalid field uses danger-soft fill and danger text. Expanded AppSelect triggers outside dialogs retain their existing pale ring and burgundy keyboard-focus outline. Checkbox focus combines that outline with a supplemental pale ring. Focus treatment is functional. Reduced motion removes CSS transitions and animations; dialog entry otherwise uses a short fade and downward offset.

## Shapes

Shared buttons use the control radius, catalog cards the surface radius, desktop dialogs the dialog radius. Editorial/settings cards retain the card radius; dashboard panels use 18px. Ordinary select triggers use 9px, menus 11px, badges 8px. POS channel/search, order note and package editor fields use the scoped pos-field radius; other popup fields retain their component radius. Active navigation has the asymmetric corner shape recorded in its component token. Phone dialogs use 20px; sheets retain rounded upper corners (24px).

The mascot's soft silhouette is a shell detail. Touch actions target at least 44px; calendar cells at 320px may use 40×44px with spacing to fit seven days. Desktop compact buttons may use 32px, returning to 44px below 1200px.

## Components

Use Button/IconButton for action hierarchy, FormField for real label/control association, AppInput for shared text/number fields with optional affixes, AppSearch for named search and clear actions, RecipeEditorRow for material/quantity editing, DialogFrame with ModalShell for all protected overlays, AppSelect for typed choices, AppCheckbox for independent selections, AppChoiceGroup for exclusive choices, and shared feedback semantics.

### Buttons

Primary is burgundy, secondary has a warm fill without a visible perimeter border, quiet is transparent, and danger is filled red. Hover uses deeper burgundy, divider fill, soft burgundy and deeper red respectively. Shared buttons have a minimum height (44px), label typography, an 8px icon gap and the frontmatter padding. Icon buttons are 44px square with 20px SVGs. Disabled/loading actions suppress clicks; loading carries aria-busy and a spinner.

### Inputs / Fields

Ordinary soft fields outside dialogs use warm fill, a one-pixel control border and a burgundy focus ring. DialogFrame overrides native text/number/select/textarea and AppSelect triggers to warm soft fill with a transparent border and no outline or box-shadow, including focused and expanded states. Dialog fields retain a minimum height of 44px and desktop native type of 14px; package fields use 48px minimum height. Disabled popup fields use .55 opacity; aria-invalid fields use danger-soft fill and danger text while retaining their named error semantics. Below 1200px, native text/number inputs, textareas and selects in the app and dialogs use 16px type. This rule does not enlarge the button-based AppSelect typography. The named-field sample uses the 14px field radius; compact embedded fields also retain 8px corners. FormField associates its visible label, hint and error with the control. AppSelect supplies keyboard selection, disabled options and a floating list that closes on route deactivation. Its ordinary trigger is near-white with a control border and burgundy keyboard-focus outline; inside DialogFrame the filled-popup override applies. POS channel/search controls use a 48px minimum height and the scoped pos-field radius. Product item notes use warm fill with no border, outline or box-shadow.

### Shared Affixed Fields and Recipe Rows

AppInput composes a full-width warm-fill field with prefix/suffix slots, a 48px minimum height, the existing pos-field radius and 12px horizontal padding. The native input retains its id, label/error attributes and keyboard behavior; number inputs use tabular numerals. FormField supplies the visible label. Its inner input is transparent, with body typography on desktop and the existing 16px native-field override below 1200px. DialogFrame supplies the established filled-popup treatment; this component does not replace the ordinary-field focus rule outside dialogs.

RecipeEditorRow composes FormField, AppSelect, AppInput and a named remove IconButton. Material, quantity with unit suffix and remove action share an 8px gap; quantity occupies 136px and remove occupies 44px. At 480px and below the material selector takes a full row, with quantity and remove beneath it. Ingredient and packaging rows use the same controls while their callers supply the appropriate minimum and step. Callers can pass an invalid state and error id to associate both controls with the row's visible error; validation and recovery remain with the editor.

### Shared Management Rows

CatalogManagementRow gives Menu and Add-on the same name/emoji, recipe summary, selected-channel price and named edit/delete composition. Name and recipe actions open contextual details with all channel prices and separate ingredient/packaging groups. Rows wrap long names and retain explicit missing-price text; a real zero remains zero. The shared catalog management, recipe detail and editor styles keep both surfaces aligned without changing POS catalog cards.

### Stock Management Rows and Forms

The desktop Stock table retains its original column composition and inline lot disclosures with the renovated cream/burgundy treatment: near-white surface, warm header and lot fill, functional row separators, readable header labels and soft compact action buttons. Its enclosing surface uses 16px corners; an expanded lot button uses warm fill and burgundy text. Usage labels sit in a separate wrapping metadata line below the full-width name, using compact unfilled muted text. Lot controls use the same quiet treatment. The shared MaterialUsage compact variant applies only to stock rows; detailed forms retain their existing badges. Lot disclosure motion honors reduced motion, and table buttons retain burgundy keyboard-focus outlines.

Below 1200px, StockMaterialCard composes one inventory row with a named identity/detail button, type and usage metadata, current quantity and pending draft delta, purchase-unit cost, remaining value, lot access and receive/produce actions. Text names every stock state; quantity is prominent burgundy, while pending changes use warning text. Names and numeric values wrap. The row has a functional bottom separator rather than a repeated enclosing card; its responsive gap is 16px below 1200px and 12px below 640px, with 20px padding on tablet and 16px on phone. Contextual action sheets retain edit/history/waste/archive and archived restore/permanent-delete routes.

StockToolbar uses AppSearch, shared Button filters and named IconButton actions. Receive and count remain directly available; adjustment, creation and history sit in its contextual action sheet. MaterialEdit, StockAdjust and Waste use the shared DialogFrame header at a bounded desktop width of 720px, AppInput/AppSelect fields and shared Button variants. Their common stock form composition uses warm filled 48px controls with 12px corners, separated sections without nested perimeter frames, a 24px group gap (20px at 480px and below), and reachable footer actions. The shared filled-popup treatment remains authoritative. Narrow form grids stack at 480px; the material unit choices keep three columns and recipe selectors can span their own row.

StockIn receipt/production uses a bounded 680px DialogFrame with its optional compact density and 16px gaps between form groups. The full-width material selector has a contextual history action. Purchases pair quantity and purchase cost in two columns above a shared total row. At 600px and above, production quantity sits beside one ingredient ledger that reports consumption, stock sufficiency, total cost and unit cost; below 600px it follows quantity. Quantity fields carry their unit suffix and retain shared 44px stepper actions. Equal date columns use a 12px gap, with expiry clear inside the input suffix and a quiet automatic-date action below it; lot consequences and the optional note follow. At 480px and below, purchase quantity/cost and dates stack, and ingredient names precede their amounts/status. Coarse pointers raise unit choices, expiry actions and history to 44px targets. Shared AppInput, AppSelect, Button, IconButton and StatusBadge remain authoritative; draft staging, conversions, ingredient depletion, date validation and discard protection retain their existing semantics.

Stocktake uses the same DialogFrame at a bounded desktop width of 980px, AppSearch and AppInput, with a dedicated count table that reflows to labeled rows below 640px. Expected quantity, named actual-count fields, unit choice and variance remain adjacent; Enter advances to the next visible count field. Unit toggles retain 44px minimum width and height; at 640–1199px they sit below the full-width count field so the larger targets do not squeeze entry. The footer groups the variance label, changed-item count and cost impact in a wrapping baseline-aligned line with an 8px row gap and 12px column gap; the burgundy count is distinct from the signed currency value. The staging helper remains on a second line. Its action stages changes into the separate draft review. Search, filters and presentation changes do not confirm inventory changes; this control renovation preserves the existing count and draft behavior.

StockDraftReview uses a separate centered 720px compact DialogFrame at every viewport width. Its heading and footer remain outside the scrolling changed-item list. Desktop rows put material identity, action title and description on the left, with the old-to-new quantity and named increase/decrease on the right; below 560px these stack, with the quantity aligned under the identity text. Quantities use burgundy tabular numerals, while signed changes use semantic success/error colors. Names and values wrap. The footer separates the danger discard action from return-to-edit and primary commit actions; on phones return/commit share a row and discard spans the next row. Closing or returning preserves drafts. Discard retains the existing confirmation and undo boundary; cancelling it keeps the review open. A successful commit closes the review; a failed commit retains it and its drafts.

### Exclusive Choice Cards

AppChoiceGroup preserves its checkmark and switch variants and adds the reusable cards variant. Cards use native radios with a shared group name inside a named radiogroup; selection is exclusive. Optional option.description appears below the primary label. The cards grid has three equal minmax(0,1fr) columns with an 8px gap. Each card has a 90px minimum height, 12px corners and 30px 10px 12px padding. An 18px radio/checkmark occupies a reserved absolute position 10px from the top and right; its checked state changes fill and check visibility without moving the label or expanding the card. Selection uses soft burgundy fill and burgundy text; keyboard focus remains on the radio. Disabled choices retain shared disabled behavior.

POS payment uses this variant with QR / PromptPay, เงินสด / Cash and Platform / Delivery labels. Stored payment values remain QR PromptPay, เงินสด and Platform Delivery. Checkout retains its 52px minimum height.

### POS Product Drawer

Every menu opens the shared DialogFrame drawer from the bottom at every viewport width, per the user's clarification. It is centered at 520px on desktop/tablet and full-width on phones, flush with the viewport bottom and rounded at the top. Enter/leave motion uses vertical translation at every width. Header stays named, the body scrolls through the existing product emoji/name/description, price, optional topping rows and item note, while quantity and add action stay in the footer. Item notes use the popup fill without borders or outlines. Notes are trimmed, merge only with matching menu/addons/notes, and survive stock-warning confirmation, order saving and receipt printing. The cart has no whole-order note field; notes are attached to individual menu items. Each menu card shows its total cart quantity in a 36px burgundy circle at bottom-right, including the count in its accessible name; zero quantities hide the circle.

### Search Fields

AppSearch reuses AppInput with an 18px SVG search prefix and a named 44px clear IconButton when text is present. Clearing restores focus to the native search field. CatalogToolbar and the icon picker share this component; toolbar context may use the near-white surface fill.

All search fields use native type="search" and one shared rule in main.css: no outline or box-shadow at rest, focus or focus-visible. Soft search fields keep their resting fill when focused. Stocktake search wrappers also keep their resting border without a focus-within ring. This follows the user's explicit search styling preference and preserves text entry and filtering. Browser evidence in search-no-focus-checks.json covers POS, menus, Add-on, stock, stocktake and activity history with focus=true and outline/box-shadow=none; the emoji search uses the same rule. Sixteen related tests, lint and build passed.

### Packaging Review

The cart shows the heading บรรจุภัณฑ์, a packaging-item count and its shared review Button; individual package names and quantities remain in the popup. PackageReviewModal uses AppSelect for adding packaging and choosing adjustment reasons, FormField for every field, StatusBadge for the effective quantity and Button for actions. Recipe sources sit in a disclosure alongside save/reset actions in one row below the fields; numeric quantity and conditional note inputs keep the shared filled popup treatment. Shared AppQuantityInput uses existing 44px IconButtons to step by 1, clamps at zero and allows direct fractional entry; edits remain drafts until saved. Rows use 10px internal gaps and 14px separation/padding; quantity/reason fields stay side by side from 360px and stack below that width. Inputs retain 48px height and stepper buttons retain 44px touch targets.

### Platform Price Fields

Menu and Add-on editors show the full platform name above a named numeric price field. Both compose FormField and affixed AppInput in the shared two-column grid with a 16px gap (14px at 480px and below), becoming one column below 360px. Labels wrap in the available column rather than collapsing to two-character prefixes. Inside DialogFrame both the price group boundary and input outline/ring are removed by the shared popup treatment; outside dialogs the ordinary focus treatment remains.

### Chips / Cards / Navigation

StatusBadge uses named semantic states. Catalog cards have a cream fill without a visible perimeter border, 12px internal grid gap and wrapped names; their selected platform price becomes prominent on compact layouts. Missing price is explicitly labeled, while a real zero remains zero. Navigation preserves the mascot lockup, shows a rail on tablet and opens full names in a drawer.

### Dialogs / Contextual Detail

Dialogs have a bounded scrolling body and reachable header/footer. Their headings use the section-title token, with 13px descriptions and line height 1.7. Desktop header padding is 24px 24px 12px; phone header padding is 16px. Their headers use spacing rather than a divider; the soft-fill footer separates actions without a border. Filters likewise avoid outer/header/footer outlines and a nested calendar frame. Desktop body padding is 24px and phone body padding 16px. Confirmation uses the same constrained frame at 440px width and starts focus on cancel. Nested overlays keep one focus/inert/scroll-lock stack; deactivation closes transient UI and releases its participation in that stack. Error messages name a recovery action. Loading reflects actual work. Toasts announce changes without stealing focus. Success and information messages use a dedicated polite announcer; errors use alerts and remain until dismissed. Other messages expire after five seconds, pausing while hovered or focused. Each toast has a named 44px dismiss action with an inherited-color focus outline. Toasts wrap within the viewport, sit above the safe-area bottom on desktop and move to the safe-area top below 768px.

DialogFrame also exposes an opt-in compact density for working forms. It uses 16px header/body/footer padding, a 12px header bottom and an 8px body top; footer bottom remains the greater of 16px and the safe-area inset. StockIn opts into this density. Frames that omit it retain the default desktop/phone padding above.

Archived materials retain contextual edit and permanent-delete routes without requiring restoration. Stock drafts open in a separate centered dialog; recipe details and cart review retain their contextual panels/sheets. Closing their presentation is not a commit.

Menu and Add-on editor disclosures preserve mounted drafts while measured-height motion opens and closes their native details elements. Closing bodies become inert; reduced motion changes native state immediately. The revealDisclosure helper cancels an active animation, clears its temporary height/overflow and inert state, and synchronizes the open/expanded state before Add-on validation focuses an invalid recipe control. Save/cancel remain in the shared dialog footer.

Automated source/regression evidence covers constrained confirmation, overlay deactivation, archived edit/delete and explicit missing prices. Physical iPad, Safari, physical keyboard, VoiceOver, NVDA, 200% zoom and paper receipt output remain unverified; viewport emulation does not establish those results.

## Do's and Don'ts

- Do preserve price, GP, COGS, stock allocation and checkout semantics.
- Do provide keyboard and touch access without requiring hover.
- Do keep draft values when hiding sections, closing review panels or rotating the device.
- Do honor reduced motion in CSS and canvas; celebration is optional sale-success feedback.
- Don't expose global reset commands as equal peers of everyday selling actions.
- Don't change fonts or mascot colors merely to clear detector heuristics.
- Don't certify physical Safari, keyboard, zoom or screen-reader behavior from desktop viewport emulation alone.

Stock table sorting uses shared TableSortButton controls with neutral up/down indicators and a burgundy active direction. Name/type sort with Thai numeric-aware collation; receipt and expiry date ordering is selected through one compact AppSelect control labeled วันที่, with missing or untracked dates last in either direction. Its menu names the date field and direction; its header tooltip and aria-description report the active criterion. AppSelect supports an optional displayLabel for compact triggers without changing option labels. Quantity, displayed purchase-unit cost and remaining value use numeric values. Status ascending prioritizes expired, empty, low, normal and archived items. Each header cycles ascending, descending and original order; sorting applies after filters/search, updates reactively and never mutates store order or inventory. Expanded lots remain attached to their material row. Header cells expose aria-sort and controls support keyboard activation.

The date-sort AppSelect opts into fitContent: its menu takes natural content height within the larger available side of the viewport, without the default 300px cap. It opens above when needed and retains bounded scrolling only if the viewport cannot fit all options. Other selectors retain their existing cap.

Stocktake opts into DialogFrame containedBody mode: the frame body is a flex column with overflow hidden, the toolbar does not shrink, and only stocktake-body scrolls. Desktop/tablet table headings remain sticky inside that region, with footer outside it. Compact mobile keeps the labeled-row presentation and fixed search/footer. The named scroll region supports keyboard paging. Receipt/production steppers use warm filled 44px icon targets with burgundy marks, hover fill and muted disabled state.

Receipt amount/cost and desktop production quantity/recipe columns share a 50/50 split and 12px column gap with the date grid. Their left edges and widths align exactly with receipt/production and expiry fields; compact stacking breakpoints remain unchanged.

The stock draft bar uses a near-white raised surface with a warm clipboard mark and burgundy review action. It shows pending-item count, a reminder that saving requires review, and material names with baseline → current quantities. Desktop/tablet preview two items; below560px only the first item is previewed with an accurate remaining count. The full centered dialog remains the review destination. The count heading retains polite status announcements. Entry/exit slides16px with opacity and honors reduced motion.


### Menu option groups

Add-on management includes reusable groups above the existing catalog. A shared DialogFrame editor sets name, minimum/maximum, repeated portions, included/extra pricing and catalog options; extra choices can override channel prices. The editor teleports outside the inert application shell and uses shared filled controls with a fixed save/cancel footer. Menu editing has a group assignment disclosure and an explicit legacy/group mode. New menus use group mode; old menus retain the global picker until changed. POS shows separately named groups, selection counters and included/extra prices; it caps selection and disables add until required choices are complete. Repeated portions use named 44px quantity controls. Cart and receipts show group identity and portions.

Actual local demo create/assign/sell flow verified at 390px; directory captures at 820/1280px have no measured document overflow. Final automated evidence: 549 tests across 89 files, lint/build and diff check pass. Independent code review finding about stale group choices after returning to legacy mode was fixed and regression tested. Captures and measurements are in .impeccable/review/option-groups; full evidence is docs/superpowers/verification/2026-10-19-option-groups.md. Existing cream/burgundy, type and shared controls retained. Physical device/screen-reader/print testing is not claimed.
