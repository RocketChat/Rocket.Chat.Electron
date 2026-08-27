/** Channel the main process pushes transparency changes on. */
export const TRANSPARENCY_CHANNEL =
  'document-viewer-window/transparency-changed';

/** Channel that hands an already-open window the next document to show. */
export const DOCUMENT_CHANNEL = 'document-viewer-window/document-changed';

/** Window size as a multiplier of the screen it opens on. */
export const WINDOW_SIZE_MULTIPLIER = 0.62;

/** Below this a page of A4 no longer reads at a sensible zoom. */
export const WINDOW_MIN_WIDTH = 560;
export const WINDOW_MIN_HEIGHT = 480;
