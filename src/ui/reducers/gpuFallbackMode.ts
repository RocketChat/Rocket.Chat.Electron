import type { Reducer } from 'redux';

import type { GpuFallbackMode } from '../../app/PersistableValues';
import { APP_SETTINGS_LOADED } from '../../app/actions';
import type { ActionOf } from '../../store/actions';
import { SETTINGS_GPU_FALLBACK_MODE_CHANGED } from '../actions';

type GpuFallbackModeAction = ActionOf<
  typeof SETTINGS_GPU_FALLBACK_MODE_CHANGED
>;

const isValidFallbackMode = (value: unknown): value is GpuFallbackMode =>
  value === 'none' ||
  value === 'x11' ||
  value === 'wayland' ||
  value === 'disabled';

export const gpuFallbackMode: Reducer<
  GpuFallbackMode,
  GpuFallbackModeAction | ActionOf<typeof APP_SETTINGS_LOADED>
> = (state = 'none', action) => {
  switch (action.type) {
    case APP_SETTINGS_LOADED: {
      const value = action.payload.gpuFallbackMode;
      return isValidFallbackMode(value) ? value : 'none';
    }
    case SETTINGS_GPU_FALLBACK_MODE_CHANGED: {
      return action.payload;
    }
    default:
      return state;
  }
};
