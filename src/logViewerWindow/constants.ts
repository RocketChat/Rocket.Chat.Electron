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

/** Channel the main process pushes transparency changes on. */
export const TRANSPARENCY_CHANNEL = 'log-viewer-window/transparency-changed';

/** Minimum window size — below this the sidebar plus a log line no longer fit */
export const WINDOW_MIN_WIDTH = 760;
export const WINDOW_MIN_HEIGHT = 480;

/** Lines shown for a multi-line entry before it has to be expanded */
export const COLLAPSED_MESSAGE_LINES = 1;

/** Entries handed to the list per page; scrolling to the end adds another */
export const PAGE_SIZE = 100;

/** Time slices drawn in the distribution timeline, and the plot's height */
export const TIMELINE_BUCKET_COUNT = 96;
export const TIMELINE_PLOT_HEIGHT = 40;

/** Window during which scroll events are ignored after a programmatic scroll */
export const AUTO_SCROLL_GUARD_MS = 150;
