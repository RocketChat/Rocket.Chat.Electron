import { APP_SETTINGS_LOADED } from '../../app/actions';
import type { ActionOf } from '../../store/actions';
import { ROOT_WINDOW_STATE_CHANGED, WINDOW_BOUNDS_RESET } from '../actions';
import type { WindowState } from '../common';
import { DEFAULT_ROOT_WINDOW_BOUNDS, rootWindowState } from './rootWindowState';

const buildState = (overrides: Partial<WindowState> = {}): WindowState => ({
  focused: true,
  visible: true,
  maximized: false,
  minimized: false,
  fullscreen: false,
  normal: true,
  bounds: { x: 10, y: 20, width: 800, height: 500 },
  ...overrides,
});

describe('rootWindowState reducer', () => {
  it('should return the default state', () => {
    const state = rootWindowState(undefined, { type: 'UNKNOWN_ACTION' } as any);

    expect(state.bounds).toEqual(DEFAULT_ROOT_WINDOW_BOUNDS);
  });

  describe('ROOT_WINDOW_STATE_CHANGED', () => {
    it('should replace state with the payload', () => {
      const newState = buildState({ maximized: true });
      const action: ActionOf<typeof ROOT_WINDOW_STATE_CHANGED> = {
        type: ROOT_WINDOW_STATE_CHANGED,
        payload: newState,
      };

      expect(rootWindowState(buildState(), action)).toEqual(newState);
    });
  });

  describe('WINDOW_BOUNDS_RESET', () => {
    it('should reset bounds to the default and clear maximized/minimized/fullscreen', () => {
      const state = buildState({ maximized: true, fullscreen: true });
      const action: ActionOf<typeof WINDOW_BOUNDS_RESET> = {
        type: WINDOW_BOUNDS_RESET,
      };

      const result = rootWindowState(state, action);

      expect(result.bounds).toEqual(DEFAULT_ROOT_WINDOW_BOUNDS);
      expect(result.maximized).toBe(false);
      expect(result.minimized).toBe(false);
      expect(result.fullscreen).toBe(false);
      expect(result.normal).toBe(true);
    });

    it('should reset a maximized+fullscreen window to normal with default bounds, preserving visible/focused', () => {
      const state = buildState({
        maximized: true,
        fullscreen: true,
        minimized: false,
        normal: false,
        visible: true,
        focused: false,
      });
      const action: ActionOf<typeof WINDOW_BOUNDS_RESET> = {
        type: WINDOW_BOUNDS_RESET,
      };

      const result = rootWindowState(state, action);

      expect(result).toEqual({
        ...state,
        maximized: false,
        minimized: false,
        fullscreen: false,
        normal: true,
        bounds: DEFAULT_ROOT_WINDOW_BOUNDS,
      });
      expect(result.visible).toBe(true);
      expect(result.focused).toBe(false);
    });
  });

  describe('APP_SETTINGS_LOADED', () => {
    it('should load rootWindowState from settings', () => {
      const loaded = buildState({ maximized: true });
      const action: ActionOf<typeof APP_SETTINGS_LOADED> = {
        type: APP_SETTINGS_LOADED,
        payload: { rootWindowState: loaded },
      };

      expect(rootWindowState(buildState(), action)).toEqual(loaded);
    });

    it('should use current state when rootWindowState not in payload', () => {
      const state = buildState();
      const action: ActionOf<typeof APP_SETTINGS_LOADED> = {
        type: APP_SETTINGS_LOADED,
        payload: {},
      };

      expect(rootWindowState(state, action)).toBe(state);
    });
  });
});
