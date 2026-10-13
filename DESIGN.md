---
name: Greek Yogg.
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

Desktop navigation occupies 256px; tablet rail occupies 72px. Compact drawers are bounded by min(300px,85vw). POS catalog cards use an auto-fill grid with a 200px minimum; at catalog container widths of 440px or less, keep two minmax(0,1fr) columns and stack channel/search controls. Management catalog cards retain two columns below the desktop threshold and one below 640px. Settings and dashboard retain local layout breakpoints; the sidecar records these separately from the shell boundaries.

**The One Transaction Rule.** Presentation changes never duplicate checkout or commit a draft.

## Elevation & Depth

Resting catalog, dashboard, inventory summary and editorial surfaces use cream fills and spacing without visible perimeter borders or editorial shadows. Decorative nesting should not repeat outlines; table separators and control boundaries remain functional. Floating menus and dialogs use the shared popup shadow. Compact navigation drawers use a lateral shadow. The sidecar records their exact values.

Buttons retain their burgundy keyboard-focus outline. Ordinary native fields outside DialogFrame retain the control border and burgundy focus treatment. All DialogFrame native text/number fields, selects, textareas and AppSelect triggers have transparent borders, warm soft fill, no outline and no box-shadow at rest, on focus and while expanded, following the explicit user request of 13 October 2026. The POS cart order note has the same borderless and ringless treatment. Filled popup fields keep the same fill on focus; an invalid field uses danger-soft fill and danger text. Expanded AppSelect triggers outside dialogs retain their existing pale ring and burgundy keyboard-focus outline. Checkbox focus combines that outline with a supplemental pale ring. Focus treatment is functional. Reduced motion removes CSS transitions and animations; dialog entry otherwise uses a short fade and downward offset.

## Shapes

Shared buttons use the control radius, catalog cards the surface radius, desktop dialogs the dialog radius. Editorial/settings cards retain the card radius; dashboard panels use 18px. Ordinary select triggers use 9px, menus 11px, badges 8px. POS channel/search, order note and package editor fields use the scoped pos-field radius; other popup fields retain their component radius. Active navigation has the asymmetric corner shape recorded in its component token. Phone dialogs use 20px; sheets retain rounded upper corners (24px).

The mascot's soft silhouette is a shell detail. Touch actions target at least 44px; calendar cells at 320px may use 40×44px with spacing to fit seven days. Desktop compact buttons may use 32px, returning to 44px below 1200px.

## Components

Use Button/IconButton for action hierarchy, FormField for real label/control association, DialogFrame with ModalShell for all protected overlays, AppSelect for typed choices, AppCheckbox for independent selections, AppChoiceGroup for exclusive choices, and shared feedback semantics.

### Buttons

Primary is burgundy, secondary has a warm fill without a visible perimeter border, quiet is transparent, and danger is filled red. Hover uses deeper burgundy, divider fill, soft burgundy and deeper red respectively. Shared buttons have a minimum height (44px), label typography, an 8px icon gap and the frontmatter padding. Icon buttons are 44px square with 20px SVGs. Disabled/loading actions suppress clicks; loading carries aria-busy and a spinner.

### Inputs / Fields

Ordinary soft fields outside dialogs use warm fill, a one-pixel control border and a burgundy focus ring. DialogFrame overrides native text/number/select/textarea and AppSelect triggers to warm soft fill with a transparent border and no outline or box-shadow, including focused and expanded states. Dialog fields retain a minimum height of 44px and desktop native type of 14px; package fields use 48px minimum height. Disabled popup fields use .55 opacity; aria-invalid fields use danger-soft fill and danger text while retaining their named error semantics. Below 1200px, native text/number inputs, textareas and selects in the app and dialogs use 16px type. This rule does not enlarge the button-based AppSelect typography. The named-field sample uses the 14px field radius; compact embedded fields also retain 8px corners. FormField associates its visible label, hint and error with the control. AppSelect supplies keyboard selection, disabled options and a floating list that closes on route deactivation. Its ordinary trigger is near-white with a control border and burgundy keyboard-focus outline; inside DialogFrame the filled-popup override applies. POS channel/search controls use a 48px minimum height and the scoped pos-field radius. Product item notes use warm fill with no border, outline or box-shadow.

### Exclusive Choice Cards

AppChoiceGroup preserves its checkmark and switch variants and adds the reusable cards variant. Cards use native radios with a shared group name inside a named radiogroup; selection is exclusive. Optional option.description appears below the primary label. The cards grid has three equal minmax(0,1fr) columns with an 8px gap. Each card has a 90px minimum height, 12px corners and 30px 10px 12px padding. An 18px radio/checkmark occupies a reserved absolute position 10px from the top and right; its checked state changes fill and check visibility without moving the label or expanding the card. Selection uses soft burgundy fill and burgundy text; keyboard focus remains on the radio. Disabled choices retain shared disabled behavior.

POS payment uses this variant with QR / PromptPay, เงินสด / Cash and Platform / Delivery labels. Stored payment values remain QR PromptPay, เงินสด and Platform Delivery. Checkout retains its 52px minimum height.

### POS Product Drawer

Every menu opens the shared DialogFrame drawer from the bottom at every viewport width, per the user's clarification. It is centered at 520px on desktop/tablet and full-width on phones, flush with the viewport bottom and rounded at the top. Enter/leave motion uses vertical translation at every width. Header stays named, the body scrolls through the existing product emoji/name/description, price, optional topping rows and item note, while quantity and add action stay in the footer. Item notes use the popup fill without borders or outlines. Notes are trimmed, merge only with matching menu/addons/notes, and survive stock-warning confirmation, order saving and receipt printing. The cart has no whole-order note field; notes are attached to individual menu items. Each menu card shows its total cart quantity in a 36px burgundy circle at bottom-right, including the count in its accessible name; zero quantities hide the circle.

### Search Fields

All search fields use native type="search" and one shared rule in main.css: no outline or box-shadow at rest, focus or focus-visible. Soft search fields keep their resting fill when focused. Stocktake search wrappers also keep their resting border without a focus-within ring. This follows the user's explicit search styling preference and preserves text entry and filtering. Browser evidence in search-no-focus-checks.json covers POS, menus, Add-on, stock, stocktake and activity history with focus=true and outline/box-shadow=none; the emoji search uses the same rule. Sixteen related tests, lint and build passed.

### Packaging Review

The cart shows the heading บรรจุภัณฑ์, a packaging-item count and its shared review Button; individual package names and quantities remain in the popup. PackageReviewModal uses AppSelect for adding packaging and choosing adjustment reasons, FormField for every field, StatusBadge for the effective quantity and Button for actions. Recipe sources sit in a disclosure alongside save/reset actions in one row below the fields; numeric quantity and conditional note inputs keep the shared filled popup treatment. Shared AppQuantityInput uses existing 44px IconButtons to step by 1, clamps at zero and allows direct fractional entry; edits remain drafts until saved. Rows use 10px internal gaps and 14px separation/padding; quantity/reason fields stay side by side from 360px and stack below that width. Inputs retain 48px height and stepper buttons retain 44px touch targets.

### Platform Price Fields

Menu and Add-on editors show the full platform name beside a named numeric price field. Their warm-fill containers use a two-column grid with an 8px gap, becoming one column below 768px; labels stay in the available column rather than collapsing to two-character prefixes. Inside DialogFrame both the price group boundary and input outline/ring are removed by the shared popup treatment; outside dialogs the ordinary focus treatment remains.

### Chips / Cards / Navigation

StatusBadge uses named semantic states. Catalog cards have a cream fill without a visible perimeter border, 12px internal grid gap and wrapped names; their selected platform price becomes prominent on compact layouts. Missing price is explicitly labeled, while a real zero remains zero. Navigation preserves the mascot lockup, shows a rail on tablet and opens full names in a drawer.

### Dialogs / Contextual Detail

Dialogs have a bounded scrolling body and reachable header/footer. Their headings use the section-title token, with 13px descriptions and line height 1.7. Desktop header padding is 24px 24px 12px; phone header padding is 16px. Their headers use spacing rather than a divider; the soft-fill footer separates actions without a border. Filters likewise avoid outer/header/footer outlines and a nested calendar frame. Desktop body padding is 24px and phone body padding 16px. Confirmation uses the same constrained frame at 440px width and starts focus on cancel. Nested overlays keep one focus/inert/scroll-lock stack; deactivation closes transient UI and releases its participation in that stack. Error messages name a recovery action. Loading reflects actual work. Toasts announce changes without stealing focus. Success and information messages use a dedicated polite announcer; errors use alerts and remain until dismissed. Other messages expire after five seconds, pausing while hovered or focused. Each toast has a named 44px dismiss action with an inherited-color focus outline. Toasts wrap within the viewport, sit above the safe-area bottom on desktop and move to the safe-area top below 768px.

Archived materials retain contextual edit and permanent-delete routes without requiring restoration. Stock drafts, recipe details and cart review open in contextual panels/sheets; closing their presentation is not a commit.

Automated source/regression evidence covers constrained confirmation, overlay deactivation, archived edit/delete and explicit missing prices. Physical iPad, Safari, physical keyboard, VoiceOver, NVDA, 200% zoom and paper receipt output remain unverified; viewport emulation does not establish those results.

## Do's and Don'ts

- Do preserve price, GP, COGS, stock allocation and checkout semantics.
- Do provide keyboard and touch access without requiring hover.
- Do keep draft values when hiding sections, closing review panels or rotating the device.
- Do honor reduced motion in CSS and canvas; celebration is optional sale-success feedback.
- Don't expose global reset commands as equal peers of everyday selling actions.
- Don't change fonts or mascot colors merely to clear detector heuristics.
- Don't certify physical Safari, keyboard, zoom or screen-reader behavior from desktop viewport emulation alone.
