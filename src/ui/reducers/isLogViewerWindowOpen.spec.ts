import { APP_SETTINGS_LOADED } from '../../app/actions';
import { LOG_VIEWER_WINDOW_OPEN_STATE_CHANGED } from '../actions';
import { isLogViewerWindowOpen } from './isLogViewerWindowOpen';

describe('isLogViewerWindowOpen', () => {
  it('defaults to closed', () => {
    expect(isLogViewerWindowOpen(undefined, { type: 'unknown' } as any)).toBe(
      false
    );
  });

  it('records the window opening and closing', () => {
    expect(
      isLogViewerWindowOpen(false, {
        type: LOG_VIEWER_WINDOW_OPEN_STATE_CHANGED,
        payload: true,
      })
    ).toBe(true);

    expect(
      isLogViewerWindowOpen(true, {
        type: LOG_VIEWER_WINDOW_OPEN_STATE_CHANGED,
        payload: false,
      })
    ).toBe(false);
  });

  it('ignores a non-boolean payload rather than persisting junk', () => {
    const warn = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);

    expect(
      isLogViewerWindowOpen(true, {
        type: LOG_VIEWER_WINDOW_OPEN_STATE_CHANGED,
        payload: 'yes' as any,
      })
    ).toBe(true);
    expect(warn).toHaveBeenCalled();

    warn.mockRestore();
  });

  it('restores the persisted value on load', () => {
    expect(
      isLogViewerWindowOpen(false, {
        type: APP_SETTINGS_LOADED,
        payload: { isLogViewerWindowOpen: true },
      } as any)
    ).toBe(true);
  });

  it('keeps the current value when settings omit the key', () => {
    expect(
      isLogViewerWindowOpen(true, {
        type: APP_SETTINGS_LOADED,
        payload: {},
      } as any)
    ).toBe(true);
  });
});
