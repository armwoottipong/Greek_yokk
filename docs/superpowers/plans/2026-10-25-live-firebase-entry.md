# Activate live Firebase entry

> Execute inline using executing-plans and test-driven-development. Existing isolated worktree; no new design approval needed: user explicitly requested live activation and iterative testing.

Goal: production root must show Google login for yoggie-db, while a clearly marked local.html keeps current shop operations available during migration.

Diagnosis: production had no VITE_DATA_MODE; loadApplication correctly selected local. Public Firebase config API responded200 and authorizedDomains includes armwoottipong.github.io. CLI currently has zero authenticated accounts, which is a separate database-deployment dependency.

- [x] Test production build defaults to Firebase; explicit local entry stays local even with production env.
- [x] Add checked-in public production config; dual HTML build entry and explicit local-mode shell/link.
- [x] Improve errors for domain/provider/database configuration, keeping authenticated state separate from sale readiness.
- [ ] Test/build, push/deploy, inspect live root and Google popup, preserve old origin data; report actual result.

No sales claim from login alone. No silent fallback, no billing, no browser storage clearing. Continue core data/command integration under already approved core-first direction. Authenticated Firebase CLI access is required before production Rules/data work; never weaken Rules to bypass this.
