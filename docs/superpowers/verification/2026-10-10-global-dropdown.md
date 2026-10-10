# Global dropdown verification

Scope: replace all 14 native select usages with shared AppSelect. User requested dropdown-only styling globally and previously authorized merging and pushing main for deployment.

Design: white menus, muted borders, soft shadows, rounded options, green active/selected states and a check mark. Existing typography and surrounding page layouts retained. Group headings and scrollable menus support long material lists. Menus teleport to body to avoid clipping by parent popups and reposition within viewport bounds.

Compatibility: original option/optgroup slots and native Vue select model preserve numeric values and change events. Supports arrows, Home/End, Enter, Escape, Tab cancellation, typeahead, disabled options/groups and outside interaction. One dropdown opens at a time. Dynamic labels and forwarded accessibility labels update.

Validation on final source:
- npm test: 23 files, 154 tests passed.
- npm run lint: passed.
- npm run build: passed.
- git diff --check: passed.
- Read-only independent review: no blocking findings. Minor Home/End behavior while closed opens first; subsequent key moves to the boundary.
- Browser: category typeahead selected Signatures and showed two matching menu rows. Grouped stock material dropdown selected Fresh Milk and changed the receiving form correctly without saving a stock transaction.
- Browser: activity dropdown inside filter popup selects and applies an activity type; Escape closes the dropdown while retaining the parent filter.
- Browser: 320px frame showed the dropdown within viewport (left 21px, right 241px). Screenshot saved outside repository.
- Browser console: no warnings/errors captured during checked interactions.

Screenshots: global-dropdown-filter.jpg and global-dropdown-320.jpg in the task visualization directory. Disposable demo data used only on local port 3015.
