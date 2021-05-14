import type { Reducer } from 'redux';

import type { ActionOf } from '../actions';
import { ROOT_WINDOW_ICON_CHANGED } from '../actions/uiActions';
import type { RootWindowIcon } from '../types/RootWindowIcon';

type RootWindowIconAction = ActionOf<typeof ROOT_WINDOW_ICON_CHANGED>;

export const rootWindowIcon: Reducer<
  RootWindowIcon | null,
  RootWindowIconAction
> = (state = null, action) => {
  switch (action.type) {
    case ROOT_WINDOW_ICON_CHANGED: {
      return action.payload;
    }

    default:
      return state;
  }
};
