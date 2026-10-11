# Whole-system interface renovation — verification

Date: 2026-10-11. Baseline main: `3e92fcc`. Approved A: cream/burgundy mascot shop workspace; desktop/iPad primary, phone quick management. Replaces the earlier four-page mobile plan.

Follow-up: [Remaining interface checks](2026-10-11-interface-remaining-checks.md) installs all six missing owning skills, resolves the deferred Add-on wording and additional evidenced shared UI failures. This report remains the historical initial-release evidence; follow-up verification supersedes its missing-skill/deferred-copy status.

## Result and checks

Tasks1–24 implementation and release work completed. Physical/manual verification gates remain explicitly Not verified. No real shop checkout or Google Sheets write used for UI verification.

- Baseline182tests32files; final **250tests57files PASS** (`npm test`, 26.53s). Targeted final regression4PASS after lint-only alias correction.
- `npm run lint` PASS; `npm run build` PASS; `git diff --check` PASS. Main JS409.74kB /117.88kB gzip.
- Final detector once: `[]`; no brand/font changes made to satisfy heuristics.
- Fresh whole-branch code review:0Critical,4Important, all resolved with4 observed RED→GREEN regression tests. One minor explicitly deferred below.
- Fresh Impeccable review:7material corrections resolved in one batch; bounded verdict **ship for the seven scored fixes**, not whole-surface/device certification.
-30 valid page captures:6routes × desktop1440×1000, iPad834×1194/1194×834, phone390×844/320×844. Changed stock files recaptured at same sizes; unchanged25pagecaptures retain initial reviewed evidence. Additional receive/recipe/confirmation popup captures. No all-branch state claim.

## Audit disposition F01–F13

| Finding | Implementation and evidence |
|---|---|
| F01 field names | FormField/id/labels and required/error descriptions; interfaceNames/formField/form interaction tests |
| F02 unnamed close | IconButton/recipe DialogFrame named close; dialogLayers and runtime AX |
| F03 overlay isolation | Shared frame/stack/locks/visual viewport; layered cancel, deactivation and long-message regression |
| F04 responsive operation | Adaptive POS/cart, stock rows/details and catalog cards; five viewport captures |
| F05 reduced motion | CSS and receipt confetti opt-out; receiptMotion |
| F06 calendar contrast | Day contrast and mobile fit; pickerQuality/historyLayout and320calendar measurement |
| F07 shell tablet/mobile | Desktop sidebar, tablet rail, phone animated hamburger/drawer; adaptiveShell/mobileNavigation |
| F08 information density | Contextual details, filters, draft review and mobile receipt cards; domain interaction tests |
| F09 touch controls | Shared44px controls; calendar cells40×44 at320exception; precise chart hit geometry retained |
| F10 feedback | Live status/alert and bounded messages; feedbackAccessibility/settings tests; physical announcements unverified |
| F11 numerical/copy truth | Channel fees vs gross margin, missing vs zero price, backorder wording; catalog/reports/regression tests |
| F12 shared visual language | Button/IconButton/StatusBadge/fields/dialogs/tokens; DESIGN and sidecar extracted from source |
| F13 emoji layout | Responsive grid and named search; pickerQuality/interfaceNames |

## Surface inventory evidence

All36 original units source-reviewed; tests below exercise relevant states rather than certify every branch. Page evidence covers allfiveemulatedsizes. Popups use shared device constraints; some runtime states were inspected during implementation, final popup evidence explicitly listed. Physical-device and assistive-tech boundaries apply to every row.

| Original unit | Source / implementation | Automated evidence | Final runtime evidence |
|---|---|---|---|
| App.vue / app shell | Reviewed / implemented | adaptiveShell, finalReviewRegression | Shared shell in30pagecaptures |
| DashboardView | Reviewed / implemented | dashboard, dashboardDevicePresentation, reports | Page: five viewport captures |
| PosView | Reviewed / implemented | adaptivePosCatalog, adaptiveCart, checkoutInteraction, pos/checkout | Page: five viewport captures |
| MenuView | Reviewed / implemented | catalogPriceContext, catalogReadFlows, finalReviewRegression | Page: five viewport captures |
| AddonView | Reviewed / implemented | catalogPriceContext, catalogReadFlows, addons | Page: five viewport captures |
| StockView | Reviewed / implemented | adaptiveStockWorkspace, stockDetailPresentation, inventory, finalReviewRegression | Page: five viewport captures |
| SettingsView | Reviewed / implemented | settingsNavigation, settingsFormAccessibility, data/GAS mocks | Page: five viewport captures |
| HeaderBar | Reviewed / implemented | adaptiveShell | Shared shell in30pagecaptures |
| Sidebar | Reviewed / implemented | mobileNavigation, adaptiveShell, headerSizing | Shared shell in30pagecaptures |
| DashboardTrend | Reviewed / implemented | dashboardTrend, dashboardHover, chartTooltip | Source/tests; final dedicated device capture not claimed |
| DashboardBreakdown | Reviewed / implemented | chartSemantics, dashboardHover, chartTooltip | Source/tests; final dedicated device capture not claimed |
| ActivityLogModal | Reviewed / implemented | historyLayout, activityDates | Source/tests; final dedicated device capture not claimed |
| AddonEditModal | Reviewed / implemented | addonEditorInteraction, priceForms, interfaceNames | Source/tests; final dedicated device capture not claimed |
| ConfirmModal | Reviewed / implemented | dialogs, inventoryDangerFlows, finalReviewRegression | Final popup capture + AX |
| CustomOrderModal | Reviewed / implemented | posOverlayFlow, addons, interfaceNames | Source/tests; final dedicated device capture not claimed |
| EmojiPickerPopover | Reviewed / implemented | pickerQuality, interfaceNames | Source/tests; final dedicated device capture not claimed |
| LotDepletionModal | Reviewed / implemented | posOverlayFlow, inventory/recoveryEdges | Source/tests; final dedicated device capture not claimed |
| LowStockWarningModal | Reviewed / implemented | shortageReceipt, posOverlayFlow | Source/tests; final dedicated device capture not claimed |
| MaterialEditModal | Reviewed / implemented | stockFormInteraction, materialEditing, interfaceNames | Source/tests; final dedicated device capture not claimed |
| MenuEditModal | Reviewed / implemented | menuEditorInteraction, priceForms, interfaceNames | Source/tests; final dedicated device capture not claimed |
| ReceiptModal | Reviewed / implemented | receiptMotion, checkoutInteraction, shortageReceipt | Source/tests; final dedicated device capture not claimed |
| StockAdjustModal | Reviewed / implemented | stockFormInteraction, stockForms | Source/tests; final dedicated device capture not claimed |
| StockInModal | Reviewed / implemented | stockFormInteraction, stockForms | Final popup capture + AX |
| StocktakeModal | Reviewed / implemented | stocktakeLayout, stocktakeDraftInteraction | Source/tests; final dedicated device capture not claimed |
| WasteModal | Reviewed / implemented | stockFormInteraction | Source/tests; final dedicated device capture not claimed |
| AppSelect | Reviewed / implemented | appSelect, pickerQuality | Source/tests; final dedicated device capture not claimed |
| AppCheckbox | Reviewed / implemented | appCheckbox | Source/tests; final dedicated device capture not claimed |
| ChartTooltip | Reviewed / implemented | chartTooltip, dashboardHover | Source/tests; final dedicated device capture not claimed |
| DateRangeCalendar | Reviewed / implemented | pickerQuality, historyLayout | Source/tests; final dedicated device capture not claimed |
| FilterDropdown | Reviewed / implemented | filterDropdown, historyLayout, catalogPriceContext | Source/tests; final dedicated device capture not claimed |
| HistoryLogEntry | Reviewed / implemented | historyLayout | Source/tests; final dedicated device capture not claimed |
| ModalShell | Reviewed / implemented | dialogLayers, finalReviewRegression | Source/tests; final dedicated device capture not claimed |
| ToastContainer | Reviewed / implemented | feedbackAccessibility | Source/tests; final dedicated device capture not claimed |
| ToggleSwitch | Reviewed / implemented | appCheckbox | Source/tests; final dedicated device capture not claimed |
| Embedded BOM popup | Reviewed / implemented | catalogReadFlows, dialogLayers, finalReviewRegression | Final popup capture + AX |
| Embedded permanent-delete popup | Reviewed / implemented | inventoryDangerFlows, finalReviewRegression | Source/tests; final dedicated device capture not claimed |

## Review corrections

1. Cached page dialogs close on navigation/deactivation; inert and scroll locks release. Drafts remain separate.
2. Archived material edit/permanent-delete actions available in touch detail, with existing usage protection.
3. Missing storefront price and unavailable margin labelled explicitly; numeric0 preserved.
4. Confirmation messages scroll within shared viewport frame; cancel initial focus and footer remain reachable.
5. Essential stock units/equivalents/cost captions and sidebar status12px. Project stone400already#7D675B contrast5.17; review corrected its defaultTailwind assumption. Stock captions nowstone500.
6. Mobile receive action uses one-line “รับเข้า”, full “รับเข้าสต็อก” accessible name.
7. Surface brief records five implemented promises and absent formal FORMseed/QUALITYBARcard without fabricated approval.

## Not verified / manual follow-up

- Physical iPad Safari, touch and onscreen/hardware keyboard: open POS customization and long menu/stock forms, rotate, focus last field, verify reachable save/cancel and unchanged drafts.
- NVDA/VoiceOver: traverse fields/dialog layers/calendar and hear errors, toasts and chart alternatives.
- Actual200%/400% browser zoom: verify navigation, toolbar and dialog footer, not equivalent to viewport emulation.
-80mm paper printing: print receipt and verify widths, totals and no blank page.
- Separate six better-* domain skills were unavailable; better-interface combined review used source/AX/runtime evidence without separate-domain certification.
- No separate FORMseed or QUALITYBARcard was provided. Approved A and actual code govern implementation.

## Deferred minors

- Legitimately unlinked Add-on currently says “ไม่พบวัตถุดิบ”; future copy should distinguish “ไม่ตัดวัตถุดิบ” from broken references. No data or transaction impact; not folded into this bounded correction batch.

## Rulings made (complete ledger extraction)

- Ruling: Task headings normalized to Task N for shipped brief extractor — formatting only, no behavioral cost.
- Task 8 Ruling: POS menu names wrap fully instead of a hard two-line clamp — keeps long names readable before adding; cost is taller rare long-name cards. Description remains secondary.
- Task 9 Ruling: CartPanel composes CartBody and CartPaymentFooter — one mounted coordinator and one store, reusable body/footer without duplicated cart VM state; cost is three focused files instead of one large panel file.
- Task 9 Ruling: clearing cart now requires in-app confirmation — protects unsaved addons/notes; cost is one extra confirmation tap. Cancel retains the draft (RED to GREEN test).
- Task 12 Ruling: stock calls FilterDropdown with opt-in body teleport — page-level popup must stay outside inert app; existing history callers keep their placement. Tablet essential columns and mobile material list belong to Task13; toolbar page overflow0 verified at actual390px; requested320 override did not change actual viewport, defer320 confirmation to final QA.
- Task 13 Ruling: tablet uses essential material rows (name, stock, status, receive), desktop retains full table — detailed lots/cost moved to contextual panel; mobile sheet uses same store IDs and helpers. Cost if wrong: tablet users open detail for costs. Browser390 verified rows and quantity without horizontal table dependency.
- Task 15 Ruling: keep proven responsive stocktake worksheet rather than replace its counting VM — enlarge controls44px and phone count row; cost if wrong: separate worksheet styling remains. Draft review now named sheet with before/after and units; close never writes. Failed commit remains open; discard requires confirmation.
- Task 22 Ruling: retain exact chart mark/group hit areas per explicit user instruction; touch alternatives use44px chart-mode controls and native ranking buttons rather than expand invisible clickable plot — cost if wrong: dense individual marks require table mode. Existing14 tooltip/geometry/hover tests PASS including toggle/outside/scroll locks/loss geometry; native ranking pressed state added.
- Final: Ruling: keep backend/auth/security outside approved UI scope — business behavior and existing guard tests retained — cost if wrong: separate backend review needed.
- Final: Ruling: preserve stock allocation/accounting policies — UI renovation does not authorize new business rules — cost if wrong: policy correction needs separate product decision.
- Final: Ruling: do not claim physical device certification — browser sizes/DOM/tests cover responsive implementation, not Safari/keyboard/screenreader/zoom/printing — cost if wrong: device-specific issues may remain.
- Final: Ruling: recoverable archive after merge/deploy rather than raw worktree deletion — preserves snapshot and needed review evidence — cost if wrong: retained storage until user removes archive.

## Integration / deployment

- Main fast-forward merged from3e92fcc to **6c8bfefbf18b33be3665c543c4843ca518278ed4**; pushed `origin/main`.
- Merged main full suite250tests57filesPASS (24.16s); user skills-lock/skills/AI files untouched. Six colliding draft documents preserved under `.superpowers/pre-merge-docs-2026-10-11` before integration.
- [Build/deploy38118705196](https://github.com/armwoottipong/Greek_yokk/actions/runs/38118705196): completed/success, exact sourceSHA6c8bfef.
- Generatedgh-pages **0382192cc2e6eb97f8e59e4a8b43345fd6e10fad**, message records sourceSHA6c8bfef.
- [Pages38118758243](https://github.com/armwoottipong/Greek_yokk/actions/runs/38118758243): completed/success for generated commit0382192.
- [Live system](https://armwoottipong.github.io/Greek_yokk/): HTTP200; production HTML module `/Greek_yokk/assets/index-DIrnUzMh.js` matches generatedgh-pages index. CI Linux assethash differs from local Windows build; deployed source association verified through commit message and workflowSHA.
- Production read-only smoke: six routes at1280×720, correct headings, no horizontal page overflow; history/filter/calendar open and cancel/close restore page. Consoleerrors `[]`. Fresh production origin had empty data; populated checkout, stock and recipe branches are covered by isolated local demo/tests, not claimed as production transactions.
- Release report/evidence follow-up commit is documentation only with `[skip ci]`; deployed product source remains6c8bfef. No extra deploy or product re-test is needed for unchanged code.
- Managed implementation worktree archived recoverably after release; committed screenshots/ledger remain in main.

## Screenshots

Evidence in `.impeccable/review/`: five contact sheets,30pagePNGs, popupPNGs and capture metrics. Representative [desktop](../../../.impeccable/review/contact-desktop.jpg), [phone320](../../../.impeccable/review/contact-phone-320.jpg), [confirmation](../../../.impeccable/review/phone-320-confirm.png).
