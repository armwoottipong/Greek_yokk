# Menu platform overview documentation — 20 October 2026

This record documents the implemented menu comparison extension. It is a surface update within Greek Yogg's established Operate world. The current brief is ../../surfaces/menu-management.md; PRODUCT.md and DESIGN.md remain the durable product and visual authorities.

## System summary

1. Inherit the calm cream/burgundy shop workspace, Prompt Thai and established numeric presentation.
2. Open one menu into immediate all-platform financial comparison; keep the directory's selected-channel price.
3. Offer แท่ง / วงกลม / เส้น while retaining every platform's textual financials in every mode.
4. Use a 960px details sheet with two report columns from 768px and one column on phones.
5. Keep fee brown and darker secondary text scoped to the comparison, with existing semantic colors and no new motion.

## Implementation recorded

Reviewed sources: src/views/MenuView.vue and src/components/catalog/{MenuRecipeDetails,MenuPlatformOverview,PlatformFinanceDonut,PlatformFinanceLines}.vue. The details sheet receives the full platform collection and exposes no platform-selection event. Directory channel state still determines the single price on each menu row.

The initial bar mode uses a common monetary maximum for complete platform rows, so equal amounts have equal widths. Stacks show cost, GP and positive profit; a selling-price marker and explicit loss sentence explain an expenses stack that exceeds the selling price. Donuts compare composition within one platform. Positive/break-even composition divides by selling price; loss composition explicitly divides by total expenses (cost + GP), with loss kept separate. The shared line chart uses cost, GP and profit in platform order, a zero baseline, negative values, separate stroke patterns and gaps for unavailable values. Its numbered key carries full platform names rather than compressing names onto the axis.

All chart modes retain selling price, recipe/estimated cost, GP rate and amount, signed profit or loss, net revenue after GP and margin as text. Under-number shares divide by selling price; margin divides by net revenue after GP, and is unavailable for zero or missing net revenue. Missing/invalid data remain explicit, rather than being rendered as zero profit. If no platforms exist, the overview names the Settings next step.

The average/worst estimate control applies one shared cost assumption across every platform. Existing explanatory copy preserves equal-probability average assumptions, maximum free selections, repetition rules and exclusion of paid Add-ons. Recipe and packaging details remain below the financial overview. Shared dialog controls and close/edit actions remain in use.

## Visual scope and existing drift

The fee series brown (#A07847) and darker warm secondary text (#705C50) are component-local choices. Cost burgundy, profit green and loss red reuse existing semantic colors. The local 960px sheet, 768px report breakpoint, chart geometry and 44px chart controls are surface arrangements, not replacements for shared shell or dashboard tokens. No generated imagery or chart motion was introduced.

Global DESIGN.md and .impeccable/design.json were reviewed and left unchanged. No durable visual-system replacement was requested or found in this change. Existing compact secondary type and the range of local radii remain observed implementation details; advisory detector findings about small type/radius are not new global recommendations. Existing user-requested borderless/ringless treatments remain scoped to their established controls; this record does not promote them into a global no-focus-outline rule or certify unrelated implementation drift.

## Evidence and validation

Final three-mode screenshot set in this directory:

- bar-desktop.png, bar-mobile.png
- donut-desktop.png, donut-mobile.png
- line-desktop.png, line-mobile.png
- donut-320.png, donut-ipad.png, donut-edge.png
- line-320.png, line-ipad.png, line-edge.png

The edge captures include loss and unavailable-data presentations. Earlier desktop/mobile/ipad/edge/phone-320 *-first.png and *-final.png files predate the three-mode addition and are retained as historical captures, not final evidence for the three modes. The 14 October directory/editor screenshot and test history remains explicitly labeled in the surface brief.

Final verification was reported by the parent implementer: 94 test files / 573 tests passed, lint passed and production build passed, with no source edits after the final captures. The documenter inspected source and artifact inventory; it did not independently rerun the full checks. The detector was advisory (small type/radius) and reported no blockers. This record makes no deployment claim. Desktop viewport emulation does not establish physical Safari/iPad, screen-reader or physical-keyboard behavior.

## Documentation boundary

Only .impeccable/surfaces/menu-management.md and this documentation.md were edited by the documenter. The current brief supersedes only the historical menu-details presentation, while preserving prior directory/editor evidence. Product constraints, global design tokens and unrelated surfaces were not rewritten.
