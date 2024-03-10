import type { Reducer } from 'redux';

import { APP_SETTINGS_LOADED } from '../../app/actions';
import type { ActionOf } from '../../store/actions';
import { SETTINGS_SET_DO_ALWAYS_START_AT_HOME_PAGE_CHANGED } from '../actions';

type DoAlwaysStartAtHomePageEnabledAction = ActionOf<
  typeof SETTINGS_SET_DO_ALWAYS_START_AT_HOME_PAGE_CHANGED
>;

export const doAlwaysStartAtHomePage: Reducer<
  boolean,
  DoAlwaysStartAtHomePageEnabledAction | ActionOf<typeof APP_SETTINGS_LOADED>
> = (state = true, action) => {
  switch (action.type) {
    case APP_SETTINGS_LOADED:
      return Boolean(action.payload.doAlwaysStartAtHomePage);
    case SETTINGS_SET_DO_ALWAYS_START_AT_HOME_PAGE_CHANGED: {
      return action.payload;
    }
    default:
      return state;
  }
};
