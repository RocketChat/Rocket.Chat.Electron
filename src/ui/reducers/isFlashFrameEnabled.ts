import { Reducer } from 'redux';

import { APP_SETTINGS_LOADED } from '../../app/actions';
import { ActionOf } from '../../store/actions';
import { UPDATES_READY } from '../../updates/actions';
import { SETTINGS_SET_FLASHFRAME_OPT_IN_CHANGED } from '../actions';

type IsFlashFrameEnabledAction = ActionOf<
  typeof SETTINGS_SET_FLASHFRAME_OPT_IN_CHANGED
>;

export const isFlashFrameEnabled: Reducer<
  boolean,
  | IsFlashFrameEnabledAction
  | ActionOf<typeof UPDATES_READY>
  | ActionOf<typeof APP_SETTINGS_LOADED>
> = (state = false, action) => {
  switch (action.type) {
    case APP_SETTINGS_LOADED:
      return Boolean(action.payload.isFlashFrameEnabled);
    case UPDATES_READY:
      return action.payload.isFlashFrameEnabled;
    case SETTINGS_SET_FLASHFRAME_OPT_IN_CHANGED: {
      return action.payload;
    }
    default:
      return state;
  }
};
