import { Reducer } from 'redux';

import {
  UPDATES_READY,
  PERSISTABLE_VALUES_MERGED,
  ActionOf,
} from '../actions';

type IsEachUpdatesSettingConfigurableAction = (
  ActionOf<typeof UPDATES_READY>
  | ActionOf<typeof PERSISTABLE_VALUES_MERGED>
);

export const isEachUpdatesSettingConfigurable: Reducer<boolean, IsEachUpdatesSettingConfigurableAction> = (state = true, action) => {
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
