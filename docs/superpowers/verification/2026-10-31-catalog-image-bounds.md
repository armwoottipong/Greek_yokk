# Catalog image bounds

User screenshot showed a saved 512px photo expanding the catalog header and
browser rows. Those wrappers inherited emoji font sizes but had no fixed image
dimensions. A percentage-sized image in the shared grid also contributed its
intrinsic dimensions to the wrapper's minimum size.

Changes preserve the catalog grid, controls and information layout:

- Header thumbnail: 56×56px; 44×44px at the existing phone breakpoint.
- Browser thumbnail: 40×40px.
- The shared image is absolutely positioned inside its relative, clipped square
  wrapper. The original bitmap cannot determine the wrapper's intrinsic size.
- Existing POS and stock wrappers retain their dimensions and square images.

Browser verification used the actual Vue header/browser/POS/stock components
and a generated 512×512 JPEG in an isolated local fixture, with no production
data edits. Before the fix both catalog thumbnails measured 512×512. After:

| Viewport | Header | Browser | Stock row | Horizontal overflow |
| --- | --- | --- | --- | --- |
| 1280px | 56×56 | 40×40 | 56×56 | None |
| 820px | 56×56 | 40×40 | 44×44 | None |
| 390px | 44×44 | 40×40 | 44×44 | None |

POS images remained square at all three widths. Screenshot inspection confirmed
readable identity/actions and ordinary browser row heights. Independent two-file
review found no important/critical issue. Full suite: 199 files, 1521 passed / one
skipped; lint/build passed with the existing large-chunk warning. The detector's
font-size advisories concern unchanged incumbent typography. No Rules or business
bindings changed. Deployment commit and live version/entry verification are
reported in chat.
