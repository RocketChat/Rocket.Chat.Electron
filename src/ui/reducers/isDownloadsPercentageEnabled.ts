import type { Reducer } from 'redux';

import { APP_SETTINGS_LOADED } from '../../app/actions';
import type { ActionOf } from '../../store/actions';
import { SETTINGS_SET_DOWNLOADS_PERCENTAGE_ENABLED_CHANGED } from '../actions';

type IsDownloadsPercentageEnabledAction = ActionOf<
  typeof SETTINGS_SET_DOWNLOADS_PERCENTAGE_ENABLED_CHANGED
>;

export const isDownloadsPercentageEnabled: Reducer<
  boolean,
  IsDownloadsPercentageEnabledAction | ActionOf<typeof APP_SETTINGS_LOADED>
> = (state = false, action) => {
  switch (action.type) {
    case APP_SETTINGS_LOADED:
      return action.payload.isDownloadsPercentageEnabled ?? state;
    case SETTINGS_SET_DOWNLOADS_PERCENTAGE_ENABLED_CHANGED: {
      return action.payload;
    }
    default:
      return state;
  }
};
