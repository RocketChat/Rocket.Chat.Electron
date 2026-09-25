import { APP_SETTINGS_LOADED } from '../../app/actions';
import { SETTINGS_SET_IS_TRAY_ICON_UNREAD_COUNTER_ENABLED_CHANGED } from '../actions';
import { isTrayIconUnreadCounterEnabled } from './isTrayIconUnreadCounterEnabled';

describe('isTrayIconUnreadCounterEnabled', () => {
  it('defaults to false (presence tray icon)', () => {
    expect(
      isTrayIconUnreadCounterEnabled(undefined, { type: '@@INIT' } as any)
    ).toBe(false);
  });

  it('keeps the default when the persisted settings predate it', () => {
    expect(
      isTrayIconUnreadCounterEnabled(false, {
        type: APP_SETTINGS_LOADED,
        payload: {},
      })
    ).toBe(false);
  });

  it('loads the persisted value', () => {
    expect(
      isTrayIconUnreadCounterEnabled(false, {
        type: APP_SETTINGS_LOADED,
        payload: { isTrayIconUnreadCounterEnabled: true },
      })
    ).toBe(true);
  });

  it('follows the settings toggle', () => {
    expect(
      isTrayIconUnreadCounterEnabled(false, {
        type: SETTINGS_SET_IS_TRAY_ICON_UNREAD_COUNTER_ENABLED_CHANGED,
        payload: true,
      })
    ).toBe(true);
  });
});
