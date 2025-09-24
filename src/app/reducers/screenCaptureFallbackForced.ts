import type { Reducer } from 'redux';

import type { ActionOf } from '../../store/actions';
import { APP_SCREEN_CAPTURE_FALLBACK_FORCED_SET } from '../actions';

export const screenCaptureFallbackForced: Reducer<
  boolean,
  ActionOf<typeof APP_SCREEN_CAPTURE_FALLBACK_FORCED_SET>
> = (state = false, action) => {
  switch (action.type) {
    case APP_SCREEN_CAPTURE_FALLBACK_FORCED_SET:
      return action.payload;
    default:
      return state;
  }
};
