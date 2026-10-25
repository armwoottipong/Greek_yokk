# Core launch implementation plan

> **For agentic workers:** Use superpowers:executing-plans inline. Reuse the existing worktree and ledger. Do not dispatch implementers per task.

**Goal:** Deliver the first operational Firebase release for sale/stock deduction, cancellation, receiving and production, as approved 25 October; defer settings mutations and extended reports.

**Architecture:** Keep Vue/Pinia and the existing Firebase client/session. Opt-in build mode selects the Firebase entry; local entry stays available. Connect login first, then a validated imported snapshot, then server-confirmed core commands using the prepared candidate; no local-store writes may masquerade as shared shop data.

**Tech Stack:** Vue 3, Firebase SDK 12.19.0, Vitest, existing Firestore Emulator.

**Spec:** Existing 2026-10-20 Firebase design, narrowed by user's explicit approval of core-first launch on 25 October.

## Global constraints

- Spark free; Google login only; all logged-in accounts equal; no roles.
- No offline sale/write queue; retain pending cart/command until server result is known.
- Preserve original backup/history; no silent truncation or rounding for import.
- Implement reversible local changes autonomously; publish/migration only after concrete checks and review.
- No claim of operational Firebase POS from authentication alone.

## Review focus

- Unknown/missing build mode or malformed config must not connect to an unintended backend.
- Firebase entry must not initialize the old local POS/store, even when Firebase fails.
- Cache/login readiness must not enable checkout without complete snapshot and command adapter.
- Switching accounts/reconnecting must dispose old subscriptions and ignore late callbacks.
- Google popup failure and offline states must leave a usable retry/sign-out screen.

## First delivery: actual login entry

- [x] Add failing boot-selection/config tests and mounted login/readiness/error/reconnect UI tests.
- [x] Implement lazy opt-in entry, validated config and session screen using existing brand tokens/Button.
- [x] Verify affected session/client/UI tests, lint and both build modes. Document exact remaining launch gates.

Design ruling: reuse cream/burgundy/Prompt brand, existing mascot, one central login panel, 44px minimum controls. No redesign. Authenticated screen remains a truthful connection checkpoint until core data/commands are wired; never render the old POS under a connected badge.

## Subsequent core delivery (same user-authorized launch direction)

1. Complete current-snapshot validation + reversible codec, preserving historical records separately; make a reviewable import rehearsal.
2. Bind live shop/materials, server-confirmed sale/cancellation/receive/produce with durable pending-command recovery. Keep deferred settings/report writes unavailable in Firebase mode.
3. Two-browser core workflow/offline/reload rehearsal, quota and source reconciliation, then concrete release/cutover review.

Release criterion: core actions work on two sessions with server-confirmed receipts/stock, reload and network failure preserve pending work, imported balances/history match source. Authentication checkpoint alone does not meet it.
