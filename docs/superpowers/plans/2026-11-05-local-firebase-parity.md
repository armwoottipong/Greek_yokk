# Local and Firebase parity audit implementation plan

> **For agentic workers:** Use superpowers:executing-plans inline. Steps use checkbox syntax for tracking.

**Goal:** Find and repair proven Local/Firebase boundary mismatches across shared management, stock, checkout, receipts and reporting.

**Architecture:** Keep canonical Firebase IDs and scaled values unchanged. Normalize only at the UI boundary, resolve known legacy identities through the existing reversible encoding, and use immutable receipt snapshots for historical facts. Preserve the original UI and authorization rules.

**Tech Stack:** Vue 3, Pinia, Firebase Firestore, Vitest, Firestore Emulator.

**Spec:** User request in this chat, 5 November 2026: audit similar Local/Firebase errors throughout the system; AGENTS.md delivery and access agreements apply.

## Global constraints

- No live-data migration, destructive production tests, billing or offline fallback.
- Keep IDs, original inventory units and zero values intact.
- Confirm money/quantity conversion happens exactly once.
- Test, lint, build, commit, push and verify Pages and live release assets.

## Review focus

- Encoded and native IDs, shuffled entities and renamed labels.
- Zero versus missing costs and prices.
- Inactive/deleted catalog entities and shared group availability.
- Historical receipts after price changes, group changes and deletion.
- Imported data, new native cloud entities and immutable pending commands.

### 1. Identity and catalog boundary

- [x] Reproduce default-recipe mismatch with imported MAT001/MAT010 in a different order.
- [x] Reproduce missing platform active state and Local inactive-group selection.
- [x] Fix shared identity lookup, presentation flags and group validation.
- [x] Confirm raw and encoded IDs preserve the same behavior.

### 2. Receipt and inventory value boundary

- [x] Reproduce receipt price drift after modifying current catalog prices.
- [x] Share frozen receipt item projection between immediate receipt and reports; do not invent missing historical prices.
- [x] Reproduce zero-cost lot fallback and fix shared stock presentations.
- [x] Check stock quantity, dates, units and pack-cost conversion with imported fixtures.

### 3. System verification and release

- [x] Audit image keys against supported catalog ID limits and document/repair proven incompatibilities.
- [x] Exercise Local/imported-cloud sale, cancellation, receiving, production and report parity with synthetic fixtures.
- [x] Review providers, backups, pending command recovery and role boundaries for accidental Local fallback.
- [x] Run relevant Emulator proofs, all unit/UI tests, lint and production build.
- [x] Record findings and verification limits in docs/local-firebase-parity-audit-2026-11-05.md.

Release gate: commit, push, release the verified Rules, and verify Actions plus live version.json/entry before reporting completion.
