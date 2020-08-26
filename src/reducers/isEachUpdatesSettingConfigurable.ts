import { Reducer } from 'redux';

import {
  UPDATES_READY,
  PERSISTABLE_VALUES_MERGED,
  IsEachUpdatesSettingConfigurableActionTypes,
} from '../actions';

export const isEachUpdatesSettingConfigurable: Reducer<boolean, IsEachUpdatesSettingConfigurableActionTypes> = (state = true, action) => {
  switch (action.type) {
    case UPDATES_READY: {
      const { isEachUpdatesSettingConfigurable } = action.payload;
      return isEachUpdatesSettingConfigurable;
    }

    case PERSISTABLE_VALUES_MERGED: {
      const { isEachUpdatesSettingConfigurable = state } = action.payload;
      return isEachUpdatesSettingConfigurable;
    }

    default:
      return state;
  }
};
