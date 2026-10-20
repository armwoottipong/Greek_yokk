# Add-on interface review — 20 October 2026

## Scope and coverage

Current Add-on directory, option groups, detail sheet and add/edit dialogs. Vue 3, Pinia, Tailwind 3 and component CSS; existing shared UI controls and cream/burgundy tokens. This is a surface review, not a branch or diff review. Source inspection covers empty, search-empty and validation paths. Local data, pricing, inventory and sync remain outside the proposed changes.

Conventions found: PRODUCT.md, DESIGN.md, GLOSSARY.md and .impeccable/surfaces/addon-management.md. No AGENTS.md, CLAUDE.md, CONTRIBUTING.md or CODING_STANDARDS.md was returned by repository file search. Previous captures exist; option-groups/groups-1280.png was inspected, but its freshness is not established and its right edge is cropped. It cannot establish current layout correctness.

| Domain | Evidence inspected | Result |
| --- | --- | --- |
| Accessibility | AddonGroupManager.vue form/save, AddonEditModal.vue, CatalogManagementRow.vue, AppInput.vue, main.css | 1 source-confirmed validation issue; focus suppression requires runtime verification |
| Layout | AddonView.vue, catalogManagement.css, group and row responsive CSS; previous group screenshot | No current rendering verdict; hierarchy recommendation below |
| Writing | Add-on empty/search states, delete confirmation, group helpers and save errors | No source-confirmed misleading labels; validation placement covered under Accessibility |
| Typography | AppInput.vue, management-row CSS, DESIGN.md | 1 source-confirmed phone input sizing issue; physical iOS behavior not verified |
| Colors | main.css tokens and group-row background | Muted #7D675B on #F4EBDD computes to 4.48:1; current rendered pair not verified |
| UI | Shared buttons, row/group styles, existing disclosure behavior | No source-confirmed actionable finding; live motion/touch states not verified |

## Findings

| Severity | Domain | Location | Before | After | Why |
| --- | --- | --- | --- | --- | --- |
| HIGH | Colors | src/assets/main.css:14, :16; src/components/catalog/AddonGroupManager.vue:84 | Muted text #7D675B on group fill #F4EBDD computes to 4.48:1 | Adjust a scoped secondary-text token and remeasure to at least 4.5:1 | The declared opaque body-text pair fails WCAG 1.4.3; computed browser colors remain Not verified |
| MEDIUM | Accessibility | src/components/catalog/AddonGroupManager.vue:11, :12, :27, :77 | One `error` string at the form bottom; inputs receive no field-specific error, aria-invalid or error association; save leaves focus unchanged | Reuse FormField error slots; associate messages through aria-describedby, mark invalid inputs, focus first invalid control; keep a summary for cross-field failures | Users must locate the problem in a long form; field-specific validation is not programmatically associated (WCAG 3.3.1 / 3.3.2) |
| MEDIUM | Typography | src/components/ui/AppInput.vue:20 | `.app-input input{font-size:.875rem}` applies to group name and number fields on phones | Scope 1rem input text to phone Add-on editors, preserving desktop density and existing Prompt font | Below the skill's 16px iOS input floor; physical Safari auto-zoom is not verified |

The shared CSS explicitly suppresses search and popup field focus (`src/assets/main.css:154–175, :182–188`). DESIGN.md records this as an earlier user preference. No current visible-focus claim is made without runtime inspection. A keyboard-visible alternative should be resolved during implementation without changing the resting filled-field style; absence confirmed at runtime would be HIGH under this review's trigger rules.

## Proposed redesign for approval

Keep the established brand and shared components. Make the directory the default working area. Separate reusable option groups into a clearly labeled secondary view with counts, so adding groups does not push the entire directory down. Keep search, selected price channel and the active view's add action together. Show name, selected-channel price, recipe counts and edit action in aligned desktop rows; use compact stacked rows on phones. Retain all prices and full recipes in details. Preserve draft values when switching presentation.

Group rows show pricing mode, selection limit, Add-on count and menu usage with full details available. Group editing follows the sequence name → selection rules → options/prices, with errors beside fields and reachable save/cancel. Empty states offer the matching add action; search-empty offers clear search. No new claims, stock calculations, prices or persistence changes.

Primary targets: AddonView.vue, AddonCard.vue, AddonGroupManager.vue and scoped Add-on styles. Shared component edits only where required for this flow. Verify desktop, iPad-sized and 320/390px layouts, keyboard flow, search, channel prices, empty states, invalid/save/discard/delete and existing regression coverage.

## Verification

- `npm test -- tests/ui/addonGroupsInteraction.test.js tests/ui/addonEditorInteraction.test.js tests/ui/addonRenovation.test.js`: PASS, 3 files / 19 tests.
- WCAG contrast computation from declared opaque tokens: #7D675B / #F4EBDD = 4.48:1; threshold 4.5:1.
- Browser attempts: localhost:5173 blocked by client; 127.0.0.1:5173 and :5174 connection refused by the browser environment. Current screenshots, computed styles, 320px/200% reflow, keyboard-visible focus, screen-reader behavior, Safari input zoom and live motion: **Not verified**.
- No application source changed. Redesign implementation awaits the required design approval.

## Verdict

Block — the declared group-text contrast pair fails 4.5:1, and two MEDIUM findings remain. This is a source-only verdict; current rendered accessibility, focus and responsive behavior remain Not verified.



## Implementation and final verification

The review above records the pre-change state. The user approved implementation and later explicitly requested no focus outline. The current Add-on surface follows that preference; programmatic invalid-field focus and error associations remain. This is not a claim of visible-keyboard-focus compliance.

Implemented directory-first navigation with a separate reusable-groups section; mounted search/channel state is retained. Group form errors identify name, minimum, maximum and missing options, with focus moved to the first failing control. Empty Add-on state now offers an add action. Phone Add-on fields use 16px. Secondary text uses scoped #705C50; group rows use the card surface. Existing pricing, inventory, storage and sync code were not changed.

Verification:
- Full suite before the final CSS-only no-outline adjustment: 94 files / 567 tests PASS.
- After that adjustment: 3 files / 21 focused tests PASS; npm run lint and npm run build PASS; git diff --check PASS (line-ending normalization warning only).
- Browser preview became accessible over the private LAN Vite URL. Synthetic data was supplied in memory by a temporary preview harness, not drawn from shop data.
- Inspected desktop 1440px, tablet 820px and phones 390px/320px. Directory document width equaled viewport at 320/390/820; 320px group dialog body client/scroll widths both 304px. Long names wrap and zero price stays zero. Actual physical devices, assistive technology, Safari and 200% zoom remain Not verified.
- Keyboard Tab/Shift+Tab: invalid name retains focus, reports aria-invalid=true and uses 16px; outlineStyle=none matches latest user direction.
- Fresh finish reviewer disposition: ship. No material source findings; a blank cached 320px image was replaced by directory-320-final.png, which was opened and verified.
- Evidence: .impeccable/review/addon-redesign-2026-10-20/; final no-outline screenshot form-no-outline-final.png. Documentation comparison: documentation.md in that folder. Global DESIGN.md and design.json retained; scoped surface brief updated.

Final verdict: implemented and reviewed within the evidence above. User-requested no-outline behavior is explicit; no whole-product accessibility certification is implied.
