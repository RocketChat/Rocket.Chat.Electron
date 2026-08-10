import type { BrowserWindow, Rectangle } from 'electron';
import { screen } from 'electron';

import { dispatch, select } from '../../store';
import type { RootState } from '../../store/rootReducer';
import { SECONDARY_WINDOW_STATE_CHANGED } from '../actions';
import { debounce } from './debounce';

/** Windows that remember where they were, keyed in persisted state. */
export type SecondaryWindowId =
  | 'logViewer'
  | 'downloads'
  | 'settings'
  | 'documentViewer';

export type SecondaryWindowBounds = Rectangle;

/**
 * A window counts as on-screen if it overlaps any display, rather than being
 * fully contained by one — the same rule the root window uses, so bounds parked
 * at a screen edge or spanning two monitors survive instead of being recentred.
 */
const isInsideSomeScreen = ({ x, y, width, height }: Rectangle): boolean =>
  screen
    .getAllDisplays()
    .some(
      ({ bounds }) =>
        x < bounds.x + bounds.width &&
        x + width > bounds.x &&
        y < bounds.y + bounds.height &&
        y + height > bounds.y
    );

const isUsableBounds = (bounds: unknown): bounds is SecondaryWindowBounds => {
  if (!bounds || typeof bounds !== 'object') return false;
  const { x, y, width, height } = bounds as Record<string, unknown>;
  return (
    [x, y, width, height].every(
      (value) => typeof value === 'number' && Number.isFinite(value)
    ) &&
    (width as number) > 0 &&
    (height as number) > 0
  );
};

/**
 * Where this window should open, or undefined to let the caller fall back to its
 * default placement.
 *
 * Saved bounds are dropped when they no longer land on a display: monitors get
 * unplugged, and a window restored onto one that is gone is a window the reader
 * cannot reach.
 */
export const getSavedWindowBounds = (
  id: SecondaryWindowId
): SecondaryWindowBounds | undefined => {
  const saved = select(
    ({ secondaryWindowStates }: RootState) => secondaryWindowStates?.[id]
  );

  if (!isUsableBounds(saved) || !isInsideSomeScreen(saved)) {
    return undefined;
  }

  return saved;
};

/**
 * Records the window's position and size as it is moved or resized.
 *
 * Debounced because `move` and `resize` fire continuously while dragging, and
 * every dispatch reaches the store and then disk. Normal bounds are used rather
 * than current ones, so maximising does not overwrite the size to restore to.
 */
export const watchWindowBounds = (
  id: SecondaryWindowId,
  browserWindow: BrowserWindow
): void => {
  const save = debounce(async () => {
    if (browserWindow.isDestroyed()) return;
    if (browserWindow.isMinimized() || browserWindow.isFullScreen()) return;

    dispatch({
      type: SECONDARY_WINDOW_STATE_CHANGED,
      payload: { id, bounds: browserWindow.getNormalBounds() },
    });
  }, 500);

  browserWindow.addListener('move', save);
  browserWindow.addListener('resize', save);
};
