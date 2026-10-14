# Stock receipt and production dialogs

Mode: Operate. Inherited cream/burgundy brand; code-led reconstruction of StockInModal only. Preserve conversions, ingredient depletion, dates, costs, draft staging and discard protection. Shared AppInput/AppSelect/Button/IconButton remain authoritative.

## Direction contract

THESIS: A compact working form that follows material → amount/cost → lot dates/note, replacing the long sequence of loosely spaced blocks.

OWN-WORLD: Prompt, warm filled controls, cream ground, burgundy quantity/primary actions, quiet dividers. No token or identity replacement.

STORY: Choose the exact material, inspect the quantity and financial/recipe consequence, identify the incoming lot, then stage it for existing stock review.

FIRST VIEWPORT: A bounded 680px dialog, compact material heading/history action, full-width selector, paired amount/cost on purchases, quantity plus ingredient ledger on production. Equal date fields and an inline expiry clear action precede the optional note. Footer remains reachable. Phone grids stack with 48px input targets and wrapping data.

FORM: Protected operational form; inherited-world extension, no concept seed or comp round. A single compact recipe ledger gives consequences prominence without repeated cards.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Built evidence — 14 October 2026

Completed bounded finish review: review/receipt-renovation-finish-review.md records disposition: ship for the scored empty-expiry-affix correction, with no visible fix-batch regressions in the six final captures. That source/capture verdict does not expand the viewport or physical-device evidence boundary below.

Source checked: src/components/modals/StockInModal.vue, src/components/inventory/stockReceipt.css and src/components/ui/DialogFrame.vue. StockIn implements the 680px compact frame with 16px header/body/footer padding,12px header bottom,8px body top and retained safe-area footer bottom. Its form uses 16px group gaps, a full-width material selector/history action, paired purchase quantity/cost and a shared total row. At 600px and above, production quantity sits alongside one ingredient ledger with stock consequences and total/unit cost; below 600px that ledger follows quantity. Shared controls remain in use. Equal date columns use 12px gaps, expiry clear sits inside the input suffix, automatic expiry sits below, and lot hint/note finish the form. At 480px and below, purchase/date grids and ingredient name/amount rows stack. Coarse-pointer actions receive 44px targets.

Visually inspected six captures: review/receipt-renovation-purchase-pc.jpg and review/receipt-renovation-production-pc.jpg (1280×720); review/receipt-renovation-purchase-tablet.jpg and review/receipt-renovation-production-tablet.jpg (820×1180); review/receipt-renovation-purchase-mobile.jpg and review/receipt-renovation-production-mobile.jpg (390×844). Desktop/tablet show the paired purchase fields and side-by-side production consequence layout. Phones show the stacked form, bounded body scrolling and reachable footer; lower fields require scrolling. The desktop production note also sits partly below the initial body viewport. Parent-reported phone form clientWidth and scrollWidth both equal 336px; the documenter did not rerun this measurement. The captures show empty expiry fields, so the conditional inline clear is evidenced by source rather than these raster states.

Read review/receipt-renovation-layout-scan.json once: its finding array is empty. Parent-reported verification: 80 test files / 475 tests passed before the final suffix correction; after it, three stockSharedInputs tests including the conditional-affix regression, lint and production build passed. The post-correction full suite is pending at this documentation boundary. All six captures were refreshed against the final source and visually re-inspected; parent-reported phone native date inputs both have left36px and width312px. Business script remains unchanged aside from imports according to the implementation packet; source retains conversions, depletion warnings, date validation, draft staging and discard protection. This documentation pass does not independently rerun application checks or inventory operations.

The system comparison is recorded in review/receipt-renovation-documentation-review.md. Primitive tokens, the existing .impeccable/design.json and unrelated DESIGN.md sections remain unchanged. The finish reviewer records its verdict separately; no verdict is inferred here. Physical iPad/Safari, real touch/keyboard, screen readers, 200% zoom and on-screen-keyboard behavior remain unverified by these viewport captures. Earlier production alignment captures in stock-management.md are historical; their below-input expiry clear placement is superseded by this inline clear. The final source correction makes the suffix slot conditional on a populated expiry, removing the empty affix gap while retaining the clear action.

Final parent verification after the conditional-affix correction:80 files/476 tests passed, lint and production build passed. Reviewer scored its sole empty-affix fix resolved (ship); documenter compared the final six captures and preserved primitive tokens/sidecar.

Balanced columns refinement: purchase amount/cost and desktop production quantity/recipe now use equal columns with12px gaps matching the date grid. Browser measurement at1280px: purchase halves and both date fields318px, left edges316/646; production halves and dates315px, left edges316/643 (bounded body scrollbar). Build passed; capture receipt-balanced-columns.jpg.
