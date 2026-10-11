# Remaining interface checks — implemented follow-up

Date: 2026-10-11. Baseline main `7b15220`; follows the [24-task renovation release](2026-10-11-system-interface-renovation.md). User authorized completing remaining work and installing missing skills. Existing mascot cream/burgundy world, sidebar #5E0205, desktop/iPad shop operation and phone quick management remain the direction.

## Scope and coverage

Repository interface review, not a guessed branch review: Vue 3, Pinia, Tailwind, shared CSS tokens/components. PRODUCT.md, DESIGN.md, sidecar and approved surface brief govern conventions. Original 36-unit source inventory, prior 30 page captures, relevant automated states, six live routes and the menu editing/route-from-popup flow provide evidence. This follow-up closes the explicitly deferred Add-on copy and missing owning-skill coverage, then corrects evidenced shared interface failures. It does not certify every branch of every popup or physical devices.

All six missing owners were installed globally under `C:/Users/user/.codex/skills/` from the existing better-interface author's `jakubkrehel/skills`, pinned commit `c0588bb6d654eb725046f0bf9deec338c34891ab`: better-accessibility, better-layout, better-writing, better-typography, better-colors, better-ui. Their SKILL.md files and relevant references were loaded in owner order; no third-party skills were added to deployed product code. New skill catalog entries become available on the next app turn/session; their installed files were read directly for this review.

| Domain | Evidence inspected | Result |
|---|---|---|
| Accessibility | App/main skip path; form field names and inline errors; ToastContainer; overlay focus; shared controls; interfaceNames/dialogLayers/remainingInterfaceChecks and live AX/focus | Four findings resolved; physical announcements and native zoom Not verified |
| Layout | Six routes at six viewport sizes; menu/Add-on editor price grid; adaptive shell/cart/catalog/stock/dialog tests; desktop/iPad/320 popup captures | One clipping finding resolved; 36 route/viewport measurements have no horizontal page overflow |
| Writing | Add-on material reference states; editor errors; existing missing/zero-price and reports wording; catalogReadFlows/catalogPriceContext | One misleading state resolved |
| Typography | Computed compact input font sizes; full platform names, native text/number controls; existing Thai/number type hierarchy | One compact field-size finding resolved; real iOS keyboard behavior Not verified |
| Colors | Computed cream/soft field surfaces, focus/control borders and enabled delete icons; shared AppSelect/AppCheckbox | One systemic contrast finding resolved; mascot palette preserved |
| UI | Existing motion opt-out, shared components/44px controls, toast timer/cleanup/dismissal, fresh shipped finish review | One toast transition finding resolved; no additional motion introduced |

## Consolidated findings, now fixed

One root cause per row, ranked by original severity/reach. Before values describe inspected baseline behavior; After values are current source, not proposed work.

| Severity | Domain | Location | Before | After | Why |
|---|---|---|---|---|---|
| HIGH | Colors | `src/assets/main.css:18,42,90,151`; `src/components/ui/AppSelect.vue:107`; `src/components/ui/AppCheckbox.vue:24`; menu/addon/settings delete icons | Pale focus #E8BEB0 on cream 1.65:1; decorative borders and enabled stone300 action icons lacked control contrast | Brand #780608 focus 11.22:1 on cream; reusable #9A8374 boundary 3.49:1 on cream/3.03:1 on soft; enabled icon #735A4E 6.21:1 on cream | Owning contrast/control distinction rules: focus, checkbox state and action affordances must be visible. One shared root cause rather than leaf duplicates |
| HIGH | Layout | `src/components/modals/MenuEditModal.vue:85`; `AddonEditModal.vue:61`; `src/assets/interface.css:24` | Platform labels stripped parenthetical text and truncated in narrow capsules; desktop four-column grid also too dense | Full names wrap in shared price grid: two columns desktop/iPad, one on phone, minimum 44px row | Full values could not be read at 320px; screenshot and label scrollWidth measurements confirmed clipping |
| HIGH | Accessibility | `src/components/ui/ToastContainer.vue:3,38,46`; `src/stores/posStore.js` showToast/dismissToast | Error disappeared after 3.5s; no explicit dismiss; newly inserted status regions; repeated old messages when list changed | Errors persist with named dismiss; stable polite region announces only new non-error messages; low-stakes 5s timer pauses until BOTH hover and focus end | Timed critical feedback can be lost; stable announcements and independent attention protect keyboard/screenreader flow. Regression observes both event orders |
| MEDIUM | Accessibility | `src/App.vue:3,83`; `src/composables/overlayState.js:2` | No skip link/route title or main focus context; initial correction skipped focus when popup was still inert | Skip link, meaningful route title, main tabindex; pending route focus waits for overlay release without overriding ordinary opener restoration | Repeated navigation requires clear keyboard context; actual route-from-popup reproduction and regression prove release/focus ordering |
| MEDIUM | Accessibility | `src/components/modals/MenuEditModal.vue:492`; `AddonEditModal.vue:219` | Required-name failure left focus on Save and duplicated inline error with toast | Inline labelled error retained; nextTick focuses exact required-name field | Recovery should lead directly to the correction, using existing native field/error relationship |
| MEDIUM | Accessibility | `src/App.vue:2`; `index.html:7` | Fixed h-screen/w-screen lacked dynamic viewport/safe-area fit | h-dvh/w-full and viewport-fit=cover | Adaptive shell can follow available browser height. Real Safari keyboard/rotation still requires device testing |
| MEDIUM | Typography | `src/assets/main.css:149` | Editable compact native fields rendered at 14px or smaller | Text/number/textarea/select 1rem (16px) at <=1199px; checkbox/radio excluded | Readability/native compact-device form guidance; computed size checked at 320px. Do not claim verified Safari auto-zoom behavior |
| MEDIUM | Writing | `src/views/AddonView.vue:5,51` | Intentionally unlinked Add-on said missing material and displayed meaningless consumption amount | “ไม่ตัดวัตถุดิบ” without quantity; broken reference separately names edit/rebind recovery | Valid no-consumption state must differ from corrupted reference; no data/calculation change |
| LOW | UI | `src/components/ui/ToastContainer.vue:61` | transition:all on toast enter/leave | Explicit opacity/transform only; existing reduced-motion guard retained | Avoid unintended animated properties; no need for a new motion system |

## Verification

Passed after final behavior corrections:

- `npm test`: **260 tests, 58 files PASS**, 25.25s. Baseline was 250/57. New remainingInterfaceChecks covers 10 cases. Five original regressions were observed failing before initial implementation; later combined attention (two orders), announcement and route-from-closing-popup regressions were observed RED then GREEN. The additional standalone focus pause test is coverage, not claimed as a separate RED cycle.
- `npm run lint`: PASS. `npm run build`: PASS, 1690 modules, main JS 412.07kB / 118.83kB gzip. `git diff --check`: PASS.
- Browser-only local demo origin `127.0.0.1:3031`: six routes × 320×844, 390×844, 834×1194, 1194×834, 1280×720, 640×720 = 36 measurements; correct titles, main focus, no horizontal page overflow. 640/320 are reflow emulations, NOT actual browser zoom.
- Three final valid menu editor captures: desktop, iPad portrait, phone320 required-name recovery. Full platform names visible; field computed font16px on phone; enabled delete computed color #735A4E; focus/Escape reviewed.
- Live header More → settings action: popup closes, app inert=false, dialogs=0, body overflow unlocked, activeElement=`main-content`. Evidence `popup-route-focus.json`. Console error list `[]`.
- Existing chart geometry/toggle/scroll locks, stocktake drafts, checkout/inventory formulas, GAS mock recovery and data schema suites continue passing. No real shop checkout or Google Sheets write was used.

Evidence: `.impeccable/review/remaining/responsive-metrics.json`, `popup-route-focus.json`, `desktop-menu-editor.png`, `ipad-menu-editor.png`, `phone-320-menu-error.png`. Earlier page/popup evidence remains in the prior release report.

Not verified; specific external gates remain:

- Physical iPad Safari, touch, hardware/onscreen keyboard and rotation with long forms: no physical device/session available.
- NVDA/VoiceOver announcements and actual 200%/400% browser zoom: assistive tools unavailable, native app control disabled; attempted zoom did not change viewport/scale and is not counted as proof.
- Real 80mm paper receipt: this machine exposes virtual printers only. Existing print CSS/source/tests inspected; no physical paper output claimed.
- Formal FORMseed/QUALITYBARcard absent in incumbent approved brief; not invented as evidence.

## Verdict

**Approve for the six inspected domains and stated evidence boundary:** all nine actionable findings corrected; no HIGH finding remains in that reviewed scope. Physical-device/assistive/native-zoom/paper gates remain Not verified, not silently converted into completed tasks.

Fresh shipped code reviewer found no Critical issues; two Important cases (combined toast attention and route focus after a closing overlay) plus one minor repeat-announcement case were all corrected and covered RED→GREEN. Fresh shipped Impeccable finish reviewer confirms its two material fixes resolved, preserves the same three valid captures and returns **ship for the scored fixes only**. Fresh shipped documenter reconciled DESIGN.md/sidecar with source tokens, focus, compact native field size, price grid and toast behavior; parent inspected its diff/JSON. No extra open-ended polish pass or physical certification is implied.

## Integration and deployment

Pending exact source revision and build/Pages proof; populate after release. User authorization to merge/push main and deploy persists.
