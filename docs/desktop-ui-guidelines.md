# Desktop UI Guidelines — Fuselage, Tab Bar, and SVG Lessons

Field guide from the downloads titlebar indicator work (PRs #3441
and #3443). Everything here was learned by breaking it first. Follow it and
you skip a review round.

## Fuselage color tokens

`PaletteStyleTag` injects the tokens at runtime, so most are NOT in the
static `fuselage.css`. To find the real value of a token, read
`node_modules/@rocket.chat/fuselage-tokens/colors.json`. Then grep
`node_modules/@rocket.chat/fuselage/dist/fuselage.development.js` for the
semantic mapping. `Theme.d.ts` lists the tokens that exist. Never use a fallback hex
as the themed value. Tokens resolve differently in each theme (e.g.
`font-info` is `#095AD2` in light and `#739EDE` in dark).

Semantic guide (hard-won):

| Intent                          | Token                                                                                                     | Notes                                                                                                                                                                            |
| ------------------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Accent / progress / links       | `--rcx-color-font-info`                                                                                   | The blue of the downloads arc and dot                                                                                                                                            |
| Solid status dot                | `--rcx-color-status-bullet-online`                                                                        | Presence green, made for small solid dots                                                                                                                                        |
| Solid blue badge                | `--rcx-color-badge-background-level-2`                                                                    | The unread-badge blue (blue-500 `#156FF5` base)                                                                                                                                  |
| **Trap**: `status-background-*` | —                                                                                                         | Pale pastel _badge backgrounds_ for use behind darker text. They look washed out as a solid dot on a light titlebar                                                              |
| Icon button glyph color         | `--rcx-color-button-icon-color` → `--rcx-button-secondary-color` → `--rcx-color-button-font-on-secondary` | Copy this exact chain (from `.rcx-button--icon` in fuselage.css) for custom buttons that must match Fuselage `IconButton`s. `color: inherit` resolves to black in the dark theme |
| Subtle stroke/track             | `currentColor` + `stroke-opacity: 0.2`                                                                    | Works in every theme. Explicit "light" tokens look wrong in one of the themes                                                                                                    |

## Fuselage geometry facts

- `IconButton` square sizes: `medium` = 32px (24px glyph), `small` = 28px,
  `tiny` = 24px (check `rcx-button--<size>-square` in `fuselage.css`).
- Icon SVG sources of truth: `node_modules/@rocket.chat/icons/dist/svg/*.svg`.
  The rendered icon is a font glyph. `rcx-icon--name-<icon>` is a CSS
  class, not an attribute. The `download` icon (viewBox 32) draws its circle
  as an annulus between r=11 and r=13 centered on (16,16), i.e. a
  mid-radius-12, stroke-2 ring.
- For percent text that must not jitter, use monospace + `font-variant-numeric:
tabular-nums` + `min-width: 3ch` (two digits + `%`, and 100% grows the
  pill). This is the `UpdateLabel` convention. Reuse it. Do not invent widths.
- Fuselage `Select` (and other react-aria-backed inputs) requires a visible
  label, `aria-label`, or `aria-labelledby`. The `useSelect` hook of react-aria
  recognizes only those props and throws the accessibility warning otherwise.
  A labeled container around the component is not enough.

## Animation timing

Fuselage has **no duration CSS variable**. The compiled CSS sets these
standards:

- Micro-interactions (size/opacity/state): **`.18s`** (`.rcx-box--animated`
  uses `transition: all .18s`).
- Overlay enter/exit (dropdown, tooltip): `.3s`.
- Always add the same guard that Fuselage uses:
  `@media (prefers-reduced-motion) { transition: none; }`.

## Tab bar / titlebar button conventions

- Bar heights: the TabBar strip is taller. **The TopBar titlebar is 28px on macOS,
  32px on Windows** (`src/ui/components/TopBar/index.tsx`). Anything sized
  for the tab bar (32px buttons, oversized overlays, dots that overhang the
  button box) clips in the titlebar. Provide a `compact` mode (tiny 24px
  buttons, 0.75-scaled artwork). Only TopBar layouts pass it.
- `TabBarButtonWrapper` dims every descendant `button` to **`opacity: 0.6`**
  at rest (hover restores 1). Consequences:
  - Progress/status artwork rendered _inside_ the button inherits the
    dimming and looks translucent next to overlay artwork. Render the
    overlays as absolutely-positioned siblings _outside_ the button, or
    override the dimming for attention states.
  - To override, use `&&[data-attr='...'] { opacity: 1; }` on the styled button
    (doubled component class + attribute = specificity 0-3-0, which beats the
    0-1-1 descendant rule of the wrapper).
- The `Strip` is `display: flex; gap: 3px`. It has two traps:
  - An in-flow zero-width sibling (e.g. a `position: relative` popup layer)
    still consumes a flex gap and shifts its neighbors when it mounts. Make popup
    containers `position: fixed` so they leave the flow.
  - The TabBar and TopBar slots must inherit the same Strip gap. Do not
    wrap the slot of one side in a container with a different gap.
- Trailing groups are right-anchored: they grow **leftward**. Text placed
  after (right of) the icon slides the icon left when it appears. This is
  acceptable when animated and jarring when instant.
- Icon-only buttons must be exactly **square** (width == height) in both
  sizes. Horizontal padding that centers a 24px glyph in a 32px button makes
  a 24px compact button rectangular. Make the padding size-aware.
- Attention states (Chrome-style): keep the control at full opacity from
  completion until the user acknowledges it (opens the popup). Then let it dim
  back with everything else.

## SVG + emotion pitfalls

- The SVG `transform` **attribute maps to the CSS `transform` property**. A
  CSS `transform-origin` on the same element (or its styled-component
  wrapper) stacks onto the origin already baked into `rotate(-90 cx cy)`. It
  displaces the artwork out of the viewBox, and the artwork clips invisibly
  while every DOM attribute looks correct. Rules:
  - Put the start-angle rotation as an attribute on the circle itself.
  - Never set an unconditional CSS `transform-origin`. For spin animations,
    apply `transform-box: fill-box; transform-origin: center;` _only_
    while the animation runs.
- Progress arcs: `stroke-dasharray = circumference`, `stroke-dashoffset =
circumference × (1 − progress)`, `transition: stroke-dashoffset 200ms` for
  a smooth fill. An indeterminate arc = a fixed quarter arc + a 1s linear spin. `progress`
  is normalized to `0–1`. The update store publishes `0–100`, so divide
  by `100` before you apply the formula.
- `@keyframes` declared inside an emotion template literal work. Backticks
  inside CSS comments in a template literal end the template early.
- jsdom resolves `ch` units to pixels in `getComputedStyle`. To assert a
  `3ch` width in tests, measure a same-font 1ch probe element.

## Verifying UI at runtime

Component tests cannot see paint: the arc-clipping bug above passed every
DOM-level assertion. For anything visual, check the running app:

- **Simulate flows** (Developer Mode required): the app menu, the tab bar
  meatball popup, and the titlebar server-switcher menu all carry
  `Simulate Update Flow` and `Simulate Download` (ships with PR #3443).
  Simulate Download replays two staggered fake downloads through the real
  Redux lifecycle: progress, averaged percent, completion dot.
- **Driving/screenshotting the dev app**: `yarn start` exposes the
  main-process Node inspector on port 9339. See the `dev-app-verify` skill
  (`skills/dev-app-verify/`) for the ready-made script and the
  pitfalls. An occluded window returns stale `capturePage` frames. The rollup
  watcher restarts the app on any rebuild and kills in-flight state. Two
  racing instances wedge on the singleton lock.
