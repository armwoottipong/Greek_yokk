# Command Recovery Implementation Plan

> **For agentic workers:** Execute inline with superpowers:executing-plans. Check each step with TDD and obtain a fresh whole-branch review before release.

**Goal:** Restore safe inventory/menu operations and explain blocked writes without duplicate sales or lost drafts.
**Architecture:** Durable journal owns submission evidence, server receipts own outcomes, workspace owns only editable drafts. Keep the current Vue/Firebase adapters and authorization.
**Tech Stack:** Vue 3, Firebase client/Firestore Rules, IndexedDB, Vitest.
**Spec:** docs/superpowers/specs/2026-10-31-command-recovery-design.md

## Global Constraints

- Sale recording still deducts stock by recipe; cancellation restores original lots.
- Original layouts, role restrictions, online-only writes and immutable receipts remain.
- No live import, billing change or storage deletion.

## Review Focus

- Old uncertain attempts must not be cleared by a new preflight failure.
- Another tab resolving a command must update this tab without resubmission.
- Local persistence failure before execution must leave an unsent draft discardable.
- Server success followed by reload failure must not replay a mutation.
- Deleted menu recipes and protected materials must not disappear from eligibility checks.

### Task 1: Journal and failure evidence

Files: src/cloud/journal.js, commandExecutor.js, core/commands.js; tests/cloud/{journal,commandExecutor,coreService}.test.js.
Interfaces: execute returns existing ok/code plus causeCode/outcome when failing; journal safely releases only never-attempted records and exposes resolved records for recovery.
- [x] Add failing tests for unsent journal release, past-attempt retention, original error cause, resolved recovery.
- [x] Run focused tests and confirm failures.
- [x] Implement atomic journal checks and consistent failure metadata.
- [x] Run focused tests and record results.

### Task 2: Workspace and draft recovery

Files: src/cloud/core/{CoreWorkspace.vue,inventoryModel.js,CloudStockWorkspace.vue}, focused tests.
Interfaces: recovery reconciles stored command and durable record; draft model exposes operation-specific blocking rather than one generic connectivity message.
- [x] Add failing tests for initialization retry, resolved/session recovery, pre-send refusal, persistence failure, unrelated pending draft discard and uncertain retry retention.
- [x] Implement recovery on load/reconnect without automatic submit, readable diagnostics, and correct draft outcome transitions.
- [x] Verify focused tests, sale/cancellation and partial draft commits.

### Task 3: Inventory/catalog eligibility

Files: src/cloud/core/{inventoryModel.js,catalogBindings.js}, model/material eligibility, Rules adapters if needed, focused unit/emulator tests.
- [x] Pin hidden recipe/protected/return-material blockers with tests.
- [x] Make UI show the actual blocker; support explicit detachment of retired catalog recipes while preserving historical receipts.
- [x] Implement safe pending-command closure only with server evidence/fencing; never invent local success.
- [x] Run emulator proof for changed protocol and existing sale/cancel/role boundaries.

### Task 4: Review and release

- [x] Whole-branch review; fix material findings with failing/passing tests.
- [x] Run npm test, npm run lint, npm run build, focused emulator tests.
- [ ] Record limits and verification; commit, integrate after inspecting origin/main, push normally.
- [ ] Verify Pages Actions, version.json and deployed entry asset.
