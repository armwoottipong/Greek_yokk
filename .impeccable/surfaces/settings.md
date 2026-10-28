# Settings — people and shop status first

Mode: Operate. Settings-only composition update within the existing Yoggie cream and burgundy system. Keep all current settings capabilities and their behavior.

## Surface contract

- Lead with a concise Thai settings heading and a truthful shop connection/status strip. In Firebase mode, show the users category first and selected; make the status destination explicit. Local mode retains its local-data label and local settings.
- Fill the available cloud-main width like sibling views, without a centered max-width cap. Desktop uses a category rail beside one task panel. At phone widths, replace the rail with a labeled native category selector; let the content scroll naturally without horizontal page overflow.
- Use a single-email add form and per-row remove controls; stage changes in the list and save explicitly. Keep the current account protected. Show the active account, saved addresses, and the 50-account limit. Preserve unsaved email and GP drafts when switching categories; disclose stale server data and conflicts, and offer an explicit reload path.
- Save changes only on an explicit action. Disable writes when server readiness is not confirmed; report success only after server confirmation. Keep duplicate submissions, validation errors, remote conflicts, and failure recovery understandable in Thai.
- Preserve GP constraints and semantics: a valid percentage is at least zero and below 100; changes apply to new bills and suggested prices, not existing bills or menu sale prices.
- Keep backup and recovery available. Explain backup limits before download. The recovery panel presents a two-step process and a labeled JSON file picker. The in-page recovery inspection is non-mutating; progressive disclosure contains owner CLI commands and operational safeguards. Owner CLI remains the path for recovery/reset activation.
- Use native focus behavior and at least 44px action targets. Retain the existing cream surfaces, warm text, burgundy selection/actions, and semantic status colors. Retain existing brand assets. Admin alone manages access/settings. Show Viewer, Manager and Admin roles; owner admin is protected. New accounts enter the private email invitation outbox atomically with permission changes. Never display queued mail as sent.

## Evidence and incumbent comparison

Observed in `src/views/SettingsView.vue`, `src/assets/settings.css`, `src/cloud/core/CloudAccessPanel.vue`, and `src/cloud/core/CloudRecoveryPanel.vue`. The first Firebase category is `access`; the connection strip precedes navigation. Category state uses `v-show`, and visited cloud panels remain mounted, preserving drafts across category changes. Saves have explicit server-backed paths, blocked states, conflict/error messages, and status feedback. Recovery file inspection only previews; the CLI workflow is inside `<details>`.

The cream/maroon palette and Prompt-based Thai body follow `DESIGN.md`. Local heading sizing is an allowed settings treatment. One measured surface divergence: settings content cards are styled with a 14px radius while the incumbent system records 20px for editorial/settings cards. This is a settings-local choice in this redesign; the global system remains unchanged.
