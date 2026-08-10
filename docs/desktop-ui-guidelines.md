# Desktop UI Guidelines — Fuselage, Tab Bar, and SVG Lessons

Field guide distilled from the downloads titlebar indicator work (PRs #3441
and #3443). Everything here was learned by breaking it first; follow it and
you skip a review round.

## Fuselage color tokens

Tokens are **runtime-injected** by `PaletteStyleTag` — most are NOT in the
static `fuselage.css`. To verify a token's real value, check
`node_modules/@rocket.chat/fuselage-tokens/colors.json` and grep
`node_modules/@rocket.chat/fuselage/dist/fuselage.development.js` for the
semantic mapping. `Theme.d.ts` lists what exists. Never trust a fallback hex
to represent the themed value: tokens resolve differently per theme (e.g.
`font-info` is `#095AD2` in light and `#739EDE` in dark).

Semantic guide (hard-won):

| Intent | Token | Notes |
|---|---|---|
| Accent / progress / links | `--rcx-color-font-info` | The blue used by the downloads arc and dot |
| Solid status dot | `--rcx-color-status-bullet-online` | Presence green, made for small solid dots |
| Solid blue badge | `--rcx-color-badge-background-level-2` | The unread-badge blue (blue-500 `#156FF5` base) |
| **Trap**: `status-background-*` | — | Pale pastel *badge backgrounds* meant to sit behind darker text; washed out as a solid dot on a light titlebar |
| Icon button glyph color | `--rcx-color-button-icon-color` → `--rcx-button-secondary-color` → `--rcx-color-button-font-on-secondary` | Copy this exact chain (from `.rcx-button--icon` in fuselage.css) for custom buttons that must match Fuselage `IconButton`s; `color: inherit` resolves to black in dark theme |
| Subtle stroke/track | `currentColor` + `stroke-opacity: 0.2` | Theme-proof; explicit "light" tokens read wrong on one of the themes |

## Fuselage geometry facts

- `IconButton` square sizes: `medium` = 32px (24px glyph), `small` = 28px,
  `tiny` = 24px (verify in `fuselage.css`: `rcx-button--<size>-square`).
- Icon SVG sources of truth: `node_modules/@rocket.chat/icons/dist/svg/*.svg`
  (the rendered icon is a font glyph — `rcx-icon--name-<icon>` is a CSS
  class, not an attribute). The `download` icon (viewBox 32) draws its circle
  as an annulus between r=11 and r=13 centered on (16,16) — i.e. a
  mid-radius-12, stroke-2 ring.
- Percent text that must not jitter: monospace + `font-variant-numeric:
  tabular-nums` + `min-width: 3ch` (two digits + `%`; 100% simply grows the
  pill) — the `UpdateLabel` convention; reuse it, don't invent widths.
- Fuselage `Select` (and other react-aria-backed inputs) requires a visible
  label, `aria-label`, or `aria-labelledby` — react-aria's `useSelect` only
  recognizes those props and throws the accessibility warning otherwise;
  wrapping the component in a labeled container is not enough.

## Animation timing

Fuselage has **no duration CSS variable**. The standards, from the compiled
CSS:

- Micro-interactions (size/opacity/state): **`.18s`** (`.rcx-box--animated`
  uses `transition: all .18s`).
- Overlay enter/exit (dropdown, tooltip): `.3s`.
- Always add the same guard Fuselage uses:
  `@media (prefers-reduced-motion) { transition: none; }`.

## Tab bar / titlebar button conventions

- Bar heights: TabBar strip is taller; **TopBar titlebar is 28px on macOS,
  32px on Windows** (`src/ui/components/TopBar/index.tsx`). Anything sized
  for the tab bar (32px buttons, oversized overlays, dots overhanging the
  button box) clips in the titlebar — provide a `compact` mode (tiny 24px
  buttons, 0.75-scaled artwork) passed only by TopBar layouts.
- `TabBarButtonWrapper` dims every descendant `button` to **`opacity: 0.6`**
  at rest (hover restores 1). Consequences:
  - Progress/status artwork rendered *inside* the button inherits the
    dimming and looks translucent next to overlay artwork. Either render
    overlays as absolutely-positioned siblings *outside* the button, or
    override the dimming for attention states.
  - To override: `&&[data-attr='...'] { opacity: 1; }` on the styled button
    (doubled component class + attribute = specificity 0-3-0, beats the
    wrapper's 0-1-1 descendant rule).
- The `Strip` is `display: flex; gap: 3px`. Two traps:
  - An in-flow zero-width sibling (e.g. a `position: relative` popup layer)
    still consumes a flex gap and shifts neighbors when it mounts. Popup
    containers must be `position: fixed` to leave the flow.
  - Both TabBar and TopBar slots must inherit the same Strip gap — do not
    wrap one side's slot in a different-gap container.
- Trailing groups are right-anchored: they grow **leftward**. Text placed
  after (right of) the icon slides the icon left as it appears — acceptable
  when animated, jarring when instant.
- Icon-only buttons must be exactly **square** (width == height) in both
  sizes; horizontal padding that centers a 24px glyph in a 32px button makes
  a 24px compact button rectangular — make padding size-aware.
- Attention states (Chrome-style): keep the control at full opacity from
  completion until the user acknowledges (opens the popup), then let it dim
  back with everything else.

## SVG + emotion pitfalls

- The SVG `transform` **attribute maps to the CSS `transform` property**. A
  CSS `transform-origin` on the same element (or its styled-component
  wrapper) stacks onto the origin already baked into `rotate(-90 cx cy)` and
  displaces the artwork out of the viewBox — it clips invisibly while every
  DOM attribute looks correct. Rules:
  - Put start-angle rotation as an attribute on the circle itself.
  - Never set an unconditional CSS `transform-origin`; for spin animations
    use `transform-box: fill-box; transform-origin: center;` applied *only*
    while animating.
- Progress arcs: `stroke-dasharray = circumference`, `stroke-dashoffset =
  circumference × (1 − progress)`, `transition: stroke-dashoffset 200ms` for
  smooth fill; indeterminate = fixed quarter arc + 1s linear spin. `progress`
  here is normalized to `0–1` — the update store publishes `0–100`, so divide
  by `100` before applying the formula.
- `@keyframes` declared inside an emotion template literal work; backticks
  inside CSS comments in a template literal end the template early.
- jsdom resolves `ch` units to pixels in `getComputedStyle` — to assert a
  `3ch` width in tests, measure a same-font 1ch probe element.

## Verifying UI at runtime

Component tests cannot see paint: the arc-clipping bug above passed every
DOM-level assertion. For anything visual, verify in the running app:

- **Simulate flows** (Developer Mode required): the app menu, tab bar
  meatball popup, and titlebar server-switcher menu all carry
  `Simulate Update Flow` and `Simulate Download` (ships with PR #3443).
  Simulate Download replays two staggered fake downloads through the real
  Redux lifecycle — progress, averaged percent, completion dot.
- **Driving/screenshotting the dev app**: `yarn start` exposes the
  main-process Node inspector on port 9339 — see the `dev-app-verify` skill
  (`skills/dev-app-verify/`) for the ready-made script and the
  pitfalls (occluded windows return stale `capturePage` frames; the rollup
  watcher restarts the app on any rebuild, killing in-flight state; two
  racing instances wedge on the singleton lock).
