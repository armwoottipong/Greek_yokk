# Firebase Spark security proof checkpoint

Status: **Task 1 remains in progress. Do not migrate live data or deploy the test-only candidate.**
Date: 2026-10-20. Branch `codex/firebase-spark-multidevice`, base `93075d9`.

Continuation: one isolated finite-counter policy now covers source-shaped sales,
receiving, production, cancellation and existing catalogue edits. Structural
authoring, other inventory operations and certification remain unfinished. See
[summary-model-experiment.md](summary-model-experiment.md). The 340-test run below
is the earlier baseline, not certification of the new model.

The supplied backup now provides concrete compatibility requirements: Fruit Trio
needs three distinct choices; legacy menus permit eleven addons and single-line
material unions up to fifteen. Those exceed the main bounded candidate's two-option and
twelve-material bounds. Passing synthetic examples below do not certify this
backup. See `source-backup-inspection-2026-10-20.md`; the corrected preflight blocks
the incompatible profile while preserving the source unchanged.

## Current access policy

User instruction on 2026-10-20 supersedes the earlier membership/role design: **Google login only, equal access for every signed-in account.** No owner/cashier role, no membership approval, no first-owner UID/bootstrap. Existing fixture UID strings such as `owner` and `cashier` are only test account identifiers and confer no special rights. Sale, production and cancellation tests now prove access by brand-new authenticated UIDs without profile records; anonymous access still fails. Future catalog/inventory UI uses the same equal-access policy. Historical review notes about role checks are superseded.

## Verification evidence

- Original application baseline: 101 files / 635 tests passed before adding the Emulator harness.
- Current full Emulator suite: **23 files / 340 tests passed**, `stock-in-final-emulator.log` in the ignored execution ledger, including the opt-in supplied-source checks. This includes both the original bounded candidate and a separate source-shaped set-selection alternative, SDK transaction contention/replay, retained-history sale/production/cancellation, diagnostics and deny-all deployment verification. The two models' passing features have not been unified; this is not completed POS integration.
- Current ordinary application suite: **111 files / 770 tests passed**, `stock-in-completed-app.log`. Final adapter precision fixes additionally passed all six supplied-source Emulator cases; lint and diff checks pass.
- Firebase SDK 12.19.0, Rules Unit Testing 5.0.2, CLI 15.34.0, Firestore Emulator 1.22.0, Node 22.17.1 and Java 22.0.2.
- Tests target only `demo-greek-yogg`, Firestore `127.0.0.1:8088` and Auth `127.0.0.1:9098`. Helpers reject other targets.
- The application entrypoint has not enabled Firebase. Prepared bootstrap/session modules now import the SDK and are tested separately; no production reads/writes, Rules deployment, billing changes or live migration have occurred.
- Root `firestore.rules` still denies every client request. `tests/firestore/candidate.rules` is experimental and must never be deployed directly.

## Reproduce

Install the lockfile using `npm ci`, select Java 21+ and run `npm run test:firebase-proof`. Ordinary `npm test` excludes Emulator tests.

```powershell
$env:JAVA_HOME = 'C:/Program Files/Java/jdk-22'
$env:PATH = "$env:JAVA_HOME/bin;$env:PATH"
npm run test:firebase-proof
```

Stop an already running project Emulator before using this command. For an existing local Emulator, run Vitest with `FIRESTORE_EMULATOR_HOST=127.0.0.1:8088`.

## Results and current model

The original monolithic receipt validator hit the 1,000-expression ceiling even for the small fixture. A frozen version and explicit diagnostic are retained under `tests/firestore/candidates/`. Permissive diagnostic substitutions exist only in memory in the demo Emulator; they are not a proposed policy.

The improved candidate commits one immutable receipt, protected line proofs, inventory proofs, all material updates and one shop revision update atomically. A terminal proof links back through preceding proofs. Every referenced material must have the matching operation and incremented revision. Each leaf requires a parent receipt absent before the commit and present afterward. The parent's create validator enforces membership, generation, totals and proof linkage. Leaves cannot be planted separately or reused for an existing sale.

This argument assumes trusted import/restore validates a complete generation: no orphan proof documents or dangling operation references may be activated. The candidate is not an import policy.

Authorization requires Firebase login only. Command updates may change only their declared shop metadata fields; there is no membership map or role gate. Menus and platform definitions now share the protected shop-root metadata document with lifecycle metadata. Sale/production/cancellation root guards preserve this catalog unchanged. It contains metadata only, separate from stock and sales history. A duplicate standalone catalog fixture remains for diagnostics but is not the Rules authority.

### Accepted examples

| Basket | Distinct materials | Result |
| --- | ---: | --- |
| One custom bowl, repeated and included selections, packaging adjustment | 4 | Accepted |
| Two custom bowls, group-specific prices, split lots and exact shortage consent | 4 | Accepted |
| Shipped MENU01 + MENU02 | 5 | Accepted |
| Shipped MENU03 twice | 7 | Accepted |
| Shipped MENU03 + MENU04 | 10 | Accepted |
| All four shipped menus | 11 | Accepted |
| Six custom lines with repeated/included options and exact shortage approval | 4 | Accepted |
| Six shipped menu lines across all four menu types | 11 | Accepted |
| Seven coherent lines | 4 | Denied atomically |

The user accepted using our recommendation for bill size. **Six lines is the implementation target, not a guarantee that every six-line ingredient/option combination has been certified.** Same menu/options may increase quantity in one line. Never split one sale into several commits to evade limits.

### Experimental bounds and budgets

The candidate accepts bounded examples with 1–6 lines, up to 12 distinct material references, up to two selected option records per line and up to four group IDs. Materials use two, three or four stored lots, or a selected four-lot window surrounded by unchanged consumed history. These are proof bounds, not a frozen product contract. More than four live lots, nonconsecutive live lots and more than two selected option records remain important limitations; complete upper-bound combinations are not certified.

Line proof blocks contain one or two lines. Inventory proof blocks contain one to four rows, selected by the fixture planner: complex option/package baskets use smaller blocks; the current fixture uses one inventory row per proof for more than four lines, two for other option/package baskets and four for simple baskets. More than four option-bearing lines shifts stock-fact checks to inventory witnesses; other baskets check those same facts in material guards. The protected lineBlockSize selects the mutually complementary routes. These routes are complementary, determined by the protected parent receipt, and both have negative tests. Three/four-lot rows use their separately bound witness route.

Estimated unique Rules access budget:

`materials + inventoryProofs + lineProofs + 3 <= 20`

The experimental three/four-lot witness additionally reads before-material state for each such material. Its real access estimate must add that count. The receipt formula has not yet been updated to certify the combined multi-lot boundary; over-budget combinations remain blocked before production integration.

For the two-lot path, the three shared accesses are after-shop (also catalog/lifecycle), before-receipt existence and after-receipt. Every individual write must also remain within ten accesses. Passing examples demonstrate acceptance, but complete boundary matrices, cache/headroom instrumentation, document sizes and production/undo graphs remain outstanding. Formula compliance alone does not prove the expression limit.

### Business checks reproduced against existing code

Stock, package and GP results reuse `inventory.js`, `packagePlan.js` and `pricing.js`. The cloud-specific ingredient summation order is explicit below:

- Canonical catalog snapshots, platform-specific menu/group-option prices, included and repeated selections, generic group IDs and group minima/maxima. Detached groups are rejected even if their definitions remain in the catalog.
- Quantity in hundredths; final money in integer satang. Canonical **unitCost preserves the source IEEE-754 baht value**, including 0.2075, 0.045 and a weighted production-cost result. Integer satang per unit would lose source precision.
- Existing active-lot priority, then expiry/receive order for two lots; immutable lot IDs in the receipt and exact post-update quantities/active flags.
- Each material has an immutable catalog-assigned unique `costRank`. Inventory rows must be strictly ascending by that rank. Ingredient costs are summed in this authoritative order. A coherent permutation regression reproduced a real defect before this check: `(0.01 + 0.02) + 0.005` rounded to 3 satang, while `(0.01 + 0.005) + 0.02` rounded to 4. Client order can no longer select the rounding result.
- This deliberately defines deterministic arithmetic for **new cloud sales**. It preserves source unit costs and imported recorded totals, but may differ by one satang at floating-point boundaries from old local basket-order cost sums. It does not change customer sale prices, GP or stock quantities. Codec/import and cloud previews must explicitly diagnose this difference; do not claim bit-identical compatibility with every old cost calculation.
- Packaging still rounds each material before summing; GP and net/profit are checked separately.
- Exact shortage consent; expired-ingredient shortage protection.

Negative tests include outsider, anonymous and cross-shop access, forged role claims, self-promotion/reactivation, stale revisions, maintenance/inactive generations, coherent underpriced selections, altered GP/cost/recipe, omitted writes, wrong lots, wrong shortages, extra fields, immutable history and replay. Four- and six-line tests additionally forge lot identities and matching shortage approvals and check atomic rejection. Six-line cases additionally reject a wrong material ordinal, forged ingredient cost with matching profit, forged stock total/rank, omitted middle line, omitted intermediate inventory witness and omitted material. Additional combinations remain outstanding.

## Cancellation proof added

The test-only candidate now includes cancellation commands available to any logged-in user. One atomic commit creates a cancellation receipt and chained material proofs, marks the original immutable financial record cancelled, increments the shop revision and returns each original allocation by immutable lot ID. It never reconstructs allocations from current recipes and never returns the unfulfilled shortage.

The original sale update permits only status, cancellation ID and server cancellation timestamp. Cancel receipts/proofs are immutable. Material returns preserve source costs, lot identities and metadata, increment revisions and return only take0/take1. Existing active-lot behavior is preserved for the bounded two-lot model. Historical shortage evidence remains on the original sale; read models must exclude cancelled orders from revenue/current outstanding shortages.

Seventeen cancellation tests pass, including the real eleven-material basket, wrong lot/cost/quantity/financial edits, omitted material/proof/order/shop writes, missing original lot, anonymous access and unrelated shop metadata changes, a second cancellation ID, omitted intermediate proof, and two simultaneous cancellation commands with exactly one success. This is an Emulator batch contention proof; the application transaction/recovery transport is still unimplemented.

The cancellation read graph includes original sale before/after, new cancellation before/after, after-shop, materials and chained proof docs. The eleven-material example passes actual Rules. Full access/expression headroom and larger lot histories remain uncertified. Command dispatch uses lastOpKind; authorized sale and cancellation guards independently constrain their write sets. A ternary dispatch expression triggered a Java Emulator internal error and retained locks; Boolean guarded branches plus restarting the local Emulator resolved the harness failure. This is not evidence about production service availability.

## Production proof added

Production tests now cover login-only access. The test-only production command consumes 1–3 declared actual input quantities using the existing domain allocator, forbids shortages, validates each protected input cost, and atomically appends one new output lot with the weighted material cost. These are actual quantities entered by a signed-in user, consistent with the existing editable production form; this does not claim enforcement of an immutable recipe ratio.

The shipped Greek Base recipe is tested directly: 5,000 ml milk plus 300 g starter costs 249 baht and yields 1,200 g at 0.2075 baht/g. A complete produce-then-sale example reads committed lots and weighted cost before selling. Repeated production appends a third lot; an eight-lot output example preserves seven historical lots exactly using list concatenation and immutable lotIds. Duplicate historical IDs are rejected. Import/authoring must establish lotIds and activeLotId as accurate summaries; no client may forge them on normal sale/return writes.

The receipt uses a server commit timestamp. The nested lot retains an ISO client-origin metadata time, matching existing legacy shape; it is not an authority for reporting or expiry. Firestore serverTimestamp transforms cannot appear inside array elements. Reporting uses the receipt server time.

Tests also reject changed weighted cost, changed original lot, duplicate IDs, manufactured extra stock, incorrect deductions, coherently forged input cost, invalid expiry-before-origin, stale revisions, expired inputs, anonymous access, unrelated root metadata changes and omitted atomic writes. Repeated ID is rejected; two competing production commands based on identical revisions yield exactly one commit.

The next bounded multi-lot candidate now accepts sales consuming three or four stored lots. Its new witness validates source ordering, IDs, costs and part of the post-lot facts; the material guard validates FIFO quantities and the complementary facts. Two-lot witnesses explicitly reject four-lot payloads. An adversarial regression reproduced a real bypass when that binding was absent; the corrected candidate rejects it. Optimized balance folding preserves sequential floating-point addition while avoiding duplicate traversal.

Cancellation now also preserves subsequently appended lots: two-lot sale followed by a third production lot, and four-lot sale followed by a fifth lot, both restore only original allocations and leave the later active lot unchanged. The return uses the immutable original prefix IDs and an unchanged appended tail. Reordering/removing original lots remains unsupported and must be rejected or migrated explicitly.

Operation links now bind lastOpKind as well as opId/revision. A reproduced cross-kind-ID regression had allowed cancelling the latest sale without any material/root writes; kind binding closes it. Sale, production and cancellation use separate immutable receipt collections; the full kind-bound reciprocal state transition is required even when IDs coincide across types.

Production input deductions now accept two, three or four stored source lots. Multi-lot input proof documents are mandatory and linked to the same production operation kind. The material guard validates FIFO deductions and complementary lot facts; the dedicated input proof validates original identities, ordering, costs and the remaining post-lot facts. Tests reject omitted input proofs, forged third-lot quantity and deleting an empty historical lot. The 3/4-lot positives use the existing domain allocator for expected results. Sales still require the bounded two/three/four-lot shape; production may append more historical lots than the current sale validator supports. This is an open certification gap, not a completed migration.

## Remaining certification gate

Application regression passed 108 files / 746 tests (`preflight-app-full.log`); the subsequent CLI inspection suite passes three tests separately (`preflight-cli-green.log`). ESLint and Vite production build passed. These checks validate the unchanged application plus prepared modules/harness; they do not validate a cloud-connected application.

Do not export `CLOUD_LIMITS` or begin integration based solely on the passing count. Remaining work includes:

1. Complete upper-bound combinations, larger/archived lot representation, mixed multi-lot production boundary combinations, realistic option counts and catalog schema validation at authoring/import boundaries.
2. Complete six-line tampering and reused/substituted witness matrices, expiry/business-day boundaries and calculation bounds.
3. Larger exact-lot sale/input/cancellation histories and coherent upper-bound combinations. Production, sale and cancellation now pass bounded two/three/four-lot examples plus four-lot windows within longer consumed histories. Arbitrarily distributed live lots, more than four live lots and generic history archiving remain unsupported and uncertified.
4. Document/request size and Rules access/expression headroom, transaction contention and offline behavior.
5. Codec/migration diagnostics that preserve precision and reject unsupported source shapes before any write; no orphan proofs may be activated.

No evidence here establishes that Firestore in general is impossible. A failed candidate and a passing bounded candidate both have limited implications. The approved pure-Spark route remains under investigation; no additional external backend has been selected.

References: [Firestore quotas and Rules limits](https://firebase.google.com/docs/firestore/quotas), [transactions](https://firebase.google.com/docs/firestore/manage-data/transactions), [Rules conditions](https://firebase.google.com/docs/firestore/security/rules-conditions).

Earlier continuation evidence: multi-lot production positives first failed against the two-lot input policy (`production-input-multi-red.log`); after operation-kind-bound input proofs, the focused production suite passed 30 tests. Full proof then passed **10 files / 158 tests** in 34.91s (`production-input-multi-full.log`). ESLint and `git diff --check` also passed. These remain test-only security/model results, with no live service connection or migrated application state.

Preparatory login modules were added independently of the uncertified lot schema; see `authentication.md`. They are not imported by the running POS entrypoint and expose no mutation transport or canWrite flag. Unit tests cover 23 bootstrap/session cases; a real-SDK Auth Emulator test uses a Node-only persistence adapter, with production mode fenced off. The product entrypoint and deployable deny-all policy remain unchanged.

Prepared IndexedDB coordination and recovery modules are also unimported; see
`command-recovery.md`. They have no Firebase commit adapter and do not bypass the
certification gate.

## Expression reserve diagnostic

`shapeHeadroom.test.js` strengthens every mutation predicate with additional
arithmetic comparisons without removing or weakening any candidate validation.
Controls with zero added comparisons pass. Current results: four-lot example
passes eight added comparisons; six option-bearing lines pass four; six shipped
lines with eleven materials already fail at one. All three fail with sixteen. This
supersedes the earlier diagnostic before the mixed-shape schema changes. Failures explicitly
report the 1,000-expression ceiling. This measures the effect of this particular
instrumentation, not an exact free-expression count or complete shape guarantee.
The initial experiment demanded sixteen and failed; it was then expanded into a
control/boundary diagnostic, not fixed by weakening candidate Rules. These bounds
confirm limited headroom and reinforce the remaining mixed-shape certification
gate. Production and cancellation reserve measurements remain outstanding.

## Mixed shapes and real transaction checkpoint

Six option-bearing lines now pass with three/four lots on one ingredient and
four lots on three ingredients. For the >4-line multi-lot route, immutable
`multiIds` binds every Four row and excludes every Two row. It counts extra
before-material reads in the parent bound. Mandatory line proofs accumulate
per-material requirements; the final Four witness binds the total including
packaging adjustments. Stock/Four guards retain complementary FIFO, priority,
metadata and cost validation. Group/note checks on this route are distributed
across first multi material stock (line 0), sale parent (line 1), and shop root
(lines 2–5). Tests independently reject group/note violations on each line,
missing/substituted multi IDs, omitted/forged summaries and coherent shortages.
Three/four-lot remainder and Bangkok expiry-day boundaries pass against the
existing domain allocator. These examples do not certify arbitrary combinations.

Real Web SDK `runTransaction` tests prove receipt replay without another stock
deduction and two competing commands yielding exactly one commit. The test adapter
refuses stale source revisions. A losing command can receive a Rules permission
failure before the winner is observable; production error recovery must retain
the original operation and reconcile rather than promise an immediate conflict
classification or generate a replacement ID. This is a test-only adapter, not an
enabled product transport. The tests also fixed a fixture bug that had hardcoded
the first operation ID in material updates.

Read-only conversion diagnostics and an inspection CLI are prepared separately;
see `preflight.md`. No final codec/protocol, app integration or migration is enabled.

The history-window route now shares the main candidate with six-line mixed-shape
validation. Deduplicating checks that remain mandatory elsewhere in the atomic
commit resolved the previous regression; the full 228-test suite passes. See
`history-window-experiment.md` for the trusted-state invariants, passing examples,
derivation of the deduction bound and remaining limitations. This does not certify
the complete supported model or authorize active integration.
