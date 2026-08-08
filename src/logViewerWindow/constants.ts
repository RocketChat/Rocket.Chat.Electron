/**
 * Constants for Log Viewer window
 */

/** Auto-refresh interval in milliseconds */
export const AUTO_REFRESH_INTERVAL_MS = 2000;

/** Delay before scrolling to ensure Virtuoso is ready */
export const SCROLL_DELAY_MS = 100;

/** Window size as multiplier of screen size */
export const WINDOW_SIZE_MULTIPLIER = 0.8;

/** Debounce delay for search filter in milliseconds */
export const SEARCH_DEBOUNCE_MS = 300;

/** Virtuoso overscan count for smooth scrolling */
export const VIRTUOSO_OVERSCAN = 50;

/** Minimum window size — below this the sidebar plus a log line no longer fit */
export const WINDOW_MIN_WIDTH = 760;
export const WINDOW_MIN_HEIGHT = 480;

/** Width of the filters sidebar */
export const SIDEBAR_WIDTH = 248;

/** Height of the toolbar, which doubles as the window drag region on macOS */
export const TOOLBAR_HEIGHT = 52;

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

/** Lines shown for a multi-line entry before it has to be expanded */
export const COLLAPSED_MESSAGE_LINES = 1;

/** Entries handed to the list per page; scrolling to the end adds another */
export const PAGE_SIZE = 100;

/** Time slices drawn in the distribution timeline, and the plot's height */
export const TIMELINE_BUCKET_COUNT = 96;
export const TIMELINE_PLOT_HEIGHT = 40;
