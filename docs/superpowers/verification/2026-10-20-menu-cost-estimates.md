# Menu cost estimates and selected POS costs

Approved in chat: show average-case and maximum-cost included selections in menu details; show costs from actual selections in POS. Average is the primary planning estimate; worst-case respects repeat/distinct selection rules.

Implementation: `src/domain/menuCosts.js` reuses inventory recipe expansion. All active options in assigned included groups have equal probability. Selection count is explicitly the group's maximum; paid optional groups are excluded from menu projections. Base and add-on recipes include their packaging, respecting menu hasPackage. Missing costs/recipes or insufficient distinct choices show unavailable rather than a false zero. Current catalog costs recalculate reactively.

Menu details show average total cost/profit and highest possible total cost/profit after the selected channel's GP. POS product details contain an expandable financial section using actual choices, repeated portions, bowl quantity, current material unit costs and selected channel prices. It identifies partial selections and explains that subsequent Package adjustments affect the cart. Existing checkout, inventory consumption, package projections and sold order records are unchanged.

Validation: full suite passed 565 tests in 94 files; lint/build passed. New domain tests cover mean, highest distinct/repeated costs, inactive choices, missing references, packaging and actual selection quantities. Interaction tests cover menu profit and reactive POS cost/profit when bowl quantities change. Mechanical detector returned only inherited advisory typography findings. Final label adjustment distinguishes base recipe cost from total cost with free selections; targeted verification rerun afterward.

Browser visual verification was unavailable: browser policy rejected access to the existing local tab. No alternative browser control was used to bypass the block. Changes remain in the working tree; no production deployment is claimed.

## Compact layout follow-up
User confirmed retaining the original six-metric menu layout. Included groups now default to average cost/profit/margin in that grid; a small ArrowLeftRight icon with a named 44px target switches all three metrics to the most expensive allowed selection and back. The current mode is labeled; absent groups retain original financials without a toggle. Reopening the sheet or changing menus resets to average. Interaction coverage verifies both directions, costs, profit and margins. POS calculations are unchanged.
