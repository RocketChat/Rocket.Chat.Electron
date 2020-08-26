import { Reducer } from 'redux';

import {
  UPDATES_READY,
  PERSISTABLE_VALUES_MERGED,
  UpdatesReadyAction,
  PersistableValuesMergedAction,
} from '../actions';

type IsEachUpdatesSettingConfigurableAction = (
  UpdatesReadyAction
  | PersistableValuesMergedAction
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
