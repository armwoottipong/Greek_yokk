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

Mascot burgundy identifies the primary action and active route; deeper burgundy supplies hover. The separately fixed mascot ground belongs to the sidebar header. Soft burgundy marks quiet-action hover and selected price context; its border tint supports selection. Strong burgundy marks keyboard focus; pale rings remain supplemental expanded-state feedback.

### Neutral

Cream background, near-white card, warm soft fill, dark warm text, muted text and a subtle divider form the working surface. The stronger control border distinguishes editable fields, select triggers and unchecked selections from quiet surface dividers. Tailwind's existing stone and brand ramps remain available; their exact source is `tailwind.config.js`.

### Semantic

Danger, success and warning each use a distinct text/fill pairing. Primary and danger buttons use light card text. Status badges use pale semantic fills with darker semantic text, rather than the filled-button treatment.

**The Named State Rule.** Status always carries text; color supports the label.

## Typography

Prompt carries Thai UI; Plus Jakarta Sans carries numeric data, with tabular numerals applied to price and table contexts. The full body fallback stack is Prompt, Plus Jakarta Sans, -apple-system, BlinkMacSystemFont, sans-serif.

### Hierarchy

- **Title:** shared page headings use the title token; settings and dashboard retain larger local headings.
- **Body:** dialog content uses the body token. Catalog names use the same size with a more open line height (1.6).
- **Label:** shared buttons use the label token; FormField labels share its size and weight.
- **Caption:** shared badges use the caption token. Form hints use its size with line height (1.6).

Names wrap or have a visible detail path. The build retains local 10–12px secondary metadata; that observed density is not a recommendation for new essential information.

## Layout

Desktop >=1200px: full sidebar, tables and contextual panels. Tablet 768–1199px: 72px navigation rail with full-name drawer. Phone <768px: transparent hamburger trigger and drawer.

POS splits catalog and cart only when its container supports 360px catalog + 320px cart + 16px gap. Otherwise show a cart review bar and adaptive sheet. A resize changes presentation, never business state.

Keep one page title, grouped controls and a main vertical scrolling region. Phone management uses concise lists/cards; deeper data remains available. A table may scroll inside a clearly bounded desktop container.

Desktop navigation occupies 256px; tablet rail occupies 72px. Compact drawers are bounded by min(300px,85vw). Catalog cards use two columns below the desktop threshold, then one below 640px. Settings and dashboard retain local layout breakpoints; the sidecar records these separately from the shell boundaries.

**The One Transaction Rule.** Presentation changes never duplicate checkout or commit a draft.

## Elevation & Depth

Resting catalog surfaces use a subtle border. Legacy editorial cards add a very faint shadow; settings cards explicitly remove it. Floating menus and dialogs use the shared popup shadow. Compact navigation drawers use a lateral shadow. The sidecar records their exact values.

Buttons and native fields use a burgundy focus outline; soft fields also use a burgundy focus ring. Expanded selects add a pale ring alongside their burgundy border, while keyboard focus retains a burgundy outline. Checkbox focus combines that outline with a supplemental pale ring. Focus treatment is functional. Reduced motion removes CSS transitions and animations; dialog entry otherwise uses a short fade and downward offset.

## Shapes

Shared buttons use the control radius, catalog cards the surface radius, desktop dialogs the dialog radius. Editorial/settings cards retain the card radius; dashboard panels use 18px. Select triggers use 9px, menus 11px, badges 8px. Active navigation has the asymmetric corner shape recorded in its component token. Phone dialogs use 20px; sheets retain rounded upper corners (24px).

The mascot's soft silhouette is a shell detail. Touch actions target at least 44px; calendar cells at 320px may use 40×44px with spacing to fit seven days. Desktop compact buttons may use 32px, returning to 44px below 1200px.

## Components

Use Button/IconButton for action hierarchy, FormField for real label/control association, DialogFrame with ModalShell for all protected overlays, AppSelect for typed choices, AppCheckbox for selections, and shared feedback semantics.

### Buttons

Primary is burgundy, secondary has a warm fill and subtle border, quiet is transparent, and danger is filled red. Hover uses deeper burgundy, divider fill, soft burgundy and deeper red respectively. Shared buttons have a minimum height (44px), label typography, an 8px icon gap and the frontmatter padding. Icon buttons are 44px square with 20px SVGs. Disabled/loading actions suppress clicks; loading carries aria-busy and a spinner.

### Inputs / Fields

Soft fields use warm fill, a one-pixel control border and a burgundy focus ring; dialogs raise their minimum height to 44px and desktop type to 14px. Below 1200px, native text/number inputs, textareas and selects in the app and dialogs use 16px type. This rule does not enlarge the button-based AppSelect typography. The named-field sample uses the 14px field radius; compact embedded fields also retain 8px corners. FormField associates its visible label, hint and error with the control. AppSelect supplies a near-white trigger with the control border and a burgundy keyboard-focus outline, keyboard selection, disabled options and a floating list that closes on route deactivation.

### Platform Price Fields

Menu and Add-on editors show the full platform name beside a named numeric price field. Their bordered warm-fill containers use a two-column grid with an 8px gap, becoming one column below 768px; labels stay in the available column rather than collapsing to two-character prefixes. Price input focus retains the burgundy outline even inside the filled group.

### Chips / Cards / Navigation

StatusBadge uses named semantic states. Catalog cards have a subtle border, 12px internal grid gap and wrapped names; their selected platform price becomes prominent on compact layouts. Missing price is explicitly labeled, while a real zero remains zero. Navigation preserves the mascot lockup, shows a rail on tablet and opens full names in a drawer.

### Dialogs / Contextual Detail

Dialogs have a bounded scrolling body and reachable header/footer. Desktop body padding is 24px and phone body padding 16px. Confirmation uses the same constrained frame at 440px width and starts focus on cancel. Nested overlays keep one focus/inert/scroll-lock stack; deactivation closes transient UI and releases its participation in that stack. Error messages name a recovery action. Loading reflects actual work. Toasts announce changes without stealing focus. Success and information messages use a dedicated polite announcer; errors use alerts and remain until dismissed. Other messages expire after five seconds, pausing while hovered or focused. Each toast has a named 44px dismiss action with an inherited-color focus outline. Toasts wrap within the viewport, sit above the safe-area bottom on desktop and move to the safe-area top below 768px.

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
