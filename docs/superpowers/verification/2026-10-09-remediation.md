# Audit remediation verification

Updated 2026-10-10 (Asia/Bangkok). Branch `codex/audit-remediation`, based on `main` at `0fd135b`. Implementation is in the managed worktree, not the original checkout. No deployment, production reset, merge or push was performed.

## Plan status

| Task | Local result | Remaining acceptance evidence |
|---|---|---|
| 1 Startup preservation | Implemented; startup regressions | None locally |
| 2 Validated atomic database | Implemented; validation, persistence and revision tests | Simultaneous cross-tab writes have a race beyond sequential revision checks |
| 3 Replacement and recovery | Implemented; import/reset backups and failure regressions; browser export/import exact data round-trip passed | None locally |
| 4 Isolated drafts | Implemented; save/discard, sale rebase and conflict tests; browser production draft -> sale -> discard passed | None locally |
| 5 Inventory allocation | Implemented; aggregated requirements and rejection tests | None locally |
| 6 Material edits/production | Implemented; production and metadata tests; browser production staging, receive/waste/stocktake commits passed | None locally |
| 7 Atomic checkout | Implemented; checkout failure and shortage tests | Physical receipt printing not tested |
| 8 Stock forms | Implemented; lot selection, unit conversion and archive tests; browser archive/restore passed | None locally |
| 9 Dialogs/mobile | Implemented; dialog, keyboard and Add-on tests; mobile browser evidence; Settings groups and screenshots verified | New Settings was rendered at actual widths758/1280; viewport override did not produce390 in this resumed session |
| 10 Bangkok dates/CSV | Implemented; date, expiry and CSV regressions | None locally |
| 11 GAS recovery | Implemented; 68 VM-backed recovery tests | Actual Sheets cell semantics, quotas and runtime not proven |
| 12 Snapshot sync | Implemented; 5 frontend/backend adapter tests; live browser send/replay/exact readback passed | Representative production dataset capacity remains a release check |
| 13 Release checks | Test/lint/build gates and deployment documentation implemented | Remote Pages settings require checking before release |
| 14 Handoff | Review fixes, whole-suite verification, browser workflows, two-tab stale writer and this report recorded | Physical printer and deployment settings remain release checks |

The plan has 14 tasks. Local implementation and handoff work address all14. The previously blocking Task12 live transport proof and Task14 core browser workflows were completed in the resumed verification below. This is completion of the local remediation scope, not production deployment or proof of every operating environment. Remaining practical limits are explicit in the table and release actions.

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

## Resumed browser and live deployment verification (2026-10-10)

After resetting the browser automation session, controls responded again. No product code changed in this resumed run.

Fresh final run after resumed checks:20 files /138 tests passed (exit0), lint passed (exit0), build passed (exit0). Only this verification document and plan status changed afterward.

- New user-confirmed test deployment returned readable JSON. Initial GET `action=getSnapshot` reported `No committed snapshot`, correctly reflecting an empty backup.
- A temporary local probe imported the actual `src/services/gasClient.js` and normalization module. It used a synthetic schema3 snapshot containing Thai/emoji text, a fractional stock lot, menu recipe, Addon link, order financial snapshot, activity log with quotes/newline, categories, platforms, URL field and shortages collection. It did not access localStorage/shop data.
- Browser origin `http://127.0.0.1:3010` sent request `audit-probe-9ca7467a-ffc0-42c6-8ca6-17b5bf731044`, revision1, checksum `5522bc26`. POST returned matching `committed` acknowledgement. Repeating the same request returned the identical acknowledgement. GET by requestId returned HTTP200; redirect to `script.googleusercontent.com` was readable. Entire snapshot JSON and computed checksum matched exactly. This proves the deployed version supports this browser transport and this small payload; it does not establish production capacity.
- Proof images/data are saved under `C:/Users/user/.codex/visualizations/2026/10/09/01a1217c-5703-79d1-ad7e-725beb8120f4/`: `gas-transport-proof.jpg`, `gas-transport-proof.json`, `settings-desktop-proof.jpg`, and `settings-mobile-proof.jpg` (the latter is actual width758, not390).
- Menu create/edit passed; Addon view rendered. Stock production staged +1200g output, -5000ml milk, -300g starter. A Size S sale deducted100g from committed inventory. Working output rebased to4500g. Discard retained sale with3300g output and returned raw inputs to15000ml/2500g.
- Receiving one1200ml milk bottle committed16200ml; waste10ml committed16190ml. Archive and Restore retained quantities/lots. Stocktake changed output3300g to3299g with staged-1g, then committed. Stock reloaded correctly. No captured console warn/error messages in resumed workflows.
- Settings all four groups switched correctly; backup controls were initially shown. UI download -> file chooser import -> confirmation -> second download succeeded. Comparison excluding `revision` and export-only `exportDate` was exact for the full database, including13 activity logs and4 orders.
- Two browser tabs loaded the same revision. The newer tab added `Audit Newer Tab`; the older attempted `Audit Stale Tab`. Older save produced the explicit revision conflict message. Reload showed newer category present and stale category absent. This verifies sequential stale-writer rejection, not simultaneous atomic cross-tab coordination.
- Existing390/768 mobile evidence from earlier checks is retained. New Settings screenshots/DOM were checked at actual widths758/1280; the viewport capability returned without producing requested390 in this session, so no new390 screenshot is claimed. Native save-button Enter worked, and earlier Cancel+Enter check retained data.
- Temporary probe/peer/mobile tabs were closed; viewport override reset. Original user tabs retained. Probe source preserved outside the repository with the verification artifacts. No test URL was saved into the user's app configuration and no production data was sent.

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
| B05 | `sync.test.js`, readable matching committed acknowledgement; live browser replay/exact snapshot readback proof above |
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

1. Check Apps Script runtime/Sheets quotas on representative data, remote GitHub Pages branch settings and physical receipt printing.
2. Check new Settings on a physical/natively sized390px mobile viewport; browser override was ineffective in the resumed session. Simultaneous editing across tabs/devices is outside the demonstrated sequential revision guard.
3. Choose integration of `codex/audit-remediation` into `main` or a PR. Retain the worktree until that decision; no production data replacement is part of integration.

These external/blocked checks remain visible. No claim of production-ready completion is made.
