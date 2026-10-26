# Original product UI on the live Firebase POS

Status: approved by the user; implemented as the core product UI package.

## Intent

Use the original product interface for daily work and ongoing testing. Replace
the simplified CoreWorkspace presentation without replacing the verified cloud
command path or changing live balances. Preserve the existing visual language,
sidebar, menu cards, cart, inventory presentation and mobile behavior.

## Approach

Reuse original presentation components and styles with an explicit cloud
controller. PosCatalog and PosMenuCard already accept props/events; adapt cart,
navigation and inventory components where they currently depend on posStore.
Keep createCoreWorkspace, command journal, transaction validation and server
confirmation as the only cloud write path.

Mounting App.vue unchanged would retain local mutations. Restyling the simplified
workspace alone would fail to provide the original product workflows. Both are
excluded by the user's request. Component reuse with cloud bindings is the
proposed implementation choice.

## First delivery

- Original product shell and navigation, with visible account/connection state.
- Original sale catalogue, platform tabs, search, menu customization and cart
  presentation; confirmation submits an immutable Firebase command.
- Original stock presentation and receiving/production interactions, backed by
  the existing supported cloud operations.
- Bills and cancellation use cloud records; archived local bills remain readable
  and cannot be cancelled through the cloud operation.
- Preserve the four distinct line limit, stock shortage review, uncertain-result
  recovery, saved carts, and blocked writes without confirmed connectivity.
- Clearly identify unavailable settings, stock adjustment, waste, stocktake,
  manual lot switching and extended report actions; none may invoke local
  mutation as an apparent successful cloud action.

## Live data and testing

Do not import or reset data, switch generations, weaken Rules, or change billing.
Do not create dummy transactions in the live shop. Verify write paths with the
emulator and use read-only live checks. Any actual business transaction during
acceptance must be an intentional user transaction.

Test reused UI interactions and the cloud binding, offline blocking, pending
command recovery, account isolation and responsive navigation. Run appropriate
tests, lint and build; commit, push and deploy each completed implementation
package, then verify Actions and live version/entry assets.

## Sequence

1. Original shell and sale workflow on Firebase, with regression checks.
2. Original inventory/receiving/production workflow and cloud bill handling.
3. Responsive and interaction acceptance; publish the completed package.

Settings mutations and extended reports remain a separate later scope. UI work
does not make those features operational.
