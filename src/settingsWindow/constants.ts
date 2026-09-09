import { thumbnailRowWidth } from '../ui/components/SettingsView/features/thumbnailMetrics';
import { CARD_INSET, SIDEBAR_WIDTH } from '../ui/windowChrome/appearance';

/** Channel the main process pushes transparency changes on. */
export const TRANSPARENCY_CHANNEL = 'settings-window/transparency-changed';

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
 * Default window size, clamped to the work area of the display it opens on.
 */
export const WINDOW_PREFERRED_WIDTH = 900;
export const WINDOW_PREFERRED_HEIGHT = 720;
