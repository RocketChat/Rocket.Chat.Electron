import { APP_SETTINGS_LOADED } from '../../app/actions';
import type { ActionOf } from '../../store/actions';
import {
  MENU_BAR_SET_NAVIGATION_LAYOUT_CLICKED,
  SETTINGS_SET_NAVIGATION_LAYOUT_CHANGED,
} from '../actions';
import { navigationLayout } from './navigationLayout';

describe('navigationLayout reducer', () => {
  it('should return initial state as tabs', () => {
    expect(navigationLayout(undefined, { type: 'UNKNOWN_ACTION' } as any)).toBe(
      'tabs'
    );
  });

  describe('SETTINGS_SET_NAVIGATION_LAYOUT_CHANGED', () => {
    it('should set navigation layout to sidebar', () => {
      const action: ActionOf<typeof SETTINGS_SET_NAVIGATION_LAYOUT_CHANGED> = {
        type: SETTINGS_SET_NAVIGATION_LAYOUT_CHANGED,
        payload: 'sidebar',
      };

      expect(navigationLayout('tabs', action)).toBe('sidebar');
    });

    it('should set navigation layout to tabs', () => {
      const action: ActionOf<typeof SETTINGS_SET_NAVIGATION_LAYOUT_CHANGED> = {
        type: SETTINGS_SET_NAVIGATION_LAYOUT_CHANGED,
        payload: 'tabs',
      };

      expect(navigationLayout('sidebar', action)).toBe('tabs');
    });
  });

  describe('MENU_BAR_SET_NAVIGATION_LAYOUT_CLICKED', () => {
    it('should set navigation layout to sidebar', () => {
      const action: ActionOf<typeof MENU_BAR_SET_NAVIGATION_LAYOUT_CLICKED> = {
        type: MENU_BAR_SET_NAVIGATION_LAYOUT_CLICKED,
        payload: 'sidebar',
      };

      expect(navigationLayout('tabs', action)).toBe('sidebar');
    });

    it('should set navigation layout to tabs', () => {
      const action: ActionOf<typeof MENU_BAR_SET_NAVIGATION_LAYOUT_CLICKED> = {
        type: MENU_BAR_SET_NAVIGATION_LAYOUT_CLICKED,
        payload: 'tabs',
      };

      expect(navigationLayout('sidebar', action)).toBe('tabs');
    });
  });

  describe('APP_SETTINGS_LOADED', () => {
    it('should load navigation layout from settings', () => {
      const action: ActionOf<typeof APP_SETTINGS_LOADED> = {
        type: APP_SETTINGS_LOADED,
        payload: {
          navigationLayout: 'sidebar',
        },
      };

      expect(navigationLayout('tabs', action)).toBe('sidebar');
    });

    it('should use default state when navigationLayout not in payload', () => {
      const action: ActionOf<typeof APP_SETTINGS_LOADED> = {
        type: APP_SETTINGS_LOADED,
        payload: {},
      };

      expect(navigationLayout('tabs', action)).toBe('tabs');
    });

    it('should handle undefined payload gracefully', () => {
      const action: ActionOf<typeof APP_SETTINGS_LOADED> = {
        type: APP_SETTINGS_LOADED,
        payload: {} as any,
      };

      expect(navigationLayout('tabs', action)).toBe('tabs');
    });
  });

  describe('state persistence', () => {
    it('should maintain immutability', () => {
      const initialState = 'tabs';
      const action: ActionOf<typeof SETTINGS_SET_NAVIGATION_LAYOUT_CHANGED> = {
        type: SETTINGS_SET_NAVIGATION_LAYOUT_CHANGED,
        payload: 'sidebar',
      };

      const newState = navigationLayout(initialState, action);

      expect(newState).toBe('sidebar');
      expect(initialState).toBe('tabs');
    });

    it('should return same reference when state does not change', () => {
      const initialState = 'tabs';
      const action = {
        type: 'UNKNOWN_ACTION',
      };

      const newState = navigationLayout(initialState, action as any);

      expect(newState).toBe(initialState);
    });
  });
});
