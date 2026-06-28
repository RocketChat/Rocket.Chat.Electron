---
name: Rocket.Chat Desktop
description: Native desktop shell around one or more Rocket.Chat server webviews.
colors:
  primary-500: "#156ff5"
  primary-600: "#095ad2"
  primary-700: "#10529e"
  primary-200: "#d1ebfe"
  info-500: "#156ff5"
  danger-500: "#ec0d2a"
  danger-550: "#f5455c"
  danger-600: "#d40c26"
  warning-500: "#ffd031"
  warning-650: "#ac892f"
  success-500: "#2de0a5"
  success-650: "#158d65"
  service-1-500: "#f38c39"
  neutral-100: "#f7f8fa"
  neutral-200: "#f2f3f5"
  neutral-400: "#e4e7ea"
  neutral-450: "#d7dbe0"
  neutral-500: "#cbced1"
  neutral-600: "#9ea2a8"
  neutral-700: "#6c727a"
  neutral-800: "#2f343d"
  neutral-850: "#2f343d80"
  neutral-900: "#1f2329"
  white: "#ffffff"
  badge-level-0: "#e4e7ea"
  badge-level-1: "#9ea2a8"
  badge-level-2: "#1d74f5"
  badge-level-3: "#f38c39"
  badge-level-4: "#f5455c"
typography:
  hero:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "48px"
    fontWeight: 800
    lineHeight: "64px"
    letterSpacing: "0"
  h1:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: "40px"
    letterSpacing: "0"
  h2:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: "32px"
    letterSpacing: "0"
  h3:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: "28px"
    letterSpacing: "0"
  h4:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "16px"
    fontWeight: 700
    lineHeight: "24px"
    letterSpacing: "0"
  h5:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "14px"
    fontWeight: 700
    lineHeight: "20px"
    letterSpacing: "0"
  p1:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "24px"
    letterSpacing: "0"
  p2:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"
    letterSpacing: "0"
  c1:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "16px"
    letterSpacing: "0"
  c2:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: "16px"
    letterSpacing: "0"
  micro:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "10px"
    fontWeight: 700
    lineHeight: "12px"
    letterSpacing: "0"
rounded:
  none: "0"
  small: "2px"
  medium: "4px"
  large: "8px"
  full: "9999px"
spacing:
  x1: "1px"
  x2: "2px"
  x4: "4px"
  x8: "8px"
  x12: "12px"
  x16: "16px"
  x24: "24px"
  x28: "28px"
  x32: "32px"
  x44: "44px"
components:
  sidebar:
    backgroundColor: "{colors.neutral-100}"
    width: "44px"
    padding: "8px 0"
  server-button:
    backgroundColor: "{colors.neutral-100}"
    rounded: "{rounded.medium}"
    size: "28px"
  server-button-selected:
    backgroundColor: "{colors.neutral-450}"
  badge-mention-count:
    backgroundColor: "{colors.badge-level-1}"
    textColor: "{colors.white}"
    rounded: "{rounded.full}"
  badge-not-logged-in:
    backgroundColor: "{colors.badge-level-3}"
    textColor: "{colors.white}"
    rounded: "{rounded.full}"
  dialog:
    backgroundColor: "{colors.white}"
    textColor: "{colors.neutral-800}"
    rounded: "{rounded.medium}"
    padding: "24px"
  topbar:
    backgroundColor: "{colors.neutral-100}"
    height: "22px"
  button-primary:
    backgroundColor: "{colors.primary-500}"
    textColor: "{colors.white}"
    rounded: "{rounded.medium}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.primary-600}"
  button-primary-press:
    backgroundColor: "{colors.primary-700}"
  button-danger:
    backgroundColor: "{colors.danger-500}"
    textColor: "{colors.white}"
    rounded: "{rounded.medium}"
    padding: "8px 16px"
  button-danger-hover:
    backgroundColor: "{colors.danger-600}"
---

# Design System: Rocket.Chat Desktop

## 1. Overview

**Creative North Star: "The Workshop Wall"**

The desktop shell is a tool rail: a quiet 44-pixel column of workspaces hung along the side of a screen, each one sized for instant reach. Like a workshop wall, every tool has its place, density is the point, and the rail itself is invisible during work. Users move through the rail without thinking; they only notice it when a server badge calls them back, when they drag a workspace to reorder it, or when a dialog steps forward to handle something the browser cannot.

The visual system inherits directly from Fuselage, the Rocket.Chat web design system. This is deliberate: users move between web and desktop daily, and visual continuity is part of the trust contract. Tokens trace back to `@rocket.chat/fuselage-tokens`: primary uses the `p` ramp, neutral the `n` ramp, danger the `d` ramp, badges resolve through the SCSS `badge()` function (`level-1` for unread count, `level-3` for warning, `level-4` for true alert). The Electron shell does not invent colors, weights, radii, or spacing values outside that scheme.

This system explicitly rejects four neighbors. It is not Discord (no neon, no drenched purple, no playful microcopy). It is not legacy Skype or Teams (no heavy gradients, no decorative iconography in the titlebar, no busy toolbar). It is not generic SaaS marketing (no hero metric tiles, no identical card grids, no gradient accents on numbers). And it is not Linear-minimalism for its own sake (sidebar density matters; sparse-when-it-could-be-useful is a regression).

**Key Characteristics:**

- 44-pixel server rail as the signature surface.
- Flat by default, depth through tonal tint shifts (`neutral-100` → `neutral-450` → `white`).
- Inter primary, system stack fallback (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, ...`).
- One accent gesture: the 4-pixel selection stripe to the left of the active server, in `neutral-450`.
- Color follows Fuselage CSS variables (`--rcx-color-*`), themed light / dark / auto via `PaletteStyleTag` (resolved against `machineTheme` and `userThemePreference`).
- Native per-platform: macOS vibrancy + 22-pixel drag bar, Windows Mica, Linux fallback.

## 2. Colors

A small palette of muted tints with a precise role assignment for every accent. Every color resolves to a Fuselage CSS variable; the SCSS pipeline (`primary($grade)`, `neutral($grade)`, `danger($grade)`, `badge($level)`) is the source of truth and the React `getPaletteColor` helper mirrors it. The desktop shell never invents colors outside the Fuselage palette.

### Primary
- **Action Blue** (`#156ff5`, oklch(57% 0.21 257), Fuselage `primary-500`): The dominant action color. Primary buttons, focus rings, inline links inside dialogs. Hover steps to `primary-600` (`#095ad2`), press to `primary-700` (`#10529e`). Disabled background is `primary-200` (`#d1ebfe`).

### Secondary
- **Mention Slate** (`#9ea2a8`, oklch(68% 0.012 256), Fuselage `badge-level-1` resolving to `neutral-600`): The unread-mention count badge background. Fuselage's `Badge variant='secondary'` is a muted gray, not red. Restraint is intentional; the badge is a count, not an alarm.

### Tertiary
- **Caution Orange** (`#f38c39`, oklch(72% 0.16 51), Fuselage `badge-level-3` resolving to `service-1-500`): The warning-state badge ServerButton paints over a server avatar when the user is not logged in (Fuselage `Badge variant='warning'`). Used as a state signal, never as a button background.
- **Alert Crimson** (`#f5455c`, oklch(65% 0.22 18), Fuselage `badge-level-4` resolving to `danger-550`): Reserved for true alerts requiring user response. If introduced into the shell, it lives only on the destructive button family and `Badge variant='danger'`. Not currently in the rail vocabulary.

### Neutral
- **Workshop Slate** (`#2f343d`, oklch(31% 0.014 256), Fuselage `neutral-800`): The deep neutral behind webviews when transparent-window mode is not engaged on darwin. Also the dark text color for body copy in the dialog surface.
- **Ink** (`#1f2329`, oklch(25% 0.013 256), Fuselage `neutral-900`): Titles and labels on light surfaces.
- **Annotation** (`#6c727a`, oklch(52% 0.012 256), Fuselage `neutral-700`): Secondary info, hint text, dropdown section labels.
- **Wall Cream** (`#f7f8fa`, oklch(98% 0.004 250), Fuselage `neutral-100`): The light sidebar background. Quiet enough to disappear next to webview content.
- **Active Tone** (`#d7dbe0`, oklch(88% 0.006 256), Fuselage `neutral-450`): The 4-pixel selection stripe fill and the hover background on rail items.
- **Hairline** (`#e4e7ea`, oklch(92% 0.005 250), Fuselage `neutral-400`): Dividers and ghost-button borders. One pixel, never offset.

### Named Rules

**The Fuselage Truth Rule.** Every color in the desktop shell resolves to a `--rcx-color-*` custom property emitted by `PaletteStyleTag`. The hardcoded fallbacks (`#2f343d`, `#d7dbe0`) inside `src/ui/components/SideBar/styles.tsx` and `Shell/styles.tsx` exist only as last-resort backstops for the moment before the palette tag hydrates. Do not reuse those literal hex codes anywhere else; reference the CSS variable.

**The One Stripe Rule.** The 4-pixel left stripe on the selected server button is the entire decorative vocabulary of the rail. Do not add second stripes, glows, halos, or contrast borders to indicate selection elsewhere. If a new affordance needs to signal selection, repeat the stripe.

**The Quiet Mention Rule.** The mention-count badge is Fuselage `Badge variant='secondary'`: gray on the avatar, white text. Not red. The badge is a number, not an alarm. Red is reserved for `variant='danger'` on confirmation buttons and true alerts. Warning state (not-logged-in) uses `variant='warning'`: orange, also not red.

**The Token-First Rule.** When adding a color, look up the role in `fuselage-tokens/src/<role>/base.json` (status, font, surface, button, stroke, background). If no role token exists, do not add one in the shell; raise it as a Fuselage proposal.

## 3. Typography

**Display Font:** Inter (with fallback `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif`).
**Body Font:** Inter (same stack).
**Mono Font:** `Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace`. Reserved for code surfaces.

**Character:** Inter is the Fuselage standard. The shell prefers Inter where available and falls back through the system stack to remove font-loading flash on cold Electron start. The current shell's `system-ui`-only stylesheet (`Shell/styles.tsx` line 37) predates the Inter migration and should be brought in line with the Fuselage scale.

### Hierarchy

Use Fuselage `fontScale` props on `Box` and components rather than raw CSS. Each scale below is the exact `@rocket.chat/fuselage-tokens/typography.json` entry.

- **hero** (800, 48 / 64): Splash screens, marketing-style hero blocks. Not used inside the shell after first paint.
- **h1** (700, 32 / 40): Settings view title, About title.
- **h2** (700, 24 / 32): Section headers within Settings tabs, dialog titles in About / Update.
- **h3** (700, 20 / 28): Subsection titles, large dialog titles where h2 is too dominant.
- **h4** (700, 16 / 24): Form group labels, dropdown section labels (uppercase via Fuselage `Option.title`).
- **h5** (700, 14 / 20): Compact list-item titles.
- **p1** (400, 16 / 24): Primary running copy in dialogs. Also `p1m` (500) for medium emphasis, `p1b` (700) for bold inline.
- **p2** (400, 14 / 20): Default shell body. Sidebar tooltips, settings form rows, dropdown item text. `p2m` and `p2b` available.
- **c1** (400, 12 / 16): Server initials, badge numbers, metadata, micro-labels.
- **c2** (700, 12 / 16): Emphasized micro-labels (badge counts when emphasized).
- **micro** (700, 10 / 12): Extreme density labels. Not currently used in the shell.

### Named Rules

**The fontScale Rule.** Use Fuselage `fontScale='p2'` (or other key) on Box rather than raw `font-size`. The scale tag is the contract; pixel literals drift.

**The Inter-First Rule.** Add Inter at the front of the family stack. Do not strip it back to `system-ui` even if local Electron versions render fine without it; cross-platform parity with the Fuselage web app depends on Inter where the font is available.

**The Sentence Case Rule.** All shell strings are sentence case in source. Title case appears only when the host OS demands it (macOS menu items). The single exception is `Option.title` in dropdowns, which Fuselage uppercases at the component level (uppercased CSS, sentence-case source).

## 4. Elevation

This system is **flat by default with tonal layering**. Depth steps through neutrals (`neutral-100` → `white` → `neutral-450`). The single sanctioned shadow vocabulary lives inside Fuselage's `shadow-colors` map (`elevation-1`, `elevation-2x`, `elevation-2y`, `elevation-border`, all built from `neutral-800` at low alpha) and is applied by Fuselage's transient-overlay components. The desktop shell never composes shadows directly; it relies on Fuselage `Dropdown`, `Dialog`, `Tile` to bring their own.

### Shadow Vocabulary (inherited, not authored)
- **elevation-1** (`neutral-800` at 10% alpha): Default lift on tiles and contextual surfaces inside Fuselage components.
- **elevation-2** (split x/y at 8% / 12% alpha): Modal-tier lift on dialogs and menus.
- **elevation-border** (`stroke(extra-light)`): One-pixel hairline used as the bottom edge of elevated surfaces.

### Named Rules

**The Tonal Step Rule.** Adjacent shell surfaces differ by exactly one tint step (`neutral-100` rail → `white` dialog → `neutral-450` selection accent). Skipping a step or stacking two surfaces of the same tint is a layout bug, not a depth choice.

**The Shadow Tenancy Rule.** Shadows belong to Fuselage's transient overlays and to the OS-native layer (window chrome, vibrancy backdrops). The shell does not author `box-shadow` in any CSS it owns. If a thing looks like it wants a shadow, it wants a tonal step or a hairline.

## 5. Components

### Server Button (signature)

- **Shape:** Fuselage `IconButton small secondary` (28-pixel square hit target with 4-pixel radius), wrapped in a 44-pixel-wide list item.
- **Default:** Favicon or two-letter `Initials` on `neutral-100`. Initials use `c1` typography.
- **Hover:** Background steps to `neutral-450`.
- **Selected:** A 4-pixel-wide, 28-pixel-tall vertical bar in `neutral-450` positioned `left: -8px` outside the button, right-edge radius `0 4px 4px 0`. Height transitions on `var(--transitions-duration)`. (`src/ui/components/SideBar/styles.tsx` lines 22 to 49 is the canonical implementation.) This is the entire selected-state vocabulary.
- **Unread count:** Fuselage `Badge variant='secondary'` (gray, `badge-level-1` = `#9ea2a8`) anchored top-right with `translate(30%, -30%)`.
- **Not logged in:** Fuselage `Badge variant='warning'` (orange, `badge-level-3` = `#f38c39`), same anchor.
- **Drag:** Opacity 0.5 while dragged. No border highlight on the drop target.
- **Context menu:** Fuselage `Dropdown` with `Option`s: Reload, Copy URL, Open Dev Tools, Server Info, Reload Clearing Cache, divider, Remove (`variant='danger'`).

### Sidebar Rail

- **Width:** Exactly 44 pixels. Never grows, never collapses, never shows labels inline; labels live in tooltips.
- **Background:** `neutral-100` in opaque mode; `undefined` on macOS when `isTransparentWindowEnabled` (vibrancy passes through).
- **Padding:** `paddingBlockStart={8} paddingBlockEnd={8}`.
- **Layout:** Vertical `ButtonGroup large` of server buttons at the top, `MenuV2` (Downloads, Settings) anchored at the bottom.

### TopBar (macOS only)

- **Render:** `process.platform === 'darwin'` only. Hidden on Windows and Linux.
- **Background:** `neutral-100` (or `undefined` for vibrancy).
- **Height:** 22-pixel drag bar above the rail. Carries the macOS traffic-light spacing.

### Dialogs (About, Update, Clear Cache, Screen Sharing, Outlook Credentials, Server Info, Supported Version)

- **Surface:** Fuselage `Dialog` on `white`.
- **Corner:** `rounded.medium` (4px) at the Dialog level.
- **Internal padding:** 24px on the outer Box; tighter inside form rows.
- **Title:** Fuselage `fontScale='h2'` (700, 24 / 32) or `h3` (700, 20 / 28).
- **Body:** `p1` (400, 16 / 24) for primary copy. Max 65 to 75 characters per line.
- **Actions:** Right-aligned `ButtonGroup` at the dialog bottom. Primary uses `button-primary` (Action Blue). Destructive uses `button-danger` (`danger-500` = `#ec0d2a`).

### Settings View

- **Layout:** Full-window panel layered over the webview. Fuselage `Tabs` at the top (General / Certificates / optional Developer). Scrollable content inside `Box m='x24'`.
- **Title:** `Box fontScale='h1' color='default' padding={24}` with optional back arrow (Fuselage `IconButton icon='arrow-back'`) when sidebar is disabled.
- **Background:** `bg='room'` (resolves to `neutral-800` in light theme). Matches webview canvas to prevent flash on transition.

### Buttons (Fuselage `Button`, exact mapping)

- **Primary:** `backgroundPrimaryDefault` = `primary-500` (`#156ff5`). Hover `primary-600`, press `primary-700`, focus `primary-500`. Disabled background `primary-200`. Font `white`.
- **Secondary:** `backgroundSecondaryDefault` = `neutral-400`. Hover `neutral-500`, press `neutral-600`. Font `neutral-900`.
- **Danger:** `backgroundDangerDefault` = `danger-500` (`#ec0d2a`). Hover `danger-600`, press `danger-700`. Font `white`. Used for Remove Server, Clear Cache, equivalent confirmations.
- **Warning:** `backgroundWarningDefault` = `warning-400`. Hover `w500`, press `w600`. Font `neutral-900` (dark text on yellow).
- **Success:** `backgroundSuccessDefault` = `success-500`. Font `neutral-900`.
- **Icon buttons:** Fuselage `IconButton small secondary` is the rail and chrome default. No labels alongside icons in chrome; tooltips carry meaning.

### Dropdowns and Menus (Fuselage `Dropdown`, `Option`, `MenuV2`)

- **Surface:** `white` with Fuselage's `elevation-2` shadow (the only allowed shadow in the shell).
- **Items:** `OptionIcon` + `OptionContent`, single line, `p2` body typography.
- **Section labels:** `rcx-option__title` uppercased by Fuselage; source is sentence case ("Workspace").
- **Dangerous items:** `variant='danger'` (Fuselage colors `font-danger` text on hover background `danger-100`).
- **Dividers:** `OptionDivider` paints `neutral-400` hairline.

### Badges (Fuselage `Badge`, exact level mapping)

- **`level-0` / variant unset:** `neutral-400` background (disabled state).
- **`level-1` / `variant='secondary'`:** `neutral-600` (`#9ea2a8`) background, white text. Unread count.
- **`level-2` / `variant='primary'`:** `primary-550` (`#1d74f5`) background. Not used in the rail.
- **`level-3` / `variant='warning'`:** `service-1-500` (`#f38c39`) orange background. Not-logged-in state.
- **`level-4` / `variant='danger'`:** `danger-550` (`#f5455c`) background. Reserved.

All badges use `rounded.full` and white text.

## 6. Do's and Don'ts

### Do:

- **Do** import primitives from `@rocket.chat/fuselage` first. Compose `Box`, `Button`, `IconButton`, `Badge`, `Dialog`, `Tabs`, `Dropdown`, `Option`, `MenuV2`, `Scrollable` before reaching for `styled` or `@emotion/css`. Acceptable web-only divergences: server rail, native dialogs, platform-specific affordances.
- **Do** reference colors via `--rcx-color-*` CSS custom properties (emitted by `PaletteStyleTag`). The hardcoded `#2f343d` / `#d7dbe0` fallbacks in `SideBar/styles.tsx` and `Shell/styles.tsx` exist for hydration races, not for reuse.
- **Do** use Fuselage `fontScale='h1'` / `'p2'` / `'c1'` etc. on `Box` and components rather than raw `font-size` literals.
- **Do** keep the 44-pixel rail width sacred. Tooltips carry labels; the rail does not widen.
- **Do** use the 4-pixel left selection stripe as the only selected-state decoration. Repeat it if a new affordance needs the gesture.
- **Do** respect `prefers-reduced-motion` on every shell transition (sidebar selection slide, dialog enter, badge appearance).
- **Do** keep `Badge variant='secondary'` (gray) for unread counts and `variant='warning'` (orange) for not-logged-in. Never recolor a Badge by overriding its CSS.
- **Do** keep mention-count and warning badges in their existing positions: top-right of the avatar at `translate(30%, -30%)`.
- **Do** verify both light and dark themes (`PaletteStyleTag` resolves against `machineTheme` + `userThemePreference`) hit WCAG 2.2 AA contrast before merging a color change.
- **Do** use sentence case in source strings; Fuselage applies title or uppercase at the component layer when needed.

### Don't:

- **Don't** use Discord/gamer aesthetics: no neon accents, no drenched dark purple, no playful microcopy, no animated reactions in chrome.
- **Don't** revive old Skype or legacy Teams chrome: no heavy gradients, no layered drop shadows, no decorative iconography in titlebars, no busy multi-row toolbars.
- **Don't** use generic SaaS marketing patterns inside the app: no hero metric tiles, no identical icon-and-title card grids, no gradient accents on numbers.
- **Don't** pursue pure brand minimalism (Linear-empty) at the cost of sidebar density. The shell's value is showing many servers at once.
- **Don't** use `border-left` or `border-right` greater than 1px as a colored stripe anywhere other than the canonical 4-pixel server selection stripe. That stripe is the entire vocabulary.
- **Don't** use `background-clip: text` gradient text. Solid Fuselage tokens only.
- **Don't** introduce glassmorphism as a stylistic choice. macOS vibrancy is OS-provided and acceptable; CSS `backdrop-filter` on rendered surfaces is forbidden.
- **Don't** author `box-shadow` in shell-owned CSS. Depth through tonal stepping; rely on Fuselage's overlay shadow on `Dropdown` and `Dialog`.
- **Don't** strip Inter out of the font stack. Inter first, system fallback behind it. The current `Shell/styles.tsx` `font-family: system-ui` line predates the Fuselage Inter migration and should be aligned.
- **Don't** wrap shell content in card grids. The shell is a rail, a webview canvas, and dialogs.
- **Don't** use modals as the first thought for new flows. The sidebar context menu (`Dropdown`) and inline settings tabs are better placements; reach for `Dialog` only when interruption is genuinely required.
- **Don't** rename, recolor, or re-style Fuselage `Badge`, `Option`, `Tabs`, `Dropdown`, `IconButton` primitives. Override only via accepted Fuselage props.
- **Don't** confuse the Badge variants: unread count is `secondary` (gray), not-logged-in is `warning` (orange), and `danger` (red) is reserved for true alerts. Red mention badges are not part of this design system.
- **Don't** invent a `border-radius` value outside `2 / 4 / 8 / 9999` pixels. Spacing literals outside Fuselage's 4-multiple scale (plus 1 and 2) are also disallowed.
- **Don't** add a settings divergence between light and dark themes. Both themes must offer the same affordances; only the palette resolves differently.
- **Don't** use em dashes anywhere in shell copy. Commas, colons, semicolons, periods, parentheses only.
