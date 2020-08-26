import { Reducer } from 'redux';

import {
  ROOT_WINDOW_WEBCONTENTS_FOCUSED,
  FocusedWebContentsIdActionTypes,
} from '../actions';

export const focusedWebContentsId: Reducer<number, FocusedWebContentsIdActionTypes> = (state = -1, action) => {
  switch (action.type) {
    case ROOT_WINDOW_WEBCONTENTS_FOCUSED:
      return action.payload ?? -1;

    default:
      return state;
  }
};
