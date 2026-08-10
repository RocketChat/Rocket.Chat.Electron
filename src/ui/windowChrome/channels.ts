/**
 * The main process pushes the window's maximised state here, so the toolbar's
 * caption buttons can show restore instead of maximise. Sent per window, so a
 * renderer only ever hears about its own.
 */
export const WINDOW_MAXIMIZED_CHANNEL = 'secondary-window/maximized-changed';
