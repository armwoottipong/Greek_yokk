# Mascot brand theme

User approved the burgundy-and-cream design and asked for the system's style to reflect the supplied mascot's identity. Scope is the existing interface's presentation, with the original image retained.

## Design

- Burgundy #780608, hover #580406, yogurt cream #FBF5EA, card cream #FFFCF6, beige border #E8DCCB, cocoa text #352522.
- Prompt for Thai UI and Plus Jakarta Sans for numbers and the compact wordmark.
- Original mascot image in a soft silhouette badge, cream wordmark on a burgundy brand header. Navigation uses softly asymmetric rounded ends; cards, dialogs and controls have distinct corner sizes.
- Quiet left-aligned data tables and forms. Semantic success, loss, warning and error colors retained. No decorative image over business data.
- Shared Tailwind palette and CSS variables theme all six views, forms, primary actions, dropdowns, filter popups and calendars. Small labels darkened for readable contrast. Mobile brand lockup and header fit narrow screens; menu/add-on search toolbars keep the category control visible.

## Verification

- Full suite: 23 files, 154 tests passed. ESLint and Vite production build passed.
- Independent read-only review found no Critical or Important issues. Minor hover feedback and an accidental unrelated heading class substitution were corrected.
- Browser inspected menu management, dashboard, POS and nested history/filter/dropdown layers using disposable demo data on localhost port 3016.
- Mobile widths 390px and 320px checked. At 320px category control ends at x298, dropdown ends at x241, within the viewport. Escape closes the dropdown while retaining its parent filter.
- Console checks captured no warnings/errors.
- Asset path uses Vite BASE_URL for /Greek_yokk/; favicon and browser theme color match the mascot branding.
- Primary cream/burgundy contrast measured by review at 11.2:1, muted text/card at 5.17:1.

Screenshots saved outside the repo: mascot-dashboard.jpg, mascot-menu.jpg, mascot-filter.jpg, mascot-pos.jpg, mascot-mobile-390.jpg and mascot-mobile-320.jpg. No business logic, persisted data formats or external sync behavior changed.
