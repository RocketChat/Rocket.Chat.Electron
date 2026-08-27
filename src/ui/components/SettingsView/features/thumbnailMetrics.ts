/**
 * Size of the window thumbnails used to pick a theme or a workspace switcher
 * layout, and the gap between them.
 *
 * Kept apart from the components that draw them so the settings window can size
 * itself around a full row of options without the main process pulling a React
 * component into its bundle.
 */
export const THUMBNAIL_WIDTH = 168;
export const THUMBNAIL_HEIGHT = 110;
export const THUMBNAIL_GAP = 20;

/** The selection ring drawn around each thumbnail, on every side. */
export const THUMBNAIL_FRAME_PADDING = 3;
export const THUMBNAIL_FRAME_BORDER = 2;

/**
 * An option is wider than the thumbnail it shows: the ring is drawn whether or
 * not the option is selected, so the space is always taken.
 */
export const THUMBNAIL_OPTION_WIDTH =
  THUMBNAIL_WIDTH + (THUMBNAIL_FRAME_PADDING + THUMBNAIL_FRAME_BORDER) * 2;

/** Widest option group offered: the three theme choices. */
export const THUMBNAIL_ROW_LENGTH = 3;

export const thumbnailRowWidth = (count = THUMBNAIL_ROW_LENGTH): number =>
  THUMBNAIL_OPTION_WIDTH * count + THUMBNAIL_GAP * (count - 1);
