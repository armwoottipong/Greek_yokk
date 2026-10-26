# Firebase action loading and duplicate submission guards

User request: every Firebase update shows a spinner on its initiating button and
prevents repeated requests. Keep original product layout and styles. Use actual
pending duration rather than an artificial fixed delay.

- Shared Button already implements spinner, disabled and aria-busy. Bind it to
  synchronous action locks set before the first await, including confirmations.
- Core sale, cancellation, retry and pending-sale abandonment hold the lock through
  the write result and server reload. Keep the initiating dialog/button visible
  until the reload finishes. Await an in-flight refresh instead of returning early.
- Original inventory draft Save/Discard, material Save/Archive/Restore/Delete and
  context/detail actions use per-action loading, block conflicting controls and
  prevent dialog dismissal while pending. Failure releases the spinner and keeps
  forms/drafts; uncertain commands retain their immutable IDs.
- Receiving, production, physical adjustment and waste stage locally; lock their
  async lot decisions too. Firebase writing still occurs only on original draft Save.
- Verify deferred-response tests (including duplicate clicks during confirmation,
  write and reload), original local regressions, whole tests/lint/build; review,
  commit/push/deploy and verify live SHA/assets. No Rules or business-data changes.
