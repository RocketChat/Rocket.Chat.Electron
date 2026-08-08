import type { LogLevel } from './types';

export type PaletteTheme = 'light' | 'dark';

export const isDarwin = process.platform === 'darwin';

/**
 * The setting as of window creation, encoded in the page URL by the main process
 * so the first paint already matches — an IPC round trip would flash an opaque
 * surface over the vibrancy first. Live changes arrive over IPC afterwards; see
 * `useTransparency`.
 */
export const readInitialTransparency = (): boolean => {
  try {
    return (
      new URLSearchParams(window.location.search).get('transparent') === 'true'
    );
  } catch {
    return false;
  }
};

export type Surfaces = {
  /**
   * The window's own background, painted once on the root container. The
   * toolbar, sidebar, status bar and the gutter around the card all paint
   * nothing and let this show through, so there is a single continuous panel
   * behind the card instead of bars that each carry their own fill.
   */
  panel: string;
  /** Log list: kept closer to opaque so monospace text stays legible. */
  list: string;
  /** Sticky day header: must be opaque enough to hide rows sliding under it. */
  sticky: string;
  hover: string;
  selected: string;
  divider: string;
  strongDivider: string;
};

/**
 * Over a vibrant window the list gets a translucent scrim rather than staying
 * fully see-through: monospace log text over live desktop content is unreadable.
 */
const TRANSLUCENT_LIST_SCRIM: Record<PaletteTheme, string> = {
  dark: 'rgba(0, 0, 0, 0.28)',
  light: 'rgba(255, 255, 255, 0.58)',
};

/**
 * The sticky header sits over scrolling rows, so over a vibrant window it needs
 * a heavier fill than the list scrim — otherwise text slides visibly under it.
 */
const TRANSLUCENT_STICKY_FILL: Record<PaletteTheme, string> = {
  dark: 'rgba(30, 30, 32, 0.86)',
  light: 'rgba(246, 246, 248, 0.9)',
};

const HOVER_FILL: Record<PaletteTheme, string> = {
  dark: 'rgba(255, 255, 255, 0.07)',
  light: 'rgba(0, 0, 0, 0.045)',
};

const SELECTED_FILL: Record<PaletteTheme, string> = {
  dark: 'rgba(255, 255, 255, 0.12)',
  light: 'rgba(0, 0, 0, 0.075)',
};

/**
 * Opaque window background behind the card. It has to read as *recessed*, or the
 * card's rounded corners look like a hole punched in a lighter surface rather
 * than a raised panel.
 *
 * `surface-tint` gives that in the light palette — a grey behind a white card —
 * but inverts in the dark one, where it is lighter than `surface-light`. So the
 * dark panel is mixed down from the card colour instead of taken from a token.
 */
const OPAQUE_PANEL: Record<PaletteTheme, string> = {
  dark: 'color-mix(in srgb, var(--rcx-color-surface-light) 84%, black)',
  light: 'var(--rcx-color-surface-tint)',
};

export const resolveSurfaces = (
  theme: PaletteTheme,
  isTransparent: boolean
): Surfaces => ({
  panel: isTransparent ? 'transparent' : OPAQUE_PANEL[theme],
  list: isTransparent
    ? TRANSLUCENT_LIST_SCRIM[theme]
    : 'var(--rcx-color-surface-light)',
  sticky: isTransparent
    ? TRANSLUCENT_STICKY_FILL[theme]
    : 'var(--rcx-color-surface-tint)',
  hover: HOVER_FILL[theme],
  selected: SELECTED_FILL[theme],
  divider: 'var(--rcx-color-stroke-extra-light)',
  strongDivider: 'var(--rcx-color-stroke-light)',
});

/**
 * The log area is an inset card floating over the window chrome, matching the
 * main window's shell: the toolbar, sidebar and status bar then read as one
 * background panel rather than as stacked bars.
 */
export const CARD_INSET = 4;
export const CARD_RADIUS = isDarwin ? 14 : 8;

export type CardStyle = {
  border: string;
  boxShadow: string;
};

/**
 * The main window hardcodes a dark hairline, which it can because its chrome is
 * pinned to the dark palette. This window follows the OS theme, so the hairline
 * has to invert or it disappears against a dark panel.
 */
export const resolveCardStyle = (theme: PaletteTheme): CardStyle => ({
  border: `1px solid ${
    theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
  }`,
  boxShadow: `0 0 3px 0 ${
    theme === 'dark' ? 'rgba(0, 0, 0, 0.45)' : 'rgba(0, 0, 0, 0.1)'
  }`,
});

export const LEVEL_ACCENT: Record<LogLevel, string> = {
  error: 'var(--rcx-color-status-font-on-danger)',
  warn: 'var(--rcx-color-status-font-on-warning)',
  info: 'var(--rcx-color-status-font-on-info)',
  debug: 'var(--rcx-color-font-hint)',
  verbose: 'var(--rcx-color-font-annotation)',
  silly: 'var(--rcx-color-font-annotation)',
};

export const LEVEL_BADGE_VARIANT: Record<
  LogLevel,
  'danger' | 'warning' | 'primary' | 'secondary' | 'ghost'
> = {
  error: 'danger',
  warn: 'warning',
  info: 'primary',
  debug: 'secondary',
  verbose: 'ghost',
  silly: 'ghost',
};

export const LOG_LEVELS: LogLevel[] = [
  'error',
  'warn',
  'info',
  'debug',
  'verbose',
  'silly',
];
