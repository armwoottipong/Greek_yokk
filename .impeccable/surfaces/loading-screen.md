# Greek Yogg. startup screen

Mode: Operate. Scope: opening or refreshing the existing shop app.

## Direction contract

THESIS: The user's smiling yogurt mascot welcomes the operator while the real initial page loads. A soft hop is the single memorable gesture.

OWN-WORLD: Burgundy #780608 behind the exact cream mascot; #FEFAF1 brand text, #F0D6CA status copy and #E8BEB0 waiting dots. Prompt follows the existing app typography, with system sans fallback before fonts arrive.

STORY: The operator sees the mascot while the shop opens. At the user's request, the screen stays for at least three seconds from its first display, then releases the selected page as soon as its resources are ready. Loading failures offer a reload action.

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

Verification: 70 test files, 440 tests passed. Lint and production build exited 0. The real development app removed the startup screen with document state complete, fonts loaded, eager page images loaded and keyboard focus restored to main-content. The three-second update was observed still visible at 493ms after reload and gone at 3197ms; controlled timer tests verify the exact minimum, elapsed-time accounting and continued waiting for slow assets.

## Loading within main-content

Page switches show the same mascot and original wordmark inside main-content for at least three seconds, including cached pages. Header and navigation remain available. The covered page is inert and hidden from assistive technology; main exposes its busy state. Initial app opening continues to use the full-screen startup.

The selected page module and its eager images/fonts must be ready before the content cover disappears. A navigation version prevents an older request from dismissing a newer page's loader. Cached view instances remain in KeepAlive. Failed navigation offers a reload button and clears the busy announcement state.

Verified desktop bounds exactly match main-content (x256/y80, 1024×640) and inspected the 390×844 mobile layout beneath the header. Navigation and cached-page tests were RED then GREEN; full suite passed 71 files / 442 tests, lint and build exited 0. No shop data was changed.
