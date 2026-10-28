# Project working agreements

## Delivery

- User instruction (25 October 2026): after each completed work package, commit,
  push and deploy the website through GitHub Pages. This authorization persists;
  do not ask for the same routine Git/deploy permission again.
- Run appropriate tests, lint and the production build before releasing. Fix
  failures before pushing a release. Verify the GitHub Actions result and live
  `version.json`/entry asset; report the commit and deployment result honestly.
- Inspect remote changes before integrating. Preserve unrelated user work; use
  normal fast-forward/merge operations, never force-push or discard changes.
- Source publication/Pages deployment does not by itself authorize enabling an
  unfinished Firebase backend, weakening Rules, importing live business data or
  enabling billing. Prepare concrete migration/release checks for those actions.

## Current product priority

- First Firebase release: sale/stock deduction, cancellation, receiving and
  production. Settings mutations and extended reports may follow later, as the
  user explicitly chose on 25 October 2026.
- Firebase Spark free; Google login only; every logged-in account is equal.
  No roles or membership approval. Block shop writes when server connectivity
  cannot be confirmed; retain carts/pending commands, with no offline sales queue.
- Production root now opens Firebase login, explicitly requested 25 October.
  `local.html` keeps the existing POS available with a local-data label while
  integration/testing continues. Never silently fall back from Firebase to local.
  An authentication-ready screen is not an operational POS.

## Communication and cost

- Give concise Thai progress updates, then describe what works and the next
  concrete milestone. Do not inflate readiness from prototype test counts.
- Minimize total tokens. Use the smallest adequate model for delegated work;
  avoid unnecessary agents, repeated context reads and redundant test runs.

## Original UI requirement (26 October 2026)

- User instruction (28 October 2026): Google login now requires an explicitly
  allowed email. Allowed accounts remain equal; no roles. Settings manages the
  allowlist and Firebase status; sidebar footer shows active-user avatars with
  email tooltips. This overrides the earlier unrestricted-account requirement.

- Preserve original product UI layouts, templates and styles; settings is the
  only design exception explicitly allowed by the user. Connect Firebase through
  data/command bindings. In particular use StockView and its original stock
  modals, filters, table, lot details and draft review/save flow; do not substitute
  a new inventory layout or a simplified test workspace.
- Complete inventory integration before moving to menu settings or reports.
