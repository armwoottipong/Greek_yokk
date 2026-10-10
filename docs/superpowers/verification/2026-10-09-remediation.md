# Audit remediation verification

Updated 2026-10-10 (Asia/Bangkok). Branch `codex/audit-remediation`, based on `main` at `0fd135b`. Implementation is in the managed worktree, not the original checkout. No deployment, production reset, merge or push was performed.

## Plan status

| Task | Local result | Remaining acceptance evidence |
|---|---|---|
| 1 Startup preservation | Implemented; startup regressions | None locally |
| 2 Validated atomic database | Implemented; validation, persistence and revision tests | Simultaneous cross-tab writes have a race beyond sequential revision checks |
| 3 Replacement and recovery | Implemented; import/reset backups and failure regressions | Browser file chooser round-trip not completed |
| 4 Isolated drafts | Implemented; save/discard, sale rebase and conflict tests | Full browser draft workflow not completed |
| 5 Inventory allocation | Implemented; aggregated requirements and rejection tests | None locally |
| 6 Material edits/production | Implemented; production and metadata tests | Full browser receive/produce/waste/stocktake workflow not completed |
| 7 Atomic checkout | Implemented; checkout failure and shortage tests | Physical receipt printing not tested |
| 8 Stock forms | Implemented; lot selection, unit conversion and archive tests | Full browser archive/restore workflow not completed |
| 9 Dialogs/mobile | Implemented; dialog, keyboard and Add-on tests; mobile browser evidence | New Settings visual changes await browser verification |
| 10 Bangkok dates/CSV | Implemented; date, expiry and CSV regressions | None locally |
| 11 GAS recovery | Implemented; 68 VM-backed recovery tests | Actual Sheets cell semantics, quotas and runtime not proven |
| 12 Snapshot sync | Implemented; 5 frontend/backend adapter tests | Mandatory live test-deployment transport/redirect/readback proof pending |
| 13 Release checks | Test/lint/build gates and deployment documentation implemented | Remote Pages settings require checking before release |
| 14 Handoff | Review fixes, whole-suite verification and this report recorded | Remaining browser workflow checks and live deployment proof listed above |

The plan has 14 tasks. Code changes address all 14, but Tasks 12 and 14 are not accepted as fully complete. Automated/component evidence must not be presented as live deployment or full browser evidence.

## Verification evidence

- Before the final price-form/Settings changes, `npm test`: 18 files / 135 tests passed; `npm run lint` and `npm run build`: exit 0.
- Newly found browser regression: menu/Addon editors passed blank platform prices as empty strings to strict database validation. Two component tests failed first, then passed after converting blank form prices to numeric zero. Imported invalid numeric strings remain rejected.
- Settings navigation: new test failed before implementation, then passed with the component attached to the document. Backup opens by default; choosing another group hides the previous group. Buttons use native keyboard behavior and expose selected state.
- Final verification after all product changes: `npm.cmd test` exited 0, 20 files / 138 tests passed; `npm.cmd run lint` exited 0; `npm.cmd run build` exited 0 (1621 modules, initial JS407.40kB / gzip115.21kB, no large-chunk warning). Documentation-only edits followed this run.
- `git diff --check` passed before final documentation changes.
- Fresh code review found 0 Critical and 7 Important findings. Each Important finding was reproduced with a failing test and fixed: discard conflict, free receipt weighted cost, formula recovery liveness, incomplete import acceptance, active-lot rebase, canonical replacement backup, failed sync endpoint retry.
- Additional regressions cover invalid draft input, outstanding shortage receipt/history, original receipt commission, UTC-device Bangkok expiry dates, malformed history/category data, boolean numeric input and signed historical losses.

## Browser evidence and limits

Disposable origin: `http://127.0.0.1:3010/Greek_yokk/` using demo data. The original user tab at port 3000 was not used for data mutation.

- Demo load, POS sale of Size S for THB69, receipt display and reload persistence verified. Dashboard retained three orders totaling THB466.
- At 390x844, main content started at x=0 with width390. At 768x1024, main started at x=256 with width512. Desktop screenshot inspected.
- Cancel focused + Enter on clear confirmation cancelled; orders remained three.
- Menu page rendered. Creating `Audit Test Menu` with only a storefront price reproduced the blank-price issue; after the fix, row and success toast were visible.
- No captured warning/error console messages during the successful POS/receipt and menu checks.
- Browser automation subsequently stopped responding: two independent reads/actions each timed out at the tool boundary. Remaining navigation/edit/archive/stock/import/two-tab scenarios were not falsely marked passed. Settings navigation has component evidence only.
- No test deployment URL was found in source. Only placeholders/legacy bundled references were located; these are not authorization to write to an unknown spreadsheet. A URL bound to a disposable test sheet and running this version is required for Task12.
- Subsequent live probe (2026-10-10): user supplied an `/exec` URL and explicitly confirmed a disposable test sheet with synthetic writes allowed. Two unauthenticated GET `action=getSnapshot` requests returned HTTP200, `text/html; charset=utf-8`, title `Sign in - Google Accounts` and an accounts.google.com sign-in page rather than JSON. This is a deployment access blocker, not a successful API response. No synthetic POST was sent. Recheck deployment access and the copied active deployment URL, then repeat the browser round-trip; readable acknowledgement remains unproven.

## Audit coverage

| Findings | Evidence/change |
|---|---|
| D01/C01 | `startup.test.js`, `database.test.js`, atomic checkout/storage handling |
| D02/D06-D09 | `replaceDatabase.test.js`, schema3 full export, original-byte recovery copies; GAS acknowledgement checks for D09 |
| D03/D04/D07 | `drafts.test.js`, `recoveryEdges.test.js`, signed lot-delta rebase and conflict recovery |
| B01/B03/B04 | `requirements.test.js`, pure aggregate allocation, packaging flag and expiry enforcement |
| D05 | `materialEditing.test.js`, atomic production edits and staged stock totals |
| B02 | `checkout.test.js`, immutable price/commission/cost snapshots and explicit shortage records |
| U02/U04/U07 | `stockForms.test.js`, lot initialization, canonical unit conversion, archived state |
| U01/U03/U05/U06 | `dialogs.test.js`, `addons.test.js`, shared ModalShell, native controls and responsive navigation |
| C02/C03 | `datesAndCsv.test.js`, `activityDates.test.js`, `expiryBusinessDate.test.js` |
| B06-B10 | `backend.test.js`, seed/idempotency/prevalidation/PREPARED recovery/date query fixes |
| B05 | `sync.test.js`, readable matching committed acknowledgement; live transport pending |
| A01-A04/check gaps | Domain/service modules, lazy views, CI regression gates and corrected Pages documentation; no broad legacy deletion |

## Decisions and changed contracts

1. Windows ledger bookkeeping replaces bash-only task scripts; equivalent test/review evidence retained.
2. Independent UI/backend tasks were delegated under the applicable parallel-work skills. Coupled core changes remained inline and integrated by the root agent.
3. User authorization to implement the plan selected its proposed policies: local database authority; moving weighted-average cost; explicit shortage override records a deficit; expired/missing/archived materials cannot be overridden; Bangkok business timezone. Auth/security work skipped as requested.
4. Inventory drafts rebase signed per-lot quantity differences onto new committed stock; impossible negative results create an explicit conflict. The desired active lot is selected once after quantity changes.
5. Vue Test Utils is pinned to 2.4.6 for Node20 CI compatibility. The initially resolved newer package pulled tools with higher engine requirements.
6. Legacy Sheets cell endpoints reject leading-equals literal text before PREPARED to avoid a permanently unrecoverable formula/readback mismatch. JSON snapshot backups remain unrestricted by this cell rule.
7. New record IDs are UUID-based. Public committed mutations return structured `{ok,success,...}` results; forms close only on success. Storage failure retains drafts/cart and committed data.
8. Canonical schema3 is saved once before publishing state. Legacy/corrupt/replacement originals are copied before intentional replacement; failure to preserve the recovery copy aborts replacement. Essential material/menu/Addon arrays are required for imports.
9. Sheets is optional snapshot backup. `syncAll` requires stable requestId and full snapshot; success requires matching requestId/revision/checksum with `status:'committed'`. Opaque/rejected/mismatched responses do not update success time. One request is in flight, with the latest revision queued.
10. User authorized simplifying difficult UX. This bounded Settings change presents four groups with backup first, keeps the existing design system and actions, labels saved URL separately from acknowledged sync, and exposes sync failures. It does not introduce a new subsystem. The explicit instruction to redesign allowed proceeding without a second authorization request.

## Remaining release actions

1. Restore working browser automation and finish the unchecked browser workflows, including exported-file restore and two-tab stale writer.
2. Use a disposable Apps Script deployment running this Code.gs. Send synthetic schema3 data through the browser and read back matching requestId/revision/checksum; record readable response and redirect behavior. Do not send shop data for the probe.
3. Check Apps Script runtime/Sheets quotas on representative data, remote GitHub Pages branch settings and physical receipt printing.
4. Choose integration of `codex/audit-remediation` into `main` or a PR. Retain the worktree until that decision; no production data replacement is part of integration.

These external/blocked checks remain visible. No claim of production-ready completion is made.
