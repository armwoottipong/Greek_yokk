# Global mascot checkbox

- Shared `AppCheckbox` uses cream surfaces, rounded beige borders and burgundy checked states. Its switch variant supplies the same palette to existing `ToggleSwitch` consumers.
- Migrated inventory archive filter, stocktake difference filter, material recipe switch and both menu settings switches. Native checkbox markup lives only in the shared component.
- Preserved native Boolean/Array v-model, typed values, label clicks, change events, disabled state, Space keyboard control and switch semantics. Added focus indication, coarse-pointer target size, reduced-motion and forced-color support.
- TDD: three contract tests failed before implementation and pass afterward; disabled, model updates, label activation and numeric array values covered.
- Full validation: 26 test files / 161 tests pass; ESLint and production build pass.
- Browser: stocktake filter responds to Space and keeps counts; menu switch responds to Space and retains focus. Console has no warnings/errors.
- At 320px, stocktake checkbox remains within the panel. Material header now places its switch below the title; close button remains right aligned with or without the switch.
- Read-only review found no blockers. Its responsive header concern was checked in-browser and corrected.
- Evidence saved outside the repository: global-checkbox-stocktake.jpg, global-checkbox-switches.jpg, global-checkbox-mobile.jpg.
