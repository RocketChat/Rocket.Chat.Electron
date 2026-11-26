import type { Reducer } from 'redux';

import type { ActionOf } from '../../store/actions';
import { ROOT_WINDOW_HIDDEN_STARTUP_CHANGED } from '../actions';

export const isRootWindowInHiddenStartup: Reducer<
  boolean,
  ActionOf<typeof ROOT_WINDOW_HIDDEN_STARTUP_CHANGED>
> = (state = false, action) =>
  action.type === ROOT_WINDOW_HIDDEN_STARTUP_CHANGED ? action.payload : state;
