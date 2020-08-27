import { Reducer } from 'redux';

import { ActionOf } from '../../store/actions';
import {
  ROOT_WINDOW_WEBCONTENTS_FOCUSED,
} from '../actions';

type FocusedWebContentsIdAction = ActionOf<typeof ROOT_WINDOW_WEBCONTENTS_FOCUSED>;

export const focusedWebContentsId: Reducer<number, FocusedWebContentsIdAction> = (state = -1, action) => {
  switch (action.type) {
    case ROOT_WINDOW_WEBCONTENTS_FOCUSED:
      return action.payload ?? -1;

    default:
      return state;
  }
};
