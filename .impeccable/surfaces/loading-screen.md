# Greek Yogg. startup screen

Mode: Operate. Scope: opening or refreshing the existing shop app.

## Direction contract

THESIS: The user's smiling yogurt mascot welcomes the operator while the real initial page loads. A soft hop is the single memorable gesture.

OWN-WORLD: Burgundy #780608 behind the exact cream mascot; #FEFAF1 brand text, #F0D6CA status copy and #E8BEB0 waiting dots. Prompt follows the existing app typography, with system sans fallback before fonts arrive.

STORY: The operator sees that the shop is opening, then enters the selected page immediately when it is ready. Loading failures offer a reload action.

FIRST VIEWPORT: Centered mascot at a 320px maximum image width, the original cream Yoggie wordmark below, one line of Thai status and three small dots. The composition fits a 390px mobile viewport.

FORM: A full-screen welcome extends the existing identity. The user explicitly selected Artboard 1_2@3x; its silhouette and colors are preserved, and no alternate artwork is generated.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Asset provenance

Source: user-provided `Logo_branding/PNG/Artboard 1_2@3x.png`.
Shipping copy: `public/brand/loading-mascot.png`, byte-identical, with original transparency.
SHA-256: `FD228232EA4BA16DE2E60529F6E0A89F5E9903753E7DC7834FC0DED3F628255F`.
No raster edits, recoloring or replacement of the source logo.

Wordmark source: `Logo_branding/PNG/Artboard 1_3@3x.png`.
Shipping copy: `public/brand/loading-wordmark.png`, byte-identical.
SHA-256: `3CB5E73A0725EA379C7CCB8FF1233589E1F0908901D8AB4DFF7BD67385E0F5AE`.
The layout hides empty transparent artboard margins with CSS; the artwork itself remains intact.

## Review and verification

Desktop and 390×844 mobile renders show the selected asset against the brand background. Verified its successful load and the yogurt-hop animation. The reduced-motion media rule disables the mascot, shadow and dot animations.

The initial screen exists in HTML before JavaScript runs. After the initial Vue page resolves, it waits for document load, branding image decode, eager page image settlement and font readiness before releasing the app. Lazy offscreen images and failed optional photos do not hold the shop behind the screen. Required branding image failures offer recovery. The app remains inert while opening; resolving later pages cannot clear a dialog's inert state. Both entry-script download failures and initial-view failures offer recovery.

The development preview was generated from the actual index HTML with only the app-entry script omitted, inspected, and removed before deployment. No preview route ships. Existing DESIGN.md remains the authority; this surface extends its palette. Verdict: ready after lifecycle tests, app regression suite, lint and production build.

Verification: 70 test files, 437 tests passed. Lint and production build exited 0. The real development app removed the startup screen with document state complete, fonts loaded, eager page images loaded and keyboard focus restored to main-content.
