# Responsive mobile implementation plan

> Execute inline with superpowers:executing-plans; user approved the design.

**Goal:** Compact mobile/iPad controls and a separate narrow-screen POS cart page.
**Architecture:** Shared Vue components serve cloud/local. CSS adapts layout;
existing store commands remain the source of truth.
**Tech Stack:** Vue 3, Vitest, Vite, existing CSS tokens.
**Spec:** ../specs/2026-10-29-responsive-mobile-design.md

## Constraints and review focus

Keep Yoggie styling, stock workflows and authorization. Preserve long Thai names,
empty carts, pending checkout, focus after closing and cart contents on rotation.

## Tasks

- [x] Add interaction tests for catalog More commands and separate cart navigation.
  Run targeted Vitest tests and observe failures before implementation.
- [x] Adapt DialogFrame sheets; add compact catalog More; put stock commands and
  filters in responsive More. Keep desktop actions available.
- [x] Add CartPanel page presentation in PosView and cloud CoreWorkspace, preserve
  state and move focus between cart page and review bar; make channels one row.
- [x] Compact StockMaterialCard responsive grid and check all More controls.
- [x] Run full tests, lint, build and Impeccable detector. Inspect mobile/iPad/
  desktop together; fix findings and confirm once.
- Release after the verified commit: fetch/integrate safely, push and verify
  Actions, live version.json and entry asset. Record outcome in the chat.

## Verification record

- 189 Vitest files passed: 1,472 passed, 1 skipped.
- ESLint and Vite production build passed. Existing large-chunk warning remains.
- Inspected 390×844, 820×1180, 1180×820 and 1440×1000 with local demo data.
  No horizontal document overflow; action drawers meet the viewport bottom;
  cart note survives navigation/rotation; payment button fits the available main.
- Impeccable detector: advisory font-ramp sizes only, matching existing component
  conventions; no blocking findings. Independent review: no important bugs found.
- Added regression coverage for delayed focus while the previous overlay closes.
- Remote main matched local before release; no unrelated working changes present.
