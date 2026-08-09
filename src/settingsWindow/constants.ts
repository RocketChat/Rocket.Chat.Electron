/** Channel the main process pushes transparency changes on. */
export const TRANSPARENCY_CHANNEL = 'settings-window/transparency-changed';

/** Window size as a multiplier of the screen it opens on. */
// Matches the downloads window, so the secondary windows open at one size.
export const WINDOW_SIZE_MULTIPLIER = 0.52;

/** Below this the section list plus a setting row no longer fit. */
export const WINDOW_MIN_WIDTH = 680;
/**
 * Tall enough for the whole Appearance section — two rows of window thumbnails
 * plus the transparency toggle — without the last control being clipped.
 */
export const WINDOW_MIN_HEIGHT = 660;

/**
 * Height the window opens at when the screen allows it. The size multiplier
 * alone yields a window that clips Appearance on shorter displays, so the taller
 * of the two wins.
 */
export const WINDOW_PREFERRED_HEIGHT = 720;
