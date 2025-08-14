import { APP_SETTINGS_LOADED } from '../../app/actions';
import type { ActionOf } from '../../store/actions';
import {
  MENU_BAR_TOGGLE_IS_MENU_BAR_ENABLED_CLICKED,
  SETTINGS_SET_IS_MENU_BAR_ENABLED_CHANGED,
} from '../actions';
import { isMenuBarEnabled } from './isMenuBarEnabled';

describe('isMenuBarEnabled reducer', () => {
  it('should return initial state as true', () => {
    expect(isMenuBarEnabled(undefined, { type: 'UNKNOWN_ACTION' } as any)).toBe(
      true
    );
  });

  describe('SETTINGS_SET_IS_MENU_BAR_ENABLED_CHANGED', () => {
    it('should set menubar enabled state to true', () => {
      const action: ActionOf<typeof SETTINGS_SET_IS_MENU_BAR_ENABLED_CHANGED> =
        {
          type: SETTINGS_SET_IS_MENU_BAR_ENABLED_CHANGED,
          payload: true,
        };

      expect(isMenuBarEnabled(false, action)).toBe(true);
    });

    it('should set menubar enabled state to false', () => {
      const action: ActionOf<typeof SETTINGS_SET_IS_MENU_BAR_ENABLED_CHANGED> =
        {
          type: SETTINGS_SET_IS_MENU_BAR_ENABLED_CHANGED,
          payload: false,
        };

      expect(isMenuBarEnabled(true, action)).toBe(false);
    });
  });

  describe('MENU_BAR_TOGGLE_IS_MENU_BAR_ENABLED_CLICKED', () => {
    it('should toggle menubar enabled state to true', () => {
      const action: ActionOf<
        typeof MENU_BAR_TOGGLE_IS_MENU_BAR_ENABLED_CLICKED
      > = {
        type: MENU_BAR_TOGGLE_IS_MENU_BAR_ENABLED_CLICKED,
        payload: true,
      };

      expect(isMenuBarEnabled(false, action)).toBe(true);
    });

    it('should toggle menubar enabled state to false', () => {
      const action: ActionOf<
        typeof MENU_BAR_TOGGLE_IS_MENU_BAR_ENABLED_CLICKED
      > = {
        type: MENU_BAR_TOGGLE_IS_MENU_BAR_ENABLED_CLICKED,
        payload: false,
      };

      expect(isMenuBarEnabled(true, action)).toBe(false);
    });
  });

  describe('APP_SETTINGS_LOADED', () => {
    it('should load menubar enabled state from settings', () => {
      const action: ActionOf<typeof APP_SETTINGS_LOADED> = {
        type: APP_SETTINGS_LOADED,
        payload: {
          isMenuBarEnabled: false,
        },
      };

      expect(isMenuBarEnabled(true, action)).toBe(false);
    });

    it('should use default state when isMenuBarEnabled not in payload', () => {
      const action: ActionOf<typeof APP_SETTINGS_LOADED> = {
        type: APP_SETTINGS_LOADED,
        payload: {},
      };

      expect(isMenuBarEnabled(true, action)).toBe(true);
    });

    it('should handle undefined payload gracefully', () => {
      const action: ActionOf<typeof APP_SETTINGS_LOADED> = {
        type: APP_SETTINGS_LOADED,
        payload: {} as any,
      };

      expect(isMenuBarEnabled(true, action)).toBe(true);
    });
  });

  describe('state persistence', () => {
    it('should maintain immutability', () => {
      const initialState = true;
      const action: ActionOf<typeof SETTINGS_SET_IS_MENU_BAR_ENABLED_CHANGED> =
        {
          type: SETTINGS_SET_IS_MENU_BAR_ENABLED_CHANGED,
          payload: false,
        };

      const newState = isMenuBarEnabled(initialState, action);

      expect(newState).toBe(false);
      expect(initialState).toBe(true);
    });

    it('should return same reference when state does not change', () => {
      const initialState = true;
      const action = {
        type: 'UNKNOWN_ACTION',
      };

      const newState = isMenuBarEnabled(initialState, action as any);

      expect(newState).toBe(initialState);
    });
  });
});
