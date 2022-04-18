import { Reducer } from 'redux';

import { APP_SETTINGS_LOADED } from '../../app/actions';
import { ActionOf } from '../../store/actions';

export const isAddNewServersEnabled: Reducer<
  boolean,
  ActionOf<typeof APP_SETTINGS_LOADED>
> = (state = false, action) => {
  switch (action.type) {
    case APP_SETTINGS_LOADED:
      return Boolean(action.payload.isAddNewServersEnabled);
    default:
      return state;
  }
};
