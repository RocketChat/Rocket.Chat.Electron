import type { LogLevel } from './types';

export type PaletteTheme = 'light' | 'dark';

export const isDarwin = process.platform === 'darwin';

/**
 * The main process encodes the sampled transparency setting in the window URL
 * so the first paint already matches the window it lives in — an IPC round trip
 * would flash an opaque surface over the vibrancy first.
 */
export const isTransparentWindow = ((): boolean => {
  try {
    return (
      new URLSearchParams(window.location.search).get('transparent') === 'true'
    );
  } catch {
    return false;
  }
})();

export type Surfaces = {
  /** Toolbar, sidebar and status bar: the window material shows through. */
  chrome: string;
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

export const resolveSurfaces = (
  theme: PaletteTheme,
  isTransparent: boolean
): Surfaces => ({
  chrome: isTransparent ? 'transparent' : 'var(--rcx-color-surface-tint)',
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
