# Responsive mobile and iPad

Approved by the user in chat on 29 October 2026.

Preserve Yoggie styling and existing business commands. Mobile More actions open
bottom drawers with content-sized height. Menu/Add-on header actions collapse into
More on mobile/iPad. Stock toolbar commands and filters collapse into More while
search stays accessible. Stock rows use a compact grid without removing data.

POS channels use a single horizontally scrollable row. Narrow POS workspaces show
the cart as a separate page with a return button and persistent payment footer.
Wide iPad/desktop workspaces keep the two-column catalog/cart. Switching views or
rotating preserves the cart, notes, search and payment. Applies to cloud and local.

Approach: reuse DialogFrame for action drawers and CartPanel for the cart page.
A new mobile-only workspace would duplicate business bindings; a cart modal would
not satisfy the separate-page request. No backend, Rules or calculation changes.

Check mobile 390px, iPad portrait/landscape and desktop; test command forwarding,
cart retention and focus; run test/lint/build then publish and verify Pages.
