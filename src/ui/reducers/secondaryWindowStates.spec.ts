import { APP_SETTINGS_LOADED } from '../../app/actions';
import type { ActionOf } from '../../store/actions';
import {
  SECONDARY_WINDOW_STATE_CHANGED,
  WINDOW_BOUNDS_RESET,
} from '../actions';
import { secondaryWindowStates } from './secondaryWindowStates';

describe('secondaryWindowStates reducer', () => {
  it('should return the default state', () => {
    expect(
      secondaryWindowStates(undefined, { type: 'UNKNOWN_ACTION' } as any)
    ).toEqual({});
  });

  describe('SECONDARY_WINDOW_STATE_CHANGED', () => {
    it('should record bounds for the given window id', () => {
      const action: ActionOf<typeof SECONDARY_WINDOW_STATE_CHANGED> = {
        type: SECONDARY_WINDOW_STATE_CHANGED,
        payload: {
          id: 'settings',
          bounds: { x: 1, y: 2, width: 3, height: 4 },
        },
      };

      expect(secondaryWindowStates({}, action)).toEqual({
        settings: { x: 1, y: 2, width: 3, height: 4 },
      });
    });
  });

  describe('WINDOW_BOUNDS_RESET', () => {
    it('should clear all saved window bounds', () => {
      const state = {
        settings: { x: 1, y: 2, width: 3, height: 4 },
        downloads: { x: 5, y: 6, width: 7, height: 8 },
      };
      const action: ActionOf<typeof WINDOW_BOUNDS_RESET> = {
        type: WINDOW_BOUNDS_RESET,
      };

      expect(secondaryWindowStates(state, action)).toEqual({});
    });
  });

  describe('APP_SETTINGS_LOADED', () => {
    it('should load secondaryWindowStates from settings', () => {
      const loaded = { settings: { x: 1, y: 2, width: 3, height: 4 } };
      const action: ActionOf<typeof APP_SETTINGS_LOADED> = {
        type: APP_SETTINGS_LOADED,
        payload: { secondaryWindowStates: loaded },
      };

      expect(secondaryWindowStates({}, action)).toEqual(loaded);
    });

    it('should use current state when secondaryWindowStates not in payload', () => {
      const state = { settings: { x: 1, y: 2, width: 3, height: 4 } };
      const action: ActionOf<typeof APP_SETTINGS_LOADED> = {
        type: APP_SETTINGS_LOADED,
        payload: {},
      };

      expect(secondaryWindowStates(state, action)).toBe(state);
    });
  });
});
