import { Reducer } from 'redux';

import { APP_SETTINGS_LOADED } from '../../app/actions';
import { ActionOf } from '../../store/actions';
import { UPDATES_READY } from '../../updates/actions';
import { SETTINGS_SET_BUGSNAG_OPT_IN } from '../actions';

type IsBugsnagEnabledAction = ActionOf<typeof SETTINGS_SET_BUGSNAG_OPT_IN>;

export const isBugsnagEnabled: Reducer<
  boolean,
  | IsBugsnagEnabledAction
  | ActionOf<typeof UPDATES_READY>
  | ActionOf<typeof APP_SETTINGS_LOADED>
> = (state = false, action) => {
  switch (action.type) {
    case APP_SETTINGS_LOADED:
      return Boolean(action.payload.isBugsnagEnabled);
    case UPDATES_READY:
      return action.payload.isBugsnagEnabled;
    case SETTINGS_SET_BUGSNAG_OPT_IN: {
      return action.payload;
    }
    default:
      return state;
  }
};
