# History filter popup

User brief: history filters should open in a popup with a date range picker. Bounded refinement of the shared history modal, following the user's existing authorization to improve difficult UX and push changes for deployment.

Design: search remains in history; all other filters live in a compact sibling dialog. Choose start/end dates in one calendar, then Apply. Cancel, backdrop and Escape discard drafts and restore focus to the opener. A single selected date means that day. Range endpoints are inclusive Bangkok business dates. Existing global, stock and individual material contexts are preserved.

Tokens: white #ffffff surface, stone #fafaf9 calendar, #e7e5e4 borders, #292524 text, #047857 focus, #fef3c7 selected range. Keep existing Thai type and numeric font. Align labels left, calendar numbers centered. The range itself is the visual emphasis; avoid extra decoration.

Implementation: reuse DateRangeCalendar, add accessible date names/pressed state and opening month from selection; preserve YYYY-MM-DD domain values. Use the existing ModalShell stack for focus trapping and inert background.

Validation: 21 files / 147 tests passed; lint and production build passed. New range/dialog tests were observed failing before implementation. Strengthened boundary test after review covers records immediately outside and exactly inside both Bangkok boundaries, then passed all 9 history UI tests.

Browser: desktop range selection, Apply and opener focus verified with Demo data only on disposable localhost:3012. No captured warning/error console. Responsive iframe checks at 390x844 and 320x640 show calendar and all footer buttons inside dialog; 320px dialog and footer clientWidth/scrollWidth both 296px. Screenshots saved outside repository.

Independent code review: no Critical/Important findings. Minor boundary-test coverage gap addressed. Reviewer declined actual browser layout, full suite and real screen reader judgments; parent verified layout/suite, no screen reader session was available.

Rulings: direct requested UI correction and prior redesign authorization cover this short bounded design without repeated approval. Previous explicit push-for-deployment instruction persists for this follow-up; merge and push main after verification. No data retention, GAS or accounting behavior change.
