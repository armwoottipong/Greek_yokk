# Retained lot history — bounded candidate, not a deployable policy

`tests/firestore/candidate.rules` now includes the history-window route alongside
the existing two/three/four-lot routes. Root `firestore.rules` still denies all
client requests. No running POS code imports the candidate or enables cloud sales.

The window route selects four consecutive lots at an explicit zero-based offset
inside a longer material lot list. Every object before and after the window must
remain exactly equal. Positive fixtures retain 15, 16 and 24 stored lots without
merging or deleting history. Negative tests reject changed history metadata/IDs,
omitted history, invalid offsets, wrong selected IDs and a window omitting nonzero
stock elsewhere. Cancellation restores original lot IDs and actual deductions
while preserving surrounding history. Production tests also consume a window of
source lots atomically with the weighted-cost output; altered history, extra stock
and omitted input proofs are denied without changing either input or output.

This relies on a trusted-state invariant: all source quantities are nonnegative
integers within the quantity bound, and material stock equals the exact sum of
**all** lots. Import/authoring must establish this invariant; every later command
must preserve it. Checking source stock equals the selected four quantities then
proves that quantities outside the window are zero. It does not scan an unbounded
array or validate arbitrary pre-existing data. Outside objects remain immutable.

The first window candidate regressed the six-line mixed-lot route at the
1,000-expression ceiling. Conditional dispatch still exceeded that ceiling until
two duplicated checks were removed from their secondary locations:

- The mandatory material guard validates the incremented revision. The Four
  witness still binds the source revision, material, operation ID and kind.
- The mandatory Four witness validates equal source/target lot-list lengths.
  The material guard still validates the allowed changed fields and allocation.

The first two lot deductions also retain integer/nonnegative checks but no longer
repeat an upper quantity bound that follows from the trusted source bound and the
validated allocation (`0 <= take <= source`). These checks remain enforced across
the single atomic commit. New adversarial tests reject zero, double and fractional
revision increments. No check is delegated to an untrusted UI.

Focused checks now pass the original six-line/three-multimaterial case, the
three-lot padded case, and six lines with retained history plus one or three
multi-lot materials. This removes the earlier separation between incompatible
passing policies; it does **not** complete Task 1 certification.

Remaining limits: positive stock must fit within four consecutive selected lots.
Nonconsecutive live lots, more than four live lots, generic history archiving,
document/request size guarantees, all active-flag variants and complete upper-bound
production combinations remain uncertified. The preflight continues to block more
than four stored lots until the final codec/protocol can represent and certify a
window. Do not relax import bounds based only on these passing examples.
