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
const CONTENT_MIN_WIDTH =
  SIDEBAR_WIDTH +
  CARD_INSET * 2 +
  CARD_PADDING * 2 +
  SCROLLBAR_WIDTH +
  thumbnailRowWidth();

/**
 * The window is not resizable: every section is laid out for this one size,
 * so it opens the same everywhere instead of remembering whatever shape a
 * drag or a monitor change last left it in. Only a work area smaller than
 * this shrinks it, so it never opens larger than the screen.
 */
export const WINDOW_WIDTH = Math.max(900, CONTENT_MIN_WIDTH);
export const WINDOW_HEIGHT = 720;
