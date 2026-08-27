/**
 * Shared chrome for the app's secondary windows (log viewer, downloads).
 *
 * They follow the main window's shell: an inset rounded card holding the
 * content, floating over a single continuous panel that the toolbar, sidebar and
 * status bar all sit on without painting anything themselves.
 */

export type PaletteTheme = 'light' | 'dark';

export const isDarwin = process.platform === 'darwin';
export const isWindows = process.platform === 'win32';

/** Platforms where the toolbar replaces the native title bar entirely. */
export const hasInAppTitleBar = isDarwin || isWindows;

/**
 * Height of the toolbar, which doubles as the window drag region on macOS.
 *
 * The main window's tab strip reads from this too, so the app has one title bar
 * height rather than two that drift.
 */
export const TOOLBAR_HEIGHT = 40;

/**
 * macOS traffic light geometry. The three buttons are 12px wide with 8px gaps
 * between them, so the cluster is 52px wide and ends at `TRAFFIC_LIGHTS_X + 52`.
 */
const TRAFFIC_LIGHT_DIAMETER = 12;
const TRAFFIC_LIGHTS_WIDTH = TRAFFIC_LIGHT_DIAMETER * 3 + 8 * 2;

export const TRAFFIC_LIGHTS_X = 16;
/** Vertically centred in the toolbar, since the toolbar is the title bar. */
export const TRAFFIC_LIGHTS_Y = Math.round(
  (TOOLBAR_HEIGHT - TRAFFIC_LIGHT_DIAMETER) / 2
);
/** Where toolbar content may start without colliding with the buttons. */
export const TRAFFIC_LIGHTS_INSET =
  TRAFFIC_LIGHTS_X + TRAFFIC_LIGHTS_WIDTH + 16;

/**
 * Width of the Windows caption buttons drawn into the toolbar: three 46px
 * buttons, the metric the OS itself uses. The toolbar reserves as much again at
 * its leading edge so the title stays centred in the window rather than in what
 * is left of it.
 */
export const WINDOW_CONTROLS_WIDTH = 46 * 3;

/**
 * Window options that hand the title bar over to the toolbar, matching what the
 * main window does on each platform: macOS keeps its traffic lights floating
 * over the toolbar, Windows hides the caption entirely and the toolbar draws its
 * own buttons, and Linux keeps its native frame.
 */
export const getTitleBarOptions = () => {
  if (isDarwin) {
    return {
      titleBarStyle: 'hiddenInset' as const,
      trafficLightPosition: { x: TRAFFIC_LIGHTS_X, y: TRAFFIC_LIGHTS_Y },
    };
  }

  if (isWindows) {
    return { titleBarStyle: 'hidden' as const };
  }

  return {};
};

/**
 * Secondary windows are never full-screen surfaces of their own.
 *
 * On macOS a window created while the app is in full screen is otherwise given
 * full screen itself, which is how opening Downloads from a full-screen
 * workspace ended up replacing it rather than appearing alongside it.
 */
export const NOT_FULL_SCREENABLE = { fullscreenable: false } as const;

/** Width of the filters sidebar. */
export const SIDEBAR_WIDTH = 248;

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
  /** Content card: kept close to opaque so text stays legible over vibrancy. */
  card: string;
  /** Sticky headers: opaque enough to hide content sliding under them. */
  sticky: string;
  /** Input fill: a tint of the palette's opposite, so it reads on either. */
  field: string;
  hover: string;
  selected: string;
  divider: string;
};

/**
 * Over a vibrant window the card gets a translucent scrim rather than staying
 * fully see-through: text over live desktop content is unreadable.
 */
const TRANSLUCENT_CARD_SCRIM: Record<PaletteTheme, string> = {
  dark: 'rgba(0, 0, 0, 0.28)',
  light: 'rgba(255, 255, 255, 0.58)',
};

/**
 * A sticky header sits over scrolling content, so over a vibrant window it needs
 * a heavier fill than the card scrim — otherwise text slides visibly under it.
 */
const TRANSLUCENT_STICKY_FILL: Record<PaletteTheme, string> = {
  dark: 'rgba(30, 30, 32, 0.86)',
  light: 'rgba(246, 246, 248, 0.9)',
};

const FIELD_FILL: Record<PaletteTheme, string> = {
  dark: 'rgba(255, 255, 255, 0.08)',
  light: 'rgba(0, 0, 0, 0.05)',
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
 * Opaque surfaces come straight from the main window's shell so every window
 * reads as the same app: `surface-neutral` behind the content, `surface-light`
 * for the content itself, in both palettes.
 */
const OPAQUE_PANEL = 'var(--rcx-color-surface-neutral)';
const OPAQUE_CARD = 'var(--rcx-color-surface-light)';
const OPAQUE_HOVER = 'var(--rcx-color-surface-hover)';
const OPAQUE_SELECTED = 'var(--rcx-color-surface-selected)';

export const resolveSurfaces = (
  theme: PaletteTheme,
  isTransparent: boolean
): Surfaces => ({
  panel: isTransparent ? 'transparent' : OPAQUE_PANEL,
  card: isTransparent ? TRANSLUCENT_CARD_SCRIM[theme] : OPAQUE_CARD,
  sticky: isTransparent
    ? TRANSLUCENT_STICKY_FILL[theme]
    : 'var(--rcx-color-surface-tint)',
  // No field/input surface token in fuselage 0.80.0; keep the tinted fill.
  field: FIELD_FILL[theme],
  hover: isTransparent ? HOVER_FILL[theme] : OPAQUE_HOVER,
  selected: isTransparent ? SELECTED_FILL[theme] : OPAQUE_SELECTED,
  divider: 'var(--rcx-color-stroke-extra-light)',
});

export const CARD_INSET = 4;
/**
 * Nearest token on the Fuselage border-radius scale (small 2px / medium 4px /
 * large 8px / extra-large 20px) to the previous literal geometry (14px / 8px):
 * `large` matches the non-macOS radius exactly and is the closest single step
 * below the macOS radius (-6px, vs. +6px for `extra-large`).
 */
export const CARD_RADIUS = 'var(--rcx-border-radius-large, 0.5rem)';

export type CardStyle = {
  boxShadow: string;
};

/**
 * No hairline: the shadow alone lifts the card off the panel. Colour comes
 * from Fuselage's elevation-1 shadow token, the same one `Tile` uses for its
 * single-shadow elevation, so the card moves with theme/high-contrast changes
 * instead of a fixed literal.
 */
export const resolveCardStyle = (): CardStyle => ({
  boxShadow:
    '0 0 3px 0 var(--rcx-color-shadow-elevation-1, var(--rcx-color-neutral-800-10, rgba(47, 52, 61, 0.1)))',
});

/** Inline style for the inset content card, shared by both windows. */
export const getCardStyle = (
  _theme: PaletteTheme,
  surfaces: Surfaces
): Record<string, string> => {
  const { boxShadow } = resolveCardStyle();
  return {
    backgroundColor: surfaces.card,
    margin: `${CARD_INSET}px`,
    borderRadius: CARD_RADIUS,
    boxShadow,
    overflow: 'hidden',
  };
};
