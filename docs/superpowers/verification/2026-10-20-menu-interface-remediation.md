# Menu interface remediation — source candidate verification

20 October 2026. Workspace: C:/Users/user/.codex/worktrees/menu-interface-layout/Greek_yogg. Baseline: a5e1c83; core remediation code: 9ba1874. Candidate only: not merged, pushed or deployed. D:/Greek_yogg was not edited by this documentation pass.

References: [approved plan](../plans/2026-10-20-menu-interface-layout.md), [source/DOM audit](../../ui-audit/2026-10-20-menu-interface-review.md), [surface brief](../../../.impeccable/surfaces/menu-management.md). PRODUCT.md and the impeccable document reference were reviewed alongside the source diff. DESIGN.md and .impeccable/design.json remain unchanged global authorities.

## Five-line system summary

1. Keep cream/burgundy, Prompt and the approved shop-dashboard reference; retain the original add/edit popup.
2. Distinguish unknown cost from true zero, gate displayed estimates consistently, and keep unpriced platforms hidden.
3. Select the successfully saved new ID, clear only a hiding search and enter recipe editing in the same popup.
4. Propose local fill/underline/label/search-icon keyboard cues without outline/ring/halo, plus declared contrast and pointer-specific hover guards.
5. Size list/recipe/analysis from available space and strengthen amount hierarchy as source candidates pending rendered checks.

## Behavior and source evidence

MenuView now supplies number-or-null recipe row costs; MenuRecipePanel names unknown costs rather than formatting them as zero. A display-only estimate gate sets base/average/worst costs to null when an included row is unknown, so detail profit/charts agree with the rail. Known zero remains monetary zero. Excluded packaging does not invalidate financials. The domain estimator, GP math, stock, checkout and storage/sync contracts are not changed.

MenuEditModal records successful savedMenuId; MenuView checks it against the new-menu session and stored IDs, selects the created menu, clears search only if needed to show it, then requests heading focus after the overlay stack empties. Regression cases cover cancel/failure, unrelated added IDs and existing edits. Recipe actions pass initialSection=recipe to the original popup; its disclosure opens and its first usable button is the entry target, including empty-recipe add. Normal edit/validation keep name entry. Removing the redundant description aria-label restores the visible “คำอธิบายสั้น” label as the accessible name.

Only configured positive-price platform rows continue to supply bar, donut, line and line key. No-price empty state directs editing; mode controls, legend and financial guidance are omitted in that state. Existing loss/invalid-GP/unavailable-cost text remains.

## Visual source candidates

menuFocus.css scopes feedback to the workbench and menu popup: burgundy fill/cream text, underline, focused field/checkbox labels and a filled search-icon cue, with a separate selected-mode marker. Forced-colors uses system Highlight/HighlightText. Outlines/focus shadows remain suppressed; these rules do not certify actual visible focus or keyboard usability.

Local muted #705C50 against declared soft #F4EBDD is 5.3285:1 by sRGB contrast calculation. This is declared-pair evidence only; no browser computed styles were sampled. Shared Button, AppSelect, AppCheckbox and MenuPriceInfo hover-only rules are guarded by (hover:hover), preserving persistent state rules. Caller smoke/physical-touch acceptance remains pending.

Candidate layout: list 208px default, 192px through viewport 1199px, 224px from 1800px; 24px/16px gutters. Recipe is 288px at menu-content >=840px. Reports default to one column and become two at actual menu-analysis >=728px. Phone switching remains below 768px. Price is 18px, supporting amounts 16px and profit/loss 20px (18px phone); supporting financial text is 12px. Recipe costs use Thai grouped two-decimal formatting. Popup pricing stacks at editor inner width <=399px. No shared global token, palette, font, shell or design-system migration is introduced; these values are not canonized as global rules.

## Verification status and limits

| Area | Status |
| --- | --- |
| Tasks 1–3 behavior code | Complete; regression sources inspected |
| Reviewer Important unknown estimate mismatch | Fixed with two observed RED-to-GREEN regressions plus an excluded-packaging control; no other source findings, deferred minors or declined behaviors reported |
| Tasks 4–7 focus, contrast, hover, layout and hierarchy | Source candidates; rendered acceptance pending |
| Final full suite | Implementer-reported PASS: 96 files / 601 tests at code commit 9ba1874 |
| Lint / production build / diff-check | Implementer-reported PASS for each |
| Rendered/browser acceptance | NOT VERIFIED |
| Merge / push / deployment | Not performed |

Browser tools still report access disabled despite the user enabling it, a fresh session reset and an attempted createTab. This prevents current screenshots, computed-style checks, viewport/overflow measurements, keyboard walkthrough, forced-colors/reduced-motion rendering and 320px/200% zoom acceptance. Physical iPad/Safari, soft keyboard, touch and assistive-technology results remain unverified. Historical images do not establish this candidate's appearance.

Final source checks are also recorded in the appended Execution status of the approved plan. A shared CSS import build issue was fixed by using a normal JavaScript import rather than Vue style-src. The local demo preview on port 5186 returned HTTP 200 for HTML/modules; availability is not rendered verification. The documenter did not rerun source tests or claim browser acceptance. Task 8 remains incomplete while rendered acceptance is pending; the branch is retained without merge, push or deployment.

Only .impeccable/surfaces/menu-management.md and this verification record were written by the documenter, in this worktree. Historical surface records were preserved.

## Follow-up: active menu header panel

The user annotated the existing preview with a red rectangle and requested one header panel for active identity/details and add/edit actions, with delete under More. MenuView now uses a single cream header; removes the redundant page-heading and detached selected-heading rows; keeps original modal actions. Native details/summary provides the More disclosure with an accessible name, one destructive action, Escape/return focus, outside-pointer/focus-departure close, and selection/deactivation close. Delete still captures the selected menu and confirms before mutation. Mobile back action lives in the header; search/list and charts/recipe remain below it. New header regressions passed 6 tests before the full follow-up suite. Browser tool still reports disabled; the supplied user screenshot is the before-reference, not a capture of the new header.

Follow-up checks: 97 test files / 607 tests PASS, lint PASS, production build PASS, diff-check PASS. Narrow independent source review found no material issue or declined behavior. Rendered/viewport/keyboard acceptance remains unverified; this is still a preview candidate and has not been deployed.

## Production release decision — 20 October 2026

The user explicitly requested deploying all work to production and clearing Git after reviewing the preview/header iteration. This supersedes the earlier hold on merge/push/deployment. The source/DOM checks above remain evidence for the candidate; rendered/device/zoom/keyboard acceptance is still NOT VERIFIED, and this release decision does not convert it into a visual pass. The release procedure rechecks the merged main tree, pushes main, waits for the Pages workflow, and independently matches live version.json and its entry asset to the release commit. Local untracked review artifacts and preview/execution records are preserved outside the repository before task worktree cleanup.
