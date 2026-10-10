# Anchored history filter dropdown

User clarification: make the history filter popup look like a dropdown. This bounded refinement positions the existing filter dialog at the filter button rather than centered on a second dimmed backdrop. Existing range picker and draft Apply/Cancel behavior remain.

Design uses existing white/stone/emerald/amber tokens and Thai type. Right-align the panel to the trigger, 8px below, max360px wide. Clamp horizontally to viewport edges, use above placement if insufficient room below, keep footer visible and scroll the form on short screens. Chevron indicates expansion. Transparent outside-hit layer dismisses without changing filters. Existing ModalShell retains keyboard trapping and opener focus restoration.

TDD: new anchoring/no-second-dimming/outside-dismiss test observed failing before implementation, then 10 history UI tests passed. Independent read-only code review found no actionable issues; parent handles full-suite and visual validation.

Browser verification on disposable Demo origin localhost:3013: desktop dropdown appears under button, range preview and footer visible. Outside click closes only filters and returns focus to trigger. No console warnings/errors captured. At320x640 responsive iframe, panel spans x8..312, y169..632, footer clientWidth=scrollWidth=302; form scrolls while footer remains visible. Screenshots saved outside repository.

Prior explicit push-to-deploy authorization persists for this UI follow-up. Direct requested correction and existing redesign authorization cover bounded design without repeated confirmation.
`nFinal local verification: 21 test files / 148 tests passed, lint and production build passed, git diff --check passed.
