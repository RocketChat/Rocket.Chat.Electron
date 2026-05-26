---
name: Rocket.Chat Desktop
description: Native desktop shell around one or more Rocket.Chat server webviews.
colors:
  surface-light: "#ffffff"
  surface-tint: "#f7f8fa"
  surface-room: "#ffffff"
  surface-neutral: "#e4e7ea"
  surface-hover: "#f2f3f5"
  surface-selected: "#d7dbe0"
  surface-sidebar: "#e4e7ea"
  surface-overlay: "#2f343d80"
  stroke-extra-light: "#e4e7ea"
  stroke-light: "#cbced1"
  stroke-medium: "#9ea2a8"
  stroke-dark: "#6c737a"
  stroke-extra-dark: "#2f343d"
  stroke-highlight: "#156ff5"
  stroke-error: "#ec0d2a"
  font-default: "#2f343d"
  font-titles-labels: "#1f2329"
  font-secondary-info: "#6c737a"
  font-hint: "#6c737a"
  font-annotation: "#9ea2a8"
  font-disabled: "#cbced1"
  font-info: "#095ad2"
  font-danger: "#d40c26"
  font-white: "#ffffff"
  button-background-primary-default: "#1d74f5"
  button-background-primary-hover: "#095ad2"
  button-background-primary-press: "#10529e"
  button-background-secondary-default: "#e4e7ea"
  button-background-danger-default: "#ec0d2a"
  button-background-danger-hover: "#d40c26"
  badge-background-level-0: "#e4e7ea"
  badge-background-level-1: "#6c737a"
  badge-background-level-2: "#1d74f5"
  badge-background-level-3: "#f38c39"
  badge-background-level-4: "#f5455c"
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
    backgroundColor: "{colors.surface-sidebar}"
    width: "44px"
    padding: "8px 0"
  server-button:
    backgroundColor: "{colors.surface-tint}"
    rounded: "{rounded.medium}"
    size: "28px"
  server-button-selected:
    backgroundColor: "{colors.surface-selected}"
  badge-mention-count:
    backgroundColor: "{colors.badge-background-level-1}"
    textColor: "{colors.font-white}"
    rounded: "{rounded.full}"
  badge-warning:
    backgroundColor: "{colors.badge-background-level-3}"
    textColor: "{colors.font-white}"
    rounded: "{rounded.full}"
  dialog:
    backgroundColor: "{colors.surface-light}"
    textColor: "{colors.font-default}"
    rounded: "{rounded.medium}"
    padding: "24px"
  topbar:
    backgroundColor: "{colors.surface-tint}"
    height: "22px"
  button-primary:
    backgroundColor: "{colors.button-background-primary-default}"
    textColor: "{colors.font-white}"
    rounded: "{rounded.medium}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.button-background-primary-hover}"
  button-primary-press:
    backgroundColor: "{colors.button-background-primary-press}"
  button-danger:
    backgroundColor: "{colors.button-background-danger-default}"
    textColor: "{colors.font-white}"
    rounded: "{rounded.medium}"
    padding: "8px 16px"
  button-danger-hover:
    backgroundColor: "{colors.button-background-danger-hover}"
---

# Design System: Rocket.Chat Desktop

## 1. Overview

**Creative North Star: "The Workshop Wall"**

The desktop shell is a tool rail: a quiet 44-pixel column of workspaces hung along the side of a screen, each one sized for instant reach. Like a workshop wall, every tool has its place, density is the point, and the rail itself is invisible during work. Users move through the rail without thinking; they only notice it when a server badge calls them back, when they drag a workspace to reorder it, or when a dialog steps forward to handle something the browser cannot.

The visual system inherits directly from Fuselage. Tokens are sourced from `@rocket.chat/fuselage-tokens` and emitted at runtime by `PaletteStyleTag` (`packages/fuselage/src/components/PaletteStyleTag/PaletteStyleTag.tsx`) as `--rcx-color-*` CSS custom properties keyed by category: `surface-*`, `font-*`, `stroke-*`, `badge-background-level-*`, `button-background-*`, `status-background-*`, `status-font-on-*`, `status-bullet-*`, `shadow-*`. **Three themes ship: `light`, `dark`, and `high-contrast`.** The shell picks its theme via `userThemePreference` falling back to `machineTheme`. The Electron shell does not invent colors, weights, radii, or spacing values outside that scheme.

This system explicitly rejects four neighbors. It is not Discord (no neon, no drenched purple, no playful microcopy). It is not legacy Skype or Teams (no heavy gradients, no decorative iconography in the titlebar, no busy toolbar). It is not generic SaaS marketing (no hero metric tiles, no identical card grids, no gradient accents on numbers). And it is not Linear-minimalism for its own sake (sidebar density matters; sparse-when-it-could-be-useful is a regression).

**Key Characteristics:**

- 44-pixel server rail as the signature surface.
- Flat by default, depth through tonal tint shifts. Adjacent surfaces step by exactly one tint.
- Inter primary, system stack fallback (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, ...`).
- One accent gesture: the 4-pixel selection stripe to the left of the active server in `surface-selected`.
- Color follows runtime Fuselage CSS variables emitted by `PaletteStyleTag`. Three themes: light, dark, high-contrast.
- Native per-platform: macOS vibrancy + 22-pixel drag bar, Windows Mica, Linux fallback.

## 2. Colors

Tokens are sourced from `@rocket.chat/fuselage-tokens/dist/<category>.json` (`badge`, `button`, `font`, `shadow`, `status`, `statusBullet`, `stroke`, `surface`) and emitted by `PaletteStyleTag` as `--rcx-color-<category>-<role>` CSS variables. **All hex values below are light-theme; dark-theme and high-contrast resolve through the same variable name to different values.** The desktop shell never reads palette grades (`n400`, `b500`) directly; it always reads the semantic variable.

### Primary
- **Action Blue** (`#1d74f5`, oklch(58% 0.20 257), `--rcx-color-button-background-primary-default`): The dominant action color. Primary buttons, focus rings inside dialogs. Hover steps to `button-background-primary-hover` (`#095ad2`), press to `button-background-primary-press` (`#10529e`). Disabled background `button-background-primary-disabled`. Source: `colors.b500` via `fuselage-tokens/dist/button.json`. **Do not confuse with `status-background-info`** (`#d1ebfe`), which is the light tint used behind info banners.

### Secondary
- **Mention Slate** (`#6c737a`, oklch(52% 0.012 256), `--rcx-color-badge-background-level-1`): The unread-mention count badge background. Fuselage `Badge variant='secondary'`. Source: `colors.n700` via `fuselage-tokens/dist/badge.json`. The badge is a count, not an alarm; gray is intentional.

### Tertiary
- **Caution Orange** (`#f38c39`, oklch(72% 0.16 51), `--rcx-color-badge-background-level-3`): The warning-state badge shown over a server avatar when the user is not logged in. Fuselage `Badge variant='warning'`. Source: `colors.o500`.
- **Alert Crimson** (`#f5455c`, oklch(65% 0.22 18), `--rcx-color-badge-background-level-4`): Reserved for true alerts requiring user response. Fuselage `Badge variant='danger'`. Source: `colors.r500`. Not currently in the rail vocabulary.
- **Destructive Red** (`#ec0d2a`, oklch(57% 0.23 24), `--rcx-color-button-background-danger-default`): Background of destructive confirmation buttons (Remove server, Clear cache). Hover steps to `--rcx-color-button-background-danger-hover` (`#d40c26`). Source: `colors.r500` family.

### Neutral surfaces
- **Working Surface** (`#ffffff`, `--rcx-color-surface-light`): Dialog interiors.
- **Wall Cream** (`#f7f8fa`, `--rcx-color-surface-tint`): The light sidebar background fill.
- **Room** (`#ffffff` in light theme, `#1F2329` in dark, white in high-contrast, `--rcx-color-surface-room`): The full-window panel surface used by SettingsView and DownloadsManagerView. **Theme-following.** The earlier hardcoded `#2f343d` in `Shell/styles.tsx` and `SideBar/styles.tsx` is a pre-hydration backstop only; once `PaletteStyleTag` mounts it is overridden. Do not treat the hex literal as a token.
- **Hover** (`#f2f3f5`, `--rcx-color-surface-hover`): Row hover background. Applied by Fuselage `TableRow action`, `Option`, `MenuItem`, and by the custom hairline-row pattern in `DownloadItem`.
- **Selected** (`#d7dbe0`, `--rcx-color-surface-selected`): The fill of the 4-pixel selection stripe and the hover background on rail items.
- **Sidebar** (`#e4e7ea`, `--rcx-color-surface-sidebar`): Available for sidebar-bg overrides.
- **Neutral / Disabled / Dark / Featured / Featured-Hover / Overlay**: full set available via `--rcx-color-surface-*`. Use only when their semantic role applies.

### Font
- `font-default` (`#2f343d`): default text on light surfaces.
- `font-titles-labels` (`#1f2329`): headings, titles.
- `font-secondary-info` (`#6c737a`): metadata, secondary info, hint subtitles. Equivalent to `font-hint`.
- `font-annotation` (`#9ea2a8`): annotation text.
- `font-disabled` (`#cbced1`).
- `font-info` (`#095ad2`): info-state text.
- `font-danger` (`#d40c26`): error-state text.
- `font-white` (`#ffffff`): text on saturated backgrounds (primary button, mention badge).
- `font-pure-white` / `font-pure-black`: bypass theme. Use sparingly.

### Stroke
Nine semantic stroke tokens are available. Most used in the shell:
- `stroke-extra-light` (`#e4e7ea`): row dividers, faint hairlines.
- `stroke-light` (`#cbced1`): default border on inputs and ghost buttons.
- `stroke-medium` / `stroke-dark` / `stroke-extra-dark`: progressively heavier.
- `stroke-highlight` (`#156ff5`): focus ring on Fuselage inputs.
- `stroke-error` (`#ec0d2a`): error-state input border.

### Named Rules

**The Fuselage Truth Rule.** Every color in the desktop shell resolves to a `--rcx-color-*` custom property emitted by `PaletteStyleTag`. Hardcoded fallbacks (`#2f343d`, `#d7dbe0`) inside `src/ui/components/SideBar/styles.tsx` and `Shell/styles.tsx` exist only as pre-hydration backstops. Do not reuse those literal hex codes anywhere else; reference the CSS variable, and never assume the fallback hex is the live value.

**The Three-Theme Rule.** Every shell color choice must look correct in `light`, `dark`, and `high-contrast`. Verify all three (cycle via `userThemePreference` setting). High-contrast is not optional for this product (PRODUCT.md mandates WCAG 2.2 AA plus government and healthcare extras).

**The One Stripe Rule.** The 4-pixel left stripe on the selected server button is the entire decorative vocabulary of the rail. Do not add second stripes, glows, halos, or contrast borders to indicate selection elsewhere. If a new affordance needs to signal selection, repeat the stripe.

**The Quiet Mention Rule.** The mention-count badge is `Badge variant='secondary'`: gray (`badge-background-level-1`, `#6c737a`), white text. Not red. The badge is a number, not an alarm. Red (`badge-background-level-4`, `#f5455c`) is reserved for `variant='danger'` on true alerts. Warning state (not-logged-in) uses `variant='warning'`: orange (`badge-background-level-3`).

**The Semantic-Token-First Rule.** Read tokens through their semantic name (`--rcx-color-button-background-primary-default`, `--rcx-color-font-default`), never through palette grades (`--rcx-color-primary-500`, `--rcx-color-neutral-800`). Palette-grade vars are not emitted by `PaletteStyleTag`; they exist only as SCSS fallbacks. The TS palette pipeline maps `primary → b`, `danger → r`, `success → g`, `warning → y`, `neutral → n`, which is why semantic tokens are the only stable contract.

## 3. Typography

**Display Font:** Inter (with fallback `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif`).
**Body Font:** Inter (same stack).
**Mono Font:** `Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace`. Reserved for code surfaces.

**Character:** Inter is the Fuselage standard (`fuselage-tokens/src/typography/base.json`, `fontFamilies.sans`). Where Inter is unavailable the stack falls back to the host OS font.

### Hierarchy

Use Fuselage `fontScale` props on `Box` and components rather than raw CSS. Each scale entry below comes verbatim from `fuselage-tokens/typography.json`.

- **hero** (800, 48 / 64): Splash screens, marketing-style hero blocks. Not used inside the shell after first paint.
- **h1** (700, 32 / 40): Reserved.
- **h2** (700, 24 / 32): SettingsView and DownloadsManagerView titles.
- **h3** (700, 20 / 28): Subsection titles, large dialog titles.
- **h4** (700, 16 / 24): Form group labels, section headers in GeneralTab / DeveloperTab / CertificatesManager.
- **h5** (700, 14 / 20): Compact list-item titles.
- **p1 / p1m / p1b** (16 / 24 at 400 / 500 / 700): Primary running copy in dialogs.
- **p2 / p2m / p2b** (14 / 20 at 400 / 500 / 700): Default shell body. Tooltips, settings rows, dropdown items.
- **c1** (400, 12 / 16): Server initials, badge numbers, hint subtitles, metadata.
- **c2** (700, 12 / 16): Emphasized micro-labels.
- **micro** (700, 10 / 12): Extreme density. Not currently used in the shell.

### Named Rules

**The fontScale Rule.** Use Fuselage `fontScale='p2'` (or other key) on `Box` rather than raw `font-size` literals. Pixel literals drift; scale tags are the contract.

**The Inter-First Rule.** Inter at the front of the family stack. Do not strip back to `system-ui`. The existing `font-family: system-ui` in `Shell/styles.tsx:37` predates the Inter migration in Fuselage and is a known drift item.

**The Sentence Case Rule.** All shell strings are sentence case in source. Fuselage applies title case or uppercase at the component layer when needed (e.g. `Option.title` is uppercased by CSS).

## 4. Elevation

Flat by default with tonal layering. Depth steps through neutrals (`surface-room` → `surface-tint` → `surface-light`/`surface-selected` → `surface-hover`). The sanctioned shadow vocabulary lives in `--rcx-color-shadow-*` tokens emitted by `PaletteStyleTag` and is applied by Fuselage transient-overlay components.

### Shadow Vocabulary (inherited, not authored)
- `--rcx-color-shadow-highlight`: focus ring on input-like surfaces.
- `--rcx-color-shadow-danger`: error-state ring.
- `--rcx-color-shadow-elevation-border`: hairline edge accent on elevated surfaces.
- `--rcx-color-shadow-elevation-1`: default tile lift.
- `--rcx-color-shadow-elevation-2x` and `-2y`: modal-tier lift on Dialog and Dropdown.

### Named Rules

**The Tonal Step Rule.** Adjacent shell surfaces differ by exactly one tint step. Stacking two surfaces of the same tint is a layout bug.

**The Shadow Tenancy Rule.** Shadows belong to Fuselage's transient overlays and to the OS-native layer (window chrome, vibrancy backdrops). The shell does not author `box-shadow` in any CSS it owns. If a thing looks like it wants a shadow, it wants a tonal step or a hairline.

## 5. Components

### Server Button (signature)

- **Shape:** Fuselage `IconButton small secondary` (28-pixel square hit target with 4-pixel radius), wrapped in a 44-pixel-wide list item.
- **Default:** Favicon or two-letter `Initials` on `surface-tint`. Initials use `c1` typography.
- **Hover:** Background steps to `surface-selected`.
- **Selected:** A 4-pixel-wide, 28-pixel-tall vertical bar in `surface-selected` (`#d7dbe0`) positioned `left: -8px` outside the button, right-edge radius `0 4px 4px 0`. Height transitions on `var(--transitions-duration)`. (`src/ui/components/SideBar/styles.tsx:22-49`.) Entire selected-state vocabulary.
- **Unread count:** Fuselage `Badge variant='secondary'` (gray, `badge-background-level-1` = `#6c737a`) anchored top-right with `translate(30%, -30%)`.
- **Not logged in:** Fuselage `Badge variant='warning'` (orange, `badge-background-level-3` = `#f38c39`), same anchor.
- **Drag:** Opacity 0.5 while dragged. No border highlight on the drop target.
- **Context menu:** Fuselage `Dropdown` with `Option`s: Reload, Copy URL, Open Dev Tools, Server Info, Reload Clearing Cache, divider, Remove (`variant='danger'`).

### Sidebar Rail

- **Width:** Exactly 44 pixels.
- **Background:** `surface-tint` in opaque mode; `undefined` on macOS when `isTransparentWindowEnabled` (vibrancy passes through).
- **Padding:** `paddingBlockStart={8} paddingBlockEnd={8}`.
- **Layout:** Vertical `ButtonGroup large` of server buttons at the top, `MenuV2` (Downloads, Settings) anchored at the bottom.

### TopBar (macOS only)

- **Render:** `process.platform === 'darwin'` only.
- **Background:** `surface-tint` (or `undefined` for vibrancy).
- **Height:** 22-pixel drag bar above the rail.

### SettingsView / DownloadsManagerView

Full-window panels layered over the webview.
- **Background:** `bg='room'` (Fuselage prop). Theme-following.
- **Title:** `fontScale='h2'` with `pi={24} pbs={24} pbe={16}` rhythm.
- **Tabs:** Wrapped in `<Box pi={24}>` to share the content gutter.
- **Scroll content:** Inside `<Scrollable>` with `pi={24} pbs/pbe={16-24}` padding (never `m=` margin).
- **Esc:** Dismisses the view via `onKeyDown` on the root `<Box>` (`tabIndex={-1}` to capture).

### Dialogs (About, Update, Clear Cache, Screen Sharing, etc.)

- **Surface:** Fuselage `Dialog` on `surface-light`.
- **Corner:** `rounded.medium` (4px).
- **Internal padding:** 24px on the outer Box; tighter inside form rows.
- **Title:** `fontScale='h2'` or `h3`.
- **Body:** `p1`, max 65 to 75 characters per line.
- **Actions:** Right-aligned `ButtonGroup`. Primary uses `button-primary`; destructive uses `button-danger`.

### Settings sections

GeneralTab, DeveloperTab, and CertificatesManager all use the same `<Section>` shape: `fontScale='h4'` title, optional `c1` hint paragraph, contents inside a `FieldGroup` (settings) or content body (certs). Sections separate with `mbs={32}`. First section uses `mbs={0}`.

### List rows (Downloads, Certificates)

Two list surfaces share one row affordance pattern:
- A 1-pixel `--rcx-color-stroke-extra-light` divider above each row (`:first-of-type` skipped).
- A hover background of `--rcx-color-surface-hover`.
- For Tables: Fuselage `<TableRow action>` carries this behavior natively. Do not use `striped` (clashes with `surface-room`).
- For Box-based rows (DownloadItem): emotion `@rocket.chat/css-in-js` `css` block applies the divider + hover, with symmetric `pbs={16} pbe={16}` padding instead of `mbe={24}` so the hover bg reaches edge to edge.

### Buttons (Fuselage `Button`)

- **Primary:** `button-background-primary-default = #1d74f5`. Hover `#095ad2`, press `#10529e`. Font `font-white`. Used for the dominant action in any dialog.
- **Secondary:** `button-background-secondary-default = #e4e7ea`. Hover `#cbced1`, press `#9ea2a8`. Font `font-default`.
- **Danger:** `button-background-danger-default = #ec0d2a`. Hover `#d40c26`. Used only for Remove Server, Clear Cache, equivalent destructive confirmations.
- **Warning:** `button-background-warning-default = warning-400`. Font `font-default` (dark text on yellow).
- **Success:** `button-background-success-default = success-500`. Font `font-default`.
- **Icon buttons:** Fuselage `IconButton small secondary` is the rail and chrome default. No labels alongside icons in chrome; tooltips carry meaning.
- **Variants Fuselage does NOT have in this repo:** `ghost`. Do not pass that prop. Use `secondary` for subtle non-primary actions.

### Dropdowns and Menus (Fuselage `Dropdown`, `Option`, `MenuV2`)

- **Surface:** `surface-light` with Fuselage `shadow-elevation-2x`/`2y`.
- **Items:** `OptionIcon` + `OptionContent`, single line, `p2`.
- **Section labels:** `rcx-option__title` uppercased by Fuselage; source is sentence case.
- **Dangerous items:** `variant='danger'` (Fuselage `font-danger` text).
- **Dividers:** `OptionDivider` paints `stroke-extra-light`.

### Badges (Fuselage `Badge`, exact level mapping)

`variant` prop maps to `badge-background-level-*` tokens. **Live light-theme hex from `fuselage-tokens/badge.json`:**

| variant | level | light hex | dark hex | use |
|---|---|---|---|---|
| (none) | 0 | `#e4e7ea` (n400) | `#404754` | disabled state |
| `secondary` | 1 | `#6c737a` (n700) | `#484C51` | unread count |
| `primary` | 2 | `#1d74f5` (b500) | `#2C65BA` | not used in rail |
| `warning` | 3 | `#f38c39` (o500) | `#955828` | not-logged-in |
| `danger` | 4 | `#f5455c` (r500) | `#B43C4C` | reserved alerts |

All badges use `rounded.full` and white text.

## 6. Do's and Don'ts

### Do:

- **Do** import primitives from `@rocket.chat/fuselage` first. Compose `Box`, `Button`, `IconButton`, `Badge`, `Dialog`, `Tabs`, `Dropdown`, `Option`, `MenuV2`, `Scrollable`, `Table` before reaching for `styled` or `@emotion/css`.
- **Do** reference colors via the semantic `--rcx-color-<category>-<role>` CSS custom properties emitted by `PaletteStyleTag`. Never hand-code palette-grade vars like `--rcx-color-primary-500`; those are SCSS-only and not emitted at runtime.
- **Do** use Fuselage `fontScale='h1'` / `'p2'` / `'c1'` etc. on `Box` and components rather than raw `font-size` literals.
- **Do** keep the 44-pixel rail width sacred.
- **Do** use the 4-pixel left selection stripe as the only selected-state decoration. Repeat it if a new affordance needs the gesture.
- **Do** respect `prefers-reduced-motion` on every shell transition.
- **Do** keep `Badge variant='secondary'` (gray) for unread counts and `variant='warning'` (orange) for not-logged-in.
- **Do** verify every color choice in light, dark, **and high-contrast** themes before merging.
- **Do** use sentence case in source strings; Fuselage applies title or uppercase at the component layer when needed.
- **Do** apply the shared row affordance (`<TableRow action>` for tables; hairline+hover via emotion `css` for Box rows) to every new list surface.
- **Do** use Fuselage `Box withTruncatedText` and a `title={...}` tooltip for long URLs, file names, and identifiers.
- **Do** use `pi/pbs/pbe` Fuselage spacing shorthand on multiples of 4 (and 1, 2 where Fuselage allows).

### Don't:

- **Don't** use Discord/gamer aesthetics: no neon accents, no drenched dark purple, no playful microcopy.
- **Don't** revive old Skype or legacy Teams chrome: no heavy gradients, no decorative iconography in titlebars.
- **Don't** use generic SaaS marketing patterns: no hero metric tiles, no identical icon-and-title card grids, no gradient accents on numbers.
- **Don't** pursue Linear-empty minimalism at the cost of sidebar density.
- **Don't** use `border-left` or `border-right` greater than 1px as a colored stripe anywhere other than the canonical 4-pixel server selection stripe.
- **Don't** use `background-clip: text` gradient text.
- **Don't** introduce glassmorphism as a stylistic choice. OS-provided vibrancy is acceptable; CSS `backdrop-filter` is forbidden.
- **Don't** author `box-shadow` in shell-owned CSS. Depth through tonal stepping; rely on Fuselage's overlay shadow for `Dropdown` and `Dialog`.
- **Don't** treat the hardcoded `#2f343d` or `#d7dbe0` fallbacks as design tokens. They are pre-hydration backstops only. The live value of `surface-room` is `#ffffff` in light theme.
- **Don't** pass a `ghost` prop to Fuselage `Button` (does not exist on this version). Use `secondary` for the subtle variant.
- **Don't** use `Table striped`. The stripe clashes with `bg='room'` and violates the Tonal Step Rule. Use `<TableRow action>` for hover affordance instead.
- **Don't** strip Inter out of the font stack.
- **Don't** wrap shell content in card grids.
- **Don't** use modals as the first thought for new flows.
- **Don't** rename, recolor, or re-style Fuselage `Badge`, `Option`, `Tabs`, `Dropdown`, `IconButton` primitives.
- **Don't** confuse Badge variants: unread is `secondary` (gray `#6c737a`), not-logged-in is `warning` (orange), danger (`#f5455c`) is reserved for true alerts. Red mention badges are not part of this design system.
- **Don't** invent `border-radius` outside `2 / 4 / 8 / 9999` pixels.
- **Don't** add a settings divergence between light, dark, and high-contrast themes. All three must offer the same affordances; only the palette resolves differently.
- **Don't** use em dashes anywhere in shell copy. Commas, colons, semicolons, periods, parentheses only.
