import { Reducer } from 'redux';

import { ActionOf } from '../../store/actions';
import { SETTINGS_SET_BUGSNAG_OPT_IN } from '../actions';

type IsBugsnagEnabledAction = ActionOf<typeof SETTINGS_SET_BUGSNAG_OPT_IN>;

export const isBugsnagEnabled: Reducer<boolean, IsBugsnagEnabledAction> = (
  state = false,
  action
) => {
  switch (action.type) {
    case SETTINGS_SET_BUGSNAG_OPT_IN: {
      return action.payload;
    }
    default:
      return state;
  }
};
