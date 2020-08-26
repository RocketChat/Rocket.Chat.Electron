import { Reducer } from 'redux';

import {
  ROOT_WINDOW_WEBCONTENTS_FOCUSED,
  RootWindowWebContentsFocusedAction,
} from '../actions';

type FocusedWebContentsIdAction = RootWindowWebContentsFocusedAction;

export const focusedWebContentsId: Reducer<number, FocusedWebContentsIdAction> = (state = -1, action) => {
  switch (action.type) {
    case ROOT_WINDOW_WEBCONTENTS_FOCUSED:
      return action.payload ?? -1;

    default:
      return state;
  }
};
