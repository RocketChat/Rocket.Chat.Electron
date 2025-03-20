import type { Reducer } from 'redux';

import { APP_SETTINGS_LOADED } from '../../app/actions';
import type { ActionOf } from '../../store/actions';
import { SETTINGS_AVAILABLE_BROWSERS_UPDATED } from '../actions';

type AvailableBrowsersAction =
  | ActionOf<typeof SETTINGS_AVAILABLE_BROWSERS_UPDATED>
  | ActionOf<typeof APP_SETTINGS_LOADED>;

export const availableBrowsers: Reducer<
  Array<string>,
  AvailableBrowsersAction
> = (state = [], action) => {
  switch (action.type) {
    case SETTINGS_AVAILABLE_BROWSERS_UPDATED:
      return action.payload;

    case APP_SETTINGS_LOADED: {
      return state;
    }

    default:
      return state;
  }
};
