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
  danger: "#B91C1C"
  success: "#15803D"
  warning: "#92400E"
typography:
  title:
    fontFamily: "Prompt, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Prompt, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
  caption:
    fontFamily: "Prompt, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.5
  number:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.5
rounded:
  control: "10px"
  surface: "16px"
  dialog: "24px"
spacing:
  tight: "4px"
  related: "8px"
  control: "12px"
  group: "16px"
  section: "24px"
  generous: "32px"
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.soft}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
    height: "44px"
---

## Overview

Confirmed direction A: workspace with contextual details. Desktop and iPad are the main shop tools; phones prioritize quick management with full details on request. Keep the smiling cream mascot and burgundy identity. User approved this direction on 11 October 2026.

This is an Operate interface. Familiar controls, readable quantities and dependable feedback carry the work. Brand belongs in the shell and deliberate accents, not in extra decoration on every data row.

## Colors

Use cream surfaces with dark warm text. Burgundy identifies primary actions and current selection. Danger actions use a distinct treatment, label and confirmation. Green/amber/red states always include a word or icon. Preserve chart-series colors when they distinguish real data.

Muted #7D675B passes 4.5:1 on #FFFCF6. Ordinary text and controls require 4.5:1; meaningful non-text marks require 3:1. Disabled controls are treated separately.

## Typography

Prompt carries Thai UI; Plus Jakarta Sans carries numeric data with tabular numerals. Touch body content uses 14px; concise labels/data can use 12–14px. Necessary information must not depend on 9px captions. Names wrap or have a visible detail path, never an inaccessible truncation.

## Layout

Desktop >=1200px: full sidebar, tables and contextual panels. Tablet 768–1199px: 72px navigation rail with full-name drawer. Phone <768px: transparent hamburger trigger and drawer.

POS splits catalog and cart only when its container supports 360px catalog + 320px cart + 16px gap. Otherwise show a cart review bar and adaptive sheet. A resize changes presentation, never business state.

Keep one page title, grouped controls and a main vertical scrolling region. Phone management uses concise lists/cards; deeper data remains available. A table may scroll inside a clearly bounded desktop container.

## Elevation & Depth

Resting surfaces use a subtle border. Floating menus and dialogs use a soft offset shadow. Avoid border plus heavy shadow on every card. Focus uses a clear outline, not a decorative glow.

## Shapes

Controls use 10px radii, data surfaces 16px, dialogs 24px. The mascot's soft silhouette is a shell detail. Touch actions target at least 44px; calendar cells at 320px may use 40×44px with spacing to fit seven days.

## Components

Use Button/IconButton for action hierarchy, FormField for real label/control association, DialogFrame with ModalShell for all protected overlays, AppSelect for typed choices, AppCheckbox for selections, and shared feedback semantics.

Dialogs have a bounded scrolling body and reachable header/footer. Nested overlays keep one focus/inert/scroll-lock stack. Error messages name a recovery action. Loading reflects actual work. Toasts announce changes without stealing focus.

## Do's and Don'ts

- Do preserve price, GP, COGS, stock allocation and checkout semantics.
- Do provide keyboard and touch access without requiring hover.
- Do keep draft values when hiding sections, closing review panels or rotating the device.
- Do honor reduced motion in CSS and canvas; celebration is optional sale-success feedback.
- Don't expose global reset commands as equal peers of everyday selling actions.
- Don't change fonts or mascot colors merely to clear detector heuristics.
- Don't certify physical Safari, keyboard, zoom or screen-reader behavior from desktop viewport emulation alone.
