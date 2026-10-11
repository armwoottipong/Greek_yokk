# System interface — confirmed A

Mode: Operate. Targets: src/App.vue; src/views/*.vue; src/components/**/*.vue.
Authority: PRODUCT.md, DESIGN.md, docs/superpowers/specs/2026-10-11-system-interface-design.md.
Build path: code-first app screens.

POS: catalog and one shared cart; adaptive review sheet when the container cannot split. CustomOrder, shortage and lot decisions preserve their layered flow. Subtotal is payment; GP/COGS are secondary details.

Stock: essential quantity/status/actions first, contextual lot details; source of truth is store helpers. Draft review never commits on close/filter/resize. Purchase, production, count, waste and deletion retain existing intent/confirmation.

Menu/Add-on: shared search/category/display-platform filters, independent of the POS platform. Desktop tables; compact touch lists and explicit details. Recipe read view and editors use the common dialog/field pattern.

Dashboard: preserve four report views, Bangkok ranges and recorded financial snapshots. Make bill list and graphs usable on touch/keyboard; preserve exact tooltip toggle, arrow, highlight and dimming behavior.

Settings: preserve the existing category structure; fix edit-field labels, connection feedback and confirmation consistency. Saved URL is not a successful sync.

States: default, empty, no-results, dirty, loading, error, success, disabled and long content where real. Physical iPad/Safari/keyboard/zoom remain explicit manual QA gates.

Anti-goals: no backend changes, new auth, new payment processor, new report formulas, schema migration or data writes to the real shop during verification.
