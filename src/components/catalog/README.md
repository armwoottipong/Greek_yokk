# Catalog workspace

MenuView and AddonView compose the same presentation components:

- `CatalogWorkspace`: responsive layout, slots for header/browser/content and an exposed `element` for caller-owned focus restoration. It loads catalog layout/focus styles once.
- `CatalogHeader`: selected identity, metadata and add/edit/delete/back events. Delete confirmation belongs to the calling view.
- `CatalogBrowser`: controlled search (`v-model`), item selection, counts and empty-search actions. The view provides the filtered items.
- `CatalogEmptyState`: the first-item call to action.
- `AnalysisInfo`: accounting explanations; hover/focus/touch opening and dismissal, reset when entity identity changes.
- `MenuPlatformOverview`: shared per-platform financial presentation with chart adapters.

`catalogLabels.js` owns the existing Thai copy and entity-specific test hooks remain stable. Styles for the workspace are confined to its catalog class names in `catalogWorkspace.css`.

Views own store access, modal lifecycle, saved-ID selection, deletion confirmation, price eligibility and cost calculations. Menu and Add-on analysis display only configured prices greater than zero. The Add-on editor omits blank/unset prices while preserving explicitly entered zero prices in stored data; analysis still hides those zero-price platforms. Neither the layout nor the chart primitives interpret those business rules.
