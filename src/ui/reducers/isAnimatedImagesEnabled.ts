import type { Reducer } from 'redux';

import { APP_SETTINGS_LOADED } from '../../app/actions';
import type { ActionOf } from '../../store/actions';
import { SETTINGS_SET_ANIMATED_IMAGES_CHANGED } from '../actions';

type IsAnimatedImagesEnabledAction =
  | ActionOf<typeof SETTINGS_SET_ANIMATED_IMAGES_CHANGED>
  | ActionOf<typeof APP_SETTINGS_LOADED>;

export const isAnimatedImagesEnabled: Reducer<
  boolean,
  IsAnimatedImagesEnabledAction
> = (state = true, action) => {
  switch (action.type) {
    case SETTINGS_SET_ANIMATED_IMAGES_CHANGED:
      return action.payload;

    case APP_SETTINGS_LOADED: {
      const { isAnimatedImagesEnabled = state } = action.payload;
      return isAnimatedImagesEnabled;
    }

    default:
      return state;
  }
};
