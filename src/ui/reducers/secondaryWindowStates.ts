import type { Reducer } from 'redux';

import { APP_SETTINGS_LOADED } from '../../app/actions';
import type { ActionOf } from '../../store/actions';
import { SECONDARY_WINDOW_STATE_CHANGED } from '../actions';

export type SecondaryWindowStates = Record<
  string,
  { x: number; y: number; width: number; height: number }
>;

type SecondaryWindowStatesAction =
  | ActionOf<typeof SECONDARY_WINDOW_STATE_CHANGED>
  | ActionOf<typeof APP_SETTINGS_LOADED>;

/**
 * Where each secondary window was last placed, keyed by window.
 *
 * One map rather than a value per window: they all remember the same thing, and
 * a new window should not need its own reducer, action and persisted key.
 */
export const secondaryWindowStates: Reducer<
  SecondaryWindowStates,
  SecondaryWindowStatesAction
> = (state = {}, action) => {
  switch (action.type) {
    case SECONDARY_WINDOW_STATE_CHANGED: {
      const { id, bounds } = action.payload;
      if (!id || !bounds) return state;
      return { ...state, [id]: bounds };
    }

    case APP_SETTINGS_LOADED: {
      const { secondaryWindowStates = state } = action.payload;
      return secondaryWindowStates ?? state;
    }

    default:
      return state;
  }
};
