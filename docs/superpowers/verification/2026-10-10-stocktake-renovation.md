# Stocktake Sheet renovation

User requested a convenient, clean renovation of the existing closing stocktake popup. Existing authorization covers UX redesign and pushing main for deployment.

Design: burgundy/cream theme, four desktop columns, count inputs emphasized, cost impact below variance, restrained category/search controls, fixed draft summary/footer. Mobile rows become labelled cards with no horizontal scrolling. The header explains the task; the footer makes draft staging explicit.

Added conveniences:
- Search and shared AppSelect category filter plus an only-differences toggle.
- Explicit base/pack choices preserve canonical quantities, including repeated selection of the same unit.
- Enter advances to the next visible numeric input.
- Row-level and all-row reset remain available with clear labels.
- Focused rows stay mounted while typing through the system quantity; filtering applies after leaving the input.

Preserved stock initialization, quantity conversion and precision helpers, variance/cost arithmetic, failed-transaction handling and draft staging. Filtering never limits which changed materials are staged.

Validation: 25 test files / 158 tests passed; ESLint, Vite build and git diff --check passed. New tests observed RED then GREEN for filtering/staging, keyboard/unit behavior and focused-row retention. Independent review identified the focused-row edge case; it was reproduced, fixed and re-reviewed with no remaining important findings.

Browser checks used disposable demo data only on local port 3017. Enter moved focus to the next field; 14,400 ml became 12 bottles without changing base quantity. Variance summary correctly showed two differences totaling -89.25 baht. Desktop and 390px/320px layouts inspected. At 320px, body clientWidth and scrollWidth were both 296px. No warnings/errors captured. No shop data or external sync was changed.

Screenshots saved outside the repo: stocktake-renovation-desktop.jpg, stocktake-mobile-390.jpg and stocktake-mobile-320.jpg.
