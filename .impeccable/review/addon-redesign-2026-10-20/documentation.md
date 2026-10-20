# Add-on redesign documentation review — 20 October 2026

Disposition: surface brief refreshed. Global `DESIGN.md`, `.impeccable/design.json` and `PRODUCT.md` remain unchanged. The redesign extends the incumbent shop workspace and establishes no durable cross-product visual-system change.

## Sources compared

Read `.agents/skills/impeccable/reference/document.md`, `PRODUCT.md`, `DESIGN.md`, `.impeccable/design.json` and the prior `.impeccable/surfaces/addon-management.md`. Inspected the current `src/views/AddonView.vue`, `src/components/catalog/AddonGroupManager.vue` and `src/components/modals/AddonEditModal.vue`, plus the Add-on row adapter. Documentation writes are limited to the surface brief and this report.

## Five-line system summary

1. World: the incumbent calm shop workspace, with its smiling cream mascot and burgundy identity.
2. Typography: existing Thai-first Prompt hierarchy; phone native inputs retain readable 16px text.
3. Surfaces: existing warm cream fills, familiar rounded controls and shared bounded dialogs.
4. Interaction: directory-first section buttons, retained search/channel state and field-associated validation with first-invalid focus.
5. Local exceptions: secondary copy (#705C50) and the user's no-outline focus override belong to Add-on management, not global tokens.

## Source-to-brief alignment

The brief now records the approved THESIS / OWN-WORLD / STORY / FIRST VIEWPORT / FORM contract. `AddonView` initializes the directory, keeps both sections mounted with `v-show`, uses named pressed-state buttons and owns a display channel separate from checkout. Its directory retains recipe summaries, selected-channel prices and details/edit access to every channel price. The group manager adds usage context and field-associated name/minimum/maximum/options errors, then directs focus in that order. The existing Add-on editor preserves recipe validation, disclosure reveal and save/discard behavior.

The source-local secondary color and 16px phone-input treatment are recorded precisely. The latest explicit user override removes focus-visible outline and box-shadow within the Add-on workspace and editor-content scopes. This is described as a scoped user choice; the report does not claim a replacement visible focus indicator or accessibility certification.

## Drift not canonized

Global documentation describes burgundy focus outlines on shared buttons and ordinary fields, with existing filled-popup/search exceptions. The scoped Add-on override has narrower authority and is recorded in the surface brief rather than rewriting that shared rule. The local secondary color does not replace the global muted token. Directory-first composition does not become a global navigation mandate. No unrelated token, typography, component or historical system drift is adopted or repaired by this documentation pass.

The document reference's global extraction/confirmation workflow would apply to a global design-system refresh. This task explicitly authorizes a source-local surface refresh and preserves the incumbent identity, so no global overwrite, new qualitative workshop or sidecar regeneration is warranted.

## Evidence and verification boundaries

Current captures are in this folder: `desktop.png`, `mobile.png`, `ipad.png`, `groups-mobile.png`, `group-error-mobile.png` and `group-error-320.png`. Capture presence was checked; this documentation pass compares source and approved direction rather than issuing visual ship certification. The parent implementation run reported 94 files / 567 tests plus lint/build passing before the final CSS-only no-outline override; final validation is owned by the implementation review and is not claimed here.

The prior surface brief's 14 October capture inventory, 77-file / 469-test result, no-overflow measurements and synthetic save evidence are preserved under an explicit historical heading. Neither those results nor desktop viewport captures certify physical iPad/Safari, screen-reader or physical keyboard behavior for the current redesign.
