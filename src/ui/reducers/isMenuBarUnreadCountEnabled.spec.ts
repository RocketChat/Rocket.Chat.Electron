import { APP_SETTINGS_LOADED } from '../../app/actions';
import { SETTINGS_SET_IS_MENU_BAR_UNREAD_COUNT_ENABLED_CHANGED } from '../actions';
import { isMenuBarUnreadCountEnabled } from './isMenuBarUnreadCountEnabled';

describe('isMenuBarUnreadCountEnabled', () => {
  it('defaults to true (count shown in the menu bar)', () => {
    expect(
      isMenuBarUnreadCountEnabled(undefined, { type: '@@INIT' } as any)
    ).toBe(true);
  });

  it('keeps the default when the persisted settings predate it', () => {
    expect(
      isMenuBarUnreadCountEnabled(true, {
        type: APP_SETTINGS_LOADED,
        payload: {},
      })
    ).toBe(true);
  });

  it('loads the persisted value', () => {
    expect(
      isMenuBarUnreadCountEnabled(true, {
        type: APP_SETTINGS_LOADED,
        payload: { isMenuBarUnreadCountEnabled: false },
      })
    ).toBe(false);
  });

  it('follows the settings toggle', () => {
    expect(
      isMenuBarUnreadCountEnabled(true, {
        type: SETTINGS_SET_IS_MENU_BAR_UNREAD_COUNT_ENABLED_CHANGED,
        payload: false,
      })
    ).toBe(false);
  });
});
