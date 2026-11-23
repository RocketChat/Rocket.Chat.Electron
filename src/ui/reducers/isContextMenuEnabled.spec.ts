import { APP_SETTINGS_LOADED } from '../../app/actions';
import { MENU_BAR_TOGGLE_IS_CONTEXT_MENU_ENABLED_CLICKED } from '../actions';
import { selectIsContextMenuEnabled } from '../selectors';
import { isContextMenuEnabled } from './isContextMenuEnabled';
import { isContextMenuEnabledOverride } from './isContextMenuEnabledOverride';

describe('isContextMenuEnabled', () => {
  it('defaults to true (current behavior)', () => {
    expect(isContextMenuEnabled(undefined, { type: '@@INIT' } as any)).toBe(
      true
    );
  });

  it('keeps the default when the persisted settings predate it', () => {
    expect(
      isContextMenuEnabled(true, { type: APP_SETTINGS_LOADED, payload: {} })
    ).toBe(true);
  });

  it('loads the persisted value', () => {
    expect(
      isContextMenuEnabled(true, {
        type: APP_SETTINGS_LOADED,
        payload: { isContextMenuEnabled: false },
      })
    ).toBe(false);
  });

  it('follows the menu toggle', () => {
    expect(
      isContextMenuEnabled(true, {
        type: MENU_BAR_TOGGLE_IS_CONTEXT_MENU_ENABLED_CLICKED,
        payload: false,
      })
    ).toBe(false);
  });
});

describe('isContextMenuEnabledOverride', () => {
  it('defaults to null (no admin value)', () => {
    expect(
      isContextMenuEnabledOverride(undefined, { type: '@@INIT' } as any)
    ).toBeNull();
  });

  it('loads the admin value', () => {
    expect(
      isContextMenuEnabledOverride(null, {
        type: APP_SETTINGS_LOADED,
        payload: { isContextMenuEnabledOverride: false },
      })
    ).toBe(false);
  });
});

describe('selectIsContextMenuEnabled', () => {
  const select = (
    isContextMenuEnabled: boolean,
    isContextMenuEnabledOverride: boolean | null
  ) =>
    selectIsContextMenuEnabled({
      isContextMenuEnabled,
      isContextMenuEnabledOverride,
    } as any);

  it('uses the user choice when no admin value is set', () => {
    expect(select(false, null)).toBe(false);
    expect(select(true, null)).toBe(true);
  });

  it('lets the admin value win over the user choice', () => {
    expect(select(true, false)).toBe(false);
    expect(select(false, true)).toBe(true);
  });
});
