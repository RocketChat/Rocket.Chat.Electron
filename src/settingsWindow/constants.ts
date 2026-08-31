import { thumbnailRowWidth } from '../ui/components/SettingsView/features/thumbnailMetrics';
import { CARD_INSET, SIDEBAR_WIDTH } from '../ui/windowChrome/appearance';

/** Channel the main process pushes transparency changes on. */
export const TRANSPARENCY_CHANNEL = 'settings-window/transparency-changed';

/** Window size as a multiplier of the screen it opens on. */
// Matches the downloads window, so the secondary windows open at one size.
export const WINDOW_SIZE_MULTIPLIER = 0.52;

/** Padding inside the content card, and the scrollbar that eats into it. */
const CARD_PADDING = 24;
const SCROLLBAR_WIDTH = 10;

/**
 * Wide enough for the widest section, Appearance: a full row of theme
 * thumbnails, inside the content card, next to the section list. Narrower and
 * the options wrap, which reads as a layout accident rather than a choice.
 */
export const WINDOW_MIN_WIDTH =
  SIDEBAR_WIDTH +
  CARD_INSET * 2 +
  CARD_PADDING * 2 +
  SCROLLBAR_WIDTH +
  thumbnailRowWidth();
/**
 * Tall enough for the whole Appearance section — both thumbnail groups plus the
 * transparency toggle — without the last control being clipped.
 */
export const WINDOW_MIN_HEIGHT = 660;

/**
 * Size the window opens at when the screen allows it. The size multiplier alone
 * yields a window that wraps or clips Appearance on smaller displays, so the
 * larger of the two wins.
 */
export const WINDOW_PREFERRED_WIDTH = WINDOW_MIN_WIDTH;
export const WINDOW_PREFERRED_HEIGHT = 720;
