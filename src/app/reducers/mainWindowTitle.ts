import type { Reducer } from 'redux';

import type { ActionOf } from '../../store/actions';
import { APP_MAIN_WINDOW_TITLE_SET } from '../actions';

type MainWindowTitleAction = ActionOf<typeof APP_MAIN_WINDOW_TITLE_SET>;

export const mainWindowTitle: Reducer<string | null, MainWindowTitleAction> = (
  state = null,
  action
) => {
  switch (action.type) {
    case APP_MAIN_WINDOW_TITLE_SET:
      return action.payload;

    default:
      return state;
  }
};
